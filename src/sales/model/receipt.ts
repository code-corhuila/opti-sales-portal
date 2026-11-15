export const MAX_RECEIPT_BYTES = 2 * 1024 * 1024;
export function validateReceipt(file: Pick<File, 'size' | 'type'> | null): string | undefined {
  if (!file) return 'Adjunta un comprobante de prueba.';
  if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) return 'Solo se permiten PDF, PNG y JPEG.';
  if (file.size < 1 || file.size > MAX_RECEIPT_BYTES) return 'El archivo debe pesar entre 1 byte y 2 MiB.';
  return undefined;
}
export function receiptData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('No se pudo leer el comprobante.'));
    reader.readAsDataURL(file);
  });
}
