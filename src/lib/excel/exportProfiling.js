import * as XLSX from 'xlsx';

/**
 * Exports Profiling Pengguna Jasa data to Excel (.xlsx).
 *
 * @param {object} params
 * @param {string} params.commodity - 'hewan' | 'ikan' | 'tumbuhan'
 * @param {string} params.periodLabel - Human readable active period label
 * @param {Array} params.data - The filtered/searched list of company records
 */
export function exportProfilingToExcel({ commodity = 'ikan', periodLabel = '', data = [] }) {
  const isIkan = String(commodity).toLowerCase() === 'ikan';
  const capitalizedCommodity = commodity.charAt(0).toUpperCase() + commodity.slice(1).toLowerCase();

  const rows = data.map((item, index) => {
    const row = {
      'No.': index + 1,
      'Nama Perusahaan': item.namaPerusahaan || '-',
      'Komoditas': Array.isArray(item.komoditasList) ? item.komoditasList.join(', ') : (item.komoditasList || '-'),
      'Frekuensi Domestik Keluar': item.frekuensiDokel || 0,
      'Frekuensi Ekspor': item.frekuensiEkspor || 0,
      'Total Frekuensi': item.totalFrekuensi || 0,
    };

    if (isIkan) {
      row['Status HACCP'] = item.hasHaccp ? 'Ya' : 'Tidak';
    }

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set explicit column widths for clean readability
  worksheet['!cols'] = [
    { wch: 6 },  // No.
    { wch: 38 }, // Nama Perusahaan
    { wch: 45 }, // Komoditas
    { wch: 25 }, // Frekuensi Domestik Keluar
    { wch: 20 }, // Frekuensi Ekspor
    { wch: 18 }, // Total Frekuensi
    ...(isIkan ? [{ wch: 16 }] : []), // Status HACCP
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Profiling ${capitalizedCommodity}`);

  const sanitizedPeriod = (periodLabel || 'Semua_Periode').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Profiling_Pengguna_Jasa_${capitalizedCommodity}_${sanitizedPeriod}.xlsx`;

  XLSX.writeFile(workbook, filename);
}
