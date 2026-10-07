import type { Invoice } from './order';

const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Issued invoices, not cash receipts: payments may have been made on a different day. */
export function billingSummary(invoices: Invoice[], now = new Date()) {
  const active = invoices.filter((invoice) => invoice.status !== 'VOID');
  const today = active.filter((invoice) => day.format(new Date(invoice.createdAt)) === day.format(now));
  const totalCents = today.reduce((sum, invoice) => sum + invoice.totalCents, 0);
  return {
    todayCents: totalCents,
    todayCount: today.length,
    paidCents: active.reduce((sum, invoice) => sum + invoice.paidCents, 0),
    balanceCents: active.reduce((sum, invoice) => sum + invoice.balanceCents, 0),
    pendingCount: active.filter((invoice) => invoice.balanceCents > 0).length,
    averageCents: today.length ? Math.round(totalCents / today.length) : 0,
  };
}
