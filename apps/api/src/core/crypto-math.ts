/* eslint-disable @typescript-eslint/no-explicit-any */
import { Decimal as DecimalLib } from "decimal.js";

DecimalLib.set({ precision: 28, rounding: DecimalLib.ROUND_HALF_UP });

type DecimalValue = string | number;

function toDecimal(value: DecimalValue): any {
  return new DecimalLib(value);
}

const DECIMAL_PLACES = 8;

export const CryptoMath = {
  DECIMAL_PLACES,

  toNumeric(value: DecimalValue): number {
    return toDecimal(value).toDecimalPlaces(DECIMAL_PLACES).toNumber();
  },

  add(a: DecimalValue, b: DecimalValue): number {
    return toDecimal(a).plus(b).toDecimalPlaces(DECIMAL_PLACES).toNumber();
  },

  subtract(a: DecimalValue, b: DecimalValue): number {
    return toDecimal(a).minus(b).toDecimalPlaces(DECIMAL_PLACES).toNumber();
  },

  multiply(a: DecimalValue, b: DecimalValue): number {
    return toDecimal(a).times(b).toDecimalPlaces(DECIMAL_PLACES).toNumber();
  },

  divide(a: DecimalValue, b: DecimalValue): number {
    return toDecimal(a).dividedBy(b).toDecimalPlaces(DECIMAL_PLACES).toNumber();
  },

  compare(a: DecimalValue, b: DecimalValue): number {
    return toDecimal(a).comparedTo(b);
  },

  isZero(value: DecimalValue): boolean {
    return toDecimal(value).isZero();
  },

  isPositive(value: DecimalValue): boolean {
    const d = toDecimal(value);
    return d.isPositive() && !d.isZero();
  },

  isNegative(value: DecimalValue): boolean {
    return toDecimal(value).isNegative();
  },

  greaterThan(a: DecimalValue, b: DecimalValue): boolean {
    return toDecimal(a).greaterThan(b);
  },

  greaterThanOrEqualTo(a: DecimalValue, b: DecimalValue): boolean {
    return toDecimal(a).gte(b);
  },

  lessThan(a: DecimalValue, b: DecimalValue): boolean {
    return toDecimal(a).lessThan(b);
  },

  lessThanOrEqualTo(a: DecimalValue, b: DecimalValue): boolean {
    return toDecimal(a).lte(b);
  },

  toFixed(value: DecimalValue, decimals: number = DECIMAL_PLACES): number {
    return toDecimal(value).toDecimalPlaces(decimals).toNumber();
  },

  toNumber(value: DecimalValue, decimals: number = DECIMAL_PLACES): number {
    return toDecimal(value).toDecimalPlaces(decimals).toNumber();
  },

  calculateCryptoAmount(
    amountUsd: DecimalValue,
    pricePerUnit: DecimalValue,
  ): number {
    if (toDecimal(pricePerUnit).isZero()) {
      throw new Error("Price per unit cannot be zero");
    }
    return CryptoMath.divide(amountUsd, pricePerUnit);
  },

  applyTolerance(
    amount: DecimalValue,
    tolerancePercentage: DecimalValue,
  ): {
    min: number;
    max: number;
  } {
    const tolerance = toDecimal(tolerancePercentage).dividedBy(100);
    const min = toDecimal(1).minus(tolerance).times(amount);
    const max = toDecimal(1).plus(tolerance).times(amount);
    return {
      min: min.toDecimalPlaces(DECIMAL_PLACES).toNumber(),
      max: max.toDecimalPlaces(DECIMAL_PLACES).toNumber(),
    };
  },

  isWithinTolerance(
    actual: DecimalValue,
    expected: DecimalValue,
    tolerancePercentage: DecimalValue,
  ): boolean {
    const { min, max } = CryptoMath.applyTolerance(
      expected,
      tolerancePercentage,
    );
    const actualDecimal = toDecimal(actual);
    return (
      actualDecimal.greaterThanOrEqualTo(min) &&
      actualDecimal.lessThanOrEqualTo(max)
    );
  },
};
