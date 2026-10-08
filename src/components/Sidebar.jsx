import { Link, useLocation } from "react-router-dom";

function Sidebar() {
    const location = useLocation();
    const currentUser = (() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    })();

    const role = currentUser?.role || "peserta";

    const menuByRole = {
        peserta: [
            { to: "/dashboard", label: "Dashboard" },
            { to: "/absensi", label: "Absen hari ini" },
            { to: "/tugas", label: "Tugas Magang" },
            { to: "/riwayat", label: "Kehadiran" },
        ],
        pembimbing: [
            { to: "/dashboard", label: "Dashboard" },
            { to: "/pembimbing", label: "Daftar Pemagang" },
            { to: "/periode", label: "Kelola Periode" },
            { to: "/tugas", label: "Tugas Magang" },
            { to: "/riwayat", label: "Riwayat absensi" },
        ],
    };

    const roleLabel = {
        pembimbing: "Pembimbing",
        peserta: "Peserta",
    };

    const menu = menuByRole[role] || menuByRole.peserta;

    const handleLogout = () => {
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
                    <Link to="/pembimbing" className={location.pathname === "/pembimbing" ? "active" : ""}>
                        👥 &nbsp;Daftar Pemagang
                    </Link>
                    <Link to="/periode" className={location.pathname === "/periode" ? "active" : ""}>
                        📅 &nbsp;Kelola Periode
                    </Link>
                    <Link to="/tugas" className={location.pathname === "/tugas" ? "active" : ""}>
                        📋 &nbsp;Tugas Magang
                    </Link>
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
                {menuByRole.peserta.map((item) => (
                    <Link
                        key={item.to}
                        to={item.to}
                        className={location.pathname === item.to ? "active" : ""}
                    >
                        ◉ &nbsp;{item.label}
                    </Link>
                ))}
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
