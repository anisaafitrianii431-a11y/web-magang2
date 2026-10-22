import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { getLoginData, getRoleHome, normalizeRole } from "../utils/auth";
import { Eye, EyeOff, GraduationCap } from "lucide-react";

function Login() {

    const navigate = useNavigate();
    const location = useLocation();

    const [identifier, setIdentifier] = useState(location.state?.registeredEmail || "");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState(location.state?.registrationNotice || "");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {

        e.preventDefault();

        setError("");
        setNotice("");
        setLoading(true);

        try {

            const response = await api.post("/login", {
                email: identifier.trim(),
                password: password,
            });

            const { token, user } = getLoginData(response.data);

            if (!token || !user) {
                throw new Error("Respons login tidak berisi token atau data pengguna.");
            }

            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));

            if (normalizeRole(user.role) === "pemagang") {
                // Active participants land in the participant feature portal.
                // Applicants who are still pending stay on their registration status page.
                try {
                    const registrationResponse = await api.get("/pendaftaran/me");
                    const registration = registrationResponse.data?.data;
                    const hasReceivedReplyLetter = Boolean(
                        registration?.file_surat_balasan && registration?.surat_balasan_diterima_at
                    );
                    navigate(
                        registration?.status === "Pemagang Aktif" && hasReceivedReplyLetter
                            ? "/absensi"
                            : "/pemagang/daftar"
                    );
                } catch {
                    navigate("/pemagang/daftar");
                }
                return;
            }

            navigate(getRoleHome(user.role));

        } catch (error) {

            setError(
                error.response?.data?.message ||
                error.message ||
                "Email atau password salah"
            );

        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: "100%",
        padding: "12px 15px",
        borderRadius: "8px",
        border: "1px solid #cbd5e1",
        outline: "none",
        fontSize: "14px",
        boxSizing: "border-box",
        background: "#fff",
        color: "#0f172a",
    };
    const labelStyle = {
        display: "block",
        fontSize: "14px",
        fontWeight: "500",
        color: "#334155",
        marginBottom: "8px",
    };

    return (
        <main
            style={{
                display: "flex",
                minHeight: "100vh",
                fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                background: "#f8fafc",
                justifyContent: "center",
                alignItems: "center",
                padding: "20px",
                boxSizing: "border-box",
            }}
        >
            <section
                style={{
                    width: "100%",
                    maxWidth: "420px",
                    background: "#fff",
                    padding: "40px",
                    borderRadius: "16px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                    boxSizing: "border-box",
                }}
            >
                <header style={{ textAlign: "center", marginBottom: "30px" }}>
                    <div
                        aria-hidden="true"
                        style={{
                            width: "60px",
                            height: "60px",
                            background: "#3b82f6",
                            borderRadius: "12px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            fontSize: "30px",
                            margin: "0 auto 15px",
                            boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.5)",
                        }}
                    >
                        <GraduationCap size={30} color="#fff" strokeWidth={1.8} />
                    </div>
                    <h1 style={{ fontSize: "24px", lineHeight: 1.3, fontWeight: "bold", color: "#0f172a", margin: "0 0 5px", letterSpacing: 0 }}>
                        Selamat Datang
                    </h1>
                    <p style={{ color: "#64748b", fontSize: "14px", lineHeight: 1.5, margin: 0 }}>
                        Masuk ke panel MagangAdmin Enterprise
                    </p>
                </header>

                {error && (
                    <div
                        role="alert"
                        style={{
                            marginBottom: "16px",
                            padding: "12px",
                            color: "#991b1b",
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            borderRadius: "8px",
                            fontSize: "13px",
                        }}
                    >
                        {error}
                    </div>
                )}

                {notice && (
                    <div
                        role="status"
                        style={{
                            marginBottom: "16px",
                            padding: "12px",
                            color: "#166534",
                            background: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            borderRadius: "8px",
                            fontSize: "13px",
                        }}
                    >
                        {notice}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div>
                        <label htmlFor="login-identifier" style={labelStyle}>Email atau NPM/NIM</label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(event) => setIdentifier(event.target.value)}
                            placeholder="Masukkan email atau NPM/NIM"
                            style={inputStyle}
                            autoComplete="username"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="login-password" style={labelStyle}>Password</label>
                        <div style={{ position: "relative" }}>
                            <input
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="••••••••"
                                style={{ ...inputStyle, paddingRight: "48px" }}
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((visible) => !visible)}
                                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                                aria-pressed={showPassword}
                                title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                                style={{
                                    position: "absolute",
                                    top: "50%",
                                    right: "12px",
                                    transform: "translateY(-50%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "4px",
                                    border: "none",
                                    background: "transparent",
                                    color: "#64748b",
                                    cursor: "pointer",
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            background: "#4f46e5",
                            color: "#fff",
                            padding: "14px",
                            border: "none",
                            borderRadius: "8px",
                            cursor: loading ? "not-allowed" : "pointer",
                            fontWeight: "bold",
                            fontSize: "15px",
                            marginTop: "4px",
                            boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.4)",
                        }}
                    >
                        {loading ? "Memproses..." : "Masuk"}
                    </button>
                </form>

                <p style={{ margin: "24px 0 0", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
                    Belum memiliki akun?{" "}
                    <Link to="/register" style={{ color: "#4f46e5", fontWeight: "bold", textDecoration: "none" }}>
                        Daftar di sini
                    </Link>
                </p>

            </section>
        </main>
    );
}

export default Login;
