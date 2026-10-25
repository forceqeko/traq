import * as XLSX from 'xlsx';

/**
 * Ekspor data tabel pengujian Ikan Hidup (Dokel / Domas) ke Excel (.xlsx).
 *
 * @param {object} params
 * @param {string} params.trafficType - 'domestik_keluar' | 'domestik_masuk'
 * @param {string} params.periodLabel - Label periode aktif
 * @param {Array} params.data - Data teragregasi tabel
 */
export function exportIkanHidupToExcel({
  trafficType = 'domestik_keluar',
  periodLabel = '',
  data = [],
}) {
  const isDokel = trafficType === 'domestik_keluar';
  const daerahHeader = isDokel ? 'Daerah Tujuan' : 'Daerah Asal';

  const rows = data.map((item, index) => ({
    'No.': index + 1,
    [daerahHeader]: item.daerah || '-',
    'Komoditas': item.komoditas || '-',
    'Volume (Kg)': item.volume || 0,
    'Frekuensi Sertifikat': item.frekuensi || 0,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set lebar kolom yang rapi
  worksheet['!cols'] = [
    { wch: 6 },  // No.
    { wch: 32 }, // Daerah Tujuan / Asal
    { wch: 35 }, // Komoditas
    { wch: 20 }, // Volume (Kg)
    { wch: 22 }, // Frekuensi Sertifikat
  ];

  const workbook = XLSX.utils.book_new();
  const sheetTitle = isDokel ? 'Dokel Ikan Hidup' : 'Domas Ikan Hidup';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle);

  const sanitizedPeriod = (periodLabel || 'Semua_Periode').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Ikan_Hidup_${isDokel ? 'Dokel' : 'Domas'}_${sanitizedPeriod}.xlsx`;

  XLSX.writeFile(workbook, filename);
}
