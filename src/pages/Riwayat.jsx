import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";

function Riwayat() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reviewMessage, setReviewMessage] = useState("");
    const [reviewingId, setReviewingId] = useState(null);
    const [downloadingLetter, setDownloadingLetter] = useState(false);
    const [clock, setClock] = useState(new Date());
    const [previewImage, setPreviewImage] = useState(null);
    const [role] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null")?.role?.toLowerCase() || "peserta";
        } catch {
            return "peserta";
        }
    });

    const handleDownloadReplyLetter = async () => {
        setDownloadingLetter(true);
        try {
            const response = await api.get('/pendaftaran/me/surat-balasan/download', {
                responseType: 'blob',
            });
            const url = URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'surat-balasan-magang.pdf';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 30000);
            setError("");
            await loadData();
        } catch (downloadError) {
            alert(downloadError.response?.status === 404
                ? "Berkas surat balasan belum tersedia di server. Silakan hubungi admin."
                : "Gagal mengunduh surat balasan. Silakan coba lagi.");
        } finally {
            setDownloadingLetter(false);
        }
    };

    const fetchAttendance = useCallback(async () => {
        const endpoint = role === "admin" || role === "pembimbing" ? "/absensi" : "/absensi-saya";
        const response = await api.get(endpoint);
        const responseData = response.data?.data || response.data || [];
        return Array.isArray(responseData) ? responseData : [];
    }, [role]);

    const loadData = useCallback(async () => {
        try {
            const attendance = await fetchAttendance();
            setError("");
            setData(attendance);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Data absensi gagal dimuat. Pastikan server API aktif lalu muat ulang halaman.");
        } finally {
            setLoading(false);
        }
    }, [fetchAttendance]);

    useEffect(() => {
        let cancelled = false;
        const loadInitialData = async () => {
            try {
                const attendance = await fetchAttendance();
                if (!cancelled) {
                    setError("");
                    setData(attendance);
                }
            } catch (requestError) {
                if (!cancelled) {
                    setError(requestError.response?.data?.message || "Data absensi gagal dimuat. Pastikan server API aktif lalu muat ulang halaman.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void loadInitialData();
        const timer = setInterval(() => setClock(new Date()), 1000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [fetchAttendance]);

    const handleReviewLeave = async (attendanceId, decision) => {
        setReviewingId(attendanceId);
        setReviewMessage("");
        setError("");

        try {
            const response = await api.post(`/absensi/${attendanceId}/review-izin`, { decision });
            setReviewMessage(response.data.message);
            await loadData();
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Permohonan izin gagal diproses.");
        } finally {
            setReviewingId(null);
        }
    };

    const dateLabel = clock.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    };

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                <Navbar />
                <main className="main">
                    <div className="page-heading">
                        <div>
                            <p className="eyebrow">{role === "admin" ? "PORTAL ADMINISTRATOR" : role === "pembimbing" ? "PORTAL PEMBIMBING" : "ARSIP KEHADIRAN"}</p>
                            <h1>{role === "admin" ? "Kelola Data Absensi" : "Absensi Magang"}</h1>
                            <p className="subtitle">{role === "admin" ? "Kelola, pantau, dan verifikasi seluruh rekapan data absensi WFO & Daring (Zoom)." : role === "pembimbing" ? "Rekap kehadiran peserta magang (WFO & Daring Zoom)." : "Riwayat absensi ini hanya dapat dilihat oleh akun Anda."}</p>
                        </div>
                        <div className="live-clock">
                            <strong>{clock.toLocaleTimeString("id-ID")}</strong>
                            <span>{dateLabel}</span>
                        </div>
                    </div>

                    {/* Menu Navigasi Khusus Admin */}
                    {role === "admin" && (
                        <nav className="management-links attendance-management-links" aria-label="Menu admin">
                            <Link to="/periode" className="management-link">
                                <span className="management-icon">🗓️</span>
                                <span>
                                    <strong>Periode Magang</strong>
                                    <small>Kelola periode & peserta magang.</small>
                                </span>
                                <span className="management-arrow">→</span>
                            </Link>
                            <Link to="/riwayat" className="management-link" aria-current="page">
                                <span className="management-icon">📅</span>
                                <span>
                                    <strong>Kelola Absensi</strong>
                                    <small>Kelola data absensi seluruh peserta.</small>
                                </span>
                                <span className="management-arrow">→</span>
                            </Link>
                            <Link to="/admin/lokasi" className="management-link">
                                <span className="management-icon">📍</span>
                                <span>
                                    <strong>Lokasi & Kebijakan Daring</strong>
                                    <small>Atur radius kantor & izin absensi Zoom.</small>
                                </span>
                                <span className="management-arrow">→</span>
                            </Link>
                        </nav>
                    )}

                    {/* Menu Navigasi Khusus Pembimbing */}
                    {role === "pembimbing" && (
                        <nav className="management-links attendance-management-links" aria-label="Menu pembimbing">
                            <Link to="/riwayat" className="management-link" aria-current="page">
                                <span className="management-icon">📅</span>
                                <span>
                                    <strong>Absensi Magang</strong>
                                    <small>Lihat rekap kehadiran peserta.</small>
                                </span>
                                <span className="management-arrow">→</span>
                            </Link>
                            <Link to="/periode" className="management-link">
                                <span className="management-icon">🗓️</span>
                                <span>
                                    <strong>Tahun Periode</strong>
                                    <small>Lihat dan kelola tahun periode magang.</small>
                                </span>
                                <span className="management-arrow">→</span>
                            </Link>
                        </nav>
                    )}

                    {role !== "admin" && role !== "pembimbing" && (
                        <div className="attendance-card" style={{ marginBottom: "20px" }}>
                            <p className="eyebrow">RIWAYAT PRIBADI</p>
                            <strong>Total absen masuk: {data.filter((item) => item.jam_masuk).length} kali</strong>
                        </div>
                    )}

                    {reviewMessage && <div className="message" role="status" style={{ marginBottom: "16px" }}>{reviewMessage}</div>}
                    {error ? (
                        <div
                            className="message error"
                            role="alert"
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: "12px",
                                marginBottom: "16px",
                            }}
                        >
                            <span>{error}</span>
                            {error.toLowerCase().includes("surat balasan") && (
                                <button
                                    type="button"
                                    onClick={handleDownloadReplyLetter}
                                    disabled={downloadingLetter}
                                    style={{
                                        background: "#16a34a",
                                        color: "#ffffff",
                                        padding: "8px 16px",
                                        border: "none",
                                        borderRadius: "6px",
                                        fontWeight: "600",
                                        cursor: downloadingLetter ? "wait" : "pointer",
                                        fontSize: "13px",
                                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {downloadingLetter ? "Mengunduh..." : "📥 Unduh Surat Balasan Sekarang"}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="table-card">
                            <table>
                                <thead>
                                    <tr>
                                        <th>No</th>
                                        <th>Tanggal</th>
                                        <th>Nama</th>
                                        <th>Masuk</th>
                                        <th>Pulang</th>
                                        <th>Status Kehadiran</th>
                                        <th>Keterangan & Bukti</th>
                                        {role === "pembimbing" && <th>Aksi</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={role === "pembimbing" ? "8" : "7"} className="empty">Memuat data absensi...</td>
                                        </tr>
                                    ) : data.length ? (
                                        data.map((item, index) => {
                                            const isPendingLeave = item.approval_status === "pending";
                                            const isZoom = String(item.keterangan || "").includes("[ZOOM");
                                            const cleanKeterangan = String(item.keterangan || "")
                                                .replace("[ZOOM / DARING]", "")
                                                .replace("[ZOOM]", "")
                                                .trim();

                                            return (
                                                <tr key={item.id}>
                                                    <td>{index + 1}</td>
                                                    <td>{formatDate(item.tanggal)}</td>
                                                    <td>
                                                        <strong style={{ color: "#0f172a", display: "block" }}>{item.participant_name}</strong>
                                                        {item.institution && (
                                                            <small style={{ color: "#64748b" }}>{item.institution}</small>
                                                        )}
                                                    </td>
                                                    <td>{item.jam_masuk || "-"}</td>
                                                    <td>{item.jam_pulang || "-"}</td>
                                                    <td>
                                                        {isPendingLeave ? (
                                                            <span className="badge badge-belum-hadir">Menunggu izin</span>
                                                        ) : item.approval_status === "rejected" ? (
                                                            <span className="badge badge-alpa">Alpa</span>
                                                        ) : item.status === "Hadir" && isZoom ? (
                                                            <span
                                                                style={{
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    gap: "5px",
                                                                    background: "#e0e7ff",
                                                                    color: "#4338ca",
                                                                    border: "1px solid #c7d2fe",
                                                                    padding: "3px 8px",
                                                                    borderRadius: "12px",
                                                                    fontSize: "12px",
                                                                    fontWeight: "600",
                                                                }}
                                                            >
                                                                <span>📹</span>
                                                                <span>Daring (Zoom)</span>
                                                            </span>
                                                        ) : item.status === "Hadir" ? (
                                                            <span className="badge badge-hadir" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                                                <span>🏢</span>
                                                                <span>WFO (Kantor)</span>
                                                            </span>
                                                        ) : (
                                                            <span className={`badge badge-${String(item.status).toLowerCase().replace(" ", "-")}`}>
                                                                {item.status}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                            <small style={{ color: "#334155" }}>{cleanKeterangan || "-"}</small>
                                                            {item.foto_url && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPreviewImage({
                                                                        url: item.foto_url,
                                                                        name: item.participant_name,
                                                                        tanggal: item.tanggal,
                                                                        jam: item.jam_masuk,
                                                                        isZoom: isZoom,
                                                                    })}
                                                                    style={{
                                                                        display: "inline-flex",
                                                                        alignItems: "center",
                                                                        gap: "5px",
                                                                        background: isZoom ? "#eff6ff" : "#f8fafc",
                                                                        border: isZoom ? "1px solid #bfdbfe" : "1px solid #cbd5e1",
                                                                        borderRadius: "4px",
                                                                        padding: "3px 8px",
                                                                        fontSize: "11px",
                                                                        fontWeight: "600",
                                                                        color: isZoom ? "#1d4ed8" : "#334155",
                                                                        cursor: "pointer",
                                                                        width: "fit-content",
                                                                    }}
                                                                >
                                                                    <span>{isZoom ? "📹" : "📷"}</span>
                                                                    <span>{isZoom ? "Lihat Bukti Zoom" : "Lihat Foto Absen"}</span>
                                                                </button>
                                                            )}
                                                            {item.jarak_meter !== null && item.jarak_meter !== undefined && (
                                                                <small style={{ color: "#64748b", fontSize: "10.5px" }}>
                                                                    Jarak: ± {item.jarak_meter}m {isZoom ? "(Daring)" : ""}
                                                                </small>
                                                            )}
                                                        </div>
                                                    </td>
                                                    {role === "pembimbing" && (
                                                        <td>
                                                            {isPendingLeave ? (
                                                                <div style={{ display: "flex", gap: "6px" }}>
                                                                    <button type="button" onClick={() => handleReviewLeave(item.id, "approved")} disabled={reviewingId === item.id} style={{ border: "none", background: "#10b981", color: "#fff", padding: "5px 8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>Setujui</button>
                                                                    <button type="button" onClick={() => handleReviewLeave(item.id, "rejected")} disabled={reviewingId === item.id} style={{ border: "none", background: "#ef4444", color: "#fff", padding: "5px 8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>Tolak</button>
                                                                </div>
                                                            ) : "-"}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={role === "pembimbing" ? "8" : "7"} className="empty">Belum ada data absensi.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Modal Popup Bukti Foto / Screenshot Zoom */}
                    {previewImage && (
                        <div
                            role="dialog"
                            aria-modal="true"
                            onClick={() => setPreviewImage(null)}
                            style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: "rgba(15, 23, 42, 0.75)",
                                backdropFilter: "blur(2px)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 9999,
                                padding: "20px",
                            }}
                        >
                            <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    background: "#ffffff",
                                    borderRadius: "12px",
                                    maxWidth: "580px",
                                    width: "100%",
                                    overflow: "hidden",
                                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.25)",
                                    border: "1px solid #cbd5e1",
                                }}
                            >
                                <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                                            {previewImage.isZoom ? "📹 Bukti Tangkapan Layar Zoom Meeting" : "📷 Bukti Foto Kehadiran"}
                                        </h3>
                                        <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#64748b" }}>
                                            {previewImage.name} • {formatDate(previewImage.tanggal)} ({previewImage.jam || "-"})
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewImage(null)}
                                        style={{
                                            background: "#e2e8f0",
                                            border: "none",
                                            borderRadius: "6px",
                                            padding: "6px 10px",
                                            cursor: "pointer",
                                            fontSize: "13px",
                                            fontWeight: "700",
                                            color: "#334155",
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div style={{ padding: "18px", textAlign: "center", background: "#0f172a" }}>
                                    <img
                                        src={previewImage.url}
                                        alt="Bukti Absensi"
                                        style={{
                                            maxWidth: "100%",
                                            maxHeight: "440px",
                                            borderRadius: "6px",
                                            objectFit: "contain",
                                            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                                        }}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = "https://placehold.co/600x400?text=Gambar+Tidak+Ditemukan";
                                        }}
                                    />
                                </div>
                                <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                                        {previewImage.isZoom ? "Peserta memilih kehadiran daring / Zoom" : "Presensi luring di kantor"}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewImage(null)}
                                        style={{
                                            background: "#4f46e5",
                                            color: "#ffffff",
                                            border: "none",
                                            padding: "8px 18px",
                                            borderRadius: "6px",
                                            fontWeight: "600",
                                            fontSize: "13px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Tutup
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
}

export default Riwayat;
