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
    const { userId } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: 'User ID wajib disertakan.' });
    }

    // 1. Hapus dari auth.users
    const { error: authErr } = await adminClient.auth.admin.deleteUser(userId);
    if (authErr) {
      return res.status(400).json({ error: authErr.message });
    }

    // 2. Bersihkan dari tabel profiles jika ada
    try {
      await adminClient.from('profiles').delete().eq('id', userId);
    } catch {
      // Ignored jika cascading delete sudah aktif
    }

    return res.status(200).json({ success: true, message: 'Pengguna berhasil dihapus' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Terjadi kesalahan pada server saat menghapus pengguna.' });
  }
}
