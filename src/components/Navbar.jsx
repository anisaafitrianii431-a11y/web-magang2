import { Link } from "react-router-dom";

function Navbar() {
    const currentUser = (() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    })();
    
    const role = currentUser?.role || "peserta";

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
                <h3>{role === "pembimbing" ? "Admin Portal" : "Ruang kehadiran"}</h3>
                <p>{role === "pembimbing" ? "Manajemen sistem absensi" : "Selamat datang di portal absensi magang"}</p>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <button 
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
                </button>
                {role === "peserta" && (
                    <Link className="history-button" to="/riwayat">
                        Lihat riwayat <span>↗</span>
                    </Link>
                )}
            </div>
        </header>
    );
}

export default Navbar;
