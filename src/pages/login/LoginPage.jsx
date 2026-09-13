import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useDialog } from '@/contexts/DialogContext';
import TradeRouteAnimation from './TradeRouteAnimation';
import styles from './login.module.css';
import { LogIn, Lock, User, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser, setProfile } = useUser();
  const { showLoading, hideLoading, showAlert } = useDialog();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const cleanUsername = username.trim().toLowerCase().replace(/@.*$/, '');

    if (!cleanUsername || !password) {
      showAlert({
        title: 'Formulir Belum Lengkap',
        message: 'Silakan isi username dan kata sandi Anda.',
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    showLoading('Memverifikasi kredensial akun...');

    // Email internal terstandarisasi @podqes.web.id
    const authEmail = `${cleanUsername}@podqes.web.id`;

    try {
      const supabase = createClient();
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (loginError) {
        hideLoading();
        let userFacingError = 'Username atau kata sandi tidak sesuai.';
        if (loginError.message?.toLowerCase().includes('email not confirmed')) {
          userFacingError = 'Akun belum dikonfirmasi. Hubungi Administrator untuk verifikasi akun.';
        } else if (loginError.message?.toLowerCase().includes('invalid login credentials')) {
          userFacingError = 'Username atau kata sandi tidak sesuai. Silakan periksa kembali kredensial Anda.';
        }

        setError(userFacingError);
        showAlert({
          title: 'Gagal Masuk',
          message: userFacingError,
          type: 'error',
        });
        setLoading(false);
        return;
      }

      if (data?.user) {
        setUser(data.user);
        // Ambil data profil dari tabel profiles
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        const userRole = prof?.role || data.user.user_metadata?.role || 'petugas';
        const userFullName = prof?.full_name || data.user.user_metadata?.full_name || cleanUsername;

        setProfile(
          prof || {
            id: data.user.id,
            email: authEmail,
            username: cleanUsername,
            full_name: userFullName,
            role: userRole,
          }
        );
      }

      showLoading('Berhasil masuk! Memuat dashboard...');
      setTimeout(() => {
        hideLoading();
        navigate('/');
      }, 400);
    } catch (err) {
      hideLoading();
      const fallbackMsg = 'Gagal menghubungkan ke server autentikasi. Silakan periksa koneksi jaringan Anda.';
      setError(fallbackMsg);
      showAlert({
        title: 'Koneksi Terputus',
        message: fallbackMsg,
        type: 'error',
      });
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      {/* ================= SISI KIRI: BRAND & ANIMASI PETA ================= */}
      <div className={styles.infoColumn}>
        {/* Header Identitas Brand */}
        <div className={styles.brandHeader}>
          <div className={styles.logoBadge}>T</div>
          <div>
            <div className={styles.brandTitle}>TRAQ</div>
            <div className={styles.brandSubtitle}>BKHIT Sulawesi Utara</div>
          </div>
        </div>

        {/* Animasi Peta Jalur Perdagangan */}
        <div className={styles.animationArea}>
          <h1 className={styles.animHeadline}>
            Monitoring Arus Lalu Lintas Komoditas Karantina
          </h1>
          <div className={styles.mapContainer}>
            <TradeRouteAnimation />
          </div>
          <p className={styles.animCaption}>
            Visualisasi arus lalu lintas komoditas karantina hewan, ikan, dan tumbuhan wilayah Sulawesi Utara
          </p>
        </div>

        {/* Footer Institusi */}
        <div className={styles.infoFooter}>
          <ShieldCheck size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span>Badan Karantina Indonesia, Balai Karantina Hewan, Ikan, dan Tumbuhan Sulawesi Utara</span>
        </div>
      </div>

      {/* ================= SISI KANAN: FORMULIR AUTENTIKASI ================= */}
      <div className={styles.formColumn}>
        <div className={styles.formCard}>
          {/* Header Kartu Login */}
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Masuk ke Akun</h2>
            <p className={styles.formSubtitle}>
              Masukkan username dan kata sandi yang telah terdaftar untuk mengakses dashboard
            </p>
          </div>

          {/* Form Login */}
          <form onSubmit={handleLogin} className={styles.form} noValidate>
            {error && (
              <div className={styles.errorBox} role="alert">
                {error}
              </div>
            )}

            {/* Input Username */}
            <div className="form-group">
              <label className="form-label" htmlFor="login-username" style={{ fontWeight: 600 }}>
                Username <span style={{ color: 'var(--status-danger)' }}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <div className={styles.inputIcon}>
                  <User size={18} />
                </div>
                <input
                  id="login-username"
                  type="text"
                  className={styles.inputField}
                  placeholder="Contoh: admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Input Kata Sandi */}
            <div className="form-group">
              <label className="form-label" htmlFor="login-password" style={{ fontWeight: 600 }}>
                Kata Sandi <span style={{ color: 'var(--status-danger)' }}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <div className={styles.inputIcon}>
                  <Lock size={18} />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={styles.inputField}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className={styles.togglePasswordBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
                  aria-label={showPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Tombol Submit */}
            <button
              type="submit"
              className={`btn btn-primary ${styles.submitBtn}`}
              disabled={loading}
            >
              {loading ? (
                <span>Memverifikasi Kredensial...</span>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Masuk ke Aplikasi</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Hak Cipta & Info Model Tertutup */}
          <div className={styles.formFooter}>
            <span>Akses Tertutup: Pendaftaran akun baru dikelola oleh Administrator.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
