import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./pages/admin/AdminLayout";
import DaftarPemagang from "./components/DaftarPemagang";
import KelolaLokasi from "./components/KelolaLokasi";
import KelolaPembimbing from "./components/KelolaPembimbing";
import KelolaPeriode from "./components/KelolaPeriode";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Absensi from "./pages/Absensi";
import Dashboard from "./pages/Dashboard";
import KelolaAkunPeserta from "./pages/KelolaAkunPeserta";
import LaporanApp from "./pages/LaporanApp";
import LaporanMagang from "./pages/LaporanMagang";
import LaporanModule from "./pages/LaporanModule";
import Pembimbing from "./pages/Pembimbing";
import DashboardPembimbing from "./pages/pembimbing/DashboardPembimbing";
import Periode from "./pages/Periode";
import Penilaian from "./pages/Penilaian";
import Peserta from "./pages/Peserta";
import FormPendaftaran from "./pages/pemagang/FromPendaftaran";
import Rekapitulasi from "./pages/Rekapitulasi";
import Riwayat from "./pages/Riwayat";
import Tugas from "./pages/Tugas";
import { getRoleHome, getStoredUser, normalizeRole } from "./utils/auth";

function ProtectedRoute({ children, allowedRole }) {
    const user = getStoredUser();
    const role = normalizeRole(user?.role);
    const allowedRoles = Array.isArray(allowedRole) ? allowedRole : [allowedRole];

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRole && !allowedRoles.map(normalizeRole).includes(role)) {
        return <Navigate to={getRoleHome(role)} replace />;
    }

    return children;
}

function HomeRedirect() {
    const user = getStoredUser();
    if (!user) return <Navigate to="/beranda" replace />;

    const role = normalizeRole(user.role);
    if (role === "admin") return <Navigate to="/riwayat" replace />;
    if (role === "pembimbing") return <Navigate to="/pembimbing" replace />;
    return <Navigate to="/absensi" replace />;
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/beranda" element={<LandingPage />} />
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/tugas" element={<ProtectedRoute><Tugas /></ProtectedRoute>} />
                <Route path="/absensi" element={<ProtectedRoute><Absensi /></ProtectedRoute>} />
                <Route path="/peserta" element={<ProtectedRoute><Peserta /></ProtectedRoute>} />
                <Route path="/periode" element={<ProtectedRoute allowedRole={["admin", "pembimbing"]}><Periode /></ProtectedRoute>} />
                <Route path="/riwayat" element={<ProtectedRoute><Riwayat /></ProtectedRoute>} />
                <Route path="/akun-peserta" element={<ProtectedRoute allowedRole="admin"><KelolaAkunPeserta /></ProtectedRoute>} />
                <Route path="/kelola-pembimbing" element={<ProtectedRoute allowedRole="admin"><Navigate to="/admin/pembimbing" replace /></ProtectedRoute>} />
                <Route path="/pembimbing" element={<ProtectedRoute allowedRole="pembimbing"><Pembimbing /></ProtectedRoute>} />
                <Route path="/pembimbing/dashboard" element={<ProtectedRoute allowedRole="pembimbing"><DashboardPembimbing /></ProtectedRoute>} />
                <Route path="/pemagang/daftar" element={<ProtectedRoute allowedRole="pemagang"><FormPendaftaran /></ProtectedRoute>} />

                <Route path="/laporan" element={<ProtectedRoute><LaporanModule /></ProtectedRoute>} />
                <Route path="/laporan/penilaian" element={<ProtectedRoute><LaporanModule /></ProtectedRoute>} />
                <Route path="/laporan/rekapitulasi" element={<ProtectedRoute><LaporanModule /></ProtectedRoute>} />
                <Route path="/laporan-magang" element={<ProtectedRoute><LaporanMagang /></ProtectedRoute>} />
                <Route path="/rekapitulasi" element={<ProtectedRoute><Rekapitulasi /></ProtectedRoute>} />
                <Route path="/penilaian" element={<ProtectedRoute><Penilaian /></ProtectedRoute>} />
                <Route path="/laporan-app" element={<ProtectedRoute><LaporanApp /></ProtectedRoute>} />

                <Route
                    path="/admin"
                    element={<ProtectedRoute allowedRole="admin"><AdminLayout /></ProtectedRoute>}
                >
                    <Route index element={<Navigate to="/admin/pendaftaran" replace />} />
                    <Route path="pendaftaran" element={<DaftarPemagang />} />
                    <Route path="periode" element={<KelolaPeriode />} />
                    <Route path="pembimbing" element={<KelolaPembimbing />} />
                    <Route path="lokasi" element={<KelolaLokasi />} />
                    <Route path="*" element={<Navigate to="/admin/pendaftaran" replace />} />
                </Route>

                <Route path="*" element={<Navigate to="/beranda" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
