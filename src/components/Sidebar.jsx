import { Link, useLocation } from "react-router-dom";

function Sidebar({ onLogout: onLogoutOverride } = {}) {
    const location = useLocation();
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
    const menu = isAdmin
        ? [
            { to: "/riwayat", label: "Absensi & Riwayat", icon: "📅" },
            { to: "/akun-peserta", label: "Akun Peserta", icon: "👤" },
            { to: "/tugas", label: "Tugas Magang", icon: "📋" },
        ]
        : isPembimbing
            ? [
                { to: "/riwayat", label: "Absensi Magang", icon: "📅" },
                { to: "/periode", label: "Kelola Periode", icon: "🗓️" },
                { to: "/tugas", label: "Tugas Magang", icon: "📋" },
                { to: "/laporan", label: "Laporan Magang", icon: "📁" },
            ]
            : [
                { to: "/beranda", label: "Landing Page", icon: "🌐" },
                { to: "/dashboard", label: "Dashboard", icon: "📊" },
                { to: "/absensi", label: "Absen Hari Ini", icon: "📅" },
                { to: "/tugas", label: "Tugas Magang", icon: "📋" },
                { to: "/riwayat", label: "Kehadiran", icon: "🗓️" },
                { to: "/laporan", label: "Laporan Magang", icon: "📁" },
                { to: "/pemagang/daftar", label: "Pendaftaran Magang", icon: "👥" },
            ];

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
                        className={location.pathname === item.to ? "active" : ""}
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
                <strong>08.00 - 17.00</strong><br />
                <span>Senin - Minggu</span>
            </div>
        </aside>
    );
}

export default Sidebar;
