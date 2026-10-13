import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Modul Auth & Admin & Pendaftaran
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import AdminLayout from "./pages/admin/AdminLayout";
import DaftarPemagang from "./components/DaftarPemagang";
import KelolaPeriode from "./components/KelolaPeriode";
import KelolaPembimbing from "./components/KelolaPembimbing";
import FormPendaftaran from "./pages/pemagang/FromPendaftaran";

// Modul Publik & Fitur Utama
import LandingPage from "./pages/LandingPage";
import Absensi from "./pages/Absensi";
import Dashboard from "./pages/Dashboard";
import Tugas from "./pages/Tugas";
import Pembimbing from "./pages/Pembimbing";
import DashboardPembimbing from "./pages/pembimbing/DashboardPembimbing";
import Periode from "./pages/Periode";
import Peserta from "./pages/Peserta";
import Riwayat from "./pages/Riwayat";
import LaporanModule from "./pages/LaporanModule";
import { getRoleHome, getStoredUser, normalizeRole } from "./utils/auth";

const ProtectedRoute = ({ children, allowedRole }) => {
  const user = getStoredUser();
  const userRole = normalizeRole(user?.role);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && userRole !== normalizeRole(allowedRole)) {
    return <Navigate to={getRoleHome(userRole)} replace />;
  }

  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/beranda" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tugas" element={<Tugas />} />
        <Route path="/absensi" element={<Absensi />} />
        <Route path="/peserta" element={<Peserta />} />
        <Route path="/periode" element={<Periode />} />
        <Route path="/riwayat" element={<Riwayat />} />
        <Route path="/laporan" element={<LaporanModule />} />
        <Route path="/laporan/penilaian" element={<LaporanModule />} />
        <Route path="/laporan/rekapitulasi" element={<LaporanModule />} />

        <Route
          path="/pemagang/daftar"
          element={
            <ProtectedRoute allowedRole="pemagang">
              <FormPendaftaran />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pembimbing"
          element={
            <ProtectedRoute allowedRole="pembimbing">
              <Pembimbing />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pembimbing/dashboard"
          element={
            <ProtectedRoute allowedRole="pembimbing">
              <DashboardPembimbing />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/pendaftaran" replace />} />
          <Route path="pendaftaran" element={<DaftarPemagang />} />
          <Route path="periode" element={<KelolaPeriode />} />
          <Route path="pembimbing" element={<KelolaPembimbing />} />
          <Route path="*" element={<Navigate to="/admin/pendaftaran" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
