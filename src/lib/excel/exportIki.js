import * as XLSX from 'xlsx';

/**
 * Exports Instalasi Karantina Ikan (IKI) traffic performance data to Excel (.xlsx).
 *
 * @param {object} params
 * @param {string} params.periodLabel - Human readable active period label
 * @param {Array} params.data - The filtered/searched list of IKI records
 */
export function exportIkiToExcel({ periodLabel = '', data = [], unit = 'Kg' }) {
  const rows = data.map((item, index) => {
    const volEkspor = unit === 'Kg' ? (item.volumeEksporKg || 0) : (item.volumeEksporEkor || 0);
    const volDokel = unit === 'Kg' ? (item.volumeDokelKg || 0) : (item.volumeDokelEkor || 0);
    return {
      'No.': index + 1,
      'Tanggal': item.tanggal || '-',
      'Nama IKI': item.namaIki || '-',
      'Alamat IKI': item.alamatIki || '-',
      'Komoditas': item.komoditas || '-',
      'Frekuensi Ekspor': item.frekuensiEkspor || 0,
      'Volume Ekspor': volEkspor,
      'Frekuensi Dokel': item.frekuensiDokel || 0,
      'Volume Dokel': volDokel,
      'Kapasitas IKI': item.kapasitasIki || 0,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set clean column widths
  worksheet['!cols'] = [
    { wch: 6 },  // No.
    { wch: 15 }, // Tanggal
    { wch: 38 }, // Nama IKI
    { wch: 45 }, // Alamat IKI
    { wch: 25 }, // Komoditas
    { wch: 18 }, // Frekuensi Ekspor
    { wch: 18 }, // Volume Ekspor
    { wch: 18 }, // Frekuensi Dokel
    { wch: 18 }, // Volume Dokel
    { wch: 18 }, // Kapasitas IKI
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Instalasi Karantina Ikan');

  const sanitizedPeriod = (periodLabel || 'Semua_Periode').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Instalasi_Karantina_Ikan_IKI_${sanitizedPeriod}.xlsx`;

  XLSX.writeFile(workbook, filename);
}
