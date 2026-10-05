import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { ShellContext } from '../shell-contract';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { OrdersPage } from './pages/OrdersPage';
import { NewSalePage } from './pages/NewSalePage';

/** The sales portal: mounted by opti-front under /sales. */
export default function Portal({ shell }: { shell: ShellContext }): ReactNode {
  return (
    <Routes>
      <Route index element={<OrdersPage shell={shell} />} />
      <Route path="new" element={<NewSalePage shell={shell} />} />
      <Route path=":id" element={<OrderDetailPage shell={shell} />} />
      <Route path="*" element={<Navigate to="/sales" replace />} />
    </Routes>
  );
}
