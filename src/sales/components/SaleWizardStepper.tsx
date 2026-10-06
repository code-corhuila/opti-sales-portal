import type { CSSProperties, ReactNode } from 'react';

export const SALE_STEPS = ['Paciente', 'Producto', 'Cantidad', 'Confirmar'] as const;

/**
 * Progress indicator for the 4-step "Nueva venta" wizard (HU-22).
 *
 * Reuses the numbered, connected stepper look introduced in HU-21's `OrderTimeline` (see that
 * component) so the two flows stay visually consistent. Same reasoning applies here: this portal
 * carries no stylesheet of its own, so the step circles and connector line are built purely from
 * the existing design-system tokens (--success, --primary, --primary-strong, --surface-2,
 * --on-primary, --text, --text-soft, --border) via inline styles, not a new CSS class.
 */
export function SaleWizardStepper({ current }: { current: number }): ReactNode {
  return (
    <ol
      aria-label="Progreso de la venta"
      style={{ display: 'flex', alignItems: 'flex-start', listStyle: 'none', padding: 0, margin: '0 0 1.25rem', flexWrap: 'wrap', gap: '0.25rem' }}
    >
      {SALE_STEPS.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        const circleStyle: CSSProperties = {
          width: '1.9rem', height: '1.9rem', borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '0.85rem', lineHeight: 1,
          background: done ? 'var(--success)' : active ? 'var(--primary)' : 'var(--surface-2)',
          color: done || active ? 'var(--on-primary)' : 'var(--text-soft)',
          border: active ? '2px solid var(--primary-strong)' : '1px solid var(--border)',
        };
        const lineStyle: CSSProperties = {
          flex: '1 1 2rem', height: 2, minWidth: '1.5rem', margin: '0.95rem 0.4rem 0',
          background: step < current ? 'var(--success)' : 'var(--border)',
        };
        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            style={{ display: 'flex', alignItems: 'flex-start', flex: index === SALE_STEPS.length - 1 ? '0 0 auto' : '1 1 auto' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', minWidth: '5.5rem' }}>
              <span aria-hidden="true" style={circleStyle}>
                {done ? '✓' : step}
              </span>
              <span
                style={{
                  fontSize: '0.8rem', textAlign: 'center',
                  fontWeight: active ? 700 : 500,
                  color: active ? 'var(--text)' : done ? 'var(--text)' : 'var(--text-soft)',
                }}
              >
                {label}
              </span>
            </div>
            {index < SALE_STEPS.length - 1 ? <span aria-hidden="true" style={lineStyle} /> : null}
          </li>
        );
      })}
    </ol>
  );
}
