import { z } from "zod";

import { cacheRemember } from "@/lib/cache";
import { invalidateFinancialPeriodCaches } from "@/lib/cache/financial";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/services/audit-log";
import { recalculateBoxBalancesForPeriod } from "@/lib/services/box-balances";

const expenseSchema = z.object({
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string().min(1).max(100),
  subCategory: z.string().max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  amount: z.union([z.string(), z.number()]),
  paymentSource: z.enum(["cash", "master", "swish", "sagi", "other_elec", "bank"]),
  paymentMethod: z.enum(["cash", "check", "transfer", "card"]),
  status: z.enum(["paid", "pending", "late"]),
  notes: z.string().optional().nullable()
});

export async function listExpenses(month: number, year: number, category?: string | null, boxType?: string | null) {
  return cacheRemember(`expenses:${year}:${month}:${category ?? "all"}:${boxType ?? "all"}`, 300, async () => {
    const expenses = await prisma.expense.findMany({
      where: {
        month,
        year,
        ...(category ? { category } : {}),
        ...(boxType ? { paymentSource: boxType as "cash" } : {})
      },
      orderBy: [{ expenseDate: "asc" }, { createdAt: "desc" }]
    });

    return expenses.map(serializeExpense);
  });
}

export async function createExpense(payload: unknown, actorId?: string | null) {
  const input = parseExpense(payload);
  const expenseDate = new Date(`${input.expenseDate}T00:00:00.000Z`);
  const month = expenseDate.getUTCMonth() + 1;
  const year = expenseDate.getUTCFullYear();
  const dayNumber = expenseDate.getUTCDate();

  const result = await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        expenseDate,
        dayNumber,
        month,
        year,
        category: input.category,
        subCategory: input.subCategory ?? null,
        description: input.description ?? null,
        amount: input.amount,
        paymentSource: input.paymentSource,
        paymentMethod: input.paymentMethod,
        status: input.status,
        notes: input.notes ?? null,
        enteredBy: actorId ?? null
      }
    });

    await recalculateBoxBalancesForPeriod(tx, {
      month,
      year,
      actorUserId: actorId ?? null,
      note: "إعادة حساب تلقائية بعد إضافة مصروف"
    });

    await createAuditLog(tx, {
      entityType: "expense",
      entityId: expense.id,
      action: "create",
      actorId: actorId ?? null,
      afterData: expense
    });

    return serializeExpense(expense);
  });

  await invalidateFinancialPeriodCaches([{ month, year }]);

  return result;
}

export async function updateExpense(id: string, payload: unknown, actorId?: string | null) {
  const input = parseExpense(payload);
  const existing = await prisma.expense.findUnique({
    where: { id }
  });

  if (!existing) {
    throw createServiceError("المصروف غير موجود.", 404);
  }

  const expenseDate = new Date(`${input.expenseDate}T00:00:00.000Z`);
  const month = expenseDate.getUTCMonth() + 1;
  const year = expenseDate.getUTCFullYear();
  const dayNumber = expenseDate.getUTCDate();

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.expense.update({
      where: { id },
      data: {
        expenseDate,
        dayNumber,
        month,
        year,
        category: input.category,
        subCategory: input.subCategory ?? null,
        description: input.description ?? null,
        amount: input.amount,
        paymentSource: input.paymentSource,
        paymentMethod: input.paymentMethod,
        status: input.status,
        notes: input.notes ?? null,
        enteredBy: actorId ?? null
      }
    });

    await recalculateBoxBalancesForPeriod(tx, {
      month: existing.month,
      year: existing.year,
      actorUserId: actorId ?? null,
      note: "إعادة حساب بعد تعديل مصروف"
    });

    if (existing.month !== month || existing.year !== year) {
      await recalculateBoxBalancesForPeriod(tx, {
        month,
        year,
        actorUserId: actorId ?? null,
        note: "إعادة حساب بعد نقل مصروف لفترة جديدة"
      });
    }

    await createAuditLog(tx, {
      entityType: "expense",
      entityId: id,
      action: "update",
      actorId: actorId ?? null,
      beforeData: existing,
      afterData: updated
    });

    return serializeExpense(updated);
  });

  await invalidateFinancialPeriodCaches([
    { month: existing.month, year: existing.year },
    { month, year }
  ]);

  return result;
}

export async function deleteExpense(id: string, actorId?: string | null) {
  const existing = await prisma.expense.findUnique({
    where: { id }
  });

  if (!existing) {
    throw createServiceError("المصروف غير موجود.", 404);
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.expense.delete({
      where: { id }
    });

    await recalculateBoxBalancesForPeriod(tx, {
      month: existing.month,
      year: existing.year,
      actorUserId: actorId ?? null,
      note: "إعادة حساب بعد حذف مصروف"
    });

    await createAuditLog(tx, {
      entityType: "expense",
      entityId: id,
      action: "delete",
      actorId: actorId ?? null,
      beforeData: existing
    });

    return { id };
  });

  await invalidateFinancialPeriodCaches([{ month: existing.month, year: existing.year }]);

  return result;
}

function parseExpense(payload: unknown) {
  const parsed = expenseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createServiceError("بيانات المصروف غير صالحة.", 400);
  }

  return {
    ...parsed.data,
    amount: String(parsed.data.amount)
  };
}

function serializeExpense(expense: {
  id: string;
  expenseDate: Date;
  dayNumber: number;
  month: number;
  year: number;
  category: string;
  subCategory: string | null;
  description: string | null;
  amount: { toFixed: (digits?: number) => string };
  paymentSource: string;
  paymentMethod: string;
  status: string;
  notes: string | null;
  createdAt: Date;
}) {
  return {
    id: expense.id,
    expenseDate: expense.expenseDate.toISOString().slice(0, 10),
    dayNumber: expense.dayNumber,
    month: expense.month,
    year: expense.year,
    category: expense.category,
    subCategory: expense.subCategory,
    description: expense.description,
    amount: expense.amount.toFixed(3),
    paymentSource: expense.paymentSource,
    paymentMethod: expense.paymentMethod,
    status: expense.status,
    notes: expense.notes,
    createdAt: expense.createdAt.toISOString()
  };
}

function createServiceError(message: string, status: number) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}
