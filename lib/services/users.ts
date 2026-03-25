import bcrypt from "bcryptjs";
import { z } from "zod";

import { createAuditLog } from "@/lib/services/audit-log";
import { prisma } from "@/lib/db/prisma";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "manager", "data_entry"]),
  isActive: z.boolean().default(true)
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["admin", "manager", "data_entry"]).optional(),
  isActive: z.boolean().optional()
});

export async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });

  return users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString()
  }));
}

export async function createUser(payload: unknown, actorId?: string | null) {
  const parsed = createUserSchema.safeParse(payload);
  if (!parsed.success) {
    throw createServiceError("بيانات المستخدم غير صالحة.", 400);
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email }
  });

  if (existing) {
    throw createServiceError("البريد الإلكتروني مستخدم مسبقاً.", 409);
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: parsed.data.role,
        isActive: parsed.data.isActive
      }
    });

    await createAuditLog(tx, {
      entityType: "user",
      entityId: user.id,
      action: "create",
      actorId: actorId ?? null,
      afterData: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString()
    };
  });
}

export async function updateUser(id: string, payload: unknown, actorId?: string | null) {
  const parsed = updateUserSchema.safeParse(payload);
  if (!parsed.success) {
    throw createServiceError("بيانات المستخدم غير صالحة.", 400);
  }

  const existing = await prisma.user.findUnique({
    where: { id }
  });

  if (!existing) {
    throw createServiceError("المستخدم غير موجود.", 404);
  }

  const data: {
    name?: string;
    email?: string;
    passwordHash?: string;
    role?: "admin" | "manager" | "data_entry";
    isActive?: boolean;
  } = {};

  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.email !== undefined) data.email = parsed.data.email;
  if (parsed.data.role !== undefined) data.role = parsed.data.role;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
  if (parsed.data.password) data.passwordHash = await bcrypt.hash(parsed.data.password, 10);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data
    });

    await createAuditLog(tx, {
      entityType: "user",
      entityId: id,
      action: "update",
      actorId: actorId ?? null,
      beforeData: existing,
      afterData: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        isActive: updated.isActive
      }
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString()
    };
  });
}

export async function deleteUser(id: string, actorId: string) {
  if (id === actorId) {
    throw createServiceError("لا يمكن حذف المستخدم الحالي.", 400);
  }

  const existing = await prisma.user.findUnique({
    where: { id }
  });

  if (!existing) {
    throw createServiceError("المستخدم غير موجود.", 404);
  }

  return prisma.$transaction(async (tx) => {
    await tx.user.delete({
      where: { id }
    });

    await createAuditLog(tx, {
      entityType: "user",
      entityId: id,
      action: "delete",
      actorId,
      beforeData: existing
    });

    return { id };
  });
}

function createServiceError(message: string, status: number) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}
