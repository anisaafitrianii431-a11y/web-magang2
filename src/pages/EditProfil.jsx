import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    User,
    Mail,
    Phone,
    MapPin,
    BookOpen,
    Lock,
    Camera,
    Save,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    ShieldCheck,
    Eye,
    X,
    ExternalLink,
    Maximize2,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import { API_BASE_URL } from "../config/api";

function getPhotoUrl(photo) {
    if (!photo) return null;
    if (/^https?:\/\//i.test(photo) || String(photo).startsWith("data:") || String(photo).startsWith("blob:")) return photo;
    const path = String(photo).replace(/^\/+/, "").replace(/^storage\//, "");
    return `${API_BASE_URL.replace(/\/api\/?$/, "")}/storage/${path}`;
}

export default function EditProfil() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    });

    const [formData, setFormData] = useState({
        nama: "",
        email: "",
        nim: "",
        no_hp: "",
        program_studi: "",
        alamat: "",
        password: "",
        password_confirmation: "",
    });

    const [fotoFile, setFotoFile] = useState(null);
    const [fotoPreview, setFotoPreview] = useState(null);
    const [photoError, setPhotoError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [showPhotoModal, setShowPhotoModal] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") setShowPhotoModal(false);
        };
        if (showPhotoModal) {
            window.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
        }
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "auto";
        };
    }, [showPhotoModal]);

    useEffect(() => {
        let cancelled = false;

        const loadProfile = async () => {
            try {
                const res = await api.get("/me");
                if (cancelled) return;
                const user = res.data?.data || res.data;
                if (user) {
                    setCurrentUser(user);
                    setFormData({
                        nama: user.name || user.nama || "",
                        email: user.email || "",
                        nim: user.nim || "",
                        no_hp: user.no_hp || "",
                        program_studi: user.program_studi || "",
                        alamat: user.alamat || "",
                        password: "",
                        password_confirmation: "",
                    });
                }
            } catch (err) {
                if (!cancelled) {
                    console.error("Gagal memuat profil pengguna:", err);
                    if (currentUser) {
                        setFormData({
                            nama: currentUser.name || currentUser.nama || "",
                            email: currentUser.email || "",
                            nim: currentUser.nim || "",
                            no_hp: currentUser.no_hp || "",
                            program_studi: currentUser.program_studi || "",
                            alamat: currentUser.alamat || "",
                            password: "",
                            password_confirmation: "",
                        });
                    }
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void loadProfile();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError("Ukuran foto maksimal adalah 5 MB.");
            return;
        }

        setError("");
        setFotoFile(file);
        setPhotoError(false);

        const reader = new FileReader();
        reader.onloadend = () => {
            setFotoPreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors((prev) => ({ ...prev, [name]: "" }));
        }
        if (error) setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setError("");
        setFieldErrors({});

        if (!formData.nama.trim()) {
            setError("Nama lengkap tidak boleh kosong.");
            setFieldErrors({ nama: "Nama lengkap wajib diisi" });
            return;
        }

        if (formData.password && formData.password.length < 6) {
            setError("Kata sandi baru minimal harus 6 karakter.");
            setFieldErrors({ password: "Minimal 6 karakter" });
            return;
        }

        if (formData.password && formData.password !== formData.password_confirmation) {
            setError("Konfirmasi kata sandi tidak cocok dengan kata sandi baru.");
            setFieldErrors({ password_confirmation: "Konfirmasi kata sandi tidak cocok" });
            return;
        }

        setSubmitting(true);

        try {
            const data = new FormData();
            data.append("nama", formData.nama.trim());
            data.append("name", formData.nama.trim());
            if (formData.email) data.append("email", formData.email.trim());
            if (formData.nim) data.append("nim", formData.nim.trim());
            if (formData.no_hp) data.append("no_hp", formData.no_hp.trim());
            if (formData.program_studi) data.append("program_studi", formData.program_studi.trim());
            if (formData.alamat) data.append("alamat", formData.alamat.trim());
            if (formData.password) data.append("password", formData.password);
            if (fotoFile) data.append("foto", fotoFile);

            const res = await api.post("/me/update", data, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const updatedUser = res.data?.data || res.data?.user;
            setMessage("Profil berhasil diperbarui!");
            if (updatedUser) {
                setCurrentUser(updatedUser);
                localStorage.setItem("user", JSON.stringify(updatedUser));
                window.dispatchEvent(new CustomEvent("user-profile-updated", { detail: { user: updatedUser } }));
            }

            setFormData((prev) => ({
                ...prev,
                password: "",
                password_confirmation: "",
            }));

            // Scroll to top
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err) {
            const rawErrors = err.response?.data?.errors;
            let capturedFieldErrors = {};
            if (rawErrors && typeof rawErrors === "object") {
                Object.entries(rawErrors).forEach(([k, v]) => {
                    capturedFieldErrors[k] = Array.isArray(v) ? v[0] : String(v);
                });
            }

            let msg =
                err.response?.data?.message ||
                (rawErrors ? Object.values(rawErrors).flat().join(" ") : null) ||
                "";

            // Terjemahkan pesan teknis SQL / constraint error ke bahasa Indonesia yang ramah pengguna
            if (
                msg.includes("users_nim_unique") ||
                (msg.includes("Duplicate entry") && msg.includes("nim")) ||
                (msg.includes("1062") && msg.includes("nim")) ||
                capturedFieldErrors.nim
            ) {
                msg = "NIM/NPM tersebut sudah terdaftar pada akun peserta lain. Silakan periksa kembali NIM yang Anda masukkan.";
                capturedFieldErrors.nim = "NIM sudah terdaftar pada akun lain";
            } else if (
                msg.includes("users_email_unique") ||
                (msg.includes("Duplicate entry") && msg.includes("email")) ||
                (msg.includes("1062") && msg.includes("email")) ||
                capturedFieldErrors.email
            ) {
                msg = "Alamat email tersebut sudah digunakan oleh akun lain. Silakan gunakan alamat email yang berbeda.";
                capturedFieldErrors.email = "Email sudah digunakan";
            } else if (
                msg.includes("SQLSTATE[23000]") ||
                msg.includes("Integrity constraint violation") ||
                msg.includes("1062 Duplicate entry")
            ) {
                msg = "Data yang Anda masukkan (NIM atau Email) sudah terdaftar pada akun peserta lain. Mohon periksa kembali.";
            } else if (!msg) {
                msg = "Gagal memperbarui profil. Silakan coba beberapa saat lagi.";
            }

            setFieldErrors(capturedFieldErrors);
            setError(msg);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } finally {
            setSubmitting(false);
        }
    };

    const activePhoto = fotoPreview || getPhotoUrl(currentUser?.foto);
    const userInitial = String(formData.nama || currentUser?.name || currentUser?.nama || "P")
        .trim()
        .charAt(0)
        .toUpperCase();

    return (
        <div className="layout participant-panel" style={{ background: "#f8fafc", minHeight: "100vh" }}>
            <Sidebar />
            <div className="content">
                <main className="main participant-page-container">
                    {/* Header Halaman */}
                    <div className="page-heading">
                        <div>
                            <div className="eyebrow">
                                <span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: "#6366f1", marginRight: "6px" }}></span>
                                PENGATURAN AKUN
                            </div>
                            <h1>Edit Profil Peserta</h1>
                            <p className="subtitle">
                                Kelola data pribadi, informasi kontak, foto profil, dan keamanan akun magang Anda.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="btn-action"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px 16px",
                                borderRadius: "10px",
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                                color: "#475569",
                                fontWeight: "650",
                                fontSize: "13px",
                                cursor: "pointer",
                            }}
                        >
                            <ArrowLeft size={16} />
                            <span>Kembali</span>
                        </button>
                    </div>

                    {/* Notifikasi Pesan Sukses / Error */}
                    {message && (
                        <div
                            style={{
                                padding: "14px 18px",
                                background: "#ecfdf5",
                                border: "1px solid #a7f3d0",
                                borderRadius: "14px",
                                color: "#065f46",
                                fontSize: "13.5px",
                                fontWeight: "600",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                marginBottom: "22px",
                                boxShadow: "0 2px 10px rgba(16, 185, 129, 0.1)",
                            }}
                        >
                            <CheckCircle2 size={18} style={{ color: "#10b981", flexShrink: 0 }} />
                            <span>{message}</span>
                        </div>
                    )}

                    {error && (
                        <div
                            style={{
                                padding: "16px 20px",
                                background: "#fff1f2",
                                border: "1.5px solid #fecdd3",
                                borderRadius: "14px",
                                color: "#9f1239",
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "14px",
                                marginBottom: "24px",
                                boxShadow: "0 4px 14px rgba(225, 29, 72, 0.08)",
                            }}
                        >
                            <div
                                style={{
                                    width: "36px",
                                    height: "36px",
                                    borderRadius: "10px",
                                    background: "#ffe4e6",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <AlertCircle size={20} style={{ color: "#e11d48" }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: "750", fontSize: "14px", color: "#9f1239", marginBottom: "3px" }}>
                                    Perhatian: Gagal Menyimpan Profil
                                </div>
                                <div style={{ fontSize: "13px", color: "#881337", lineHeight: "1.5" }}>
                                    {error}
                                </div>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
                            <p style={{ fontSize: "14px", fontWeight: "600" }}>Memuat profil akun Anda...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                                  gap: "24px",
                                  alignItems: "start",
                                }}
                            >
                                {/* KOLOM KIRI: Foto Profil & Kartu Status */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                    <div
                                        style={{
                                            background: "#ffffff",
                                            border: "1px solid #e2e8f0",
                                            borderRadius: "18px",
                                            padding: "28px 24px",
                                            boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.04)",
                                            textAlign: "center",
                                        }}
                                    >
                                        {/* Avatar Container */}
                                        <div style={{ position: "relative", width: "120px", height: "120px", margin: "0 auto 16px" }}>
                                            <div
                                                onClick={() => setShowPhotoModal(true)}
                                                style={{
                                                    width: "120px",
                                                    height: "120px",
                                                    borderRadius: "50%",
                                                    background: "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)",
                                                    overflow: "hidden",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: "42px",
                                                    fontWeight: "800",
                                                    color: "#ffffff",
                                                    boxShadow: "0 8px 24px rgba(79, 70, 229, 0.25)",
                                                    border: "3px solid #ffffff",
                                                    cursor: "pointer",
                                                    position: "relative",
                                                }}
                                                title="Klik untuk melihat foto profil ukuran penuh"
                                            >
                                                {activePhoto && !photoError ? (
                                                    <img
                                                        src={activePhoto}
                                                        alt="Foto Profil"
                                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                        onError={() => setPhotoError(true)}
                                                    />
                                                ) : (
                                                    <span>{userInitial}</span>
                                                )}
                                            </div>

                                            <label
                                                htmlFor="foto-upload"
                                                style={{
                                                    position: "absolute",
                                                    bottom: "2px",
                                                    right: "2px",
                                                    width: "36px",
                                                    height: "36px",
                                                    borderRadius: "50%",
                                                    background: "#4f46e5",
                                                    color: "#ffffff",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    cursor: "pointer",
                                                    boxShadow: "0 4px 10px rgba(79, 70, 229, 0.4)",
                                                    border: "2px solid #ffffff",
                                                    transition: "transform 0.15s ease",
                                                }}
                                                title="Ganti Foto Profil"
                                            >
                                                <Camera size={18} />
                                            </label>
                                            <input
                                                id="foto-upload"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                style={{ display: "none" }}
                                            />
                                        </div>

                                        {/* Tombol Aksi Cepat: Lihat Foto & Ganti Foto */}
                                        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "16px" }}>
                                            <button
                                                type="button"
                                                onClick={() => setShowPhotoModal(true)}
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "6px",
                                                    padding: "6px 14px",
                                                    borderRadius: "10px",
                                                    border: "1.5px solid #cbd5e1",
                                                    background: "#ffffff",
                                                    color: "#334155",
                                                    fontSize: "12px",
                                                    fontWeight: "650",
                                                    cursor: "pointer",
                                                    transition: "all 0.15s ease",
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.borderColor = "#6366f1";
                                                    e.currentTarget.style.color = "#4f46e5";
                                                    e.currentTarget.style.background = "#f5f3ff";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.borderColor = "#cbd5e1";
                                                    e.currentTarget.style.color = "#334155";
                                                    e.currentTarget.style.background = "#ffffff";
                                                }}
                                                title="Lihat Foto Profil Penuh"
                                            >
                                                <Eye size={14} />
                                                <span>Lihat Foto</span>
                                            </button>

                                            <label
                                                htmlFor="foto-upload"
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "6px",
                                                    padding: "6px 14px",
                                                    borderRadius: "10px",
                                                    border: "1.5px solid #e0e7ff",
                                                    background: "#eef2ff",
                                                    color: "#4f46e5",
                                                    fontSize: "12px",
                                                    fontWeight: "650",
                                                    cursor: "pointer",
                                                    transition: "all 0.15s ease",
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = "#e0e7ff";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = "#eef2ff";
                                                }}
                                                title="Unggah Foto Baru"
                                            >
                                                <Camera size={14} />
                                                <span>Ganti Foto</span>
                                            </label>
                                        </div>

                                        <h3 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>
                                            {formData.nama || "Peserta Magang"}
                                        </h3>
                                        <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b" }}>
                                            {formData.email || "email@contoh.com"}
                                        </p>

                                        <div
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                padding: "6px 14px",
                                                background: "#ecfdf5",
                                                border: "1px solid #bbf7d0",
                                                borderRadius: "9999px",
                                                color: "#166534",
                                                fontSize: "12px",
                                                fontWeight: "750",
                                                marginBottom: "16px",
                                            }}
                                        >
                                            <ShieldCheck size={14} style={{ color: "#16a34a" }} />
                                            <span>Akun Peserta Magang Aktif</span>
                                        </div>

                                        <p style={{ margin: 0, fontSize: "11.5px", color: "#94a3b8", lineHeight: "1.4" }}>
                                            Klik ikon kamera di atas untuk mengganti foto profil. Format: JPG, PNG, atau WEBP (Maksimal 5 MB).
                                        </p>
                                    </div>

                                    {/* Informasi Tambahan */}
                                    <div
                                        style={{
                                            background: "#ffffff",
                                            border: "1px solid #e2e8f0",
                                            borderRadius: "18px",
                                            padding: "20px 24px",
                                            boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.04)",
                                        }}
                                    >
                                        <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>
                                            📌 Petunjuk Edit Profil
                                        </h4>
                                        <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "#64748b", lineHeight: "1.6" }}>
                                            <li>Nama dan foto akan otomatis tampil di kartu absensi, tugas, dan sertifikat laporan.</li>
                                            <li>NPM/NIM digunakan sebagai identitas resmi presensi kehadiran magang.</li>
                                            <li>Kosongkan kolom kata sandi jika tidak berniat mengganti password login.</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* KOLOM KANAN: Formulir Data Diri & Keamanan */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                    {/* KARTU 1: DATA PRIBADI & AKADEMIK */}
                                    <div
                                        style={{
                                            background: "#ffffff",
                                            border: "1px solid #e2e8f0",
                                            borderRadius: "18px",
                                            padding: "24px 28px",
                                            boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.04)",
                                        }}
                                    >
                                        <h3 style={{ margin: "0 0 18px", fontSize: "16px", fontWeight: "800", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                                            <User size={18} style={{ color: "#4f46e5" }} />
                                            <span>Informasi Pribadi & Kontak</span>
                                        </h3>

                                        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
                                            <div>
                                                <label style={{ display: "block", fontSize: "12px", fontWeight: "750", color: "#475569", marginBottom: "6px" }}>
                                                    NAMA LENGKAP <span style={{ color: "#ef4444" }}>*</span>
                                                </label>
                                                <div style={{ position: "relative" }}>
                                                    <input
                                                        type="text"
                                                        name="nama"
                                                        value={formData.nama}
                                                        onChange={handleChange}
                                                        required
                                                        placeholder="Masukkan nama lengkap Anda"
                                                        style={{
                                                            width: "100%",
                                                            padding: "10px 14px",
                                                            borderRadius: "10px",
                                                            border: "1.5px solid #cbd5e1",
                                                            fontSize: "13.5px",
                                                            outline: "none",
                                                            boxSizing: "border-box",
                                                            fontFamily: "inherit",
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                                                <div>
                                                    <label style={{ display: "block", fontSize: "12px", fontWeight: "750", color: "#475569", marginBottom: "6px" }}>
                                                        NPM / NIM
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="nim"
                                                        value={formData.nim}
                                                        onChange={handleChange}
                                                        placeholder="Contoh: 21100123"
                                                        style={{
                                                            width: "100%",
                                                            padding: "10px 14px",
                                                            borderRadius: "10px",
                                                            border: fieldErrors.nim ? "1.5px solid #ef4444" : "1.5px solid #cbd5e1",
                                                            background: fieldErrors.nim ? "#fef2f2" : "#ffffff",
                                                            fontSize: "13.5px",
                                                            outline: "none",
                                                            boxSizing: "border-box",
                                                            fontFamily: "inherit",
                                                        }}
                                                    />
                                                    {fieldErrors.nim && (
                                                        <span style={{ display: "block", color: "#dc2626", fontSize: "11.5px", marginTop: "4px", fontWeight: "600" }}>
                                                            ⚠️ {fieldErrors.nim}
                                                        </span>
                                                    )}
                                                </div>

                                                <div>
                                                    <label style={{ display: "block", fontSize: "12px", fontWeight: "750", color: "#475569", marginBottom: "6px" }}>
                                                        EMAIL
                                                    </label>
                                                    <input
                                                        type="email"
                                                        name="email"
                                                        value={formData.email}
                                                        onChange={handleChange}
                                                        placeholder="alamat@email.com"
                                                        style={{
                                                            width: "100%",
                                                            padding: "10px 14px",
                                                            borderRadius: "10px",
                                                            border: fieldErrors.email ? "1.5px solid #ef4444" : "1.5px solid #cbd5e1",
                                                            background: fieldErrors.email ? "#fef2f2" : "#ffffff",
                                                            fontSize: "13.5px",
                                                            outline: "none",
                                                            boxSizing: "border-box",
                                                            fontFamily: "inherit",
                                                        }}
                                                    />
                                                    {fieldErrors.email && (
                                                        <span style={{ display: "block", color: "#dc2626", fontSize: "11.5px", marginTop: "4px", fontWeight: "600" }}>
                                                            ⚠️ {fieldErrors.email}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                                                <div>
                                                    <label style={{ display: "block", fontSize: "12px", fontWeight: "750", color: "#475569", marginBottom: "6px" }}>
                                                        NOMOR WHATSAPP / TELEPON
                                                    </label>
                                                    <input
                                                        type="tel"
                                                        name="no_hp"
                                                        value={formData.no_hp}
                                                        onChange={handleChange}
                                                        placeholder="081234567890"
                                                        style={{
                                                            width: "100%",
                                                            padding: "10px 14px",
                                                            borderRadius: "10px",
                                                            border: "1.5px solid #cbd5e1",
                                                            fontSize: "13.5px",
                                                            outline: "none",
                                                            boxSizing: "border-box",
                                                            fontFamily: "inherit",
                                                        }}
                                                    />
                                                </div>

                                                <div>
                                                    <label style={{ display: "block", fontSize: "12px", fontWeight: "750", color: "#475569", marginBottom: "6px" }}>
                                                        PROGRAM STUDI / JURUSAN
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="program_studi"
                                                        value={formData.program_studi}
                                                        onChange={handleChange}
                                                        placeholder="Teknik Informatika / Sistem Informasi"
                                                        style={{
                                                            width: "100%",
                                                            padding: "10px 14px",
                                                            borderRadius: "10px",
                                                            border: "1.5px solid #cbd5e1",
                                                            fontSize: "13.5px",
                                                            outline: "none",
                                                            boxSizing: "border-box",
                                                            fontFamily: "inherit",
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label style={{ display: "block", fontSize: "12px", fontWeight: "750", color: "#475569", marginBottom: "6px" }}>
                                                    ALAMAT DOMISILI / TEMPAT TINGGAL
                                                </label>
                                                <textarea
                                                    name="alamat"
                                                    value={formData.alamat}
                                                    onChange={handleChange}
                                                    rows={3}
                                                    placeholder="Tuliskan alamat tempat tinggal Anda saat ini"
                                                    style={{
                                                        width: "100%",
                                                        padding: "10px 14px",
                                                        borderRadius: "10px",
                                                        border: "1.5px solid #cbd5e1",
                                                        fontSize: "13.5px",
                                                        outline: "none",
                                                        boxSizing: "border-box",
                                                        fontFamily: "inherit",
                                                        resize: "vertical",
                                                    }}
                                                ></textarea>
                                            </div>
                                        </div>
                                    </div>

                                    {/* KARTU 2: KEAMANAN / GANTI PASSWORD */}
                                    <div
                                        style={{
                                            background: "#ffffff",
                                            border: "1px solid #e2e8f0",
                                            borderRadius: "18px",
                                            padding: "24px 28px",
                                            boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.04)",
                                        }}
                                    >
                                        <h3 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: "800", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                                            <Lock size={18} style={{ color: "#4f46e5" }} />
                                            <span>Keamanan Akun (Ganti Kata Sandi)</span>
                                        </h3>
                                        <p style={{ margin: "0 0 16px", fontSize: "12.5px", color: "#64748b" }}>
                                            Biarkan kedua kolom di bawah kosong jika tidak ingin mengubah kata sandi Anda.
                                        </p>

                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                                            <div>
                                                <label style={{ display: "block", fontSize: "12px", fontWeight: "750", color: "#475569", marginBottom: "6px" }}>
                                                    KATA SANDI BARU
                                                </label>
                                                <input
                                                    type="password"
                                                    name="password"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    placeholder="Minimal 6 karakter"
                                                    style={{
                                                        width: "100%",
                                                        padding: "10px 14px",
                                                        borderRadius: "10px",
                                                        border: "1.5px solid #cbd5e1",
                                                        fontSize: "13.5px",
                                                        outline: "none",
                                                        boxSizing: "border-box",
                                                        fontFamily: "inherit",
                                                    }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ display: "block", fontSize: "12px", fontWeight: "750", color: "#475569", marginBottom: "6px" }}>
                                                    KONFIRMASI KATA SANDI
                                                </label>
                                                <input
                                                    type="password"
                                                    name="password_confirmation"
                                                    value={formData.password_confirmation}
                                                    onChange={handleChange}
                                                    placeholder="Ulangi kata sandi baru"
                                                    style={{
                                                        width: "100%",
                                                        padding: "10px 14px",
                                                        borderRadius: "10px",
                                                        border: "1.5px solid #cbd5e1",
                                                        fontSize: "13.5px",
                                                        outline: "none",
                                                        boxSizing: "border-box",
                                                        fontFamily: "inherit",
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* TOMBOL SIMPAN AKSI */}
                                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "4px" }}>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                padding: "12px 28px",
                                                borderRadius: "12px",
                                                border: "none",
                                                background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                                                color: "#ffffff",
                                                fontWeight: "750",
                                                fontSize: "14px",
                                                cursor: submitting ? "wait" : "pointer",
                                                boxShadow: "0 4px 14px rgba(79, 70, 229, 0.35)",
                                                transition: "all 0.2s ease",
                                                fontFamily: "inherit",
                                            }}
                                        >
                                            <Save size={18} />
                                            <span>{submitting ? "Menyimpan Perubahan..." : "Simpan Perubahan"}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    )}
                </main>
            </div>

            {/* MODAL LIGHTBOX: TAMPILAN FOTO PENUH SESUAI TEMA WEBSITE */}
            {showPhotoModal && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Foto Profil Peserta"
                    onClick={() => setShowPhotoModal(false)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 99999,
                        background: "rgba(15, 23, 42, 0.88)",
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "24px 20px",
                        animation: "fadeIn 0.2s ease-out",
                    }}
                >
                    {/* Tombol Tutup X Minimalis Selaras Tema */}
                    <button
                        type="button"
                        onClick={() => setShowPhotoModal(false)}
                        style={{
                            position: "absolute",
                            top: "24px",
                            right: "24px",
                            width: "44px",
                            height: "44px",
                            borderRadius: "12px",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            background: "rgba(255, 255, 255, 0.1)",
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            zIndex: 10,
                            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.3)",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#4f46e5";
                            e.currentTarget.style.borderColor = "#6366f1";
                            e.currentTarget.style.transform = "scale(1.08)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                            e.currentTarget.style.transform = "scale(1)";
                        }}
                        title="Tutup (Esc)"
                    >
                        <X size={22} />
                    </button>

                    {/* AREA FOTO PENUH (TIDAK BULAT) */}
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: "relative",
                            maxHeight: "84vh",
                            maxWidth: "min(720px, 94vw)",
                            borderRadius: "20px",
                            overflow: "hidden",
                            background: "#0f172a",
                            border: "2px solid rgba(99, 102, 241, 0.4)",
                            boxShadow: "0 25px 60px -10px rgba(2, 6, 23, 0.9), 0 0 35px rgba(99, 102, 241, 0.25)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        {activePhoto && !photoError ? (
                            <img
                                src={activePhoto}
                                alt="Foto Profil"
                                style={{
                                    display: "block",
                                    maxWidth: "100%",
                                    maxHeight: "84vh",
                                    objectFit: "contain",
                                    borderRadius: "18px",
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: "280px",
                                    height: "280px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#ffffff",
                                    gap: "14px",
                                    padding: "30px",
                                }}
                            >
                                <div
                                    style={{
                                        width: "90px",
                                        height: "90px",
                                        borderRadius: "50%",
                                        background: "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "40px",
                                        fontWeight: "800",
                                        color: "#ffffff",
                                        boxShadow: "0 8px 24px rgba(79, 70, 229, 0.35)",
                                    }}
                                >
                                    {userInitial}
                                </div>
                                <span style={{ fontSize: "14px", fontWeight: "600", color: "#94a3b8" }}>
                                    Belum Ada Foto Profil
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

