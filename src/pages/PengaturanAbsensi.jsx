import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock3, Save, Sunrise, Sunset } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";

export default function PengaturanAbsensi() {
    const [jamMasuk, setJamMasuk] = useState("08:00");
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
                    setJamMasuk(response.data?.data?.jam_masuk || "08:00");
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
                jam_masuk: jamMasuk,
                jam_pulang: jamPulang,
            });
            const savedMasuk = response.data?.data?.jam_masuk || jamMasuk;
            const savedPulang = response.data?.data?.jam_pulang || jamPulang;
            setJamMasuk(savedMasuk);
            setJamPulang(savedPulang);
            window.dispatchEvent(
                new CustomEvent("attendance-schedule-updated", {
                    detail: { jamMasuk: savedMasuk, jamPulang: savedPulang },
                })
            );
            setMessage(response.data?.message || "Jadwal absensi berhasil diperbarui.");
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Jadwal absensi gagal disimpan.");
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
                            <p className="subtitle">Atur jam mulai absensi masuk dan pulang bagi peserta bimbingan Anda.</p>
                        </div>
                    </section>

                    {/* Menu Navigasi Khusus Pembimbing */}
                    <nav className="management-links attendance-management-links" aria-label="Menu pembimbing" style={{ marginBottom: "20px" }}>
                        <Link to="/pembimbing/jadwal-absensi" className="management-link" aria-current="page">
                            <span className="management-icon">🕒</span>
                            <span>
                                <strong>Jadwal Absensi</strong>
                                <small>Atur jam masuk dan pulang peserta bimbingan.</small>
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

                    <section className="attendance-card attendance-schedule-card">
                        <div className="attendance-schedule-heading">
                            <span className="attendance-schedule-clock"><Clock3 size={20} /></span>
                            <div>
                                <h2>Jam kerja magang</h2>
                                <p>Berlaku untuk peserta bimbingan Anda</p>
                            </div>
                        </div>
                        {loading ? (
                            <p className="message">Memuat jadwal absensi...</p>
                        ) : (
                            <form onSubmit={saveSchedule}>
                                <div className="attendance-schedule-fields">
                                    <label className="attendance-schedule-field checkin" htmlFor="checkin-time">
                                        <span className="attendance-schedule-label"><Sunrise size={16} /> Jam masuk</span>
                                        <input
                                            id="checkin-time"
                                            type="time"
                                            value={jamMasuk}
                                            onChange={(event) => setJamMasuk(event.target.value)}
                                            required
                                        />
                                    </label>

                                    <label className="attendance-schedule-field checkout" htmlFor="checkout-time">
                                        <span className="attendance-schedule-label"><Sunset size={16} /> Jam pulang</span>
                                        <input
                                            id="checkout-time"
                                            type="time"
                                            value={jamPulang}
                                            onChange={(event) => setJamPulang(event.target.value)}
                                            required
                                        />
                                    </label>
                                </div>
                                <p className="attendance-schedule-hint">Absensi masuk tersedia selama 15 menit setelah jam masuk.</p>

                                {error && <p className="message error" role="alert">{error}</p>}
                                {message && <p className="message" role="status"><CheckCircle2 size={16} style={{ verticalAlign: "middle", marginRight: "6px" }} />{message}</p>}

                                <div className="attendance-schedule-actions">
                                    <button type="submit" disabled={saving || !jamMasuk || !jamPulang} className="btn-attendance-in attendance-schedule-submit">
                                        <Save size={16} />
                                        {saving ? "Menyimpan..." : "Simpan jadwal"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </section>
                </main>
            </div>
        </div>
    );
}
