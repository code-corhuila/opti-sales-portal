import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useSaleOperation } from './useSaleOperation';
import type { ShellContext } from '../../shell-contract';
import { salesApi } from '../api/salesApi';
import {
  PRODUCT_TYPES, formatCents,
  type AccessoryOption, type FrameOption, type LensOption, type LiquidOption, type PatientOption, type ProductType,
} from '../model/order';
import { EMPTY_SALE, validateSale, type SaleDraft } from '../model/validation';
import { SearchPicker } from './SearchPicker';
import { SaleWizardStepper } from './SaleWizardStepper';

const LAST_STEP = 4;

/** Any of the four product-catalog options (HU-25): all of them carry a sale price and a stock. */
type ProductOption = FrameOption | LensOption | AccessoryOption | LiquidOption;

function productLabel(type: ProductType | '', product: ProductOption | null): string {
  if (!product) {
    return '';
  }
  if (type === 'FRAME') {
    const f = product as FrameOption;
    return `${f.sku} · ${f.brand} ${f.model}`;
  }
  if (type === 'LENS') {
    const l = product as LensOption;
    return `${l.sku} · ${l.brand}`;
  }
  if (type === 'ACCESSORY') {
    const a = product as AccessoryOption;
    return `${a.sku} · ${a.category}`;
  }
  if (type === 'LIQUID') {
    const l = product as LiquidOption;
    return `${l.sku} · ${l.brand} ${l.volumeMl}ml`;
  }
  return '';
}

/** Opens a sale (HU: register a sale; HU-25: of any product type; HU-22: as a 4-step wizard):
 * find the patient and the product, then run the place-order saga. */
export function SaleForm({ shell, onPlaced }: { shell: ShellContext; onPlaced: (orderId: string) => void }): ReactNode {
  const { ui } = shell;
  const api = useMemo(() => salesApi(shell.api), [shell.api]);
  const [draft, setDraft] = useState<SaleDraft>(EMPTY_SALE);
  const [patient, setPatient] = useState<PatientOption | null>(null);
  const [frame, setFrame] = useState<FrameOption | null>(null);
  const [lens, setLens] = useState<LensOption | null>(null);
  const [accessory, setAccessory] = useState<AccessoryOption | null>(null);
  const [liquid, setLiquid] = useState<LiquidOption | null>(null);
  const [step, setStep] = useState(1);
  const [stepAttempted, setStepAttempted] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const clientErrors = validateSale(draft);
  const operation = useSaleOperation(api, shell.user.id, (id) => {
    shell.notify('Venta registrada', 'success');
    onPlaced(id);
  });
  const errors = (attempted || stepAttempted) ? clientErrors : {};

  const selectedProduct: ProductOption | null = frame ?? lens ?? accessory ?? liquid;
  const productTypeLabel = PRODUCT_TYPES.find((t) => t.value === draft.productType)?.label ?? '';
  const quantity = Number(draft.quantity);
  const totalCents = selectedProduct && Number.isInteger(quantity) ? selectedProduct.salePriceCents * quantity : 0;

  function selectProductType(type: string): void {
    setFrame(null);
    setLens(null);
    setAccessory(null);
    setLiquid(null);
    setDraft((d) => ({ ...d, productType: type as ProductType | '', productId: '' }));
  }

  /** Whether everything required up to (and including) a given step is filled in, so "Siguiente"
   * can be blocked without running the full submit-time validation. */
  function stepIsValid(target: number): boolean {
    if (target >= 1 && clientErrors.patientId) {
      return false;
    }
    if (target >= 2 && (clientErrors.productType || clientErrors.productId)) {
      return false;
    }
    if (target >= 3 && clientErrors.quantity) {
      return false;
    }
    return true;
  }

  function goNext(): void {
    if (!stepIsValid(step)) {
      setStepAttempted(true);
      return;
    }
    setStepAttempted(false);
    setStep((s) => Math.min(LAST_STEP, s + 1));
  }

  function goBack(): void {
    setStepAttempted(false);
    setStep((s) => Math.max(1, s - 1));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (step !== LAST_STEP || submitter?.getAttribute('data-sale-action') !== 'confirm') return;
    setAttempted(true);
    if (operation.locked || Object.keys(clientErrors).length > 0) return;
    operation.start(draft);
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate aria-label="Nueva venta">
      {operation.message ? <ui.Banner kind={operation.terminal ? 'error' : 'info'}>{operation.message}</ui.Banner> : null}
      {operation.locked ? <div role="status"><h3>{operation.terminal ? 'Solicitud finalizada' : 'Procesando venta'}</h3>
        <p>{operation.terminal ? 'Puedes revisar tus órdenes antes de iniciar otra venta.' : 'Los pasos están bloqueados mientras confirmamos el resultado.'}</p>
        <Link className="btn btn-quiet" to="/sales">Ver órdenes</Link>
      </div> : <>
      <SaleWizardStepper current={step} />
      {step === 1 ? (
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
      ) : null}
      {step === 2 ? (
        <>
          <ui.SelectField
            id="sale-product-type"
            label="Tipo de producto"
            required
            value={draft.productType}
            placeholder="Elige…"
            onChange={selectProductType}
            options={PRODUCT_TYPES}
            error={errors.productType}
          />
          {draft.productType === 'FRAME' ? (
            <SearchPicker
              shell={shell}
              id="sale-product"
              label="Montura"
              placeholder="SKU, marca o modelo"
              search={(q, signal) => api.searchFrames(q, signal)}
              optionId={(f) => f.id}
              optionLabel={(f) => `${f.sku} · ${f.brand} ${f.model} · ${formatCents(f.salePriceCents)} · stock ${f.stock}`}
              selected={frame}
              error={errors.productId}
              onSelect={(f) => {
                setFrame(f);
                setDraft((d) => ({ ...d, productId: f.id }));
              }}
              onClear={() => {
                setFrame(null);
                setDraft((d) => ({ ...d, productId: '' }));
              }}
            />
          ) : null}
          {draft.productType === 'LENS' ? (
            <SearchPicker
              shell={shell}
              id="sale-product"
              label="Lente"
              placeholder="SKU o marca"
              search={(q, signal) => api.searchLenses(q, signal)}
              optionId={(l) => l.id}
              optionLabel={(l) => `${l.sku} · ${l.brand} · ${formatCents(l.salePriceCents)} · stock ${l.stock}`}
              selected={lens}
              error={errors.productId}
              onSelect={(l) => {
                setLens(l);
                setDraft((d) => ({ ...d, productId: l.id }));
              }}
              onClear={() => {
                setLens(null);
                setDraft((d) => ({ ...d, productId: '' }));
              }}
            />
          ) : null}
          {draft.productType === 'ACCESSORY' ? (
            <SearchPicker
              shell={shell}
              id="sale-product"
              label="Accesorio"
              placeholder="SKU o categoría"
              search={(q, signal) => api.searchAccessories(q, signal)}
              optionId={(a) => a.id}
              optionLabel={(a) => `${a.sku} · ${a.category} · ${formatCents(a.salePriceCents)} · stock ${a.stock}`}
              selected={accessory}
              error={errors.productId}
              onSelect={(a) => {
                setAccessory(a);
                setDraft((d) => ({ ...d, productId: a.id }));
              }}
              onClear={() => {
                setAccessory(null);
                setDraft((d) => ({ ...d, productId: '' }));
              }}
            />
          ) : null}
          {draft.productType === 'LIQUID' ? (
            <SearchPicker
              shell={shell}
              id="sale-product"
              label="Líquido"
              placeholder="SKU o marca"
              search={(q, signal) => api.searchLiquids(q, signal)}
              optionId={(l) => l.id}
              optionLabel={(l) => `${l.sku} · ${l.brand} ${l.volumeMl}ml · ${formatCents(l.salePriceCents)} · stock ${l.stock}`}
              selected={liquid}
              error={errors.productId}
              onSelect={(l) => {
                setLiquid(l);
                setDraft((d) => ({ ...d, productId: l.id }));
              }}
              onClear={() => {
                setLiquid(null);
                setDraft((d) => ({ ...d, productId: '' }));
              }}
            />
          ) : null}
        </>
      ) : null}
      {step === 3 ? (
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
      ) : null}
      {step === LAST_STEP ? (
        <div className="field">
          <h3 style={{ margin: '0 0 0.75rem' }}>Confirma la venta</h3>
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.35rem 0.75rem', margin: '0 0 1rem' }}>
            <dt style={{ color: 'var(--text-soft)' }}>Paciente</dt>
            <dd style={{ margin: 0 }}>{patient ? `${patient.documentNumber} · ${patient.fullName}` : '—'}</dd>
            <dt style={{ color: 'var(--text-soft)' }}>Producto</dt>
            <dd style={{ margin: 0 }}>
              {productTypeLabel}
              {selectedProduct ? ` · ${productLabel(draft.productType, selectedProduct)} · ${formatCents(selectedProduct.salePriceCents)}` : ' · —'}
            </dd>
            <dt style={{ color: 'var(--text-soft)' }}>Cantidad</dt>
            <dd style={{ margin: 0 }}>{draft.quantity}</dd>
            <dt style={{ color: 'var(--text-soft)', fontWeight: 700 }}>Total estimado</dt>
            <dd style={{ margin: 0, fontWeight: 700 }}>{formatCents(totalCents)}</dd>
          </dl>
        </div>
      ) : null}
      <div className="actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        {step > 1 ? (
          <button type="button" className="btn btn-quiet" onClick={goBack} disabled={operation.locked}>
            Atrás
          </button>
        ) : null}
        {step < LAST_STEP ? (
          <button key="next-step" type="button" className="btn" onClick={(event) => { event.preventDefault(); goNext(); }}>
            Siguiente
          </button>
        ) : (
          <button key="confirm-sale" data-sale-action="confirm" type="submit" className="btn" disabled={operation.locked}>
            Registrar venta
          </button>
        )}
      </div>
      </>}
    </form>
  );
}
