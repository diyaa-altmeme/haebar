import { BoxType, ExpenseStatus, type Prisma } from "@prisma/client";

import { cacheRemember } from "@/lib/cache";
import { addMoney, money, normalizeMoney, subtractMoney } from "@/lib/calculations/money";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/services/audit-log";

const boxTypes: BoxType[] = ["cash", "master", "swish", "sagi", "other_elec", "bank"];

type TransactionClient = Prisma.TransactionClient;

type BalanceState = {
  openingBalance: string;
  actualBalance: string | null;
  incomeSystem: string;
  incomeActual: string;
  totalExpenses: string;
  transfersIn: string;
  transfersOut: string;
};

export async function recalculateBoxBalancesForPeriod(
  tx: TransactionClient,
  input: {
    month: number;
    year: number;
    actorUserId?: string | null;
    createRun?: boolean;
    note?: string;
  }
) {
  const run =
    input.createRun === true
      ? await tx.recalculationRun.create({
          data: {
            month: input.month,
            year: input.year,
            status: "running",
            triggeredBy: input.actorUserId ?? null,
            notes: input.note ?? "إعادة حساب القاصات"
          }
        })
      : null;

  try {
    const [existingBalances, sales, expenses, transfers] = await Promise.all([
      tx.boxBalance.findMany({
        where: { month: input.month, year: input.year }
      }),
      tx.sale.findMany({
        where: { month: input.month, year: input.year }
      }),
      tx.expense.findMany({
        where: {
          month: input.month,
          year: input.year,
          status: ExpenseStatus.paid
        }
      }),
      tx.boxTransfer.findMany({
        where: {
          month: input.month,
          year: input.year,
          isConfirmed: true
        }
      })
    ]);

    const state = new Map<BoxType, BalanceState>();

    for (const boxType of boxTypes) {
      const existing = existingBalances.find((item) => item.boxType === boxType);
      state.set(boxType, {
        openingBalance: normalizeMoney(existing?.openingBalance ?? 0),
        actualBalance: existing?.actualBalance ? normalizeMoney(existing.actualBalance) : null,
        incomeSystem: normalizeMoney(0),
        incomeActual: normalizeMoney(0),
        totalExpenses: normalizeMoney(0),
        transfersIn: normalizeMoney(0),
        transfersOut: normalizeMoney(0)
      });
    }

    for (const sale of sales) {
      increaseState(state, "cash", "incomeSystem", sale.netCashSystem.toFixed(3));
      increaseState(state, "cash", "incomeActual", sale.cashActual.toFixed(3));
      increaseState(state, "master", "incomeSystem", sale.masterSystem.toFixed(3));
      increaseState(state, "master", "incomeActual", sale.masterActual.toFixed(3));
      increaseState(state, "swish", "incomeSystem", sale.swishSystem.toFixed(3));
      increaseState(state, "swish", "incomeActual", sale.swishActual.toFixed(3));
      increaseState(state, "sagi", "incomeSystem", sale.sagiSystem.toFixed(3));
      increaseState(state, "sagi", "incomeActual", sale.sagiActual.toFixed(3));
      increaseState(state, "other_elec", "incomeSystem", sale.otherElecSystem.toFixed(3));
      increaseState(state, "other_elec", "incomeActual", sale.otherElecActual.toFixed(3));
    }

    for (const expense of expenses) {
      increaseState(state, expense.paymentSource, "totalExpenses", expense.amount.toFixed(3));
    }

    for (const transfer of transfers) {
      increaseState(state, transfer.toBox, "transfersIn", transfer.amount.toFixed(3));
      increaseState(state, transfer.fromBox, "transfersOut", transfer.amount.toFixed(3));
    }

    const summary = [];

    for (const boxType of boxTypes) {
      const values = state.get(boxType)!;
      const calculatedBalance = subtractMoney(
        addMoney(values.openingBalance, values.incomeActual, values.transfersIn),
        values.totalExpenses,
        values.transfersOut
      );

      const difference =
        values.actualBalance === null
          ? null
          : normalizeMoney(subtractMoney(values.actualBalance, calculatedBalance));

      const record = {
        boxType,
        month: input.month,
        year: input.year,
        openingBalance: values.openingBalance,
        incomeSystem: values.incomeSystem,
        incomeActual: values.incomeActual,
        totalExpenses: values.totalExpenses,
        transfersIn: values.transfersIn,
        transfersOut: values.transfersOut,
        calculatedBalance: normalizeMoney(calculatedBalance),
        actualBalance: values.actualBalance,
        difference
      };

      await tx.boxBalance.upsert({
        where: {
          boxType_month_year: {
            boxType,
            month: input.month,
            year: input.year
          }
        },
        update: record,
        create: record
      });

      summary.push(record);
    }

    if (run) {
      await tx.recalculationRun.update({
        where: { id: run.id },
        data: {
          status: "completed",
          finishedAt: new Date(),
          summary
        }
      });
    }

    await createAuditLog(tx, {
      entityType: "box_balance",
      action: "recalculate",
      actorId: input.actorUserId ?? null,
      metadata: {
        month: input.month,
        year: input.year,
        note: input.note ?? null
      },
      afterData: summary
    });

    return summary;
  } catch (error) {
    if (run) {
      await tx.recalculationRun.update({
        where: { id: run.id },
        data: {
          status: "failed",
          finishedAt: new Date(),
          summary: {
            message: error instanceof Error ? error.message : "Unexpected error"
          }
        }
      });
    }

    throw error;
  }
}

export async function listBoxBalances(tx: TransactionClient, month: number, year: number) {
  const balances = await tx.boxBalance.findMany({
    where: { month, year },
    orderBy: { boxType: "asc" }
  });

  return balances.map((balance) => ({
    id: balance.id,
    boxType: balance.boxType,
    month: balance.month,
    year: balance.year,
    openingBalance: balance.openingBalance.toFixed(3),
    incomeSystem: balance.incomeSystem.toFixed(3),
    incomeActual: balance.incomeActual.toFixed(3),
    totalExpenses: balance.totalExpenses.toFixed(3),
    transfersIn: balance.transfersIn.toFixed(3),
    transfersOut: balance.transfersOut.toFixed(3),
    calculatedBalance: balance.calculatedBalance.toFixed(3),
    actualBalance: balance.actualBalance?.toFixed(3) ?? null,
    difference: balance.difference?.toFixed(3) ?? null,
    updatedAt: balance.updatedAt.toISOString()
  }));
}

export async function listBoxBalancesForPeriod(month: number, year: number) {
  return cacheRemember(`boxes:${year}:${month}`, 300, async () => prisma.$transaction((tx) => listBoxBalances(tx, month, year)));
}

export async function setBoxOpeningBalance(
  tx: TransactionClient,
  boxType: BoxType,
  month: number,
  year: number,
  openingBalance: string,
  actorId?: string | null
) {
  const existing = await tx.boxBalance.findFirst({
    where: { boxType, month, year }
  });

  const updated = await tx.boxBalance.upsert({
    where: {
      boxType_month_year: {
        boxType,
        month,
        year
      }
    },
    update: {
      openingBalance
    },
    create: {
      boxType,
      month,
      year,
      openingBalance,
      incomeSystem: "0.000",
      incomeActual: "0.000",
      totalExpenses: "0.000",
      transfersIn: "0.000",
      transfersOut: "0.000",
      calculatedBalance: "0.000",
      actualBalance: null,
      difference: null
    }
  });

  await recalculateBoxBalancesForPeriod(tx, {
    month,
    year,
    actorUserId: actorId ?? null,
    note: `تحديث الرصيد الافتتاحي لقاصة ${boxType}`
  });

  return updated.id;
}

export async function setBoxActualBalance(
  tx: TransactionClient,
  boxType: BoxType,
  month: number,
  year: number,
  actualBalance: string,
  actorId?: string | null
) {
  const updated = await tx.boxBalance.upsert({
    where: {
      boxType_month_year: {
        boxType,
        month,
        year
      }
    },
    update: {
      actualBalance
    },
    create: {
      boxType,
      month,
      year,
      openingBalance: "0.000",
      incomeSystem: "0.000",
      incomeActual: "0.000",
      totalExpenses: "0.000",
      transfersIn: "0.000",
      transfersOut: "0.000",
      calculatedBalance: "0.000",
      actualBalance,
      difference: null
    }
  });

  await recalculateBoxBalancesForPeriod(tx, {
    month,
    year,
    actorUserId: actorId ?? null,
    note: `تحديث الرصيد الفعلي لقاصة ${boxType}`
  });

  return updated.id;
}

function increaseState(
  state: Map<BoxType, BalanceState>,
  boxType: BoxType,
  key: "incomeSystem" | "incomeActual" | "totalExpenses" | "transfersIn" | "transfersOut",
  amount: string
) {
  const existing = state.get(boxType);
  if (!existing) {
    return;
  }

  existing[key] = normalizeMoney(money(existing[key]).plus(amount));
}
