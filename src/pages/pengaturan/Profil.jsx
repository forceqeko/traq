import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { createClient } from '@/lib/supabase/client';
import { User, Lock, Save, Check, AlertCircle } from 'lucide-react';

export default function Profil() {
  const { user, profile, username, role, getRoleLabel, getRoleBadgeClass, setProfile } = useUser();
  const [fullName, setFullName] = useState(profile?.full_name || 'Admin Utama Karantina');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  }, [profile?.full_name]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Nama lengkap tidak boleh kosong.');
      return;
    }

    try {
      if (user?.id) {
        const supabase = createClient();
        await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', user.id);
      }
      setProfile((prev) => ({ ...prev, full_name: fullName.trim() }));
      setSuccessMsg('Nama profil berhasil diperbarui.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(`Gagal memperbarui profil: ${err.message}`);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Kata sandi baru minimal 6 karakter.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setSuccessMsg('Kata sandi berhasil diperbarui.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengubah kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  const displayUsername =
    username ||
    profile?.username ||
    (user?.email ? user.email.split('@')[0] : 'admin');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '640px' }}>
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Profil dan Keamanan Akun</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Kelola informasi nama pengguna dan atur ulang kata sandi akun Anda
        </p>
      </div>

      {successMsg && (
        <div className="card" style={{ backgroundColor: 'var(--status-success-bg)', border: '1px solid var(--status-success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-success)', fontWeight: 600 }}>
            <Check size={18} />
            <span>{successMsg}</span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="card" style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid var(--status-danger)', color: 'var(--status-danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Form Update Profil */}
      <div className="card">
        <div className="card-header" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={20} style={{ color: 'var(--primary)' }} />
            <h3 className="card-title">Informasi Akun</h3>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="profile-username" style={{ fontWeight: 600 }}>
              Username Akun
            </label>
            <input
              id="profile-username"
              type="text"
              className="input"
              value={displayUsername}
              disabled
              style={{ opacity: 0.85, backgroundColor: 'var(--surface-2)', fontWeight: 600 }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Domain autentikasi internal: <strong>{user?.email || `${displayUsername}@podqes.web.id`}</strong>
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="profile-fullname" style={{ fontWeight: 600 }}>
              Nama Lengkap Pengguna <span style={{ color: 'var(--status-danger)' }}>*</span>
            </label>
            <input
              id="profile-fullname"
              type="text"
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              Peran (Hak Akses)
            </label>
            <div>
              <span className={`badge ${getRoleBadgeClass(role)}`}>
                {getRoleLabel(role)}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              <span>Simpan Nama Profil</span>
            </button>
          </div>
        </form>
      </div>

      {/* Form Ubah Kata Sandi */}
      <div className="card">
        <div className="card-header" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={20} style={{ color: 'var(--accent-amber)' }} />
            <h3 className="card-title">Ubah Kata Sandi (Password)</h3>
          </div>
        </div>

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="new-password" style={{ fontWeight: 600 }}>
              Kata Sandi Baru <span style={{ color: 'var(--status-danger)' }}>*</span>
            </label>
            <input
              id="new-password"
              type="password"
              className="input"
              placeholder="Minimal 6 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm-new-password" style={{ fontWeight: 600 }}>
              Konfirmasi Kata Sandi Baru <span style={{ color: 'var(--status-danger)' }}>*</span>
            </label>
            <input
              id="confirm-new-password"
              type="password"
              className="input"
              placeholder="Ulangi kata sandi baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Lock size={16} />
              <span>{loading ? 'Menyimpan Kata Sandi...' : 'Ubah Kata Sandi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
