import { Link, useLocation } from "react-router-dom";

function Navbar() {
    const location = useLocation();
    const currentUser = (() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    })();

    const role = String(currentUser?.role || "peserta").toLowerCase();
    const reportPageTitles = {
        "/laporan": "Laporan Magang",
        "/laporan/penilaian": "Penilaian Laporan",
        "/laporan/rekapitulasi": "Rekapitulasi Magang",
    };
    const reportTitle = reportPageTitles[location.pathname];
    const title = reportTitle || (role === "admin"
        ? "Admin Portal"
        : role === "pembimbing"
            ? "Portal Pembimbing"
            : "Ruang kehadiran");
    const description = reportTitle
        ? `Kelola ${reportTitle.toLowerCase()} peserta magang`
        : role === "admin"
            ? "Kelola data absensi peserta magang"
            : role === "pembimbing"
                ? "Manajemen sistem absensi"
                : "Selamat datang di portal absensi magang";

    return (
        <header className="navbar">
            <div>
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <span
                    style={{
                        padding: "6px 12px",
                        background: role === "admin" || role === "pembimbing" ? "#dbeafe" : "#f1f5f9",
                        color: role === "admin" || role === "pembimbing" ? "#1e40af" : "#475569",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "700",
                        letterSpacing: "0.02em",
                    }}
                >
                    {role === "admin" ? "Mode Admin" : role === "pembimbing" ? "Mode Pembimbing" : "Mode Peserta"}
                </span>
                {role !== "admin" && role !== "pembimbing" && localStorage.getItem("token") && (
                    <Link className="history-button" to="/riwayat">
                        Lihat riwayat <span>↗</span>
                    </Link>
                )}
            </div>
        </header>
    );
}

export default Navbar;
