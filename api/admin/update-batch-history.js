import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode HTTP tidak diizinkan' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Kredensial server Supabase belum dikonfigurasi' });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { uploadId, filename, rowCount, columnCount, columnsDetected, uploadedAt } = req.body || {};

    if (!uploadId) {
      return res.status(400).json({ error: 'Upload ID wajib disertakan.' });
    }

    const nowIso = uploadedAt || new Date().toISOString();
    const updatePayload = {
      original_filename: filename,
      row_count: rowCount,
      column_count: columnCount,
      columns_detected: columnsDetected,
      uploaded_at: nowIso,
    };

    const { data, error } = await adminClient
      .from('upload_history')
      .update(updatePayload)
      .eq('id', uploadId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Terjadi kesalahan pada server saat memperbarui riwayat upload.' });
  }
}
