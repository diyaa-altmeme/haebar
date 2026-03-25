import { z } from "zod";

import { addMoney, isMoneyNegative, money, normalizeMoney, subtractMoney } from "@/lib/calculations/money";

const moneyField = z
  .union([z.string(), z.number()])
  .transform((value) => normalizeMoney(value))
  .pipe(z.string().regex(/^-?\d+(\.\d{1,3})?$/));

export const shiftSchema = z.enum(["morning", "evening", "night"]);
export const denominationOptions = [250, 500, 1000, 5000, 10000, 25000, 50000, 100000] as const;

export const salePayloadSchema = z.object({
  employeeId: z.string().uuid(),
  cashierNumber: z.number().int().min(1).max(99),
  shift: shiftSchema,
  saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entryTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .nullable(),
  cashSystem: moneyField,
  returns: moneyField,
  cashActual: moneyField.optional().nullable(),
  systemElectronic: z.object({
    master: moneyField,
    swish: moneyField,
    sagi: moneyField,
    otherElec: moneyField
  }),
  actualElectronic: z.object({
    master: moneyField,
    swish: moneyField,
    sagi: moneyField,
    otherElec: moneyField
  }),
  cashBreakdown: z.array(
    z.object({
      denomination: z.number().int().positive(),
      count: z.number().int().nonnegative()
    })
  ),
  notes: z.string().max(1000).optional().nullable(),
  actorUserId: z.string().uuid().optional().nullable()
});

export type SalePayload = z.infer<typeof salePayloadSchema>;

export function computeSale(payload: SalePayload) {
  const saleDate = new Date(`${payload.saleDate}T00:00:00.000Z`);
  const effectiveBreakdownRows = payload.cashBreakdown.filter((row) => row.count > 0);
  const breakdownCashActual = effectiveBreakdownRows.reduce(
    (accumulator, row) => accumulator.plus(money(row.denomination).times(row.count)),
    money(0)
  );

  const providedCashActual = payload.cashActual ? money(payload.cashActual) : null;
  const effectiveCashActual =
    effectiveBreakdownRows.length > 0 ? breakdownCashActual : providedCashActual ?? money(0);

  const netCashSystem = subtractMoney(payload.cashSystem, payload.returns);
  if (isMoneyNegative(netCashSystem)) {
    throw createFinancialError("قيمة المرتجعات لا يمكن أن تكون أكبر من الكاش النظامي.", 400);
  }

  const totalElecSystem = addMoney(
    payload.systemElectronic.master,
    payload.systemElectronic.swish,
    payload.systemElectronic.sagi,
    payload.systemElectronic.otherElec
  );

  const totalNetSystem = addMoney(netCashSystem, totalElecSystem);

  const totalElecActual = addMoney(
    payload.actualElectronic.master,
    payload.actualElectronic.swish,
    payload.actualElectronic.sagi,
    payload.actualElectronic.otherElec
  );

  const totalActual = addMoney(effectiveCashActual, totalElecActual);
  const diffCash = subtractMoney(effectiveCashActual, netCashSystem);
  const diffElec = subtractMoney(totalElecActual, totalElecSystem);
  const diffTotal = subtractMoney(totalActual, totalNetSystem);

  return {
    saleDate,
    dayNumber: saleDate.getUTCDate(),
    month: saleDate.getUTCMonth() + 1,
    year: saleDate.getUTCFullYear(),
    breakdownRows: effectiveBreakdownRows.map((row) => ({
      denomination: row.denomination,
      count: row.count,
      subtotal: normalizeMoney(money(row.denomination).times(row.count))
    })),
    financials: {
      cashSystem: normalizeMoney(payload.cashSystem),
      returns: normalizeMoney(payload.returns),
      netCashSystem: normalizeMoney(netCashSystem),
      masterSystem: normalizeMoney(payload.systemElectronic.master),
      swishSystem: normalizeMoney(payload.systemElectronic.swish),
      sagiSystem: normalizeMoney(payload.systemElectronic.sagi),
      otherElecSystem: normalizeMoney(payload.systemElectronic.otherElec),
      totalElecSystem: normalizeMoney(totalElecSystem),
      totalNetSystem: normalizeMoney(totalNetSystem),
      cashActual: normalizeMoney(effectiveCashActual),
      masterActual: normalizeMoney(payload.actualElectronic.master),
      swishActual: normalizeMoney(payload.actualElectronic.swish),
      sagiActual: normalizeMoney(payload.actualElectronic.sagi),
      otherElecActual: normalizeMoney(payload.actualElectronic.otherElec),
      totalElecActual: normalizeMoney(totalElecActual),
      totalActual: normalizeMoney(totalActual),
      diffCash: normalizeMoney(diffCash),
      diffElec: normalizeMoney(diffElec),
      diffTotal: normalizeMoney(diffTotal)
    }
  };
}

function createFinancialError(message: string, status = 400) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}
