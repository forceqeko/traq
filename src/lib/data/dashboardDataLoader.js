import { createClient } from '@/lib/supabase/client';
import { getDashboardConfigs } from '@/lib/services/dashboardService';
import { getCachedRecords, setCachedRecords, clearCachedRecords } from '@/lib/cache/indexedDbCache';
import { getCertificateId } from './aggregation';
import { getMonthName } from './monthUtils';
import { getIkiList } from '@/lib/services/ikiService';

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
  // Preserving IndexedDB allows getMasterRecords to perform lightning-fast incremental syncs
  // when new batches are added, instead of re-downloading 90k+ rows.
}

if (typeof window !== 'undefined') {
  window.addEventListener('traq:iki-changed', () => {
    dataCache.clear();
  });
}

export function forcePurgeDashboardCache() {
  dataCache.clear();
  inMemoryMasterRecords = null;
  inMemoryVersionHash = null;
  clearCachedRecords();
}

let syncProgressListener = null;
export function setSyncProgressListener(fn) {
  syncProgressListener = fn;
}
function notifySyncProgress(info) {
  if (typeof syncProgressListener === 'function') {
    try { syncProgressListener(info); } catch (e) {}
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('traq:sync-progress', { detail: info }));
  }
}

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
 * Normalizes a single raw record from data_records into the standard TRAQ format.
 */
function normalizeRawRecord(item, dsMap) {
  const ds = dsMap.get(item.dataset_id);
  const row = { ...(item.row_data || {}) };
  row.id = item.id;
  row._id = item.id;
  row._upload_id = item.upload_id;
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

  row.Satpel = resolveSatpelColumn(row);

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
}

/**
 * Efficiently fetches chunks for specified uploads using a controlled concurrency worker pool.
 */
async function fetchUploadsChunks(supabase, targetUploads, dsMap) {
  if (!targetUploads || targetUploads.length === 0) return [];

  const tasks = [];
  for (const up of targetUploads) {
    const rowCount = up.row_count || 0;
    if (rowCount === 0) continue;
    const numChunks = Math.ceil(rowCount / 1000);
    for (let c = 0; c < numChunks; c++) {
      tasks.push({
        uploadId: up.id,
        from: c * 1000,
        to: (c + 1) * 1000 - 1,
      });
    }
  }

  if (tasks.length === 0) return [];

  const concurrency = 6;
  let taskIndex = 0;
  const fetchedRawRows = [];
  let completed = 0;

  const worker = async () => {
    while (taskIndex < tasks.length) {
      const task = tasks[taskIndex++];
      const rows = await fetchWithRetry(async () => {
        const res = await supabase
          .from('data_records')
          .select('id, dataset_id, upload_id, period_month, period_year, row_data')
          .eq('upload_id', task.uploadId)
          .range(task.from, task.to);

        if (res.error) {
          throw new Error(`Upload ${task.uploadId} chunk (${task.from}-${task.to}) failed: ${res.error.message}`);
        }
        return res.data || [];
      });

      if (rows && rows.length > 0) {
        fetchedRawRows.push(...rows);
      }
      completed++;
      notifySyncProgress({
        completed,
        total: tasks.length,
        percent: Math.round((completed / tasks.length) * 100),
      });
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker())
  );

  // Deduplicate by item.id
  const seenIds = new Set();
  const deduped = [];
  for (const item of fetchedRawRows) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      deduped.push(item);
    }
  }

  return deduped.map((item) => normalizeRawRecord(item, dsMap));
}

/**
 * Loads all master dataset records with deterministic ordering, smart incremental sync, and IndexedDB caching.
 */
async function getMasterRecords(supabase) {
  // 1. Instant in-memory cache return (0ms)
  if (inMemoryMasterRecords && inMemoryMasterRecords.length > 0) {
    return { records: inMemoryMasterRecords, versionHash: inMemoryVersionHash };
  }

  // 2. Prevent duplicate in-flight fetch requests (singleton pattern)
  if (activeFetchPromise) {
    return activeFetchPromise;
  }

  activeFetchPromise = (async () => {
    try {
      // 3. Load dataset definitions
      if (!cachedDatasets) {
        const { data: dsData } = await supabase
          .from('datasets')
          .select('id, code, traffic_type, commodity_type, name');
        cachedDatasets = dsData || [];
      }
      const dsMap = new Map();
      cachedDatasets.forEach((d) => dsMap.set(d.id, d));

      // 4. Load all active upload history metadata (fast ~50ms query)
      const { data: uploads, error: upErr } = await supabase
        .from('upload_history')
        .select('id, dataset_id, period_month, period_year, row_count, uploaded_at')
        .order('uploaded_at', { ascending: false });

      if (upErr) throw upErr;
      const activeUploads = uploads || [];
      const totalExpectedRows = activeUploads.reduce((s, u) => s + (u.row_count || 0), 0);

      if (totalExpectedRows === 0) {
        inMemoryMasterRecords = [];
        inMemoryVersionHash = 'empty';
        return { records: [], versionHash: 'empty' };
      }

      // Deterministic version hash & uploadMeta mapping
      const sortedUploads = [...activeUploads].sort((a, b) => a.id.localeCompare(b.id));
      const currentVersionHash = sortedUploads.map((u) => `${u.id}:${u.uploaded_at}:${u.row_count}`).join('|') || 'empty';
      const activeUploadMeta = {};
      activeUploads.forEach((u) => {
        activeUploadMeta[u.id] = u.uploaded_at;
      });

      // 5. Check persistent IndexedDB cache
      const cached = await getCachedRecords();

      // Case 5A: Exact cache hit (Instant return)
      if (
        cached &&
        cached.versionHash === currentVersionHash &&
        Array.isArray(cached.records) &&
        cached.records.length > 0
      ) {
        inMemoryMasterRecords = cached.records;
        inMemoryVersionHash = cached.versionHash;
        console.log(`⚡ [TRAQ Cache] Loaded ${cached.records.length.toLocaleString('id-ID')} records from IndexedDB in instant mode!`);
        return { records: cached.records, versionHash: cached.versionHash };
      }

      // Case 5B: Incremental sync (New or updated batches exist)
      if (
        cached &&
        Array.isArray(cached.records) &&
        cached.records.length > 0 &&
        cached.uploadMeta &&
        typeof cached.uploadMeta === 'object'
      ) {
        const currentUploadIds = new Set(activeUploads.map((u) => u.id));
        const missingOrUpdatedUploads = activeUploads.filter(
          (u) => cached.uploadMeta[u.id] !== u.uploaded_at
        );

        // Valid cached records from active, unmodified uploads
        const validRetained = cached.records.filter((r) => {
          const upId = r._upload_id;
          return upId && currentUploadIds.has(upId) && cached.uploadMeta[upId] === activeUploadMeta[upId];
        });

        // Only do incremental if we actually retain a significant portion of cached data
        if (validRetained.length > 0 && missingOrUpdatedUploads.length < activeUploads.length) {
          console.log(`🔄 [TRAQ Incremental Sync] Fetching ${missingOrUpdatedUploads.length} new/updated batches (${validRetained.length.toLocaleString('id-ID')} retained from cache)...`);
          const newNormalized = await fetchUploadsChunks(supabase, missingOrUpdatedUploads, dsMap);
          const merged = [...validRetained, ...newNormalized];

          inMemoryMasterRecords = merged;
          inMemoryVersionHash = currentVersionHash;
          await setCachedRecords(merged, currentVersionHash, activeUploadMeta);
          console.log(`💾 [TRAQ Incremental Sync] Merged and saved ${merged.length.toLocaleString('id-ID')} records to IndexedDB.`);
          return { records: merged, versionHash: currentVersionHash };
        }
      }

      // Case 5C: Cold start / Full sync
      console.log(`🔄 [TRAQ Full Sync] Fetching ${totalExpectedRows.toLocaleString('id-ID')} records across ${activeUploads.length} batches...`);
      const normalized = await fetchUploadsChunks(supabase, activeUploads, dsMap);

      inMemoryMasterRecords = normalized;
      inMemoryVersionHash = currentVersionHash;
      if (normalized.length >= totalExpectedRows * 0.98) {
        await setCachedRecords(normalized, currentVersionHash, activeUploadMeta);
        console.log(`💾 [TRAQ Cache] Saved ${normalized.length.toLocaleString('id-ID')} records to IndexedDB.`);
      }

      return { records: normalized, versionHash: currentVersionHash };
    } catch (err) {
      console.error('Master records sync error:', err);
      // Fallback: If network request failed, use cached records to prevent empty UI
      const cached = await getCachedRecords();
      if (cached && Array.isArray(cached.records) && cached.records.length > 0) {
        console.warn('Falling back to existing cached records.');
        inMemoryMasterRecords = cached.records;
        inMemoryVersionHash = cached.versionHash;
        return { records: cached.records, versionHash: cached.versionHash };
      }
      throw err;
    } finally {
      activeFetchPromise = null;
    }
  })();

  return activeFetchPromise;
}

/**
 * Resolves the Satpel (Satuan Pelayanan / Wilker / UPT) name for a data record across multiple column variations.
 */
export function resolveSatpelColumn(row) {
  if (!row) return '';
  const data = row.row_data || row;
  const val =
    data.Satpel ??
    data.satpel ??
    data['Satuan Pelayanan'] ??
    data['Satuan_Pelayanan'] ??
    data['Wilayah Kerja'] ??
    data['Wilayah_Kerja'] ??
    data.UPT ??
    data.upt ??
    data.Wilker ??
    data.wilker ??
    '';
  return String(val).trim();
}

/**
 * Pemetaan resmi kode unik No. K.1.1 ke Pos Pelayanan (Pospel)
 */
export const POSPEL_MAP = {
  '7101.0': 'Pospel Bandara Sam Ratulangi',
  '7101.1': 'Pospel Pelabuhan Manado',
  '7102.0': 'Pospel Pelabuhan Bitung',
  '7103.0': 'Pospel Pelabuhan Tahuna',
  '7103.1': 'Pospel Pelabuhan Melonguane',
  '7103.2': 'Pospel Pelabuhan Ulu Siau',
};

/**
 * Ekstraksi kode unik Pospel dari No. K.1.1
 */
export function getK11PospelCode(row) {
  if (!row) return null;
  const data = row.row_data || row;
  const k11 = String(
    data['No. K.1.1'] ??
    data['No K.1.1'] ??
    data['No.K.1.1'] ??
    data['No_K11'] ??
    data['K.1.1'] ??
    data['No K11'] ??
    row['No. K.1.1'] ??
    row['No K.1.1'] ??
    row['No.K.1.1'] ??
    ''
  ).trim();

  if (!k11) return null;

  for (const code of Object.keys(POSPEL_MAP)) {
    if (k11.includes(code)) {
      return code;
    }
  }
  return null;
}

/**
 * Resolves the Pospel (Pos Pelayanan / Tempat Pelayanan) name for a data record.
 * Prioritas Utama: Kode unik pada No. K.1.1 (7101.0, 7101.1, 7102.0, 7103.0, 7103.1, 7103.2).
 * Fallback: Berbasis arah lalu lintas dan kolom pelabuhan/tempat periksa.
 */
export function resolvePospelColumn(row) {
  if (!row) return '';

  // 1. Prioritas Utama: Ekstraksi dari kode unik No. K.1.1
  const code = getK11PospelCode(row);
  if (code && POSPEL_MAP[code]) {
    return POSPEL_MAP[code];
  }

  // 2. Fallback: Ekstraksi berbasis pelabuhan/tempat periksa
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
      const rowSatpel = resolveSatpelColumn(r).toLowerCase();
      if (rowSatpel === targetSatpel || rowSatpel.includes(targetSatpel) || targetSatpel.includes(rowSatpel)) {
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
      const val = resolveSatpelColumn(r);
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
        const satpelVal = resolveSatpelColumn(r).toLowerCase();
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
      const val = resolveSatpelColumn(r);
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
        const rowSatpel = resolveSatpelColumn(r).toLowerCase();
        if (rowSatpel === targetSatpel || rowSatpel.includes(targetSatpel) || targetSatpel.includes(rowSatpel)) {
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

/**
 * Normalizes company name for consistent grouping.
 */
function normalizeCompanyName(rawName) {
  if (!rawName) return '';
  return String(rawName)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^P\.?T\.?\s+/i, 'PT ')
    .replace(/^C\.?V\.?\s+/i, 'CV ')
    .replace(/^U\.?D\.?\s+/i, 'UD ')
    .toUpperCase();
}

/**
 * Loads and aggregates Profiling Pengguna Jasa data for Hewan, Ikan, or Tumbuhan.
 * Strictly filtered to Domestik Keluar and Ekspor only.
 */
export async function loadPenggunaJasaProfile(commodity = 'ikan', periodFilter = {}) {
  const targetCommodity = String(commodity).toLowerCase();
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

  const cacheKey = `profiling_${targetCommodity}_${periodType}_${selectedYear}_${selectedMonth || 0}_${selectedQuarter || 0}_${selectedSemester || 0}_${customRange?.startDate || ''}_${customRange?.endDate || ''}_${selectedSatpel || 'all'}_${pospelKey}`;

  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey);
  }

  const supabase = createClient();

  try {
    const { records: masterRecords } = await getMasterRecords(supabase);

    // 1. Filter by commodity
    let filtered = masterRecords.filter((r) => r._commodity_type === targetCommodity);

    // 2. Strict filter: ONLY Domestik Keluar and Ekspor
    filtered = filtered.filter(
      (r) => r._traffic_type === 'domestik_keluar' || r._traffic_type === 'ekspor'
    );

    // 3. Filter by Satpel (if selected and not 'all')
    if (selectedSatpel && selectedSatpel !== 'all') {
      const targetSatpel = String(selectedSatpel).trim().toLowerCase();
      filtered = filtered.filter((r) => {
        const satpelVal = resolveSatpelColumn(r).toLowerCase();
        return satpelVal === targetSatpel;
      });
    }

    // 4. Filter by Pospel (if selectedSatpel is active and selectedPospels is specific array)
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

    // 5. Filter by period
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
      if (selectedYear) {
        filtered = filtered.filter((r) => r.period_year === Number(selectedYear));
      }
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

    // 6. Aggregate by Sender / Company
    const companyMap = new Map();
    const allDokelCerts = new Set();
    const allEksporCerts = new Set();

    filtered.forEach((r, idx) => {
      const row = r.row_data || r || {};
      const rawSender = String(row['Pengirim'] || row['Nama Pengirim'] || row['Pemohon'] || '').trim();
      if (!rawSender) return;

      const normKey = normalizeCompanyName(rawSender);
      if (!normKey) return;

      if (!companyMap.has(normKey)) {
        companyMap.set(normKey, {
          id: normKey,
          namaPerusahaan: rawSender,
          nameCounts: { [rawSender]: 1 },
          dokelCerts: new Set(),
          eksporCerts: new Set(),
          komoditasSet: new Set(),
          hasHaccp: false,
        });
      }

      const item = companyMap.get(normKey);
      item.nameCounts[rawSender] = (item.nameCounts[rawSender] || 0) + 1;

      const certId = getCertificateId(r, idx);

      if (r._traffic_type === 'domestik_keluar') {
        item.dokelCerts.add(certId);
        allDokelCerts.add(certId);
      } else if (r._traffic_type === 'ekspor') {
        item.eksporCerts.add(certId);
        allEksporCerts.add(certId);
      }

      const kom = String(r.Komoditas || row['Komoditas'] || row['Nama Tercetak'] || '').trim();
      if (kom) {
        item.komoditasSet.add(kom);
      }

      const dokPendukung = String(row['Dokumen Pendukung'] || row['Dokumen_Pendukung'] || '').toUpperCase();
      if (dokPendukung.includes('HACCP')) {
        item.hasHaccp = true;
      }
    });

    const records = Array.from(companyMap.values())
      .map((c) => {
        let bestName = c.namaPerusahaan;
        let maxCount = 0;
        for (const [name, count] of Object.entries(c.nameCounts)) {
          if (count > maxCount) {
            maxCount = count;
            bestName = name;
          }
        }

        const frekuensiDokel = c.dokelCerts.size;
        const frekuensiEkspor = c.eksporCerts.size;
        const totalFrekuensi = frekuensiDokel + frekuensiEkspor;

        return {
          id: c.id,
          namaPerusahaan: bestName,
          komoditasList: Array.from(c.komoditasSet).sort((a, b) => a.localeCompare('id-ID')),
          frekuensiDokel,
          frekuensiEkspor,
          totalFrekuensi,
          hasHaccp: c.hasHaccp,
        };
      })
      .sort((a, b) => b.totalFrekuensi - a.totalFrekuensi);

    const summary = {
      totalPenggunaJasa: records.length,
      totalDokel: allDokelCerts.size,
      totalEkspor: allEksporCerts.size,
      totalSertifikat: allDokelCerts.size + allEksporCerts.size,
      totalHaccp: records.filter((r) => r.hasHaccp).length,
    };

    const result = { records, summary };
    dataCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error('Failed to load pengguna jasa profile:', err);
    return {
      records: [],
      summary: {
        totalPenggunaJasa: 0,
        totalDokel: 0,
        totalEkspor: 0,
        totalSertifikat: 0,
        totalHaccp: 0,
      },
    };
  }
}

/**
 * Loads registered IKI list and aggregates live traffic data (DK & Ekspor)
 * for the selected period filter.
 */
export async function loadIkiTrafficData(periodFilter = {}) {
  const {
    periodType = 'year',
    selectedYear = new Date().getFullYear(),
    selectedMonth,
    selectedQuarter,
    selectedSemester,
    customRange,
    selectedSatpel,
    selectedPospels,
  } = periodFilter;

  const pospelKey = Array.isArray(selectedPospels) ? selectedPospels.join('-') : selectedPospels || 'all';
  const cacheKey = `iki_traffic_${periodType}_${selectedYear}_${selectedMonth || 0}_${selectedQuarter || 0}_${selectedSemester || 0}_${customRange?.startDate || ''}_${customRange?.endDate || ''}_${selectedSatpel || 'all'}_${pospelKey}`;

  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey);
  }

  try {
    const supabase = createClient();
    const [{ records: masterRecords }, ikiList] = await Promise.all([
      getMasterRecords(supabase),
      getIkiList(),
    ]);

    if (!ikiList || ikiList.length === 0) {
      const emptyResult = {
        records: [],
        summary: {
          totalIki: 0,
          totalVolumeEkspor: 0,
          totalVolumeDokel: 0,
          totalFrekuensiEkspor: 0,
          totalFrekuensiDokel: 0,
          totalFrekuensi: 0,
          totalKapasitas: 0,
        },
      };
      return emptyResult;
    }

    // 1. Filter Ikan with traffic type: domestik_keluar and ekspor only
    let filtered = (masterRecords || []).filter(
      (r) =>
        r._commodity_type === 'ikan' &&
        (r._traffic_type === 'domestik_keluar' || r._traffic_type === 'ekspor')
    );

    // 2. Filter by Satpel
    if (selectedSatpel && selectedSatpel !== 'all') {
      const targetSatpel = String(selectedSatpel).trim().toLowerCase();
      filtered = filtered.filter((r) => {
        const rowSatpel = resolveSatpelColumn(r).toLowerCase();
        return rowSatpel === targetSatpel;
      });
    }

    // 3. Filter by Pospel
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

    // 4. Filter by Period
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
          '';
        const ymd = dateStr ? String(dateStr).trim().slice(0, 10) : '';
        if (ymd && ymd.length === 10) {
          return ymd >= start && ymd <= end;
        }
        return false;
      });
    } else {
      if (selectedYear) {
        filtered = filtered.filter((r) => r.period_year === Number(selectedYear));
      }
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

    // 5. Build lookup map for registered IKI companies
    const ikiMap = new Map();
    ikiList.forEach((iki) => {
      ikiMap.set(normalizeCompanyName(iki.nama_perusahaan), iki);
    });

    const certMap = new Map();
    const companiesWithTraffic = new Set();

    // 6. Process each filtered traffic record
    filtered.forEach((r, idx) => {
      const row = r.row_data || r || {};
      const rawSender = String(row['Pengirim'] || row['Nama Pengirim'] || row['Pemohon'] || '').trim();
      if (!rawSender) return;

      const normKey = normalizeCompanyName(rawSender);
      let matchedIki = ikiMap.get(normKey);
      if (!matchedIki) {
        for (const [k, val] of ikiMap.entries()) {
          if (normKey.includes(k) || k.includes(normKey)) {
            matchedIki = val;
            break;
          }
        }
      }
      if (!matchedIki) return;

      companiesWithTraffic.add(matchedIki.id);

      const certId = getCertificateId(r, idx);
      const trafficType = r._traffic_type === 'ekspor' ? 'ekspor' : 'domestik_keluar';
      const key = `${trafficType}_${certId}_${matchedIki.id}`;

      // Extract document date
      const rawDocDate = String(
        row['Tgl Dokumen'] ||
        row['Tanggal Dokumen'] ||
        row['Tgl_Dokumen'] ||
        row['Tgl K.1.1'] ||
        row['Tgl Aju'] ||
        ''
      ).trim();
      const datePart = rawDocDate ? rawDocDate.slice(0, 10) : '-';

      // Extract commodity
      const rawKomoditas = String(
        row['Komoditas'] ||
        row['Nama Komoditas'] ||
        row['Komoditi'] ||
        row['Nama Tercetak'] ||
        ''
      ).trim();

      if (trafficType === 'ekspor') {
        // Volume Ekspor: Kg from Netto P8, Ekor from Vol Lain where Satuan Lain is ekor
        const nettoKg = parseNumber(row['Netto P8'] || row['Netto_P8'] || row['Netto P1'] || row['Netto'] || 0);
        const satuanLain = String(row['Satuan Lain'] || row['Satuan_Lain'] || '').trim().toLowerCase();
        const isEkor = satuanLain === 'ekor' || satuanLain.includes('ekor');
        const volEkor = isEkor ? parseNumber(row['Vol Lain'] || row['Vol_Lain'] || 0) : 0;

        if (!certMap.has(key)) {
          const komoditasSet = rawKomoditas ? new Set([rawKomoditas]) : new Set();
          certMap.set(key, {
            id: key,
            certId,
            tanggal: datePart,
            namaIki: matchedIki.nama_perusahaan,
            alamatIki: matchedIki.alamat_perusahaan || '-',
            komoditas: rawKomoditas || '-',
            _komoditasSet: komoditasSet,
            frekuensiEkspor: 1,
            volumeEksporKg: nettoKg,
            volumeEksporEkor: volEkor,
            volumeEkspor: nettoKg,
            frekuensiDokel: 0,
            volumeDokelKg: 0,
            volumeDokelEkor: 0,
            volumeDokel: 0,
            kapasitasIki: Number(matchedIki.kapasitas_iki) || 0,
            companyId: matchedIki.id,
          });
        } else {
          // If certificate has multiple commodity line items, sum the volumes
          const item = certMap.get(key);
          item.volumeEksporKg += nettoKg;
          item.volumeEksporEkor += volEkor;
          item.volumeEkspor += nettoKg;
          if (item.tanggal === '-' && datePart !== '-') {
            item.tanggal = datePart;
          }
          if (rawKomoditas && item._komoditasSet) {
            item._komoditasSet.add(rawKomoditas);
            item.komoditas = Array.from(item._komoditasSet).join(', ');
          }
        }
      } else {
        // Volume Dokel: Kg from Netto P8, Ekor from Vol Lain where Satuan Lain is ekor
        const nettoKg = parseNumber(row['Netto P8'] || row['Netto_P8'] || row['Netto P1'] || row['Netto'] || 0);
        const satuanLain = String(row['Satuan Lain'] || row['Satuan_Lain'] || '').trim().toLowerCase();
        const isEkor = satuanLain === 'ekor' || satuanLain.includes('ekor');
        const volEkor = isEkor ? parseNumber(row['Vol Lain'] || row['Vol_Lain'] || 0) : 0;

        if (!certMap.has(key)) {
          const komoditasSet = rawKomoditas ? new Set([rawKomoditas]) : new Set();
          certMap.set(key, {
            id: key,
            certId,
            tanggal: datePart,
            namaIki: matchedIki.nama_perusahaan,
            alamatIki: matchedIki.alamat_perusahaan || '-',
            komoditas: rawKomoditas || '-',
            _komoditasSet: komoditasSet,
            frekuensiEkspor: 0,
            volumeEksporKg: 0,
            volumeEksporEkor: 0,
            volumeEkspor: 0,
            frekuensiDokel: 1,
            volumeDokelKg: nettoKg,
            volumeDokelEkor: volEkor,
            volumeDokel: volEkor,
            kapasitasIki: Number(matchedIki.kapasitas_iki) || 0,
            companyId: matchedIki.id,
          });
        } else {
          // If certificate has multiple commodity line items, sum the volumes
          const item = certMap.get(key);
          item.volumeDokelKg += nettoKg;
          item.volumeDokelEkor += volEkor;
          item.volumeDokel += volEkor;
          if (item.tanggal === '-' && datePart !== '-') {
            item.tanggal = datePart;
          }
          if (rawKomoditas && item._komoditasSet) {
            item._komoditasSet.add(rawKomoditas);
            item.komoditas = Array.from(item._komoditasSet).join(', ');
          }
        }
      }
    });

    const transactionRows = Array.from(certMap.values());

    // 7. For registered IKI companies that had NO traffic in this period, add 1 placeholder row
    ikiList.forEach((iki) => {
      if (!companiesWithTraffic.has(iki.id)) {
        transactionRows.push({
          id: `no_traffic_${iki.id}`,
          certId: '-',
          tanggal: '-',
          namaIki: iki.nama_perusahaan,
          alamatIki: iki.alamat_perusahaan || '-',
          komoditas: '-',
          frekuensiEkspor: 0,
          volumeEksporKg: 0,
          volumeEksporEkor: 0,
          volumeEkspor: 0,
          frekuensiDokel: 0,
          volumeDokelKg: 0,
          volumeDokelEkor: 0,
          volumeDokel: 0,
          kapasitasIki: Number(iki.kapasitas_iki) || 0,
          companyId: iki.id,
        });
      }
    });

    // 8. Sort: newest date first, entries with '-' at the end
    transactionRows.sort((a, b) => {
      if (a.tanggal === '-' && b.tanggal === '-') return 0;
      if (a.tanggal === '-') return 1;
      if (b.tanggal === '-') return -1;
      return b.tanggal.localeCompare(a.tanggal);
    });

    // 9. Assign 1-based sequential numbers
    transactionRows.forEach((r, idx) => {
      r.no = idx + 1;
      delete r._komoditasSet;
      r.volumeEksporKg = Math.round((r.volumeEksporKg || 0) * 100) / 100;
      r.volumeEksporEkor = Math.round(r.volumeEksporEkor || 0);
      r.volumeEkspor = r.volumeEksporKg;
      r.volumeDokelKg = Math.round((r.volumeDokelKg || 0) * 100) / 100;
      r.volumeDokelEkor = Math.round(r.volumeDokelEkor || 0);
      r.volumeDokel = r.volumeDokelEkor;
    });

    // 10. Summary totals for KPI cards
    let totalVolumeEksporKg = 0;
    let totalVolumeEksporEkor = 0;
    let totalVolumeDokelKg = 0;
    let totalVolumeDokelEkor = 0;
    let totalFrekuensiEkspor = 0;
    let totalFrekuensiDokel = 0;
    let totalKapasitas = 0;

    ikiList.forEach((iki) => {
      totalKapasitas += Number(iki.kapasitas_iki) || 0;
    });

    transactionRows.forEach((r) => {
      totalVolumeEksporKg += r.volumeEksporKg || 0;
      totalVolumeEksporEkor += r.volumeEksporEkor || 0;
      totalVolumeDokelKg += r.volumeDokelKg || 0;
      totalVolumeDokelEkor += r.volumeDokelEkor || 0;
      totalFrekuensiEkspor += r.frekuensiEkspor || 0;
      totalFrekuensiDokel += r.frekuensiDokel || 0;
    });

    const summary = {
      totalIki: ikiList.length,
      totalVolumeEksporKg: Math.round(totalVolumeEksporKg * 100) / 100,
      totalVolumeEksporEkor: Math.round(totalVolumeEksporEkor),
      totalVolumeEkspor: Math.round(totalVolumeEksporKg * 100) / 100,
      totalVolumeDokelKg: Math.round(totalVolumeDokelKg * 100) / 100,
      totalVolumeDokelEkor: Math.round(totalVolumeDokelEkor),
      totalVolumeDokel: Math.round(totalVolumeDokelEkor),
      totalFrekuensiEkspor,
      totalFrekuensiDokel,
      totalFrekuensi: totalFrekuensiEkspor + totalFrekuensiDokel,
      totalKapasitas,
    };

    const result = { records: transactionRows, summary };
    dataCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error('Failed to load IKI traffic data:', err);
    return {
      records: [],
      summary: {
        totalIki: 0,
        totalVolumeEksporKg: 0,
        totalVolumeEksporEkor: 0,
        totalVolumeEkspor: 0,
        totalVolumeDokelKg: 0,
        totalVolumeDokelEkor: 0,
        totalVolumeDokel: 0,
        totalFrekuensiEkspor: 0,
        totalFrekuensiDokel: 0,
        totalFrekuensi: 0,
        totalKapasitas: 0,
      },
    };
  }
}


