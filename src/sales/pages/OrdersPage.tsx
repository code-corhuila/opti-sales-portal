import { useMemo, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ShellContext } from '../../shell-contract';
import { salesApi } from '../api/salesApi';
import { formatCents, STATUS_LABEL, STATUS_TONE, type WorkOrderStatus } from '../model/order';

const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as WorkOrderStatus[]).map((value) => ({ value, label: STATUS_LABEL[value] }));

/** Work order listing: bounded pages, filterable by status. Orders are opened by the workflow, not here. */
export function OrdersPage({ shell }: { shell: ShellContext }): ReactNode {
  const { ui } = shell;
  const api = useMemo(() => salesApi(shell.api), [shell.api]);
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') ?? '') as WorkOrderStatus | '';
  const page = Number(params.get('page') ?? '1') || 1;
  const { state, reload } = ui.useLoad((signal) => api.listOrders({ status, page }, signal), [status, page]);

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
      <ui.PageHeader title="Órdenes de trabajo" subtitle="Las órdenes se abren desde el flujo de venta (workflow)." />
      <div className="toolbar">
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
