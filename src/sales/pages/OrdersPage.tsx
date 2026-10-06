import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ShellContext } from '../../shell-contract';
import { salesApi, type SalesApi } from '../api/salesApi';
import { formatCents, STATUS_LABEL, STATUS_TONE, type WorkOrderStatus } from '../model/order';

const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as WorkOrderStatus[]).map((value) => ({ value, label: STATUS_LABEL[value] }));

const QUOTATION_ICON = (
  <>
    <rect x="4.5" y="3.5" width="11" height="14" rx="1.5" />
    <path d="M7.5 3.5V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v.5M7 9h6M7 12.5h6" />
  </>
);

const IN_PROCESS_ICON = (
  <>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 6v4l3 2" />
  </>
);

const LAB_ICON = (
  <>
    <path d="M8 2.5h4M8.5 2.5v4.3L5 15a1.5 1.5 0 0 0 1.4 2h7.2a1.5 1.5 0 0 0 1.4-2l-3.5-8.2V2.5" />
    <path d="M6.5 11.5h7" />
  </>
);

const DELIVERED_ICON = (
  <>
    <path d="M3 6.5 10 3l7 3.5-7 3.5-7-3.5Z" />
    <path d="M3 6.5V14l7 3.5 7-3.5V6.5" />
  </>
);

const CARD_ICON = {
  Cotizaciones: QUOTATION_ICON,
  'En proceso': IN_PROCESS_ICON,
  'En laboratorio': LAB_ICON,
  Entregadas: DELIVERED_ICON,
} satisfies Record<string, ReactNode>;

const CARD_TONE = {
  Cotizaciones: 'primary',
  'En proceso': 'warning',
  'En laboratorio': 'purple',
  Entregadas: 'success',
} satisfies Record<keyof typeof CARD_ICON, 'primary' | 'warning' | 'purple' | 'success'>;

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

  const cards: { title: keyof typeof CARD_ICON; value: number | null }[] = [
    { title: 'Cotizaciones', value: quotationTotal },
    { title: 'En proceso', value: inProcessTotal },
    { title: 'En laboratorio', value: inLaboratoryTotal },
    { title: 'Entregadas', value: deliveredTotal },
  ];

  return (
    <div className="summary-grid">
      {cards.map((card) => (
        <ui.StatCard key={card.title} icon={CARD_ICON[card.title]} tone={CARD_TONE[card.title]}
          label={card.title} value={card.value ?? '—'} />
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
