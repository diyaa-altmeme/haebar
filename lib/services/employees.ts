import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/services/audit-log";

const employeeSchema = z.object({
  name: z.string().min(2).max(100),
  cashierNumber: z.number().int().min(1).max(99),
  shift: z.enum(["morning", "evening", "night"]),
  employeeType: z.enum(["cashier", "accounting", "treasury", "manager"]),
  phone: z.string().max(20).optional().nullable(),
  salary: z.union([z.string(), z.number()]).optional(),
  status: z.enum(["active", "leave", "suspended"])
});

export async function listEmployees() {
  const employees = await prisma.employee.findMany({
    orderBy: [{ cashierNumber: "asc" }, { name: "asc" }]
  });

  return employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
    cashierNumber: employee.cashierNumber,
    shift: employee.shift,
    employeeType: employee.employeeType,
    status: employee.status,
    phone: employee.phone,
    salary: employee.salary.toFixed(3)
  }));
}

export async function createEmployee(payload: unknown, actorId?: string | null) {
  const parsed = employeeSchema.safeParse(payload);
  if (!parsed.success) {
    throw createServiceError("بيانات الموظف غير صالحة.", 400);
  }

  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.create({
      data: {
        name: parsed.data.name,
        cashierNumber: parsed.data.cashierNumber,
        shift: parsed.data.shift,
        employeeType: parsed.data.employeeType,
        phone: parsed.data.phone ?? null,
        salary: String(parsed.data.salary ?? "0.000"),
        status: parsed.data.status
      }
    });

    await createAuditLog(tx, {
      entityType: "employee",
      entityId: employee.id,
      action: "create",
      actorId: actorId ?? null,
      afterData: employee
    });

    return {
      ...employee,
      salary: employee.salary.toFixed(3),
      createdAt: employee.createdAt.toISOString()
    };
  });
}

export async function updateEmployee(id: string, payload: unknown, actorId?: string | null) {
  const parsed = employeeSchema.safeParse(payload);
  if (!parsed.success) {
    throw createServiceError("بيانات الموظف غير صالحة.", 400);
  }

  const existing = await prisma.employee.findUnique({
    where: { id }
  });

  if (!existing) {
    throw createServiceError("الموظف غير موجود.", 404);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.employee.update({
      where: { id },
      data: {
        name: parsed.data.name,
        cashierNumber: parsed.data.cashierNumber,
        shift: parsed.data.shift,
        employeeType: parsed.data.employeeType,
        phone: parsed.data.phone ?? null,
        salary: String(parsed.data.salary ?? "0.000"),
        status: parsed.data.status
      }
    });

    await createAuditLog(tx, {
      entityType: "employee",
      entityId: id,
      action: "update",
      actorId: actorId ?? null,
      beforeData: existing,
      afterData: updated
    });

    return {
      ...updated,
      salary: updated.salary.toFixed(3),
      createdAt: updated.createdAt.toISOString()
    };
  });
}

export async function employeeSales(employeeId: string, month: number, year: number) {
  const sales = await prisma.sale.findMany({
    where: {
      employeeId,
      month,
      year
    },
    orderBy: [{ saleDate: "asc" }, { shift: "asc" }]
  });

  return sales.map((sale) => ({
    id: sale.id,
    saleDate: sale.saleDate.toISOString().slice(0, 10),
    shift: sale.shift,
    cashierNumber: sale.cashierNumber,
    totalNetSystem: sale.totalNetSystem.toFixed(3),
    totalActual: sale.totalActual.toFixed(3),
    diffTotal: sale.diffTotal.toFixed(3)
  }));
}

function createServiceError(message: string, status: number) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}
