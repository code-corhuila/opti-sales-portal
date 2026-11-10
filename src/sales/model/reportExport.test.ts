import { describe, expect, it } from 'vitest';
import { Workbook } from 'exceljs';
import { reportExcel, reportPdf, type Report } from './reportExport';

const report: Report = {
  title: 'Ventas por día', fileName: 'ventas', sheetName: 'Ventas por día',
  description: 'Valor de órdenes no canceladas, no cobros. Montos en COP.',
  columns: [{ title: 'Fecha' }, { title: 'Valor (COP)', kind: 'money' }],
  rows: [['2026-11-10', 12000050], ['2026-11-11', 0]],
  total: 'Valor total de órdenes: $ 120.000,50',
};

describe('exportación de reportes', () => {
  it('genera un XLSX con montos numéricos, centavos y filtros', async () => {
    const workbook = new Workbook();
    await workbook.xlsx.load(await reportExcel(report));
    const sheet = workbook.getWorksheet(report.sheetName)!;
    expect(sheet.getCell('B2').value).toBe(120000.50);
    expect(sheet.getCell('B3').value).toBe(0);
    expect(sheet.autoFilter).toBeTruthy();
    expect(workbook.getWorksheet('Información')!.getCell('A2').value).toBe(report.description);
  });
  it('conserva el último registro y el total en un PDF de varias páginas', async () => {
    const rows = Array.from({ length: 100 }, (_, i) => [`DEMO-${i + 1}`, 12000050]);
    const pdf = Buffer.from(await reportPdf({ ...report, rows })).toString('latin1');
    expect(pdf.startsWith('%PDF-')).toBe(true);
    expect(pdf).toContain('DEMO-100');
    expect(pdf).toContain('120.000,50');
    expect(pdf).toContain('Valor total de');
    expect(Number(pdf.match(/\/Count (\d+)/)?.[1])).toBeGreaterThan(1);
  });
});
