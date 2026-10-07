import { describe, expect, it } from 'vitest';
import { billingSummary } from './billing';
import type { Invoice } from './order';

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return { id: 'invoice', number: 'FAC-1', workOrderId: 'order', patientId: 'patient', status: 'PENDING',
    totalCents: 10000, paidCents: 2000, balanceCents: 8000,
    createdAt: '2026-10-07T04:59:00Z', updatedAt: '2026-10-07T04:59:00Z', ...overrides };
}

describe('billingSummary', () => {
  it('uses the Colombia calendar, excludes void invoices and keeps historical balances', () => {
    const result = billingSummary([
      invoice(),
      invoice({ id: 'next-day', createdAt: '2026-10-07T05:00:00Z' }),
      invoice({ id: 'void', status: 'VOID', totalCents: 900000 }),
      invoice({ id: 'historical', createdAt: '2026-09-01T12:00:00Z', status: 'PAID', paidCents: 10000, balanceCents: 0 }),
    ], new Date('2026-10-06T20:00:00Z'));
    expect(result).toEqual({ todayCents: 10000, todayCount: 1, averageCents: 10000,
      paidCents: 14000, balanceCents: 16000, pendingCount: 2 });
  });

  it('returns zero amounts for an empty day without division by zero', () => {
    expect(billingSummary([], new Date('2026-10-06T20:00:00Z'))).toEqual({
      todayCents: 0, todayCount: 0, averageCents: 0, paidCents: 0, balanceCents: 0, pendingCount: 0,
    });
  });
});
