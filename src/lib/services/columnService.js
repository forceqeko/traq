import { createClient } from '@/lib/supabase/client';

export async function getColumnRegistry(datasetId = null) {
  try {
    const supabase = createClient();
    let query = supabase.from('column_registry').select('*');
    if (datasetId) {
      query = query.or(`dataset_id.eq.${datasetId},dataset_id.is.null`);
    }
    query = query.order('is_primary', { ascending: false }).order('column_name', { ascending: true });

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      // If table is empty, auto-sync from upload_history
      return await autoSyncFromUploadHistory();
    }
    return data;
  } catch (err) {
    console.warn('Get column registry fallback:', err.message);
    return [];
  }
}

let columnMapCache = null;

export async function getColumnMappingMap() {
  if (columnMapCache) return columnMapCache;
  try {
    const list = await getColumnRegistry();
    const map = {};
    (list || []).forEach((c) => {
      if (c.column_name) {
        map[c.column_name] = c.display_name || c.column_name;
      }
    });
    columnMapCache = map;
    return map;
  } catch {
    return {};
  }
}

export function clearColumnMappingCache() {
  columnMapCache = null;
}

export async function registerColumns(columns) {
  try {
    clearColumnMappingCache();
    const supabase = createClient();
    const { data, error } = await supabase.from('column_registry').upsert(columns, { onConflict: 'id' });
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Fallback column registry save:', err.message);
    return columns;
  }
}

/**
 * Automatically syncs Excel detected headers into the column_registry table.
 * If column already exists, preserves its custom display_name.
 * If new column, inserts it with display_name = column_name.
 */
export async function syncColumnsFromHeaders(headers = [], sampleRows = []) {
  if (!headers || headers.length === 0) return;

  try {
    const supabase = createClient();

    // Fetch existing columns in registry
    const { data: existing } = await supabase.from('column_registry').select('column_name');
    const existingNames = new Set((existing || []).map((e) => e.column_name));

    const primaryKeys = [
      'Komoditas',
      'Netto P8',
      'Vol P1',
      'Volume',
      'Nomor Dokumen',
      'No. K.1.1',
      'Satpel',
      'Bulan',
      'Harga Barang (Rp)',
      'Pemohon',
      'Pelabuhan Asal',
      'Pelabuhan Tujuan',
      'Netto P1',
      'Klasifikasi',
    ];

    const toInsert = headers
      .filter((col) => !existingNames.has(col))
      .map((col) => {
        const colLower = col.toLowerCase();
        let dataType = 'text';
        if (colLower.includes('harga') || colLower.includes('rp')) {
          dataType = 'currency';
        } else if (
          colLower.includes('vol') ||
          colLower.includes('netto') ||
          colLower.includes('jumlah') ||
          colLower.includes('kuantitas')
        ) {
          dataType = 'number';
        } else if (colLower.includes('tgl') || colLower.includes('tanggal')) {
          dataType = 'date';
        }

        return {
          column_name: col,
          display_name: col, // Default mengikuti aslinya
          data_type: dataType,
          is_primary: primaryKeys.includes(col),
          dataset_id: null,
        };
      });

    if (toInsert.length > 0) {
      await supabase.from('column_registry').insert(toInsert);
    }
  } catch (err) {
    console.warn('Auto-sync columns error:', err.message);
  }
}

async function autoSyncFromUploadHistory() {
  try {
    const supabase = createClient();
    const { data: uploads } = await supabase.from('upload_history').select('columns_detected');
    const detected = new Set();
    uploads?.forEach((u) => {
      (u.columns_detected || []).forEach((col) => detected.add(col));
    });

    const columnsList = Array.from(detected);
    if (columnsList.length > 0) {
      await syncColumnsFromHeaders(columnsList);
      const { data } = await supabase
        .from('column_registry')
        .select('*')
        .order('is_primary', { ascending: false })
        .order('column_name', { ascending: true });
      return data || [];
    }
    return [];
  } catch {
    return [];
  }
}
