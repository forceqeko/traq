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
    const { username, fullName, role, password } = req.body || {};

    if (!username || !fullName || !password) {
      return res.status(400).json({ error: 'Semua kolom wajib diisi (username, nama lengkap, dan kata sandi).' });
    }

    const cleanUsername = String(username).trim().toLowerCase().replace(/@.*$/, '');
    if (!/^[a-z0-9_.-]{3,30}$/.test(cleanUsername)) {
      return res.status(400).json({
        error: 'Format username tidak valid. Gunakan 3-30 karakter (huruf kecil, angka, titik, strip, atau underscore).',
      });
    }

    const email = `${cleanUsername}@podqes.web.id`;
    let userRole = 'user';
    if (role === 'super_admin') userRole = 'super_admin';
    else if (role === 'admin') userRole = 'admin';

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: userRole,
        username: cleanUsername,
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      await adminClient.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role: userRole,
      });
    } catch {
      try {
        const fallbackRole = userRole === 'user' ? 'petugas' : 'admin';
        await adminClient.from('profiles').upsert({
          id: data.user.id,
          email,
          full_name: fullName,
          role: fallbackRole,
        });
      } catch {
        // Ignored
      }
    }

    return res.status(200).json({
      success: true,
      user: {
        id: data.user.id,
        email,
        username: cleanUsername,
        full_name: fullName,
        role: userRole,
        created_at: data.user.created_at,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Terjadi kesalahan pada server autentikasi.' });
  }
}
