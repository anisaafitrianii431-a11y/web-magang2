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
    Globe,
    ArrowUpRight,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { API_BASE_URL } from "../config/api";
import { normalizeRole } from "../utils/auth";
import FormKomentar from "../components/landing/FormKomentar";
import ListKomentar from "../components/landing/ListKomentar";
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
    const [photoErrorSource, setPhotoErrorSource] = useState(null);
    const [registration, setRegistration] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [failedSections, setFailedSections] = useState([]);
    const [downloadingLetter, setDownloadingLetter] = useState(false);
    const [downloadMessage, setDownloadMessage] = useState("");
    const [refreshKomentar, setRefreshKomentar] = useState(0);

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
                    } catch (error) {
                        console.error("Gagal menyimpan profil dashboard ke penyimpanan lokal:", error);
                    }
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
    const photoSource = currentUser?.foto || null;
    const photoUrl = getPhotoUrl(photoSource);
    const photoError = photoSource !== null && photoErrorSource === photoSource;
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
        <div className="layout participant-panel">
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
                                                        setPhotoErrorSource(photoSource);
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
                                <div className="pd-hero-sidebar-row">
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
                                <Link
                                    to="/"
                                    className="pd-hero-landing-btn"
                                    title="Kunjungi Landing Page Utama (Portal Publik)"
                                >
                                    <div className="pd-hero-landing-btn-icon">
                                        <Globe size={18} />
                                    </div>
                                    <div className="pd-hero-landing-btn-body">
                                        <span className="pd-hero-landing-btn-label">Halaman Utama</span>
                                        <span className="pd-hero-landing-btn-title">Landing Page</span>
                                    </div>
                                    <ArrowUpRight size={16} className="pd-hero-landing-btn-arrow" />
                                </Link>
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

                    <section className="pd-review-section" id="ulasan-peserta">
                        <div className="pd-review-heading">
                            <h2>Ulasan & Rating</h2>
                            <p>Bagikan pengalaman Anda selama menggunakan portal magang.</p>
                        </div>
                        <div className="komentar-wrapper">
                            <FormKomentar onCommentAdded={() => setRefreshKomentar((value) => value + 1)} />
                            <ListKomentar refreshTrigger={refreshKomentar} />
                        </div>
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

/* ─── Stacked Bar Chart Component (per hari, per periode) ───────────── */
const PERIODE_COLORS = [
    "#6366f1", "#f43f5e", "#14b8a6", "#f59e0b",
    "#8b5cf6", "#0ea5e9", "#84cc16", "#ec4899",
];

function StackedBarChart({ data, periodeNames, loading }) {
    const [tooltip, setTooltip] = useState(null);
    const [range, setRange] = useState(60);
    const [animated, setAnimated] = useState(false);

    useEffect(() => {
        if (!loading && data.length > 0) {
            const t = setTimeout(() => setAnimated(true), 60);
            return () => clearTimeout(t);
        }
    }, [loading, data, range]);

    if (loading) {
        return <div className="admin-chart-loading">Memuat data grafik…</div>;
    }
    if (data.length === 0) {
        return <div className="admin-chart-empty">Belum ada data absensi untuk ditampilkan.</div>;
    }

    // Filter ke N hari terakhir
    const filtered = data.slice(-range);

    // ── Chart geometry ──────────────────────────────────────────────────
    const BAR_W   = 14;
    const BAR_GAP = 3;
    const PAD     = { top: 28, right: 24, bottom: 54, left: 46 };
    const H       = 280;
    const innerH  = H - PAD.top - PAD.bottom;
    const totalW  = PAD.left + filtered.length * (BAR_W + BAR_GAP) - BAR_GAP + PAD.right;
    const W       = Math.max(600, totalW);

    // Max stacked total value
    const maxVal = Math.max(
        ...filtered.map((d) => periodeNames.reduce((s, n) => s + (d.periodes[n] || 0), 0)),
        1
    );
    const yMax   = Math.ceil(maxVal / 2) * 2 || 2;
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * yMax));
    const toY    = (v) => PAD.top + innerH - (v / yMax) * innerH;
    const toBarX = (i) => PAD.left + i * (BAR_W + BAR_GAP);

    // Color map per periode name
    const colorMap = Object.fromEntries(
        periodeNames.map((name, i) => [name, PERIODE_COLORS[i % PERIODE_COLORS.length]])
    );

    // Label X: show every 7 days (or 3 if 30-day)
    const labelEvery = filtered.length > 30 ? 7 : filtered.length > 14 ? 3 : 1;

    // Format tanggal: "2026-08-15" → "15/8"
    const fmtDay = (s) => {
        const d = new Date(`${s}T00:00:00`);
        return `${d.getDate()}/${d.getMonth() + 1}`;
    };

    // Format tanggal panjang untuk tooltip
    const fmtFull = (s) => {
        const d = new Date(`${s}T00:00:00`);
        return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    };

    return (
        <div className="svg-chart-wrap">
            {/* Range filter buttons */}
            <div className="chart-range-filter">
                <span className="chart-range-label">Tampilkan:</span>
                {[30, 60, 90].map((r) => (
                    <button
                        key={r}
                        type="button"
                        className={`chart-range-btn${range === r ? " active" : ""}`}
                        onClick={() => setRange(r)}
                    >
                        {r} Hari
                    </button>
                ))}
            </div>

            {/* Scrollable SVG container */}
            <div className="stacked-bar-scroll">
                <svg
                    width={W}
                    height={H}
                    viewBox={`0 0 ${W} ${H}`}
                    style={{ display: "block", minWidth: W }}
                    aria-label="Grafik pemagang aktif per hari per periode"
                >
                    <defs>
                    {periodeNames.map((name, i) => (
                        <linearGradient key={name} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={PERIODE_COLORS[i % PERIODE_COLORS.length]} stopOpacity="1" />
                            <stop offset="100%" stopColor={PERIODE_COLORS[i % PERIODE_COLORS.length]} stopOpacity="0.72" />
                        </linearGradient>
                    ))}
                    <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#1e293b" floodOpacity="0.18" />
                    </filter>
                    <clipPath id="barReveal">
                        <rect
                            x={PAD.left}
                            y={animated ? PAD.top - 4 : PAD.top + innerH}
                            width={W - PAD.left - PAD.right + 4}
                            height={animated ? innerH + 8 : 0}
                            style={{ transition: "y .9s cubic-bezier(.22,.61,.36,1), height .9s cubic-bezier(.22,.61,.36,1)" }}
                        />
                    </clipPath>
                </defs>

                    {/* Y-axis grid lines + labels */}
                    {yTicks.map((tick) => {
                        const y = toY(tick);
                        return (
                            <g key={tick}>
                                <line
                                    x1={PAD.left} y1={y}
                                    x2={W - PAD.right} y2={y}
                                    stroke={tick === 0 ? "#cbd5e1" : "#eef2f7"}
                                    strokeWidth={tick === 0 ? "1.2" : "1"}
                                    strokeDasharray={tick === 0 ? "none" : "4 5"}
                                />
                                <text
                                    x={PAD.left - 8} y={y + 4}
                                    textAnchor="end" fontSize="11"
                                    fill="#94a3b8"
                                    fontFamily="'Plus Jakarta Sans', sans-serif"
                                    fontWeight="600"
                                >
                                    {tick}
                                </text>
                            </g>
                        );
                    })}

                    {/* Y-axis title */}
                    <text
                        transform={`translate(12, ${PAD.top + innerH / 2}) rotate(-90)`}
                        textAnchor="middle" fontSize="10"
                        fill="#94a3b8"
                        fontFamily="'Plus Jakarta Sans', sans-serif"
                        fontWeight="600"
                    >
                        Pemagang Aktif
                    </text>

                    {/* Stacked bars */}
                    <g clipPath="url(#barReveal)" filter="url(#barShadow)">
                    {filtered.map((d, i) => {
                        const barX    = toBarX(i);
                        const total   = periodeNames.reduce((s, n) => s + (d.periodes[n] || 0), 0);
                        const prevTot = i > 0
                            ? periodeNames.reduce((s, n) => s + (filtered[i - 1].periodes[n] || 0), 0)
                            : 0;
                        const isSpike = i > 0 && prevTot > 0 && (total - prevTot) / prevTot >= 0.2;
                        const isHovered = tooltip?.i === i;

                        // Build segments bottom-up
                        let yAcc = PAD.top + innerH; // baseline
                        const segs = periodeNames
                            .map((name, pi) => {
                                const val  = d.periodes[name] || 0;
                                if (val === 0) return null;
                                const segH = (val / yMax) * innerH;
                                yAcc -= segH;
                                return { name, pi, val, x: barX, y: yAcc, h: segH };
                            })
                            .filter(Boolean);

                        const topSeg = segs[segs.length - 1]; // topmost segment for spike marker

                        return (
                            <g
                                key={d.tanggal}
                                onMouseEnter={() => setTooltip({ i, x: barX + BAR_W / 2, total, d })}
                                onMouseLeave={() => setTooltip(null)}
                                style={{ cursor: "pointer" }}
                            >
                                {/* Hover highlight background */}
                                {isHovered && (
                                    <rect
                                        x={barX - 3} y={PAD.top}
                                        width={BAR_W + 6} height={innerH}
                                        fill="#eef2ff" rx="4"
                                    />
                                )}

                                {/* Segments */}
                                {segs.map((seg, si) => (
                                    <rect
                                        key={seg.name}
                                        x={seg.x} y={seg.y}
                                        width={BAR_W} height={seg.h}
                                        fill={`url(#barGrad${seg.pi})`}
                                        rx={si === segs.length - 1 ? "3" : "0"}
                                        ry={si === segs.length - 1 ? "3" : "0"}
                                        style={{
                                            opacity: isHovered ? 1 : 0.94,
                                            transition: "opacity .15s",
                                        }}
                                    />
                                ))}

                                {/* Spike marker badge */}
                                {isSpike && topSeg && (
                                    <g>
                                        <rect
                                            x={barX + BAR_W / 2 - 7}
                                            y={topSeg.y - 16}
                                            width={14} height={12}
                                            rx="6"
                                            fill="#f43f5e"
                                        />
                                        <text
                                            x={barX + BAR_W / 2}
                                            y={topSeg.y - 7}
                                            textAnchor="middle" fontSize="8"
                                            fill="#fff" fontWeight="800"
                                            fontFamily="'Plus Jakarta Sans', sans-serif"
                                        >
                                            ↑
                                        </text>
                                    </g>
                                )}
                            </g>
                        );
                    })}
                    </g>

                    {/* X-axis date labels */}
                    {filtered.map((d, i) => {
                        if (i % labelEvery !== 0 && i !== filtered.length - 1) return null;
                        return (
                            <g key={i}>
                                <line
                                    x1={toBarX(i) + BAR_W / 2}
                                    y1={PAD.top + innerH}
                                    x2={toBarX(i) + BAR_W / 2}
                                    y2={PAD.top + innerH + 5}
                                    stroke="#cbd5e1"
                                    strokeWidth="1"
                                />
                                <text
                                    x={toBarX(i) + BAR_W / 2}
                                    y={PAD.top + innerH + 18}
                                    textAnchor="middle" fontSize="10"
                                    fill="#64748b"
                                    fontFamily="'Plus Jakarta Sans', sans-serif"
                                    fontWeight="600"
                                >
                                    {fmtDay(d.tanggal)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Tooltip */}
                    {tooltip !== null && (() => {
                        const activePeriodes = periodeNames.filter(
                            (n) => (tooltip.d.periodes[n] || 0) > 0
                        );
                        const tw = 168;
                        const lineH = 18;
                        const th = 26 + activePeriodes.length * lineH + 22;
                        const barX = toBarX(tooltip.i);
                        const topY = toY(tooltip.total);
                        const tx = Math.min(
                            Math.max(barX + BAR_W / 2 - tw / 2, PAD.left),
                            W - PAD.right - tw
                        );
                        const ty = Math.max(topY - th - 12, PAD.top);
                        const prevTot = tooltip.i > 0
                            ? periodeNames.reduce((s, n) => s + (filtered[tooltip.i - 1].periodes[n] || 0), 0)
                            : 0;
                        const diff = tooltip.total - prevTot;
                        const pctChange = prevTot > 0 ? Math.round((diff / prevTot) * 100) : null;

                        return (
                            <g style={{ pointerEvents: "none" }}>
                                {/* Shadow */}
                                <rect x={tx + 2} y={ty + 3} width={tw} height={th}
                                    rx="12" fill="rgba(15,23,42,0.18)" />
                                {/* Body */}
                                <rect x={tx} y={ty} width={tw} height={th}
                                    rx="12" fill="#0f172a" />
                                {/* Accent top bar */}
                                <rect x={tx} y={ty} width={tw} height={3}
                                    rx="1.5" fill="url(#tipAccent)" />
                                <defs>
                                    <linearGradient id="tipAccent" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#6366f1" />
                                        <stop offset="100%" stopColor="#0ea5e9" />
                                    </linearGradient>
                                </defs>
                                {/* Date label */}
                                <text
                                    x={tx + tw / 2} y={ty + 18}
                                    textAnchor="middle" fontSize="11"
                                    fill="#94a3b8"
                                    fontFamily="'Plus Jakarta Sans', sans-serif"
                                    fontWeight="600"
                                >
                                    {fmtFull(tooltip.d.tanggal)}
                                </text>
                                {/* Per-periode rows */}
                                {activePeriodes.map((name, ri) => (
                                    <g key={name}>
                                        <rect
                                            x={tx + 12} y={ty + 26 + ri * lineH}
                                            width={10} height={10}
                                            rx="3" fill={colorMap[name]}
                                        />
                                        <text
                                            x={tx + 28} y={ty + 34 + ri * lineH}
                                            fontSize="11" fill="#e2e8f0"
                                            fontFamily="'Plus Jakarta Sans', sans-serif"
                                        >
                                            {name}
                                        </text>
                                        <text
                                            x={tx + tw - 12} y={ty + 34 + ri * lineH}
                                            textAnchor="end" fontSize="11" fontWeight="700" fill="#fff"
                                            fontFamily="'Plus Jakarta Sans', sans-serif"
                                        >
                                            {tooltip.d.periodes[name]}
                                        </text>
                                    </g>
                                ))}
                                {/* Divider */}
                                <line
                                    x1={tx + 12} y1={ty + 26 + activePeriodes.length * lineH + 2}
                                    x2={tx + tw - 12} y2={ty + 26 + activePeriodes.length * lineH + 2}
                                    stroke="#334155" strokeWidth="1"
                                />
                                {/* Total + change */}
                                <text
                                    x={tx + 12}
                                    y={ty + 26 + activePeriodes.length * lineH + 18}
                                    fontSize="11" fill="#94a3b8"
                                    fontFamily="'Plus Jakarta Sans', sans-serif"
                                >
                                    Total
                                </text>
                                <text
                                    x={tx + tw - 12}
                                    y={ty + 26 + activePeriodes.length * lineH + 18}
                                    textAnchor="end" fontSize="13"
                                    fontWeight="700" fill="#fff"
                                    fontFamily="'Plus Jakarta Sans', sans-serif"
                                >
                                    {tooltip.total}
                                </text>
                                {pctChange !== null && (
                                    <text
                                        x={tx + tw / 2}
                                        y={ty + th - 8}
                                        textAnchor="middle" fontSize="10"
                                        fontWeight="700"
                                        fill={diff >= 0 ? "#34d399" : "#f87171"}
                                        fontFamily="'Plus Jakarta Sans', sans-serif"
                                    >
                                        {diff >= 0 ? "▲" : "▼"} {Math.abs(pctChange)}% vs hari sebelumnya
                                    </text>
                                )}
                            </g>
                        );
                    })()}
                </svg>
            </div>

            {/* Legend */}
            <div className="svg-chart-legend">
                {periodeNames.map((name, i) => (
                    <span key={name} className="svg-legend-item">
                        <span
                            className="svg-legend-swatch"
                            style={{
                                background: `linear-gradient(180deg, ${PERIODE_COLORS[i % PERIODE_COLORS.length]} 0%, ${PERIODE_COLORS[i % PERIODE_COLORS.length]}bb 100%)`,
                            }}
                        />
                        {name}
                    </span>
                ))}
                <span className="svg-legend-item svg-legend-spike">
                    <span className="svg-legend-spike-badge">↑</span>
                    Lonjakan &ge;20%
                </span>
            </div>
        </div>
    );
}


/* ─── Admin Dashboard Component ─────────────────────────────────────── */
function AdminDashboard({ user }) {
    const [stats, setStats] = useState({
        totalPesertaAktif: 0,
        totalPendaftaran: 0,
        totalAbsensi: 0,
        totalTugas: 0,
        totalPeriode: 0,
        periodeAktif: "-",
    });
    const [chartData, setChartData] = useState([]);
    const [periodeNames, setPeriodeNames] = useState([]);
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const loadAdminStats = async () => {
            const [periodeRes, pendaftaranRes, magangRes, absensiRes, tugasRes] =
                await Promise.allSettled([
                    api.get("/periode"),
                    api.get("/pendaftaran"),
                    api.get("/magang"),
                    api.get("/absensi"),
                    api.get("/tugas"),
                ]);

            if (cancelled) return;

            // ── Periode ──────────────────────────────────────────────
            let periodeList = [];
            let periodeAktifNama = "-";
            if (periodeRes.status === "fulfilled") {
                const raw = periodeRes.value.data?.data || periodeRes.value.data || [];
                periodeList = Array.isArray(raw) ? raw : [];
                const aktif = periodeList.find(
                    (p) => String(p.status || "").toLowerCase() === "aktif"
                );
                if (aktif) periodeAktifNama = aktif.nama_periode || aktif.nama || "-";
            }

            // ── Pendaftaran ── build user_id → periode_name map ───────
            let pendaftaranList = [];
            const userPeriodeMap = {}; // { "42": "Periode 2026" }
            if (pendaftaranRes.status === "fulfilled") {
                const raw = pendaftaranRes.value.data?.data || pendaftaranRes.value.data || [];
                pendaftaranList = Array.isArray(raw) ? raw : [];
            }
            for (const pend of pendaftaranList) {
                const uid = String(
                    pend.user_id || pend.user?.id || pend.peserta_id || ""
                );
                const pname =
                    pend.periode?.nama_periode ||
                    pend.periode?.nama ||
                    (pend.periode_id ? `Periode ${pend.periode_id}` : null);
                if (uid && pname) userPeriodeMap[uid] = pname;
            }

            // ── Magang aktif ──────────────────────────────────────────
            let magangList = [];
            if (magangRes.status === "fulfilled") {
                const raw = magangRes.value.data?.data || magangRes.value.data || [];
                magangList = Array.isArray(raw) ? raw : [];
            }

            // ── Absensi → distinct user per HARI per PERIODE ──────────
            let absensiList = [];
            if (absensiRes.status === "fulfilled") {
                const raw = absensiRes.value.data?.data || absensiRes.value.data || [];
                absensiList = Array.isArray(raw) ? raw : [];
            }

            // dayMap: { "2026-08-15": { "Periode 2026": Set<user_id> } }
            const dayMap = {};
            for (const rec of absensiList) {
                const rawDate = rec.tanggal || rec.date || rec.created_at || "";
                const userId  = String(
                    rec.user_id || rec.userId || rec.pemagang_id || rec.peserta_id || ""
                );
                if (!rawDate || !userId) continue;
                const tanggal = String(rawDate).slice(0, 10); // "YYYY-MM-DD"
                const pname   = userPeriodeMap[userId];
                // Lewati jika user tidak ter-mapping ke periode manapun
                if (!pname) continue;
                if (!dayMap[tanggal]) dayMap[tanggal] = {};
                if (!dayMap[tanggal][pname]) dayMap[tanggal][pname] = new Set();
                dayMap[tanggal][pname].add(userId);
            }

            // Collect all unique periode names (sorted)
            const allPNames = [
                ...new Set(
                    Object.values(dayMap).flatMap((d) => Object.keys(d))
                ),
            ].sort();

            // Build chart array sorted by tanggal
            const builtChartData = Object.keys(dayMap)
                .sort()
                .map((tanggal) => ({
                    tanggal,
                    periodes: Object.fromEntries(
                        allPNames.map((name) => [
                            name,
                            dayMap[tanggal][name]?.size || 0,
                        ])
                    ),
                }));

            // ── Tugas ─────────────────────────────────────────────────
            let tugasList = [];
            if (tugasRes.status === "fulfilled") {
                const raw = tugasRes.value.data?.data || tugasRes.value.data || [];
                tugasList = Array.isArray(raw) ? raw : [];
            }

            setStats({
                totalPesertaAktif: magangList.filter(
                    (m) => String(m.status || "").toLowerCase() === "aktif"
                ).length || magangList.length,
                totalPendaftaran: pendaftaranList.length,
                totalAbsensi: absensiList.length,
                totalTugas: tugasList.length,
                totalPeriode: periodeList.length,
                periodeAktif: periodeAktifNama,
            });
            setChartData(builtChartData);
            setPeriodeNames(allPNames);
            setLoadingStats(false);
        };

        void loadAdminStats();
        return () => { cancelled = true; };
    }, []);

    const displayName = user?.name || user?.nama || "Administrator";
    const managementLinks = [
        { to: "/akun-peserta", icon: "👤", title: "Akun Peserta", description: "Lihat akun peserta dan NPM terkait." },
        { to: "/periode", icon: "🗓️", title: "Periode Magang", description: "Kelola periode dan peserta magang." },
        { to: "/tugas", icon: "📋", title: "Tugas Magang", description: "Kelola tugas dan evaluasi submisi." },
        { to: "/riwayat", icon: "📅", title: "Absensi & Riwayat", description: "Pantau rekapitulasi data kehadiran." },
    ];

    const statCards = [
        {
            label: "Peserta Aktif",
            value: loadingStats ? "…" : stats.totalPesertaAktif,
            icon: "👥",
            colorClass: "admin-stat--blue",
            to: "/akun-peserta",
        },
        {
            label: "Total Pendaftaran",
            value: loadingStats ? "…" : stats.totalPendaftaran,
            icon: "📝",
            colorClass: "admin-stat--purple",
            to: "/akun-peserta",
        },
        {
            label: "Data Absensi",
            value: loadingStats ? "…" : stats.totalAbsensi,
            icon: "📅",
            colorClass: "admin-stat--green",
            to: "/riwayat",
        },
        {
            label: "Total Tugas",
            value: loadingStats ? "…" : stats.totalTugas,
            icon: "📋",
            colorClass: "admin-stat--amber",
            to: "/tugas",
        },
        {
            label: "Total Periode",
            value: loadingStats ? "…" : stats.totalPeriode,
            icon: "🗓️",
            colorClass: "admin-stat--slate",
            to: "/periode",
        },
        {
            label: "Periode Aktif",
            value: loadingStats ? "…" : stats.periodeAktif,
            icon: "✅",
            colorClass: "admin-stat--teal",
            to: "/periode",
            isText: true,
        },
    ];

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                <Navbar />
                <main className="main admin-dashboard">
                    <h1>Dashboard Administrator</h1>
                    <p className="subtitle">Ringkasan Administrator</p>

                    {/* Welcome Card */}
                    <div className="welcome-card admin-welcome-card">
                        <div>
                            <h2>Halo, {displayName} 👋</h2>
                            <p>Kelola periode, tugas, dan data absensi peserta magang.</p>
                        </div>
                        <div className="admin-welcome-badge">
                            <span>🛡️</span>
                            <small>Super Admin</small>
                        </div>
                    </div>

                    {/* Summary Stat Cards */}
                    <div className="admin-stat-grid">
                        {statCards.map((card) => (
                            <Link to={card.to} key={card.label} className={`admin-stat-card ${card.colorClass}`}>
                                <div className="admin-stat-icon">{card.icon}</div>
                                <div className="admin-stat-body">
                                    <span className="admin-stat-label">{card.label}</span>
                                    <strong className={`admin-stat-value${card.isText ? " admin-stat-value--text" : ""}`}>
                                        {card.value}
                                    </strong>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Management Shortcuts */}
                    <div className="admin-section-label">Menu Utama</div>
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

                    {/* Chart: Stacked Bar per Hari per Periode */}
                    <div className="admin-chart-card">
                        <div className="admin-chart-header">
                            <div className="admin-chart-heading">
                                <span className="admin-chart-icon-badge" aria-hidden="true">
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 3v18h18" />
                                        <rect x="7" y="11" width="3" height="7" rx="1" />
                                        <rect x="12" y="7" width="3" height="11" rx="1" />
                                        <rect x="17" y="13" width="3" height="5" rx="1" />
                                    </svg>
                                </span>
                                <div>
                                    <h2 className="admin-chart-title">Grafik Pemagang Aktif per Hari</h2>
                                    <p className="admin-chart-subtitle">
                                        Perbandingan jumlah pemagang aktif per hari, dikelompokkan per periode —
                                        batang bertumpuk menunjukkan overlap saat dua periode berjalan bersamaan
                                    </p>
                                </div>
                            </div>
                            {chartData.length > 0 && (
                                <div className="admin-chart-mini-stats">
                                    <div className="admin-mini-stat">
                                        <span className="admin-mini-stat-label">Total</span>
                                        <strong className="admin-mini-stat-value">
                                            {chartData.reduce((sum, d) => sum + periodeNames.reduce((s, n) => s + (d.periodes[n] || 0), 0), 0)}
                                        </strong>
                                    </div>
                                    <div className="admin-mini-stat">
                                        <span className="admin-mini-stat-label">Rata-rata/Hari</span>
                                        <strong className="admin-mini-stat-value">
                                            {Math.round(chartData.reduce((sum, d) => sum + periodeNames.reduce((s, n) => s + (d.periodes[n] || 0), 0), 0) / chartData.length)}
                                        </strong>
                                    </div>
                                    <div className="admin-mini-stat admin-mini-stat--peak">
                                        <span className="admin-mini-stat-label">Puncak</span>
                                        <strong className="admin-mini-stat-value">
                                            {Math.max(...chartData.map((d) => periodeNames.reduce((s, n) => s + (d.periodes[n] || 0), 0)))}
                                        </strong>
                                    </div>
                                </div>
                            )}
                        </div>
                        <StackedBarChart
                            data={chartData}
                            periodeNames={periodeNames}
                            loading={loadingStats}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}

/* ─── Pembimbing + generic non-pemagang Dashboard ───────────────────── */
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
    if (role === "admin") return <AdminDashboard user={user} />;

    const displayName = user?.name || user?.nama || "Pengguna";
    const description = role === "pembimbing"
        ? "Pantau kehadiran peserta magang dan validasi status harian."
        : "Kelola periode, tugas, dan data absensi peserta magang.";
    const managementLinks = role === "pembimbing"
        ? [
            { to: "/riwayat", icon: "📅", title: "Absensi Magang", description: "Pantau kehadiran peserta dan validasi izin." },
            { to: "/periode", icon: "🗓️", title: "Periode Magang", description: "Lihat periode peserta magang." },
            { to: "/pembimbing/jadwal-absensi", icon: "🕒", title: "Jadwal Absensi", description: "Atur jam masuk dan jam pulang." },
            { to: "/tugas", icon: "📋", title: "Tugas Magang", description: "Periksa dan nilai submisi tugas." },
            { to: "/laporan", icon: "📁", title: "Laporan Magang", description: "Tinjau laporan peserta magang." },
            { to: "/master-penilaian", icon: "⚙️", title: "Master Penilaian", description: "Kelola kriteria dan komponen penilaian." },
            { to: "/laporan/penilaian", icon: "⭐", title: "Tabel Penilaian", description: "Input dan kelola nilai akhir peserta." },
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
