import Decimal from "decimal.js";

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP
});

export const MONEY_SCALE = 3;

export type MoneyInput = Decimal.Value | null | undefined;

export function money(value: MoneyInput = 0) {
  return new Decimal(value ?? 0);
}

export function normalizeMoney(value: MoneyInput = 0) {
  return money(value).toDecimalPlaces(MONEY_SCALE).toFixed(MONEY_SCALE);
}

export function addMoney(...values: MoneyInput[]) {
  return values.reduce((accumulator: Decimal, current) => accumulator.plus(money(current)), money(0));
}

export function subtractMoney(initial: MoneyInput, ...values: MoneyInput[]) {
  return values.reduce((accumulator: Decimal, current) => accumulator.minus(money(current)), money(initial));
}

export function isMoneyNegative(value: MoneyInput) {
  return money(value).isNegative();
}
