import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ShellContext } from '../../shell-contract';
import { SaleForm } from '../components/SaleForm';

/** New sale: registers through the workflow's place-order saga. */
export function NewSalePage({ shell }: { shell: ShellContext }): ReactNode {
  const navigate = useNavigate();
  return (
    <>
      <shell.ui.PageHeader
        title="Nueva venta"
        subtitle="Sigue los pasos: paciente, producto y cantidad; la orden y la factura se abren automáticamente."
        actions={
          <Link className="btn btn-quiet" to="..">
            Volver
          </Link>
        }
      />
      <div className="card">
        <SaleForm shell={shell} onPlaced={(id) => navigate(`/sales/${id}`, { replace: true })} />
      </div>
    </>
  );
}
