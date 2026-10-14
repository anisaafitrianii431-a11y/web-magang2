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

    const role = String(currentUser?.role || "peserta").toLowerCase();

    const menuByRole = {
        peserta: [
            { to: "/beranda", label: "Landing Page", icon: "\u{1F310}" },
            { to: "/dashboard", label: "Dashboard", icon: "\u{1F4CA}" },
            { to: "/absensi", label: "Absen hari ini", icon: "\u{1F4C5}" },
            { to: "/tugas", label: "Tugas Magang", icon: "\u{1F4CB}" },
            { to: "/riwayat", label: "Kehadiran", icon: "\u{1F4C6}" },
            { to: "/laporan", label: "Laporan Magang", icon: "\u{1F4C1}" },
            { to: "/laporan/penilaian", label: "Penilaian Laporan", icon: "\u{2B50}" },
            { to: "/laporan/rekapitulasi", label: "Rekapitulasi", icon: "\u{1F4CA}" },
            { to: "/pemagang/daftar", label: "Pendaftaran Magang", icon: "\u{1F465}" },
        ],
        pembimbing: [
            { to: "/beranda", label: "Landing Page", icon: "\u{1F310}" },
            { to: "/dashboard", label: "Dashboard", icon: "\u{1F4CA}" },
            { to: "/pembimbing", label: "Daftar Pemagang", icon: "\u{1F465}" },
            { to: "/pembimbing/dashboard", label: "Dashboard Pembimbing", icon: "\u{1F4CA}" },
            { to: "/periode", label: "Kelola Periode", icon: "\u{1F4C5}" },
            { to: "/tugas", label: "Tugas Magang", icon: "\u{1F4CB}" },
            { to: "/laporan", label: "Laporan Magang", icon: "\u{1F4C1}" },
            { to: "/laporan/penilaian", label: "Penilaian Laporan", icon: "\u{2B50}" },
            { to: "/laporan/rekapitulasi", label: "Rekapitulasi", icon: "\u{1F4CA}" },
        ],
    };

    const roleLabel = {
        pembimbing: "Pembimbing",
        peserta: "Peserta",
        pemagang: "Pemagang",
    };

    const menu = menuByRole[role] || menuByRole.peserta;

    const handleLogout = () => {
        if (onLogoutOverride) {
            onLogoutOverride();
            return;
        }
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        window.location.href = "/";
    };

    if (role === "pembimbing") {
        return (
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="logo-small">M</div>
                    <div>
                        <h2>MagangAdmin</h2>
                        <span>ENTERPRISE PORTAL</span>
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

                <div className="sidebar-footer" style={{ borderTop: "none", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", padding: "10px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "32px", height: "32px", background: "#3b82f6", color: "#fff", borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: "bold" }}>
                            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "P"}
                        </div>
                        <div>
                            <strong style={{ display: "block", color: "#f8fafc", fontSize: "14px" }}>{currentUser?.name || "Pembimbing"}</strong>
                            <span style={{ color: "#94a3b8", fontSize: "11px" }}>{currentUser?.email || "pembimbing@magang.local"}</span>
                        </div>
                    </div>
                    <button onClick={handleLogout} style={{ background: "#ef4444", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
                        Logout
                    </button>
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
            </div>
        </aside>
    );
}

export default Sidebar;
