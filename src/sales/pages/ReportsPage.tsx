import { useMemo, type ReactNode } from 'react';
import {
  Bar, BarChart, Cell, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import type { ShellContext } from '../../shell-contract';
import { salesApi, type StatusCount } from '../api/salesApi';
import { ReportDownload } from '../components/ReportDownload';
import { reportMoney } from '../model/reportExport';
import { formatCents, STATUS_LABEL, STATUS_TONE, TONE_COLOR } from '../model/order';

/** `date` arrives as "YYYY-MM-DD"; only the day number is shown on the axis. */
function dayLabel(date: string): string {
  return date.slice(-2);
}

/** Sales by day of the current month: a bar per day, zero-filled (HU-24). */
function SalesTimeseriesCard({ shell }: { shell: ShellContext }): ReactNode {
  const navigate = useNavigate();
  const { ui } = shell;
  const api = useMemo(() => salesApi(shell.api), [shell.api]);
  const { state, reload } = ui.useLoad((signal) => api.salesTimeseries(signal), []);

  return (
    <section className="card">
      <h2>Ventas por día (mes actual)</h2>
      <p>Valor de las órdenes no canceladas por fecha UTC. No representa dinero cobrado.</p>
      <ui.DataState
        state={state}
        onRetry={reload}
        isEmpty={(data) => data.length === 0}
        emptyTitle="Sin ventas este mes"
        emptyHint="Las cifras aparecen cuando se registre la primera venta del mes."
      >
        {(data) => (
          <>
            <ReportDownload report={{
              title: 'Ventas por día',
              fileName: `optiview-ventas-${data[0]?.date.slice(0, 7) ?? 'mes-actual'}`,
              sheetName: 'Ventas por día',
              description: `Período: ${data[0]?.date.slice(0, 7) ?? 'mes actual'} (UTC). Valor de las órdenes no canceladas; no equivale a dinero cobrado. Montos en COP.`,
              columns: [{ title: 'Fecha (UTC)' }, { title: 'Valor de órdenes (COP)', kind: 'money' }],
              rows: data.map((row) => [row.date, row.totalCents]),
              total: `Valor total de órdenes: ${reportMoney(data.reduce((sum, row) => sum + row.totalCents, 0))}`,
            }} />
<ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.map((d) => ({ ...d, day: dayLabel(d.date) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--text-soft)" fontSize={12} />
              <YAxis stroke="var(--text-soft)" fontSize={12} tickFormatter={(value: number) => formatCents(value)} width={90} />
              <Tooltip
                formatter={(value) => formatCents(Number(value))}
                labelFormatter={(day) => `Día ${day}`}
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              />
              <Bar onClick={(_row, index) => { const row = data[index]; if (row) navigate(`/sales/reports/orders?date=${row.date}`); }} style={{ cursor: 'pointer' }} dataKey="totalCents" name="Ventas" fill={TONE_COLOR.info} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
<details><summary>Ver ventas por fecha</summary><div className="chart-legend">{data.map((row) => <Link key={row.date} to={`/sales/reports/orders?date=${row.date}`}>{row.date}: {formatCents(row.totalCents)}</Link>)}</div></details>
</>
        )}
      </ui.DataState>
    </section>
  );
}

/** Orders by status: one slice per WorkOrderStatus, reusing the portal's own status colors (HU-24). */
function OrdersByStatusCard({ shell }: { shell: ShellContext }): ReactNode {
  const navigate = useNavigate();
  const { ui } = shell;
  const api = useMemo(() => salesApi(shell.api), [shell.api]);
  const { state, reload } = ui.useLoad((signal) => api.ordersByStatus(signal), []);

  return (
    <section className="card">
      <h2>Órdenes por estado</h2>
      <ui.DataState
        state={state}
        onRetry={reload}
        isEmpty={(data) => data.every((row) => row.count === 0)}
        emptyTitle="Sin órdenes todavía"
        emptyHint="Las cifras aparecen cuando se abra la primera orden."
      >
        {(data) => (
          <>
            <ReportDownload report={{
              title: 'Órdenes por estado',
              fileName: 'optiview-ordenes-por-estado',
              sheetName: 'Órdenes por estado',
              description: 'Conteo de órdenes por su estado actual, incluidas las canceladas. No se limita al mes actual.',
              columns: [{ title: 'Estado' }, { title: 'Órdenes', kind: 'number' }],
              rows: data.map((row) => [STATUS_LABEL[row.status], row.count]),
              total: `Total de órdenes: ${data.reduce((sum, row) => sum + row.count, 0)}`,
            }} />
<ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie onClick={(_row, index) => { const row = data[index]; if (row) navigate(`/sales?status=${row.status}`); }} style={{ cursor: 'pointer' }} data={data} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100}
                innerRadius={55}
              >
                {data.map((row) => (
                  <Cell key={row.status} fill={TONE_COLOR[STATUS_TONE[row.status]]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, _name, item) => {
                  const row = (item as { payload: StatusCount }).payload;
                  return [value, STATUS_LABEL[row.status]];
                }}
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              />
            </PieChart>
          </ResponsiveContainer>
            <div className="chart-legend" aria-label="Ver órdenes por estado">
              {data.map((row) => (
                <Link key={row.status} to={`/sales?status=${row.status}`}>
                  <span className="chart-swatch" style={{ background: TONE_COLOR[STATUS_TONE[row.status]] }} />
                  {STATUS_LABEL[row.status]} ({row.count})
                </Link>
              ))}
            </div>
</>
        )}
      </ui.DataState>
    </section>
  );
}

/** Reports section (HU-24): sales by day and orders by status, ADMIN only. */
export function ReportsPage({ shell }: { shell: ShellContext }): ReactNode {
  const { ui } = shell;
  return (
    <>
      <ui.PageHeader title="Reportes" subtitle="Ventas del mes y estado actual de las órdenes de trabajo." />
      <div className="grid-2">
        <SalesTimeseriesCard shell={shell} />
        <OrdersByStatusCard shell={shell} />
      </div>
    </>
  );
}
