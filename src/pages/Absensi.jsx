import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";

function Absensi() {
    const navigate = useNavigate();
    const [participant, setParticipant] = useState(null);
    const [data, setData] = useState(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);
    const [clock, setClock] = useState(new Date());
    const [attendanceStatus, setAttendanceStatus] = useState("Hadir");
    const [keterangan, setKeterangan] = useState("");

    useEffect(() => {
        let cancelled = false;

        const loadProfile = async () => {
            try {
                const response = await api.get("/me");
                const profile = response.data?.data?.magang || null;
                if (cancelled) return;
                setParticipant(profile);

                if (!profile) {
                    setError("Akun peserta bersama tidak dapat dipakai untuk absensi pribadi. Keluar dan masuk dengan NPM serta password akun pribadi Anda.");
                    return;
                }

                const attendanceResponse = await api.get("/absensi/hari-ini");
                if (cancelled) return;
                const attendance = attendanceResponse.data;
                if (attendance && Object.keys(attendance).length > 0) {
                    setData(attendance);
                    if (attendance.approval_status) {
                        setAttendanceStatus("Izin");
                        setMessage(
                            attendance.approval_status === "pending"
                                ? "Permohonan izin sedang menunggu persetujuan pembimbing."
                                : attendance.approval_status === "approved"
                                    ? "Permohonan izin sudah disetujui pembimbing."
                                    : "Permohonan izin ditolak pembimbing."
                        );
                    } else if (attendance.status) {
                        setAttendanceStatus(attendance.status);
                    }
                    if (attendance.keterangan) setKeterangan(attendance.keterangan);
                } else {
                    setData(null);
                    setMessage("");
                }
            } catch (requestError) {
                if (!cancelled) {
                    setError(requestError.response?.data?.message || "Profil atau data absensi belum dapat dimuat.");
                    setData(null);
                }
            } finally {
                if (!cancelled) setProfileLoading(false);
            }
        };

        void loadProfile();
        const timer = setInterval(() => setClock(new Date()), 1000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, []);

    const submitAttendance = async (type) => {
        if (!participant) {
            setError("Akun peserta belum terhubung ke NPM.");
            return;
        }
        
        if (type === "in" && attendanceStatus !== "Hadir" && !keterangan.trim()) {
            setError(`Mohon isi keterangan/alasan untuk status ${attendanceStatus}.`);
            return;
        }
        
        setLoading(true);
        setMessage("");
        setError("");
        try {
            const endpoint = type === "in" ? "/absensi/masuk" : "/absensi/pulang";
            const payload = type === "in" ? { status: attendanceStatus, keterangan } : {};
            const response = await api.post(endpoint, payload);
            setMessage(response.data.message);
            setData(response.data.data);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Absensi gagal dicatat.");
            if (requestError.response?.data?.data) setData(requestError.response.data.data);
        } finally {
            setLoading(false);
        }
    };

    const dateLabel = clock.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const displayedStatus = data?.approval_status === "pending"
        ? "Menunggu persetujuan"
        : data?.approval_status === "approved"
            ? "Izin disetujui"
            : data?.approval_status === "rejected"
                ? "Alpa"
                : data?.status || "Belum hadir";

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                <Navbar />
                <main className="main attendance-page">
                    <section className="page-heading attendance-page-heading">
                        <div><p className="eyebrow">PORTAL KEHADIRAN</p><h1>Absensi magang</h1><p className="subtitle">Catat kehadiran harianmu tanpa antre.</p></div>
                        <div className="live-clock"><strong>{clock.toLocaleTimeString("id-ID")}</strong><span>{dateLabel}</span></div>
                    </section>
                    
                    <section className="attendance-card attendance-page-card">
                        <div className="attendance-header">
                            <div>
                                <p className="eyebrow">AKUN PESERTA</p>
                                <h2>{profileLoading ? "Memuat profil..." : participant?.participant_name || "Akun belum terhubung"}</h2>
                                {participant && <p className="subtitle">NPM: {participant.participant_code}</p>}
                            </div>
                        </div>

                        {profileLoading && <p className="message">Memuat profil peserta...</p>}
                        {participant && (
                            <>
                                <hr className="attendance-divider" />
                                <div className="attendance-header attendance-current-status">
                                    <div>
                                        <p className="eyebrow">STATUS HARI INI</p>
                                        <h2 className={data?.status === "Hadir" || data?.approval_status === "approved" ? "hadir" : "muted-status"}>{displayedStatus}</h2>
                                        {data?.keterangan && <p style={{ marginTop: "5px", fontSize: "14px", color: "#666" }}>Catatan: {data.keterangan}</p>}
                                    </div>
                                </div>
                                <label className="attendance-status-select">
                                    Status kehadiran
                                    <select 
                                        value={attendanceStatus} 
                                        onChange={(event) => setAttendanceStatus(event.target.value)} 
                                        disabled={loading || !!data}
                                    >
                                        <option value="Hadir">Hadir</option>
                                        <option value="Izin">Izin (perlu persetujuan pembimbing)</option>
                                        <option value="Sakit">Sakit</option>
                                        <option value="Alpa">Alpa</option>
                                    </select>
                                    {attendanceStatus === "Izin" && !data && (
                                        <small className="attendance-hint">
                                            Status izin baru tercatat setelah disetujui pembimbing.
                                        </small>
                                    )}
                                </label>
                                
                                {attendanceStatus !== "Hadir" && (
                                    <label className="attendance-status-select">
                                        Keterangan / Alasan
                                        <textarea 
                                            value={keterangan} 
                                            onChange={(e) => setKeterangan(e.target.value)}
                                            placeholder={`Masukkan alasan kenapa Anda ${attendanceStatus.toLowerCase()}...`}
                                            disabled={loading || !!data}
                                            className="attendance-reason"
                                            required
                                        ></textarea>
                                    </label>
                                )}
                                
                                <div className="time-container attendance-time-container">
                                    <div className="time-box">
                                        <span>JAM MASUK</span>
                                        <strong>{data?.jam_masuk || "--:--"}</strong>
                                        <small className="time-note">{data?.approval_status === "pending" ? "Menunggu keputusan pembimbing" : data?.jam_masuk ? "Waktu masuk tercatat" : attendanceStatus === "Hadir" ? "Belum melakukan absen masuk" : `Status ${attendanceStatus.toLowerCase()} tidak memakai jam masuk`}</small>
                                        <button type="button" onClick={() => submitAttendance("in")} disabled={loading || !!data} className="btn-attendance-in">
                                            {data?.approval_status === "pending" ? "Menunggu persetujuan" : data?.approval_status === "approved" ? "Izin disetujui" : data?.approval_status === "rejected" ? "Izin ditolak" : data ? "Sudah tercatat" : attendanceStatus === "Hadir" ? "Absen masuk" : `Kirim Status ${attendanceStatus}`}
                                        </button>
                                    </div>
                                    <div className="time-box checkout">
                                        <span>JAM PULANG</span>
                                        <strong>{data?.jam_pulang || "--:--"}</strong>
                                        <small className="time-note">
                                            {data?.jam_pulang ? "Waktu pulang tercatat" : (clock.getHours() < 17 ? "Tombol aktif setelah jam 17:00" : "Aktif setelah absen masuk")}
                                        </small>
                                        <button 
                                            onClick={() => submitAttendance("out")} 
                                            disabled={loading || !data?.jam_masuk || !!data?.jam_pulang || clock.getHours() < 17} 
                                            className={data?.jam_pulang || clock.getHours() < 17 ? "btn-secondary" : "btn-success"}
                                            style={clock.getHours() < 17 && !data?.jam_pulang ? { opacity: 0.6, cursor: 'not-allowed', background: '#e2e8f0', color: '#64748b' } : {}}
                                        >
                                            {data?.jam_pulang ? "Sudah tercatat" : "Absen pulang"}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                        {error && <div className="message error" role="alert" style={{ marginTop: "20px" }}>{error}</div>}
                        {!profileLoading && !participant && (
                            <button
                                type="button"
                                onClick={() => {
                                    localStorage.removeItem("token");
                                    localStorage.removeItem("user");
                                    navigate("/login");
                                }}
                                style={{ marginTop: "12px", border: "none", background: "#4f46e5", color: "#fff", padding: "10px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
                            >
                                Keluar dan masuk memakai NPM pribadi
                            </button>
                        )}
                        {message && !error && <div className="message" role="status" style={{ marginTop: "20px" }}>{message}</div>}
                    </section>
                    
                    {participant && <div className="history-link"><span>Perlu melihat kehadiran sebelumnya?</span><Link to="/riwayat">Buka riwayat absensi →</Link></div>}
                </main>
            </div>
        </div>
    );
}

export default Absensi;
