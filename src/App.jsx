import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Absensi from "./pages/Absensi";
import Dashboard from "./pages/Dashboard";
import Tugas from "./pages/Tugas";
import Periode from "./pages/Periode";
import Peserta from "./pages/Peserta";
import Riwayat from "./pages/Riwayat";
import KelolaAkunPeserta from "./pages/KelolaAkunPeserta";

function HomeRedirect() {
    let role = null;

    try {
        role = JSON.parse(localStorage.getItem("user") || "null")?.role || null;
    } catch {
        // Fallback if data is corrupted
    }

    if (!role) {
        return <Navigate to="/beranda" replace />;
    }

    if (role.toLowerCase() === "admin") {
        return <Navigate to="/riwayat" replace />;
    }

    if (role.toLowerCase() === "pembimbing") {
        return <Navigate to="/pembimbing" replace />;
    }

    return <Navigate to="/absensi" replace />;
}

function DashboardRedirect() {
    let role = null;

    try {
        role = JSON.parse(localStorage.getItem("user") || "null")?.role || null;
    } catch {
        // Keep the participant dashboard as the fallback.
    }

    if (role?.toLowerCase() === "admin") {
        return <Navigate to="/riwayat" replace />;
    }

    return role?.toLowerCase() === "pembimbing"
        ? <Navigate to="/pembimbing" replace />
        : <Dashboard />;
}

function PembimbingGuard() {
    let role = null;
    try {
        role = JSON.parse(localStorage.getItem("user") || "null")?.role || null;
    } catch {
        // Fallback
    }

    const normalizedRole = role?.toLowerCase();
    if (normalizedRole === "admin") {
        return <Navigate to="/riwayat" replace />;
    }

    if (normalizedRole === "pembimbing") {
        return <Riwayat />;
    }

    return <Navigate to={normalizedRole === "peserta" ? "/absensi" : "/login"} replace />;
}

function AdminGuard() {
    let role = null;
    try {
        role = JSON.parse(localStorage.getItem("user") || "null")?.role || null;
    } catch {
        // Fallback
    }

    const normalizedRole = role?.toLowerCase();
    const destination = normalizedRole === "admin"
        ? "/riwayat"
        : normalizedRole === "pembimbing"
            ? "/pembimbing"
            : normalizedRole === "peserta"
                ? "/absensi"
                : "/login";

    return <Navigate to={destination} replace />;
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/beranda" element={<LandingPage />} />
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<DashboardRedirect />} />
                <Route path="/tugas" element={<Tugas />} />
                <Route path="/absensi" element={<Absensi />} />
                <Route path="/peserta" element={<Peserta />} />
                <Route path="/pembimbing" element={<PembimbingGuard />} />
                <Route path="/kelola-pembimbing" element={<AdminGuard />} />
                <Route path="/akun-peserta" element={<KelolaAkunPeserta />} />
                <Route path="/periode" element={<Periode />} />

                <Route path="/riwayat" element={<Riwayat />} />
                <Route path="*" element={<Navigate to="/beranda" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;