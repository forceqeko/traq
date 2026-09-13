import { createClient } from '@/lib/supabase/client';

export const DATASET_LIST = [
  { id: '1', code: 'DM_HEWAN', name: 'Domestik Masuk Hewan', traffic_type: 'domestik_masuk', commodity_type: 'hewan' },
  { id: '2', code: 'DM_IKAN', name: 'Domestik Masuk Ikan', traffic_type: 'domestik_masuk', commodity_type: 'ikan' },
  { id: '3', code: 'DM_TUMBUHAN', name: 'Domestik Masuk Tumbuhan', traffic_type: 'domestik_masuk', commodity_type: 'tumbuhan' },
  { id: '4', code: 'DK_HEWAN', name: 'Domestik Keluar Hewan', traffic_type: 'domestik_keluar', commodity_type: 'hewan' },
  { id: '5', code: 'DK_IKAN', name: 'Domestik Keluar Ikan', traffic_type: 'domestik_keluar', commodity_type: 'ikan' },
  { id: '6', code: 'DK_TUMBUHAN', name: 'Domestik Keluar Tumbuhan', traffic_type: 'domestik_keluar', commodity_type: 'tumbuhan' },
  { id: '7', code: 'EKSPOR_HEWAN', name: 'Ekspor Hewan', traffic_type: 'ekspor', commodity_type: 'hewan' },
  { id: '8', code: 'EKSPOR_IKAN', name: 'Ekspor Ikan', traffic_type: 'ekspor', commodity_type: 'ikan' },
  { id: '9', code: 'EKSPOR_TUMBUHAN', name: 'Ekspor Tumbuhan', traffic_type: 'ekspor', commodity_type: 'tumbuhan' },
  { id: '10', code: 'IMPOR_HEWAN', name: 'Impor Hewan', traffic_type: 'impor', commodity_type: 'hewan' },
  { id: '11', code: 'IMPOR_IKAN', name: 'Impor Ikan', traffic_type: 'impor', commodity_type: 'ikan' },
  { id: '12', code: 'IMPOR_TUMBUHAN', name: 'Impor Tumbuhan', traffic_type: 'impor', commodity_type: 'tumbuhan' },
];

export async function getAllDatasets() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from('datasets').select('*').order('name');
    if (error || !data || data.length === 0) {
      return DATASET_LIST;
    }
    return data;
  } catch {
    return DATASET_LIST;
  }
}
