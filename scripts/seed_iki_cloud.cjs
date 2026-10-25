const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[key] = value.trim();
  }
});

const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const url = env.VITE_SUPABASE_URL;
const adminClient = createClient(url, serviceKey);

const IKI_CONFIG_ID = '00000000-0000-0000-0000-000000000181';
const HOME_DASHBOARD_ID = '8c52d7d3-e85b-4c4a-acb5-7cf2f1539b47';

const initialItems = [
  {
    id: 'iki_samudera_bahari',
    nama_perusahaan: 'PT. Samudera Bahari Indonesia',
    alamat_perusahaan: 'Kawasan Industri Perikanan Muara Baru Blok A No. 12, Jakarta Utara',
    kapasitas_iki: 50000,
    tanggal_sertifikasi: '2026-01-15',
    lama_iki: '2 Tahun',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'iki_laut_lestari',
    nama_perusahaan: 'CV. Laut Lestari Nusantara',
    alamat_perusahaan: 'Jl. Pelabuhan Ratu No. 45, Sukabumi, Jawa Barat',
    kapasitas_iki: 25000,
    tanggal_sertifikasi: '2026-03-10',
    lama_iki: '1 Tahun',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'iki_aquatech',
    nama_perusahaan: 'PT. Aquatech Pratama',
    alamat_perusahaan: 'Jl. Raya Benoa No. 88, Denpasar, Bali',
    kapasitas_iki: 35000,
    tanggal_sertifikasi: '2026-02-20',
    lama_iki: '3 Tahun',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

async function seed() {
  const { data, error } = await adminClient
    .from('chart_configs')
    .upsert({
      id: IKI_CONFIG_ID,
      dashboard_id: HOME_DASHBOARD_ID,
      title: '__SYSTEM_APP_STORAGE_INSTALASI_IKI__',
      chart_type: 'data_table',
      width: 'full',
      sort_order: 99999,
      config: {
        items: initialItems,
        updated_at: new Date().toISOString()
      }
    })
    .select();

  if (error) {
    console.error('❌ Gagal seed IKI ke cloud store:', error);
  } else {
    console.log('✅ Berhasil inisialisasi penyimpanan cloud IKI di Supabase!');
    console.log('Total perusahaan terdaftar:', initialItems.length);
  }
}

seed();
