import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ShellContext } from '../../shell-contract';
import { salesApi, type SalesApi } from '../api/salesApi';
import { formatCents, STATUS_LABEL, STATUS_TONE, type WorkOrderStatus } from '../model/order';

const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as WorkOrderStatus[]).map((value) => ({ value, label: STATUS_LABEL[value] }));

/**
 * The four summary cards above the filter (HU-21). Each one reuses the same pattern as this
 * domain's dashboard card (../Summary.tsx): a `listOrders({ status, limit: 1 })` call that only
 * reads `page.meta.total`, so no new aggregation endpoint is needed.
 *
 * Grouping decision (not specified by the HU, decided here looking at WorkOrderStatus/STATUS_LABEL
 * in model/order.ts): "En proceso" rolls up APPROVED + IN_LABORATORY — orders already approved but
 * not yet delivered, i.e. actively being worked. "En laboratorio" then drills into just the lab
 * sub-stage. The two cards intentionally overlap: one is the aggregate, the other the detail, the
 * same way a dashboard often shows both a total and a breakdown. READY and CANCELLED are not shown
 * as a card: the HU asks for exactly four, and READY (lista para entrega) has no slot left, while
 * CANCELLED is an exception path, not a stage of the happy path this dashboard tracks.
 */
function OrderSummaryCards({ shell, api }: { shell: ShellContext; api: SalesApi }): ReactNode {
  const { ui } = shell;
  const quotation = ui.useLoad((signal) => api.listOrders({ status: 'QUOTATION', limit: 1 }, signal), []);
  const approved = ui.useLoad((signal) => api.listOrders({ status: 'APPROVED', limit: 1 }, signal), []);
  const inLaboratory = ui.useLoad((signal) => api.listOrders({ status: 'IN_LABORATORY', limit: 1 }, signal), []);
  const delivered = ui.useLoad((signal) => api.listOrders({ status: 'DELIVERED', limit: 1 }, signal), []);

  const quotationTotal = quotation.state.status === 'ready' ? quotation.state.data.meta.total : null;
  const approvedTotal = approved.state.status === 'ready' ? approved.state.data.meta.total : null;
  const inLaboratoryTotal = inLaboratory.state.status === 'ready' ? inLaboratory.state.data.meta.total : null;
  const deliveredTotal = delivered.state.status === 'ready' ? delivered.state.data.meta.total : null;
  const inProcessTotal = approvedTotal !== null && inLaboratoryTotal !== null ? approvedTotal + inLaboratoryTotal : null;

  const cards: { title: string; value: number | null }[] = [
    { title: 'Cotizaciones', value: quotationTotal },
    { title: 'En proceso', value: inProcessTotal },
    { title: 'En laboratorio', value: inLaboratoryTotal },
    { title: 'Entregadas', value: deliveredTotal },
  ];

  return (
    <div className="summary-grid">
      {cards.map((card) => (
        <div className="summary-card" key={card.title}>
          <h2>{card.title}</h2>
          <div className={card.value === 0 ? 'metric calm' : 'metric'}>{card.value ?? '—'}</div>
        </div>
      ))}
    </div>
  );
}

/** Work order listing: bounded pages, filterable by status and searchable by number. Orders are opened by the workflow, not here. */
export function OrdersPage({ shell }: { shell: ShellContext }): ReactNode {
  const { ui } = shell;
  const api = useMemo(() => salesApi(shell.api), [shell.api]);
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const status = (params.get('status') ?? '') as WorkOrderStatus | '';
  const page = Number(params.get('page') ?? '1') || 1;
  const q = ui.useDebounced(text.trim(), 300);
  const { state, reload } = ui.useLoad((signal) => api.listOrders({ status, q, page }, signal), [status, q, page]);

  function update(next: Record<string, string>): void {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value);
      else merged.delete(key);
    }
    setParams(merged, { replace: true });
  }

  return (
    <>
      <ui.PageHeader
        title="Órdenes de trabajo"
        subtitle="Las órdenes se abren desde el flujo de venta (workflow)."
        actions={
          shell.can('ADMIN', 'SELLER') ? (
            <Link className="btn" to="new">
              Nueva venta
            </Link>
          ) : null
        }
      />
      <OrderSummaryCards shell={shell} api={api} />
      <div className="toolbar" role="search">
        <ui.TextField id="order-q" label="Buscar" type="search" value={text} placeholder="Número de orden"
          onChange={(value) => { setText(value); update({ page: '' }); }} maxLength={40}
          hint="Busca por número de orden (OT-xxxx); no busca por nombre del paciente." />
        <ui.SelectField id="order-status" label="Estado" value={status} placeholder="Todos"
          onChange={(value) => update({ status: value, page: '' })} options={STATUS_OPTIONS} />
      </div>
      <ui.DataState
        state={state}
        onRetry={reload}
        isEmpty={(result) => result.data.length === 0}
        emptyTitle="No hay órdenes todavía"
        emptyHint="Se crean automáticamente al completar una venta."
      >
        {(result) => (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Número</th><th className="num">Total</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {result.data.map((order) => (
                    <tr key={order.id}>
                      <td><Link to={order.id}>{order.number}</Link></td>
                      <td className="num">{formatCents(order.totalCents)}</td>
                      <td><ui.Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</ui.Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ui.Pager meta={result.meta} onPage={(next) => update({ page: next === 1 ? '' : String(next) })} />
          </>
        )}
      </ui.DataState>
    </>
  );
}
