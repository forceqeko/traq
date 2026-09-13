import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bnpqyteezjthqmnwcxjz.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJucHF5dGVlemp0aHFtbndjeGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzI2NzI0MywiZXhwIjoyMTAyODQzMjQzfQ.8VgNwMEru8cWeH9IkH2MnFy_f3vqnnEXxC3yPsgEReY';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: datasets } = await supabase.from('datasets').select('*');
  const dsMap = new Map();
  datasets.forEach(d => dsMap.set(d.id, d));

  const { count: totalCount } = await supabase.from('data_records').select('*', { count: 'exact', head: true });
  console.log(`Total database records: ${totalCount}`);

  const chunkSize = 1000;
  const numChunks = Math.ceil(totalCount / chunkSize);
  const allRows = [];

  console.log(`Fetching ${numChunks} chunks with batch concurrency...`);
  const concurrency = 10;
  for (let i = 0; i < numChunks; i += concurrency) {
    const promises = [];
    for (let j = i; j < Math.min(i + concurrency, numChunks); j++) {
      const from = j * chunkSize;
      const to = from + chunkSize - 1;
      promises.push(
        supabase
          .from('data_records')
          .select('id, dataset_id, period_month, period_year, row_data')
          .order('id', { ascending: true })
          .range(from, to)
      );
    }
    const results = await Promise.all(promises);
    for (const res of results) {
      if (res.data) allRows.push(...res.data);
    }
  }

  console.log(`Successfully loaded ${allRows.length} rows.`);

  function getCertId(row, idx) {
    const rd = row.row_data || {};
    return String(
      rd['No. K.1.1'] ||
      rd['No K.1.1'] ||
      rd['No_K11'] ||
      rd['No.K.1.1'] ||
      rd['K.1.1'] ||
      rd['Nomor Dokumen'] ||
      rd['No. Dokumen'] ||
      rd['No. Aju'] ||
      `row_${row.id || idx}`
    ).trim();
  }

  // 1. STATISTIK PER BULAN (SINGLE MONTH)
  const monthlyStats = [];
  for (let m = 1; m <= 8; m++) {
    const rows = allRows.filter(r => r.period_month === m);
    const certsAll = new Set();
    const certsHewan = new Set();
    const certsIkan = new Set();
    const certsTumbuhan = new Set();

    rows.forEach((r, idx) => {
      const ds = dsMap.get(r.dataset_id);
      const comm = ds?.commodity_type;
      const certId = getCertId(r, idx);
      certsAll.add(certId);
      if (comm === 'hewan') certsHewan.add(certId);
      if (comm === 'ikan') certsIkan.add(certId);
      if (comm === 'tumbuhan') certsTumbuhan.add(certId);
    });

    monthlyStats.push({
      Bulan: `Bulan ${m} (2026)`,
      Total_Baris: rows.length,
      Total_Sertifikat: certsAll.size,
      Hewan: certsHewan.size,
      Ikan: certsIkan.size,
      Tumbuhan: certsTumbuhan.size
    });
  }

  console.log('\n--- 1. STATISTIK TIAP BULAN (BULAN 1 S/D 8) ---');
  console.table(monthlyStats);

  // 2. STATISTIK KUMULATIF DARI JANUARI
  const cumStats = [];
  for (let m = 1; m <= 8; m++) {
    const rows = allRows.filter(r => r.period_month <= m);
    const certsAll = new Set();
    const certsHewan = new Set();
    const certsIkan = new Set();
    const certsTumbuhan = new Set();

    rows.forEach((r, idx) => {
      const ds = dsMap.get(r.dataset_id);
      const comm = ds?.commodity_type;
      const certId = getCertId(r, idx);
      certsAll.add(certId);
      if (comm === 'hewan') certsHewan.add(certId);
      if (comm === 'ikan') certsIkan.add(certId);
      if (comm === 'tumbuhan') certsTumbuhan.add(certId);
    });

    cumStats.push({
      Periode: `Januari - Bulan ${m}`,
      Total_Baris: rows.length,
      Total_Sertifikat: certsAll.size,
      Hewan: certsHewan.size,
      Ikan: certsIkan.size,
      Tumbuhan: certsTumbuhan.size
    });
  }

  console.log('\n--- 2. STATISTIK KUMULATIF TAHUNAN (JANUARI S/D BULAN N) ---');
  console.table(cumStats);
}

main().catch(console.error);
