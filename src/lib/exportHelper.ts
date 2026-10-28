import * as XLSX from 'xlsx';
import { showToast } from '../components/ui/Toast';

export function exportToCsv(filename: string, dataArray: Record<string, any>[]): void {
  if (!dataArray || dataArray.length === 0) {
    showToast('Tidak ada data untuk diekspor', 'error');
    return;
  }

  try {
    const headers = Object.keys(dataArray[0]);

    // Format individual cell value for CSV
    const formatCell = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    // Header line
    const headerLine = headers.map(formatCell).join(',');

    // Row lines
    const rowLines = dataArray.map((row) =>
      headers.map((header) => formatCell(row[header])).join(',')
    );

    // Combine with UTF-8 BOM for Excel compatibility
    const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    link.setAttribute('download', cleanFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`File CSV "${cleanFilename}" berhasil diunduh`, 'success');
  } catch (err: any) {
    showToast('Gagal mengekspor data ke CSV', 'error');
  }
}

export function exportToExcel(
  filename: string,
  dataArray: Record<string, any>[],
  sheetName: string = 'Laporan'
): void {
  if (!dataArray || dataArray.length === 0) {
    showToast('Tidak ada data untuk diekspor', 'error');
    return;
  }

  try {
    const ws = XLSX.utils.json_to_sheet(dataArray);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(wb, cleanFilename);

    showToast(`File Excel "${cleanFilename}" berhasil diunduh`, 'success');
  } catch (err: any) {
    showToast('Gagal mengekspor data ke Excel (.xlsx)', 'error');
  }
}
