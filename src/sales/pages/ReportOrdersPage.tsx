import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ShellContext } from '../../shell-contract';
import { salesApi } from '../api/salesApi';
import { formatCents, STATUS_LABEL, STATUS_TONE } from '../model/order';

export function ReportOrdersPage({ shell }: { shell: ShellContext }) {
  const { ui } = shell;
  const [params] = useSearchParams();
  const date = params.get('date') ?? '';
  const api = useMemo(() => salesApi(shell.api), [shell.api]);
  const { state, reload } = ui.useLoad((signal) => api.reportOrders(date, signal), [date]);
  return <>
    <ui.PageHeader title={`Ventas del ${date}`} subtitle="Órdenes que componen la gráfica, por fecha de creación en UTC. Las canceladas se excluyen. Este total representa órdenes, no dinero cobrado."
      actions={<Link className="btn btn-quiet" to="/sales/reports">Volver a reportes</Link>} />
    <ui.DataState state={state} onRetry={reload}>
      {(orders) => <section className="card">
        <h2>{orders.length} órdenes · {formatCents(orders.reduce((total, order) => total + order.totalCents, 0))}</h2>
        {orders.length === 0 ? <p>No hay ventas para esta fecha.</p> : <div className="table-wrap"><table>
          <thead><tr><th>Orden</th><th>Fecha</th><th>Estado</th><th className="num">Total</th><th>Detalle</th></tr></thead>
          <tbody>{orders.map((order) => <tr key={order.id}>
            <td>{order.number}</td><td>{new Date(order.createdAt).toLocaleString('es-CO')}</td>
            <td><ui.Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</ui.Badge></td>
            <td className="num">{formatCents(order.totalCents)}</td>
            <td><Link to={`/sales/${order.id}`}>Ver orden y pagos</Link></td>
          </tr>)}</tbody>
        </table></div>}
      </section>}
    </ui.DataState>
  </>;
}
