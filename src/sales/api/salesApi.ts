import type { ApiClient, Page } from '../../shell-contract';
import type { FrameOption, Invoice, Payment, PatientOption, SagaResponse, WorkOrder, WorkOrderStatus } from '../model/order';

export interface OrderQuery {
  status?: WorkOrderStatus | '';
  page?: number;
  limit?: number;
}

export function salesApi(api: ApiClient) {
  return {
    listOrders: (query: OrderQuery, signal?: AbortSignal) =>
      api.get<Page<WorkOrder>>('/api/v1/work-orders', {
        query: { status: query.status, page: query.page, limit: query.limit ?? 10 },
        ...(signal ? { signal } : {}),
      }),

    getOrder: (id: string, signal?: AbortSignal) => api.get<WorkOrder>(`/api/v1/work-orders/${id}`, signal ? { signal } : {}),

    approve: (id: string) => api.post<WorkOrder>(`/api/v1/work-orders/${id}/approve`),

    advance: (id: string) => api.post<WorkOrder>(`/api/v1/work-orders/${id}/advance`),

    invoiceOf: async (workOrderId: string, signal?: AbortSignal): Promise<Invoice | null> => {
      const page = await api.get<Page<Invoice>>('/api/v1/invoices', { query: { workOrderId, limit: 1 }, ...(signal ? { signal } : {}) });
      return page.data[0] ?? null;
    },

    payments: (invoiceId: string, page: number, signal?: AbortSignal) =>
      api.get<Page<Payment>>(`/api/v1/invoices/${invoiceId}/payments`, { query: { page, limit: 5 }, ...(signal ? { signal } : {}) }),

    pay: (invoiceId: string, amountCents: number, method: string, reference: string | null, idempotencyKey: string) =>
      api.post<{ id: string }>(`/api/v1/invoices/${invoiceId}/payments`, { amountCents, method, reference }, { idempotencyKey }),

    /** Up to 5 active patients matching the text, to pick one for a sale (HU: register a sale). */
    searchPatients: (q: string, signal?: AbortSignal) =>
      api.get<Page<PatientOption>>('/api/v1/patients', { query: { q, limit: 5 }, ...(signal ? { signal } : {}) }),

    /** Up to 5 active frames matching the text, to pick one for a sale. */
    searchFrames: (q: string, signal?: AbortSignal) =>
      api.get<Page<FrameOption>>('/api/v1/frames', { query: { q, status: 'ACTIVE', limit: 5 }, ...(signal ? { signal } : {}) }),

    /** Opens a sale: reserves the frame's stock and opens the work order and its invoice (the place-order saga). */
    placeOrder: (patientId: string, frameId: string, quantity: number, idempotencyKey: string) =>
      api.post<SagaResponse>('/api/v1/sagas/place-order', { patientId, frameId, quantity }, { idempotencyKey }),
  };
}

export type SalesApi = ReturnType<typeof salesApi>;
