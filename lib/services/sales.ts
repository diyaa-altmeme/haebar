import { type Prisma } from "@prisma/client";

import { cacheRemember } from "@/lib/cache";
import { computeSale, salePayloadSchema } from "@/lib/calculations/sales";
import { invalidateFinancialPeriodCaches } from "@/lib/cache/financial";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/services/audit-log";
import { recalculateBoxBalancesForPeriod } from "@/lib/services/box-balances";

export async function listSales(month: number, year: number) {
  return cacheRemember(`sales:${year}:${month}`, 300, async () => {
    const sales = await prisma.sale.findMany({
      where: { month, year },
      orderBy: [{ saleDate: "desc" }, { cashierNumber: "asc" }, { shift: "asc" }],
      include: {
        employee: {
          select: {
            name: true
          }
        }
      }
    });

    return sales.map(serializeSale);
  });
}

export async function getSaleById(id: string) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      employee: {
        select: {
          name: true
        }
      },
      cashBreakdown: {
        orderBy: { denomination: "asc" }
      }
    }
  });

  if (!sale) {
    throw createServiceError("القيد المطلوب غير موجود.", 404);
  }

  return serializeSale(sale);
}

export async function getCashBreakdownBySaleId(id: string) {
  const breakdown = await prisma.cashBreakdown.findMany({
    where: { saleId: id },
    orderBy: { denomination: "asc" }
  });

  return breakdown.map((row) => ({
    id: row.id,
    denomination: row.denomination,
    count: row.count,
    subtotal: row.subtotal.toFixed(3)
  }));
}

export async function createSale(payload: unknown) {
  const validated = parsePayload(payload);
  const computed = computeSale(validated);

  const employee = await prisma.employee.findUnique({
    where: { id: validated.employeeId }
  });

  if (!employee || employee.status !== "active") {
    throw createServiceError("يجب اختيار موظف كاشير فعال.", 400);
  }

  if (employee.cashierNumber !== validated.cashierNumber) {
    throw createServiceError("رقم الكاشير لا يطابق ملف الموظف.", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const duplicate = await tx.sale.findFirst({
      where: {
        saleDate: computed.saleDate,
        cashierNumber: validated.cashierNumber,
        shift: validated.shift
      }
    });

    if (duplicate) {
      throw createServiceError("تم تسجيل هذا الشفت مسبقاً لنفس التاريخ والكاشير.", 409);
    }

    const sale = await tx.sale.create({
      data: {
        saleDate: computed.saleDate,
        dayNumber: computed.dayNumber,
        month: computed.month,
        year: computed.year,
        employeeId: validated.employeeId,
        cashierNumber: validated.cashierNumber,
        shift: validated.shift,
        entryTime: validated.entryTime ?? null,
        notes: validated.notes ?? null,
        enteredBy: validated.actorUserId ?? null,
        ...computed.financials
      }
    });

    if (computed.breakdownRows.length > 0) {
      await tx.cashBreakdown.createMany({
        data: computed.breakdownRows.map((row) => ({
          saleId: sale.id,
          denomination: row.denomination,
          count: row.count,
          subtotal: row.subtotal
        }))
      });
    }

    await recalculateBoxBalancesForPeriod(tx, {
      month: computed.month,
      year: computed.year,
      actorUserId: validated.actorUserId ?? null,
      note: "إعادة حساب تلقائية بعد إضافة مبيعات"
    });

    await createAuditLog(tx, {
      entityType: "sale",
      entityId: sale.id,
      action: "create",
      actorId: validated.actorUserId ?? null,
      afterData: {
        sale,
        cashBreakdown: computed.breakdownRows
      }
    });

    return getSaleByIdWithClient(tx, sale.id);
  });

  await invalidateFinancialPeriodCaches([{ month: computed.month, year: computed.year }]);

  return result;
}

export async function updateSale(id: string, payload: unknown) {
  const validated = parsePayload(payload);
  const computed = computeSale(validated);

  const existing = await prisma.sale.findUnique({
    where: { id },
    include: {
      cashBreakdown: true
    }
  });

  if (!existing) {
    throw createServiceError("القيد المطلوب غير موجود.", 404);
  }

  const result = await prisma.$transaction(async (tx) => {
    const duplicate = await tx.sale.findFirst({
      where: {
        id: { not: id },
        saleDate: computed.saleDate,
        cashierNumber: validated.cashierNumber,
        shift: validated.shift
      }
    });

    if (duplicate) {
      throw createServiceError("يوجد شفت آخر بنفس التاريخ والكاشير والفترة.", 409);
    }

    await tx.cashBreakdown.deleteMany({
      where: { saleId: id }
    });

    await tx.sale.update({
      where: { id },
      data: {
        saleDate: computed.saleDate,
        dayNumber: computed.dayNumber,
        month: computed.month,
        year: computed.year,
        employeeId: validated.employeeId,
        cashierNumber: validated.cashierNumber,
        shift: validated.shift,
        entryTime: validated.entryTime ?? null,
        notes: validated.notes ?? null,
        enteredBy: validated.actorUserId ?? null,
        ...computed.financials
      }
    });

    if (computed.breakdownRows.length > 0) {
      await tx.cashBreakdown.createMany({
        data: computed.breakdownRows.map((row) => ({
          saleId: id,
          denomination: row.denomination,
          count: row.count,
          subtotal: row.subtotal
        }))
      });
    }

    await recalculateBoxBalancesForPeriod(tx, {
      month: computed.month,
      year: computed.year,
      actorUserId: validated.actorUserId ?? null,
      note: "إعادة حساب تلقائية بعد تعديل مبيعات"
    });

    await createAuditLog(tx, {
      entityType: "sale",
      entityId: id,
      action: "update",
      actorId: validated.actorUserId ?? null,
      beforeData: {
        sale: existing,
        cashBreakdown: existing.cashBreakdown
      },
      afterData: {
        financials: computed.financials,
        cashBreakdown: computed.breakdownRows
      }
    });

    return getSaleByIdWithClient(tx, id);
  });

  await invalidateFinancialPeriodCaches([
    { month: existing.month, year: existing.year },
    { month: computed.month, year: computed.year }
  ]);

  return result;
}

export async function deleteSale(id: string, actorUserId?: string | null) {
  const existing = await prisma.sale.findUnique({
    where: { id },
    include: {
      cashBreakdown: true
    }
  });

  if (!existing) {
    throw createServiceError("القيد المطلوب غير موجود.", 404);
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.sale.delete({
      where: { id }
    });

    await recalculateBoxBalancesForPeriod(tx, {
      month: existing.month,
      year: existing.year,
      actorUserId: actorUserId ?? null,
      note: "إعادة حساب تلقائية بعد حذف مبيعات"
    });

    await createAuditLog(tx, {
      entityType: "sale",
      entityId: id,
      action: "delete",
      actorId: actorUserId ?? null,
      beforeData: {
        sale: existing,
        cashBreakdown: existing.cashBreakdown
      }
    });

    return {
      id,
      month: existing.month,
      year: existing.year
    };
  });

  await invalidateFinancialPeriodCaches([{ month: existing.month, year: existing.year }]);

  return result;
}

function parsePayload(payload: unknown) {
  const result = salePayloadSchema.safeParse(payload);
  if (!result.success) {
    throw createServiceError("بيانات الإدخال غير صالحة.", 400);
  }

  return result.data;
}

function createServiceError(message: string, status: number) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}

function serializeSale(
  sale: Awaited<ReturnType<typeof prisma.sale.findFirst>> & {
    employee?: { name: string } | null;
    cashBreakdown?: Array<{
      id: string;
      denomination: number;
      count: number;
      subtotal: { toFixed: (fractionDigits?: number) => string };
    }>;
  }
) {
  if (!sale) {
    return null;
  }

  return {
    id: sale.id,
    saleDate: sale.saleDate.toISOString().slice(0, 10),
    dayNumber: sale.dayNumber,
    month: sale.month,
    year: sale.year,
    employeeId: sale.employeeId,
    employeeName: sale.employee?.name ?? null,
    cashierNumber: sale.cashierNumber,
    shift: sale.shift,
    entryTime: sale.entryTime,
    notes: sale.notes,
    cashSystem: sale.cashSystem.toFixed(3),
    returns: sale.returns.toFixed(3),
    netCashSystem: sale.netCashSystem.toFixed(3),
    masterSystem: sale.masterSystem.toFixed(3),
    swishSystem: sale.swishSystem.toFixed(3),
    sagiSystem: sale.sagiSystem.toFixed(3),
    otherElecSystem: sale.otherElecSystem.toFixed(3),
    totalElecSystem: sale.totalElecSystem.toFixed(3),
    totalNetSystem: sale.totalNetSystem.toFixed(3),
    cashActual: sale.cashActual.toFixed(3),
    masterActual: sale.masterActual.toFixed(3),
    swishActual: sale.swishActual.toFixed(3),
    sagiActual: sale.sagiActual.toFixed(3),
    otherElecActual: sale.otherElecActual.toFixed(3),
    totalElecActual: sale.totalElecActual.toFixed(3),
    totalActual: sale.totalActual.toFixed(3),
    diffCash: sale.diffCash.toFixed(3),
    diffElec: sale.diffElec.toFixed(3),
    diffTotal: sale.diffTotal.toFixed(3),
    cashBreakdown:
      sale.cashBreakdown?.map((row) => ({
        id: row.id,
        denomination: row.denomination,
        count: row.count,
        subtotal: row.subtotal.toFixed(3)
      })) ?? []
  };
}

async function getSaleByIdWithClient(tx: Prisma.TransactionClient, id: string) {
  const sale = await tx.sale.findUnique({
    where: { id },
    include: {
      employee: {
        select: {
          name: true
        }
      },
      cashBreakdown: {
        orderBy: { denomination: "asc" }
      }
    }
  });

  if (!sale) {
    throw createServiceError("القيد المطلوب غير موجود.", 404);
  }

  return serializeSale(sale);
}
