import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";

function formatDate(value) {
    if (!value) return "-";
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric",
    });
}

function formatTime(value) {
    return value ? String(value).slice(0, 8) : "-";
}

function Pembimbing() {
    const [records, setRecords] = useState([]);
    const [clock, setClock] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        const loadAttendance = async () => {
            setLoading(true);
            setError("");
            try {
                // Backend membatasi daftar ini ke peserta aktif yang ditugaskan ke pembimbing login.
                const response = await api.get("/absensi");
                const payload = response.data?.data || response.data || [];
                if (!cancelled) setRecords(Array.isArray(payload) ? payload : []);
            } catch (requestError) {
                if (!cancelled) {
                    setError(requestError.response?.data?.message || "Data absensi belum dapat dimuat.");
                    setRecords([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void loadAttendance();
        const timer = window.setInterval(() => setClock(new Date()), 1000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, []);

    const dateLabel = clock.toLocaleDateString("id-ID", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                <Navbar />
                <main className="main mentor-attendance-page">
                    <div className="page-heading mentor-attendance-heading">
                        <div>
                            <p className="eyebrow">PORTAL PEMBIMBING</p>
                            <h1>Absensi Magang</h1>
                            <p className="subtitle">Rekap kehadiran peserta magang.</p>
                        </div>
                        <div className="live-clock">
                            <strong>{clock.toLocaleTimeString("id-ID")}</strong>
                            <span>{dateLabel}</span>
                        </div>
                    </div>

                    <nav className="mentor-attendance-shortcuts" aria-label="Menu pembimbing">
                        <Link to="/riwayat" className="mentor-attendance-shortcut is-current" aria-current="page">
                            <span className="mentor-shortcut-icon" aria-hidden="true">📅</span>
                            <span><strong>Absensi Magang</strong><small>Lihat rekap kehadiran peserta.</small></span>
                            <span className="mentor-shortcut-arrow" aria-hidden="true">→</span>
                        </Link>
                        <Link to="/periode" className="mentor-attendance-shortcut">
                            <span className="mentor-shortcut-icon" aria-hidden="true">🗓️</span>
                            <span><strong>Tahun Periode</strong><small>Lihat periode magang.</small></span>
                            <span className="mentor-shortcut-arrow" aria-hidden="true">→</span>
                        </Link>
                    </nav>

                    <section className="table-card mentor-attendance-table-card" aria-label="Rekap absensi peserta">
                        <div className="table-responsive">
                            <table className="mentor-attendance-table">
                                <thead>
                                    <tr>
                                        <th>No</th>
                                        <th>Tanggal</th>
                                        <th>Nama</th>
                                        <th>Masuk</th>
                                        <th>Pulang</th>
                                        <th>Status</th>
                                        <th>Keterangan</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="8" className="empty">Memuat riwayat absensi...</td></tr>
                                    ) : error ? (
                                        <tr><td colSpan="8" className="empty">{error}</td></tr>
                                    ) : records.length === 0 ? (
                                        <tr><td colSpan="8" className="empty">Belum ada catatan absensi peserta bimbingan.</td></tr>
                                    ) : records.map((record, index) => {
                                        const normalizedStatus = String(record.status || "").toLowerCase();
                                        const statusClass = normalizedStatus === "hadir" ? "is-present" : normalizedStatus === "izin" ? "is-permission" : normalizedStatus === "sakit" ? "is-sick" : "is-absent";
                                        return (
                                            <tr key={record.id}>
                                                <td>{index + 1}</td>
                                                <td>{formatDate(record.tanggal)}</td>
                                                <td className="mentor-attendance-name">{record.participant_name || record.user?.name || "Nama tidak tersedia"}</td>
                                                <td>{formatTime(record.jam_masuk)}</td>
                                                <td>{formatTime(record.jam_pulang)}</td>
                                                <td><span className={`mentor-attendance-status ${statusClass}`}>{record.status || "Belum hadir"}</span></td>
                                                <td>{record.keterangan || "-"}</td>
                                                <td>-</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}

export default Pembimbing;
