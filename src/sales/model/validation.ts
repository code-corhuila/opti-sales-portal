import { pesosToCents } from './order';

export type Errors = Record<string, string>;

export interface PaymentDraft {
  amountPesos: string;
  method: string;
  reference: string;
}

export const EMPTY_PAYMENT: PaymentDraft = { amountPesos: '', method: '', reference: '' };

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
  return errors;
}
