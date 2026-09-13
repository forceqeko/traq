import { Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from '@/contexts/UserContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DialogProvider } from '@/contexts/DialogContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminGuard from '@/components/auth/AdminGuard';
import DashboardLayout from '@/layouts/DashboardLayout';

// Pages
import LoginPage from '@/pages/login/LoginPage';
import Home from '@/pages/Home';
import DomestikMasuk from '@/pages/lalu-lintas/DomestikMasuk';
import DomestikKeluar from '@/pages/lalu-lintas/DomestikKeluar';
import Ekspor from '@/pages/lalu-lintas/Ekspor';
import Impor from '@/pages/lalu-lintas/Impor';
import KarantinaHewan from '@/pages/karantina/Hewan';
import KarantinaIkan from '@/pages/karantina/Ikan';
import KarantinaTumbuhan from '@/pages/karantina/Tumbuhan';
import Pengaturan from '@/pages/pengaturan/Pengaturan';
import ManajemenData from '@/pages/pengaturan/ManajemenData';
import ColumnMapping from '@/pages/pengaturan/ColumnMapping';
import KustomisasiDashboard from '@/pages/pengaturan/KustomisasiDashboard';
import ManajemenPengguna from '@/pages/pengaturan/ManajemenPengguna';
import Profil from '@/pages/pengaturan/Profil';

import ErrorBoundary from '@/components/common/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <UserProvider>
          <DialogProvider>
            <Routes>
              {/* Public Login Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Dashboard Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/" element={<Home />} />
                  
                  {/* Lalu Lintas (Hyphen & Underscore Route Support) */}
                  <Route path="/lalu-lintas/domestik-masuk" element={<DomestikMasuk />} />
                  <Route path="/lalu-lintas/domestik_masuk" element={<DomestikMasuk />} />
                  <Route path="/lalu_lintas/domestik_masuk" element={<DomestikMasuk />} />
                  <Route path="/lalu_lintas/domestik-masuk" element={<DomestikMasuk />} />

                  <Route path="/lalu-lintas/domestik-keluar" element={<DomestikKeluar />} />
                  <Route path="/lalu-lintas/domestik_keluar" element={<DomestikKeluar />} />
                  <Route path="/lalu_lintas/domestik_keluar" element={<DomestikKeluar />} />
                  <Route path="/lalu_lintas/domestik-keluar" element={<DomestikKeluar />} />

                  <Route path="/lalu-lintas/ekspor" element={<Ekspor />} />
                  <Route path="/lalu_lintas/ekspor" element={<Ekspor />} />

                  <Route path="/lalu-lintas/impor" element={<Impor />} />
                  <Route path="/lalu_lintas/impor" element={<Impor />} />
                  
                  {/* Karantina Komoditas */}
                  <Route path="/karantina/hewan" element={<KarantinaHewan />} />
                  <Route path="/karantina_hewan" element={<KarantinaHewan />} />

                  <Route path="/karantina/ikan" element={<KarantinaIkan />} />
                  <Route path="/karantina_ikan" element={<KarantinaIkan />} />

                  <Route path="/karantina/tumbuhan" element={<KarantinaTumbuhan />} />
                  <Route path="/karantina_tumbuhan" element={<KarantinaTumbuhan />} />
                  
                  {/* Pengaturan / Manajemen */}
                  <Route path="/pengaturan" element={<AdminGuard><Pengaturan /></AdminGuard>} />
                  <Route path="/pengaturan/manajemen-data" element={<AdminGuard><ManajemenData /></AdminGuard>} />
                  <Route path="/pengaturan/column-mapping" element={<AdminGuard><ColumnMapping /></AdminGuard>} />
                  <Route path="/pengaturan/kustomisasi-dashboard" element={<AdminGuard><KustomisasiDashboard /></AdminGuard>} />
                  <Route path="/pengaturan/manajemen-pengguna" element={<ManajemenPengguna />} />
                  <Route path="/pengaturan/profil" element={<Profil />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </DialogProvider>
        </UserProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

