export type ReportCell = string | number;
export type ReportColumn = { title: string; kind?: 'number' | 'money' };
export type Report = {
  title: string;
  fileName: string;
  sheetName: string;
  description: string;
  columns: readonly ReportColumn[];
  rows: readonly (readonly ReportCell[])[];
  total?: string;
};

export const reportMoney = (cents: number) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(cents / 100).replace(/\s/g, ' ');

const formatCell = (value: ReportCell, kind?: ReportColumn['kind']) =>
  typeof value === 'number' && kind === 'money' ? reportMoney(value) : String(value);

export async function reportPdf(report: Report): Promise<ArrayBuffer> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pages = new Set<number>();
  const columnStyles = Object.fromEntries(report.columns.flatMap((c, i) =>
    c.kind ? [[i, { halign: 'right' as const }]] : []));
  autoTable(pdf, {
    startY: 52,
    margin: { top: 52, bottom: 20, left: 15, right: 15 },
    head: [report.columns.map((column) => column.title)],
    body: report.rows.map((row) => row.map((value, i) => formatCell(value, report.columns[i]?.kind))),
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 3, textColor: [23, 41, 61], overflow: 'linebreak' },
    headStyles: { fillColor: [9, 107, 107], textColor: [255, 255, 255] },
    columnStyles,
    ...(report.total ? { foot: [[{ content: report.total, colSpan: report.columns.length }]],
      footStyles: { fillColor: [220, 240, 238], textColor: [19, 62, 63] }, showFoot: 'lastPage' as const } : {}),
    didDrawPage: ({ pageNumber }) => {
      if (pages.has(pageNumber)) return;
      pages.add(pageNumber);
      pdf.setFillColor(17, 39, 62);
      pdf.rect(0, 0, 210, 33, 'F');
      pdf.setTextColor(136, 234, 222);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('OptiView  /  Reportes', 15, 12);
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(19);
      pdf.text(report.title, 15, 25);
      pdf.setTextColor(71, 85, 105);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(pdf.splitTextToSize(report.description, 180), 15, 41);
      pdf.setDrawColor(210, 224, 232);
      pdf.line(15, 281, 195, 281);
      pdf.text(`Página ${pageNumber}`, 195, 287, { align: 'right' });
    },
  });
  return pdf.output('arraybuffer');
}

export async function reportExcel(report: Report) {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  workbook.creator = 'OptiView';
  const info = workbook.addWorksheet('Información');
  info.addRow([report.title]);
  info.addRow([report.description]);
  if (report.total) info.addRow([report.total]);
  info.getColumn(1).width = 88;
  info.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF11273E' } };
  info.getCell('A2').alignment = { wrapText: true, vertical: 'top' };
  info.getRow(2).height = 36;

  const sheet = workbook.addWorksheet(report.sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = report.columns.map((c) => ({ header: c.title, width: c.kind ? 22 : 26,
    style: c.kind === 'money' ? { numFmt: '"$" #,##0.00' } : {} }));
  for (const row of report.rows) sheet.addRow(row.map((v, i) =>
    typeof v === 'number' && report.columns[i]?.kind === 'money' ? v / 100 : v));
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF096B6B' } };
  });
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, sheet.rowCount), column: report.columns.length } };
  return workbook.xlsx.writeBuffer();
}

export async function downloadReport(report: Report, kind: 'pdf' | 'xlsx') {
  const buffer = kind === 'pdf' ? await reportPdf(report) : await reportExcel(report);
  const blob = new Blob([new Uint8Array(buffer)], {
    type: kind === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${report.fileName}.${kind}`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
