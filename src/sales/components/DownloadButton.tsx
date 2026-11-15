import { useState } from 'react';
import type { ShellContext } from '../../shell-contract';

export function DownloadButton({ shell, path, filename, label }: { shell: ShellContext; path: string; filename: string; label: string }) {
  const [pending, setPending] = useState(false);
  async function download() {
    if (pending) return;
    setPending(true);
    try {
      const blob = await shell.api.get<Blob>(path, { responseType: 'blob' });
      if (!(blob instanceof Blob)) throw new Error('Actualiza el contenedor de OptiView para descargar documentos.');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const extension = ({ 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg' } as Record<string, string>)[blob.type] ?? '';
      anchor.download = /\.[a-z0-9]+$/i.test(filename) ? filename : filename + extension; document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      shell.notify((error as { info?: { userMessage: string } }).info?.userMessage ?? 'No se pudo descargar el documento.', 'error');
    } finally { setPending(false); }
  }
  return <button className="btn btn-quiet" type="button" disabled={pending} onClick={() => void download()}>{pending ? 'Descargando…' : label}</button>;
}
