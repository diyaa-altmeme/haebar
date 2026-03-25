import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

function toDecimal(v) {
  if (v instanceof Prisma.Decimal) return v;
  return new Prisma.Decimal(v ?? 0);
}

export async function getOrCreateBoxBalance(boxType, month, year, tx = prisma) {
  // Use findFirst to avoid relying on generated composite unique field names.
  const existing = await tx.boxBalance.findFirst({
    where: { boxType, month, year }
  });

  if (existing) return existing;

  return tx.boxBalance.create({
    data: {
      boxType,
      month,
      year,
      openingBalance: 0,
      incomeSystem: 0,
      incomeActual: 0,
      totalExpenses: 0,
      transfersIn: 0,
      transfersOut: 0,
      calculatedBalance: 0,
      actualBalance: null,
      difference: null
    }
  });
}

export async function recalculateBoxBalance(boxType, month, year, tx = prisma) {
  const box = await tx.boxBalance.findFirst({
    where: { boxType, month, year }
  });
  if (!box) return;

  const opening = toDecimal(box.openingBalance);
  const incomeActual = toDecimal(box.incomeActual);
  const totalExpenses = toDecimal(box.totalExpenses);
  const transfersIn = toDecimal(box.transfersIn);
  const transfersOut = toDecimal(box.transfersOut);

  const calculated = opening.plus(incomeActual).minus(totalExpenses).plus(transfersIn).minus(transfersOut);
  const actual = box.actualBalance == null ? null : toDecimal(box.actualBalance);
  const difference = actual == null ? null : actual.minus(calculated);

  await tx.boxBalance.update({
    where: { id: box.id },
    data: {
      calculatedBalance: calculated,
      actualBalance: actual,
      difference
    }
  });
}

export async function applySalesToBoxBalances({
  month,
  year,
  cash,
  master,
  swish,
  sagi,
  otherElec,
  // system / actual pairs
  tx = prisma
}) {
  const updates = [
    { type: "cash", deltaIncomeSystem: cash.system, deltaIncomeActual: cash.actual },
    { type: "master", deltaIncomeSystem: master.system, deltaIncomeActual: master.actual },
    { type: "swish", deltaIncomeSystem: swish.system, deltaIncomeActual: swish.actual },
    { type: "sagi", deltaIncomeSystem: sagi.system, deltaIncomeActual: sagi.actual },
    { type: "other_elec", deltaIncomeSystem: otherElec.system, deltaIncomeActual: otherElec.actual }
  ];

  for (const u of updates) {
    const box = await getOrCreateBoxBalance(u.type, month, year, tx);
    await tx.boxBalance.update({
      where: { id: box.id },
      data: {
        incomeSystem: { increment: u.deltaIncomeSystem },
        incomeActual: { increment: u.deltaIncomeActual }
      }
    });
    await recalculateBoxBalance(u.type, month, year, tx);
  }
}

export async function applyExpenseToBoxBalance({
  month,
  year,
  boxType,
  deltaTotalExpenses,
  tx = prisma
}) {
  const box = await getOrCreateBoxBalance(boxType, month, year, tx);
  await tx.boxBalance.update({
    where: { id: box.id },
    data: {
      totalExpenses: { increment: deltaTotalExpenses }
    }
  });
  await recalculateBoxBalance(boxType, month, year, tx);
}

export async function applyTransferToBoxBalance({
  month,
  year,
  boxType,
  deltaTransfersIn,
  deltaTransfersOut,
  tx = prisma
}) {
  const box = await getOrCreateBoxBalance(boxType, month, year, tx);
  await tx.boxBalance.update({
    where: { id: box.id },
    data: {
      transfersIn: { increment: deltaTransfersIn },
      transfersOut: { increment: deltaTransfersOut }
    }
  });
  await recalculateBoxBalance(boxType, month, year, tx);
}

export async function getBoxesForMonth({ month, year }) {
  return prisma.boxBalance.findMany({
    where: { month, year },
    orderBy: { boxType: "asc" }
  });
}

export async function setBoxOpeningBalance({ boxType, month, year, openingBalance }, tx = prisma) {
  const box = await getOrCreateBoxBalance(boxType, month, year, tx);
  await tx.boxBalance.update({
    where: { id: box.id },
    data: { openingBalance }
  });
  await recalculateBoxBalance(boxType, month, year, tx);
  return box.id;
}

export async function setBoxActualBalance({ boxType, month, year, actualBalance }, tx = prisma) {
  const box = await getOrCreateBoxBalance(boxType, month, year, tx);
  await tx.boxBalance.update({
    where: { id: box.id },
    data: { actualBalance }
  });
  await recalculateBoxBalance(boxType, month, year, tx);
  return box.id;
}

