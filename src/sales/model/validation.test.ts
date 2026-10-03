import { describe, expect, it } from 'vitest';
import { formatCents, pesosToCents } from './order';
import { EMPTY_PAYMENT, validatePayment } from './validation';

describe('money', () => {
  it('parses pesos into cents without multiplying a float', () => {
    expect(pesosToCents('80.000')).toBe(8_000_000);
    expect(pesosToCents('0,07')).toBe(7);
  });

  it('formats cents as pesos with thousands separators', () => {
    expect(formatCents(104_000_000)).toBe('$ 1.040.000');
  });
});

describe('payment validation', () => {
  it('accepts a payment within the balance', () => {
    expect(validatePayment({ ...EMPTY_PAYMENT, amountPesos: '80000', method: 'CASH' }, 104_000_000)).toEqual({});
  });

  it('rejects a payment above the balance', () => {
    expect(validatePayment({ ...EMPTY_PAYMENT, amountPesos: '2000000', method: 'CASH' }, 104_000_000).amountPesos).toBeDefined();
  });

  it('rejects a zero or invalid amount, and requires a method', () => {
    expect(validatePayment({ ...EMPTY_PAYMENT, amountPesos: '0', method: 'CASH' }, 100).amountPesos).toBeDefined();
    expect(validatePayment({ ...EMPTY_PAYMENT, amountPesos: 'x', method: 'CASH' }, 100).amountPesos).toBeDefined();
    expect(validatePayment({ ...EMPTY_PAYMENT, amountPesos: '50', method: '' }, 100).method).toBeDefined();
  });
});
