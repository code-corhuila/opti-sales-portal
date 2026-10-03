import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Page, ShellContext } from '../shell-contract';
import { salesApi } from './api/salesApi';
import type { WorkOrder } from './model/order';

/** The card of this domain in the dashboard (HU-12): orders still in quotation. */
export default function Summary({ shell }: { shell: ShellContext }): ReactNode {
  const { ui } = shell;
  const api = useMemo(() => salesApi(shell.api), [shell.api]);
  const { state, reload } = ui.useLoad<Page<WorkOrder>>((signal) => api.listOrders({ status: 'QUOTATION', limit: 1 }, signal), []);
  return (
    <div className="summary-card">
      <h2>Órdenes por aprobar</h2>
      <ui.DataState state={state} onRetry={reload}>
        {(page) => (
          <>
            <div className={page.meta.total === 0 ? 'metric calm' : 'metric'}>{page.meta.total}</div>
            <p>{page.meta.total === 0 ? 'No hay cotizaciones pendientes.' : 'cotizaciones esperando aprobación.'}</p>
            {page.meta.total > 0 ? <Link to="/sales?status=QUOTATION">Ver órdenes</Link> : null}
          </>
        )}
      </ui.DataState>
    </div>
  );
}
