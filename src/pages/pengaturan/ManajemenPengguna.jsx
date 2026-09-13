import { useState, useEffect } from 'react';
import AdminGuard from '@/components/auth/AdminGuard';
import { getAllUsers, updateUserRole, createUser, deleteUser, getRoleLabel, getRoleBadgeClass } from '@/lib/services/userService';
import { useUser } from '@/contexts/UserContext';
import { useDialog } from '@/contexts/DialogContext';
import { UserPlus, Check, RefreshCw, Trash2, Shield, User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function ManajemenPengguna() {
  const { user: currentUser } = useUser();
  const { showConfirm, showAlert, showLoading, hideLoading } = useDialog();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newRole, setNewRole] = useState('user');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  // Keyboard Escape listener to close modal (R-32 accessibility)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showAddModal) {
        setShowAddModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch {
      setErrorMsg('Gagal memuat daftar pengguna.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await updateUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      setSuccessMsg(`Peran pengguna berhasil diperbarui menjadi ${getRoleLabel(role)}.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg('Gagal memperbarui peran pengguna.');
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  const handleDeleteUser = (targetUser) => {
    if (targetUser.id === currentUser?.id || targetUser.email === currentUser?.email) {
      showAlert({
        title: 'Aksi Ditolak',
        message: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.',
        type: 'warning',
      });
      return;
    }

    showConfirm({
      title: 'Hapus Akun Pengguna',
      message: `Apakah Anda yakin ingin menghapus akun ${targetUser.full_name} (${targetUser.username})? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Ya, Hapus Akun',
      cancelLabel: 'Batal',
      onConfirm: async () => {
        showLoading('Menghapus akun pengguna...');
        try {
          await deleteUser(targetUser.id);
          setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
          hideLoading();
          setSuccessMsg(`Akun ${targetUser.username} berhasil dihapus.`);
          setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
          hideLoading();
          showAlert({
            title: 'Gagal Menghapus',
            message: err?.message || 'Terjadi kesalahan saat menghapus pengguna.',
            type: 'error',
          });
        }
      },
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUsername = newUsername.trim().toLowerCase().replace(/@.*$/, '');

    if (!cleanUsername || !newName.trim() || !newPassword) {
      setErrorMsg('Mohon lengkapi semua kolom pendaftaran.');
      return;
    }

    if (!/^[a-z0-9_.-]{3,30}$/.test(cleanUsername)) {
      setErrorMsg('Username hanya boleh 3-30 karakter (huruf kecil, angka, titik, strip, atau underscore).');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Kata sandi awal minimal 6 karakter.');
      return;
    }

    setSubmitting(true);
    showLoading('Membuat akun pengguna baru...');

    try {
      const created = await createUser({
        username: cleanUsername,
        fullName: newName.trim(),
        role: newRole,
        password: newPassword,
      });

      hideLoading();
      setUsers((prev) => [created, ...prev]);
      setShowAddModal(false);
      setNewUsername('');
      setNewName('');
      setNewPassword('');
      setNewRole('user');

      setSuccessMsg(`Akun ${created.full_name} (${cleanUsername}@podqes.web.id) berhasil didaftarkan sebagai ${getRoleLabel(newRole)}.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      loadUsers();
    } catch (err) {
      hideLoading();
      setErrorMsg(err.message || 'Gagal membuat akun pengguna.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminGuard superAdminOnly>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header Kartu */}
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Manajemen Pengguna & Hak Akses</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Kelola akun internal sistem (Super Admin, Admin, dan User) dengan domain terstandarisasi @podqes.web.id
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setErrorMsg('');
              setShowAddModal(true);
            }}
          >
            <UserPlus size={16} />
            <span>Tambah Pengguna Baru</span>
          </button>
        </div>

        {/* Notifikasi Sukses */}
        {successMsg && (
          <div className="card" style={{ backgroundColor: 'var(--status-success-bg)', border: '1px solid var(--status-success)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-success)', fontWeight: 600 }}>
              <Check size={18} />
              <span>{successMsg}</span>
            </div>
          </div>
        )}

        {/* Notifikasi Error */}
        {errorMsg && (
          <div className="card" style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid var(--status-danger)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-danger)', fontWeight: 600 }}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Tabel Pengguna */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title" style={{ fontSize: '1rem' }}>
              Daftar Akun Pengguna Terdaftar ({users.length})
            </h3>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem' }}
              onClick={loadUsers}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Muat Ulang</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="previewTable" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-2)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Nama Lengkap</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Username Akun</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Peran (Role)</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Tanggal Dibuat</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Aksi dan Hak Akses</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Belum ada akun pengguna yang terdaftar.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const uName = u.username || (u.email ? u.email.split('@')[0] : 'user');
                    const isSelf = u.id === currentUser?.id;

                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{u.full_name}</span>
                            {isSelf && (
                              <span style={{ fontSize: '0.6875rem', backgroundColor: 'var(--primary-subtle)', color: 'var(--primary)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                                Akun Anda
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{uName}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email || `${uName}@podqes.web.id`}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span className={`badge ${getRoleBadgeClass(u.role)}`}>
                            {getRoleLabel(u.role)}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Baru'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <select
                              className="select"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: 'auto' }}
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              disabled={isSelf}
                              title={isSelf ? 'Anda tidak dapat mengubah peran akun Anda sendiri' : 'Ubah peran pengguna'}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                              <option value="super_admin">Super Admin</option>
                            </select>

                            {!isSelf && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem', color: 'var(--status-danger)' }}
                                onClick={() => handleDeleteUser(u)}
                                title="Hapus Akun Pengguna"
                                aria-label="Hapus Akun Pengguna"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Tambah Pengguna Baru */}
        {showAddModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 200,
              padding: '1.5rem',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-add-user-title"
          >
            <div
              className="card"
              style={{
                width: '100%',
                maxWidth: '520px',
                backgroundColor: 'var(--surface-1)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div className="card-header" style={{ marginBottom: '1.25rem' }}>
                <h3 id="modal-add-user-title" className="card-title" style={{ fontSize: '1.125rem' }}>
                  Tambah Akun Pengguna Baru
                </h3>
              </div>

              {errorMsg && (
                <div style={{ backgroundColor: 'var(--status-danger-bg)', color: 'var(--status-danger)', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Input Username */}
                <div className="form-group">
                  <label className="form-label" htmlFor="new-user-username" style={{ fontWeight: 600 }}>
                    Username Akun <span style={{ color: 'var(--status-danger)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <User size={16} style={{ position: 'absolute', left: '0.875rem', color: 'var(--text-muted)' }} />
                    <input
                      id="new-user-username"
                      type="text"
                      className="input"
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="contoh: staf.data"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      autoFocus
                      required
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Email internal: <strong>{newUsername.trim() ? `${newUsername.trim()}@podqes.web.id` : 'username@podqes.web.id'}</strong>
                  </span>
                </div>

                {/* Input Nama Lengkap */}
                <div className="form-group">
                  <label className="form-label" htmlFor="new-user-fullname" style={{ fontWeight: 600 }}>
                    Nama Lengkap <span style={{ color: 'var(--status-danger)' }}>*</span>
                  </label>
                  <input
                    id="new-user-fullname"
                    type="text"
                    className="input"
                    placeholder="Nama Lengkap Pengguna"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>

                {/* Input Kata Sandi Awal */}
                <div className="form-group">
                  <label className="form-label" htmlFor="new-user-password" style={{ fontWeight: 600 }}>
                    Kata Sandi Awal <span style={{ color: 'var(--status-danger)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '0.875rem', color: 'var(--text-muted)' }} />
                    <input
                      id="new-user-password"
                      type={showPassword ? 'text' : 'password'}
                      className="input"
                      style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                      placeholder="Minimal 6 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '0.75rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                      title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Berikan kata sandi ini kepada pengguna untuk masuk ke sistem.
                  </span>
                </div>

                {/* Pilihan Peran */}
                <div className="form-group">
                  <label className="form-label" htmlFor="new-user-role" style={{ fontWeight: 600 }}>
                    Peran Pengguna (Hak Akses)
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Shield size={16} style={{ position: 'absolute', left: '0.875rem', color: 'var(--text-muted)' }} />
                    <select
                      id="new-user-role"
                      className="select"
                      style={{ paddingLeft: '2.5rem' }}
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                    >
                      <option value="user">User (Lihat, Filter, dan Ekspor Data)</option>
                      <option value="admin">Admin (Manajemen Data, Kustomisasi Dashboard, Column Mapping)</option>
                      <option value="super_admin">Super Admin (Akses Penuh Seluruh Sistem)</option>
                    </select>
                  </div>
                </div>

                {/* Tombol Aksi Modal */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAddModal(false)}
                    disabled={submitting}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Menyimpan...' : 'Simpan dan Daftarkan Akun'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
