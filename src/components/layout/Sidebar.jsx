import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import styles from './Sidebar.module.css';
import {
  Home,
  Truck,
  Leaf,
  Warehouse,
  Users,
  Settings,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const pathname = location.pathname;
  const { isAdmin } = useUser();
  const isActive = (path) => pathname === path;
  const isParentActive = (prefix) => pathname.startsWith(prefix);

  const [laluLintasOpen, setLaluLintasOpen] = useState(false);
  const [karantinaOpen, setKarantinaOpen] = useState(false);
  const [instalasiOpen, setInstalasiOpen] = useState(false);
  const [profilingOpen, setProfilingOpen] = useState(false);

  useEffect(() => {
    if (isParentActive('/lalu-lintas') || isParentActive('/lalu_lintas')) {
      setLaluLintasOpen(true);
    } else if (isParentActive('/karantina')) {
      setKarantinaOpen(true);
    } else if (isParentActive('/instalasi')) {
      setInstalasiOpen(true);
    } else if (isParentActive('/profiling')) {
      setProfilingOpen(true);
    }
  }, [pathname]);

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.sidebarHeader}>
        <div className={styles.brand}>
          <div className={styles.brandLogo} title="TRAQ">
            <img src="/logo-traq.png" alt="Logo TRAQ" className={styles.brandLogoImg} />
          </div>
          {!collapsed && (
            <div className={styles.brandText}>
              <span className={styles.brandName}>TRAQ</span>
              <span className={styles.brandSub}>Traffic & Quarantine Analytics</span>
            </div>
          )}
        </div>
        <button
          className={styles.toggleBtn}
          onClick={onToggle}
          title={collapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className={styles.navContainer}>
        {!collapsed && <div className={styles.navGroupTitle}>UTAMA</div>}

        {/* 1. Home */}
        <Link
          to="/"
          className={`${styles.navItem} ${isActive('/') ? styles.active : ''}`}
          title="Home (Executive Dashboard)"
        >
          <Home className={styles.navIcon} />
          {!collapsed && <span className={styles.navLabel}>Home</span>}
        </Link>

        {/* 2. Lalu Lintas Menu */}
        <div>
          <div
            className={`${styles.navItem} ${isParentActive('/lalu-lintas') ? styles.active : ''}`}
            onClick={() => !collapsed && setLaluLintasOpen(!laluLintasOpen)}
            title="Lalu Lintas Karantina"
          >
            <Truck className={styles.navIcon} />
            {!collapsed && (
              <>
                <span className={styles.navLabel}>Lalu Lintas</span>
                {laluLintasOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </>
            )}
          </div>
          {!collapsed && laluLintasOpen && (
            <div className={styles.subList}>
              <Link
                to="/lalu-lintas/domestik-masuk"
                className={`${styles.subItem} ${isActive('/lalu-lintas/domestik-masuk') ? styles.active : ''}`}
              >
                Domestik Masuk
              </Link>
              <Link
                to="/lalu-lintas/domestik-keluar"
                className={`${styles.subItem} ${isActive('/lalu-lintas/domestik-keluar') ? styles.active : ''}`}
              >
                Domestik Keluar
              </Link>
              <Link
                to="/lalu-lintas/ekspor"
                className={`${styles.subItem} ${isActive('/lalu-lintas/ekspor') ? styles.active : ''}`}
              >
                Ekspor
              </Link>
              <Link
                to="/lalu-lintas/impor"
                className={`${styles.subItem} ${isActive('/lalu-lintas/impor') ? styles.active : ''}`}
              >
                Impor
              </Link>
            </div>
          )}
        </div>

        {/* 3. Karantina Menu */}
        <div>
          <div
            className={`${styles.navItem} ${isParentActive('/karantina') ? styles.active : ''}`}
            onClick={() => !collapsed && setKarantinaOpen(!karantinaOpen)}
            title="Komoditas Karantina"
          >
            <Leaf className={styles.navIcon} />
            {!collapsed && (
              <>
                <span className={styles.navLabel}>Karantina</span>
                {karantinaOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </>
            )}
          </div>
          {!collapsed && karantinaOpen && (
            <div className={styles.subList}>
              <Link
                to="/karantina/hewan"
                className={`${styles.subItem} ${isActive('/karantina/hewan') ? styles.active : ''}`}
              >
                Hewan
              </Link>
              <Link
                to="/karantina/ikan"
                className={`${styles.subItem} ${isActive('/karantina/ikan') ? styles.active : ''}`}
              >
                Ikan
              </Link>
              <Link
                to="/karantina/tumbuhan"
                className={`${styles.subItem} ${isActive('/karantina/tumbuhan') ? styles.active : ''}`}
              >
                Tumbuhan
              </Link>
            </div>
          )}
        </div>

        {/* 4. Instalasi Karantina Menu */}
        <div>
          <div
            className={`${styles.navItem} ${isParentActive('/instalasi') ? styles.active : ''}`}
            onClick={() => !collapsed && setInstalasiOpen(!instalasiOpen)}
            title="Instalasi Karantina"
          >
            <Warehouse className={styles.navIcon} />
            {!collapsed && (
              <>
                <span className={styles.navLabel}>Instalasi Karantina</span>
                {instalasiOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </>
            )}
          </div>
          {!collapsed && instalasiOpen && (
            <div className={styles.subList}>
              <Link
                to="/instalasi/ikh"
                className={`${styles.subItem} ${isActive('/instalasi/ikh') ? styles.active : ''}`}
                title="Instalasi Karantina Hewan (IKH)"
              >
                Instalasi Karantina Hewan (IKH)
              </Link>
              <Link
                to="/instalasi/iki"
                className={`${styles.subItem} ${isActive('/instalasi/iki') ? styles.active : ''}`}
                title="Instalasi Karantina Ikan (IKI)"
              >
                Instalasi Karantina Ikan (IKI)
              </Link>
              <Link
                to="/instalasi/ikt"
                className={`${styles.subItem} ${isActive('/instalasi/ikt') ? styles.active : ''}`}
                title="Instalasi Karantina Tumbuhan (IKT)"
              >
                Instalasi Karantina Tumbuhan (IKT)
              </Link>
            </div>
          )}
        </div>

        {/* 5. Profiling Pengguna Jasa Menu */}
        <div>
          <div
            className={`${styles.navItem} ${isParentActive('/profiling') ? styles.active : ''}`}
            onClick={() => !collapsed && setProfilingOpen(!profilingOpen)}
            title="Profiling Pengguna Jasa"
          >
            <Users className={styles.navIcon} />
            {!collapsed && (
              <>
                <span className={styles.navLabel}>Profiling Pengguna Jasa</span>
                {profilingOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </>
            )}
          </div>
          {!collapsed && profilingOpen && (
            <div className={styles.subList}>
              <Link
                to="/profiling/hewan"
                className={`${styles.subItem} ${isActive('/profiling/hewan') ? styles.active : ''}`}
              >
                Hewan
              </Link>
              <Link
                to="/profiling/ikan"
                className={`${styles.subItem} ${isActive('/profiling/ikan') ? styles.active : ''}`}
              >
                Ikan
              </Link>
              <Link
                to="/profiling/tumbuhan"
                className={`${styles.subItem} ${isActive('/profiling/tumbuhan') ? styles.active : ''}`}
              >
                Tumbuhan
              </Link>
            </div>
          )}
        </div>

        {/* 6. Anomali Data */}
        <Link
          to="/anomali-data"
          className={`${styles.navItem} ${isParentActive('/anomali') ? styles.active : ''}`}
          title="Anomali Data"
        >
          <AlertTriangle className={styles.navIcon} />
          {!collapsed && <span className={styles.navLabel}>Anomali Data</span>}
        </Link>

        {/* 7. Pengaturan */}
        {isAdmin && (
          <>
            {!collapsed && <div className={styles.navGroupTitle}>MANAJEMEN</div>}
            <Link
              to="/pengaturan"
              className={`${styles.navItem} ${isParentActive('/pengaturan') ? styles.active : ''}`}
              title="Pengaturan Aplikasi"
            >
              <Settings className={styles.navIcon} />
              {!collapsed && <span className={styles.navLabel}>Pengaturan</span>}
            </Link>
          </>
        )}
      </nav>

      {/* Sidebar Footer */}
      <div className={styles.sidebarFooter}>
        <div className={styles.orgLogo} title="Badan Karantina Indonesia - BKHIT Sulawesi Utara">
          <img src="/logo.png" alt="Badan Karantina Indonesia" className={styles.orgLogoImg} />
        </div>
        {!collapsed && (
          <div className={styles.orgInfo}>
            <span className={styles.orgTitle}>Badan Karantina Indonesia</span>
            <span className={styles.orgSub}>BKHIT Sulawesi Utara</span>
          </div>
        )}
      </div>
    </aside>
  );
}
