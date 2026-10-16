import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";

const roleNames = {
    admin: "Administrator",
    pembimbing: "Pembimbing",
    peserta: "Peserta",
    pemagang: "Peserta",
};

function Dashboard() {
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    });
    const [absensi, setAbsensi] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                if (!user && localStorage.getItem("token")) {
                    const response = await api.get("/me");
                    const currentUser = response.data?.data?.user || response.data?.data || response.data;
                    localStorage.setItem("user", JSON.stringify(currentUser));
                    setUser(currentUser);
                }

                const role = String(user?.role || "").toLowerCase();
                if (!localStorage.getItem("token") || !["peserta", "pemagang"].includes(role)) {
                    return;
                }

                const response = await api.get("/absensi-saya");
                const today = new Date().toISOString().split("T")[0];
                setAbsensi(response.data.find((item) => item.tanggal === today) || null);
            } catch (error) {
                console.error("Gagal memuat data dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user]);

    const role = String(user?.role || "peserta").toLowerCase();
    const isParticipant = role === "peserta" || role === "pemagang";
    const displayName = user?.name || user?.nama || "Pengguna";
    const description = role === "pembimbing"
        ? "Pantau kehadiran peserta magang dan validasi status harian."
        : role === "admin"
            ? "Kelola periode, tugas, dan data absensi peserta magang."
            : "Silakan lakukan absensi sesuai kegiatan magang yang sedang berjalan.";

    const managementLinks = role === "admin"
        ? [
            { to: "/akun-peserta", icon: "👤", title: "Akun Peserta", description: "Lihat akun peserta dan NPM terkait." },
            { to: "/periode", icon: "🗓️", title: "Periode Magang", description: "Kelola periode dan peserta magang." },
            { to: "/tugas", icon: "📋", title: "Tugas Magang", description: "Kelola tugas dan evaluasi submisi." },
            { to: "/riwayat", icon: "📅", title: "Absensi & Riwayat", description: "Pantau rekapitulasi data kehadiran." },
        ]
        : role === "pembimbing"
            ? [
                { to: "/riwayat", icon: "📅", title: "Absensi Magang", description: "Pantau kehadiran peserta." },
                { to: "/periode", icon: "🗓️", title: "Periode Magang", description: "Lihat periode peserta magang." },
                { to: "/tugas", icon: "📋", title: "Tugas Magang", description: "Periksa dan nilai submisi tugas." },
                { to: "/laporan", icon: "📁", title: "Laporan Magang", description: "Tinjau laporan peserta." },
            ]
            : [
                { to: "/absensi", icon: "📅", title: "Absensi Hari Ini", description: "Catat kehadiran magang." },
                { to: "/tugas", icon: "📋", title: "Tugas Magang", description: "Lihat tugas dan status pengumpulan." },
                { to: "/laporan", icon: "📁", title: "Laporan Magang", description: "Lihat dan kelola laporan magang." },
                { to: "/pemagang/daftar", icon: "👥", title: "Pendaftaran Magang", description: "Lihat status pendaftaran magang." },
            ];

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                <Navbar />
                <main className="main">
                    <h1>{role === "admin" ? "Dashboard Administrator" : role === "pembimbing" ? "Dashboard Pembimbing" : "Dashboard"}</h1>
                    <p className="subtitle">Ringkasan {roleNames[role] || "Pengguna"}</p>

                    <div className="welcome-card">
                        <div>
                            <h2>Halo, {displayName} 👋</h2>
                            <p>{description}</p>
                        </div>
                        {isParticipant && (
                            <div className="status-box">
                                <span>Status Hari Ini</span>
                                <strong className={absensi?.status === "Hadir" ? "hadir" : "tidak-hadir"}>
                                    {loading ? "Memuat..." : absensi?.status || "Tidak Hadir"}
                                </strong>
                            </div>
                        )}
                    </div>

                    {isParticipant && !loading && (
                        <div className="stats">
                            <div className="stat-card">
                                <span>📥</span>
                                <div><small>Jam Masuk</small><h2>{absensi?.jam_masuk || "-"}</h2></div>
                            </div>
                            <div className="stat-card">
                                <span>📤</span>
                                <div><small>Jam Pulang</small><h2>{absensi?.jam_pulang || "-"}</h2></div>
                            </div>
                            <div className="stat-card">
                                <span>📌</span>
                                <div><small>Status</small><h2>{absensi?.status || "Tidak Hadir"}</h2></div>
                            </div>
                        </div>
                    )}

                    <div className="management-links">
                        {managementLinks.map((item) => (
                            <Link key={item.to} to={item.to} className="management-link">
                                <span className="management-icon">{item.icon}</span>
                                <span>
                                    <strong>{item.title}</strong>
                                    <small>{item.description}</small>
                                </span>
                                <span className="management-arrow">→</span>
                            </Link>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Dashboard;
