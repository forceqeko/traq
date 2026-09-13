import { useUser } from '@/contexts/UserContext';
import { ShieldAlert } from 'lucide-react';

export default function AdminGuard({ children, superAdminOnly = false }) {
  const { isSuperAdmin, isAdmin, role, getRoleLabel } = useUser();

  if (superAdminOnly && !isSuperAdmin) {
    return (
      <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', margin: '2rem auto', maxWidth: '540px' }}>
        <ShieldAlert size={48} style={{ color: 'var(--status-danger)', marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          Akses Dibatasi (Khusus Super Admin)
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          Halaman Manajemen Pengguna ini khusus untuk akun dengan peran <strong>Super Admin</strong>. Anda saat ini masuk dengan hak akses <strong>{getRoleLabel(role)}</strong>.
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', margin: '2rem auto', maxWidth: '540px' }}>
        <ShieldAlert size={48} style={{ color: 'var(--status-danger)', marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          Akses Dibatasi (Admin & Super Admin)
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          Halaman ini khusus untuk pengguna dengan peran <strong>Admin</strong> atau <strong>Super Admin</strong>. Anda saat ini masuk sebagai <strong>User</strong> (Akses Baca & Ekspor).
        </p>
      </div>
    );
  }

  return children;
}
