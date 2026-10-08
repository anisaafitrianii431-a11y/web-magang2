import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";

function Absensi() {
    const savedParticipant = JSON.parse(localStorage.getItem("participant") || "null");
    const [participant, setParticipant] = useState(savedParticipant);
    const [magangs, setMagangs] = useState([]);
    const [data, setData] = useState(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [clock, setClock] = useState(new Date());
    const [attendanceStatus, setAttendanceStatus] = useState("Hadir");
    const [keterangan, setKeterangan] = useState("");

    const loadMagang = async () => {
        try {
            const response = await api.get("/magang");
            const responseData = response.data?.data || response.data || [];
            const dataArray = Array.isArray(responseData) ? responseData : [];
            const filteredMagangs = dataArray.filter(item => {
                const name = item.participant_name.toLowerCase();
                return !name.includes('ayu') && !name.includes('rizky');
            });
            setMagangs(filteredMagangs);
        } catch (requestError) {
            console.error(requestError);
        }
    };

    const loadData = async (code = participant?.participant_code) => {
        if (!code) {
            setData(null);
            return;
        }
        try {
            const response = await api.get("/absensi/hari-ini", { params: { participant_code: code } });
            const responseData = response.data;
            // If backend returns {} instead of null, treat it as null
            if (responseData && Object.keys(responseData).length > 0) {
                setData(responseData);
                if (responseData.status) setAttendanceStatus(responseData.status);
                if (responseData.keterangan) setKeterangan(responseData.keterangan);
            } else {
                setData(null);
            }
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Data absensi belum dapat dimuat.");
            setData(null);
        }
    };

    useEffect(() => {
        loadMagang();
        const timer = setInterval(() => setClock(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (participant?.participant_code) {
            loadData(participant.participant_code);
        } else {
            setData(null);
        }
    }, [participant?.participant_code]);

    const handleCodeSelect = (event) => {
        const selectedCode = event.target.value;
        const selected = magangs.find((item) => item.participant_code === selectedCode);

        if (!selected) {
            setParticipant(null);
            localStorage.removeItem("participant");
            setData(null);
            setKeterangan("");
            return;
        }

        const profile = {
            participant_code: selected.participant_code,
            participant_name: selected.participant_name,
            institution: selected.institution || "",
        };
        
        localStorage.setItem("participant", JSON.stringify(profile));
        setParticipant(profile);
        setError("");
        setMessage("");
        setKeterangan("");
    };

    const submitAttendance = async (type) => {
        if (!participant) {
            setError("Silakan pilih nama terlebih dahulu.");
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
            const payload = type === "in" ? { ...participant, status: attendanceStatus, keterangan: keterangan } : { participant_code: participant.participant_code };
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

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                <Navbar />
                <main className="main">
                    <section className="page-heading">
                        <div><p className="eyebrow">PORTAL KEHADIRAN</p><h1>Absensi magang</h1><p className="subtitle">Catat kehadiran harianmu tanpa antre.</p></div>
                        <div className="live-clock"><strong>{clock.toLocaleTimeString("id-ID")}</strong><span>{dateLabel}</span></div>
                    </section>
                    
                    <section className="attendance-card">
                        <div className="attendance-header">
                            <div>
                                <p className="eyebrow">PILIH NAMA PESERTA</p>
                                <select 
                                    className="name-select" 
                                    value={participant?.participant_code || ""} 
                                    onChange={handleCodeSelect}
                                    style={{ width: "100%", padding: "10px", marginTop: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "16px" }}
                                >
                                    <option value="">-- Pilih nama kamu --</option>
                                    {magangs.map((item) => {
                                        // Coba ambil NPM dari localStorage berdasarkan nama
                                        let npmDigits = "";
                                        try {
                                            const periodes = JSON.parse(localStorage.getItem("periodesDataV2") || "[]");
                                            for (const p of periodes) {
                                                if (!p.peserta) continue;
                                                const found = p.peserta.find(peserta => peserta.nama.toLowerCase() === item.participant_name.toLowerCase());
                                                if (found && found.npm) {
                                                    npmDigits = found.npm.slice(-2);
                                                    break;
                                                }
                                            }
                                        } catch (e) {}

                                        // Fallback jika tidak ketemu di localStorage (ambil 2 angka dari participant_code)
                                        if (!npmDigits) {
                                            const nums = item.participant_code.replace(/\D/g, '');
                                            npmDigits = nums.slice(-2) || item.participant_code;
                                        }

                                        return (
                                            <option key={item.id} value={item.participant_code}>
                                                {item.participant_name} ({npmDigits})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>

                        {participant && (
                            <>
                                <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #eee" }} />
                                <div className="attendance-header">
                                    <div>
                                        <p className="eyebrow">STATUS HARI INI</p>
                                        <h2 className={data?.status === "Hadir" ? "hadir" : "muted-status"}>{data?.status || "Belum hadir"}</h2>
                                        {data?.keterangan && <p style={{ marginTop: "5px", fontSize: "14px", color: "#666" }}>Catatan: {data.keterangan}</p>}
                                    </div>
                                </div>
                                <label className="attendance-status-select" style={{ display: "block", marginTop: "15px" }}>
                                    Status kehadiran
                                    <select 
                                        value={attendanceStatus} 
                                        onChange={(event) => setAttendanceStatus(event.target.value)} 
                                        disabled={loading || !!data}
                                        style={{ width: "200px", padding: "10px", marginTop: "8px", fontSize: "14px" }}
                                    >
                                        <option value="Hadir">Hadir</option>
                                        <option value="Izin">Izin</option>
                                        <option value="Sakit">Sakit</option>
                                        <option value="Alpa">Alpa</option>
                                    </select>
                                </label>
                                
                                {attendanceStatus !== "Hadir" && (
                                    <label className="attendance-status-select" style={{ marginTop: "15px" }}>
                                        Keterangan / Alasan
                                        <textarea 
                                            value={keterangan} 
                                            onChange={(e) => setKeterangan(e.target.value)}
                                            placeholder={`Masukkan alasan kenapa Anda ${attendanceStatus.toLowerCase()}...`}
                                            disabled={loading || !!data}
                                            style={{ width: "100%", padding: "10px", marginTop: "8px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px", minHeight: "80px", fontFamily: "inherit" }}
                                            required
                                        ></textarea>
                                    </label>
                                )}
                                
                                <div className="time-container" style={{ marginTop: "20px" }}>
                                    <div className="time-box">
                                        <span>JAM MASUK</span>
                                        <strong>{data?.jam_masuk || "--:--"}</strong>
                                        <small className="time-note">{data?.jam_masuk ? "Waktu masuk tercatat" : attendanceStatus === "Hadir" ? "Belum melakukan absen masuk" : `Status ${attendanceStatus.toLowerCase()} tidak memakai jam masuk`}</small>
                                        <button onClick={() => submitAttendance("in")} disabled={loading || !!data} className="btn-primary">
                                            {data ? "Sudah tercatat" : attendanceStatus === "Hadir" ? "Absen masuk" : `Ajukan ${attendanceStatus}`}
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
                        {(message || error) && <div className={error ? "message error" : "message"} style={{ marginTop: "20px" }}>{error || message}</div>}
                    </section>
                    
                    <div className="history-link"><span>Perlu melihat kehadiran sebelumnya?</span><Link to="/riwayat">Buka riwayat absensi →</Link></div>
                </main>
            </div>
        </div>
    );
}

export default Absensi;
