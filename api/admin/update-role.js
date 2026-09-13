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
    const { userId, role } = req.body || {};

    if (!userId || !role) {
      return res.status(400).json({ error: 'User ID dan role wajib diisi.' });
    }

    let normalizedRole = 'user';
    if (role === 'super_admin') normalizedRole = 'super_admin';
    else if (role === 'admin') normalizedRole = 'admin';

    // 1. Update auth metadata
    await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: { role: normalizedRole },
    });

    // 2. Try updating profiles table
    try {
      await adminClient.from('profiles').update({ role: normalizedRole }).eq('id', userId);
    } catch {
      try {
        const fallbackRole = normalizedRole === 'user' ? 'petugas' : 'admin';
        await adminClient.from('profiles').update({ role: fallbackRole }).eq('id', userId);
      } catch {
        // Ignored
      }
    }

    return res.status(200).json({ success: true, role: normalizedRole });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Terjadi kesalahan pada server saat memperbarui peran.' });
  }
}
