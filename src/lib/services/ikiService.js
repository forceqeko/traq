import { createClient } from '@/lib/supabase/client';
import { getCachedRecords } from '@/lib/cache/indexedDbCache';

const STORAGE_KEY = 'traq_instalasi_iki';

function getLocalIki() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Bersihkan data dummy awal (id: iki-1, iki-2) jika ada
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
 * Mengambil daftar seluruh IKI terdaftar (Supabase dengan fallback localStorage)
 */
export async function getIkiList() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('instalasi_iki')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      setLocalIki(data);
      return data;
    }
  } catch (err) {
    console.warn('Supabase getIkiList error, menggunakan data lokal:', err?.message);
  }
  return getLocalIki();
}

/**
 * Menyimpan data IKI baru
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

  // 1. Simpan ke Supabase jika tabel tersedia
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('instalasi_iki')
      .insert([item])
      .select()
      .maybeSingle();

    if (!error && data) {
      const currentList = getLocalIki();
      setLocalIki([data, ...currentList.filter((x) => x.id !== data.id)]);
      return data;
    }
  } catch (err) {
    console.warn('Gagal insert ke Supabase, menyimpan ke lokal:', err?.message);
  }

  // 2. Fallback simpan ke localStorage
  const currentList = getLocalIki();
  const updated = [item, ...currentList];
  setLocalIki(updated);
  return item;
}

/**
 * Memperbarui data IKI yang sudah ada
 */
export async function updateIki(id, payload) {
  const currentList = getLocalIki();
  const existingIndex = currentList.findIndex((x) => x.id === id);
  if (existingIndex === -1) {
    throw new Error('Data IKI tidak ditemukan.');
  }

  const updatedItem = {
    ...currentList[existingIndex],
    nama_perusahaan: String(payload.nama_perusahaan ?? currentList[existingIndex].nama_perusahaan).trim(),
    alamat_perusahaan: String(payload.alamat_perusahaan ?? currentList[existingIndex].alamat_perusahaan).trim(),
    kapasitas_iki: Number(payload.kapasitas_iki ?? currentList[existingIndex].kapasitas_iki) || 0,
    tanggal_sertifikasi: payload.tanggal_sertifikasi ?? currentList[existingIndex].tanggal_sertifikasi,
    lama_iki: String(payload.lama_iki ?? currentList[existingIndex].lama_iki).trim(),
    updated_at: new Date().toISOString(),
  };

  // Update Supabase
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('instalasi_iki')
      .update(updatedItem)
      .eq('id', id);

    if (error) console.warn('Supabase updateIki warning:', error.message);
  } catch (err) {
    console.warn('Supabase updateIki error:', err?.message);
  }

  currentList[existingIndex] = updatedItem;
  setLocalIki(currentList);
  return updatedItem;
}

/**
 * Menghapus data IKI
 */
export async function deleteIki(id) {
  // Hapus dari Supabase
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('instalasi_iki')
      .delete()
      .eq('id', id);

    if (error) console.warn('Supabase deleteIki warning:', error.message);
  } catch (err) {
    console.warn('Supabase deleteIki error:', err?.message);
  }

  const currentList = getLocalIki();
  const filtered = currentList.filter((x) => x.id !== id);
  setLocalIki(filtered);
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
      // Cari alamat yang paling sering muncul
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
