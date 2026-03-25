import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  isCompanySettlement: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional()
});

export async function listExpenseCategories() {
  return prisma.expenseCategory.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
  });
}

export async function createExpenseCategory(payload) {
  const parsed = categorySchema.safeParse(payload);
  if (!parsed.success) {
    const err = new Error("Invalid input");
    err.statusCode = 400;
    err.details = parsed.error.flatten();
    throw err;
  }
  const p = parsed.data;
  return prisma.expenseCategory.create({
    data: {
      name: p.name,
      isCompanySettlement: p.isCompanySettlement ?? false,
      isActive: p.isActive ?? true,
      displayOrder: p.displayOrder ?? 0
    }
  });
}

export async function updateExpenseCategory(id, payload) {
  const parsed = categorySchema.safeParse(payload);
  if (!parsed.success) {
    const err = new Error("Invalid input");
    err.statusCode = 400;
    err.details = parsed.error.flatten();
    throw err;
  }
  const p = parsed.data;
  return prisma.expenseCategory.update({
    where: { id },
    data: {
      name: p.name,
      isCompanySettlement: p.isCompanySettlement ?? false,
      isActive: p.isActive ?? true,
      displayOrder: p.displayOrder ?? 0
    }
  });
}

export async function getActiveMonth() {
  return prisma.monthlySetting.findFirst({
    where: { isActive: true },
    orderBy: { createdBy: "asc" }
  });
}

export async function setActiveMonth({ month, year, createdBy }) {
  const daysInMonth = new Date(year, month, 0).getDate();

  return prisma.$transaction(async (tx) => {
    await tx.monthlySetting.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    const existing = await tx.monthlySetting.findFirst({
      where: { month, year }
    });

    if (existing) {
      return tx.monthlySetting.update({
        where: { id: existing.id },
        data: { isActive: true, daysInMonth }
      });
    }

    return tx.monthlySetting.create({
      data: {
        month,
        year,
        daysInMonth,
        isActive: true,
        createdBy
      }
    });
  });
}

