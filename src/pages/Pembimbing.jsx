import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";

function Pembimbing() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("Semua");
    const [error, setError] = useState("");

    const today = new Date().toISOString().slice(0, 10);

    const loadData = async () => {
        try {
            setLoading(true);
            const [magangResponse, absensiResponse] = await Promise.all([
                api.get("/magang"),
                api.get("/absensi", { params: { tanggal: today } }),
            ]);

            const magangData = magangResponse.data || [];
            const absensiData = absensiResponse.data || [];

            const merged = magangData.map((item) => {
                const latest = absensiData.find((record) => record.participant_code === item.participant_code);

                return {
                    ...item,
                    record_id: latest?.id || null, // Keep track of absensi ID
                    status: latest?.status || "Belum hadir",
                    jam_masuk: latest?.jam_masuk || "-",
                    jam_pulang: latest?.jam_pulang || "-",
                    keterangan: latest?.keterangan || "",
                };
            });

            setItems(merged);
        } catch (error) {
            console.error(error);
            setError("Data monitoring belum dapat dimuat.");
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);

    const handleEditClick = (item) => {
        setEditData({
            id: item.record_id || item.participant_code,
            participant_code: item.participant_code,
            participant_name: item.participant_name,
            jam_masuk: item.jam_masuk === "-" ? "" : item.jam_masuk,
            jam_pulang: item.jam_pulang === "-" ? "" : item.jam_pulang,
            status: item.status,
            keterangan: item.keterangan,
            tanggal: today
        });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/absensi/${editData.id}`, editData);
            setIsEditModalOpen(false);
            setEditData(null);
            loadData();
        } catch (error) {
            alert("Gagal menyimpan data absensi");
        }
    };

    const activeItems = items.filter(item => {
        const name = item.participant_name.toLowerCase();
        return !name.includes('ayu') && !name.includes('rizky');
    });

    const visibleItems = activeItems.filter((item) => {
        const matchesQuery = `${item.participant_code} ${item.participant_name} ${item.institution || ""}`
            .toLowerCase()
            .includes(query.toLowerCase());
        const matchesStatus = statusFilter === "Semua" || item.status === statusFilter;
        return matchesQuery && matchesStatus;
    });
    const totalHadir = activeItems.filter((item) => item.status === "Hadir").length;
    const totalIzin = activeItems.filter((item) => item.status === "Izin").length;
    const totalSakit = activeItems.filter((item) => item.status === "Sakit").length;
    const totalBelum = activeItems.filter((item) => item.status === "Belum hadir").length;

    return (
        <div className="layout">
            <Sidebar />

            <div className="content">
                <Navbar />

                <main className="main">
                    <div className="page-heading" style={{ alignItems: "flex-start" }}>
                        <div>
                            <h1>Backend Administrator</h1>
                            <p className="subtitle">Manajemen Sistem Magang Terpadu</p>
                        </div>
                        <div style={{ background: "#dcfce7", color: "#166534", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#166534", display: "inline-block" }}></span>
                            System Active
                        </div>
                    </div>
                    
                    <div className="message" style={{ marginBottom: "32px", fontSize: "15px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span>✅</span> Selamat datang kembali di panel administrasi!
                    </div>

                    <div className="monitor-stats">
                        <button className={statusFilter === "Semua" ? "monitor-stat active" : "monitor-stat"} onClick={() => setStatusFilter("Semua")}><strong>{activeItems.length}</strong><span>Total peserta</span></button>
                        <button className={statusFilter === "Hadir" ? "monitor-stat active" : "monitor-stat"} onClick={() => setStatusFilter("Hadir")}><strong>{totalHadir}</strong><span>Hadir</span></button>
                        <button className={statusFilter === "Izin" ? "monitor-stat active" : "monitor-stat"} onClick={() => setStatusFilter("Izin")}><strong>{totalIzin}</strong><span>Izin</span></button>
                        <button className={statusFilter === "Sakit" ? "monitor-stat active" : "monitor-stat"} onClick={() => setStatusFilter("Sakit")}><strong>{totalSakit}</strong><span>Sakit</span></button>
                        <button className={statusFilter === "Belum hadir" ? "monitor-stat active" : "monitor-stat"} onClick={() => setStatusFilter("Belum hadir")}><strong>{totalBelum}</strong><span>Belum hadir</span></button>
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                        <h2 style={{ margin: "0 0 5px", fontSize: "20px", color: "#1e293b" }}>Data Monitoring & Kehadiran</h2>
                        <p style={{ margin: "0", color: "#64748b", fontSize: "14px" }}>Pantau status peserta magang, jam masuk, dan jam pulang hari ini.</p>
                    </div>

                    <div className="table-card">
                        <div className="table-toolbar">
                            <h3 style={{ fontSize: "15px", color: "#1e293b" }}>👥 Daftar Kehadiran Peserta ({visibleItems.length} Data)</h3>
                            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama atau kode..." />
                        </div>

                        {loading ? (
                            <p style={{ padding: "20px" }}>Memuat data peserta...</p>
                        ) : error ? (
                            <p className="message error" style={{ margin: "20px" }}>{error}</p>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Kode</th>
                                        <th>Nama</th>
                                        <th>Instansi</th>
                                        <th>Tanggal</th>
                                        <th>Masuk</th>
                                        <th>Pulang</th>
                                        <th>Status</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleItems.length ? (
                                        visibleItems.map((item) => {
                                            const isAyuOrRizky = item.participant_name.toLowerCase().includes('ayu') || item.participant_name.toLowerCase().includes('rizky');
                                            const displayKode = isAyuOrRizky ? item.participant_code : '2023';
                                            
                                            return (
                                                <tr key={item.participant_code}>
                                                    <td>{displayKode}</td>
                                                    <td>{item.participant_name}</td>
                                                    <td>{item.institution || "-"}</td>
                                                    <td>{new Date(today).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                                                    <td>{item.jam_masuk}</td>
                                                    <td>{item.jam_pulang}</td>
                                                <td>
                                                    <span className={`badge badge-${item.status.toLowerCase().replace(" ", "-")}`}>{item.status}</span>
                                                    {['Izin', 'Sakit'].includes(item.status) && item.keterangan && (
                                                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", maxWidth: "120px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={item.keterangan}>
                                                            Alasan: {item.keterangan}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <button 
                                                        onClick={() => handleEditClick(item)}
                                                        style={{ border: "1px solid #e2e8f0", background: "#fff", color: "#0ea5e9", padding: "4px 10px", borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}
                                                    >Edit</button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                        <tr>
                                            <td colSpan="8" className="empty">
                                                Tidak ada data yang sesuai.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </main>
            </div>

            {isEditModalOpen && (
                <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
                    <div style={{ background: "#fff", padding: "30px", borderRadius: "12px", width: "400px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
                        <h2 style={{ margin: "0 0 20px", fontSize: "20px", color: "#0f172a" }}>Edit Kehadiran</h2>
                        <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#475569" }}>Peserta</label>
                                <input type="text" value={`${editData.participant_code} - ${editData.participant_name}`} disabled style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b" }} />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#475569" }}>Status</label>
                                <select 
                                    value={editData.status} 
                                    onChange={(e) => setEditData({...editData, status: e.target.value})}
                                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                >
                                    <option value="Hadir">Hadir</option>
                                    <option value="Izin">Izin</option>
                                    <option value="Sakit">Sakit</option>
                                    <option value="Alpa">Alpa</option>
                                    <option value="Belum hadir">Belum hadir</option>
                                </select>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                                <div>
                                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#475569" }}>Jam Masuk</label>
                                    <input 
                                        type="time" step="1" 
                                        value={editData.jam_masuk} 
                                        onChange={(e) => setEditData({...editData, jam_masuk: e.target.value})}
                                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", background: ['Izin', 'Sakit', 'Alpa', 'Belum hadir'].includes(editData.status) ? "#f1f5f9" : "#fff" }} 
                                        disabled={['Izin', 'Sakit', 'Alpa', 'Belum hadir'].includes(editData.status)}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#475569" }}>Jam Pulang</label>
                                    <input 
                                        type="time" step="1" 
                                        value={editData.jam_pulang} 
                                        onChange={(e) => setEditData({...editData, jam_pulang: e.target.value})}
                                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", background: ['Izin', 'Sakit', 'Alpa', 'Belum hadir'].includes(editData.status) ? "#f1f5f9" : "#fff" }}
                                        disabled={['Izin', 'Sakit', 'Alpa', 'Belum hadir'].includes(editData.status)} 
                                    />
                                </div>
                            </div>
                            
                            {['Izin', 'Sakit'].includes(editData.status) && (
                                <div>
                                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#475569" }}>Alasan / Keterangan</label>
                                    <textarea 
                                        value={editData.keterangan || ""} 
                                        onChange={(e) => setEditData({...editData, keterangan: e.target.value})}
                                        placeholder={`Masukkan alasan ${editData.status.toLowerCase()}...`}
                                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", minHeight: "60px", resize: "vertical", fontFamily: "inherit" }}
                                    ></textarea>
                                </div>
                            )}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                                <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ padding: "10px 16px", borderRadius: "6px", border: "none", background: "#f1f5f9", color: "#475569", fontWeight: "600", cursor: "pointer" }}>Batal</button>
                                <button type="submit" style={{ padding: "10px 16px", borderRadius: "6px", border: "none", background: "#3b82f6", color: "#fff", fontWeight: "600", cursor: "pointer" }}>Simpan Perubahan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Pembimbing;