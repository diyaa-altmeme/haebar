import { z } from "zod";

import { cacheRemember, invalidateCacheByPrefix } from "@/lib/cache";
import { invalidateSettingsCaches } from "@/lib/cache/financial";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/services/audit-log";

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  isCompanySettlement: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional()
});

const monthSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100)
});

export async function listExpenseCategories() {
  return cacheRemember("settings:categories", 900, async () =>
    prisma.expenseCategory.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
    })
  );
}

export async function createExpenseCategory(payload: unknown, actorId?: string | null) {
  const parsed = categorySchema.safeParse(payload);
  if (!parsed.success) {
    throw createServiceError("بيانات التصنيف غير صالحة.", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const category = await tx.expenseCategory.create({
      data: {
        name: parsed.data.name,
        isCompanySettlement: parsed.data.isCompanySettlement ?? false,
        isActive: parsed.data.isActive ?? true,
        displayOrder: parsed.data.displayOrder ?? 0
      }
    });

    await createAuditLog(tx, {
      entityType: "expense_category",
      entityId: category.id,
      action: "create",
      actorId: actorId ?? null,
      afterData: category
    });

    return category;
  });

  await invalidateSettingsCaches();
  await invalidateCacheByPrefix(["reports:", "dashboard:"]);

  return result;
}

export async function updateExpenseCategory(id: string, payload: unknown, actorId?: string | null) {
  const parsed = categorySchema.safeParse(payload);
  if (!parsed.success) {
    throw createServiceError("بيانات التصنيف غير صالحة.", 400);
  }

  const existing = await prisma.expenseCategory.findUnique({
    where: { id }
  });

  if (!existing) {
    throw createServiceError("التصنيف غير موجود.", 404);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.expenseCategory.update({
      where: { id },
      data: {
        name: parsed.data.name,
        isCompanySettlement: parsed.data.isCompanySettlement ?? false,
        isActive: parsed.data.isActive ?? true,
        displayOrder: parsed.data.displayOrder ?? 0
      }
    });

    await createAuditLog(tx, {
      entityType: "expense_category",
      entityId: id,
      action: "update",
      actorId: actorId ?? null,
      beforeData: existing,
      afterData: updated
    });

    return updated;
  });

  await invalidateSettingsCaches();
  await invalidateCacheByPrefix(["reports:", "dashboard:"]);

  return result;
}

export async function getActiveMonth() {
  return cacheRemember("settings:active-month", 900, async () =>
    prisma.monthlySetting.findFirst({
      where: { isActive: true },
      orderBy: [{ year: "desc" }, { month: "desc" }]
    })
  );
}

export async function setActiveMonth(payload: unknown, actorId?: string | null) {
  const parsed = monthSchema.safeParse(payload);
  if (!parsed.success) {
    throw createServiceError("بيانات الشهر غير صالحة.", 400);
  }

  const daysInMonth = new Date(Date.UTC(parsed.data.year, parsed.data.month, 0)).getUTCDate();

  const result = await prisma.$transaction(async (tx) => {
    await tx.monthlySetting.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    const existing = await tx.monthlySetting.findFirst({
      where: {
        month: parsed.data.month,
        year: parsed.data.year
      }
    });

    const activeMonth = existing
      ? await tx.monthlySetting.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            daysInMonth
          }
        })
      : await tx.monthlySetting.create({
          data: {
            month: parsed.data.month,
            year: parsed.data.year,
            daysInMonth,
            isActive: true,
            createdBy: actorId ?? null
          }
        });

    await createAuditLog(tx, {
      entityType: "monthly_setting",
      entityId: activeMonth.id,
      action: "update",
      actorId: actorId ?? null,
      afterData: activeMonth
    });

    return activeMonth;
  });

  await invalidateSettingsCaches();

  return result;
}

function createServiceError(message: string, status: number) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}
