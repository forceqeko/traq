import { createClient } from '@/lib/supabase/client';
import { getCachedRecords } from '@/lib/cache/indexedDbCache';

const STORAGE_KEY = 'traq_instalasi_iki';
const IKI_CONFIG_ID = '00000000-0000-0000-0000-000000000181';
const HOME_DASHBOARD_ID = '8c52d7d3-e85b-4c4a-acb5-7cf2f1539b47';

function getLocalIki() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const cleaned = parsed.filter((item) => item && !['iki-1', 'iki-2'].includes(item.id));
      if (cleaned.length !== parsed.length) {
        setLocalIki(cleaned);
      }
      return cleaned;
    }
    return [];
  } catch {
    return [];
  }
}

function setLocalIki(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
    notifyIkiChange();
  } catch (err) {
    console.warn('Gagal menyimpan IKI ke localStorage:', err);
  }
}

function notifyIkiChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('traq:iki-changed'));
  }
}

/**
 * Mengambil daftar seluruh IKI terdaftar dari server Supabase
 * Sinkronisasi otomatis ke semua perangkat dan browser.
 */
export async function getIkiList() {
  // 1. Coba lewat API endpoint serverless / vite middleware
  try {
    const res = await fetch('/api/admin/iki', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        // Auto-sync: periksa apakah ada item lokal yang belum ada di remote
        const localList = getLocalIki();
        const remoteIds = new Set(json.items.map((x) => x.id));
        const unSynced = localList.filter((x) => x && x.id && !remoteIds.has(x.id));

        if (unSynced.length > 0) {
          const merged = [...unSynced, ...json.items];
          fetch('/api/admin/iki', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sync_all', items: merged }),
          }).catch(() => {});
          setLocalIki(merged);
          return merged;
        }

        setLocalIki(json.items);
        return json.items;
      }
    }
  } catch {
    // Lanjut ke fallback direct client
  }

  // 2. Fallback: baca langsung dari Supabase Client
  try {
    const supabase = createClient();

    // 2a. Coba dari tabel instalasi_iki terlebih dahulu
    const { data: tableData, error: tableErr } = await supabase
      .from('instalasi_iki')
      .select('*')
      .order('created_at', { ascending: false });

    if (!tableErr && Array.isArray(tableData) && tableData.length > 0) {
      setLocalIki(tableData);
      return tableData;
    }

    // 2b. Coba dari chart_configs (__SYSTEM_APP_STORAGE_INSTALASI_IKI__)
    const { data: configData, error: configErr } = await supabase
      .from('chart_configs')
      .select('config')
      .eq('id', IKI_CONFIG_ID)
      .maybeSingle();

    if (!configErr && configData?.config?.items && Array.isArray(configData.config.items)) {
      setLocalIki(configData.config.items);
      return configData.config.items;
    }
  } catch (err) {
    console.warn('Gagal membaca IKI langsung dari Supabase:', err?.message);
  }

  return getLocalIki();
}

/**
 * Menyimpan data IKI baru ke Supabase cloud agar muncul di semua perangkat
 */
export async function createIki(payload) {
  const newId = `iki_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const item = {
    id: newId,
    nama_perusahaan: String(payload.nama_perusahaan || '').trim(),
    alamat_perusahaan: String(payload.alamat_perusahaan || '').trim(),
    kapasitas_iki: Number(payload.kapasitas_iki) || 0,
    tanggal_sertifikasi: payload.tanggal_sertifikasi || new Date().toISOString().split('T')[0],
    lama_iki: String(payload.lama_iki || '1 Tahun').trim(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Simpan via API Serverless / Vite Dev Middleware (menggunakan service role key)
  try {
    const res = await fetch('/api/admin/iki', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert', item }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        setLocalIki(json.items);
        return item;
      }
    }
  } catch (apiErr) {
    console.warn('API /api/admin/iki tidak merespon, mencoba direct client:', apiErr.message);
  }

  // 2. Fallback: simpan langsung via Supabase Client
  try {
    const supabase = createClient();

    // 2a. Coba simpan ke instalasi_iki jika tabel ada
    try {
      await supabase.from('instalasi_iki').insert([item]);
    } catch {
      // Abaikan jika tabel belum ada
    }

    // 2b. Simpan ke chart_configs
    const currentList = getLocalIki();
    const updatedList = [item, ...currentList.filter((x) => x.id !== item.id)];

    await supabase
      .from('chart_configs')
      .upsert({
        id: IKI_CONFIG_ID,
        dashboard_id: HOME_DASHBOARD_ID,
        title: '__SYSTEM_APP_STORAGE_INSTALASI_IKI__',
        chart_type: 'data_table',
        width: 'full',
        sort_order: 99999,
        config: {
          items: updatedList,
          updated_at: new Date().toISOString(),
        },
      });

    setLocalIki(updatedList);
    return item;
  } catch (directErr) {
    console.warn('Fallback direct Supabase write:', directErr.message);
  }

  // 3. Fallback lokal
  const currentList = getLocalIki();
  const updatedList = [item, ...currentList.filter((x) => x.id !== item.id)];
  setLocalIki(updatedList);
  return item;
}

/**
 * Memperbarui data IKI yang sudah ada
 */
export async function updateIki(id, payload) {
  const currentList = getLocalIki();
  const existingIndex = currentList.findIndex((x) => x.id === id);
  const baseItem = existingIndex >= 0 ? currentList[existingIndex] : {};

  const updatedItem = {
    ...baseItem,
    id,
    nama_perusahaan: String(payload.nama_perusahaan ?? baseItem.nama_perusahaan ?? '').trim(),
    alamat_perusahaan: String(payload.alamat_perusahaan ?? baseItem.alamat_perusahaan ?? '').trim(),
    kapasitas_iki: Number(payload.kapasitas_iki ?? baseItem.kapasitas_iki) || 0,
    tanggal_sertifikasi: payload.tanggal_sertifikasi ?? baseItem.tanggal_sertifikasi ?? new Date().toISOString().split('T')[0],
    lama_iki: String(payload.lama_iki ?? baseItem.lama_iki ?? '1 Tahun').trim(),
    updated_at: new Date().toISOString(),
  };

  // 1. Simpan via API Serverless / Vite Dev Middleware
  try {
    const res = await fetch('/api/admin/iki', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert', item: updatedItem }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        setLocalIki(json.items);
        return updatedItem;
      }
    }
  } catch (apiErr) {
    console.warn('API /api/admin/iki update gagal, mencoba direct client:', apiErr.message);
  }

  // 2. Fallback: Supabase Client
  try {
    const supabase = createClient();
    try {
      await supabase.from('instalasi_iki').update(updatedItem).eq('id', id);
    } catch {
      // Abaikan jika tabel tidak ada
    }

    const nextList = [...currentList];
    if (existingIndex >= 0) {
      nextList[existingIndex] = updatedItem;
    } else {
      nextList.unshift(updatedItem);
    }

    await supabase
      .from('chart_configs')
      .upsert({
        id: IKI_CONFIG_ID,
        dashboard_id: HOME_DASHBOARD_ID,
        title: '__SYSTEM_APP_STORAGE_INSTALASI_IKI__',
        chart_type: 'data_table',
        width: 'full',
        sort_order: 99999,
        config: {
          items: nextList,
          updated_at: new Date().toISOString(),
        },
      });

    setLocalIki(nextList);
    return updatedItem;
  } catch (err) {
    console.warn('Fallback direct Supabase update:', err.message);
  }

  if (existingIndex >= 0) {
    currentList[existingIndex] = updatedItem;
  } else {
    currentList.unshift(updatedItem);
  }
  setLocalIki(currentList);
  return updatedItem;
}

/**
 * Menghapus data IKI
 */
export async function deleteIki(id) {
  // 1. Hapus via API Serverless / Vite Dev Middleware
  try {
    const res = await fetch('/api/admin/iki', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        setLocalIki(json.items);
        return true;
      }
    }
  } catch (apiErr) {
    console.warn('API /api/admin/iki delete gagal, mencoba direct client:', apiErr.message);
  }

  // 2. Fallback: Supabase Client
  try {
    const supabase = createClient();
    try {
      await supabase.from('instalasi_iki').delete().eq('id', id);
    } catch {
      // Abaikan jika tabel belum ada
    }

    const currentList = getLocalIki();
    const nextList = currentList.filter((x) => x.id !== id);

    await supabase
      .from('chart_configs')
      .upsert({
        id: IKI_CONFIG_ID,
        dashboard_id: HOME_DASHBOARD_ID,
        title: '__SYSTEM_APP_STORAGE_INSTALASI_IKI__',
        chart_type: 'data_table',
        width: 'full',
        sort_order: 99999,
        config: {
          items: nextList,
          updated_at: new Date().toISOString(),
        },
      });

    setLocalIki(nextList);
    return true;
  } catch (err) {
    console.warn('Fallback direct Supabase delete:', err.message);
  }

  const currentList = getLocalIki();
  const nextList = currentList.filter((x) => x.id !== id);
  setLocalIki(nextList);
  return true;
}

/**
 * Mengambil daftar pengirim dan alamat unik dari master data Ikan (Dokel & Ekspor)
 * untuk digunakan pada fitur autocomplete modal tambah IKI.
 */
export async function getAvailableSendersForIki() {
  try {
    const cached = await getCachedRecords();
    const records = cached?.records || [];
    if (!records || records.length === 0) return [];

    const companyMap = new Map();

    records.forEach((r) => {
      if (r._commodity_type !== 'ikan') return;
      if (r._traffic_type !== 'domestik_keluar' && r._traffic_type !== 'ekspor') return;

      const row = r.row_data || r || {};
      const rawSender = String(row['Pengirim'] || row['Nama Pengirim'] || row['Pemohon'] || '').trim();
      if (!rawSender) return;

      const norm = rawSender
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .replace(/^P\.?T\.?\s+/i, 'PT ')
        .replace(/^C\.?V\.?\s+/i, 'CV ')
        .replace(/^U\.?D\.?\s+/i, 'UD ');

      const rawAddress = String(
        row['Alamat Pengirim'] ||
        row['Alamat Pemohon'] ||
        row['Alamat Tempat Periksa'] ||
        row['Alamat'] ||
        ''
      ).trim();

      if (!companyMap.has(norm)) {
        companyMap.set(norm, {
          name: rawSender,
          addressCounts: {},
          total: 1,
        });
      } else {
        const item = companyMap.get(norm);
        item.total += 1;
      }

      if (rawAddress && rawAddress !== '-' && rawAddress.toLowerCase() !== 'null') {
        const item = companyMap.get(norm);
        item.addressCounts[rawAddress] = (item.addressCounts[rawAddress] || 0) + 1;
      }
    });

    const result = Array.from(companyMap.values()).map((c) => {
      let bestAddress = '';
      let maxAddrCount = 0;
      for (const [addr, count] of Object.entries(c.addressCounts)) {
        if (count > maxAddrCount) {
          maxAddrCount = count;
          bestAddress = addr;
        }
      }

      return {
        namaPerusahaan: c.name,
        alamatPerusahaan: bestAddress,
      };
    });

    return result.sort((a, b) => a.namaPerusahaan.localeCompare(b.namaPerusahaan, 'id-ID'));
  } catch (err) {
    console.warn('Gagal membaca pengirim dari master records:', err);
    return [];
  }
}
