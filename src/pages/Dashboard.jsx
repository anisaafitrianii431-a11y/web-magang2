import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { API_BASE_URL } from "../config/api";
import { normalizeRole } from "../utils/auth";

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

function formatTaskDeadline(value) {
    if (!value) return "Deadline belum ditentukan";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Deadline belum ditentukan"
        : date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function getPhotoUrl(photo) {
    if (!photo) return null;
    if (/^https?:\/\//i.test(photo)) return photo;
    const path = String(photo).replace(/^\/+/, "").replace(/^storage\//, "");
    return `${API_BASE_URL.replace(/\/api\/?$/, "")}/storage/${path}`;
}

function ParticipantDashboard({ user }) {
    const [registration, setRegistration] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [failedSections, setFailedSections] = useState([]);
    const [downloadingLetter, setDownloadingLetter] = useState(false);
    const [downloadMessage, setDownloadMessage] = useState("");

    useEffect(() => {
        let cancelled = false;

        const loadDashboard = async () => {
            const requests = await Promise.allSettled([
                api.get("/pendaftaran/me"),
                api.get("/absensi-saya"),
                api.get("/tugas"),
                api.get("/v1/laporan-magang"),
            ]);

            if (cancelled) return;

            const failed = [];
            if (requests[0].status === "fulfilled") {
                setRegistration(requests[0].value.data?.data || null);
            } else {
                failed.push("data magang");
                console.error("Gagal memuat data pendaftaran dashboard:", requests[0].reason);
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
    const recentTasks = tasks.slice(0, 4);
    const latestReport = reports[0] || null;
    const period = registration?.periode;
    const supervisor = registration?.pembimbing;
    const participantCode = user?.nim || user?.magang?.participant_code;
    const institution = registration?.asal_instansi || user?.magang?.institution;
    const periodName = period?.nama_periode || "Periode magang";
    const photoUrl = getPhotoUrl(user?.foto);
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

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                <Navbar />
                <main className="main participant-dashboard">
                    <h1 className="participant-dashboard-page-title">Dashboard Peserta</h1>

                    <section className="participant-profile-card">
                        <div className="participant-profile-heading">
                            <div className="participant-avatar">
                                {photoUrl && <img src={photoUrl} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
                                <span>{String(user?.name || user?.nama || "P").trim().charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="participant-identity">
                                <div className="participant-name-row">
                                    <h2>Halo, {user?.name || user?.nama || "Peserta"} 👋</h2>
                                    <span className={`participant-status-badge${registration?.status === "Pemagang Aktif" ? " is-active" : ""}`}>
                                        {registration?.status || "Status belum tersedia"}
                                    </span>
                                </div>
                                <p>
                                    {participantCode && <><strong>NIM: {participantCode}</strong><span>•</span></>}
                                    {user?.program_studi && <><span>{user.program_studi}</span><span>•</span></>}
                                    <span>{institution || "Instansi belum tersedia"}</span>
                                </p>
                            </div>
                        </div>
                        <div className="participant-details">
                            <div>
                                <span>Periode Magang</span>
                                <strong>{formatPeriodDate(period?.tanggal_mulai)} s/d {formatPeriodDate(period?.tanggal_selesai)}</strong>
                            </div>
                            <div>
                                <span>Pembimbing Lapangan</span>
                                <strong>{supervisor?.nama || supervisor?.name || "Belum ditentukan"}</strong>
                            </div>
                        </div>
                    </section>

                    <section className="participant-summary-grid" aria-label="Ringkasan kegiatan magang">
                        <Link to="/riwayat" className="participant-summary-card">
                            <div className="participant-summary-card-top">
                                <span>Presensi Kehadiran</span>
                                <span className="participant-summary-icon is-blue" aria-hidden="true">🗓️</span>
                            </div>
                            <strong className="participant-summary-value">
                                {loading ? "…" : <>{presentCount}<small> / {attendance.length} hari</small></>}
                            </strong>
                            <div className="participant-summary-footer">
                                Tingkat Kehadiran: <b>{attendanceRate}%</b>
                                <span>•</span>
                                Hari ini: <b>{todayAttendance?.status || "Belum absen"}</b>
                            </div>
                        </Link>

                        <Link to="/tugas" className="participant-summary-card">
                            <div className="participant-summary-card-top">
                                <span>Tugas Magang</span>
                                <span className="participant-summary-icon is-amber" aria-hidden="true">📋</span>
                            </div>
                            <strong className="participant-summary-value">
                                {loading ? "…" : <>{submittedTasks}<small> / {tasks.length} tugas</small></>}
                            </strong>
                            <div className="participant-summary-footer">
                                {loading ? "Memuat progres tugas..." : tasks.length - submittedTasks > 0
                                    ? <b className="participant-warning">{tasks.length - submittedTasks} tugas belum diserahkan</b>
                                    : "Semua tugas sudah diserahkan"}
                            </div>
                        </Link>

                        <Link to="/laporan" className="participant-summary-card">
                            <div className="participant-summary-card-top">
                                <span>Laporan Magang</span>
                                <span className="participant-summary-icon is-purple" aria-hidden="true">📁</span>
                            </div>
                            <strong className="participant-summary-value participant-report-value">
                                {loading ? "…" : latestReport?.status_laporan || "Belum Ada"}
                            </strong>
                            <div className="participant-summary-footer">
                                {latestReport?.judul_laporan || "Silakan unggah laporan akhir magang"}
                            </div>
                        </Link>
                    </section>

                    <section className="participant-letter-card">
                        <div className="participant-letter-icon" aria-hidden="true">✉️</div>
                        <div className="participant-letter-content">
                            <span>Surat Balasan</span>
                            <strong>{letterAvailable ? "Tersedia Resmi" : "Belum Tersedia"}</strong>
                            <p>{letterAvailable ? `Surat balasan untuk ${periodName} dapat diunduh.` : "Surat balasan belum diunggah oleh admin."}</p>
                            {downloadMessage && <small role="status">{downloadMessage}</small>}
                        </div>
                        <button
                            type="button"
                            onClick={handleDownloadReplyLetter}
                            disabled={!letterAvailable || downloadingLetter}
                        >
                            {downloadingLetter ? "Mengunduh..." : "Unduh Surat Balasan"}
                        </button>
                    </section>

                    <section className="participant-dashboard-lower">
                        <div className="participant-recent-tasks-card">
                            <div className="participant-lower-card-heading">
                                <h2><span aria-hidden="true">📋</span> Tugas Magang Terkini</h2>
                                <Link to="/tugas">Buka Semua ({tasks.length}) →</Link>
                            </div>
                            {loading ? (
                                <p className="participant-empty-state">Memuat daftar tugas...</p>
                            ) : recentTasks.length > 0 ? (
                                <div className="participant-recent-task-list">
                                    {recentTasks.map((task) => {
                                        const submitted = Array.isArray(task.submisi) && task.submisi.length > 0;
                                        return (
                                            <Link to="/tugas" className="participant-recent-task" key={task.id}>
                                                <div>
                                                    <strong>{task.judul}</strong>
                                                    <span>⏰ Batas: {formatTaskDeadline(task.deadline)}</span>
                                                </div>
                                                <span className={`participant-task-badge${submitted ? " is-submitted" : ""}`}>
                                                    {submitted ? "✓ Sudah Dikumpul" : "Kerjakan →"}
                                                </span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="participant-empty-state">Belum ada tugas magang.</p>
                            )}
                        </div>

                        <div className="participant-dashboard-side">
                            <section className="participant-today-card">
                                <div className="participant-lower-card-heading">
                                    <h2>Presensi Hari Ini</h2>
                                    <span className={`participant-today-badge${todayAttendance ? " is-present" : ""}`}>
                                        {todayAttendance?.status || "Belum Hadir"}
                                    </span>
                                </div>
                                <div className="participant-time-grid">
                                    <div>
                                        <span>Jam Masuk</span>
                                        <strong>{todayAttendance?.jam_masuk || "--:--"}</strong>
                                    </div>
                                    <div>
                                        <span>Jam Pulang</span>
                                        <strong>{todayAttendance?.jam_pulang || "--:--"}</strong>
                                    </div>
                                </div>
                                <p className="participant-working-hours">Jam kerja: <strong>08.00 – 17.00 WIB</strong> (Senin - Minggu)</p>
                                <Link to="/absensi" className="participant-attendance-link">Buka Ruang Presensi →</Link>
                            </section>

                            <section className="participant-shortcuts-card">
                                <h2>Pintasan Menu</h2>
                                <div className="participant-shortcut-grid">
                                    <Link to="/tugas"><span aria-hidden="true">📋</span> Tugas Magang</Link>
                                    <Link to="/laporan"><span aria-hidden="true">📁</span> Laporan Akhir</Link>
                                    <Link to="/riwayat"><span aria-hidden="true">🗓️</span> Rekap Absensi</Link>
                                    <button type="button" onClick={handleDownloadReplyLetter} disabled={!letterAvailable || downloadingLetter}>
                                        <span aria-hidden="true">✉️</span>
                                        {downloadingLetter ? "Mengunduh..." : "Surat Balasan"}
                                    </button>
                                </div>
                            </section>
                        </div>
                    </section>

                    {failedSections.length > 0 && (
                        <p className="participant-dashboard-notice" role="status">
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
        let cancelled = false;
        if (user || !localStorage.getItem("token")) return undefined;

        api.get("/me")
            .then((response) => {
                if (cancelled) return;
                const currentUser = response.data?.data?.user || response.data?.data || response.data;
                localStorage.setItem("user", JSON.stringify(currentUser));
                setUser(currentUser);
            })
            .catch((error) => {
                console.error("Gagal memuat profil dashboard:", error);
            });
        return () => {
            cancelled = true;
        };
    }, [user]);

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
        : role === "pembimbing"
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
