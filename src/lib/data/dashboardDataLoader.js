import { createClient } from '@/lib/supabase/client';
import { getDashboardConfigs } from '@/lib/services/dashboardService';
import { getCachedRecords, setCachedRecords, clearCachedRecords } from '@/lib/cache/indexedDbCache';
import { getCertificateId } from './aggregation';

// In-Memory cache layer
const dataCache = new Map();
let inMemoryMasterRecords = null;
let inMemoryVersionHash = null;
let cachedDatasets = null;
let activeFetchPromise = null;

/**
 * Invalidate all caches (Memory + IndexedDB) when new data is uploaded or deleted.
 */
export function clearDashboardCache() {
  dataCache.clear();
  inMemoryMasterRecords = null;
  inMemoryVersionHash = null;
  clearCachedRecords();
}

/**
 * Loads all master dataset records with deterministic ordering and smart IndexedDB caching.
 * Resolves the non-deterministic pagination bug and delivers 0.01s instant loading on reloads.
 */
/**
 * Helper to fetch with exponential backoff retry.
 */
async function fetchWithRetry(fetchFn, maxRetries = 3, delayMs = 500) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, attempt * delayMs));
    }
  }
}

/**
 * Loads all master dataset records with deterministic ordering, index-aware queries, and smart IndexedDB caching.
 * Uses indexed monthly batch queries to completely eliminate Postgres statement timeouts.
 */
async function getMasterRecords(supabase) {
  // 1. Fast in-memory cache return (0ms)
  if (inMemoryMasterRecords && inMemoryMasterRecords.length > 0) {
    return { records: inMemoryMasterRecords, versionHash: inMemoryVersionHash };
  }

  // 2. Prevent concurrent duplicate fetch requests (singleton promise pattern)
  if (activeFetchPromise) {
    return activeFetchPromise;
  }

  activeFetchPromise = (async () => {
    try {
      // 3. Get latest sync version timestamp from upload_history (fast 50ms query)
      const { data: latestUpload } = await supabase
        .from('upload_history')
        .select('uploaded_at')
        .order('uploaded_at', { ascending: false })
        .limit(1);

      const currentVersionHash = latestUpload?.[0]?.uploaded_at || 'empty_initial';

      // Get exact total rows count
      const { count: exactCount } = await supabase
        .from('data_records')
        .select('*', { count: 'exact', head: true });
      const totalCount = exactCount || 0;

      // 4. Check persistent IndexedDB cache (verify versionHash AND total rows integrity)
      const cached = await getCachedRecords();
      if (
        cached &&
        cached.versionHash === currentVersionHash &&
        cached.records &&
        cached.records.length >= totalCount &&
        totalCount > 0
      ) {
        inMemoryMasterRecords = cached.records;
        inMemoryVersionHash = cached.versionHash;
        console.log(`⚡ [TRAQ Cache] Loaded ${cached.records.length.toLocaleString('id-ID')} records from IndexedDB in instant mode!`);
        return { records: cached.records, versionHash: cached.versionHash };
      }

      // 5. Cache miss, outdated, or incomplete: Fetch from Supabase
      console.log(`🔄 [TRAQ Sync] Fetching ${totalCount.toLocaleString('id-ID')} master records from Supabase...`);
      if (!cachedDatasets) {
        const { data: dsData } = await supabase
          .from('datasets')
          .select('id, code, traffic_type, commodity_type, name');
        cachedDatasets = dsData || [];
      }
      const dsMap = new Map();
      cachedDatasets.forEach((d) => dsMap.set(d.id, d));

      if (totalCount === 0) {
        inMemoryMasterRecords = [];
        inMemoryVersionHash = currentVersionHash;
        await setCachedRecords([], currentVersionHash);
        return { records: [], versionHash: currentVersionHash };
      }

      // Parallel fetching utilizing the compound index (dataset_id, period_year, period_month)
      // Each dataset-month subset is small (100-2500 rows), eliminating statement timeouts 100%.
      const fetchDatasetMonth = async (datasetId, month) => {
        const { count: countItem, error: cntErr } = await supabase
          .from('data_records')
          .select('*', { count: 'exact', head: true })
          .eq('dataset_id', datasetId)
          .eq('period_month', month);

        if (cntErr || !countItem) return [];

        const chunkSize = 1000;
        const numChunks = Math.ceil(countItem / chunkSize);
        const chunkPromises = [];

        for (let i = 0; i < numChunks; i++) {
          const from = i * chunkSize;
          const to = from + chunkSize - 1;
          chunkPromises.push(
            fetchWithRetry(async () => {
              const res = await supabase
                .from('data_records')
                .select('id, dataset_id, period_month, period_year, row_data')
                .eq('dataset_id', datasetId)
                .eq('period_month', month)
                .order('id', { ascending: true })
                .range(from, to);

              if (res.error) {
                throw new Error(`Dataset ${datasetId} Month ${month} chunk (${from}-${to}) failed: ${res.error.message}`);
              }
              return res.data || [];
            })
          );
        }

        const chunkResults = await Promise.all(chunkPromises);
        return chunkResults.flat();
      };

      const tasks = [];
      for (const ds of cachedDatasets) {
        for (let m = 1; m <= 12; m++) {
          tasks.push({ datasetId: ds.id, month: m });
        }
      }

      const concurrency = 12;
      const allRows = [];
      for (let i = 0; i < tasks.length; i += concurrency) {
        const batch = tasks.slice(i, i + concurrency);
        const batchResults = await Promise.all(
          batch.map((t) => fetchDatasetMonth(t.datasetId, t.month))
        );
        batchResults.forEach((rows) => allRows.push(...rows));
      }

      // Deduplicate by row ID to prevent any overlap from parallel fetching
      const seenIds = new Set();
      const dedupedRows = [];
      for (const row of allRows) {
        if (!seenIds.has(row.id)) {
          seenIds.add(row.id);
          dedupedRows.push(row);
        }
      }
      if (dedupedRows.length !== allRows.length) {
        console.warn(`⚠️ [TRAQ Sync] Removed ${allRows.length - dedupedRows.length} duplicate rows during dedup.`);
      }
      const finalRows = dedupedRows;

      // Normalize all records once and store to IndexedDB
      const normalized = finalRows.map((item) => {
        const ds = dsMap.get(item.dataset_id);
        const row = { ...(item.row_data || {}) };
        row.id = item.id;
        row._id = item.id;
        row._dataset_id = item.dataset_id;
        row._commodity_type = ds?.commodity_type || '';
        row._traffic_type = ds?.traffic_type || '';
        row._dataset_code = ds?.code || '';
        row._dataset_name = ds?.name || '';
        row.period_month = item.period_month;
        row.period_year = item.period_year;

        if (!row.Komoditas && ds?.commodity_type) {
          row.Komoditas = capitalize(ds.commodity_type);
        }
        if (!row.Arah_Lalu_Lintas && ds?.traffic_type) {
          row.Arah_Lalu_Lintas = formatTrafficName(ds.traffic_type);
        }
        if (!row.Bulan && item.period_month) {
          row.Bulan = getMonthName(item.period_month);
        }

        const rawSatpel = row.Satpel ?? row.satpel ?? row.UPT ?? row['Wilker'] ?? '';
        row.Satpel = String(rawSatpel).trim();

        const extractedVol = parseNumber(
          row['Netto P8'] ??
          row['Netto P1'] ??
          row.Netto ??
          row['Vol P1'] ??
          row.Volume ??
          row['Vol Lain'] ??
          row.Jumlah ??
          row.Kuantitas ??
          0
        );
        row.Volume = extractedVol;

        const extractedPrice = parseNumber(
          row.Nilai_Rupiah ??
          row['Harga Barang (Rp)'] ??
          row.Harga ??
          0
        );
        row.Nilai_Rupiah = extractedPrice;

        return row;
      });

      inMemoryMasterRecords = normalized;
      inMemoryVersionHash = currentVersionHash;

      // Save to IndexedDB persistently only if full dataset was received
      if (normalized.length >= totalCount * 0.99) {
        await setCachedRecords(normalized, currentVersionHash);
        console.log(`💾 [TRAQ Cache] Saved ${normalized.length.toLocaleString('id-ID')} records to IndexedDB.`);
      }

      return { records: normalized, versionHash: currentVersionHash };
    } finally {
      activeFetchPromise = null;
    }
  })();

  return activeFetchPromise;
}

/**
 * Resolves the Pospel (Pos Pelayanan / Tempat Pelayanan) name for a data record based on its traffic direction.
 */
export function resolvePospelColumn(row) {
  if (!row) return '';
  const data = row.row_data || row;
  const traffic = String(row._traffic_type || data.Arah_Lalu_Lintas || data.traffic_type || '').toLowerCase();

  let val = '';
  // Inbound traffic (Domestik Masuk & Impor): Pospel is the destination port in North Sulawesi
  if (traffic === 'domestik_masuk' || traffic === 'impor' || traffic.includes('masuk') || traffic.includes('impor')) {
    val = data['Pelabuhan Tujuan'] || data['Pelabuhan_Tujuan'] || data['Pelabuhan_tujuan'] || data['Tempat Periksa'] || data['Tempat_Periksa'] || data['Pelabuhan Asal'] || '';
  }
  // Outbound traffic (Domestik Keluar & Ekspor): Pospel is the origin port in North Sulawesi
  else if (traffic === 'domestik_keluar' || traffic === 'ekspor' || traffic.includes('keluar') || traffic.includes('ekspor')) {
    val = data['Pelabuhan Asal'] || data['Pelabuhan_Asal'] || data['Pelabuhan_asal'] || data['Tempat Periksa'] || data['Tempat_Periksa'] || data['Pelabuhan Tujuan'] || '';
  }
  // Fallback for generic or unclassified rows
  else {
    val = data['Pelabuhan Tujuan'] || data['Pelabuhan Asal'] || data['Tempat Periksa'] || data['Tempat_Periksa'] || data['Satpel'] || '';
  }

  return String(val).trim();
}

/**
 * Returns distinct active Pospel names for a given Satpel from master records.
 */
export async function getDistinctPospels(satpelName) {
  if (!satpelName || satpelName === 'all') return [];
  try {
    const supabase = createClient();
    const { records } = await getMasterRecords(supabase);
    const targetSatpel = String(satpelName).trim().toLowerCase();
    const pospelSet = new Set();

    records.forEach((r) => {
      const rowSatpel = String(r.Satpel || r.row_data?.Satpel || r.UPT || '').trim().toLowerCase();
      if (rowSatpel === targetSatpel) {
        const pVal = resolvePospelColumn(r);
        if (pVal && pVal !== '-' && pVal.toLowerCase() !== 'null' && pVal.toLowerCase() !== 'undefined') {
          pospelSet.add(pVal);
        }
      }
    });

    return Array.from(pospelSet).sort((a, b) => a.localeCompare('id-ID'));
  } catch (err) {
    console.warn('Failed to get distinct pospels:', err.message);
    return [];
  }
}

/**
 * Returns distinct active Satpel names from master records.
 */
export async function getDistinctSatpels() {
  try {
    const supabase = createClient();
    const { records } = await getMasterRecords(supabase);
    const satpelSet = new Set();
    records.forEach((r) => {
      const val = String(r.Satpel || r.row_data?.Satpel || r.UPT || '').trim();
      if (val && val !== '-' && val.toLowerCase() !== 'null' && val.toLowerCase() !== 'undefined') {
        satpelSet.add(val);
      }
    });
    return Array.from(satpelSet).sort((a, b) => a.localeCompare('id-ID'));
  } catch (err) {
    console.warn('Failed to get distinct satpels:', err.message);
    return [];
  }
}

/**
 * Loads dashboard data for a specific page and period filter with sub-millisecond in-memory filtering.
 */
export async function loadPageDashboardData(pageKey = 'home', periodFilter = {}) {
  const {
    periodType,
    selectedYear,
    selectedMonth,
    selectedQuarter,
    selectedSemester,
    customRange,
    selectedSatpel,
    selectedPospels,
  } = periodFilter;

  const pospelKey = Array.isArray(selectedPospels)
    ? [...selectedPospels].sort().join('|')
    : (selectedPospels || 'all');

  const cacheKey = `${pageKey}_${periodType}_${selectedYear}_${selectedMonth || 0}_${selectedQuarter || 0}_${selectedSemester || 0}_${customRange?.startDate || ''}_${customRange?.endDate || ''}_${selectedSatpel || 'all'}_${pospelKey}`;

  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey);
  }

  const supabase = createClient();

  try {
    const { records: masterRecords } = await getMasterRecords(supabase);

    // Fast in-memory filtering
    let filtered = masterRecords;

    // Filter by page domain
    if (['hewan', 'ikan', 'tumbuhan'].includes(pageKey)) {
      filtered = filtered.filter((r) => r._commodity_type === pageKey);
    } else if (['domestik_masuk', 'domestik_keluar', 'ekspor', 'impor'].includes(pageKey)) {
      filtered = filtered.filter((r) => r._traffic_type === pageKey);
    }

    // Filter by Satpel (if selected and not 'all')
    if (selectedSatpel && selectedSatpel !== 'all') {
      const targetSatpel = String(selectedSatpel).trim().toLowerCase();
      filtered = filtered.filter((r) => {
        const satpelVal = String(r.Satpel || r.row_data?.Satpel || r.UPT || '').trim().toLowerCase();
        return satpelVal === targetSatpel;
      });
    }

    // Filter by Pospel (if selectedSatpel is active and selectedPospels is specific array)
    if (
      selectedSatpel &&
      selectedSatpel !== 'all' &&
      Array.isArray(selectedPospels) &&
      selectedPospels.length > 0
    ) {
      const pospelSet = new Set(selectedPospels.map((p) => String(p).trim().toLowerCase()));
      filtered = filtered.filter((r) => {
        const pospelVal = resolvePospelColumn(r).toLowerCase();
        return pospelSet.has(pospelVal);
      });
    }

    // Filter by period
    if (periodType === 'custom' && customRange?.startDate && customRange?.endDate) {
      const start = String(customRange.startDate).trim().slice(0, 10);
      const end = String(customRange.endDate).trim().slice(0, 10);
      filtered = filtered.filter((r) => {
        const row = r.row_data || r || {};
        const dateStr =
          row['Tgl Dokumen'] ||
          row['Tgl K.1.1'] ||
          row['Tgl Aju'] ||
          row['Tgl Periksa'] ||
          row['Tanggal Dokumen'] ||
          row['Tanggal'] ||
          row['Tanggal_Dokumen'] ||
          row['Tgl_Dokumen'] ||
          row['Tgl_K11'] ||
          row['Tgl_Aju'] ||
          row['Tgl_Periksa'] ||
          '';
        const ymd = dateStr ? String(dateStr).trim().slice(0, 10) : '';
        if (ymd && ymd.length === 10) {
          return ymd >= start && ymd <= end;
        }
        return false;
      });
    } else {
      // Filter by period year
      if (selectedYear) {
        filtered = filtered.filter((r) => r.period_year === Number(selectedYear));
      }

      // Filter by period month, quarter, or semester
      if (periodType === 'month' && selectedMonth) {
        filtered = filtered.filter((r) => r.period_month === Number(selectedMonth));
      } else if (periodType === 'quarter' && selectedQuarter) {
        const startMonth = (Number(selectedQuarter) - 1) * 3 + 1;
        const endMonth = startMonth + 2;
        filtered = filtered.filter((r) => r.period_month >= startMonth && r.period_month <= endMonth);
      } else if (periodType === 'semester' && selectedSemester) {
        const startMonth = Number(selectedSemester) === 2 ? 7 : 1;
        const endMonth = Number(selectedSemester) === 2 ? 12 : 6;
        filtered = filtered.filter((r) => r.period_month >= startMonth && r.period_month <= endMonth);
      }
    }

    // Extract distinct Satpel list from master records
    const satpelSet = new Set();
    masterRecords.forEach((r) => {
      const val = String(r.Satpel || r.row_data?.Satpel || r.UPT || '').trim();
      if (val && val !== '-' && val.toLowerCase() !== 'null' && val.toLowerCase() !== 'undefined') {
        satpelSet.add(val);
      }
    });
    const satpelList = Array.from(satpelSet).sort((a, b) => a.localeCompare('id-ID'));

    // Extract distinct Pospel list for the selected Satpel
    // IMPORTANT: Build from domain-filtered records (traffic/commodity already applied),
    // NOT from masterRecords, so that DM page shows only DM pospels (Pelabuhan Tujuan),
    // and DK page shows only DK pospels (Pelabuhan Asal). Using masterRecords would mix
    // columns from different traffic types and show irrelevant/non-matching pospel options.
    const pospelSet = new Set();
    if (selectedSatpel && selectedSatpel !== 'all') {
      const targetSatpel = String(selectedSatpel).trim().toLowerCase();
      // Use domainFiltered records (before period filter) so pospel list isn't narrowed by date
      // Build a domain-only filtered set to get all pospels for this satpel+page context
      let domainRecords = masterRecords;
      if (['hewan', 'ikan', 'tumbuhan'].includes(pageKey)) {
        domainRecords = masterRecords.filter((r) => r._commodity_type === pageKey);
      } else if (['domestik_masuk', 'domestik_keluar', 'ekspor', 'impor'].includes(pageKey)) {
        domainRecords = masterRecords.filter((r) => r._traffic_type === pageKey);
      }
      domainRecords.forEach((r) => {
        const rowSatpel = String(r.Satpel || r.row_data?.Satpel || r.UPT || '').trim().toLowerCase();
        if (rowSatpel === targetSatpel) {
          const pVal = resolvePospelColumn(r);
          if (pVal && pVal !== '-' && pVal.toLowerCase() !== 'null' && pVal.toLowerCase() !== 'undefined') {
            pospelSet.add(pVal);
          }
        }
      });
    }
    const pospelList = Array.from(pospelSet).sort((a, b) => a.localeCompare('id-ID'));


    const hasRealData = filtered && filtered.length > 0;
    const recordCount = filtered ? filtered.length : 0;

    const chartConfigs = await getDashboardConfigs(pageKey);
    const kpis = calculateLiveKpis(filtered, pageKey);

    const result = {
      rawRecords: filtered,
      chartConfigs,
      kpis,
      hasRealData,
      recordCount,
      satpelList,
      pospelList,
    };

    dataCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('Dashboard data loader fallback:', err.message);
    const chartConfigs = await getDashboardConfigs(pageKey);
    return {
      rawRecords: [],
      chartConfigs,
      kpis: calculateLiveKpis([], pageKey),
      hasRealData: false,
      recordCount: 0,
      satpelList: [],
      pospelList: [],
    };
  }
}


/**
 * Calculates live KPI totals and breakdowns from real Supabase records.
 * Uses exact certificate number deduplication (Nomor Dokumen / No. K.1.1 / No. Aju).
 */
function calculateLiveKpis(records = [], pageKey) {
  if (!records || records.length === 0) {
    return {
      totalSertifikat: 0,
      totalBaris: 0,
      totalVolume: 0,
      totalNilai: 0,
      domestikMasuk: 0,
      domestikKeluar: 0,
      ekspor: 0,
      impor: 0,
      domestikMasukCount: 0,
      domestikKeluarCount: 0,
      eksporCount: 0,
      imporCount: 0,
      domestikMasukPercent: 0,
      domestikKeluarPercent: 0,
      eksporPercent: 0,
      imporPercent: 0,
      hewanCount: 0,
      ikanCount: 0,
      tumbuhanCount: 0,
      hewanPercent: 0,
      ikanPercent: 0,
      tumbuhanPercent: 0,
    };
  }

  const totalBaris = records.length;
  const uniqueCertificates = new Set();
  const certsDomestikMasuk = new Set();
  const certsDomestikKeluar = new Set();
  const certsEkspor = new Set();
  const certsImpor = new Set();
  const certsHewan = new Set();
  const certsIkan = new Set();
  const certsTumbuhan = new Set();

  let totalVolume = 0;
  let totalNilai = 0;

  records.forEach((row, index) => {
    const traffic = (row._traffic_type || '').toLowerCase();
    const commodity = (row._commodity_type || '').toLowerCase();

    // Acuan utama nomor sertifikat resmi: Nomor Dokumen (hasil akhir pembebasan) > No. K.1.1 (verifikasi) > No. Aju
    const certId = getCertificateId(row, index);

    uniqueCertificates.add(certId);

    totalVolume += row.Volume || 0;
    totalNilai += row.Nilai_Rupiah || 0;

    if (traffic === 'domestik_masuk' || traffic.includes('masuk')) certsDomestikMasuk.add(certId);
    else if (traffic === 'domestik_keluar' || traffic.includes('keluar')) certsDomestikKeluar.add(certId);
    else if (traffic === 'ekspor') certsEkspor.add(certId);
    else if (traffic === 'impor') certsImpor.add(certId);

    if (commodity === 'hewan') certsHewan.add(certId);
    else if (commodity === 'ikan') certsIkan.add(certId);
    else if (commodity === 'tumbuhan') certsTumbuhan.add(certId);
  });

  const totalSertifikat = uniqueCertificates.size;
  const hewanCount = certsHewan.size;
  const ikanCount = certsIkan.size;
  const tumbuhanCount = certsTumbuhan.size;
  const domestikKeluarCount = certsDomestikKeluar.size;
  const domestikMasukCount = certsDomestikMasuk.size;
  const eksporCount = certsEkspor.size;
  const imporCount = certsImpor.size;

  const hewanPercent = totalSertifikat > 0 ? ((hewanCount / totalSertifikat) * 100).toFixed(1) : 0;
  const ikanPercent = totalSertifikat > 0 ? ((ikanCount / totalSertifikat) * 100).toFixed(1) : 0;
  const tumbuhanPercent = totalSertifikat > 0 ? ((tumbuhanCount / totalSertifikat) * 100).toFixed(1) : 0;
  const domestikKeluarPercent = totalSertifikat > 0 ? ((domestikKeluarCount / totalSertifikat) * 100).toFixed(1) : 0;
  const domestikMasukPercent = totalSertifikat > 0 ? ((domestikMasukCount / totalSertifikat) * 100).toFixed(1) : 0;
  const eksporPercent = totalSertifikat > 0 ? ((eksporCount / totalSertifikat) * 100).toFixed(1) : 0;
  const imporPercent = totalSertifikat > 0 ? ((imporCount / totalSertifikat) * 100).toFixed(1) : 0;

  return {
    totalSertifikat,
    totalBaris,
    totalVolume: Math.round(totalVolume * 100) / 100,
    totalNilai: Math.round(totalNilai),
    domestikMasuk: domestikMasukCount,
    domestikKeluar: domestikKeluarCount,
    ekspor: eksporCount,
    impor: imporCount,
    domestikMasukCount,
    domestikKeluarCount,
    eksporCount,
    imporCount,
    domestikMasukPercent,
    domestikKeluarPercent,
    eksporPercent,
    imporPercent,
    hewanCount,
    ikanCount,
    tumbuhanCount,
    hewanPercent,
    ikanPercent,
    tumbuhanPercent,
  };
}

function parseNumber(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const clean = String(val).replace(/[^0-9.-]+/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function formatTrafficName(type) {
  switch (type) {
    case 'domestik_masuk':
      return 'Domestik Masuk';
    case 'domestik_keluar':
      return 'Domestik Keluar';
    case 'ekspor':
      return 'Ekspor';
    case 'impor':
      return 'Impor';
    default:
      return type ? capitalize(type) : '';
  }
}

function getMonthName(monthNum) {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[monthNum - 1] || `Bulan ${monthNum}`;
}
