import { Link, useLocation } from "react-router-dom";
import api from "../services/api";

function Sidebar({ onLogout: onLogoutOverride } = {}) {
    const location = useLocation();
    const currentUser = (() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    })();

    const storedRole = String(currentUser?.role || "peserta").trim().toLowerCase();
    const role = storedRole === "administrator" ? "admin" : storedRole;

    const menuByRole = {
        admin: [
            { to: "/admin/pendaftaran", label: "Pendaftaran Magang", icon: "\u{1F4DD}" },
            { to: "/admin/periode", label: "Kelola Periode", icon: "\u{1F4C5}" },
            { to: "/admin/pembimbing", label: "Kelola Pembimbing", icon: "\u{1F465}" },
            { to: "/riwayat", label: "Absensi Magang", icon: "\u{1F4CA}" },
            { to: "/tugas", label: "Tugas Magang", icon: "\u{1F4CB}" },
        ],
        peserta: [
            { to: "/absensi", label: "Absensi Magang", icon: "\u{1F4C5}" },
            { to: "/tugas", label: "Tugas Magang", icon: "\u{1F4CB}" },
            { to: "/laporan", label: "Laporan Magang", icon: "\u{1F4C1}" },
        ],
        pembimbing: [
            { to: "/riwayat", label: "Absensi Magang", icon: "\u{1F4C5}" },
            { to: "/periode", label: "Kelola Periode", icon: "🗓️" },
            { to: "/tugas", label: "Tugas Magang", icon: "\u{1F4CB}" },
            { to: "/laporan", label: "Laporan Magang", icon: "\u{1F4C1}" },
        ],
    };

    const roleLabel = {
        admin: "Administrator",
        pembimbing: "Pembimbing",
        peserta: "Peserta",
        pemagang: "Pemagang",
    };

    const menu = menuByRole[role] || menuByRole.peserta;

    const handleLogout = async () => {
        if (onLogoutOverride) {
            await onLogoutOverride();
            return;
        }
        try {
            await api.post("/logout");
        } catch {
            // Sesi lokal tetap dihapus jika backend sedang tidak tersedia.
        }
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("participant");
        window.location.href = "/login";
    };

    if (role === "pembimbing" || role === "admin") {
        return (
            <aside className="sidebar">
                <div className="sidebar-logo">
                        <div className="logo-small">{role === "pembimbing" ? "P" : "M"}</div>
                    <div>
                            <h2>{role === "admin" ? "MagangAdmin" : "Portal Pembimbing"}</h2>
                            <span>{role === "admin" ? "ADMINISTRATOR PORTAL" : "PORTAL PEMBIMBING"}</span>
                    </div>
                </div>

                <div className="sidebar-note">
                    <span>MAIN CORE</span>
                </div>

                <nav>
                    {menu.map((item) => {
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={location.pathname === item.to ? "active" : ""}
                            >
                                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="sidebar-footer" style={{ borderTop: "none", display: "flex", flexDirection: role === "pembimbing" ? "column" : "row", justifyContent: "space-between", alignItems: role === "pembimbing" ? "stretch" : "center", marginTop: "auto", padding: "10px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                            <div style={{ width: "32px", height: "32px", flex: "0 0 32px", background: "#3b82f6", color: "#fff", borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: "bold" }}>
                                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "P"}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <strong style={{ display: "block", color: "#f8fafc", fontSize: "14px" }}>{currentUser?.name || "Pembimbing"}</strong>
                                <span style={{ color: "#94a3b8", fontSize: "11px" }}>{currentUser?.email || "pembimbing@magang.local"}</span>
                            </div>
                        </div>
                        <button onClick={handleLogout} style={{ background: "#ef4444", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
                            Logout
                        </button>
                    </div>
                    {role === "pembimbing" && (
                        <div className="mentor-sidebar-hours">Jam kerja magang<br /><strong>08.00 - 17.00</strong><br /><span>Senin - Minggu</span></div>
                    )}
                </div>
            </aside>
        );
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-small">AM</div>
                <div>
                    <h2>Absensi</h2>
                    <span>portal {roleLabel[role]}</span>
                </div>
            </div>

            <div className="sidebar-note">
                <span>ROLE SYSTEM</span>
                <p>Catat kehadiran sesuai jadwal magang.</p>
            </div>

            <nav>
                {menu.map((item) => {
                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={location.pathname === item.to ? "active" : ""}
                        >
                            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                Jam kerja magang<br />
                <strong>08.00 - 17.00</strong><br />
                <span>Senin - Sabtu</span>
                <button
                    type="button"
                    onClick={handleLogout}
                    className="sidebar-logout"
                    aria-label="Logout / Keluar"
                    title="Logout / Keluar"
                >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 17l5-5-5-5" />
                        <path d="M15 12H3" />
                        <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
                    </svg>
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
