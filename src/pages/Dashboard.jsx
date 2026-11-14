import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    Calendar,
    CalendarCheck,
    Download,
    FileCheck2,
    GraduationCap,
    Building2,
    FolderCheck,
    CheckSquare,
    UserCheck,
    BookOpen,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { API_BASE_URL } from "../config/api";
import { normalizeRole } from "../utils/auth";
import "./ParticipantDashboard.css";

const roleNames = {
    admin: "Administrator",
    pembimbing: "Pembimbing",
    pemagang: "Peserta",
};

function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatPeriodDate(value) {
    if (!value) return "-";
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime())
        ? "-"
        : date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function getPhotoUrl(photo) {
    if (!photo) return null;
    if (/^https?:\/\//i.test(photo) || String(photo).startsWith("data:") || String(photo).startsWith("blob:")) return photo;
    const path = String(photo).replace(/^\/+/, "").replace(/^storage\//, "");
    return `${API_BASE_URL.replace(/\/api\/?$/, "")}/storage/${path}`;
}


function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
}

function ParticipantDashboard({ user }) {
    const [currentUser, setCurrentUser] = useState(user);
    const [photoError, setPhotoError] = useState(false);
    const [registration, setRegistration] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [failedSections, setFailedSections] = useState([]);
    const [downloadingLetter, setDownloadingLetter] = useState(false);
    const [downloadMessage, setDownloadMessage] = useState("");

    useEffect(() => {
        setCurrentUser(user);
    }, [user]);

    useEffect(() => {
        setPhotoError(false);
    }, [currentUser?.foto]);

    useEffect(() => {
        const handleProfileUpdated = (event) => {
            if (event.detail?.user) {
                setCurrentUser(event.detail.user);
            }
        };
        window.addEventListener("user-profile-updated", handleProfileUpdated);
        return () => window.removeEventListener("user-profile-updated", handleProfileUpdated);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const loadDashboard = async () => {
            const requests = await Promise.allSettled([
                api.get("/pendaftaran/me"),
                api.get("/absensi-saya"),
                api.get("/tugas"),
                api.get("/v1/laporan-magang"),
                api.get("/me"),
            ]);

            if (cancelled) return;

            const failed = [];
            if (requests[0].status === "fulfilled") {
                const regData = requests[0].value.data?.data || null;
                setRegistration(regData);
                if (regData?.user) {
                    setCurrentUser((prev) => ({ ...prev, ...regData.user }));
                }
            } else {
                failed.push("data magang");
                console.error("Gagal memuat data pendaftaran dashboard:", requests[0].reason);
            }

            if (requests[4]?.status === "fulfilled") {
                const freshUser = requests[4].value.data?.data?.user || requests[4].value.data?.data || requests[4].value.data;
                if (freshUser) {
                    setCurrentUser((prev) => ({ ...prev, ...freshUser }));
                    try {
                        const localUser = JSON.parse(localStorage.getItem("user") || "{}");
                        localStorage.setItem("user", JSON.stringify({ ...localUser, ...freshUser }));
                    } catch {}
                }
            }

            if (requests[1].status === "fulfilled") {
                setAttendance(Array.isArray(requests[1].value.data) ? requests[1].value.data : []);
            } else {
                failed.push("presensi");
                console.error("Gagal memuat presensi dashboard:", requests[1].reason);
            }

            if (requests[2].status === "fulfilled") {
                setTasks(Array.isArray(requests[2].value.data) ? requests[2].value.data : []);
            } else {
                failed.push("tugas");
                console.error("Gagal memuat tugas dashboard:", requests[2].reason);
            }

            if (requests[3].status === "fulfilled") {
                const data = requests[3].value.data?.data;
                setReports(Array.isArray(data) ? data : []);
            } else {
                failed.push("laporan");
                console.error("Gagal memuat laporan dashboard:", requests[3].reason);
            }

            setFailedSections(failed);
            setLoading(false);
        };

        void loadDashboard();
        return () => {
            cancelled = true;
        };
    }, []);

    const todayAttendance = useMemo(
        () => attendance.find((item) => String(item.tanggal || "").slice(0, 10) === getLocalDateKey()) || null,
        [attendance],
    );
    const presentCount = attendance.filter((item) => (
        ["hadir", "zoom", "daring", "wfh"].includes(String(item.status || item.tipe_kehadiran || "").toLowerCase())
    )).length;
    const attendanceRate = attendance.length ? Math.round((presentCount / attendance.length) * 100) : 0;
    const submittedTasks = tasks.filter((task) => Array.isArray(task.submisi) && task.submisi.length > 0).length;
    const latestReport = reports[0] || null;
    const period = registration?.periode;
    const supervisor = registration?.pembimbing;
    const participantCode = currentUser?.nim || currentUser?.magang?.participant_code;
    const institution = registration?.asal_instansi || currentUser?.magang?.institution;
    const periodName = period?.nama_periode || "Periode magang";
    const photoUrl = getPhotoUrl(currentUser?.foto);
    const letterAvailable = Boolean(registration?.file_surat_balasan);

    const handleDownloadReplyLetter = async () => {
        setDownloadingLetter(true);
        setDownloadMessage("");
        try {
            const response = await api.get("/pendaftaran/me/surat-balasan/download", {
                responseType: "blob",
            });
            const url = URL.createObjectURL(response.data);
            const link = document.createElement("a");
            link.href = url;
            link.download = String(registration?.file_surat_balasan || "surat-balasan-magang.pdf").split("/").pop();
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 30000);
            setDownloadMessage("Surat balasan berhasil diunduh.");
        } catch (error) {
            setDownloadMessage(error.response?.status === 404
                ? "Surat balasan belum tersedia. Silakan hubungi admin."
                : "Surat balasan gagal diunduh. Silakan coba lagi.");
        } finally {
            setDownloadingLetter(false);
        }
    };

    const greeting = getGreeting();
    const taskCompletionRate = tasks.length ? Math.round((submittedTasks / tasks.length) * 100) : 0;

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                <main className="main participant-dashboard">
                    {/* 1. HERO PROFILE CARD */}
                    <section className="pd-hero-card">
                        <div className="pd-hero-halo" aria-hidden="true"></div>
                        <div className="pd-hero-content">
                            <div className="pd-hero-main">
                                <div className="pd-avatar-wrap">
                                    <div className="pd-avatar-inner">
                                        {photoUrl && !photoError ? (
                                            <img
                                                src={photoUrl}
                                                alt="Foto Profil"
                                                onError={(e) => {
                                                    const relativeUrl = `/storage/${String(currentUser?.foto || "").replace(/^\/+/, "").replace(/^storage\//, "")}`;
                                                    if (e.currentTarget.dataset.triedRelative !== "true" && e.currentTarget.src !== window.location.origin + relativeUrl) {
                                                        e.currentTarget.dataset.triedRelative = "true";
                                                        e.currentTarget.src = relativeUrl;
                                                    } else {
                                                        setPhotoError(true);
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <span>{String(currentUser?.name || currentUser?.nama || "P").trim().charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="pd-identity">
                                    <div className="pd-greeting-row">
                                        <span className="pd-greeting-subtitle">{greeting},</span>
                                        <span className="pd-status-pill">
                                            <span className="pd-pulse-dot"></span>
                                            {registration?.status || "Peserta Magang"}
                                        </span>
                                    </div>
                                    <h2 className="pd-name">{currentUser?.name || currentUser?.nama || "Peserta"} 👋</h2>
                                    <div className="pd-meta-chips">
                                        {participantCode && (
                                            <span className="pd-chip">
                                                <GraduationCap size={13} /> NIM: {participantCode}
                                            </span>
                                        )}
                                        {currentUser?.program_studi && (
                                            <span className="pd-chip">
                                                <BookOpen size={13} /> {currentUser.program_studi}
                                            </span>
                                        )}
                                        <span className="pd-chip">
                                            <Building2 size={13} /> {institution || "PAM-TECHNO"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="pd-hero-sidebar">
                                <div className="pd-info-box">
                                    <span className="pd-info-label">
                                        <Calendar size={13} /> Periode Magang
                                    </span>
                                    <span className="pd-info-val">
                                        {formatPeriodDate(period?.tanggal_mulai)} – {formatPeriodDate(period?.tanggal_selesai)}
                                    </span>
                                </div>
                                <div className="pd-info-box">
                                    <span className="pd-info-label">
                                        <UserCheck size={13} /> Pembimbing
                                    </span>
                                    <span className="pd-info-val">
                                        {supervisor?.nama || supervisor?.name || "Belum Ditentukan"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 2. STATS CARDS GRID */}
                    <section className="pd-stats-grid" aria-label="Ringkasan Aktivitas Magang">
                        <Link to="/riwayat" className="pd-stat-card">
                            <div className="pd-stat-header">
                                <span className="pd-stat-title">Presensi Kehadiran</span>
                                <div className="pd-stat-icon-wrap blue">
                                    <CalendarCheck size={22} />
                                </div>
                            </div>
                            <div className="pd-stat-main-num">
                                {loading ? "…" : <>{presentCount}<small>/ {attendance.length} Hari</small></>}
                            </div>
                            <div className="pd-stat-progress-bar">
                                <div className="pd-stat-progress-fill blue" style={{ width: `${attendanceRate}%` }}></div>
                            </div>
                            <div className="pd-stat-footer">
                                <span>Tingkat Kehadiran: <strong>{attendanceRate}%</strong></span>
                                <span className={`pd-stat-badge ${todayAttendance ? "green" : "gray"}`}>
                                    {todayAttendance?.status ? `Hari ini: ${todayAttendance.status}` : "Belum Absen"}
                                </span>
                            </div>
                        </Link>

                        <Link to="/tugas" className="pd-stat-card">
                            <div className="pd-stat-header">
                                <span className="pd-stat-title">Tugas Magang</span>
                                <div className="pd-stat-icon-wrap amber">
                                    <CheckSquare size={22} />
                                </div>
                            </div>
                            <div className="pd-stat-main-num">
                                {loading ? "…" : <>{submittedTasks}<small>/ {tasks.length} Selesai</small></>}
                            </div>
                            <div className="pd-stat-progress-bar">
                                <div className="pd-stat-progress-fill amber" style={{ width: `${taskCompletionRate}%` }}></div>
                            </div>
                            <div className="pd-stat-footer">
                                <span>Progres Tugas: <strong>{taskCompletionRate}%</strong></span>
                                <span className={`pd-stat-badge ${tasks.length - submittedTasks > 0 ? "amber" : "green"}`}>
                                    {tasks.length - submittedTasks > 0
                                        ? `${tasks.length - submittedTasks} Belum Selesai`
                                        : "Lengkap ✓"}
                                </span>
                            </div>
                        </Link>

                        <Link to="/laporan" className="pd-stat-card">
                            <div className="pd-stat-header">
                                <span className="pd-stat-title">Laporan Akhir</span>
                                <div className="pd-stat-icon-wrap purple">
                                    <FolderCheck size={22} />
                                </div>
                            </div>
                            <div className="pd-stat-main-num">
                                <span style={{ fontSize: "20px" }}>
                                    {loading ? "…" : latestReport?.status_laporan || "Belum Ada"}
                                </span>
                            </div>
                            <div className="pd-stat-progress-bar">
                                <div
                                    className="pd-stat-progress-fill purple"
                                    style={{
                                        width: String(latestReport?.status_laporan || "").toLowerCase() === "disetujui" ? "100%" : latestReport ? "60%" : "0%",
                                    }}
                                ></div>
                            </div>
                            <div className="pd-stat-footer">
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {latestReport?.judul_laporan || "Unggah laporan magang"}
                                </span>
                                <span className="pd-stat-badge green">
                                    Buka →
                                </span>
                            </div>
                        </Link>
                    </section>

                    {/* 3. SURAT BALASAN NOTIFICATION BANNER */}
                    <section className="pd-letter-banner">
                        <div className="pd-letter-left">
                            <div className="pd-letter-icon-box">
                                <FileCheck2 size={24} />
                            </div>
                            <div className="pd-letter-text">
                                <h4>
                                    Surat Balasan Penerimaan Magang
                                    <span className={`pd-stat-badge ${letterAvailable ? "green" : "amber"}`}>
                                        {letterAvailable ? "Resmi Diterbitkan" : "Belum Tersedia"}
                                    </span>
                                </h4>
                                <p>
                                    {letterAvailable
                                        ? `Surat balasan resmi untuk ${periodName} telah tersedia dan dapat diunduh untuk kebutuhan instansi/kampus Anda.`
                                        : "Surat balasan resmi belum diunggah oleh administrator."}
                                </p>
                                {downloadMessage && <small style={{ color: "#166534", marginTop: "4px", display: "block" }}>{downloadMessage}</small>}
                            </div>
                        </div>
                        <button
                            type="button"
                            className="pd-btn-download"
                            onClick={handleDownloadReplyLetter}
                            disabled={!letterAvailable || downloadingLetter}
                        >
                            <Download size={15} />
                            {downloadingLetter ? "Mengunduh..." : "Unduh Surat Balasan"}
                        </button>
                    </section>

                    {failedSections.length > 0 && (
                        <p className="participant-dashboard-notice" role="status" style={{ marginTop: "20px" }}>
                            Sebagian ringkasan belum dapat dimuat ({failedSections.join(", ")}). Muat ulang halaman atau coba lagi nanti.
                        </p>
                    )}
                </main>
            </div>
        </div>
    );
}

function Dashboard() {
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    });

    useEffect(() => {
        const handleProfileUpdated = (event) => {
            if (event.detail?.user) {
                setUser(event.detail.user);
            }
        };
        window.addEventListener("user-profile-updated", handleProfileUpdated);
        return () => window.removeEventListener("user-profile-updated", handleProfileUpdated);
    }, []);

    useEffect(() => {
        let cancelled = false;
        if (!localStorage.getItem("token")) return undefined;

        api.get("/me")
            .then((response) => {
                if (cancelled) return;
                const freshUser = response.data?.data?.user || response.data?.data || response.data;
                if (freshUser) {
                    localStorage.setItem("user", JSON.stringify(freshUser));
                    setUser(freshUser);
                }
            })
            .catch((error) => {
                console.error("Gagal memuat profil dashboard:", error);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const role = normalizeRole(user?.role);
    const isParticipant = role === "pemagang";
    if (isParticipant) return <ParticipantDashboard user={user} />;

    const displayName = user?.name || user?.nama || "Pengguna";
    const description = role === "pembimbing"
        ? "Pantau kehadiran peserta magang dan validasi status harian."
        : "Kelola periode, tugas, dan data absensi peserta magang.";
    const managementLinks = role === "admin"
        ? [
            { to: "/akun-peserta", icon: "👤", title: "Akun Peserta", description: "Lihat akun peserta dan NPM terkait." },
            { to: "/periode", icon: "🗓️", title: "Periode Magang", description: "Kelola periode dan peserta magang." },
            { to: "/tugas", icon: "📋", title: "Tugas Magang", description: "Kelola tugas dan evaluasi submisi." },
            { to: "/riwayat", icon: "📅", title: "Absensi & Riwayat", description: "Pantau rekapitulasi data kehadiran." },
        ]
        : [
            { to: "/riwayat", icon: "📅", title: "Absensi Magang", description: "Pantau kehadiran peserta." },
            { to: "/periode", icon: "🗓️", title: "Periode Magang", description: "Lihat periode peserta magang." },
            { to: "/tugas", icon: "📋", title: "Tugas Magang", description: "Periksa dan nilai submisi tugas." },
            { to: "/laporan", icon: "📁", title: "Laporan Magang", description: "Tinjau laporan peserta." },
        ];

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                <Navbar />
                <main className="main">
                    <h1>{role === "admin" ? "Dashboard Administrator" : "Dashboard Pembimbing"}</h1>
                    <p className="subtitle">Ringkasan {roleNames[role] || "Pengguna"}</p>

                    <div className="welcome-card">
                        <div>
                            <h2>Halo, {displayName} 👋</h2>
                            <p>{description}</p>
                        </div>
                    </div>

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
