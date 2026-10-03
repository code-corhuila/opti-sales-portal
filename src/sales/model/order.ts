/** Types of the sales API contract (same field names as the service; money in cents). */

export type WorkOrderStatus = 'QUOTATION' | 'APPROVED' | 'IN_LABORATORY' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type InvoiceStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'VOID';
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'PSE' | 'NEQUI' | 'DAVIPLATA' | 'OTHER';

export interface WorkOrderItem {
  id: string;
  frameId: string;
  reservationId: string;
  sku: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
}

export interface WorkOrder {
  id: string;
  number: string;
  patientId: string;
  reference: string;
  status: WorkOrderStatus;
  items: WorkOrderItem[];
  totalCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  number: string;
  workOrderId: string;
  patientId: string;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amountCents: number;
  method: PaymentMethod;
  reference: string | null;
  paidAt: string;
}

export const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  QUOTATION: 'Cotización',
  APPROVED: 'Aprobada',
  IN_LABORATORY: 'En laboratorio',
  READY: 'Lista',
  DELIVERED: 'Entregada',
  CANCELLED: 'Cancelada',
};

export const STATUS_TONE: Record<WorkOrderStatus, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  QUOTATION: 'neutral',
  APPROVED: 'info',
  IN_LABORATORY: 'info',
  READY: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

export const NEXT_STATUS: Partial<Record<WorkOrderStatus, WorkOrderStatus>> = {
  APPROVED: 'IN_LABORATORY',
  IN_LABORATORY: 'READY',
  READY: 'DELIVERED',
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  PENDING: 'Pendiente',
  PARTIAL: 'Abonada',
  PAID: 'Pagada',
  VOID: 'Anulada',
};

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'PSE', label: 'PSE' },
  { value: 'NEQUI', label: 'Nequi' },
  { value: 'DAVIPLATA', label: 'Daviplata' },
  { value: 'OTHER', label: 'Otro' },
];

export function formatCents(cents: number): string {
  return `$ ${Math.round(cents / 100).toLocaleString('es-CO')}`;
}

export function pesosToCents(text: string): number {
  const cleaned = text.trim().replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return Number.NaN;
  }
  const [pesos, decimals = ''] = cleaned.split('.');
  const centsPart = (decimals + '00').slice(0, 2);
  return Number(pesos) * 100 + Number(centsPart);
}
