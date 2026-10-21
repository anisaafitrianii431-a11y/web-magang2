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
                            <p className="subtitle">{role === "admin" ? "Kelola, ubah, dan pantau seluruh rekapan data absensi peserta magang." : role === "pembimbing" ? "Rekap kehadiran peserta magang." : "Riwayat absensi ini hanya dapat dilihat oleh akun Anda."}</p>
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
                                        <th>Status</th>
                                        <th>Keterangan</th>
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
                                            const displayStatus = isPendingLeave
                                                ? "Menunggu izin"
                                                : item.approval_status === "rejected"
                                                    ? "Alpa"
                                                    : item.status;
                                            return (
                                                <tr key={item.id}>
                                                    <td>{index + 1}</td>
                                                    <td>{formatDate(item.tanggal)}</td>
                                                    <td>{item.participant_name}</td>
                                                    <td>{item.jam_masuk || "-"}</td>
                                                    <td>{item.jam_pulang || "-"}</td>
                                                    <td>
                                                        <span className={`badge ${isPendingLeave ? "badge-belum-hadir" : "badge-" + String(item.status).toLowerCase().replace(" ", "-")}`}>
                                                            {displayStatus}
                                                        </span>
                                                    </td>
                                                    <td><small>{item.keterangan || "-"}</small></td>
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

                </main>
            </div>
        </div>
    );
}

export default Riwayat;
