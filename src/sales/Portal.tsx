import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { ShellContext } from '../shell-contract';
import { RequireRole } from './RequireRole';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { OrdersPage } from './pages/OrdersPage';
import { NewSalePage } from './pages/NewSalePage';
import { ReportsPage } from './pages/ReportsPage';
import { BillingPage } from './pages/BillingPage';
import { ReportOrdersPage } from './pages/ReportOrdersPage';

/** The sales portal: mounted by opti-front under /sales. */
export default function Portal({ shell }: { shell: ShellContext }): ReactNode {
  return (
    <Routes>
      <Route index element={<OrdersPage shell={shell} />} />
      <Route path="reports/orders" element={<RequireRole shell={shell} role="ADMIN"><ReportOrdersPage shell={shell} /></RequireRole>} />
      <Route path="new" element={<NewSalePage shell={shell} />} />
      <Route path="billing" element={shell.can('ADMIN', 'SELLER') ? <BillingPage shell={shell} /> :
        <div className="state state-error" role="alert"><p>Esta sección requiere el rol de administrador o vendedor.</p></div>} />
      <Route
        path="reports"
        element={
          <RequireRole shell={shell} role="ADMIN">
            <ReportsPage shell={shell} />
          </RequireRole>
        }
      />
      <Route path=":id" element={<OrderDetailPage shell={shell} />} />
      <Route path="*" element={<Navigate to="/sales" replace />} />
    </Routes>
  );
}
