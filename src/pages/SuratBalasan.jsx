import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { getStoredUser } from "../utils/auth";
import {
  GraduationCap,
  FileText,
  Download,
  Eye,
  CheckCircle2,
  Calendar,
  Building,
  BookOpen,
  User,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  LogOut,
  RefreshCw,
  AlertCircle,
  FileCheck,
  Check,
  Mail,
  MapPin
} from "lucide-react";

export default function SuratBalasan() {
  const navigate = useNavigate();
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(() => getStoredUser() || {});

  useEffect(() => {
    let active = true;
    api.get("/pendaftaran/me")
      .then((response) => {
        if (!active) return;
        const reg = response.data?.data || null;
        setRegistration(reg);
        if (reg?.user) {
          setLoggedInUser(reg.user);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || "Data surat balasan belum dapat dimuat.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const getAssetUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("data:") || path.startsWith("blob:") || /^https?:\/\//i.test(path)) return path;
    const clean = String(path).replace(/^\/+/, "").replace(/^storage\//, "");
    return `/storage/${clean}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  const downloadReplyLetter = async () => {
    setDownloading(true);
    setError("");
    try {
      const response = await api.get("/pendaftaran/me/surat-balasan/download", {
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = String(registration?.file_surat_balasan || "surat-balasan-magang.pdf").split("/").pop();
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setDownloadSuccess(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Surat balasan gagal diunduh. Silakan coba lagi.");
    } finally {
      setDownloading(false);
    }
  };

  const previewReplyLetter = async () => {
    setPreviewing(true);
    setError("");
    try {
      const response = await api.get("/pendaftaran/me/surat-balasan/download", {
        responseType: "blob",
      });
      const fileBlob = new Blob([response.data], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(fileBlob);
      window.open(blobUrl, "_blank");
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Surat balasan gagal dibuka. Silakan periksa kembali berkas Anda.");
    } finally {
      setPreviewing(false);
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("participant");
    if (token) {
      void api.post("/logout", {}, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch((err) => {
        console.error("Gagal keluar dari sesi server:", err);
      });
    }
    window.location.replace("/");
  };

  const regUser = registration?.user || loggedInUser;
  const displayName = regUser?.nama || regUser?.name || loggedInUser?.name || "Peserta Magang";
  const userPhoto = getAssetUrl(registration?.pas_foto || regUser?.foto);
  const regPeriode = registration?.periode;
  const fileName = String(registration?.file_surat_balasan || "surat-balasan.pdf").split("/").pop();
  const hasReplyLetter = Boolean(registration?.file_surat_balasan);

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      fontFamily: "'Poppins', sans-serif",
      background: "radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.04) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(59, 130, 246, 0.04) 0px, transparent 50%), #f8fafc",
      flexDirection: "column"
    }}>

      {/* 1. TOP COLORFUL ENERGY LIGHTBAR (PERSIS DENGAN HALAMAN PENDAFTARAN) */}
      <div style={{
        height: "3.5px",
        width: "100%",
        background: "linear-gradient(90deg, #4f46e5 0%, #3b82f6 30%, #06b6d4 60%, #10b981 100%)",
        position: "sticky",
        top: 0,
        zIndex: 51
      }} />

      {/* 2. TOP NAVBAR MODERN, LUMINOUS, & BERENERGI (PERSIS DENGAN HALAMAN PENDAFTARAN) */}
      <header style={{
        background: "rgba(255, 255, 255, 0.94)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(226, 232, 240, 0.85)",
        padding: "12px 28px",
        position: "sticky",
        top: "3.5px",
        zIndex: 50,
        boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.05)"
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap"
        }}>
          {/* Logo & Portal Info */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: "14px", textDecoration: "none" }}>
            <div style={{
              width: "44px",
              height: "44px",
              background: "#ffffff",
              borderRadius: "12px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              boxShadow: "0 4px 14px rgba(79, 70, 229, 0.15)",
              overflow: "hidden",
              padding: "3px",
              border: "1.5px solid #e0e7ff",
              transition: "transform 0.2s ease"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <img src="/logo.png" alt="Logo PAM-TECHNO" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  fontSize: "17px",
                  fontWeight: "800",
                  letterSpacing: "-0.3px",
                  background: "linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}>
                  PAM-TECHNO
                </span>
                <span style={{
                  fontSize: "11px",
                  background: "#e0e7ff",
                  color: "#4338ca",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontWeight: "700",
                  border: "1px solid #c7d2fe",
                  letterSpacing: "0.2px"
                }}>
                  Peserta Magang
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px", marginTop: "2px", fontWeight: "500" }}>
                <span style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#10b981",
                  display: "inline-block",
                  boxShadow: "0 0 8px #10b981"
                }}></span>
                Sistem Pendaftaran & Administrasi Magang
              </div>
            </div>
          </Link>

          {/* User Profile Area */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* User Profile Pill */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "#f8fafc",
              padding: "5px 14px 5px 6px",
              borderRadius: "30px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
            }}>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: "bold",
                overflow: "hidden",
                boxShadow: "0 2px 6px rgba(79, 70, 229, 0.25)",
                border: "2px solid #ffffff"
              }}>
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt="Foto Profil"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", lineHeight: "1.2" }}>
                  {displayName}
                </span>
                <span style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  color: "#15803d"
                }}>
                  ● Pemagang Resmi
                </span>
              </div>
            </div>

            {/* Tombol Keluar Modern */}
            <button
              onClick={handleLogout}
              title="Keluar dari akun"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "#fef2f2",
                color: "#dc2626",
                border: "1px solid #fecaca",
                padding: "8px 14px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "12.5px",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#ef4444";
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.borderColor = "#ef4444";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fef2f2";
                e.currentTarget.style.color = "#dc2626";
                e.currentTarget.style.borderColor = "#fecaca";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <LogOut size={14} />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. MAIN WRAPPER (MAX-WIDTH 1200PX PERSIS HALAMAN PENDAFTARAN) */}
      <main style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "24px 20px 48px",
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "24px"
      }}>

        {/* HERO BANNER KELULUSAN / PENERIMAAN (DESAIN KONSISTEN DENGAN HERO PENDAFTARAN) */}
        <div style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #312e81 100%)",
          borderRadius: "20px",
          padding: "30px 32px",
          boxShadow: "0 10px 30px -10px rgba(15, 23, 42, 0.25)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Latar Belakang Lingkaran Cahaya Halus */}
          <div style={{
            position: "absolute",
            top: "-50px",
            right: "-50px",
            width: "250px",
            height: "250px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)",
            filter: "blur(40px)",
            pointerEvents: "none"
          }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px", flexWrap: "wrap" }}>
              <div>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#cbd5e1",
                  letterSpacing: "0.5px",
                  marginBottom: "10px"
                }}>
                  <Sparkles size={12} color="#10b981" />
                  PENGUMUMAN HASIL RESMI
                </div>

                <h1 style={{
                  margin: "0 0 8px 0",
                  fontSize: "25px",
                  fontWeight: "800",
                  letterSpacing: "-0.4px",
                  color: "#ffffff"
                }}>
                  Selamat, Pengajuan Magang Anda Diterima!
                </h1>

                <p style={{ margin: 0, fontSize: "14px", color: "#cbd5e1", lineHeight: "1.6", maxWidth: "680px" }}>
                  Selamat kepada <strong style={{ color: "#ffffff" }}>{displayName}</strong>! Berkas pendaftaran dan persyaratan Anda telah berhasil diverifikasi dan disetujui resmi oleh manajemen <strong style={{ color: "#4ade80" }}>PAM Techno</strong>. Surat balasan resmi telah diterbitkan dan dapat diunduh di bawah ini.
                </p>
              </div>

              {/* Status Chip Hijau di Kanan Banner */}
              <div style={{
                background: "rgba(34, 197, 94, 0.18)",
                border: "1.5px solid #4ade80",
                padding: "10px 18px",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backdropFilter: "blur(8px)"
              }}>
                <span style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  display: "inline-block",
                  boxShadow: "0 0 10px #22c55e"
                }} />
                <div>
                  <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.7)", textTransform: "uppercase", fontWeight: "600" }}>Status Pendaftaran</div>
                  <div style={{ fontSize: "14px", fontWeight: "800", color: "#ffffff" }}>
                    Resmi Diterima
                  </div>
                </div>
              </div>
            </div>

            {/* Stepper Wizard Horizontal */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(255, 255, 255, 0.12)", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#10b981", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold" }}>
                  ✓
                </div>
                <span style={{ fontSize: "12.5px", fontWeight: "600", color: "#f8fafc" }}>1. Formulir Terkirim</span>
              </div>

              <span style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: "14px" }}>—</span>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#10b981", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold" }}>
                  ✓
                </div>
                <span style={{ fontSize: "12.5px", fontWeight: "600", color: "#f8fafc" }}>
                  2. Verifikasi Dokumen
                </span>
              </div>

              <span style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: "14px" }}>—</span>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "#10b981",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: "bold",
                  boxShadow: "0 0 10px rgba(16, 185, 129, 0.6)"
                }}>
                  ✓
                </div>
                <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#4ade80" }}>
                  3. Pemagang Aktif (Diterima)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* LOADING & ERROR STATES */}
        {loading && (
          <div style={{
            background: "#ffffff",
            padding: "48px",
            borderRadius: "18px",
            textAlign: "center",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)"
          }}>
            <RefreshCw size={26} color="#4f46e5" style={{ animation: "spin 1.2s linear infinite", margin: "0 auto 12px" }} />
            <h3 style={{ margin: "0 0 6px", color: "#0f172a", fontSize: "15px", fontWeight: "700" }}>Memuat Berkas Surat Balasan...</h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>Mengambil data penugasan dari server PAM Techno</p>
          </div>
        )}

        {error && (
          <div style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "14px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: "#991b1b"
          }}>
            <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: "13.5px" }}>{error}</div>
          </div>
        )}

        {/* LAYOUT 2 KOLOM KONTEN UTAMA */}
        {!loading && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "24px",
            alignItems: "stretch"
          }}>

            {/* KOLOM KIRI: KARTU DOKUMEN RESMI SURAT BALASAN */}
            <div style={{
              background: "#ffffff",
              borderRadius: "18px",
              padding: "28px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", paddingBottom: "14px", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FileCheck size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>Dokumen Surat Balasan</h3>
                      <p style={{ margin: 0, fontSize: "11.5px", color: "#64748b" }}>Berkas pengesahan resmi penerimaan magang</p>
                    </div>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: "700", background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0", padding: "3px 9px", borderRadius: "12px" }}>
                    ✓ Dokumen Sah
                  </span>
                </div>

                <p style={{ fontSize: "13.5px", color: "#475569", lineHeight: "1.6", margin: "0 0 16px" }}>
                  Surat balasan resmi diterbitkan untuk gelombang periode magang Anda. Dokumen ini dapat diunduh dan digunakan sebagai bukti pengesahan untuk pihak kampus maupun arsip pribadi.
                </p>

                {/* Box Berkas PDF */}
                {hasReplyLetter ? (
                  <div style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    marginBottom: "18px"
                  }}>
                    <div style={{
                      width: "42px",
                      height: "46px",
                      borderRadius: "8px",
                      background: "#fee2e2",
                      color: "#ef4444",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid #fecaca",
                      flexShrink: 0
                    }}>
                      <FileText size={20} />
                      <span style={{ fontSize: "8.5px", fontWeight: "900", marginTop: "1px" }}>PDF</span>
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {fileName}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#16a34a", fontWeight: "600", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Check size={12} strokeWidth={3} />
                        <span>Dokumen siap diakses & diunduh</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: "#fffbeb",
                    border: "1px dashed #f59e0b",
                    borderRadius: "12px",
                    padding: "16px",
                    textAlign: "center",
                    color: "#92400e",
                    fontSize: "13px",
                    marginBottom: "18px"
                  }}>
                    Berkas surat balasan sedang disiapkan oleh tim administrator.
                  </div>
                )}

                {downloadSuccess && (
                  <div style={{
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    fontSize: "12px",
                    color: "#065f46",
                    fontWeight: "600",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <CheckCircle2 size={16} color="#10b981" />
                    <span>Surat balasan berhasil diunduh ke komputer Anda!</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                {hasReplyLetter && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={previewReplyLetter}
                      disabled={previewing}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        background: "#ffffff",
                        color: "#4f46e5",
                        border: "1.5px solid #c7d2fe",
                        padding: "11px 16px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: "700",
                        cursor: previewing ? "wait" : "pointer",
                        transition: "all 0.15s ease",
                        boxShadow: "0 1px 3px rgba(79, 70, 229, 0.08)"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#eef2ff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
                    >
                      {previewing ? (
                        <>
                          <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
                          <span>Membuka...</span>
                        </>
                      ) : (
                        <>
                          <Eye size={15} />
                          <span>Lihat Surat</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={downloadReplyLetter}
                      disabled={downloading}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        color: "#ffffff",
                        border: "none",
                        padding: "11px 16px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: "800",
                        cursor: downloading ? "wait" : "pointer",
                        boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
                        transition: "all 0.15s ease"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.95"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                    >
                      {downloading ? (
                        <>
                          <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
                          <span>Mengunduh...</span>
                        </>
                      ) : (
                        <>
                          <Download size={15} />
                          <span>Unduh Surat (.pdf)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                  <ShieldCheck size={13} color="#10b981" />
                  <span>Data terenkripsi dan disimpan resmi pada sistem PAM Techno.</span>
                </div>
              </div>
            </div>

            {/* KOLOM KANAN: DETAIL BIODATA & PENUGASAN AKADEMIK */}
            <div style={{
              background: "#ffffff",
              borderRadius: "18px",
              padding: "28px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}>
              <div>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", paddingBottom: "14px", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#e0e7ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <User size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>Detail Penugasan Peserta</h3>
                      <p style={{ margin: 0, fontSize: "11.5px", color: "#64748b" }}>Data pendaftaran yang tersimpan</p>
                    </div>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: "700", background: "#e0e7ff", color: "#4338ca", border: "1px solid #c7d2fe", padding: "3px 9px", borderRadius: "12px" }}>
                    ✓ Terverifikasi Sistem
                  </span>
                </div>

                {/* Profil Singkat & Foto (Format Sama Persis Rangkuman Berkas) */}
                <div style={{ display: "flex", gap: "16px", alignItems: "center", background: "#f8fafc", padding: "16px", borderRadius: "14px", border: "1px solid #e2e8f0", marginBottom: "18px" }}>
                  <div style={{
                    width: "60px",
                    height: "78px",
                    borderRadius: "8px",
                    background: "#e2e8f0",
                    overflow: "hidden",
                    flexShrink: 0,
                    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.08)",
                    border: "2px solid #ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {userPhoto ? (
                      <img src={userPhoto} alt="Pas Foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <User size={26} color="#94a3b8" />
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: "12px", color: "#4f46e5", fontWeight: "700", marginTop: "2px" }}>
                      NIM: {regUser?.nim || "-"}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <Mail size={12} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{regUser?.email || "-"}</span>
                    </div>
                  </div>
                </div>

                {/* Details List */}
                <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13px" }}>
                  
                  {/* Asal Instansi */}
                  <div style={{ paddingBottom: "10px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", marginBottom: "2px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <Building size={12} color="#6366f1" />
                      Asal Instansi / Kampus
                    </div>
                    <div style={{ fontWeight: "700", color: "#0f172a" }}>
                      {registration?.asal_instansi || "-"}
                    </div>
                  </div>

                  {/* Program Studi */}
                  <div style={{ paddingBottom: "10px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", marginBottom: "2px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <BookOpen size={12} color="#6366f1" />
                      Program Studi / Jurusan
                    </div>
                    <div style={{ fontWeight: "700", color: "#0f172a" }}>
                      {regUser?.program_studi || registration?.user?.program_studi || loggedInUser?.program_studi || "-"}
                    </div>
                  </div>

                  {/* Periode Magang */}
                  <div style={{ paddingBottom: "10px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", marginBottom: "2px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <Calendar size={12} color="#6366f1" />
                      Gelombang Periode Magang
                    </div>
                    <div style={{ fontWeight: "700", color: "#0f172a" }}>
                      {regPeriode?.nama ? `${regPeriode.nama} : ` : ""}
                      {regPeriode?.tanggal_mulai ? `${formatDate(regPeriode.tanggal_mulai)} s.d. ${formatDate(regPeriode.tanggal_selesai)}` : "Periode Magang Terpilih"}
                    </div>
                  </div>

                  {/* Pembimbing Lapangan */}
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", marginBottom: "2px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <GraduationCap size={12} color="#6366f1" />
                      Pembimbing Lapangan
                    </div>
                    <div style={{ fontWeight: "700", color: registration?.pembimbing?.nama || registration?.pembimbing?.name ? "#0f172a" : "#64748b" }}>
                      {registration?.pembimbing?.nama || registration?.pembimbing?.name || "Akan diumumkan koordinator"}
                    </div>
                  </div>

                </div>
              </div>

              {/* Status Badge */}
              <div style={{
                marginTop: "16px",
                padding: "10px 14px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <span style={{ fontSize: "12px", color: "#166534", fontWeight: "600" }}>Status Penugasan:</span>
                <span style={{ fontSize: "12px", color: "#15803d", fontWeight: "800", display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#16a34a" }}></span>
                  Pemagang Aktif
                </span>
              </div>
            </div>

          </div>
        )}

        {/* 4. NEXT STEP ACTION CARD (KONSISTEN & MODERN) */}
        {!loading && (
          <section style={{
            background: "#ffffff",
            borderRadius: "18px",
            padding: "24px 28px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px"
          }}>
            <div style={{ maxWidth: "640px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: "800", color: "#4f46e5", background: "#eef2ff", padding: "2px 8px", borderRadius: "6px" }}>
                  LANGKAH BERIKUTNYA
                </span>
                <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                  Mulai Aktivitas Magang Anda
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: "13.5px", color: "#64748b", lineHeight: "1.5" }}>
                Setelah mengunduh berkas surat balasan resmi, silakan lanjutkan ke portal kerja untuk mengisi presensi/absensi harian dan menerima instruksi tugas dari pembimbing.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/absensi", { replace: true })}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                color: "#ffffff",
                border: "none",
                padding: "12px 22px",
                borderRadius: "10px",
                fontSize: "13.5px",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(79, 70, 229, 0.3)",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 18px rgba(79, 70, 229, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(79, 70, 229, 0.3)";
              }}
            >
              <span>Lanjut ke Portal Absensi</span>
              <ArrowRight size={16} />
            </button>
          </section>
        )}

      </main>
    </div>
  );
}
