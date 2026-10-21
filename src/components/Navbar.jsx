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
    
    const role = currentUser?.role || "peserta";
    const isParticipantRole = ["peserta", "pemagang", "peserta magang"].includes(String(role).toLowerCase());
    const reportPageTitles = {
        "/laporan": "Laporan Magang",
        "/laporan/penilaian": "Penilaian Laporan",
        "/laporan/rekapitulasi": "Rekapitulasi Magang",
    };
    const reportTitle = reportPageTitles[location.pathname];

    const handleRoleToggle = () => {
        const newRole = role === "peserta" ? "pembimbing" : "peserta";
        const newUser = currentUser ? { ...currentUser, role: newRole } : { role: newRole };
        localStorage.setItem("user", JSON.stringify(newUser));
        // Jika sedang di halaman dashboard atau lainnya, bisa reload untuk me-refresh data
        window.location.reload();
    };

    return (
        <header className="navbar">
            <div>
                    <h3>{reportTitle || (role === "pembimbing" ? "Portal Pembimbing" : "Ruang Kehadiran")}</h3>
                <p>
                    {reportTitle
                        ? `Kelola ${reportTitle.toLowerCase()} peserta magang`
                        : role === "pembimbing"
                            ? "Pemantauan peserta dan kehadiran magang"
                            : "Selamat datang di portal absensi magang"}
                </p>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                {false && !isParticipantRole && <button 
                    onClick={handleRoleToggle} 
                    style={{
                        padding: "8px 16px",
                        background: role === "pembimbing" ? "#3b82f6" : "#f1f5f9",
                        color: role === "pembimbing" ? "white" : "#475569",
                        border: "1px solid",
                        borderColor: role === "pembimbing" ? "#2563eb" : "#e2e8f0",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "14px"
                    }}
                >
                    {role === "pembimbing" ? "🔄 Mode Pembimbing" : "🔄 Mode Peserta"}
                </button>}
                {role === "pembimbing" && (
                    <span className="mentor-mode-label">🎓 Mode Pembimbing</span>
                )}
            </div>
        </header>
    );
}

export default Navbar;
