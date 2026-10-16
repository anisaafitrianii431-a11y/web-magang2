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

    const role = (currentUser?.role || "peserta").toLowerCase();

    const roleLabel = {
        pembimbing: "Pembimbing",
        peserta: "Peserta",
    };

    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        window.location.href = "/login";
    };

    if (role === "admin") {
        return (
            <aside className="sidebar">
                <Link to="/riwayat" className="sidebar-logo" style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}>
                    <div className="logo-small">A</div>
                    <div>
                        <h2>MagangAdmin</h2>
                        <span>ADMINISTRATOR PORTAL</span>
                    </div>
                </Link>

                <div className="sidebar-note">
                    <span>MAIN CORE</span>
                </div>

                <nav>
                    <Link to="/riwayat" className={location.pathname === "/riwayat" ? "active" : ""}>
                        📅 &nbsp;Absensi & Riwayat
                    </Link>
                    <Link to="/akun-peserta" className={location.pathname === "/akun-peserta" ? "active" : ""}>
                        👤 &nbsp;Akun Peserta
                    </Link>
                    <Link to="/tugas" className={location.pathname === "/tugas" ? "active" : ""}>
                        📋 &nbsp;Tugas Magang
                    </Link>
                </nav>

                <div className="sidebar-footer" style={{ borderTop: "none", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", padding: "10px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "32px", height: "32px", background: "#4f46e5", color: "#fff", borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: "bold" }}>
                            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "A"}
                        </div>
                        <div>
                            <strong style={{ display: "block", color: "#f8fafc", fontSize: "14px" }}>{currentUser?.name || "Administrator"}</strong>
                            <span style={{ color: "#94a3b8", fontSize: "11px" }}>{currentUser?.email || "admin@magang.local"}</span>
                        </div>
                    </div>
                    <button onClick={handleLogout} style={{ background: "#ef4444", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
                        Logout
                    </button>
                </div>
            </aside>
        );
    }

    if (role === "pembimbing") {
        return (
            <aside className="sidebar">
                <Link to="/pembimbing" className="sidebar-logo" style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}>
                    <div className="logo-small">P</div>
                    <div>
                        <h2>Portal Pembimbing</h2>
                        <span>PEMBIMBING LAPANGAN</span>
                    </div>
                </Link>

                <div className="sidebar-note">
                    <span>MENU PEMBIMBING</span>
                </div>

                <nav>
                    <Link to="/riwayat" className={location.pathname === "/riwayat" ? "active" : ""}>
                        📅 &nbsp;Absensi Magang
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
                    <span>portal {roleLabel[role] || "Peserta"}</span>
                </div>
            </div>

            <div className="sidebar-note">
                <span>ROLE SYSTEM</span>
                <p>Catat kehadiran sesuai jadwal magang.</p>
            </div>

            <nav>
                {[
                    { to: "/absensi", label: "Absensi Magang" },
                    { to: "/tugas", label: "Tugas Magang" },
                ].map((item) => (
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
                <span>Senin - Minggu</span>
            </div>
        </aside>
    );
}

export default Sidebar;
