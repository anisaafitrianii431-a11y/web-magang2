import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, Save } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";

export default function PengaturanAbsensi() {
    const [jamPulang, setJamPulang] = useState("17:00");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        api.get("/pembimbing/jadwal-absensi")
            .then((response) => {
                if (!cancelled) {
                    setJamPulang(response.data?.data?.jam_pulang || "17:00");
                }
            })
            .catch((requestError) => {
                if (!cancelled) setError(requestError.response?.data?.message || "Jadwal absensi gagal dimuat.");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const saveSchedule = async (event) => {
        event.preventDefault();
        setSaving(true);
        setMessage("");
        setError("");

        try {
            const response = await api.put("/pembimbing/jadwal-absensi", {
                jam_pulang: jamPulang,
            });
            const savedPulang = response.data?.data?.jam_pulang || jamPulang;
            setJamPulang(savedPulang);
            window.dispatchEvent(
                new CustomEvent("attendance-schedule-updated", {
                    detail: { jamPulang: savedPulang },
                })
            );
            setMessage(response.data?.message || "Jam pulang berhasil diperbarui.");
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Jam pulang gagal disimpan.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                <Navbar />
                <main className="main">
                    <section className="page-heading">
                        <div>
                            <p className="eyebrow">PENGATURAN PEMBIMBING</p>
                            <h1>Jadwal absensi</h1>
                            <p className="subtitle">Atur jam mulai absensi pulang bagi peserta bimbingan Anda.</p>
                        </div>
                    </section>

                    {/* Menu Navigasi Khusus Pembimbing */}
                    <nav className="management-links attendance-management-links" aria-label="Menu pembimbing" style={{ marginBottom: "20px" }}>
                        <Link to="/pembimbing/jadwal-absensi" className="management-link" aria-current="page">
                            <span className="management-icon">🕒</span>
                            <span>
                                <strong>Jadwal Absensi</strong>
                                <small>Atur jam pulang peserta bimbingan.</small>
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

                    <section className="attendance-card" style={{ maxWidth: "720px", padding: "28px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                            <span style={{ display: "grid", placeItems: "center", width: "44px", height: "44px", borderRadius: "12px", color: "#2563eb", background: "#eff6ff" }}>
                                <Clock size={22} />
                            </span>
                            <div>
                                <h2 style={{ margin: 0, fontSize: "18px" }}>Jam pulang magang</h2>
                                <p className="subtitle" style={{ margin: "4px 0 0" }}>Berlaku untuk seluruh peserta magang yang Anda bimbing.</p>
                            </div>
                        </div>

                        {loading ? (
                            <p className="message">Memuat jadwal absensi...</p>
                        ) : (
                            <form onSubmit={saveSchedule}>
                                <label className="attendance-status-select" htmlFor="checkout-time">
                                    Absensi pulang tersedia mulai
                                    <input
                                        id="checkout-time"
                                        type="time"
                                        value={jamPulang}
                                        onChange={(event) => setJamPulang(event.target.value)}
                                        required
                                        style={{ display: "block", width: "100%", marginTop: "8px", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "8px", font: "inherit" }}
                                    />
                                </label>

                                <p className="subtitle" style={{ margin: "10px 0 18px" }}>
                                    Peserta bimbingan Anda dapat mencatat jam pulang mulai pukul {jamPulang || "17:00"} WIB.
                                </p>

                                {error && <p className="message error" role="alert">{error}</p>}
                                {message && <p className="message" role="status"><CheckCircle2 size={16} style={{ verticalAlign: "middle", marginRight: "6px" }} />{message}</p>}

                                <button type="submit" disabled={saving || !jamPulang} className="btn-attendance-in" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "11px 16px" }}>
                                    <Save size={16} />
                                    {saving ? "Menyimpan..." : "Simpan jadwal"}
                                </button>
                            </form>
                        )}
                    </section>
                </main>
            </div>
        </div>
    );
}
