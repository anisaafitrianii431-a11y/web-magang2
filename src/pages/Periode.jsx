import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { 
    Calendar, 
    Users, 
    Clock, 
    UserCheck, 
    Plus, 
    GraduationCap, 
    Building2, 
    CheckCircle2, 
    X,
    Sparkles,
    Check,
    Search
} from "lucide-react";

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
            peserta: [
                { npm: "221013006", nama: "Jovi" },
                { npm: "221013007", nama: "Dinda" },
                { npm: "221013008", nama: "Afiifah" }
            ],
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
        } catch (e) {
            // ignore
        }

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
        if (!dateString) return "-";
        const options = { day: "numeric", month: "long", year: "numeric" };
        return new Date(dateString).toLocaleDateString("id-ID", options);
    };

    const [selectedPeriodeId, setSelectedPeriodeId] = useState(periodes[0]?.id || 1);
    const [periodeSearch, setPeriodeSearch] = useState("");
    const [isPeriodeSearchOpen, setIsPeriodeSearchOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    const currentUser = (() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    })();
    const role = (currentUser?.role || "peserta").toLowerCase();
    const isPembimbing = role === "pembimbing";

    const activePeriode = periodes.find(p => p.id === selectedPeriodeId) || periodes[0];
    const matchingPeriodes = periodes.filter((periode) =>
        periode.nama.toLowerCase().includes(periodeSearch.trim().toLowerCase())
    );

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(""), 3500);
    };

    const pesertaList = activePeriode?.peserta || [];

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editData, setEditData] = useState({ oldNpm: "", newNpm: "", newNama: "", periodeId: null });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addData, setAddData] = useState({ npm: "", nama: "", periodeId: 1 });

    const [isEditPeriodeModalOpen, setIsEditPeriodeModalOpen] = useState(false);
    const [editPeriodeForm, setEditPeriodeForm] = useState({
        pembimbing: "",
        waktuMulai: "08:00",
        waktuSelesai: "17:00",
        status: "Aktif",
        tanggalMulai: "",
        tanggalSelesai: ""
    });

    const handleOpenEditPeriode = () => {
        setEditPeriodeForm({
            pembimbing: activePeriode.pembimbing || "",
            waktuMulai: activePeriode.waktuMulai || "08:00",
            waktuSelesai: activePeriode.waktuSelesai || "17:00",
            status: activePeriode.status || "Aktif",
            tanggalMulai: activePeriode.tanggalMulai || "",
            tanggalSelesai: activePeriode.tanggalSelesai || ""
        });
        setIsEditPeriodeModalOpen(true);
    };

    const handleSaveEditPeriode = (e) => {
        e.preventDefault();
        const updatedPeriodes = periodes.map(p => {
            if (p.id === activePeriode.id) {
                return {
                    ...p,
                    pembimbing: editPeriodeForm.pembimbing,
                    waktuMulai: editPeriodeForm.waktuMulai,
                    waktuSelesai: editPeriodeForm.waktuSelesai,
                    status: editPeriodeForm.status,
                    tanggalMulai: editPeriodeForm.tanggalMulai,
                    tanggalSelesai: editPeriodeForm.tanggalSelesai
                };
            }
            return p;
        });
        localStorage.setItem("periodesDataV3", JSON.stringify(updatedPeriodes));
        setPeriodes(updatedPeriodes);
        setIsEditPeriodeModalOpen(false);
        showToast("Data pembimbing & periode berhasil diperbarui ✨");
    };

    const handleSaveAdd = (e) => {
        e.preventDefault();
        const targetId = Number(addData.periodeId);
        setPeriodes(prev => prev.map(p => {
            if (p.id === targetId) {
                return {
                    ...p,
                    peserta: [...p.peserta, { npm: addData.npm, nama: addData.nama }]
                };
            }
            return p;
        }));
        setIsAddModalOpen(false);
        setAddData({ npm: "", nama: "", periodeId: activePeriode.id });
        showToast("Peserta baru berhasil ditambahkan 🎉");
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
        showToast("Data peserta berhasil diperbarui ✨");
    };

    // Helper avatar palette
    const getAvatarTheme = (name) => {
        const themes = [
            { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
            { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
            { bg: "#faf5ff", text: "#9333ea", border: "#e9d5ff" },
            { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
            { bg: "#fdf2f8", text: "#db2777", border: "#fbcfe8" },
            { bg: "#f0fdfa", text: "#0d9488", border: "#99f6e4" },
        ];
        let hash = 0;
        for (let i = 0; i < (name || "").length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return themes[Math.abs(hash) % themes.length];
    };

    return (
        <div className="layout" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
            <Sidebar />

            <div className="content">
                <Navbar />

                <main className="main" style={{ background: "#f8fafc", minHeight: "100vh", padding: "36px 30px 60px" }}>
                    <div style={{ maxWidth: "1140px", margin: "0 auto" }}>
                        
                        {/* Toast Alert */}
                        {toastMessage && (
                            <div style={{
                                position: "fixed",
                                bottom: "30px",
                                right: "30px",
                                background: "#0f172a",
                                color: "#ffffff",
                                padding: "14px 22px",
                                borderRadius: "12px",
                                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.25)",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                zIndex: 9999,
                                fontSize: "14px",
                                fontWeight: "600",
                                animation: "fadeIn 0.3s ease-out"
                            }}>
                                <Check size={18} color="#10b981" />
                                {toastMessage}
                            </div>
                        )}

                        {/* Hero Header Card */}
                        <div style={{
                            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #1e3a8a 100%)",
                            borderRadius: "20px",
                            padding: "36px 40px",
                            color: "#ffffff",
                            position: "relative",
                            overflow: "hidden",
                            boxShadow: "0 20px 30px -10px rgba(15, 23, 42, 0.15)",
                            marginBottom: "28px"
                        }}>
                            {/* Decorative Glow */}
                            <div style={{
                                position: "absolute",
                                right: "-40px",
                                top: "-40px",
                                width: "240px",
                                height: "240px",
                                borderRadius: "50%",
                                background: "radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0) 70%)",
                                pointerEvents: "none"
                            }} />

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px" }}>
                                <div style={{ maxWidth: "680px" }}>
                                    <div style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        background: "rgba(255, 255, 255, 0.1)",
                                        border: "1px solid rgba(255, 255, 255, 0.15)",
                                        backdropFilter: "blur(8px)",
                                        padding: "6px 14px",
                                        borderRadius: "30px",
                                        fontSize: "12px",
                                        fontWeight: "700",
                                        letterSpacing: "0.08em",
                                        color: "#93c5fd",
                                        marginBottom: "16px",
                                        textTransform: "uppercase"
                                    }}>
                                        <Sparkles size={14} />
                                        Manajemen Angkatan & Periode
                                    </div>

                                    <h1 style={{
                                        margin: "0 0 10px 0",
                                        fontSize: "30px",
                                        fontWeight: "800",
                                        color: "#ffffff",
                                        letterSpacing: "-0.02em",
                                        lineHeight: "1.2"
                                    }}>
                                        Data Periode Magang
                                    </h1>

                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#cbd5e1", fontSize: "15px", marginBottom: "14px" }}>
                                        <Building2 size={18} color="#60a5fa" />
                                        <span>Sekolah Tinggi Teknologi Payakumbuh</span>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94a3b8", fontSize: "14px" }}>
                                            <Calendar size={16} color="#93c5fd" />
                                            <span style={{ color: "#f1f5f9", fontWeight: "500" }}>
                                                {formatDate(activePeriode.tanggalMulai)} &mdash; {formatDate(activePeriode.tanggalSelesai)}
                                            </span>
                                        </div>
                                        <span style={{
                                            padding: "4px 12px",
                                            borderRadius: "20px",
                                            fontSize: "12px",
                                            fontWeight: "700",
                                            background: activePeriode.status === "Aktif" ? "rgba(16, 185, 129, 0.2)" : "rgba(148, 163, 184, 0.2)",
                                            color: activePeriode.status === "Aktif" ? "#34d399" : "#cbd5e1",
                                            border: `1px solid ${activePeriode.status === "Aktif" ? "rgba(16, 185, 129, 0.4)" : "rgba(148, 163, 184, 0.3)"}`
                                        }}>
                                            ● {activePeriode.status === "Aktif" ? "Periode Aktif Berjalan" : "Periode Selesai"}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setAddData({ npm: "", nama: "", periodeId: activePeriode.id });
                                        setIsAddModalOpen(true);
                                    }}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                                        color: "#ffffff",
                                        border: "none",
                                        padding: "12px 22px",
                                        borderRadius: "12px",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        boxShadow: "0 10px 20px -5px rgba(37, 99, 235, 0.4)",
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                                >
                                    <Plus size={18} />
                                    Tambah Peserta Baru
                                </button>
                            </div>
                        </div>

                        {/* KPI Metric Cards */}
                        <div className="periode-stats">
                            {/* Stat 1 */}
                            <div className="periode-stat-card">
                                <div className="periode-stat-icon periode-stat-icon--blue">
                                    <Users size={24} />
                                </div>
                                <div className="periode-stat-content">
                                    <span className="periode-stat-label">Total Peserta</span>
                                    <h3 className="periode-stat-value periode-stat-value--large">
                                        {activePeriode.peserta?.length || 0} <span>Mahasiswa</span>
                                    </h3>
                                </div>
                            </div>

                            {/* Stat 3 */}
                            <div className="periode-stat-card">
                                <div className="periode-stat-icon periode-stat-icon--amber">
                                    <Clock size={24} />
                                </div>
                                <div className="periode-stat-content">
                                    <span className="periode-stat-label">Jam Operasional</span>
                                    <h3 className="periode-stat-value">
                                        {activePeriode.waktuMulai || "08:00"} — {activePeriode.waktuSelesai || "17:00"} <span>WIB</span>
                                    </h3>
                                </div>
                            </div>

                            {/* Stat 4 */}
                            <div className="periode-stat-card">
                                <div className={`periode-stat-icon ${activePeriode.status === "Aktif" ? "periode-stat-icon--green" : "periode-stat-icon--slate"}`}>
                                    <CheckCircle2 size={24} />
                                </div>
                                <div className="periode-stat-content">
                                    <span className="periode-stat-label">Status Periode</span>
                                    <h3 className="periode-stat-value">
                                        {activePeriode.status === "Aktif" ? "Sedang Berjalan" : "Telah Selesai"}
                                    </h3>
                                </div>
                            </div>
                        </div>

                        {/* Searchable period selector */}
                        <div style={{
                            background: "#ffffff",
                            padding: "12px 16px",
                            borderRadius: "16px",
                            border: "1px solid #e2e8f0",
                            marginBottom: "20px"
                        }}>
                            <div style={{ position: "relative", width: "220px", maxWidth: "100%" }}>
                                <Search size={16} aria-hidden="true" style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }} />
                                <input
                                    type="search"
                                    value={periodeSearch}
                                    onChange={(event) => {
                                        setPeriodeSearch(event.target.value);
                                        setIsPeriodeSearchOpen(true);
                                    }}
                                    onFocus={() => setIsPeriodeSearchOpen(true)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Escape") setIsPeriodeSearchOpen(false);
                                        if (event.key === "Enter" && matchingPeriodes.length) {
                                            event.preventDefault();
                                            setSelectedPeriodeId(matchingPeriodes[0].id);
                                            setPeriodeSearch("");
                                            setIsPeriodeSearchOpen(false);
                                        }
                                    }}
                                    placeholder={`Cari periode... (${activePeriode?.nama || "Pilih periode"})`}
                                    aria-label="Cari periode magang"
                                    aria-expanded={isPeriodeSearchOpen}
                                    aria-controls="periode-search-results"
                                    style={{ display: "block", width: "220px", maxWidth: "100%", boxSizing: "border-box", padding: "7px 10px 7px 32px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "12px", color: "#334155", background: "#fff" }}
                                />
                                {isPeriodeSearchOpen && (
                                    <div id="periode-search-results" role="listbox" aria-label="Hasil pencarian periode" style={{ position: "absolute", zIndex: 10, top: "calc(100% + 6px)", left: 0, right: 0, maxHeight: "260px", overflowY: "auto", padding: "5px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#fff", boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)" }}>
                                        {matchingPeriodes.length ? matchingPeriodes.map((periode) => {
                                            const isSelected = selectedPeriodeId === periode.id;
                                            return (
                                                <button
                                                    key={periode.id}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={isSelected}
                                                    onMouseDown={(event) => event.preventDefault()}
                                                    onClick={() => {
                                                        setSelectedPeriodeId(periode.id);
                                                        setPeriodeSearch("");
                                                        setIsPeriodeSearchOpen(false);
                                                    }}
                                                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "10px 12px", border: "none", borderRadius: "8px", background: isSelected ? "#eff6ff" : "#fff", color: isSelected ? "#2563eb" : "#475569", fontWeight: isSelected ? 700 : 600, fontSize: "14px", textAlign: "left", cursor: "pointer" }}
                                                >
                                                    <span>{periode.nama}</span>
                                                    <span style={{ minWidth: "22px", padding: "2px 7px", borderRadius: "12px", background: isSelected ? "#dbeafe" : "#e2e8f0", color: isSelected ? "#1d4ed8" : "#64748b", fontSize: "11px", textAlign: "center" }}>
                                                        {periode.peserta?.length || 0}
                                                    </span>
                                                </button>
                                            );
                                        }) : (
                                            <p style={{ margin: 0, padding: "12px", color: "#64748b", fontSize: "13px" }}>Periode tidak ditemukan.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Main Modern Table Card */}
                        <div style={{
                            background: "#ffffff",
                            borderRadius: "18px",
                            overflow: "hidden",
                            boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.05)",
                            border: "1px solid #e2e8f0"
                        }}>
                            <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", textAlign: "left" }}>
                                <thead>
                                    <tr style={{
                                        background: "#f8fafc",
                                        borderBottom: "1px solid #e2e8f0"
                                    }}>
                                        <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", width: "8%" }}>No</th>
                                        <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", width: "16%" }}>NPM/NIM</th>
                                        <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", width: "44%" }}>Nama Peserta</th>
                                        <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", width: isPembimbing ? "16%" : "32%" }}>Status</th>
                                        {isPembimbing && <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", width: "16%" }}>Aksi</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pesertaList.length > 0 ? (
                                        pesertaList.map((peserta, index) => {
                                            const theme = getAvatarTheme(peserta.nama);
                                            const initial = peserta.nama ? peserta.nama.charAt(0).toUpperCase() : "P";
                                            return (
                                                <tr
                                                    key={peserta.npm || index}
                                                    style={{
                                                        borderBottom: "1px solid #f1f5f9",
                                                        transition: "background-color 0.15s ease"
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#ffffff"}
                                                >
                                                    {/* Col 1: No */}
                                                    <td style={{ padding: "16px 24px", color: "#94a3b8", fontWeight: "600", fontSize: "14px" }}>
                                                        {index + 1}
                                                    </td>

                                                    {/* Col 2: NPM Pill */}
                                                    <td style={{ padding: "16px 24px" }}>
                                                        <span style={{
                                                            fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace",
                                                            fontSize: "13px",
                                                            fontWeight: "700",
                                                            background: "#f1f5f9",
                                                            color: "#334155",
                                                            padding: "5px 10px",
                                                            borderRadius: "6px",
                                                            border: "1px solid #e2e8f0"
                                                        }}>
                                                            {peserta.npm}
                                                        </span>
                                                    </td>

                                                    {/* Col 3: Nama & Avatar */}
                                                    <td style={{ padding: "16px 24px" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                            <div style={{
                                                                width: "38px",
                                                                height: "38px",
                                                                borderRadius: "10px",
                                                                background: theme.bg,
                                                                color: theme.text,
                                                                border: `1px solid ${theme.border}`,
                                                                display: "grid",
                                                                placeItems: "center",
                                                                fontWeight: "800",
                                                                fontSize: "15px"
                                                            }}>
                                                                {initial}
                                                            </div>
                                                            <div>
                                                                <strong style={{ display: "block", color: "#0f172a", fontSize: "14.5px" }}>
                                                                    {peserta.nama}
                                                                </strong>
                                                                <span style={{ color: "#64748b", fontSize: "12px" }}>
                                                                    Mahasiswa Magang • {activePeriode.nama}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Col 4: Status */}
                                                    <td style={{ padding: "16px 24px" }}>
                                                        <span style={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: "6px",
                                                            background: "#ecfdf5",
                                                            color: "#059669",
                                                            padding: "4px 10px",
                                                            borderRadius: "20px",
                                                            fontSize: "12px",
                                                            fontWeight: "600"
                                                        }}>
                                                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }}></span>
                                                            Terdaftar
                                                        </span>
                                                    </td>

                                                    {isPembimbing && (
                                                        <td style={{ padding: "16px 24px", textAlign: "center" }}>
                                                            <span style={{
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                gap: "5px",
                                                                padding: "5px 12px",
                                                                borderRadius: "8px",
                                                                background: "#f0fdf4",
                                                                color: "#166534",
                                                                border: "1px solid #bbf7d0",
                                                                fontSize: "12px",
                                                                fontWeight: "600"
                                                            }}>
                                                                <CheckCircle2 size={13} color="#16a34a" />
                                                                Terdaftar Resmi
                                                            </span>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={isPembimbing ? 5 : 4} style={{ padding: "48px 20px", textAlign: "center" }}>
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                                                    <div style={{
                                                        width: "52px",
                                                        height: "52px",
                                                        borderRadius: "50%",
                                                        background: "#f1f5f9",
                                                        display: "grid",
                                                        placeItems: "center",
                                                        color: "#94a3b8"
                                                    }}>
                                                        <GraduationCap size={26} />
                                                    </div>
                                                    <p style={{ margin: "0", color: "#0f172a", fontWeight: "700", fontSize: "15px" }}>
                                                        Belum ada peserta di periode ini
                                                    </p>
                                                    <p style={{ margin: "0", color: "#64748b", fontSize: "13px" }}>
                                                        {isPembimbing
                                                            ? "Mahasiswa akan muncul di sini secara otomatis setelah mengajukan pendaftaran magang dan disetujui."
                                                            : "Klik tombol Tambah Peserta Baru untuk mendaftarkan mahasiswa."}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Information */}
                        <div style={{
                            marginTop: "28px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            color: "#64748b",
                            fontSize: "13px",
                            flexWrap: "wrap",
                            gap: "10px"
                        }}>
                            <span>
                                Menampilkan <strong>{pesertaList.length}</strong> mahasiswa terdaftar.
                            </span>
                            <span>
                                Sistem Absensi Magang &bull; Sekolah Tinggi Teknologi Payakumbuh
                            </span>
                        </div>

                    </div>
                </main>
            </div>

            {/* Modal Edit Peserta */}
            {isEditModalOpen && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    background: "rgba(15, 23, 42, 0.6)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 1000,
                    backdropFilter: "blur(6px)",
                    padding: "20px"
                }}>
                    <div style={{
                        background: "#ffffff",
                        padding: "32px",
                        borderRadius: "18px",
                        width: "440px",
                        maxWidth: "100%",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
                            <div>
                                <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Edit Data Peserta</h2>
                                <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>Perbarui identitas mahasiswa magang</p>
                            </div>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                                    NPM/NIM
                                </label>
                                <input 
                                    type="text" 
                                    value={editData.newNpm} 
                                    onChange={(e) => setEditData({...editData, newNpm: e.target.value})}
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                                    Nama Lengkap Peserta
                                </label>
                                <input 
                                    type="text" 
                                    value={editData.newNama} 
                                    onChange={(e) => setEditData({...editData, newNama: e.target.value})}
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                    required
                                />
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    style={{
                                        padding: "10px 18px",
                                        borderRadius: "10px",
                                        border: "1px solid #e2e8f0",
                                        background: "#f8fafc",
                                        color: "#475569",
                                        fontWeight: "600",
                                        fontSize: "13.5px",
                                        cursor: "pointer"
                                    }}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: "10px 22px",
                                        borderRadius: "10px",
                                        border: "none",
                                        background: "#2563eb",
                                        color: "#ffffff",
                                        fontWeight: "700",
                                        fontSize: "13.5px",
                                        cursor: "pointer",
                                        boxShadow: "0 4px 10px rgba(37, 99, 235, 0.25)"
                                    }}
                                >
                                    Simpan Perubahan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Tambah Peserta */}
            {isAddModalOpen && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    background: "rgba(15, 23, 42, 0.6)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 1000,
                    backdropFilter: "blur(6px)",
                    padding: "20px"
                }}>
                    <div style={{
                        background: "#ffffff",
                        padding: "32px",
                        borderRadius: "18px",
                        width: "440px",
                        maxWidth: "100%",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
                            <div>
                                <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Tambah Peserta Baru</h2>
                                <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>Daftarkan mahasiswa ke dalam periode magang</p>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveAdd} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                                    Target Periode Magang
                                </label>
                                <select 
                                    value={addData.periodeId} 
                                    onChange={(e) => setAddData({...addData, periodeId: e.target.value})}
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "14px",
                                        outline: "none",
                                        background: "#fff"
                                    }}
                                    required
                                >
                                    {periodes.map(p => (
                                        <option key={p.id} value={p.id}>{p.nama} ({p.status})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                                    NPM/NIM
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="Contoh: 2310006"
                                    value={addData.npm} 
                                    onChange={(e) => setAddData({...addData, npm: e.target.value})}
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                                    Nama Lengkap Peserta
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="Nama lengkap mahasiswa"
                                    value={addData.nama} 
                                    onChange={(e) => setAddData({...addData, nama: e.target.value})}
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                    required
                                />
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    style={{
                                        padding: "10px 18px",
                                        borderRadius: "10px",
                                        border: "1px solid #e2e8f0",
                                        background: "#f8fafc",
                                        color: "#475569",
                                        fontWeight: "600",
                                        fontSize: "13.5px",
                                        cursor: "pointer"
                                    }}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: "10px 22px",
                                        borderRadius: "10px",
                                        border: "none",
                                        background: "#10b981",
                                        color: "#ffffff",
                                        fontWeight: "700",
                                        fontSize: "13.5px",
                                        cursor: "pointer",
                                        boxShadow: "0 4px 10px rgba(16, 185, 129, 0.25)"
                                    }}
                                >
                                    Tambah Peserta
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Edit Pembimbing & Periode */}
            {isEditPeriodeModalOpen && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    background: "rgba(15, 23, 42, 0.6)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 1000,
                    backdropFilter: "blur(6px)",
                    padding: "20px"
                }}>
                    <div style={{
                        background: "#ffffff",
                        padding: "32px",
                        borderRadius: "18px",
                        width: "480px",
                        maxWidth: "100%",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <div>
                                <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>
                                    Edit Pembimbing & Periode
                                </h2>
                                <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                                    Konfigurasi untuk <strong>{activePeriode.nama}</strong>
                                </p>
                            </div>
                            <button
                                onClick={() => setIsEditPeriodeModalOpen(false)}
                                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEditPeriode} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                                    Nama Pembimbing Lapangan
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="Contoh: Siti Sarah, S.Kom., M.Kom"
                                    value={editPeriodeForm.pembimbing} 
                                    onChange={(e) => setEditPeriodeForm({...editPeriodeForm, pembimbing: e.target.value})}
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                    required
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div>
                                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                                        Jam Masuk
                                    </label>
                                    <input 
                                        type="time" 
                                        value={editPeriodeForm.waktuMulai} 
                                        onChange={(e) => setEditPeriodeForm({...editPeriodeForm, waktuMulai: e.target.value})}
                                        style={{
                                            width: "100%",
                                            padding: "10px 14px",
                                            borderRadius: "8px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "14px",
                                            outline: "none"
                                        }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                                        Jam Pulang
                                    </label>
                                    <input 
                                        type="time" 
                                        value={editPeriodeForm.waktuSelesai} 
                                        onChange={(e) => setEditPeriodeForm({...editPeriodeForm, waktuSelesai: e.target.value})}
                                        style={{
                                            width: "100%",
                                            padding: "10px 14px",
                                            borderRadius: "8px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "14px",
                                            outline: "none"
                                        }}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div>
                                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                                        Tanggal Mulai
                                    </label>
                                    <input 
                                        type="date" 
                                        value={editPeriodeForm.tanggalMulai} 
                                        onChange={(e) => setEditPeriodeForm({...editPeriodeForm, tanggalMulai: e.target.value})}
                                        style={{
                                            width: "100%",
                                            padding: "10px 14px",
                                            borderRadius: "8px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13.5px",
                                            outline: "none"
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                                        Tanggal Selesai
                                    </label>
                                    <input 
                                        type="date" 
                                        value={editPeriodeForm.tanggalSelesai} 
                                        onChange={(e) => setEditPeriodeForm({...editPeriodeForm, tanggalSelesai: e.target.value})}
                                        style={{
                                            width: "100%",
                                            padding: "10px 14px",
                                            borderRadius: "8px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13.5px",
                                            outline: "none"
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                                    Status Periode
                                </label>
                                <select 
                                    value={editPeriodeForm.status} 
                                    onChange={(e) => setEditPeriodeForm({...editPeriodeForm, status: e.target.value})}
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "14px",
                                        outline: "none",
                                        background: "#fff"
                                    }}
                                >
                                    <option value="Aktif">Aktif (Sedang Berjalan)</option>
                                    <option value="Selesai">Selesai</option>
                                </select>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                                <button
                                    type="button"
                                    onClick={() => setIsEditPeriodeModalOpen(false)}
                                    style={{
                                        padding: "10px 18px",
                                        borderRadius: "10px",
                                        border: "1px solid #e2e8f0",
                                        background: "#f8fafc",
                                        color: "#475569",
                                        fontWeight: "600",
                                        fontSize: "13.5px",
                                        cursor: "pointer"
                                    }}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: "10px 22px",
                                        borderRadius: "10px",
                                        border: "none",
                                        background: "#7c3aed",
                                        color: "#ffffff",
                                        fontWeight: "700",
                                        fontSize: "13.5px",
                                        cursor: "pointer",
                                        boxShadow: "0 4px 10px rgba(124, 58, 237, 0.25)"
                                    }}
                                >
                                    Simpan Perubahan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Periode;
