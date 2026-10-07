import type { ApiClient, Page } from '../../shell-contract';
import type {
  AccessoryOption, FrameOption, Invoice, LensOption, LiquidOption, OrderPatient, Payment, PatientOption,
  ProductType, SagaResponse, WorkOrder, WorkOrderStatus,
} from '../model/order';

/** One day of revenue, as returned by GET /api/v1/reports/sales-timeseries (HU-24). */
export interface DailySales {
  date: string;
  totalCents: number;
}

/** One status bucket, as returned by GET /api/v1/reports/orders-by-status (HU-24). */
export interface StatusCount {
  status: WorkOrderStatus;
  count: number;
}

export interface OrderQuery {
  status?: WorkOrderStatus | '';
  /** Simple match on the order number (HU-21); the API does not join against the patient's name. */
  q?: string;
  page?: number;
  limit?: number;
}

export function salesApi(api: ApiClient) {
  return {
    /** Read each bounded page so totals never silently describe only the first page. */
    billingOverview: async (signal: AbortSignal) => {
      const invoices: Invoice[] = [];
      let pageNumber = 1;
      let totalPages = 1;
      do {
        const result = await api.get<Page<Invoice>>('/api/v1/invoices', { query: { page: pageNumber, limit: 100 }, signal });
        invoices.push(...result.data);
        totalPages = result.meta.totalPages;
        pageNumber += 1;
      } while (pageNumber <= totalPages);
      const patients: Record<string, OrderPatient> = {};
      const ids = [...new Set(invoices.map((invoice) => invoice.patientId))];
      // Limit concurrency to avoid flooding the customers service.
      for (let offset = 0; offset < ids.length; offset += 5) {
        await Promise.all(ids.slice(offset, offset + 5).map(async (id) => {
          try {
            patients[id] = await api.get<OrderPatient>(`/api/v1/patients/${id}`, { signal });
          } catch (error) {
            if (signal.aborted) throw error;
            // An unavailable patient must not hide their invoice or its outstanding balance.
          }
        }));
      }
      return { invoices, patients };
    },
    listOrders: (query: OrderQuery, signal?: AbortSignal) =>
      api.get<Page<WorkOrder>>('/api/v1/work-orders', {
        query: { status: query.status, q: query.q, page: query.page, limit: query.limit ?? 10 },
        ...(signal ? { signal } : {}),
      }),

    getOrder: (id: string, signal?: AbortSignal) => api.get<WorkOrder>(`/api/v1/work-orders/${id}`, signal ? { signal } : {}),

    /**
     * The patient's header data for the order detail (HU-21): name, document and phone. The order
     * only carries `patientId`, so this hits the customers domain's own patient-detail endpoint
     * (already used by other portals, e.g. opti-customers-portal's `customersApi.get`).
     */
    getPatient: (id: string, signal?: AbortSignal) =>
      api.get<OrderPatient>(`/api/v1/patients/${id}`, signal ? { signal } : {}),

    approve: (id: string) => api.post<WorkOrder>(`/api/v1/work-orders/${id}/approve`),

    advance: (id: string) => api.post<WorkOrder>(`/api/v1/work-orders/${id}/advance`),

    cancel: (orderId: string, idempotencyKey: string) =>
      api.post<SagaResponse>('/api/v1/sagas/cancel-order', { orderId }, { idempotencyKey }),

    reportOrders: async (date: string, signal: AbortSignal) => {
      const orders: WorkOrder[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const result = await api.get<Page<WorkOrder>>('/api/v1/work-orders', { query: { page, limit: 100 }, signal });
        orders.push(...result.data.filter((order) => order.status !== 'CANCELLED' && order.createdAt.slice(0, 10) === date));
        totalPages = result.meta.totalPages;
        page += 1;
      } while (page <= totalPages);
      return orders;
    },

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

    /** Up to 5 active lenses matching the text, to pick one for a sale (HU-25). */
    searchLenses: (q: string, signal?: AbortSignal) =>
      api.get<Page<LensOption>>('/api/v1/lenses', { query: { q, status: 'ACTIVE', limit: 5 }, ...(signal ? { signal } : {}) }),

    /** Up to 5 active accessories matching the text, to pick one for a sale (HU-25). */
    searchAccessories: (q: string, signal?: AbortSignal) =>
      api.get<Page<AccessoryOption>>('/api/v1/accessories', { query: { q, status: 'ACTIVE', limit: 5 }, ...(signal ? { signal } : {}) }),

    /** Up to 5 active liquids matching the text, to pick one for a sale (HU-25). */
    searchLiquids: (q: string, signal?: AbortSignal) =>
      api.get<Page<LiquidOption>>('/api/v1/liquids', { query: { q, status: 'ACTIVE', limit: 5 }, ...(signal ? { signal } : {}) }),

    /** Opens a sale: reserves the chosen product's stock and opens the work order and its invoice (the place-order saga). */
    placeOrder: (patientId: string, productType: ProductType, productId: string, quantity: number, idempotencyKey: string, signal?: AbortSignal) =>
      api.post<SagaResponse>('/api/v1/sagas/place-order', { patientId, productType, productId, quantity }, { idempotencyKey, ...(signal ? { signal } : {}) }),

    getSaga: (id: string, signal?: AbortSignal) =>
      api.get<SagaResponse>(`/api/v1/sagas/${id}`, signal ? { signal } : {}),

    /** Daily revenue of the current month, zero-filled from day 1 through today (HU-24, ADMIN only). */
    salesTimeseries: (signal?: AbortSignal) =>
      api.get<DailySales[]>('/api/v1/reports/sales-timeseries', signal ? { signal } : {}),

    /** Count of work orders per status, zero-filled for unused statuses (HU-24, ADMIN only). */
    ordersByStatus: (signal?: AbortSignal) =>
      api.get<StatusCount[]>('/api/v1/reports/orders-by-status', signal ? { signal } : {}),
  };
}

export type SalesApi = ReturnType<typeof salesApi>;
