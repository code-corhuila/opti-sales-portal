import { useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ShellContext } from '../../shell-contract';
import { salesApi } from '../api/salesApi';
import { OrderTimeline } from '../components/OrderTimeline';
import { PatientHeader } from '../components/PatientHeader';
import { PaymentForm } from '../components/PaymentForm';
import { FAILURE_MESSAGE, formatCents, INVOICE_STATUS_LABEL, NEXT_STATUS, PAYMENT_METHODS, STATUS_LABEL, STATUS_TONE } from '../model/order';

function InvoiceSection({ shell, orderId, version, onChanged }: { shell: ShellContext; orderId: string; version: number; onChanged: () => void }): ReactNode {
  const { ui } = shell;
  const api = useMemo(() => salesApi(shell.api), [shell.api]);
  const [paymentPage, setPaymentPage] = useState(1);
  const { state, reload } = ui.useLoad((signal) => api.invoiceOf(orderId, signal), [orderId, version]);

  return (
    <ui.DataState state={state} onRetry={reload}>
      {(invoice) => {
        if (!invoice) {
          return <p>Esta orden todavía no tiene factura.</p>;
        }
        return (
          <InvoiceBody shell={shell} invoiceId={invoice.id} totalCents={invoice.totalCents} paidCents={invoice.paidCents}
            balanceCents={invoice.balanceCents} status={invoice.status} paymentPage={paymentPage}
            onPage={setPaymentPage} onPaid={onChanged} />
        );
      }}
    </ui.DataState>
  );
}

function InvoiceBody({ shell, invoiceId, totalCents, paidCents, balanceCents, status, paymentPage, onPage, onPaid }: {
  shell: ShellContext;
  invoiceId: string;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  status: keyof typeof INVOICE_STATUS_LABEL;
  paymentPage: number;
  onPage: (page: number) => void;
  onPaid: () => void;
}): ReactNode {
  const { ui } = shell;
  const api = useMemo(() => salesApi(shell.api), [shell.api]);
  const payments = ui.useLoad((signal) => api.payments(invoiceId, paymentPage, signal), [invoiceId, paymentPage]);
  const methodLabel = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label]));

  return (
    <>
      <dl className="facts">
        <dt>Total</dt>
        <dd>{formatCents(totalCents)}</dd>
        <dt>Abonado</dt>
        <dd>{formatCents(paidCents)}</dd>
        <dt>Saldo</dt>
        <dd>{formatCents(balanceCents)}</dd>
        <dt>Estado</dt>
        <dd><ui.Badge tone={status === 'PAID' ? 'success' : status === 'VOID' ? 'neutral' : 'warning'}>{INVOICE_STATUS_LABEL[status]}</ui.Badge></dd>
      </dl>

      <ui.DataState state={payments.state} onRetry={payments.reload} isEmpty={(r) => r.data.length === 0} emptyTitle="Sin pagos todavía">
        {(result) => (
          <>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Fecha</th><th className="num">Valor</th><th>Medio</th><th>Referencia</th><th>Comprobante</th></tr></thead>
                <tbody>
                  {result.data.map((payment) => (
                    <tr key={payment.id}>
                      <td>{new Date(payment.paidAt).toLocaleString('es-CO')}</td>
                      <td className="num">{formatCents(payment.amountCents)}</td>
                      <td>{methodLabel[payment.method] ?? payment.method}</td>
                      <td>{payment.reference ?? '—'}</td>
                      <td>{payment.gatewayTransactionId?.startsWith('SANDBOX-') ? <><ui.Badge tone="warning">Simulación</ui.Badge><br />{payment.gatewayTransactionId}</> :
                        payment.gatewayTransactionId ?? 'Registro manual'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ui.Pager meta={result.meta} onPage={onPage} />
          </>
        )}
      </ui.DataState>

      {shell.can('ADMIN', 'SELLER') && status !== 'PAID' && status !== 'VOID' ? (
        <PaymentForm shell={shell} invoiceId={invoiceId} balanceCents={balanceCents} onPaid={onPaid} />
      ) : null}
    </>
  );
}

/** Order record: lifecycle, invoice and payments (HU-09, HU-10). */
export function OrderDetailPage({ shell }: { shell: ShellContext }): ReactNode {
  const { ui } = shell;
  const { id = '' } = useParams();
  const api = useMemo(() => salesApi(shell.api), [shell.api]);
  const [version, setVersion] = useState(0);
  const [pending, setPending] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const cancelKey = useMemo(() => crypto.randomUUID(), [id]);
  const invoiceState = ui.useLoad((signal) => api.invoiceOf(id, signal), [id, version]);
  const invoice = invoiceState.state.status === 'ready' ? invoiceState.state.data : null;
  const canDeliver = invoice?.status === 'PAID' && invoice.balanceCents === 0;
  const { state, reload } = ui.useLoad((signal) => api.getOrder(id, signal), [id, version]);

  async function advance(action: 'approve' | 'advance'): Promise<void> {
    if (pending) return;
    setPending(true);
    try {
      await (action === 'approve' ? api.approve(id) : api.advance(id));
      shell.notify('Orden actualizada', 'success');
      setVersion((v) => v + 1);
    } catch (error) {
      shell.notify((error as { info?: { userMessage: string } }).info?.userMessage ?? 'No se pudo actualizar la orden.', 'error');
    } finally {
      setPending(false);
    }
  }

  async function cancel(): Promise<void> {
    if (pending) return;
    setPending(true);
    try {
      const saga = await api.cancel(id, cancelKey);
      if (saga.status === 'COMPLETED') {
        shell.notify('Orden cancelada y stock liberado', 'success');
        setConfirmCancel(false);
      } else if (saga.failureReason) {
        shell.notify(FAILURE_MESSAGE[saga.failureReason], 'error');
      } else {
        shell.notify('La cancelación sigue en proceso. Actualiza la orden para comprobar su estado.', 'info');
      }
      setVersion((v) => v + 1);
    } catch (error) {
      shell.notify((error as { info?: { userMessage: string } }).info?.userMessage ?? 'No se pudo cancelar la orden.', 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <ui.PageHeader title="Orden de trabajo" actions={<Link className="btn btn-quiet" to="..">Volver a órdenes</Link>} />
      <ui.DataState state={state} onRetry={reload}>
        {(order) => (
          <>
            <PatientHeader shell={shell} patientId={order.patientId} />
            <section className="card">
              <h2>
                {order.number} <ui.Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</ui.Badge>
              </h2>
              <OrderTimeline status={order.status} />
              <div className="table-wrap">
                <table>
                  <thead><tr><th>SKU</th><th>Descripción</th><th className="num">Cant.</th><th className="num">Subtotal</th></tr></thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.sku}</td>
                        <td>{item.description}</td>
                        <td className="num">{item.quantity}</td>
                        <td className="num">{formatCents(item.subtotalCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p><strong>Total: {formatCents(order.totalCents)}</strong></p>
              {shell.can('ADMIN', 'SELLER') ? (
                <div className="actions">
                  {order.status === 'QUOTATION' ? (
                    <button type="button" className="btn" disabled={pending} onClick={() => void advance('approve')}>
                      Aprobar
                    </button>
                  ) : null}
                  {NEXT_STATUS[order.status] ? (
                    <button type="button" className="btn" disabled={pending || (order.status === 'READY' && !canDeliver)} onClick={() => void advance('advance')}>
                      Avanzar a {STATUS_LABEL[NEXT_STATUS[order.status]!]}
                    </button>
                  ) : null}
                  {['QUOTATION', 'APPROVED'].includes(order.status) ? (
                    <button type="button" className="btn btn-quiet" disabled={pending || !invoice || invoice.paidCents > 0}
                      onClick={() => setConfirmCancel(true)}>Cancelar orden</button>
                  ) : null}
                </div>
              ) : null}
              {order.status === 'READY' && !canDeliver ? <p role="status">Para entregar esta orden debes completar el pago de la factura.
                {invoice ? ` Saldo pendiente: ${formatCents(invoice.balanceCents)}.` : ' Consulta el estado de la factura antes de entregar.'}</p> : null}
              {['QUOTATION', 'APPROVED'].includes(order.status) && invoice && invoice.paidCents > 0 ?
                <p>Esta orden tiene abonos. Requiere resolver la devolución antes de cancelarla.</p> : null}
              {confirmCancel && ['QUOTATION', 'APPROVED'].includes(order.status) ? <div className="state" role="alert">
                <p>¿Cancelar {order.number}? Se anulará la factura y se devolverá el stock reservado. Esta acción no se puede deshacer.</p>
                <div className="actions"><button className="btn" disabled={pending} onClick={() => void cancel()}>Confirmar cancelación</button>
                  <button className="btn btn-quiet" disabled={pending} onClick={() => setConfirmCancel(false)}>Conservar orden</button></div>
              </div> : null}
            </section>

            <section className="card">
              <h2>Factura</h2>
              <InvoiceSection shell={shell} orderId={order.id} version={version} onChanged={() => setVersion((v) => v + 1)} />
            </section>
          </>
        )}
      </ui.DataState>
    </>
  );
}
