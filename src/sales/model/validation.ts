import { pesosToCents } from './order';

export type Errors = Record<string, string>;

export interface PaymentDraft {
  amountPesos: string;
  method: string;
  reference: string;
}

export const EMPTY_PAYMENT: PaymentDraft = { amountPesos: '', method: '', reference: '' };

const NEQUI_PHONE = /^3\d{9}$/;

/** A payment must be positive and never above the outstanding balance (checked here to save a round trip). */
export function validatePayment(draft: PaymentDraft, balanceCents: number): Errors {
  const errors: Errors = {};
  const amount = pesosToCents(draft.amountPesos);
  if (Number.isNaN(amount) || amount <= 0) {
    errors.amountPesos = 'Escribe un valor en pesos mayor que 0';
  } else if (amount > balanceCents) {
    errors.amountPesos = 'No puede ser mayor al saldo pendiente';
  }
  if (!draft.method) {
    errors.method = 'Elige el medio de pago';
  }
  if (draft.reference.trim().length > 100) {
    errors.reference = 'Máximo 100 caracteres';
  }
  // Nequi is charged through the real gateway (when configured) using this number to reach the customer's app.
  if (draft.method === 'NEQUI' && !NEQUI_PHONE.test(draft.reference.trim())) {
    errors.reference = 'Escribe el celular Nequi del cliente: 10 dígitos, empieza por 3';
  }
  return errors;
}

export interface SaleDraft {
  patientId: string;
  frameId: string;
  quantity: string;
}

export const EMPTY_SALE: SaleDraft = { patientId: '', frameId: '', quantity: '1' };

const MAX_QUANTITY = 10;

/** A sale needs a chosen patient, a chosen frame, and a sane quantity (the server has the final word on stock). */
export function validateSale(draft: SaleDraft): Errors {
  const errors: Errors = {};
  if (!draft.patientId) {
    errors.patientId = 'Busca y selecciona un paciente';
  }
  if (!draft.frameId) {
    errors.frameId = 'Busca y selecciona una montura';
  }
  const quantity = Number(draft.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    errors.quantity = `Debe ser un número entero entre 1 y ${MAX_QUANTITY}`;
  }
  return errors;
}
