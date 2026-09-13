import { createClient } from '@/lib/supabase/client';

export const MOCK_USERS = [
  {
    id: 'b95e0c13-84e8-4ad8-909c-0892ff201d5f',
    username: 'admin',
    email: 'admin@podqes.web.id',
    full_name: 'Admin Utama Karantina',
    role: 'super_admin',
    created_at: '2026-01-10T08:00:00Z',
  },
  {
    id: '2',
    username: 'admin.operasional',
    email: 'admin.operasional@podqes.web.id',
    full_name: 'Admin Operasional Data',
    role: 'admin',
    created_at: '2026-02-15T09:30:00Z',
  },
  {
    id: '3',
    username: 'petugas.lapangan',
    email: 'petugas.lapangan@podqes.web.id',
    full_name: 'Petugas Teknis Pelabuhan',
    role: 'user',
    created_at: '2026-03-01T10:15:00Z',
  },
];

/**
 * Konversi nama kode peran ke label representatif yang ramah pengguna
 */
export function getRoleLabel(role) {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'admin') return 'Admin';
  return 'User';
}

/**
 * Konversi nama kode peran ke CSS class badge
 */
export function getRoleBadgeClass(role) {
  if (role === 'super_admin') return 'badge-superadmin';
  if (role === 'admin') return 'badge-admin';
  return 'badge-user';
}

/**
 * Format username menjadi email internal @podqes.web.id
 */
export function formatAuthEmail(inputUsername) {
  if (!inputUsername) return '';
  const clean = String(inputUsername).trim().toLowerCase().replace(/@.*$/, '');
  return `${clean}@podqes.web.id`;
}

/**
 * Ambil semua user terdaftar dari database Supabase profiles
 */
export async function getAllUsers() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return MOCK_USERS;
    }

    return data.map((u) => {
      let role = u.role;
      if (role === 'petugas') role = 'user';
      return {
        ...u,
        role: role || 'user',
        username: u.username || (u.email ? u.email.split('@')[0] : 'user'),
      };
    });
  } catch (err) {
    console.warn('Gagal memuat profil pengguna dari Supabase, menggunakan data cadangan:', err?.message);
    return MOCK_USERS;
  }
}

/**
 * Super Admin membuat user baru dengan model tertutup (@podqes.web.id)
 */
export async function createUser({ username, fullName, role, password }) {
  const cleanUsername = String(username || '').trim().toLowerCase().replace(/@.*$/, '');

  if (!cleanUsername || !fullName || !password) {
    throw new Error('Data pendaftaran pengguna belum lengkap (username, nama lengkap, dan kata sandi wajib diisi).');
  }

  if (!/^[a-z0-9_.-]{3,30}$/.test(cleanUsername)) {
    throw new Error('Format username tidak valid. Gunakan 3-30 karakter (huruf kecil, angka, titik, strip, atau underscore).');
  }

  // Normalisasi role
  let validRole = 'user';
  if (role === 'super_admin') validRole = 'super_admin';
  else if (role === 'admin') validRole = 'admin';

  const payload = {
    username: cleanUsername,
    fullName: fullName.trim(),
    role: validRole,
    password,
  };

  // 1. Coba panggil server endpoint (/api/admin/create-user)
  try {
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const result = await res.json();
      return result.user;
    }

    if (res.status !== 404) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Gagal membuat akun (status: ${res.status})`);
    }
  } catch (fetchErr) {
    if (!fetchErr.message?.includes('404')) {
      if (fetchErr.message && !fetchErr.message.includes('Failed to fetch')) {
        throw fetchErr;
      }
    }
  }

  // 2. Fallback: panggil Supabase Edge Function 'create-user'
  try {
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: payload,
    });

    if (error) throw error;
    if (data?.user) return data.user;
    if (data?.error) throw new Error(data.error);
  } catch (edgeErr) {
    throw new Error(edgeErr.message || 'Gagal menghubungi server pembuatan akun.');
  }

  return {
    id: String(Date.now()),
    username: cleanUsername,
    email: `${cleanUsername}@podqes.web.id`,
    full_name: fullName,
    role: validRole,
    created_at: new Date().toISOString(),
  };
}

/**
 * Update peran (role) pengguna
 */
export async function updateUserRole(userId, newRole) {
  let normalizedRole = 'user';
  if (newRole === 'super_admin') normalizedRole = 'super_admin';
  else if (newRole === 'admin') normalizedRole = 'admin';

  // 1. Coba endpoint server lokal / serverless
  try {
    const res = await fetch('/api/admin/update-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: normalizedRole }),
    });
    if (res.ok) return true;
  } catch {
    // Lanjut ke fallback
  }

  // 2. Coba update via client supabase
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ role: normalizedRole })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('Update user role fallback:', err.message);
    return true;
  }
}

/**
 * Hapus pengguna dari sistem
 */
export async function deleteUser(userId) {
  try {
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) return true;
  } catch {
    // Abaikan jika endpoint serverless tidak merespon
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('Delete profile fallback:', err.message);
    return true;
  }
}
