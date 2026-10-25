import * as XLSX from 'xlsx';

/**
 * Ekspor data tabel pengujian Ikan Hidup (Dokel / Domas / Ekspor) ke Excel (.xlsx).
 *
 * @param {object} params
 * @param {string} params.trafficType - 'domestik_keluar' | 'domestik_masuk' | 'ekspor'
 * @param {string} params.periodLabel - Label periode aktif
 * @param {Array} params.data - Data teragregasi tabel
 */
export function exportIkanHidupToExcel({
  trafficType = 'domestik_keluar',
  periodLabel = '',
  data = [],
}) {
  const isDokel = trafficType === 'domestik_keluar';
  const isDomas = trafficType === 'domestik_masuk';
  const isEkspor = trafficType === 'ekspor';

  let daerahHeader = 'Daerah Tujuan';
  let sheetTitle = 'Dokel Ikan Hidup';
  let filePrefix = 'Dokel';

  if (isDomas) {
    daerahHeader = 'Daerah Asal';
    sheetTitle = 'Domas Ikan Hidup';
    filePrefix = 'Domas';
  } else if (isEkspor) {
    daerahHeader = 'Negara Tujuan';
    sheetTitle = 'Ekspor Ikan Hidup';
    filePrefix = 'Ekspor';
  }

  const rows = data.map((item, index) => ({
    'No.': index + 1,
    [daerahHeader]: item.daerah || '-',
    'Komoditas': item.komoditas || '-',
    'Nama Tercetak': item.namaTercetak || '-',
    'Volume (Kg)': item.volumeKg || 0,
    'Volume (ekor)': item.volumeEkor || 0,
    'Frekuensi Sertifikat': item.frekuensi || 0,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set lebar kolom yang rapi
  worksheet['!cols'] = [
    { wch: 6 },  // No.
    { wch: 30 }, // Daerah / Negara Tujuan / Asal
    { wch: 32 }, // Komoditas
    { wch: 32 }, // Nama Tercetak
    { wch: 18 }, // Volume (Kg)
    { wch: 18 }, // Volume (ekor)
    { wch: 22 }, // Frekuensi Sertifikat
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle);

  const sanitizedPeriod = (periodLabel || 'Semua_Periode').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Ikan_Hidup_${filePrefix}_${sanitizedPeriod}.xlsx`;

  XLSX.writeFile(workbook, filename);
}
