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

        const loadAttendance = async () => {
            try {
                const profileResponse = await api.get("/me");
                const profile = profileResponse.data?.data?.magang;

                if (cancelled) return;
                if (!profile) {
                    setError("Akun ini belum memiliki pendaftaran magang aktif.");
                    return;
                }

                setParticipant(profile);

                const attendanceResponse = await api.get("/absensi/hari-ini");
                if (cancelled) return;
                const attendance = attendanceResponse.data;
                if (attendance && Object.keys(attendance).length > 0) {
                    setData(attendance);
                    if (attendance.status) setAttendanceStatus(attendance.status);
                    if (attendance.keterangan) setKeterangan(attendance.keterangan);
                }
            } catch (requestError) {
                if (!cancelled) {
                    setError(requestError.response?.data?.message || "Profil atau data absensi belum dapat dimuat.");
                }
            } finally {
                if (!cancelled) setProfileLoading(false);
            }
        };

        void loadAttendance();
        const timer = setInterval(() => setClock(new Date()), 1000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, []);

    const submitAttendance = async (type) => {
        if (!participant) {
            setError("Akun peserta belum terhubung ke pendaftaran aktif.");
            return;
        }
        if (type === "in" && attendanceStatus !== "Hadir" && !keterangan.trim()) {
            setError(`Mohon isi keterangan atau alasan untuk status ${attendanceStatus}.`);
            return;
        }

        setLoading(true);
        setMessage("");
        setError("");
        try {
            const endpoint = type === "in" ? "/absensi/masuk" : "/absensi/pulang";
            const payload = type === "in" ? { status: attendanceStatus, keterangan } : {};
            const response = await api.post(endpoint, payload);
            setMessage(response.data.message || "Absensi berhasil dicatat.");
            setData(response.data.data || null);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Absensi gagal dicatat.");
            if (requestError.response?.data?.data) setData(requestError.response.data.data);
        } finally {
            setLoading(false);
        }
    };

    const dateLabel = clock.toLocaleDateString("id-ID", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const isPresent = data?.status === "Hadir";

    const logoutToLogin = async () => {
        try { await api.post("/logout"); } catch { /* Hapus sesi lokal jika server tidak tersedia. */ }
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("participant");
        navigate("/login", { replace: true });
    };

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                <Navbar />
                <main className="main attendance-page">
                    <section className="page-heading attendance-page-heading">
                        <div>
                            <p className="eyebrow">PORTAL KEHADIRAN</p>
                            <h1>Absensi magang</h1>
                            <p className="subtitle">Catat kehadiran harianmu tanpa antre.</p>
                        </div>
                        <div className="live-clock"><strong>{clock.toLocaleTimeString("id-ID")}</strong><span>{dateLabel}</span></div>
                    </section>

                    <section className="attendance-card attendance-page-card">
                        <div className="attendance-header">
                            <div>
                                <p className="eyebrow">AKUN PESERTA</p>
                                <h2>{profileLoading ? "Memuat profil…" : participant?.participant_name || "Akun belum terhubung"}</h2>
                                {participant && <p className="subtitle">{participant.institution || "Instansi belum diisi"}</p>}
                            </div>
                        </div>

                        {profileLoading && <p className="message">Memuat profil peserta…</p>}
                        {participant && (
                            <>
                                <hr className="attendance-divider" />
                                <div className="attendance-header attendance-current-status">
                                    <div>
                                        <p className="eyebrow">STATUS HARI INI</p>
                                        <h2 className={isPresent ? "hadir" : "muted-status"}>{data?.status || "Belum hadir"}</h2>
                                        {data?.keterangan && <p className="attendance-note">Keterangan: {data.keterangan}</p>}
                                    </div>
                                </div>

                                <label className="attendance-status-select">
                                    Status kehadiran
                                    <select value={attendanceStatus} onChange={(event) => setAttendanceStatus(event.target.value)} disabled={loading || !!data}>
                                        <option value="Hadir">Hadir</option>
                                        <option value="Izin">Izin</option>
                                        <option value="Sakit">Sakit</option>
                                        <option value="Alpa">Alpa</option>
                                    </select>
                                    {attendanceStatus !== "Hadir" && !data && <small className="attendance-hint">Isi alasan agar status ini tercatat bersama absensi hari ini.</small>}
                                </label>

                                {attendanceStatus !== "Hadir" && (
                                    <label className="attendance-status-select">
                                        Keterangan / Alasan
                                        <textarea
                                            value={keterangan}
                                            onChange={(event) => setKeterangan(event.target.value)}
                                            placeholder={`Masukkan alasan ${attendanceStatus.toLowerCase()}…`}
                                            disabled={loading || !!data}
                                            className="attendance-reason"
                                            required
                                        />
                                    </label>
                                )}

                                <div className="time-container attendance-time-container">
                                    <div className="time-box">
                                        <span>JAM MASUK</span>
                                        <strong>{data?.jam_masuk || "--:--"}</strong>
                                        <small className="time-note">{data?.jam_masuk ? "Waktu masuk tercatat" : attendanceStatus === "Hadir" ? "Belum melakukan absen masuk" : `Status ${attendanceStatus.toLowerCase()} dicatat dengan alasan`}</small>
                                        <button type="button" onClick={() => submitAttendance("in")} disabled={loading || !!data} className="btn-attendance-in">
                                            {loading ? "Menyimpan…" : data ? "Sudah tercatat" : attendanceStatus === "Hadir" ? "Absen masuk" : `Catat ${attendanceStatus}`}
                                        </button>
                                    </div>
                                    <div className="time-box checkout">
                                        <span>JAM PULANG</span>
                                        <strong>{data?.jam_pulang || "--:--"}</strong>
                                        <small className="time-note">{data?.jam_pulang ? "Waktu pulang tercatat" : clock.getHours() < 17 ? "Tombol aktif setelah jam 17:00" : "Aktif setelah absen masuk"}</small>
                                        <button
                                            type="button"
                                            onClick={() => submitAttendance("out")}
                                            disabled={loading || !isPresent || !data?.jam_masuk || !!data?.jam_pulang || clock.getHours() < 17}
                                            className={!isPresent || data?.jam_pulang || clock.getHours() < 17 ? "btn-secondary" : "btn-success"}
                                        >
                                            {data?.jam_pulang ? "Sudah tercatat" : "Absen pulang"}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {error && <div className="message error" role="alert">{error}</div>}
                        {message && !error && <div className="message" role="status">{message}</div>}
                        {!profileLoading && !participant && (
                            <button type="button" onClick={logoutToLogin} className="attendance-login-button">
                                Keluar dan masuk dengan akun peserta aktif
                            </button>
                        )}
                    </section>

                    {participant && <div className="history-link"><span>Perlu melihat kehadiran sebelumnya?</span><Link to="/riwayat">Buka riwayat absensi →</Link></div>}
                </main>
            </div>
        </div>
    );
}

export default Absensi;
