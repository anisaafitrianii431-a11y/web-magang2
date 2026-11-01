import { useLocation } from "react-router-dom";

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
    const isParticipant = role !== "admin" && role !== "pembimbing";
    const reportPageTitles = {
        "/laporan": "Laporan Magang",
        "/laporan/penilaian": "Tabel Penilaian",
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
        <header className={`navbar${isParticipant ? " navbar-participant" : ""}`}>
            <div>
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
            {isParticipant ? (
                <span className="navbar-participant-mode">Mode Peserta</span>
            ) : (
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span
                        style={{
                            padding: "6px 12px",
                            background: "#dbeafe",
                            color: "#1e40af",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: "700",
                            letterSpacing: "0.02em",
                        }}
                    >
                        {role === "admin" ? "Mode Admin" : "Mode Pembimbing"}
                    </span>
                </div>
            )}
        </header>
    );
}

export default Navbar;
