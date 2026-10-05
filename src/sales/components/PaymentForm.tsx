import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import type { ShellContext } from '../../shell-contract';
import { salesApi } from '../api/salesApi';
import { formatCents, pesosToCents, PAYMENT_METHODS } from '../model/order';
import { EMPTY_PAYMENT, validatePayment } from '../model/validation';

/** Records an abono (HU-10). The amount is typed in pesos; the server has the final word on the balance. */
export function PaymentForm({ shell, invoiceId, balanceCents, onPaid }: {
  shell: ShellContext;
  invoiceId: string;
  balanceCents: number;
  onPaid: () => void;
}): ReactNode {
  const { ui } = shell;
  const api = useMemo(() => salesApi(shell.api), [shell.api]);
  const [draft, setDraft] = useState(EMPTY_PAYMENT);
  const [attempted, setAttempted] = useState(false);
  const clientErrors = validatePayment(draft, balanceCents);
  const { submit, pending, error, fieldErrors } = ui.useSubmit(
    (key) => api.pay(invoiceId, pesosToCents(draft.amountPesos), draft.method, draft.reference.trim() || null, key),
    JSON.stringify(draft),
  );
  const errors = { ...(attempted ? clientErrors : {}), ...fieldErrors };

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setAttempted(true);
    if (Object.keys(clientErrors).length > 0) {
      return;
    }
    if (await submit()) {
      shell.notify('Pago registrado', 'success');
      setDraft(EMPTY_PAYMENT);
      setAttempted(false);
      onPaid();
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate aria-label="Registrar pago">
      {error && Object.keys(fieldErrors).length === 0 ? <ui.Banner kind="error">{error.userMessage}</ui.Banner> : null}
      <div className="grid-2">
        <ui.TextField id="payment-amount" label="Valor abonado (pesos)" required inputMode="numeric" value={draft.amountPesos}
          onChange={(v) => setDraft((d) => ({ ...d, amountPesos: v }))} error={errors.amountPesos} maxLength={12}
          hint={`Saldo pendiente: ${formatCents(balanceCents)}`} />
        <ui.SelectField id="payment-method" label="Medio de pago" required value={draft.method} placeholder="Elige…"
          onChange={(v) => setDraft((d) => ({ ...d, method: v }))} options={PAYMENT_METHODS} error={errors.method} />
        {draft.method === 'NEQUI' ? (
          <ui.TextField id="payment-reference" label="Celular Nequi del cliente" required type="tel" inputMode="tel"
            value={draft.reference} onChange={(v) => setDraft((d) => ({ ...d, reference: v }))} error={errors.reference}
            maxLength={10} hint="Se le enviará la solicitud de pago a la app Nequi" />
        ) : (
          <ui.TextField id="payment-reference" label="Referencia (opcional)" value={draft.reference}
            onChange={(v) => setDraft((d) => ({ ...d, reference: v }))} error={errors.reference} maxLength={100} />
        )}
      </div>
      <div className="actions">
        <button type="submit" className="btn" disabled={pending || balanceCents <= 0}>
          {pending ? 'Guardando…' : 'Registrar pago'}
        </button>
      </div>
    </form>
  );
}
