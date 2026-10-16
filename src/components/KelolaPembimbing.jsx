import { useEffect, useState } from "react";
import api from "../services/api";

const initialForm = {
    nama: "",
    email: "",
    password: "",
    no_hp: "",
};

const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: "14px",
    boxSizing: "border-box",
    background: "#fff",
    color: "#334155",
};

export default function KelolaPembimbing() {
    const [pembimbings, setPembimbings] = useState([]);
    const [form, setForm] = useState(initialForm);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadPembimbings = async () => {
        setIsLoading(true);
        setError("");

        try {
            const response = await api.get("/admin/pembimbing");
            setPembimbings(response.data.data || []);
        } catch (requestError) {
            setError(
                requestError.response?.data?.message
                || "Gagal memuat daftar Pembimbing. Periksa koneksi backend Anda."
            );
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPembimbings();
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSuccess("");
        setIsSubmitting(true);

        try {
            const response = await api.post("/admin/pembimbing", form);
            setSuccess(response.data.message || "Akun Pembimbing berhasil dibuat.");
            setForm(initialForm);
            await loadPembimbings();
        } catch (requestError) {
            const validationMessage = Object.values(requestError.response?.data?.errors || {})
                .flat()
                .join(" ");

            setError(
                validationMessage
                || requestError.response?.data?.message
                || "Gagal membuat akun Pembimbing. Silakan coba lagi."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}>
            <div style={{ marginBottom: "20px" }}>
                <h2 style={{ margin: 0, color: "#0f172a", fontSize: "20px" }}>
                    Kelola Akun Pembimbing
                </h2>
                <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: "14px" }}>
                    Admin dapat membuat akun Pembimbing dan memberikan kredensial login.
                </p>
            </div>

            {error && (
                <div
                    role="alert"
                    style={{
                        marginBottom: "16px",
                        padding: "12px 14px",
                        color: "#991b1b",
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: "8px",
                        fontSize: "14px",
                    }}
                >
                    {error}
                </div>
            )}

            {success && (
                <div
                    role="status"
                    style={{
                        marginBottom: "16px",
                        padding: "12px 14px",
                        color: "#065f46",
                        background: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        borderRadius: "8px",
                        fontSize: "14px",
                    }}
                >
                    {success}
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "15px",
                    alignItems: "end",
                    background: "#f8fafc",
                    padding: "20px",
                    borderRadius: "12px",
                    marginBottom: "30px",
                    border: "1px solid #e2e8f0",
                }}
            >
                {[
                    ["nama", "Nama Lengkap", "text", "Nama Pembimbing"],
                    ["email", "Email", "email", "nama@email.com"],
                    ["password", "Password Awal", "password", "Minimal 8 karakter"],
                    ["no_hp", "No. HP / WhatsApp", "tel", "Opsional"],
                ].map(([field, label, type, placeholder]) => (
                    <div key={field}>
                        <label
                            htmlFor={`pembimbing-${field}`}
                            style={{
                                display: "block",
                                marginBottom: "8px",
                                fontSize: "13px",
                                fontWeight: "500",
                                color: "#475569",
                            }}
                        >
                            {label}
                        </label>
                        <input
                            id={`pembimbing-${field}`}
                            type={type}
                            value={form[field]}
                            onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                            placeholder={placeholder}
                            style={inputStyle}
                            autoComplete={field === "password" ? "new-password" : field}
                            minLength={field === "password" ? 8 : undefined}
                            required={field !== "no_hp"}
                        />
                    </div>
                ))}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                        background: "#4f46e5",
                        color: "#fff",
                        padding: "10px 18px",
                        height: "40px",
                        border: "none",
                        borderRadius: "6px",
                        cursor: isSubmitting ? "wait" : "pointer",
                        fontWeight: "600",
                        fontSize: "14px",
                    }}
                >
                    {isSubmitting ? "Menyimpan..." : "Tambah Pembimbing"}
                </button>
            </form>

            <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflowX: "auto" }}>
                <div
                    style={{
                        padding: "15px 20px",
                        background: "#f8fafc",
                        borderBottom: "1px solid #e2e8f0",
                    }}
                >
                    <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>
                        Daftar Pembimbing ({pembimbings.length} akun)
                    </h3>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                            {["Nama", "Email", "No. HP"].map((heading) => (
                                <th
                                    key={heading}
                                    style={{
                                        padding: "14px 20px",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        color: "#64748b",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    {heading}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="3" style={{ padding: "18px 20px", color: "#64748b", fontSize: "14px" }}>
                                    Memuat daftar Pembimbing...
                                </td>
                            </tr>
                        ) : pembimbings.length === 0 ? (
                            <tr>
                                <td colSpan="3" style={{ padding: "18px 20px", color: "#64748b", fontSize: "14px" }}>
                                    Belum ada akun Pembimbing.
                                </td>
                            </tr>
                        ) : pembimbings.map((pembimbing, index) => (
                            <tr
                                key={pembimbing.id}
                                style={{ borderBottom: index === pembimbings.length - 1 ? "none" : "1px solid #e2e8f0" }}
                            >
                                <td style={{ padding: "14px 20px", color: "#334155", fontSize: "14px" }}>
                                    {pembimbing.nama || pembimbing.name}
                                </td>
                                <td style={{ padding: "14px 20px", color: "#334155", fontSize: "14px" }}>
                                    {pembimbing.email}
                                </td>
                                <td style={{ padding: "14px 20px", color: "#334155", fontSize: "14px" }}>
                                    {pembimbing.no_hp || "-"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
