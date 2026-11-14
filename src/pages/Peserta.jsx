import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";

function Peserta() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const role = (() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null")?.role?.toLowerCase() || "peserta";
        } catch {
            return "peserta";
        }
    })();

    useEffect(() => {
        const loadData = async () => {
            try {
                const response = await api.get(role === "peserta" ? "/absensi-saya" : "/absensi");
                setData(response.data || []);
            } catch (error) {
                console.error(error);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [role]);

    return (
        <div className="layout">
            <Sidebar />

            <div className="content">
                <Navbar />

                <main className="main">
                    <h1>Peserta Magang</h1>
                    <p className="subtitle">{role === "peserta" ? "Riwayat kehadiran Anda." : "Data kehadiran seluruh peserta magang."}</p>

                    <div className="table-card">
                        <h3>Daftar Kehadiran</h3>

                        {loading ? (
                            <p>Memuat data...</p>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Nama</th>
                                        <th>Tanggal</th>
                                        <th>Masuk</th>
                                        <th>Pulang</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.length ? (
                                        data.map((item) => (
                                            <tr key={item.id}>
                                                <td>{item.participant_name || "-"}</td>
                                                <td>{item.tanggal || "-"}</td>
                                                <td>{item.jam_masuk || "-"}</td>
                                                <td>{item.jam_pulang || "-"}</td>
                                                <td>{item.status || "-"}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="empty">
                                                Belum ada data kehadiran.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Peserta;