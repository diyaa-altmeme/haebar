import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import * as boxesService from "./boxesService.js";

const paymentSourceSchema = z.enum(["cash", "master", "swish", "sagi", "other_elec", "bank"]);
const paymentMethodSchema = z.enum(["cash", "check", "transfer", "card"]);
const expenseStatusSchema = z.enum(["paid", "pending", "late"]);

const expenseCreateSchema = z.object({
  dayNumber: z.number().int().min(1).max(31),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),

  category: z.string().min(1).max(100),
  subCategory: z.string().min(1).max(100).optional().nullable(),
  description: z.string().optional().nullable(),

  amount: z.number().positive(),
  paymentSource: paymentSourceSchema,
  paymentMethod: paymentMethodSchema,
  status: expenseStatusSchema,
  notes: z.string().optional().nullable()
});

function toExpenseDate(dayNumber, month, year) {
  return new Date(Date.UTC(year, month - 1, dayNumber, 0, 0, 0));
}

export async function createExpense({ payload, enteredByUserId }) {
  const parsed = expenseCreateSchema.safeParse(payload);
  if (!parsed.success) {
    const err = new Error("Invalid input");
    err.statusCode = 400;
    err.details = parsed.error.flatten();
    throw err;
  }
  const input = parsed.data;
  const expenseDate = toExpenseDate(input.dayNumber, input.month, input.year);

  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        expenseDate,
        dayNumber: input.dayNumber,
        month: input.month,
        year: input.year,
        category: input.category,
        subCategory: input.subCategory ?? null,
        description: input.description ?? null,
        amount: input.amount,
        paymentSource: input.paymentSource,
        paymentMethod: input.paymentMethod,
        status: input.status,
        notes: input.notes ?? null,
        enteredBy: enteredByUserId
      }
    });

    await boxesService.applyExpenseToBoxBalance({
      month: input.month,
      year: input.year,
      boxType: input.paymentSource,
      deltaTotalExpenses: input.amount,
      tx
    });

    return expense;
  });
}

export async function updateExpense(id, { payload, enteredByUserId }) {
  const parsed = expenseCreateSchema.safeParse(payload);
  if (!parsed.success) {
    const err = new Error("Invalid input");
    err.statusCode = 400;
    err.details = parsed.error.flatten();
    throw err;
  }
  const input = parsed.data;

  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error("Expense not found");
    err.statusCode = 404;
    throw err;
  }

  const oldAmount = Number(existing.amount);
  const oldMonth = existing.month;
  const oldYear = existing.year;
  const oldBox = existing.paymentSource;

  const newExpenseDate = toExpenseDate(input.dayNumber, input.month, input.year);

  return prisma.$transaction(async (tx) => {
    await tx.expense.update({
      where: { id },
      data: {
        expenseDate: newExpenseDate,
        dayNumber: input.dayNumber,
        month: input.month,
        year: input.year,
        category: input.category,
        subCategory: input.subCategory ?? null,
        description: input.description ?? null,
        amount: input.amount,
        paymentSource: input.paymentSource,
        paymentMethod: input.paymentMethod,
        status: input.status,
        notes: input.notes ?? null,
        enteredBy: enteredByUserId
      }
    });

    // Subtract old
    await boxesService.applyExpenseToBoxBalance({
      month: oldMonth,
      year: oldYear,
      boxType: oldBox,
      deltaTotalExpenses: -oldAmount,
      tx
    });
    // Add new
    await boxesService.applyExpenseToBoxBalance({
      month: input.month,
      year: input.year,
      boxType: input.paymentSource,
      deltaTotalExpenses: input.amount,
      tx
    });

    return { id };
  });
}

export async function deleteExpense(id, enteredByUserId) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error("Expense not found");
    err.statusCode = 404;
    throw err;
  }

  const oldAmount = Number(existing.amount);
  const oldMonth = existing.month;
  const oldYear = existing.year;
  const oldBox = existing.paymentSource;

  return prisma.$transaction(async (tx) => {
    await tx.expense.delete({ where: { id } });
    await boxesService.applyExpenseToBoxBalance({
      month: oldMonth,
      year: oldYear,
      boxType: oldBox,
      deltaTotalExpenses: -oldAmount,
      tx
    });
    return { id, deletedBy: enteredByUserId };
  });
}

export async function listExpenses({ month, year, category, boxType }) {
  const where = { month, year };
  if (category) where.category = category;
  if (boxType) where.paymentSource = boxType;

  return prisma.expense.findMany({
    where,
    orderBy: [{ expenseDate: "asc" }, { createdAt: "desc" }]
  });
}

