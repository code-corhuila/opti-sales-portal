import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ShellContext } from '../../shell-contract';
import { salesApi } from '../api/salesApi';
import { billingSummary } from '../model/billing';
import { formatCents, INVOICE_STATUS_LABEL, type InvoiceStatus } from '../model/order';

const TONES = { PENDING: 'warning', PARTIAL: 'info', PAID: 'success', VOID: 'neutral' } as const;

export function BillingPage({ shell }: { shell: ShellContext }): ReactNode {
  const { ui } = shell;
  const api = useMemo(() => salesApi(shell.api), [shell.api]);
  const [status, setStatus] = useState('');
  const [text, setText] = useState('');
  const [page, setPage] = useState(1);
  const q = ui.useDebounced(text.trim().toLocaleLowerCase('es'), 300);
  const { state, reload } = ui.useLoad((signal) => api.billingOverview(signal), []);

  return <>
    <ui.PageHeader title="Ventas y facturación" subtitle="Consulta facturas, abonos y saldos pendientes."
      actions={<Link className="btn" to="/sales/new">＋ Nueva venta</Link>} />
    <ui.DataState state={state} onRetry={reload}>
      {(data) => {
        const summary = billingSummary(data.invoices);
        const filtered = data.invoices.filter((invoice) => (!status || invoice.status === status)
          && `${invoice.number} ${data.patients[invoice.patientId]?.fullName ?? ''}`.toLocaleLowerCase('es').includes(q));
        const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
        const currentPage = Math.min(page, totalPages);
        const rows = filtered.slice((currentPage - 1) * 10, currentPage * 10);
        return <>
          <div className="summary-grid">
            <ui.StatCard icon={<path d="M10 2v16M14 5H8a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H5" />} tone="primary" label="Ventas hoy"
              value={formatCents(summary.todayCents)} hint={`${summary.todayCount} facturas emitidas hoy · Colombia`} />
            <ui.StatCard icon={<path d="m4 10 4 4 8-8" />} tone="success" label="Pagado"
              value={formatCents(summary.paidCents)} hint="Abonos acumulados en facturas vigentes" />
            <ui.StatCard icon={<><circle cx="10" cy="10" r="7" /><path d="M10 6v4l3 2" /></>} tone="warning" label="Saldo pendiente"
              value={formatCents(summary.balanceCents)} hint={`${summary.pendingCount} facturas con saldo`} />
            <ui.StatCard icon={<><rect x="4" y="3" width="12" height="14" rx="2" /><path d="M7 7h6M7 10h6M7 13h3" /></>} tone="purple" label="Ticket promedio"
              value={formatCents(summary.averageCents)} hint="Promedio de las facturas emitidas hoy" />
          </div>
          <div className="toolbar" role="search">
            <ui.TextField id="invoice-q" label="Buscar" type="search" value={text} placeholder="Factura o paciente…"
              onChange={(value) => { setText(value); setPage(1); }} />
            <ui.SelectField id="invoice-status" label="Estado" value={status} placeholder="Todos"
              options={Object.entries(INVOICE_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
              onChange={(value) => { setStatus(value); setPage(1); }} />
            <button className="btn btn-quiet" type="button" onClick={() => { setText(''); setStatus(''); setPage(1); }}>Limpiar filtros</button>
            <button className="btn btn-quiet" type="button" onClick={reload}>Actualizar</button>
          </div>
          {rows.length ? <>
            <div className="table-wrap"><table>
              <thead><tr><th>Factura</th><th>Paciente</th><th>Fecha</th><th className="num">Total</th><th className="num">Abonado</th><th className="num">Saldo</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>{rows.map((invoice) => <tr key={invoice.id}>
                <td><Link to={`/sales/${invoice.workOrderId}`}>{invoice.number}</Link></td>
                <td><span className="user-cell"><ui.Avatar name={data.patients[invoice.patientId]?.fullName ?? 'Paciente'} />{data.patients[invoice.patientId]?.fullName ?? 'Paciente no disponible'}</span></td>
                <td>{new Date(invoice.createdAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}</td>
                <td className="num">{formatCents(invoice.totalCents)}</td><td className="num">{formatCents(invoice.paidCents)}</td>
                <td className="num">{formatCents(invoice.balanceCents)}</td>
                <td><ui.Badge tone={TONES[invoice.status as InvoiceStatus]}>{INVOICE_STATUS_LABEL[invoice.status]}</ui.Badge></td>
                <td><Link className="btn btn-quiet" to={`/sales/${invoice.workOrderId}`}>Ver detalle</Link></td>
              </tr>)}</tbody>
            </table></div>
            <ui.Pager meta={{ page: currentPage, limit: 10, total: filtered.length, totalPages }} onPage={setPage} />
          </> : <section className="card"><h2>No hay facturas para mostrar</h2><p>{data.invoices.length ? 'Prueba con otros filtros.' : 'Las facturas aparecen al registrar una venta.'}</p></section>}
        </>;
      }}
    </ui.DataState>
  </>;
}
