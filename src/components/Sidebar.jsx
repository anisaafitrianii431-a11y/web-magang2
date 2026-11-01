import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../services/api";

function Sidebar({ onLogout: onLogoutOverride } = {}) {
    const location = useLocation();
    const [jamPulang, setJamPulang] = useState("17:00");
    const [jadwalError, setJadwalError] = useState("");
    const currentUser = (() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    })();

    const role = String(currentUser?.role || "peserta").trim().toLowerCase();
    const isAdmin = role === "admin" || role === "administrator";
    const isPembimbing = role === "pembimbing";
    const roleLabel = isAdmin ? "Admin" : isPembimbing ? "Pembimbing" : "Peserta";
    const isParticipant = !isAdmin && !isPembimbing;
    const menu = isAdmin
        ? [
            { to: "/admin/pendaftaran", label: "Pendaftaran Magang", icon: "👥" },
            { to: "/admin/periode", label: "Kelola Periode", icon: "🗓️" },
            { to: "/riwayat", label: "Absensi Magang", icon: "📅" },
            { to: "/tugas", label: "Tugas Magang", icon: "📋" },
            { to: "/laporan", label: "Laporan Magang", icon: "📁" },
        ]
        : isPembimbing
            ? [
                { to: "/riwayat", label: "Absensi Magang", icon: "📅" },
                { to: "/tugas", label: "Tugas Magang", icon: "📋" },
                { to: "/laporan", label: "Laporan Magang", icon: "📁" },
                { to: "/laporan/penilaian", label: "Tabel Penilaian", icon: "⭐" },
                { to: "/laporan/rekapitulasi", label: "Rekapitulasi", icon: "📊" },
            ]
            : [
                { to: "/beranda", label: "Landing Page", icon: "🌐" },
                { to: "/dashboard", label: "Dashboard", icon: "📊" },
                { to: "/absensi", label: "Absen Hari Ini", icon: "📅" },
                { to: "/tugas", label: "Tugas Magang", icon: "📋" },
                { to: "/laporan", label: "Laporan Magang", icon: "📁" },
            ];

    useEffect(() => {
        if (!isPembimbing && !isParticipant) return undefined;

        let cancelled = false;
        const endpoint = isPembimbing ? "/pembimbing/jadwal-absensi" : "/absensi/jadwal";
        const handleScheduleUpdated = (event) => {
            if (event.detail?.jamPulang) setJamPulang(event.detail.jamPulang);
        };
        window.addEventListener("attendance-schedule-updated", handleScheduleUpdated);

        api.get(endpoint)
            .then((response) => {
                if (!cancelled) {
                    setJadwalError("");
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
        window.location.href = "/login";
    };

    return (
        <aside className="sidebar">
            <Link
                to={isAdmin ? "/riwayat" : isPembimbing ? "/pembimbing" : "/absensi"}
                className="sidebar-logo"
                style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
            >
                <div className="logo-small">{isAdmin ? "A" : isPembimbing ? "P" : "AM"}</div>
                <div>
                    <h2>{isAdmin ? "MagangAdmin" : isPembimbing ? "Portal Pembimbing" : "Absensi"}</h2>
                    <span>{isAdmin ? "ADMINISTRATOR PORTAL" : `PORTAL ${roleLabel.toUpperCase()}`}</span>
                </div>
            </Link>

            <div className="sidebar-note">
                <span>{isAdmin ? "MAIN CORE" : `MENU ${roleLabel.toUpperCase()}`}</span>
                {!isAdmin && !isPembimbing && <p>Catat kehadiran sesuai jadwal magang.</p>}
            </div>

            <nav>
                {menu.map((item) => (
                    <Link
                        key={item.to}
                        to={item.to}
                        className={location.pathname === item.to || location.pathname.startsWith(`${item.to}/`) ? "active" : ""}
                    >
                        <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="sidebar-footer">
                {currentUser && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                        <div style={{ minWidth: 0 }}>
                            <strong style={{ display: "block", color: "#f8fafc", fontSize: "14px" }}>
                                {currentUser.name || currentUser.nama || roleLabel}
                            </strong>
                            <span style={{ color: "#94a3b8", fontSize: "11px" }}>{currentUser.email}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            style={{ background: "#ef4444", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
                        >
                            Logout
                        </button>
                    </div>
                )}
                Jam kerja magang<br />
                <strong>08.00 - {jamPulang.replace(":", ".")}</strong><br />
                <span>Senin - Minggu</span>
                {jadwalError && <span role="alert" style={{ display: "block", marginTop: "6px", color: "#fecaca", fontSize: "11px" }}>{jadwalError}</span>}
            </div>
        </aside>
    );
}

export default Sidebar;
