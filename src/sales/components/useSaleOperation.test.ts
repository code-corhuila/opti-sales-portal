import { describe, expect, it, vi } from 'vitest';
import type { SalesApi } from '../api/salesApi';
import { readSaleOperation, type SaleOperation } from './useSaleOperation';

describe('sale operation recovery', () => {
  const operation: SaleOperation = { key: 'original-request', draft: { patientId: 'patient', productType: 'LENS', productId: 'lens', quantity: '2' } };
  it('replays an uncertain request with the same key and immutable product payload', async () => {
    const placeOrder = vi.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({ id: 'saga', status: 'RUNNING' });
    const api = { placeOrder } as unknown as SalesApi;
    const signal = new AbortController().signal;
    await expect(readSaleOperation(api, operation, signal)).rejects.toThrow('timeout');
    await readSaleOperation(api, operation, signal);
    expect(placeOrder.mock.calls[0]).toEqual(placeOrder.mock.calls[1]);
    expect(placeOrder.mock.calls[1]).toEqual(['patient', 'LENS', 'lens', 2, 'original-request', signal]);
  });
  it('only queries the saga after its identifier is known', async () => {
    const placeOrder = vi.fn();
    const getSaga = vi.fn().mockResolvedValue({ id: 'saga', status: 'COMPLETED', orderId: 'order' });
    const result = await readSaleOperation({ placeOrder, getSaga } as unknown as SalesApi, { ...operation, sagaId: 'saga' }, new AbortController().signal);
    expect(placeOrder).not.toHaveBeenCalled();
    expect(getSaga).toHaveBeenCalledTimes(1);
    expect(result.orderId).toBe('order');
  });
});
