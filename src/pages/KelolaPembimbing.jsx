import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";

function KelolaPembimbing() {
    const [pembimbings, setPembimbings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const loadData = async () => {
        try {
            setLoading(true);
            const response = await api.get("/pembimbing");
            const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
            setPembimbings(data);
            setError("");
        } catch {
            setError("Gagal memuat data pembimbing dari server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(loadData, 0);
        return () => clearTimeout(timeoutId);
    }, []);

    const filteredPembimbings = pembimbings.filter((item) => {
        const query = searchTerm.toLowerCase();
        return (
            (item.nama && item.nama.toLowerCase().includes(query)) ||
            (item.email && item.email.toLowerCase().includes(query)) ||
            (item.bidang && item.bidang.toLowerCase().includes(query)) ||
            (item.no_hp && item.no_hp.toLowerCase().includes(query)) ||
            String(item.id).includes(query)
        );
    });

    return (
        <div className="layout">
            <Sidebar />

            <div className="content">
                <Navbar />

                <main className="main" style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "50px" }}>
                    {/* Header Halaman yang Bersih & Alami */}
                    <div className="page-heading" style={{ marginBottom: "20px" }}>
                        <div>
                            <p className="eyebrow" style={{ letterSpacing: "0.08em", color: "#4f46e5", fontWeight: "700" }}>
                                DAFTAR PEMBIMBING
                            </p>
                            <h1 style={{ margin: "4px 0", fontSize: "26px", fontWeight: "800", color: "#0f172a" }}>
                                Data Pembimbing
                            </h1>
                            <p className="subtitle" style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                                Lihat daftar pembimbing lapangan yang tersedia.
                            </p>
                        </div>
                    </div>

                    {/* Ringkasan Statistik Pembimbing */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "25px" }}>
                        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                            <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "#e0e7ff", color: "#4338ca", display: "grid", placeItems: "center", fontSize: "20px" }}>
                                👥
                            </div>
                            <div>
                                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Total Pembimbing</span>
                                <h3 style={{ margin: "2px 0 0", fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>{pembimbings.length}</h3>
                            </div>
                        </div>

                        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                            <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "#ecfdf5", color: "#059669", display: "grid", placeItems: "center", fontSize: "20px" }}>
                                🏢
                            </div>
                            <div>
                                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Divisi / Bidang</span>
                                <h3 style={{ margin: "2px 0 0", fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>
                                    {new Set(pembimbings.map(p => p.bidang).filter(Boolean)).size}
                                </h3>
                            </div>
                        </div>

                    </div>

                    {/* Tabel Daftar Pembimbing */}
                    <div className="table-card" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px", overflow: "hidden", boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)" }}>
                        <div className="table-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", padding: "18px 24px", borderBottom: "1px solid #f1f5f9" }}>
                            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1e293b" }}>
                                Daftar Pembimbing ({filteredPembimbings.length})
                            </h3>

                            <input 
                                type="text"
                                placeholder="Cari nama, email, atau bidang..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", minWidth: "260px" }}
                            />
                        </div>

                        {loading ? (
                            <p className="empty" style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Memuat data pembimbing...</p>
                        ) : error ? (
                            <p className="message error" style={{ margin: "20px" }}>{error}</p>
                        ) : (
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                                    <thead>
                                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                            <th style={{ padding: "12px 18px", color: "#64748b", fontWeight: "700", fontSize: "12px", width: "60px" }}>NO</th>
                                            <th style={{ padding: "12px 18px", color: "#64748b", fontWeight: "700", fontSize: "12px" }}>NAMA PEMBIMBING</th>
                                            <th style={{ padding: "12px 18px", color: "#64748b", fontWeight: "700", fontSize: "12px" }}>EMAIL</th>
                                            <th style={{ padding: "12px 18px", color: "#64748b", fontWeight: "700", fontSize: "12px" }}>NO. HP</th>
                                            <th style={{ padding: "12px 18px", color: "#64748b", fontWeight: "700", fontSize: "12px" }}>BIDANG / DIVISI</th>
                                            <th style={{ padding: "12px 18px", color: "#64748b", fontWeight: "700", fontSize: "12px" }}>WAKTU DIBUAT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPembimbings.length > 0 ? (
                                            filteredPembimbings.map((item, index) => (
                                                <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                    <td style={{ padding: "14px 18px", color: "#64748b", fontWeight: "600" }}>
                                                        {index + 1}
                                                    </td>
                                                    <td style={{ padding: "14px 18px" }}>
                                                        <strong style={{ color: "#0f172a", fontSize: "14px" }}>{item.nama}</strong>
                                                    </td>
                                                    <td style={{ padding: "14px 18px", color: "#334155" }}>
                                                        {item.email}
                                                    </td>
                                                    <td style={{ padding: "14px 18px", color: "#334155" }}>
                                                        {item.no_hp || "-"}
                                                    </td>
                                                    <td style={{ padding: "14px 18px", color: "#334155" }}>
                                                        <span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px", fontSize: "12px" }}>
                                                            {item.bidang || "-"}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: "14px 18px", color: "#64748b", fontSize: "12px" }}>
                                                        {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                                                    {searchTerm ? "Tidak ada pembimbing yang cocok dengan pencarian." : "Belum ada data pembimbing."}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default KelolaPembimbing;
