import { Link } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { UploadCloud, LayoutGrid, Link2, Users, User, Warehouse } from 'lucide-react';

export default function Pengaturan() {
  const { isSuperAdmin } = useUser();

  const allSettingsMenus = [
    {
      to: '/pengaturan/manajemen-data',
      icon: <UploadCloud size={28} style={{ color: 'var(--primary)' }} />,
      title: 'Manajemen Data Excel',
      description: 'Upload file Excel 12 kategori, lihat riwayat batch upload, validasi, dan hapus/replace data periode.',
      superAdminOnly: false,
    },
    {
      to: '/pengaturan/iki',
      icon: <Warehouse size={28} style={{ color: 'var(--accent-blue, #0284c7)' }} />,
      title: 'Instalasi Karantina Ikan (IKI)',
      description: 'Kelola daftar perusahaan berstatus IKI, kapasitas operasional (Ekor), dan masa berlaku sertifikasi.',
      superAdminOnly: false,
    },
    {
      to: '/pengaturan/kustomisasi-dashboard',
      icon: <LayoutGrid size={28} style={{ color: 'var(--accent-teal)' }} />,
      title: 'Kustomisasi Dashboard',
      description: 'Atur visualisasi chart (pilih kolom, agregasi, tipe grafik) untuk halaman Home, Lalu Lintas, dan Karantina.',
      superAdminOnly: false,
    },
    {
      to: '/pengaturan/column-mapping',
      icon: <Link2 size={28} style={{ color: 'var(--accent-amber)' }} />,
      title: 'Column Mapping Registry',
      description: 'Kelola pemetaan nama kolom Excel (kolom utama dan kolom khusus) agar tidak error saat ada perubahan format.',
      superAdminOnly: false,
    },
    {
      to: '/pengaturan/manajemen-pengguna',
      icon: <Users size={28} style={{ color: 'var(--accent-purple)' }} />,
      title: 'Manajemen Pengguna (User RBA)',
      description: 'Tambah, hapus, dan atur peran akun pengguna aplikasi (Super Admin, Admin, dan User).',
      superAdminOnly: true,
    },
    {
      to: '/pengaturan/profil',
      icon: <User size={28} style={{ color: 'var(--text-secondary)' }} />,
      title: 'Profil & Keamanan Akun',
      description: 'Kelola informasi profil pribadi, ubah kata sandi (password), dan pengaturan keamanan.',
      superAdminOnly: false,
    },
  ];

  // Saring menu: Manajemen Pengguna hanya muncul untuk Super Admin
  const availableMenus = allSettingsMenus.filter((item) => !item.superAdminOnly || isSuperAdmin);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Pusat Pengaturan TRAQ</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Kelola modul konfigurasi data, visualisasi, dan akses pengguna dari satu panel terpadu
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {availableMenus.map((item, index) => (
          <Link to={item.to} key={index}>
            <div
              className="card"
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-0)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{item.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                {item.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
