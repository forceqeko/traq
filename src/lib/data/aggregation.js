import { formatMonthToShort, getMonthSortOrder, isMonthName, getMonthName } from './monthUtils';

export { formatMonthToShort, getMonthSortOrder, getMonthName };

/**
 * Aggregates raw row objects based on X-axis, Y-axis, aggregation type, Top-N limit, and group_by multi-series.
 * Accurately supports unique certificate deduplication (No. K.1.1) for frequency metrics per category and per series.
 * 
 * @param {object[]} rows - Raw JSON rows from JSONB data_records
 * @param {object} options - Aggregation configuration
 * @param {string} options.xAxis - Column name for X-axis / category
 * @param {string} options.yAxis - Column name for Y-axis / metric value
 * @param {'sum' | 'avg' | 'count' | 'min' | 'max'} options.aggregation - Aggregation method
 * @param {string|number} [options.topN] - '5' | '10' | '15' | '20' | 'all'
 * @param {boolean} [options.groupOthers=true] - Whether to sum remaining items into "Lainnya"
 * @param {string} [options.groupBy] - Secondary column / sector / traffic for multi-series grouping
 * @returns {object[]} Aggregated array ready for Recharts
 */
export function aggregateData(rows = [], {
  xAxis = 'Komoditas',
  yAxis = 'Volume',
  aggregation = 'sum',
  topN = '10',
  groupOthers = true,
  groupBy,
}) {
  if (!rows || rows.length === 0) return [];

  const groupMap = new Map();
  const xLower = String(xAxis || '').toLowerCase();
  const isMonthAxis =
    xLower.includes('bulan') ||
    xLower.includes('month') ||
    xLower.includes('periode') ||
    xLower === 'bln';

  const yLower = String(yAxis || '').toLowerCase();
  const isCertificateMetric =
    yLower.includes('frekuensi') ||
    yLower.includes('sertifikat') ||
    yLower.includes('dokumen') ||
    yLower === 'count' ||
    aggregation === 'count';

  const isPrice =
    yLower.includes('nilai') ||
    yLower.includes('harga') ||
    yLower.includes('rupiah') ||
    yLower.includes('rp');

  const isWeight =
    yLower.includes('vol') ||
    yLower.includes('netto') ||
    yLower.includes('berat');

  const allDetectedSeries = new Set();

  rows.forEach((row, idx) => {
    const rawX = getValueByFlexibleKey(row, xAxis);
    let xVal = String(rawX ?? 'Lainnya').trim() || 'Lainnya';
    if (isMonthAxis || isMonthName(xVal)) {
      xVal = formatMonthToShort(xVal, isMonthAxis);
    }
    
    let numVal = 1;
    if (isCertificateMetric) {
      numVal = 1;
    } else if (isPrice) {
      numVal = parseNumericValue(row.Nilai_Rupiah ?? row['Harga Barang (Rp)'] ?? row.Harga ?? getValueByFlexibleKey(row, yAxis));
    } else if (isWeight) {
      numVal = parseNumericValue(row['Netto P8'] ?? row['Netto P1'] ?? row.Netto ?? row['Vol P1'] ?? row.Volume ?? row['Vol Lain'] ?? getValueByFlexibleKey(row, yAxis));
    } else {
      numVal = parseNumericValue(getValueByFlexibleKey(row, yAxis));
    }

    // Identifier unik sertifikat: Nomor Dokumen (hasil akhir) > No. K.1.1 (verifikasi) > No. Aju > row index
    const certId = getCertificateId(row, idx);

    if (!groupMap.has(xVal)) {
      groupMap.set(xVal, {
        [xAxis]: xVal,
        name: xVal,
        _count: 0,
        _sum: 0,
        _min: numVal,
        _max: numVal,
        _certs: new Set(),
        _seriesCerts: {},
        _seriesSums: {},
        _seriesCounts: {},
        _seriesMins: {},
        _seriesMaxs: {},
        [yAxis]: 0,
        value: 0,
      });
    }

    const item = groupMap.get(xVal);
    item._count += 1;
    item._sum += numVal;
    item._certs.add(certId);
    item._min = Math.min(item._min, numVal);
    item._max = Math.max(item._max, numVal);

    if (groupBy && groupBy !== 'none') {
      let seriesName = '';
      if (groupBy === 'commodity_type' || groupBy === 'sektor' || groupBy === 'komoditas_sektor') {
        const c = String(row._commodity_type || row.commodity_type || row.datasets?.commodity_type || '').toLowerCase();
        if (c === 'hewan' || String(row.Komoditas || '').toLowerCase().includes('hewan')) seriesName = 'Hewan';
        else if (c === 'ikan' || String(row.Komoditas || '').toLowerCase().includes('ikan')) seriesName = 'Ikan';
        else if (c === 'tumbuhan' || String(row.Komoditas || '').toLowerCase().includes('tumbuhan')) seriesName = 'Tumbuhan';
        else seriesName = 'Lainnya';
      } else if (groupBy === 'traffic_type' || groupBy === 'lalu_lintas' || groupBy === 'traffic') {
        const t = String(row._traffic_type || row.traffic_type || row.datasets?.traffic_type || '').toLowerCase();
        if (t === 'domestik_masuk' || t.includes('masuk')) seriesName = 'Domestik Masuk';
        else if (t === 'domestik_keluar' || t.includes('keluar')) seriesName = 'Domestik Keluar';
        else if (t === 'ekspor') seriesName = 'Ekspor';
        else if (t === 'impor') seriesName = 'Impor';
        else seriesName = 'Lainnya';
      } else {
        seriesName = String(getValueByFlexibleKey(row, groupBy) ?? 'Lainnya').trim() || 'Lainnya';
      }

      allDetectedSeries.add(seriesName);

      if (!item._seriesCerts[seriesName]) item._seriesCerts[seriesName] = new Set();
      item._seriesCerts[seriesName].add(certId);

      item._seriesSums[seriesName] = (item._seriesSums[seriesName] || 0) + numVal;
      item._seriesCounts[seriesName] = (item._seriesCounts[seriesName] || 0) + 1;
      item._seriesMins[seriesName] = Math.min(item._seriesMins[seriesName] ?? Infinity, numVal);
      item._seriesMaxs[seriesName] = Math.max(item._seriesMaxs[seriesName] ?? -Infinity, numVal);
    }
  });

  // Calculate final aggregated values per category and per series
  let result = Array.from(groupMap.values()).map((item) => {
    let finalValue = 0;

    if (isCertificateMetric) {
      finalValue = item._certs.size > 0 ? item._certs.size : item._count;
    } else {
      switch (aggregation.toLowerCase()) {
        case 'sum':
          finalValue = item._sum;
          break;
        case 'avg':
          finalValue = item._count > 0 ? item._sum / item._count : 0;
          break;
        case 'count':
          finalValue = item._certs.size > 0 ? item._certs.size : item._count;
          break;
        case 'min':
          finalValue = item._min === Infinity ? 0 : item._min;
          break;
        case 'max':
          finalValue = item._max === -Infinity ? 0 : item._max;
          break;
        default:
          finalValue = item._sum;
      }
    }

    const rounded = Math.round(finalValue * 100) / 100;
    const { _count, _sum, _min, _max, _certs, _seriesCerts, _seriesSums, _seriesCounts, _seriesMins, _seriesMaxs, ...cleaned } = item;

    cleaned[yAxis] = rounded;
    cleaned.value = rounded;

    // Fill in every series key for multi-series charts
    if (groupBy && groupBy !== 'none') {
      allDetectedSeries.forEach((seriesName) => {
        let sVal = 0;
        if (isCertificateMetric) {
          sVal = _seriesCerts[seriesName]?.size || 0;
        } else {
          switch (aggregation.toLowerCase()) {
            case 'sum':
              sVal = _seriesSums[seriesName] || 0;
              break;
            case 'avg':
              const cnt = _seriesCounts[seriesName] || 0;
              sVal = cnt > 0 ? (_seriesSums[seriesName] || 0) / cnt : 0;
              break;
            case 'count':
              sVal = _seriesCerts[seriesName]?.size || _seriesCounts[seriesName] || 0;
              break;
            case 'min':
              sVal = _seriesMins[seriesName] === Infinity ? 0 : (_seriesMins[seriesName] || 0);
              break;
            case 'max':
              sVal = _seriesMaxs[seriesName] === -Infinity ? 0 : (_seriesMaxs[seriesName] || 0);
              break;
            default:
              sVal = _seriesSums[seriesName] || 0;
          }
        }
        cleaned[seriesName] = Math.round(sVal * 100) / 100;
      });
    }

    return cleaned;
  });

  // Chronological sorting for Month / Time axes vs Value sorting
  if (isMonthAxis) {
    result.sort((a, b) => {
      const aVal = String(a.name || '').trim();
      const bVal = String(b.name || '').trim();
      return getMonthSortOrder(aVal) - getMonthSortOrder(bVal);
    });
  } else {
    // Sort by value descending
    result.sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
  }

  // Apply user-defined Top-N limit dynamically (skip for chronological month axis)
  if (!isMonthAxis && topN !== 'all' && !isNaN(parseInt(topN, 10))) {
    const limit = parseInt(topN, 10);
    if (result.length > limit) {
      const topItems = result.slice(0, limit);
      const restItems = result.slice(limit);

      if (groupOthers) {
        const restSum = restItems.reduce((acc, curr) => acc + Number(curr.value || 0), 0);
        if (restSum > 0) {
          const roundedRest = Math.round(restSum * 100) / 100;
          topItems.push({
            [xAxis]: `Lainnya (${restItems.length})`,
            name: `Lainnya (${restItems.length})`,
            [yAxis]: roundedRest,
            value: roundedRest,
          });
        }
      }

      result = topItems;
    }
  }

  return result;
}

function getValueByFlexibleKey(row, targetKey) {
  if (!row || !targetKey) return undefined;
  if (row[targetKey] !== undefined) return row[targetKey];

  const targetLower = targetKey.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const key of Object.keys(row)) {
    const keyLower = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (keyLower === targetLower) return row[key];
  }

  for (const key of Object.keys(row)) {
    const keyLower = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (keyLower.includes(targetLower) || targetLower.includes(keyLower)) return row[key];
  }

  if (targetLower.includes('bulan')) {
    return row.Bulan || row.BULAN || row.Tanggal || row.TANGGAL || row.Month || 'Jan';
  }
  if (targetLower.includes('komoditas')) {
    return row.Komoditas || row.KOMODITAS || row.Jenis_Komoditas || row.Nama_Komoditas || 'Ikan';
  }
  if (targetLower.includes('volume') || targetLower.includes('vol') || targetLower.includes('netto') || targetLower.includes('berat') || targetLower.includes('kuantitas')) {
    return row['Netto P8'] ?? row['Netto P1'] ?? row.Netto ?? row['Vol P1'] ?? row.Volume ?? row['Vol Lain'] ?? row.Jumlah ?? row.Kuantitas ?? 0;
  }
  if (targetLower.includes('nilai') || targetLower.includes('harga') || targetLower.includes('rupiah')) {
    return row.Nilai_Rupiah ?? row['Harga Barang (Rp)'] ?? row.Harga ?? 0;
  }
  if (targetLower.includes('frekuensi') || targetLower.includes('sertifikat') || targetLower.includes('dokumen')) {
    return 1;
  }
  if (targetLower.includes('lalu') || targetLower.includes('traffic')) {
    return row.Arah_Lalu_Lintas || row.TRAFFIC || row.Arah || 'Domestik Masuk';
  }
  if (targetLower.includes('satpel') || targetLower.includes('upt') || targetLower.includes('pelabuhan')) {
    return row.Satpel || row.UPT || row['Pelabuhan Asal'] || row['Pelabuhan Tujuan'] || row['Tempat Periksa'] || '';
  }

  return undefined;
}

function parseNumericValue(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(/[Rp\s]/g, '').replace(/,/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Resolves unique certificate ID uniformly across all components.
 * Acuan nomor sertifikat: Nomor Dokumen (hasil akhir pembebasan) > No. K.1.1 (verifikasi) > No. Aju (permohonan) > row fallback.
 * Always trims string to avoid whitespace discrepancies.
 *
 * @param {object} row - The row object (raw row or row_data)
 * @param {string|number} [fallbackIndex=0] - Fallback index or ID if no certificate number found
 * @returns {string} Cleaned unique certificate identifier
 */
export function getCertificateId(row, fallbackIndex = 0) {
  if (!row) return `row_${fallbackIndex}`;
  return String(
    row['Nomor Dokumen'] ||
    row['No. Dokumen'] ||
    row['Nomor_Dokumen'] ||
    row['No Dokumen'] ||
    row['No. K.1.1'] ||
    row['No K.1.1'] ||
    row['No_K11'] ||
    row['No.K.1.1'] ||
    row['K.1.1'] ||
    row['No. Aju'] ||
    row['No Aju'] ||
    row['No_Aju'] ||
    `row_${row._id || row.id || fallbackIndex}`
  ).trim();
}

/**
 * Ekstraksi Nomor Dokumen resmi sertifikat pembebasan (hasil akhir sertifikasi)
 * @param {object} row - The row object
 * @returns {string|null} Cleaned document number or null if missing
 */
export function getDocumentId(row) {
  if (!row) return null;
  const val =
    row['Nomor Dokumen'] ??
    row['No. Dokumen'] ??
    row['Nomor_Dokumen'] ??
    row['No Dokumen'] ??
    row['No Dok'] ??
    row.Nomor_Dokumen ??
    row.NomorDokumen ??
    row['Nomor Sertifikat'] ??
    row['No. Sertifikat'] ??
    row['No Sertifikat'] ??
    null;
  if (!val) return null;
  const str = String(val).trim();
  if (!str || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return null;
  return str;
}

/**
 * Ekstraksi Nomor Formulir Verifikasi Pengajuan K.1.1
 * @param {object} row - The row object
 * @returns {string|null} Cleaned No. K.1.1 or null if missing
 */
export function getK11Id(row) {
  if (!row) return null;
  const val =
    row['No. K.1.1'] ??
    row['No K.1.1'] ??
    row['No.K.1.1'] ??
    row['No_K11'] ??
    row['K.1.1'] ??
    row['No K11'] ??
    row.No_K11 ??
    row.no_k11 ??
    null;
  if (!val) return null;
  const str = String(val).trim();
  if (!str || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return null;
  return str;
}

/**
 * Ekstraksi Nomor Permohonan Pengajuan (No. Aju)
 * @param {object} row - The row object
 * @returns {string|null} Cleaned No. Aju or null if missing
 */
export function getAjuId(row) {
  if (!row) return null;
  const val =
    row['No. Aju'] ??
    row['No Aju'] ??
    row['No_Aju'] ??
    row['Nomor Aju'] ??
    row['Nomor_Aju'] ??
    row['No. Pengajuan'] ??
    row['No Pengajuan'] ??
    row['Nomor Pengajuan'] ??
    row['No_Pengajuan'] ??
    row.No_Aju ??
    row.no_aju ??
    null;
  if (!val) return null;
  const str = String(val).trim();
  if (!str || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return null;
  return str;
}

/**
 * Ekstraksi nilai header Klasifikasi komoditas
 * @param {object} row - The row object
 * @returns {string} Cleaned classification name
 */
export function getKlasifikasi(row) {
  if (!row) return '';
  return String(
    row['Klasifikasi'] ??
    row['Klasifikasi Komoditas'] ??
    row['Klasifikasi_Komoditas'] ??
    row.Klasifikasi ??
    row.klasifikasi ??
    ''
  ).trim();
}

/**
 * Cek apakah baris komoditas memiliki header Klasifikasi bernilai "Ikan Hidup"
 * @param {object} row - The row object
 * @returns {boolean} True if classification is Ikan Hidup
 */
export function isIkanHidup(row) {
  if (!row) return false;
  const raw = getKlasifikasi(row);
  const lower = raw.toLowerCase();
  if (lower.includes('ikan hidup')) return true;
  if (lower === 'hidup' || lower.startsWith('hidup') || lower.includes('ikan hias')) {
    const commType = String(row._commodity_type || row.Komoditas || row.Jenis_Komoditas || '').toLowerCase();
    if (!commType.includes('hewan') && !commType.includes('tumbuhan')) {
      return true;
    }
  }
  return false;
}



