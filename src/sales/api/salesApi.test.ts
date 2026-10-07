import { describe, expect, it } from 'vitest';
import type { ApiClient } from '../../shell-contract';
import { salesApi } from './salesApi';

describe('billingOverview', () => {
  it('reads all pages and keeps invoices when a patient lookup fails', async () => {
    const pages: number[] = [];
    let patientCalls = 0;
    const client = {
      get: async (path: string, options: { query?: { page?: number } }) => {
        if (path === '/api/v1/invoices') {
          const page = options.query?.page ?? 1;
          pages.push(page);
          return { data: [{ id: String(page), patientId: 'same-patient' }], meta: { totalPages: 2 } };
        }
        patientCalls += 1;
        throw new Error('customers unavailable');
      },
    } as unknown as ApiClient;
    const result = await salesApi(client).billingOverview(new AbortController().signal);
    expect(pages).toEqual([1, 2]);
    expect(result.invoices.map((invoice) => invoice.id)).toEqual(['1', '2']);
    expect(patientCalls).toBe(1);
    expect(result.patients).toEqual({});
  });
});

describe('reportOrders', () => {
  it('matches the UTC daily chart across pages and excludes cancelled orders', async () => {
    const pages: number[] = [];
    const client = {
      get: async (_path: string, options: { query: { page: number } }) => {
        const page = options.query.page;
        pages.push(page);
        return { data: page === 1 ? [
          { id: 'included', createdAt: '2026-10-06T23:30:00Z', status: 'QUOTATION', totalCents: 100 },
          { id: 'cancelled', createdAt: '2026-10-06T10:00:00Z', status: 'CANCELLED', totalCents: 200 },
        ] : [
          { id: 'paid', createdAt: '2026-10-06T01:00:00Z', status: 'DELIVERED', totalCents: 300 },
          { id: 'tomorrow', createdAt: '2026-10-07T00:00:00Z', status: 'APPROVED', totalCents: 400 },
        ], meta: { totalPages: 2 } };
      },
    } as unknown as ApiClient;
    const orders = await salesApi(client).reportOrders('2026-10-06', new AbortController().signal);
    expect(pages).toEqual([1, 2]);
    expect(orders.map((order) => order.id)).toEqual(['included', 'paid']);
    expect(orders.reduce((total, order) => total + order.totalCents, 0)).toBe(400);
  });
});
