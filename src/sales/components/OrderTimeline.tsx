import type { ReactNode } from 'react';
import { STATUS_LABEL, type WorkOrderStatus } from '../model/order';

const STEPS: WorkOrderStatus[] = ['QUOTATION', 'APPROVED', 'IN_LABORATORY', 'READY', 'DELIVERED'];

/** The lifecycle of the order (HU-09), so staff always sees where it stands without calling the lab. */
export function OrderTimeline({ status }: { status: WorkOrderStatus }): ReactNode {
  if (status === 'CANCELLED') {
    return (
      <ul className="timeline">
        <li className="current">Cancelada</li>
      </ul>
    );
  }
  const currentIndex = STEPS.indexOf(status);
  return (
    <ul className="timeline">
      {STEPS.map((step, index) => (
        <li key={step} className={index === currentIndex ? 'current' : index < currentIndex ? 'done' : ''}>
          {STATUS_LABEL[step]}
        </li>
      ))}
    </ul>
  );
}
