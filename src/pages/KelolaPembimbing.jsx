import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";

function KelolaPembimbing() {
    const [pembimbings, setPembimbings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [formError, setFormError] = useState("");
    
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        id: "",
        nama: "",
        email: "",
        no_hp: "",
        bidang: "",
    });

    const loadData = async () => {
        try {
            setLoading(true);
            const response = await api.get("/pembimbing");
            setPembimbings(response.data);
            setError("");
        } catch (err) {
            setError("Gagal memuat data pembimbing.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError("");
        try {
            if (isEditing) {
                await api.put(`/pembimbing/${formData.id}`, formData);
            } else {
                await api.post("/pembimbing", formData);
            }
            resetForm();
            loadData();
        } catch (err) {
            setFormError(err.response?.data?.message || "Terjadi kesalahan saat menyimpan data.");
        }
    };

    const handleEdit = (item) => {
        setIsEditing(true);
        setFormData({
            id: item.id,
            nama: item.nama,
            email: item.email,
            no_hp: item.no_hp || "",
            bidang: item.bidang || "",
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus data pembimbing ini?")) {
            try {
                await api.delete(`/pembimbing/${id}`);
                // Jika sedang mengedit data yang dihapus, reset formnya
                if (isEditing && formData.id === id) {
                    resetForm();
                }
                loadData();
            } catch (err) {
                alert("Gagal menghapus data pembimbing.");
            }
        }
    };

    const resetForm = () => {
        setIsEditing(false);
        setFormData({ id: "", nama: "", email: "", no_hp: "", bidang: "" });
        setFormError("");
    };

    return (
        <div className="layout">
            <Sidebar />

            <div className="content">
                <Navbar />

                <main className="main">
                    <div className="page-heading">
                        <div>
                            <p className="eyebrow">KELOLA DATA</p>
                            <h1>Daftar Pembimbing</h1>
                            <p className="subtitle">Manajemen data pembimbing magang.</p>
                        </div>
                    </div>

                    <div className="setup-panel" style={{ marginBottom: "30px", gridTemplateColumns: "1fr" }}>
                        <div>
                            <h3 style={{ margin: "0 0 15px", color: "#1e293b", fontSize: "18px" }}>
                                {isEditing ? "Edit Data Pembimbing" : "Tambah Pembimbing Baru"}
                            </h3>
                            {formError && <div className="message error" style={{ marginBottom: "15px" }}>{formError}</div>}
                            <form onSubmit={handleSubmit} className="participant-form" style={{ gridTemplateColumns: "1fr 1fr", display: "grid", gap: "15px" }}>
                                <div style={{ gridColumn: "1 / -1" }}>
                                    <label>Nama Lengkap</label>
                                    <input type="text" name="nama" value={formData.nama} onChange={handleChange} required placeholder="Masukkan nama pembimbing" />
                                </div>
                                <div>
                                    <label>Email</label>
                                    <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="email@contoh.com" />
                                </div>
                                <div>
                                    <label>Nomor HP <span className="optional">(Opsional)</span></label>
                                    <input type="text" name="no_hp" value={formData.no_hp} onChange={handleChange} placeholder="Contoh: 0812..." />
                                </div>
                                <div style={{ gridColumn: "1 / -1" }}>
                                    <label>Bidang / Divisi <span className="optional">(Opsional)</span></label>
                                    <input type="text" name="bidang" value={formData.bidang} onChange={handleChange} placeholder="Contoh: IT Support" />
                                </div>
                                <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", marginTop: "10px" }}>
                                    <button type="submit" className="btn-primary" style={{ display: "inline-block", width: "auto" }}>
                                        {isEditing ? "Simpan Perubahan" : "Tambah Data"}
                                    </button>
                                    {isEditing && (
                                        <button type="button" onClick={resetForm} className="btn-primary" style={{ background: "#94a3b8", display: "inline-block", width: "auto" }}>
                                            Batal
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="table-card">
                        <div className="table-toolbar">
                            <h3>Total Pembimbing ({pembimbings.length})</h3>
                        </div>
                        {loading ? (
                            <p className="empty">Memuat data...</p>
                        ) : error ? (
                            <p className="message error" style={{ margin: "20px" }}>{error}</p>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Nama</th>
                                        <th>Email</th>
                                        <th>No. HP</th>
                                        <th>Bidang</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pembimbings.length > 0 ? (
                                        pembimbings.map((item) => (
                                            <tr key={item.id}>
                                                <td><strong>{item.nama}</strong></td>
                                                <td>{item.email}</td>
                                                <td>{item.no_hp || "-"}</td>
                                                <td>{item.bidang || "-"}</td>
                                                <td>
                                                    <div style={{ display: "flex", gap: "8px" }}>
                                                        <button 
                                                            onClick={() => handleEdit(item)}
                                                            style={{ border: "1px solid #e2e8f0", background: "#fff", color: "#3b82f6", padding: "4px 10px", borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}
                                                        >Edit</button>
                                                        <button 
                                                            onClick={() => handleDelete(item.id)}
                                                            style={{ border: "1px solid #e2e8f0", background: "#fee2e2", color: "#ef4444", padding: "4px 10px", borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}
                                                        >Hapus</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="empty">Belum ada data pembimbing.</td>
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

export default KelolaPembimbing;
