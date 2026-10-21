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
    const [downloadingLetter, setDownloadingLetter] = useState(false);

    const handleDownloadReplyLetter = async () => {
        setDownloadingLetter(true);
        try {
            const response = await api.get('/pendaftaran/me/surat-balasan/download', {
                responseType: 'blob',
            });
            const url = URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'surat-balasan-magang.pdf';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 30000);
            alert("Surat balasan berhasil diunduh.");
        } catch (downloadError) {
            alert(downloadError.response?.status === 404
                ? "Berkas surat balasan belum tersedia di server. Silakan hubungi admin."
                : "Gagal mengunduh surat balasan. Silakan coba lagi.");
        } finally {
            setDownloadingLetter(false);
        }
    };

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

                    {isParticipant && (
                        <div
                            style={{
                                background: "#ffffff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "12px",
                                padding: "20px",
                                marginBottom: "24px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: "16px",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                <div style={{ fontSize: "28px" }}>📄</div>
                                <div>
                                    <strong style={{ display: "block", color: "#0f172a", fontSize: "15px" }}>Surat Balasan Penerimaan Magang</strong>
                                    <span style={{ color: "#64748b", fontSize: "13px" }}>Unduh berkas surat balasan resmi sebagai bukti penerimaan magang aktif Anda.</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleDownloadReplyLetter}
                                disabled={downloadingLetter}
                                style={{
                                    background: "#16a34a",
                                    color: "#ffffff",
                                    padding: "10px 18px",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontWeight: "600",
                                    cursor: downloadingLetter ? "wait" : "pointer",
                                    fontSize: "13px",
                                    boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {downloadingLetter ? "Mengunduh..." : "📥 Unduh Surat Balasan"}
                            </button>
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
