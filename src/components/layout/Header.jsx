import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useDialog } from '@/contexts/DialogContext';
import GlobalPeriodFilter from '@/components/filters/GlobalPeriodFilter';
import GlobalSatpelFilter from '@/components/filters/GlobalSatpelFilter';
import GlobalPospelFilter from '@/components/filters/GlobalPospelFilter';
import styles from './Header.module.css';
import { User, LogOut, Settings, ChevronDown, Sun, Moon } from 'lucide-react';

export default function Header({ pageTitle = 'Dashboard' }) {
  const navigate = useNavigate();
  const { user, profile, role, isAdmin, getRoleLabel, signOut } = useUser();
  const { theme, toggleTheme } = useTheme();
  const { showLoading, hideLoading, showConfirm } = useDialog();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    setDropdownOpen(false);

    const confirmed = await showConfirm({
      title: 'Konfirmasi Keluar',
      message: 'Apakah Anda yakin ingin keluar dari sistem aplikasi TRAQ?',
      type: 'warning',
      confirmText: 'Keluar',
      cancelText: 'Batal',
    });

    if (!confirmed) return;

    showLoading('Memproses keluar dari sistem...');
    try {
      await signOut();
    } finally {
      setTimeout(() => {
        hideLoading();
        navigate('/login');
      }, 400);
    }
  };

  const getInitial = () => {
    if (profile?.full_name) return profile.full_name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  return (
    <header className={styles.header}>
      {/* Page Title / Left Section */}
      <div className={styles.headerLeft}>
        <h1 className={styles.pageTitle}>{pageTitle}</h1>
      </div>

      {/* Global Filters & User Profile / Right Section */}
      <div className={styles.headerRight}>
        <GlobalPeriodFilter />
        <GlobalSatpelFilter />
        <GlobalPospelFilter />

        {/* Theme Toggle Button (Icon only) */}

        <button
          className={styles.themeToggleBtn}
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Ganti ke Tema Terang (Light Mode)' : 'Ganti ke Tema Gelap (Dark Mode)'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun size={18} style={{ color: '#F59E0B' }} />
          ) : (
            <Moon size={18} style={{ color: '#2563EB' }} />
          )}
        </button>

        {/* User Profile Dropdown */}
        <div
          className={styles.userMenu}
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <div className={styles.avatar}>{getInitial()}</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>
              {profile?.full_name || user?.email || 'Admin Utama'}
            </span>
            <span className={styles.userRole}>
              {getRoleLabel(role)}
            </span>
          </div>
          <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />

          {/* Dropdown Options */}
          {dropdownOpen && (
            <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
              <Link
                to="/pengaturan/profil"
                className={styles.dropdownItem}
                onClick={() => setDropdownOpen(false)}
              >
                <User size={16} />
                <span>Profil Saya</span>
              </Link>

              {isAdmin && (
                <Link
                  to="/pengaturan"
                  className={styles.dropdownItem}
                  onClick={() => setDropdownOpen(false)}
                >
                  <Settings size={16} />
                  <span>Pengaturan</span>
                </Link>
              )}

              <div className={styles.divider} />

              <div
                className={`${styles.dropdownItem} ${styles.danger}`}
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Keluar (Logout)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
