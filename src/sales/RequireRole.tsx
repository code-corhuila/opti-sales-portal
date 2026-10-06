import type { ReactNode } from 'react';
import type { Role, ShellContext } from '../shell-contract';

/** A portal never assumes the container already checked the role: it can be opened directly by URL. */
export function RequireRole({ shell, role, children }: { shell: ShellContext; role: Role; children: ReactNode }): ReactNode {
  if (!shell.can(role)) {
    return (
      <div className="state state-error" role="alert">
        <p className="state-title">Sin permiso</p>
        <p>Esta sección es solo para administradores.</p>
      </div>
    );
  }
  return children;
}
