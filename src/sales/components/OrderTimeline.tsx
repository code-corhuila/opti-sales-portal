import type { CSSProperties, ReactNode } from 'react';
import { STATUS_LABEL, type WorkOrderStatus } from '../model/order';

const STEPS: WorkOrderStatus[] = ['QUOTATION', 'APPROVED', 'IN_LABORATORY', 'READY', 'DELIVERED'];

/**
 * The lifecycle of the order (HU-09), redesigned for HU-21 as a numbered, connected stepper
 * instead of a flat list of pills.
 *
 * There is no shared CSS class for this shape — opti-front's old `.timeline` pill list does not
 * fit a step+connector layout — and this portal carries no stylesheet of its own: it is a
 * module-federation remote with no `<link>`/`import` wiring a local CSS file into the build (see
 * opti-sales-portal/index.html and src/main.tsx), and opti-front/src/styles.css says explicitly
 * that "portals use these class names; they carry no stylesheet of their own". Adding a local .css
 * file here would simply never be loaded. So the visuals below are inline styles built only from
 * the existing design-system tokens (--success, --primary, --primary-strong, --surface-2,
 * --on-primary, --text, --text-soft, --border, --danger, --danger-bg) — no new colors.
 */
export function OrderTimeline({ status }: { status: WorkOrderStatus }): ReactNode {
  if (status === 'CANCELLED') {
    return (
      <div
        role="status"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.8rem',
          borderRadius: 999, background: 'var(--danger-bg)', color: 'var(--danger)',
          border: '1px solid var(--danger)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem',
        }}
      >
        Cancelada
      </div>
    );
  }

  const currentIndex = STEPS.indexOf(status);

  return (
    <ol
      aria-label="Progreso de la orden"
      style={{ display: 'flex', alignItems: 'flex-start', listStyle: 'none', padding: 0, margin: '0 0 1.25rem', flexWrap: 'wrap', gap: '0.25rem' }}
    >
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        const circleStyle: CSSProperties = {
          width: '1.9rem', height: '1.9rem', borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '0.85rem', lineHeight: 1,
          background: done ? 'var(--success)' : current ? 'var(--primary)' : 'var(--surface-2)',
          color: done || current ? 'var(--on-primary)' : 'var(--text-soft)',
          border: current ? '2px solid var(--primary-strong)' : '1px solid var(--border)',
        };
        const lineStyle: CSSProperties = {
          flex: '1 1 2rem', height: 2, minWidth: '1.5rem', marginTop: '0.95rem', margin: '0.95rem 0.4rem 0',
          background: index < currentIndex ? 'var(--success)' : 'var(--border)',
        };
        return (
          <li
            key={step}
            aria-current={current ? 'step' : undefined}
            style={{ display: 'flex', alignItems: 'flex-start', flex: index === STEPS.length - 1 ? '0 0 auto' : '1 1 auto' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', minWidth: '5.5rem' }}>
              <span aria-hidden="true" style={circleStyle}>
                {done ? '✓' : index + 1}
              </span>
              <span
                style={{
                  fontSize: '0.8rem', textAlign: 'center',
                  fontWeight: current ? 700 : 500,
                  color: current ? 'var(--text)' : done ? 'var(--text)' : 'var(--text-soft)',
                }}
              >
                {STATUS_LABEL[step]}
              </span>
            </div>
            {index < STEPS.length - 1 ? <span aria-hidden="true" style={lineStyle} /> : null}
          </li>
        );
      })}
    </ol>
  );
}
