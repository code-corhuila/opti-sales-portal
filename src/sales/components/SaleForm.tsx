import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import type { ShellContext } from '../../shell-contract';
import { salesApi } from '../api/salesApi';
import { FAILURE_MESSAGE, formatCents, type FrameOption, type PatientOption } from '../model/order';
import { EMPTY_SALE, validateSale, type SaleDraft } from '../model/validation';
import { SearchPicker } from './SearchPicker';

/** Opens a sale (HU: register a sale): find the patient and the frame, then run the place-order saga. */
export function SaleForm({ shell, onPlaced }: { shell: ShellContext; onPlaced: (orderId: string) => void }): ReactNode {
  const { ui } = shell;
  const api = useMemo(() => salesApi(shell.api), [shell.api]);
  const [draft, setDraft] = useState<SaleDraft>(EMPTY_SALE);
  const [patient, setPatient] = useState<PatientOption | null>(null);
  const [frame, setFrame] = useState<FrameOption | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const clientErrors = validateSale(draft);
  const { submit, pending, error, fieldErrors } = ui.useSubmit(
    (key) => api.placeOrder(draft.patientId, draft.frameId, Number(draft.quantity), key),
    JSON.stringify(draft),
  );
  const errors = { ...(attempted ? clientErrors : {}), ...fieldErrors };

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setAttempted(true);
    setInfo(null);
    if (Object.keys(clientErrors).length > 0) {
      return;
    }
    const saga = await submit();
    if (!saga) {
      return;
    }
    if (saga.status === 'COMPLETED' && saga.orderId) {
      shell.notify('Venta registrada', 'success');
      onPlaced(saga.orderId);
      return;
    }
    if (saga.status === 'RUNNING' || saga.status === 'COMPENSATING') {
      setInfo('La venta se está procesando. Consulta en unos segundos si quedó registrada.');
      return;
    }
    shell.notify(saga.failureReason ? FAILURE_MESSAGE[saga.failureReason] : 'No se pudo completar la venta', 'error');
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate aria-label="Nueva venta">
      {error && Object.keys(fieldErrors).length === 0 ? (
        <ui.Banner kind="error" title="No se pudo registrar la venta">
          {error.userMessage}
        </ui.Banner>
      ) : null}
      {info ? <ui.Banner kind="info">{info}</ui.Banner> : null}
      <SearchPicker
        shell={shell}
        id="sale-patient"
        label="Paciente"
        placeholder="Documento o nombre"
        search={(q, signal) => api.searchPatients(q, signal)}
        optionId={(p) => p.id}
        optionLabel={(p) => `${p.documentNumber} · ${p.fullName}`}
        selected={patient}
        error={errors.patientId}
        onSelect={(p) => {
          setPatient(p);
          setDraft((d) => ({ ...d, patientId: p.id }));
        }}
        onClear={() => {
          setPatient(null);
          setDraft((d) => ({ ...d, patientId: '' }));
        }}
      />
      <SearchPicker
        shell={shell}
        id="sale-frame"
        label="Montura"
        placeholder="SKU, marca o modelo"
        search={(q, signal) => api.searchFrames(q, signal)}
        optionId={(f) => f.id}
        optionLabel={(f) => `${f.sku} · ${f.brand} ${f.model} · ${formatCents(f.salePriceCents)} · stock ${f.stock}`}
        selected={frame}
        error={errors.frameId}
        onSelect={(f) => {
          setFrame(f);
          setDraft((d) => ({ ...d, frameId: f.id }));
        }}
        onClear={() => {
          setFrame(null);
          setDraft((d) => ({ ...d, frameId: '' }));
        }}
      />
      <ui.TextField
        id="sale-quantity"
        label="Cantidad"
        required
        inputMode="numeric"
        value={draft.quantity}
        onChange={(v) => setDraft((d) => ({ ...d, quantity: v }))}
        error={errors.quantity}
        maxLength={2}
      />
      <div className="actions">
        <button type="submit" className="btn" disabled={pending}>
          {pending ? 'Procesando…' : 'Registrar venta'}
        </button>
      </div>
    </form>
  );
}
