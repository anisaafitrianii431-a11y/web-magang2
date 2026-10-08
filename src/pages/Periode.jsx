import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

function Periode() {
    // Mock data for UI demonstration
    const defaultPeriodes = [
        {
            id: 1,
            nama: "Periode 2026",
            tanggalMulai: "2026-08-31",
            tanggalSelesai: "2026-11-30",
            waktuMulai: "08:00",
            waktuSelesai: "17:00",
            status: "Aktif",
            pembimbing: "Widya Anjelina",
            peserta: [
                { npm: "2310001", nama: "Hanifa Khairunisa" },
                { npm: "2310002", nama: "Nadia Nurhaliza" },
                { npm: "2310003", nama: "Anisa Fitriani" },
                { npm: "2310004", nama: "Widya Anjelina" },
                { npm: "2310005", nama: "Tiara Agus Fajri" }
            ],
        },
        {
            id: 2,
            nama: "Periode 2025",
            tanggalMulai: "2025-08-01",
            tanggalSelesai: "2025-11-30",
            waktuMulai: "08:00",
            waktuSelesai: "17:00",
            status: "Selesai",
            pembimbing: "Ahmad Rizal",
            peserta: [],
        },
        {
            id: 3,
            nama: "Periode 2024",
            tanggalMulai: "2024-08-01",
            tanggalSelesai: "2024-11-30",
            waktuMulai: "08:00",
            waktuSelesai: "17:00",
            status: "Selesai",
            pembimbing: "Siti Sarah",
            peserta: [
                { npm: "211013005", nama: "Wita" },
                { npm: "211013007", nama: "Tasya" }
            ],
        },
    ];

    const [periodes, setPeriodes] = useState(() => {
        const normalizeDates = (data) => data.map(periode => {
            const tahun = periode.nama === "Periode 2025" ? "2025"
                : periode.nama === "Periode 2024" ? "2024"
                : null;

            return tahun
                ? { ...periode, tanggalMulai: `${tahun}-08-01`, tanggalSelesai: `${tahun}-11-30` }
                : periode;
        });

        let periodesLama = [];
        try {
            const savedV2 = JSON.parse(localStorage.getItem("periodesDataV2") || "[]");
            if (Array.isArray(savedV2)) periodesLama = normalizeDates(savedV2);
        } catch (e) {}

        const savedV3 = localStorage.getItem("periodesDataV3");
        if (savedV3) {
            try {
                const npmYangSempatTertimpa = {
                    "Hanifa Khairunisa": ["231013018", "2310001"],
                    "Nadia Nurhaliza": ["23013008", "2310002"],
                    "Anisa Fitriani": ["231013002", "2310003"],
                    "Widya Anjelina": ["201013021", "2310004"],
                    "Tiara Agus Fajri": ["231013027", "2310005"]
                };
                const savedPeriodes = normalizeDates(JSON.parse(savedV3)).map(periode => ({
                    ...periode,
                    peserta: periode.nama === "Periode 2026"
                        ? periode.peserta.map(peserta => {
                            const npmLama = npmYangSempatTertimpa[peserta.nama];
                            return npmLama && peserta.npm === npmLama[0]
                                ? { ...peserta, npm: npmLama[1] }
                                : peserta;
                        })
                        : periode.peserta
                }));
                return savedPeriodes.map(periode => {
                    const periodeLama = periodesLama.find(item => item.id === periode.id || item.nama === periode.nama);
                    if (!periodeLama?.peserta?.length) return periode;

                    const periodeDefault = defaultPeriodes.find(item => item.nama === periode.nama);
                    const peserta = periode.peserta || [];
                    const isDefault = JSON.stringify(peserta) === JSON.stringify(periodeDefault?.peserta || []);
                    if (isDefault || peserta.length === 0) {
                        return { ...periode, peserta: [...periodeLama.peserta] };
                    }

                    return {
                        ...periode,
                        peserta: peserta.map(item => {
                            const pesertaDefault = periodeDefault?.peserta.find(entry => entry.nama === item.nama);
                            const pesertaLama = periodeLama.peserta.find(entry => entry.nama === item.nama);
                            return pesertaDefault && pesertaLama && item.npm === pesertaDefault.npm
                                ? { ...item, npm: pesertaLama.npm }
                                : item;
                        })
                    };
                });
            } catch (e) {
                return defaultPeriodes;
            }
        }

        return periodesLama.length ? periodesLama : defaultPeriodes;
    });

    useEffect(() => {
        localStorage.setItem("periodesDataV3", JSON.stringify(periodes));
    }, [periodes]);

    const formatDate = (dateString) => {
        const options = { day: "numeric", month: "long", year: "numeric" };
        return new Date(dateString).toLocaleDateString("id-ID", options);
    };

    const [selectedPeriodeId, setSelectedPeriodeId] = useState(periodes[0]?.id || 1);

    const activePeriode = periodes.find(p => p.id === selectedPeriodeId) || periodes[0];

    // Filter periodes into a list of students for the table
    const tableData = [];
    let counter = 1;
    if (activePeriode && activePeriode.peserta) {
        activePeriode.peserta.forEach(peserta => {
            tableData.push({
                no: counter++,
                npm: peserta.npm,
                nama: peserta.nama,
                periodeId: activePeriode.id
            });
        });
    }

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editData, setEditData] = useState({ oldNpm: "", oldNama: "", newNpm: "", newNama: "", periodeId: null });
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addData, setAddData] = useState({ npm: "", nama: "", periodeId: 1 });

    const handleEditClick = (row) => {
        setEditData({ oldNpm: row.npm, oldNama: row.nama, newNpm: row.npm, newNama: row.nama, periodeId: row.periodeId });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = (e) => {
        e.preventDefault();
        const updatedPeriodes = periodes.map(p => {
            if (p.id === editData.periodeId) {
                return {
                    ...p,
                    peserta: p.peserta.map(peserta => 
                        peserta.npm === editData.oldNpm 
                            ? { ...peserta, npm: editData.newNpm, nama: editData.newNama } 
                            : peserta
                    )
                };
            }
            return p;
        });
        localStorage.setItem("periodesDataV3", JSON.stringify(updatedPeriodes));
        setPeriodes(updatedPeriodes);
        setIsEditModalOpen(false);
    };

    const handleSaveAdd = (e) => {
        e.preventDefault();
        setPeriodes(prev => prev.map(p => {
            if (p.id === Number(addData.periodeId)) {
                return {
                    ...p,
                    peserta: [...p.peserta, { npm: addData.npm, nama: addData.nama }]
                };
            }
            return p;
        }));
        setIsAddModalOpen(false);
        setAddData({ npm: "", nama: "", periodeId: periodes[0]?.id || 1 });
    };

    return (
        <div className="layout" style={{ fontFamily: "'Nunito', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
            <Sidebar />

            <div className="content">
                <Navbar />

                <main className="main" style={{ background: "#fdfdfd", minHeight: "100vh", display: "flex", justifyContent: "center", padding: "40px 20px" }}>
                    <div style={{ maxWidth: "1000px", width: "100%" }}>
                        
                        {/* Add Button Top Right */}
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px", gap: "10px" }}>
                            <button 
                                onClick={() => setIsAddModalOpen(true)}
                                style={{
                                    padding: "10px 18px", 
                                    borderRadius: "20px",
                                    border: "none",
                                    background: "#3b82f6",
                                    color: "#fff",
                                    fontWeight: "600",
                                    fontSize: "14px",
                                    cursor: "pointer",
                                    boxShadow: "0 2px 5px rgba(59,130,246,0.3)"
                                }}
                            >
                                + Tambah Peserta
                            </button>
                        </div>

                        {/* Header Section */}
                        <div style={{ position: "relative", textAlign: "center", marginBottom: "40px" }}>
                            {/* Computer Icon (Left) */}
                            <div style={{ 
                                position: "absolute", 
                                left: "20px", 
                                top: "0", 
                                fontSize: "65px",
                                opacity: 0.9,
                                filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.1))"
                            }}>
                                💻
                            </div>
                            
                            <p style={{ 
                                margin: "0 0 5px 0", 
                                fontSize: "32px", 
                                fontWeight: "800", 
                                color: "#0f172a",
                                letterSpacing: "0",
                                textTransform: "uppercase"
                            }}>
                                Data Periode Magang
                            </p>
                            <h1 style={{ 
                                fontFamily: "'Space Grotesk', sans-serif", 
                                fontSize: "20px", 
                                color: "#64748b", 
                                margin: "0 0 10px 0",
                                fontWeight: "600",
                                letterSpacing: "0"
                            }}>
                                Sekolah Tinggi Teknologi Payakumbuh
                            </h1>
                            <p style={{ margin: "0", fontSize: "16px", color: "#475569" }}>
                                {formatDate(activePeriode.tanggalMulai)} &mdash; {formatDate(activePeriode.tanggalSelesai)}
                            </p>
                        </div>
                        
                        {/* Tab Periodes */}
                        <div style={{ display: "flex", gap: "12px", marginBottom: "30px", justifyContent: "center" }}>
                            {periodes.map(p => (
                                <button 
                                    key={p.id}
                                    onClick={() => setSelectedPeriodeId(p.id)}
                                    style={{
                                        padding: "10px 20px",
                                        borderRadius: "8px",
                                        border: "1px solid",
                                        borderColor: selectedPeriodeId === p.id ? "#3b82f6" : "#e2e8f0",
                                        background: selectedPeriodeId === p.id ? "#eff6ff" : "#fff",
                                        color: selectedPeriodeId === p.id ? "#2563eb" : "#475569",
                                        fontWeight: "600",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease"
                                    }}
                                >
                                    {p.nama}
                                </button>
                            ))}
                        </div>

                        {/* Table Section */}
                        <div style={{ 
                            background: "#fff", 
                            borderRadius: "16px", 
                            overflow: "hidden", 
                            boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
                            border: "1px solid #e2e8f0"
                        }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
                                <thead>
                                    <tr style={{ background: "#84a4c4", color: "#ffffff", fontSize: "16px", fontFamily: "'Fredoka', 'Comic Sans MS', cursive", letterSpacing: "0.5px" }}>
                                        <th style={{ padding: "16px" }}>No</th>
                                        <th style={{ padding: "16px", textAlign: "left" }}>NPM</th>
                                        <th style={{ padding: "16px", textAlign: "left" }}>Nama</th>
                                        <th style={{ padding: "16px" }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableData.length > 0 ? (
                                        tableData.map((row, index) => (
                                            <tr key={index} style={{ 
                                                background: index % 2 === 0 ? "#ffffff" : "#f4f8fb",
                                                color: "#334155",
                                                fontSize: "15px",
                                                fontWeight: "600",
                                                borderBottom: "1px solid #e2e8f0"
                                            }}>
                                                <td style={{ padding: "16px" }}>{row.no}</td>
                                                <td style={{ padding: "16px", textAlign: "left" }}>{row.npm}</td>
                                                <td style={{ padding: "16px", textAlign: "left" }}>{row.nama}</td>
                                                <td style={{ padding: "16px" }}>
                                                    <button style={{ 
                                                        background: "#fff", 
                                                        color: "#0ea5e9", 
                                                        border: "1px solid #cbd5e1", 
                                                        padding: "6px 12px", 
                                                        borderRadius: "6px", 
                                                        cursor: "pointer", 
                                                        fontWeight: "700",
                                                        fontSize: "13px",
                                                        transition: "all 0.2s"
                                                    }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.borderColor = "#0ea5e9"; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#cbd5e1"; }}
                                                    onClick={() => handleEditClick(row)}
                                                    >
                                                        Edit
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" style={{ padding: "30px", color: "#94a3b8" }}>Belum ada data peserta magang.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Note */}
                        <div style={{ marginTop: "30px", display: "flex", justifyContent: "center", color: "#64748b" }}>
                            <p style={{ margin: 0, fontSize: "14px" }}>
                                Mengelola data kehadiran periode magang Sekolah Tinggi Teknologi Payakumbuh.
                            </p>
                        </div>
                    </div>
                </main>
            </div>

            {isEditModalOpen && (
                <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
                    <div style={{ background: "#fff", padding: "30px", borderRadius: "12px", width: "400px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
                        <h2 style={{ margin: "0 0 20px", fontSize: "20px", color: "#0f172a" }}>Edit Peserta</h2>
                        <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#475569" }}>NPM</label>
                                <input 
                                    type="text" 
                                    value={editData.newNpm} 
                                    onChange={(e) => setEditData({...editData, newNpm: e.target.value})}
                                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#475569" }}>Nama Peserta</label>
                                <input 
                                    type="text" 
                                    value={editData.newNama} 
                                    onChange={(e) => setEditData({...editData, newNama: e.target.value})}
                                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                    required
                                />
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                                <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ padding: "10px 16px", borderRadius: "6px", border: "none", background: "#f1f5f9", color: "#475569", fontWeight: "600", cursor: "pointer" }}>Batal</button>
                                <button type="submit" style={{ padding: "10px 16px", borderRadius: "6px", border: "none", background: "#3b82f6", color: "#fff", fontWeight: "600", cursor: "pointer" }}>Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isAddModalOpen && (
                <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
                    <div style={{ background: "#fff", padding: "30px", borderRadius: "12px", width: "400px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
                        <h2 style={{ margin: "0 0 20px", fontSize: "20px", color: "#0f172a" }}>Tambah Peserta Baru</h2>
                        <form onSubmit={handleSaveAdd} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#475569" }}>Periode / Batch</label>
                                <select 
                                    value={addData.periodeId} 
                                    onChange={(e) => setAddData({...addData, periodeId: e.target.value})}
                                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                    required
                                >
                                    {periodes.map(p => (
                                        <option key={p.id} value={p.id}>{p.nama}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#475569" }}>NPM</label>
                                <input 
                                    type="text" 
                                    value={addData.npm} 
                                    onChange={(e) => setAddData({...addData, npm: e.target.value})}
                                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#475569" }}>Nama Peserta</label>
                                <input 
                                    type="text" 
                                    value={addData.nama} 
                                    onChange={(e) => setAddData({...addData, nama: e.target.value})}
                                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                    required
                                />
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                                <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: "10px 16px", borderRadius: "6px", border: "none", background: "#f1f5f9", color: "#475569", fontWeight: "600", cursor: "pointer" }}>Batal</button>
                                <button type="submit" style={{ padding: "10px 16px", borderRadius: "6px", border: "none", background: "#10b981", color: "#fff", fontWeight: "600", cursor: "pointer" }}>Tambah</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Periode;
