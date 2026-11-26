import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    CalendarCheck,
    CheckSquare,
    CalendarDays,
    FolderCheck,
    Globe,
    Users,
    CalendarRange,
    UserCheck,
    MapPin,
    Clock,
    Sliders,
    Award,
    BookOpen,
    LogOut,
    ChevronRight,
} from "lucide-react";
import api from "../services/api";
import { API_BASE_URL } from "../config/api";
import "./Sidebar.css";

function getPhotoUrl(photo) {
    if (!photo) return null;
    if (/^https?:\/\//i.test(photo) || String(photo).startsWith("data:") || String(photo).startsWith("blob:")) return photo;
    const path = String(photo).replace(/^\/+/, "").replace(/^storage\//, "");
    return `${API_BASE_URL.replace(/\/api\/?$/, "")}/storage/${path}`;
}

function Sidebar({ onLogout: onLogoutOverride } = {}) {
    const location = useLocation();
    const [jamMasuk, setJamMasuk] = useState("08:00");
    const [jamPulang, setJamPulang] = useState("17:00");
    const [jadwalError, setJadwalError] = useState("");
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    });
    const [photoError, setPhotoError] = useState(false);

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

    const role = String(currentUser?.role || "peserta").trim().toLowerCase();
    const isAdmin = role === "admin" || role === "administrator";
    const isPembimbing = role === "pembimbing";
    const roleLabel = isAdmin ? "Admin" : isPembimbing ? "Pembimbing" : "Peserta";
    const isParticipant = !isAdmin && !isPembimbing;

    const menu = isAdmin
        ? [
            { to: "/admin/landing-page", label: "Landing Page", icon: Globe },
            { to: "/admin/pendaftaran", label: "Pendaftaran Magang", icon: Users },
            { to: "/admin/periode", label: "Kelola Periode", icon: CalendarRange },
            { to: "/admin/pembimbing", label: "Kelola Pembimbing", icon: UserCheck },
            { to: "/admin/lokasi", label: "Lokasi Absensi", icon: MapPin },
            { to: "/admin/akun-peserta", label: "Kelola Akun Peserta", icon: Users },
            { to: "/riwayat", label: "Absensi Magang", icon: CalendarDays },
            { to: "/logbook", label: "Logbook Harian", icon: BookOpen },
            { to: "/tugas", label: "Tugas Magang", icon: CheckSquare },
            { to: "/laporan", label: "Laporan Magang", icon: FolderCheck },
        ]
        : isPembimbing
            ? [
                { to: "/riwayat", label: "Absensi Magang", icon: CalendarDays },
                { to: "/logbook", label: "Logbook Harian", icon: BookOpen },
                { to: "/pembimbing/jadwal-absensi", label: "Jadwal Absensi", icon: Clock },
                { to: "/tugas", label: "Tugas Magang", icon: CheckSquare },
                { to: "/laporan", label: "Laporan Magang", icon: FolderCheck },
                { to: "/master-penilaian", label: "Master Penilaian", icon: Sliders },
                { to: "/laporan/penilaian", label: "Tabel Penilaian", icon: Award },
            ]
            : [
                { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
                { to: "/absensi", label: "Absen Hari Ini", icon: CalendarCheck },
                { to: "/riwayat", label: "Riwayat Absensi", icon: CalendarDays },
                { to: "/logbook", label: "Logbook Harian", icon: BookOpen },
                { to: "/tugas", label: "Tugas Magang", icon: CheckSquare },
                { to: "/laporan", label: "Laporan Magang", icon: FolderCheck },
            ];

    useEffect(() => {
        if (!isPembimbing && !isParticipant) return undefined;

        let cancelled = false;
        const endpoint = isPembimbing ? "/pembimbing/jadwal-absensi" : "/absensi/jadwal";
        const handleScheduleUpdated = (event) => {
            if (event.detail?.jamMasuk) setJamMasuk(event.detail.jamMasuk);
            if (event.detail?.jamPulang) setJamPulang(event.detail.jamPulang);
        };
        window.addEventListener("attendance-schedule-updated", handleScheduleUpdated);

        api.get(endpoint)
            .then((response) => {
                if (!cancelled) {
                    setJadwalError("");
                    setJamMasuk(response.data?.data?.jam_masuk || "08:00");
                    setJamPulang(response.data?.data?.jam_pulang || "17:00");
                }
            })
            .catch((requestError) => {
                if (!cancelled) {
                    setJadwalError(requestError.response?.data?.message || "Jadwal absensi gagal dimuat.");
                }
            });

        return () => {
            cancelled = true;
            window.removeEventListener("attendance-schedule-updated", handleScheduleUpdated);
        };
    }, [isPembimbing, isParticipant]);

    const handleLogout = () => {
        if (onLogoutOverride) {
            onLogoutOverride();
            return;
        }
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        window.location.href = "/";
    };

    const isItemActive = (to) => {
        if (to === "/dashboard") {
            return location.pathname === "/dashboard";
        }
        return location.pathname === to || location.pathname.startsWith(`${to}/`);
    };

    const photoUrl = getPhotoUrl(currentUser?.foto);
    const userInitial = String(currentUser?.name || currentUser?.nama || roleLabel || "P")
        .trim()
        .charAt(0)
        .toUpperCase();
    const userName = currentUser?.name || currentUser?.nama || roleLabel;

    return (
        <aside className={`sidebar sidebar-container ${isParticipant ? "participant-sidebar" : ""}`}>
            {/* 1. BRAND LOGO & TITLE */}
            <Link
                to={isAdmin ? "/riwayat" : isPembimbing ? "/pembimbing" : "/dashboard"}
                className="sidebar-brand-box"
            >
                <div className="sidebar-brand-logo-wrap">
                    <img src="/logo.png" alt="Logo PAM-TECHNO" />
                </div>
                <div className="sidebar-brand-text">
                    <h2 className="sidebar-brand-title">PAM-TECHNO</h2>
                    <span className="sidebar-brand-tag">
                        {isAdmin ? "Admin Portal" : isPembimbing ? "Portal Pembimbing" : "Portal Peserta"}
                    </span>
                </div>
            </Link>

            {/* 2. NAVIGATION MENU */}
            <div className="sidebar-nav-wrap">
                <p className="sidebar-nav-label">Menu Utama</p>
                <nav className="sidebar-nav-list" aria-label="Menu Navigasi">
                    {menu.map((item) => {
                        const Icon = item.icon;
                        const active = isItemActive(item.to);
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={`sidebar-nav-link ${active ? "active" : ""}`}
                            >
                                <div className="sidebar-nav-link-left">
                                    <span className="sidebar-nav-icon" aria-hidden="true">
                                        <Icon size={18} />
                                    </span>
                                    <span>{item.label}</span>
                                </div>
                                <ChevronRight size={14} className="sidebar-chevron" aria-hidden="true" />
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* 3. WORKING HOURS CARD (Khusus Peserta & Pembimbing) */}
            {(isParticipant || isPembimbing) && (
                <div className="sidebar-hours-widget">
                    <div className="sidebar-hours-header">
                        <Clock size={13} />
                        <span>Jam Kerja Magang</span>
                    </div>
                    <div className="sidebar-hours-time">
                        {jamMasuk.replace(":", ".")} – {jamPulang.replace(":", ".")} WIB
                    </div>
                    <span className="sidebar-hours-days">Senin – Minggu</span>
                    {jadwalError && <span className="sidebar-hours-error">{jadwalError}</span>}
                </div>
            )}

            {/* 4. USER PROFILE & LOGOUT FOOTER */}
            <div className="sidebar-footer-box">
                {currentUser && (
                    <div className="sidebar-user-pill">
                        <Link
                            to="/profil"
                            className="sidebar-user-main"
                            title="Buka & Edit Profil Peserta"
                        >
                            <div className="sidebar-avatar-small">
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
                                    <span>{userInitial}</span>
                                )}
                            </div>
                            <div className="sidebar-user-info">
                                <span className="sidebar-user-name" title={userName}>
                                    {userName}
                                </span>
                                <span className="sidebar-user-role-badge">
                                    <span className="sidebar-online-dot"></span>
                                    {roleLabel}
                                </span>
                            </div>
                        </Link>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="sidebar-logout-btn"
                            title="Keluar dari akun"
                            aria-label="Logout"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}

export default Sidebar;
