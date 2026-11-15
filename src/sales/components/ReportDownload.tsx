import { useState } from 'react';
import { downloadReport, type Report } from '../model/reportExport';

export function ReportDownload({ report }: { report: Report }) {
  const [busy, setBusy] = useState<'pdf' | 'xlsx' | null>(null);
  const [error, setError] = useState('');
  async function exportFile(kind: 'pdf' | 'xlsx') {
    setBusy(kind);
    setError('');
    try { await downloadReport(report, kind); }
    catch { setError('No pudimos exportar el reporte. Vuelve a intentarlo.'); }
    finally { setBusy(null); }
  }
  return <div>
    <div className="actions" aria-label={`Exportar ${report.title}`}>
      <button className="btn btn-quiet" type="button" disabled={busy !== null}
        onClick={() => void exportFile('pdf')}>{busy === 'pdf' ? 'Generando PDF…' : 'Descargar PDF'}</button>
      <button className="btn btn-quiet" type="button" disabled={busy !== null}
        onClick={() => void exportFile('xlsx')}>{busy === 'xlsx' ? 'Generando Excel…' : 'Descargar Excel'}</button>
    </div>
    {error && <p role="alert">{error}</p>}
  </div>;
}
