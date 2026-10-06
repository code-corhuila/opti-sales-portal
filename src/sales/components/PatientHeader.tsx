import { useMemo, type ReactNode } from 'react';
import type { ShellContext } from '../../shell-contract';
import { salesApi } from '../api/salesApi';

/**
 * The patient's identity at the top of the order detail (HU-21). The order only carries
 * `patientId`; this fetches the rest from the customers domain's own patient-detail endpoint
 * (`GET /api/v1/patients/{id}`), which already exists and is used by other portals — no change to
 * opti-sales-api is needed for this part.
 */
export function PatientHeader({ shell, patientId }: { shell: ShellContext; patientId: string }): ReactNode {
  const { ui } = shell;
  const api = useMemo(() => salesApi(shell.api), [shell.api]);
  const { state, reload } = ui.useLoad((signal) => api.getPatient(patientId, signal), [patientId]);

  return (
    <section className="card">
      <h2>Paciente</h2>
      <ui.DataState state={state} onRetry={reload}>
        {(patient) => (
          <dl className="facts">
            <dt>Nombre</dt>
            <dd>{patient.fullName}</dd>
            <dt>Documento</dt>
            <dd>{patient.documentNumber}</dd>
            <dt>Teléfono</dt>
            <dd>{patient.phone}</dd>
          </dl>
        )}
      </ui.DataState>
    </section>
  );
}
