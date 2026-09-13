import { createClient } from '@supabase/supabase-js';

const url = 'https://bnpqyteezjthqmnwcxjz.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJucHF5dGVlemp0aHFtbndjeGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzI2NzI0MywiZXhwIjoyMTAyODQzMjQzfQ.8VgNwMEru8cWeH9IkH2MnFy_f3vqnnEXxC3yPsgEReY';
const supabase = createClient(url, serviceKey);

async function analyze() {
  let allData = [];
  let from = 0;
  while (true) {
    const { data: chunk } = await supabase
      .from('data_records')
      .select('id, row_data, datasets(commodity_type)')
      .range(from, from + 999);
    if (!chunk || chunk.length === 0) break;
    allData = allData.concat(chunk);
    if (chunk.length < 1000) break;
    from += 1000;
  }

  console.log('Total baris data (rows):', allData.length);

  const sample = allData[0].row_data;
  console.log('Semua nama kolom di row_data:', Object.keys(sample));

  const uniqueNoDok = new Set();
  const uniqueNoK11 = new Set();
  const uniqueNoAju = new Set();
  const uniqueNoSeri = new Set();

  allData.forEach((r) => {
    const rd = r.row_data;
    if (rd['Nomor Dokumen'] || rd['No. Dokumen'] || rd['Nomor_Dokumen']) {
      uniqueNoDok.add(rd['Nomor Dokumen'] || rd['No. Dokumen'] || rd['Nomor_Dokumen']);
    }
    if (rd['No. K.1.1'] || rd['No_K11']) {
      uniqueNoK11.add(rd['No. K.1.1'] || rd['No_K11']);
    }
    if (rd['No. Aju'] || rd['No_Aju']) {
      uniqueNoAju.add(rd['No. Aju'] || rd['No_Aju']);
    }
    if (rd['Nomor Seri'] || rd['Nomor_Seri']) {
      uniqueNoSeri.add(rd['Nomor Seri'] || rd['Nomor_Seri']);
    }
  });

  console.log('Total Baris Data di Excel:', allData.length);
  console.log('Unique Nomor Dokumen (K.9.2):', uniqueNoDok.size);
  console.log('Unique No. K.1.1 (Permohonan):', uniqueNoK11.size);
  console.log('Unique No. Aju:', uniqueNoAju.size);
  console.log('Unique Nomor Seri:', uniqueNoSeri.size);

  console.log('Contoh 5 Nomor Dokumen:', Array.from(uniqueNoDok).slice(0, 5));
  console.log('Contoh 5 No. K.1.1:', Array.from(uniqueNoK11).slice(0, 5));
  console.log('Contoh 5 No. Aju:', Array.from(uniqueNoAju).slice(0, 5));

  let totalVolP1 = 0;
  let totalVolLain = 0;
  let totalNettoP1 = 0;
  let totalHarga = 0;

  allData.forEach((r) => {
    const rd = r.row_data;
    totalVolP1 += parseFloat(rd['Vol P1'] || 0) || 0;
    totalVolLain += parseFloat(rd['Vol Lain'] || 0) || 0;
    totalNettoP1 += parseFloat(rd['Netto P1'] || 0) || 0;
    totalHarga += parseFloat(rd['Harga Barang (Rp)'] || 0) || 0;
  });

  console.log('Sum of Vol P1:', totalVolP1);
  console.log('Sum of Vol Lain:', totalVolLain);
  console.log('Sum of Netto P1:', totalNettoP1);
  console.log('Sum of Harga Barang (Rp):', totalHarga);
}
analyze();
