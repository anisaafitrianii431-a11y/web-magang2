import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";

function Dashboard() {
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    });
    
    const [participant] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("participant") || "null");
        } catch {
            return null;
        }
    });

    const [absensi, setAbsensi] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const storedUser = localStorage.getItem("user");

                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                } else if (localStorage.getItem("token")) {
                    const response = await api.get("/me");
                    localStorage.setItem("user", JSON.stringify(response.data));
                    setUser(response.data);
                }
            } catch (error) {
                console.error(error);
            }
        };

        loadUser();
        
        // Also listen to participant changes if we want it to be dynamic, 
        // but normally it's set in Absensi page.
    }, []);

    const role = (user?.role || "peserta").toLowerCase();
    const displayName = user?.name || participant?.participant_name || "Pengguna";

    useEffect(() => {
        const loadData = async () => {
            if (role !== "peserta") {
                setAbsensi(null);
                setLoading(false);
                return;
            }

            try {
                // If it's a real logged-in user with token
                if (localStorage.getItem("token")) {
                    const response = await api.get("/absensi-saya");
                    const today = new Date().toISOString().split("T")[0];
                    const data = response.data.find((item) => item.tanggal === today);
                    setAbsensi(data);
                } 
                // Or if it's a kiosk participant
                else if (participant?.participant_code) {
                    const response = await api.get("/absensi/hari-ini", { 
                        params: { participant_code: participant.participant_code } 
                    });
                    setAbsensi(response.data);
                }
            } catch (error) {
                console.log(error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [role, participant]);

    const roleLabel = {
        pembimbing: "Pembimbing",
        peserta: "Peserta",
    };

    const descriptionMap = {
        pembimbing: "Pantau kehadiran peserta magang dan validasi status harian.",
        peserta: "Silakan lakukan absensi sesuai kegiatan magang yang sedang berjalan.",
    };

    return (
        <div className="layout">
            <Sidebar />

            <div className="content">
                <Navbar />

                <main className="main">
                    {role === "pembimbing" ? (
                        <>
                            <h1>Dashboard Pembimbing</h1>
                            <p className="subtitle">Pilih pengelolaan yang ingin dibuka.</p>
                            <div className="welcome-card">
                                <div>
                                    <h2>Halo, {displayName} 👋</h2>
                                    <p>{descriptionMap.pembimbing}</p>
                                </div>
                            </div>
                            <div className="management-links">
                                <Link to="/riwayat" className="management-link">
                                    <span className="management-icon">📅</span>
                                    <span>
                                        <strong>Absensi Magang</strong>
                                        <small>Lihat rekapitulasi data kehadiran peserta.</small>
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
                                <Link to="/tugas" className="management-link">
                                    <span className="management-icon">📋</span>
                                    <span>
                                        <strong>Tugas Magang</strong>
                                        <small>Kelola tugas, periksa, dan beri nilai submisi.</small>
                                    </span>
                                    <span className="management-arrow">→</span>
                                </Link>
                            </div>
                        </>
                    ) : role === "admin" ? (
                        <>
                            <h1>Dashboard Administrator</h1>
                            <p className="subtitle">Portal utama pengelolaan sistem informasi magang.</p>
                            <div className="welcome-card">
                                <div>
                                    <h2>Halo, {displayName} 👋</h2>
                                    <p>Kelola periode, tugas, dan seluruh data absensi peserta magang.</p>
                                </div>
                            </div>
                            <div className="management-links">
                                <Link to="/periode" className="management-link">
                                    <span className="management-icon">🗓️</span>
                                    <span>
                                        <strong>Periode Magang</strong>
                                        <small>Kelola periode, waktu, dan peserta magang.</small>
                                    </span>
                                    <span className="management-arrow">→</span>
                                </Link>
                                <Link to="/tugas" className="management-link">
                                    <span className="management-icon">📋</span>
                                    <span>
                                        <strong>Tugas Magang</strong>
                                        <small>Kelola bank tugas dan evaluasi submisi.</small>
                                    </span>
                                    <span className="management-arrow">→</span>
                                </Link>
                                <Link to="/riwayat" className="management-link">
                                    <span className="management-icon">📅</span>
                                    <span>
                                        <strong>Kelola Data Absensi</strong>
                                        <small>Edit, hapus, dan pantau rekapan absensi.</small>
                                    </span>
                                    <span className="management-arrow">→</span>
                                </Link>
                            </div>
                        </>
                    ) : (
                        <>
                            <h1>Dashboard</h1>
                            <p className="subtitle">Ringkasan {roleLabel[role] || "Pengguna"}</p>

                            <div className="welcome-card">
                                <div>
                                    <h2>Halo, {displayName} 👋</h2>
                                    <p>{descriptionMap[role] || descriptionMap.peserta}</p>
                                </div>

                                <div className="status-box">
                                    <span>Status Hari Ini</span>
                                    <strong className={absensi?.status === "Hadir" ? "hadir" : "tidak-hadir"}>
                                        {absensi?.status || "Tidak Hadir"}
                                    </strong>
                                </div>
                            </div>

                            {loading ? (
                                <div className="stats">
                                    <div className="stat-card">
                                        <span>⏳</span>
                                        <div>
                                            <small>Loading</small>
                                            <h2>Memuat data...</h2>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="stats">
                                    <div className="stat-card">
                                        <span>📥</span>
                                        <div>
                                            <small>Jam Masuk</small>
                                            <h2>{absensi?.jam_masuk || "08.00"}</h2>
                                        </div>
                                    </div>

                                    <div className="stat-card">
                                        <span>📤</span>
                                        <div>
                                            <small>Jam Pulang</small>
                                            <h2>{absensi?.jam_pulang || "17.00"}</h2>
                                        </div>
                                    </div>

                                    <div className="stat-card">
                                        <span>📌</span>
                                        <div>
                                            <small>Status</small>
                                            <h2>{absensi?.status || "Tidak Hadir"}</h2>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}

export default Dashboard;