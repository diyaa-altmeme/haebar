import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import * as boxesService from "./boxesService.js";

const shiftSchema = z.enum(["morning", "evening", "night"]);

const cashBreakdownSchema = z
  .array(
    z.object({
      denomination: z.number().int().positive(),
      count: z.number().int().nonnegative()
    })
  )
  .min(1);

const saleCreateSchema = z.object({
  employeeId: z.string().uuid(),
  cashierNumber: z.number().int().min(1).max(4),
  shift: shiftSchema,
  dayNumber: z.number().int().min(1).max(31),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),

  cashSystem: z.number().nonnegative(),
  returns: z.number().nonnegative(),
  cashActual: z.number().nonnegative(), // Add cashActual to schema

  masterSystem: z.number().nonnegative(),
  swishSystem: z.number().nonnegative(),
  sagiSystem: z.number().nonnegative(),
  otherElecSystem: z.number().nonnegative(),

  masterActual: z.number().nonnegative(),
  swishActual: z.number().nonnegative(),
  sagiActual: z.number().nonnegative(),
  otherElecActual: z.number().nonnegative(),

  cashBreakdown: cashBreakdownSchema,
  notes: z.string().optional().nullable(),
  entryTime: z.string().optional().nullable()
});

function computeSaleFields(input, saleDate) {
  const breakdown = input.cashBreakdown;

  const breakdownTotal = breakdown.reduce((sum, r) => sum + r.denomination * r.count, 0);
  let cashActual = input.cashActual !== undefined ? Number(input.cashActual) : breakdownTotal;

  // إذا تلقى الإدخال قيمة cashActual و كانت اختلافاً كبيراً من قيمة الكاش باك داون، نستخدم القيمة المشتقة من breakdown.
  if (input.cashActual !== undefined && Math.abs(cashActual - breakdownTotal) > 0.01) {
    cashActual = breakdownTotal; // تفضيل النزاهة الحسابية من الكاش بريك داون
  }

  const netCashSystem = input.cashSystem - input.returns;
  if (netCashSystem < 0) {
    throw new Error("returns cannot exceed cashSystem");
  }

  const totalElecSystem = input.masterSystem + input.swishSystem + input.sagiSystem + input.otherElecSystem;
  const totalNetSystem = netCashSystem + totalElecSystem;

  const totalElecActual = input.masterActual + input.swishActual + input.sagiActual + input.otherElecActual;
  const totalActual = cashActual + totalElecActual;

  const diffCash = cashActual - netCashSystem;
  const diffElec = totalElecActual - totalElecSystem;
  const diffTotal = totalActual - totalNetSystem;

  return {
    saleDate,
    cashActual,
    netCashSystem,
    totalElecSystem,
    totalNetSystem,
    totalElecActual,
    totalActual,
    diffCash,
    diffElec,
    diffTotal,
    // passthrough for storage
    cashSystem: input.cashSystem,
    returns: input.returns,
    masterSystem: input.masterSystem,
    swishSystem: input.swishSystem,
    sagiSystem: input.sagiSystem,
    otherElecSystem: input.otherElecSystem,
    masterActual: input.masterActual,
    swishActual: input.swishActual,
    sagiActual: input.sagiActual,
    otherElecActual: input.otherElecActual
  };
}

function toSaleDate(dayNumber, month, year) {
  // Use UTC to reduce timezone issues.
  const dt = new Date(Date.UTC(year, month - 1, dayNumber, 0, 0, 0));
  // Prisma will store as Date. Time part is irrelevant for @db.Date.
  return dt;
}

function decimalToNumber(v) {
  // Prisma Decimal supports toNumber()
  if (v && typeof v.toNumber === "function") return v.toNumber();
  return Number(v ?? 0);
}

export async function createSale({ payload, enteredByUserId }) {
  const parsed = saleCreateSchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.flatten();
    const err = new Error("Invalid input");
    err.statusCode = 400;
    err.details = message;
    throw err;
  }

  const input = parsed.data;
  const saleDate = toSaleDate(input.dayNumber, input.month, input.year);

  const computed = computeSaleFields(input, saleDate);

  // Verify employee exists and is active
  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId }
  });
  if (!employee || employee.status !== "active") {
    const err = new Error("Employee must be active");
    err.statusCode = 400;
    throw err;
  }

  // Prefer input cashierNumber/shift, but we also ensure they match employee config if provided.
  if (employee.cashierNumber !== input.cashierNumber) {
    const err = new Error("cashier_number mismatch with employee");
    err.statusCode = 400;
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    // Prevent duplicates: sale_date + cashier_number + shift
    const existing = await tx.sale.findFirst({
      where: {
        saleDate: computed.saleDate,
        cashierNumber: input.cashierNumber,
        shift: input.shift
      }
    });
    if (existing) {
      const err = new Error("Duplicate shift entry for this date");
      err.statusCode = 409;
      throw err;
    }

    const sale = await tx.sale.create({
      data: {
        saleDate: computed.saleDate,
        dayNumber: input.dayNumber,
        month: input.month,
        year: input.year,
        employeeId: input.employeeId,
        cashierNumber: input.cashierNumber,
        shift: input.shift,

        cashSystem: computed.cashSystem,
        returns: computed.returns,
        netCashSystem: computed.netCashSystem,
        masterSystem: computed.masterSystem,
        swishSystem: computed.swishSystem,
        sagiSystem: computed.sagiSystem,
        otherElecSystem: computed.otherElecSystem,
        totalElecSystem: computed.totalElecSystem,
        totalNetSystem: computed.totalNetSystem,

        cashActual: computed.cashActual,
        masterActual: computed.masterActual,
        swishActual: computed.swishActual,
        sagiActual: computed.sagiActual,
        otherElecActual: computed.otherElecActual,
        totalElecActual: computed.totalElecActual,
        totalActual: computed.totalActual,

        diffCash: computed.diffCash,
        diffElec: computed.diffElec,
        diffTotal: computed.diffTotal,

        notes: input.notes ?? null,
        entryTime: input.entryTime ?? null,
        enteredBy: enteredByUserId
      }
    });

    const breakdownRows = input.cashBreakdown.map((r) => ({
      saleId: sale.id,
      denomination: r.denomination,
      count: r.count,
      subtotal: r.denomination * r.count
    }));

    await tx.cashBreakdown.createMany({ data: breakdownRows });

    // Update box balances from this sale
    await boxesService.applySalesToBoxBalances({
      month: input.month,
      year: input.year,
      cash: { system: computed.netCashSystem, actual: computed.cashActual },
      master: { system: computed.masterSystem, actual: computed.masterActual },
      swish: { system: computed.swishSystem, actual: computed.swishActual },
      sagi: { system: computed.sagiSystem, actual: computed.sagiActual },
      otherElec: { system: computed.otherElecSystem, actual: computed.otherElecActual },
      tx
    });

    return sale;
  });
}

export async function updateSale(id, { payload, enteredByUserId }) {
  const parsed = saleCreateSchema.safeParse(payload);
  if (!parsed.success) {
    const err = new Error("Invalid input");
    err.statusCode = 400;
    err.details = parsed.error.flatten();
    throw err;
  }
  const input = parsed.data;
  const saleDate = toSaleDate(input.dayNumber, input.month, input.year);
  const computed = computeSaleFields(input, saleDate);

  const existing = await prisma.sale.findUnique({
    where: { id }
  });
  if (!existing) {
    const err = new Error("Sale not found");
    err.statusCode = 404;
    throw err;
  }

  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId }
  });
  if (!employee || employee.status !== "active") {
    const err = new Error("Employee must be active");
    err.statusCode = 400;
    throw err;
  }
  if (employee.cashierNumber !== input.cashierNumber) {
    const err = new Error("cashier_number mismatch with employee");
    err.statusCode = 400;
    throw err;
  }

  // Prevent duplicate after update (if date/cashier/shift changes)
  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.sale.findFirst({
      where: {
        id: { not: existing.id },
        saleDate: computed.saleDate,
        cashierNumber: input.cashierNumber,
        shift: input.shift
      }
    });
    if (duplicate) {
      const err = new Error("Duplicate shift entry for this date");
      err.statusCode = 409;
      throw err;
    }

    await tx.cashBreakdown.deleteMany({ where: { saleId: existing.id } });

    const updated = await tx.sale.update({
      where: { id },
      data: {
        saleDate: computed.saleDate,
        dayNumber: input.dayNumber,
        month: input.month,
        year: input.year,
        employeeId: input.employeeId,
        cashierNumber: input.cashierNumber,
        shift: input.shift,

        cashSystem: computed.cashSystem,
        returns: computed.returns,
        netCashSystem: computed.netCashSystem,
        masterSystem: computed.masterSystem,
        swishSystem: computed.swishSystem,
        sagiSystem: computed.sagiSystem,
        otherElecSystem: computed.otherElecSystem,
        totalElecSystem: computed.totalElecSystem,
        totalNetSystem: computed.totalNetSystem,

        cashActual: computed.cashActual,
        masterActual: computed.masterActual,
        swishActual: computed.swishActual,
        sagiActual: computed.sagiActual,
        otherElecActual: computed.otherElecActual,
        totalElecActual: computed.totalElecActual,
        totalActual: computed.totalActual,

        diffCash: computed.diffCash,
        diffElec: computed.diffElec,
        diffTotal: computed.diffTotal,

        notes: input.notes ?? null,
        entryTime: input.entryTime ?? null,
        enteredBy: enteredByUserId
      }
    });

    await tx.cashBreakdown.createMany({
      data: input.cashBreakdown.map((r) => ({
        saleId: updated.id,
        denomination: r.denomination,
        count: r.count,
        subtotal: r.denomination * r.count
      }))
    });

    // Update box balances by delta: subtract old, add new
    await boxesService.applySalesToBoxBalances({
      month: existing.month,
      year: existing.year,
      cash: { system: -decimalToNumber(existing.netCashSystem), actual: -decimalToNumber(existing.cashActual) },
      master: { system: -decimalToNumber(existing.masterSystem), actual: -decimalToNumber(existing.masterActual) },
      swish: { system: -decimalToNumber(existing.swishSystem), actual: -decimalToNumber(existing.swishActual) },
      sagi: { system: -decimalToNumber(existing.sagiSystem), actual: -decimalToNumber(existing.sagiActual) },
      otherElec: { system: -decimalToNumber(existing.otherElecSystem), actual: -decimalToNumber(existing.otherElecActual) },
      tx
    });

    await boxesService.applySalesToBoxBalances({
      month: input.month,
      year: input.year,
      cash: { system: computed.netCashSystem, actual: computed.cashActual },
      master: { system: computed.masterSystem, actual: computed.masterActual },
      swish: { system: computed.swishSystem, actual: computed.swishActual },
      sagi: { system: computed.sagiSystem, actual: computed.sagiActual },
      otherElec: { system: computed.otherElecSystem, actual: computed.otherElecActual },
      tx
    });

    return updated;
  });
}

export async function deleteSale(id, enteredByUserId) {
  const existing = await prisma.sale.findUnique({
    where: { id }
  });
  if (!existing) {
    const err = new Error("Sale not found");
    err.statusCode = 404;
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    // Subtract old contributions from box balances
    await boxesService.applySalesToBoxBalances({
      month: existing.month,
      year: existing.year,
      cash: { system: -decimalToNumber(existing.netCashSystem), actual: -decimalToNumber(existing.cashActual) },
      master: { system: -decimalToNumber(existing.masterSystem), actual: -decimalToNumber(existing.masterActual) },
      swish: { system: -decimalToNumber(existing.swishSystem), actual: -decimalToNumber(existing.swishActual) },
      sagi: { system: -decimalToNumber(existing.sagiSystem), actual: -decimalToNumber(existing.sagiActual) },
      otherElec: { system: -decimalToNumber(existing.otherElecSystem), actual: -decimalToNumber(existing.otherElecActual) },
      tx
    });

    // Deleting sale cascades breakdown entries (schema has onDelete Cascade)
    await tx.sale.delete({ where: { id } });

    return { id, deletedBy: enteredByUserId };
  });
}

export async function getSaleByEmployeeAndDate({ employeeId, date }) {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    const err = new Error("Invalid date");
    err.statusCode = 400;
    throw err;
  }

  return prisma.sale.findFirst({
    where: {
      employeeId,
      saleDate: parsedDate
    },
    include: {
      cashBreakdown: true
    }
  });
}

export async function getSalesByMonth({ month, year }) {
  return prisma.sale.findMany({
    where: { month, year },
    orderBy: [{ dayNumber: "desc" }, { cashierNumber: "asc" }, { shift: "asc" }],
    include: {
      employee: { select: { name: true } }
    }
  });
}

export async function getSalesForDay({ date }) {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    const err = new Error("Invalid date");
    err.statusCode = 400;
    throw err;
  }

  return prisma.sale.findMany({
    where: { saleDate: parsedDate },
    orderBy: [{ cashierNumber: "asc" }, { shift: "asc" }],
    include: {
      cashBreakdown: true,
      employee: { select: { name: true } },
      enteredByUser: { select: { name: true } }
    }
  });
}

export async function getCashBreakdownBySaleId(saleId) {
  return prisma.cashBreakdown.findMany({
    where: { saleId },
    orderBy: { denomination: "asc" }
  });
}

