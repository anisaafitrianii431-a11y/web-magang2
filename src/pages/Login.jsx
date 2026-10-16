import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Login() {
    const navigate = useNavigate();

    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const executeLogin = async (loginEmail, loginPass) => {
        setError("");
        setLoading(true);

        try {
            const response = await api.post("/login", {
                email: loginEmail,
                password: loginPass,
            });
            const authData = response.data?.data || response.data;
            const user = authData?.user;
            const token = authData?.access_token || authData?.token;

            if (!user || !token) {
                throw new Error("Respons login tidak valid. Silakan coba lagi.");
            }

            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));

            const role = user.role?.toLowerCase();
            if (role === "admin") {
                navigate("/riwayat");
            } else if (role === "pembimbing") {
                navigate("/pembimbing");
            } else {
                navigate("/absensi");
            }
        } catch (err) {
            setError(
                err.response?.data?.message || err.message || "Email atau password salah"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = (e) => {
        e.preventDefault();
        executeLogin(identifier, password);
    };

    const handleQuickLogin = (quickEmail, quickPass) => {
        setIdentifier(quickEmail);
        setPassword(quickPass);
        executeLogin(quickEmail, quickPass);
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <div className="logo">AM</div>
                    <h1>Absensi Magang</h1>
                    <p>Sistem Informasi Absensi Peserta Magang</p>
                </div>

                {error && <div className="alert">{error}</div>}

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label>Email atau NPM</label>
                        <input
                            type="text"
                            placeholder="Masukkan email atau NPM"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="Masukkan password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "14px",
                            background: "#4f46e5",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "15px",
                            fontWeight: "bold",
                            cursor: loading ? "not-allowed" : "pointer",
                            marginTop: "16px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            boxShadow: "0 4px 12px rgba(79, 70, 229, 0.35)",
                            transition: "all 0.2s",
                        }}
                    >
                        {loading ? "Memproses..." : "👉 KLIK DISINI UNTUK MASUK (LOGIN)"}
                    </button>
                </form>

                <div style={{ marginTop: "24px", padding: "14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#64748b", fontWeight: "600", textAlign: "center" }}>
                        ⚡ Atau Langsung Masuk Sekali Klik:
                    </p>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <button
                            type="button"
                            onClick={() => handleQuickLogin("admin@magang.com", "admin123")}
                            disabled={loading}
                            style={{ flex: 1, padding: "10px 6px", fontSize: "12px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
                        >
                            👑 Masuk Admin
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickLogin("pembimbing@absensi.com", "pembimbing123")}
                            disabled={loading}
                            style={{ flex: 1, padding: "10px 6px", fontSize: "12px", background: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
                        >
                            👨‍🏫 Pembimbing
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;