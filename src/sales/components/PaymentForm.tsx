import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import type { ShellContext } from '../../shell-contract';
import { salesApi } from '../api/salesApi';
import { formatCents, pesosToCents, PAYMENT_METHODS } from '../model/order';
import { EMPTY_PAYMENT, validatePayment } from '../model/validation';
import { receiptData, validateReceipt } from '../model/receipt';

export function PaymentForm({ shell, invoiceId, balanceCents, onPaid }: {
  shell: ShellContext; invoiceId: string; balanceCents: number; onPaid: () => void;
}): ReactNode {
  const { ui } = shell;
  const api = useMemo(() => salesApi(shell.api), [shell.api]);
  const [draft, setDraft] = useState(EMPTY_PAYMENT);
  const [attempted, setAttempted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileVersion, setFileVersion] = useState(0);
  const [otp, setOtp] = useState('');
  const [challenge, setChallenge] = useState<{ id: string; testCode: string; expiresAt: string; mode: string } | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [challengeError, setChallengeError] = useState('');
  const electronic = ['PSE', 'CARD'].includes(draft.method);
  const evidence = ['TRANSFER', 'NEQUI', 'DAVIPLATA'].includes(draft.method);
  const clientErrors = validatePayment(draft, balanceCents);
  if (evidence) { const problem = validateReceipt(file); if (problem) clientErrors.receipt = problem; }
  if (electronic && (!challenge || !/^\d{6}$/.test(otp))) clientErrors.otp = 'Solicita e ingresa el código de prueba de 6 dígitos.';
  const { submit, pending, error, fieldErrors } = ui.useSubmit(async (key) => {
    const proof = evidence && file ? { receipt: { contentType: file.type, base64: await receiptData(file) } }
      : electronic && challenge ? { challengeId: challenge.id, otp } : {};
    return api.pay(invoiceId, pesosToCents(draft.amountPesos), draft.method, draft.reference.trim() || null, key, proof);
  }, JSON.stringify({ draft, challenge: challenge?.id, fileVersion }));
  const errors: Record<string, string | undefined> = { ...(attempted ? clientErrors : {}), ...fieldErrors, amountPesos: fieldErrors.amountCents ?? (attempted ? clientErrors.amountPesos : undefined) };
  const busy = pending || requesting;
  function change(field: keyof typeof draft, value: string) {
    setDraft((d) => ({ ...d, [field]: value })); setChallenge(null); setOtp(''); setChallengeError('');
  }
  async function requestCode() {
    setAttempted(true);
    if (Object.keys(validatePayment(draft, balanceCents)).length || busy) return;
    setRequesting(true); setChallengeError('');
    try { setChallenge(await api.challenge(invoiceId, pesosToCents(draft.amountPesos), draft.method, draft.reference.trim() || null)); }
    catch (error) { const info = (error as { info?: { userMessage: string; details: { message: string }[] } }).info; setChallengeError(info?.details.map((d) => d.message).join(' ') || info?.userMessage || 'No se pudo generar el código.'); }
    finally { setRequesting(false); }
  }
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAttempted(true);
    if (Object.keys(clientErrors).length || busy) return;
    if (await submit()) {
      shell.notify(electronic ? 'Pago simulado registrado. No se realizó ningún cobro.' : 'Pago registrado con su comprobante.', 'success');
      setDraft(EMPTY_PAYMENT); setFile(null); setFileVersion((v) => v + 1); setChallenge(null); setOtp(''); setAttempted(false); onPaid();
    }
  }
  return <form onSubmit={(event) => void onSubmit(event)} noValidate aria-label="Registrar pago">
    <ui.Banner kind="info">Modo de prueba: usa únicamente datos y comprobantes ficticios. PSE y tarjeta simulan SMS y pagos, sin cobros ni proveedores. No ingreses datos bancarios, teléfonos ni tarjetas reales.</ui.Banner>
    {error ? <ui.Banner kind="error">{error.userMessage}</ui.Banner> : null}
    <div className="grid-2">
      <ui.TextField id="payment-amount" label="Valor abonado (pesos)" required inputMode="numeric" value={draft.amountPesos}
        onChange={(v) => change('amountPesos', v)} error={errors.amountPesos} maxLength={12} disabled={busy}
        hint={`Saldo pendiente: ${formatCents(balanceCents)}`} />
      <ui.SelectField id="payment-method" label="Medio de pago" required value={draft.method} placeholder="Elige…" disabled={busy}
        onChange={(v) => { change('method', v); setFile(null); setFileVersion((n) => n + 1); }} options={PAYMENT_METHODS} error={errors.method} />
      <ui.TextField id="payment-reference" label="Referencia ficticia (opcional)" value={draft.reference} disabled={busy}
        onChange={(v) => change('reference', v)} error={errors.reference} maxLength={100} />
      {evidence ? <ui.Field id="payment-receipt" label="Comprobante de prueba" required error={errors.receipt} hint="PDF, PNG o JPEG, hasta 2 MiB. Descarga privada para administración y ventas.">
        {(aria) => <input {...aria} key={draft.method} id="payment-receipt" type="file" accept="application/pdf,image/png,image/jpeg" disabled={busy}
          onChange={(event) => { setFile(event.target.files?.[0] ?? null); setFileVersion((v) => v + 1); }} />}
      </ui.Field> : null}
    </div>
    {electronic ? <section aria-label="SMS simulado">
      <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => void requestCode()}>{requesting ? 'Generando…' : 'Generar SMS simulado'}</button>
      {challengeError ? <p role="alert">{challengeError}</p> : null}
      {challenge ? <p role="status">{challenge.mode}. Código de prueba: <strong>{challenge.testCode}</strong>. Caduca a las {new Date(challenge.expiresAt).toLocaleTimeString('es-CO')}. Máximo 3 intentos. Un solo pago por código.</p> : null}
      <ui.TextField id="payment-otp" label="Código del SMS simulado" required inputMode="numeric" maxLength={6} value={otp}
        onChange={setOtp} error={errors.otp} disabled={busy} autoComplete="one-time-code" />
    </section> : null}
    <div className="actions"><button type="submit" className="btn" disabled={busy || balanceCents <= 0}>{pending ? 'Guardando…' : electronic ? 'Registrar pago simulado' : 'Registrar pago'}</button></div>
  </form>;
}
