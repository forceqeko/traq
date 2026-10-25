import { createClient } from '@supabase/supabase-js';

const IKI_CONFIG_ID = '00000000-0000-0000-0000-000000000181';
const HOME_DASHBOARD_ID = '8c52d7d3-e85b-4c4a-acb5-7cf2f1539b47';

const DUMMY_IDS = new Set([
  'iki-1',
  'iki-2',
  'iki_samudera_bahari',
  'iki_laut_lestari',
  'iki_aquatech',
]);

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Kredensial server Supabase belum dikonfigurasi' });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (req.method === 'GET') {
    try {
      // 1. Coba baca dari tabel instalasi_iki terlebih dahulu
      const { data: tableData, error: tableErr } = await adminClient
        .from('instalasi_iki')
        .select('*')
        .order('created_at', { ascending: false });

      if (!tableErr && Array.isArray(tableData) && tableData.length > 0) {
        const cleaned = tableData.filter(
          (x) => x && !DUMMY_IDS.has(x.id) && !DUMMY_IDS.has(x.nama_perusahaan)
        );
        return res.status(200).json({ success: true, items: cleaned });
      }

      // 2. Fallback ke chart_configs
      const { data: configData } = await adminClient
        .from('chart_configs')
        .select('config')
        .eq('id', IKI_CONFIG_ID)
        .maybeSingle();

      const rawItems = Array.isArray(configData?.config?.items) ? configData.config.items : [];
      const cleaned = rawItems.filter(
        (x) => x && !DUMMY_IDS.has(x.id) && !DUMMY_IDS.has(x.nama_perusahaan)
      );
      return res.status(200).json({ success: true, items: cleaned });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Gagal memuat data IKI dari server' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { action, items, item, id } = req.body || {};

      const { data: configData } = await adminClient
        .from('chart_configs')
        .select('config')
        .eq('id', IKI_CONFIG_ID)
        .maybeSingle();

      let currentItems = Array.isArray(configData?.config?.items) ? configData.config.items : [];
      currentItems = currentItems.filter(
        (x) => x && !DUMMY_IDS.has(x.id) && !DUMMY_IDS.has(x.nama_perusahaan)
      );

      if (action === 'sync_all' && Array.isArray(items)) {
        currentItems = items.filter(
          (x) => x && !DUMMY_IDS.has(x.id) && !DUMMY_IDS.has(x.nama_perusahaan)
        );
      } else if (action === 'upsert' && item) {
        const idx = currentItems.findIndex((x) => x.id === item.id);
        if (idx >= 0) {
          currentItems[idx] = { ...currentItems[idx], ...item, updated_at: new Date().toISOString() };
        } else {
          currentItems = [{ ...item, updated_at: new Date().toISOString() }, ...currentItems];
        }
      } else if (action === 'delete' && id) {
        currentItems = currentItems.filter((x) => x.id !== id);
      }

      // Simpan ke chart_configs
      const { error: upsertErr } = await adminClient
        .from('chart_configs')
        .upsert({
          id: IKI_CONFIG_ID,
          dashboard_id: HOME_DASHBOARD_ID,
          title: '__SYSTEM_APP_STORAGE_INSTALASI_IKI__',
          chart_type: 'data_table',
          width: 'full',
          sort_order: 99999,
          config: {
            items: currentItems,
            updated_at: new Date().toISOString(),
          },
        });

      if (upsertErr) {
        return res.status(400).json({ error: upsertErr.message });
      }

      // Sync ke instalasi_iki jika ada
      try {
        if (action === 'upsert' && item) {
          await adminClient.from('instalasi_iki').upsert(item, { onConflict: 'id' });
        } else if (action === 'delete' && id) {
          await adminClient.from('instalasi_iki').delete().eq('id', id);
        } else if (action === 'sync_all' && Array.isArray(items) && items.length > 0) {
          await adminClient.from('instalasi_iki').upsert(currentItems, { onConflict: 'id' });
        }
      } catch {
        // Abaikan jika tabel belum ada
      }

      return res.status(200).json({ success: true, items: currentItems });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Gagal menyimpan data IKI ke server' });
    }
  }

  return res.status(405).json({ error: 'Metode HTTP tidak diizinkan' });
}
