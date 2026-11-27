import { useCallback, useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import {
    BookOpen,
    Calendar,
    Camera,
    CheckCircle2,
    Clock,
    Download,
    Edit3,
    FileText,
    MessageSquare,
    Plus,
    RefreshCw,
    RotateCcw,
    Search,
    Trash2,
    Users,
    Video,
    X,
    XCircle,
    AlertCircle,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { applyKopToPdfPage, KOP_BOTTOM_SAFE_MARGIN, KOP_TOP_SAFE_Y, loadKopDataUrl } from "../utils/kopSurat";
import { API_BASE_URL } from "../config/api";
import { getStoredUser, normalizeRole } from "../utils/auth";
import { compressImageToTarget, formatFileSize } from "../utils/fileCompressor";

const KATEGORI_OPTIONS = [
    "Teknis",
    "Rapat / Diskusi",
    "Administrasi",
    "Dokumentasi",
    "Lainnya",
];

function getPhotoUrl(photo) {
    if (!photo) return null;
    if (/^https?:\/\//i.test(photo) || String(photo).startsWith("data:") || String(photo).startsWith("blob:")) {
        return photo;
    }
    const path = String(photo).replace(/^\/+/, "").replace(/^storage\//, "");
    return `${API_BASE_URL.replace(/\/api\/?$/, "")}/storage/${path}`;
}

function formatDateInfo(dateStr) {
    if (!dateStr) return { fullDate: "-", day: "-", shortDate: "-" };
    const clean = String(dateStr).slice(0, 10);
    const parsed = new Date(`${clean}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return { fullDate: clean, day: "-", shortDate: clean };
    }
    return {
        day: parsed.toLocaleDateString("id-ID", { weekday: "long" }),
        fullDate: parsed.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
        shortDate: parsed.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
    };
}

function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getStatusBadgeStyle(status) {
    if (status === "Disetujui") {
        return { bg: "#dcfce7", color: "#15803d", border: "#bbf7d0", dot: "#22c55e" };
    }
    if (status === "Perlu Revisi") {
        return { bg: "#fef3c7", color: "#b45309", border: "#fde68a", dot: "#f59e0b" };
    }
    return { bg: "#e0e7ff", color: "#4338ca", border: "#c7d2fe", dot: "#6366f1" };
}

function getSafeVideoUrl(value) {
    const raw = String(value || "").trim();
    return /^https?:\/\//i.test(raw) ? raw : "";
}

const emptyForm = {
    tanggal: getTodayStr(),
    jam_mulai: "08:00",
    jam_selesai: "17:00",
    kategori: "",
    judul_kegiatan: "",
    deskripsi_kegiatan: "",
    foto_kegiatan: null,
    video_kegiatan: null,
    link_video: "",
    remove_foto: false,
    remove_video: false,
};

export default function Logbook() {
    const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);
    const [currentUser] = useState(() => getStoredUser());
    const role = normalizeRole(currentUser?.role || "pemagang");
    const isStaff = role === "admin" || role === "pembimbing";

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [clock, setClock] = useState(() => new Date());

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
    const [categoryFilter, setCategoryFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [selectedParticipant, setSelectedParticipant] = useState("all");

    // Modal Create / Edit (Peserta)
    const [formOpen, setFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [photoPreview, setPhotoPreview] = useState("");
    const [photoInfo, setPhotoInfo] = useState("");
    const [videoPreview, setVideoPreview] = useState("");
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    // Modal Verifikasi (Pembimbing / Admin)
    const [verifyTarget, setVerifyTarget] = useState(null);
    const [verifyStatus, setVerifyStatus] = useState("Disetujui");
    const [verifyNote, setVerifyNote] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState("");

    // Modal Preview Foto & Video
    const [previewImage, setPreviewImage] = useState(null);
    const [previewVideo, setPreviewVideo] = useState(null);

    const loadLogbooks = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await api.get("/logbook");
            const data = response.data?.data ?? response.data ?? [];
            setItems(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.response?.data?.message || "Data logbook harian gagal dimuat.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadLogbooks();
        const timer = setInterval(() => setClock(new Date()), 1000);
        return () => clearInterval(timer);
    }, [loadLogbooks]);

    const participantsList = useMemo(() => {
        const map = new Map();
        items.forEach((item) => {
            if (!item.user_id) return;
            if (!map.has(item.user_id)) {
                map.set(item.user_id, {
                    id: String(item.user_id),
                    name: item.nama_peserta || item.user?.name || `Peserta #${item.user_id}`,
                    nim: item.nim_peserta || item.user?.nim || "",
                });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [items]);

    const scopedByMonthAndParticipant = useMemo(() => {
        return items.filter((item) => {
            if (selectedMonth && String(item.tanggal || "").slice(0, 7) !== selectedMonth) {
                return false;
            }
            if (isStaff && selectedParticipant !== "all" && String(item.user_id) !== String(selectedParticipant)) {
                return false;
            }
            return true;
        });
    }, [items, selectedMonth, isStaff, selectedParticipant]);

    const stats = useMemo(() => {
        const total = scopedByMonthAndParticipant.length;
        let approved = 0;
        let pending = 0;
        let revision = 0;
        scopedByMonthAndParticipant.forEach((item) => {
            if (item.status === "Disetujui") approved += 1;
            else if (item.status === "Perlu Revisi") revision += 1;
            else pending += 1;
        });
        return { total, approved, pending, revision };
    }, [scopedByMonthAndParticipant]);

    const availableCategories = useMemo(() => {
        const set = new Set(KATEGORI_OPTIONS);
        items.forEach((item) => {
            const cat = String(item.kategori || "").trim();
            if (cat) set.add(cat);
        });
        return Array.from(set);
    }, [items]);

    const filteredItems = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return scopedByMonthAndParticipant.filter((item) => {
            if (categoryFilter && item.kategori !== categoryFilter) return false;
            if (statusFilter && item.status !== statusFilter) return false;
            if (!q) return true;
            const dateInfo = formatDateInfo(item.tanggal);
            return [
                item.judul_kegiatan,
                item.deskripsi_kegiatan,
                item.kategori,
                item.status,
                item.catatan_pembimbing,
                item.nama_peserta,
                dateInfo.day,
                dateInfo.fullDate,
            ].some((val) => String(val || "").toLowerCase().includes(q));
        });
    }, [scopedByMonthAndParticipant, categoryFilter, statusFilter, searchQuery]);

    const openCreateModal = () => {
        setEditingItem(null);
        setForm({ ...emptyForm, tanggal: getTodayStr() });
        setPhotoPreview("");
        setPhotoInfo("");
        setVideoPreview("");
        setFormError("");
        setFormOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setForm({
            tanggal: String(item.tanggal || getTodayStr()).slice(0, 10),
            jam_mulai: item.jam_mulai || "08:00",
            jam_selesai: item.jam_selesai || "17:00",
            kategori: item.kategori || "Teknis",
            judul_kegiatan: item.judul_kegiatan || "",
            deskripsi_kegiatan: item.deskripsi_kegiatan || "",
            foto_kegiatan: null,
            video_kegiatan: null,
            link_video: item.link_video || "",
            remove_foto: false,
            remove_video: false,
        });
        setPhotoPreview(item.foto_url ? getPhotoUrl(item.foto_url) : "");
        setPhotoInfo("");
        setVideoPreview(item.video_url ? getPhotoUrl(item.video_url) : "");
        setFormError("");
        setFormOpen(true);
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setFormError("File dokumentasi harus berupa gambar (JPG, PNG, WEBP).");
            return;
        }
        setFormError("");
        try {
            const result = await compressImageToTarget(file, {
                targetSizeKb: 250,
                maxWidth: 1440,
                maxHeight: 1440,
            });
            const compressedFile = result.file || file;
            setForm((prev) => ({ ...prev, foto_kegiatan: compressedFile, remove_foto: false }));
            setPhotoPreview(URL.createObjectURL(compressedFile));
            setPhotoInfo(`Dikompresi: ${formatFileSize(file.size)} → ${formatFileSize(compressedFile.size)}`);
        } catch {
            setForm((prev) => ({ ...prev, foto_kegiatan: file, remove_foto: false }));
            setPhotoPreview(URL.createObjectURL(file));
            setPhotoInfo(`Ukuran: ${formatFileSize(file.size)}`);
        }
    };

    const handleVideoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("video/")) {
            setFormError("File video kegiatan harus berupa video (MP4, WEBM, MOV, AVI).");
            return;
        }
        if (file.size > 15 * 1024 * 1024) {
            setFormError("Ukuran file video maksimal 15 MB. Untuk video panjang, gunakan Link URL Video.");
            return;
        }
        setFormError("");
        setForm((prev) => ({ ...prev, video_kegiatan: file, remove_video: false }));
        setVideoPreview(URL.createObjectURL(file));
    };

    const handleSaveForm = async (e) => {
        e.preventDefault();
        setSaving(true);
        setFormError("");
        setNotice("");

        try {
            const payload = new FormData();
            payload.append("tanggal", form.tanggal);
            if (form.jam_mulai) payload.append("jam_mulai", form.jam_mulai);
            if (form.jam_selesai) payload.append("jam_selesai", form.jam_selesai);
            payload.append("kategori", String(form.kategori || "").trim() || "Teknis");
            payload.append("judul_kegiatan", form.judul_kegiatan.trim());
            payload.append("deskripsi_kegiatan", form.deskripsi_kegiatan.trim());
            const trimmedVideo = String(form.link_video || "").trim();
            if (trimmedVideo || editingItem) {
                payload.append("link_video", trimmedVideo);
            }
            if (form.foto_kegiatan instanceof File) {
                payload.append("foto_kegiatan", form.foto_kegiatan);
            }
            if (form.remove_foto) {
                payload.append("remove_foto", "1");
            }
            if (form.video_kegiatan instanceof File) {
                payload.append("video_kegiatan", form.video_kegiatan);
            }
            if (form.remove_video) {
                payload.append("remove_video", "1");
            }

            if (editingItem) {
                await api.post(`/logbook/${editingItem.id}`, payload, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                setNotice("Catatan logbook harian berhasil diperbarui.");
            } else {
                await api.post("/logbook", payload, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                setNotice("Catatan logbook harian berhasil ditambahkan.");
            }

            setFormOpen(false);
            await loadLogbooks();
        } catch (err) {
            const validationErrors = err.response?.data?.errors;
            const msg = validationErrors
                ? Object.values(validationErrors).flat().join(" ")
                : err.response?.data?.message || "Gagal menyimpan logbook harian.";
            setFormError(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`Hapus catatan logbook "${item.judul_kegiatan}"?`)) return;
        setError("");
        setNotice("");
        try {
            await api.delete(`/logbook/${item.id}`);
            setNotice("Catatan logbook berhasil dihapus.");
            await loadLogbooks();
        } catch (err) {
            setError(err.response?.data?.message || "Gagal menghapus catatan logbook.");
        }
    };

    const openVerifyModal = (item, presetStatus = null) => {
        setVerifyTarget(item);
        setVerifyStatus(presetStatus || (item.status === "Menunggu Verifikasi" ? "Disetujui" : item.status));
        setVerifyNote(item.catatan_pembimbing || "");
        setVerifyError("");
    };

    const handleSubmitVerify = async (e) => {
        e.preventDefault();
        if (!verifyTarget) return;
        if (verifyStatus === "Perlu Revisi" && !verifyNote.trim()) {
            setVerifyError("Mohon isi catatan perbaikan untuk peserta.");
            return;
        }
        setVerifying(true);
        setVerifyError("");
        setNotice("");

        try {
            await api.post(`/logbook/${verifyTarget.id}/verifikasi`, {
                status: verifyStatus,
                catatan_pembimbing: verifyNote.trim() || null,
            });
            setVerifyTarget(null);
            setNotice(`Logbook "${verifyTarget.judul_kegiatan}" diperbarui menjadi ${verifyStatus}.`);
            await loadLogbooks();
        } catch (err) {
            setVerifyError(err.response?.data?.message || "Gagal menyimpan verifikasi logbook.");
        } finally {
            setVerifying(false);
        }
    };

    const exportLogbookPdf = async () => {
        const kopDataUrl = await loadKopDataUrl();
        const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const usableWidth = pageWidth - margin * 2;

        applyKopToPdfPage(doc, kopDataUrl);

        const participantLabel = isStaff && selectedParticipant !== "all"
            ? participantsList.find((p) => p.id === selectedParticipant)?.name || "Peserta"
            : isStaff
                ? "Semua Peserta Magang"
                : currentUser?.name || currentUser?.nama || "Peserta Magang";

        const monthLabel = selectedMonth
            ? new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" })
            : "Semua Periode";

        doc.setFont("helvetica", "bold");
        doc.setFontSize(13.5);
        doc.text("REKAP LOGBOOK KEGIATAN HARIAN MAGANG", pageWidth / 2, KOP_TOP_SAFE_Y + 3, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Nama / Cakupan : ${participantLabel}`, margin, KOP_TOP_SAFE_Y + 12);
        doc.text(`Periode Bulan   : ${monthLabel}`, margin, KOP_TOP_SAFE_Y + 18);
        doc.text(`Total Catatan   : ${filteredItems.length} Kegiatan`, margin, KOP_TOP_SAFE_Y + 24);

        let y = KOP_TOP_SAFE_Y + 31;
        const cols = isStaff && selectedParticipant === "all"
            ? [
                { title: "No", width: 10 },
                { title: "Tanggal", width: 26 },
                { title: "Peserta", width: 30 },
                { title: "Kegiatan Harian", width: 84 },
                { title: "Status", width: 30 },
            ]
            : [
                { title: "No", width: 10 },
                { title: "Tanggal & Jam", width: 32 },
                { title: "Kategori", width: 24 },
                { title: "Judul & Uraian Kegiatan", width: 84 },
                { title: "Status", width: 30 },
            ];

        const drawHeader = () => {
            doc.setFillColor(238, 242, 255);
            doc.rect(margin, y, usableWidth, 9, "F");
            doc.setDrawColor(203, 213, 225);
            doc.rect(margin, y, usableWidth, 9);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            let x = margin;
            cols.forEach((c) => {
                doc.text(c.title, x + 2, y + 6);
                x += c.width;
            });
            y += 9;
        };

        drawHeader();

        const rows = [...filteredItems].sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)));
        rows.forEach((row, index) => {
            const dateStr = formatDateInfo(row.tanggal).shortDate;
            const timeStr = row.jam_mulai || row.jam_selesai ? `${row.jam_mulai || "--"} - ${row.jam_selesai || "--"}` : "-";
            const activityText = `${row.judul_kegiatan || "-"}\n${row.deskripsi_kegiatan || ""}`;

            const cellValues = isStaff && selectedParticipant === "all"
                ? [
                    String(index + 1),
                    `${dateStr}\n${timeStr}`,
                    row.nama_peserta || "-",
                    activityText,
                    row.status || "Menunggu Verifikasi",
                ]
                : [
                    String(index + 1),
                    `${dateStr}\n${timeStr}`,
                    row.kategori || "Teknis",
                    activityText,
                    row.status || "Menunggu Verifikasi",
                ];

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            const wrapped = cellValues.map((val, i) => doc.splitTextToSize(String(val), cols[i].width - 4));
            const maxLines = Math.max(...wrapped.map((w) => w.length), 1);
            const rowHeight = maxLines * 4.2 + 4;

            if (y + rowHeight > pageHeight - KOP_BOTTOM_SAFE_MARGIN) {
                doc.addPage();
                applyKopToPdfPage(doc, kopDataUrl);
                y = KOP_TOP_SAFE_Y + 2;
                drawHeader();
            }

            doc.setDrawColor(226, 232, 240);
            let x = margin;
            wrapped.forEach((lines, i) => {
                doc.rect(x, y, cols[i].width, rowHeight);
                doc.text(lines, x + 2, y + 5);
                x += cols[i].width;
            });
            y += rowHeight;
        });

        const safeName = participantLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        doc.save(`logbook-harian-${safeName}-${selectedMonth || "semua"}.pdf`);
    };

    const dateLabel = clock.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    const isFiltered = Boolean(
        searchQuery || categoryFilter || statusFilter || selectedMonth !== currentMonthStr || (isStaff && selectedParticipant !== "all")
    );

    return (
        <div className={`layout ${!isStaff ? "participant-panel" : ""}`} style={{ background: "#f8fafc", minHeight: "100vh" }}>
            <Sidebar />
            <div className="content">
                <Navbar />
                <main className="main participant-page-container">
                    {/* Header */}
                    <div className="page-heading">
                        <div>
                            <div className="eyebrow">
                                <span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: "#6366f1", marginRight: "6px" }}></span>
                                {isStaff ? "MONITORING KEGIATAN MAGANG" : "CATATAN KEGIATAN HARIAN"}
                            </div>
                            <h1>Logbook Harian</h1>
                            <p className="subtitle">
                                {isStaff
                                    ? "Pantau logbook kegiatan harian peserta magang, berikan catatan, dan lakukan verifikasi."
                                    : "Catat kegiatan kerja magang Anda setiap hari beserta dokumentasi untuk diverifikasi pembimbing."}
                            </p>
                        </div>
                        <div className="live-clock">
                            <strong>{clock.toLocaleTimeString("id-ID")}</strong>
                            <span>{dateLabel}</span>
                        </div>
                    </div>

                    {/* Stat Cards */}
                    <div className="attendance-stat-grid" style={{ marginBottom: "24px", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
                        <div
                            className={`attendance-stat-card stat-hadir ${statusFilter === "" ? "active" : ""}`}
                            onClick={() => setStatusFilter("")}
                            style={{ background: "#ffffff", borderColor: statusFilter === "" ? "#6366f1" : "#e2e8f0" }}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span className="stat-label" style={{ color: "#4f46e5" }}>Total Logbook</span>
                                <BookOpen size={16} color="#4f46e5" />
                            </div>
                            <span className="stat-value" style={{ color: "#0f172a" }}>{stats.total} Catatan</span>
                            <small style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                                {selectedMonth ? `Bulan ${selectedMonth}` : "Semua periode"}
                            </small>
                        </div>

                        <div
                            className={`attendance-stat-card stat-hadir ${statusFilter === "Disetujui" ? "active" : ""}`}
                            onClick={() => setStatusFilter(statusFilter === "Disetujui" ? "" : "Disetujui")}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span className="stat-label">Disetujui</span>
                                <CheckCircle2 size={16} color="#15803d" />
                            </div>
                            <span className="stat-value">{stats.approved} Catatan</span>
                            <small style={{ fontSize: "11px", color: "#166534", marginTop: "2px" }}>
                                Terverifikasi pembimbing
                            </small>
                        </div>

                        <div
                            className={`attendance-stat-card stat-izin ${statusFilter === "Menunggu Verifikasi" ? "active" : ""}`}
                            onClick={() => setStatusFilter(statusFilter === "Menunggu Verifikasi" ? "" : "Menunggu Verifikasi")}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span className="stat-label">Menunggu Verifikasi</span>
                                <Clock size={16} color="#4338ca" />
                            </div>
                            <span className="stat-value">{stats.pending} Catatan</span>
                            <small style={{ fontSize: "11px", color: "#3730a3", marginTop: "2px" }}>
                                Belum diperiksa pembimbing
                            </small>
                        </div>

                        <div
                            className={`attendance-stat-card stat-sakit ${statusFilter === "Perlu Revisi" ? "active" : ""}`}
                            onClick={() => setStatusFilter(statusFilter === "Perlu Revisi" ? "" : "Perlu Revisi")}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span className="stat-label">Perlu Revisi</span>
                                <AlertCircle size={16} color="#b45309" />
                            </div>
                            <span className="stat-value">{stats.revision} Catatan</span>
                            <small style={{ fontSize: "11px", color: "#92400e", marginTop: "2px" }}>
                                Butuh perbaikan rincian
                            </small>
                        </div>
                    </div>

                    {/* Flash Messages */}
                    {notice && (
                        <div className="message" role="status" style={{ marginBottom: "16px" }}>
                            {notice}
                        </div>
                    )}
                    {error && (
                        <div className="message error" role="alert" style={{ marginBottom: "16px" }}>
                            {error}
                        </div>
                    )}

                    {/* Filter Toolbar */}
                    <div
                        className="filter-card"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            flexWrap: "wrap",
                            padding: "14px 18px",
                            background: "#ffffff",
                            borderRadius: "16px",
                            border: "1px solid #e2e8f0",
                            marginBottom: "20px",
                            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)",
                        }}
                    >
                        <div className="search-input-wrapper" style={{ flex: "1 1 240px", position: "relative", minWidth: "200px" }}>
                            <Search className="search-icon-inside" size={16} style={{ color: "#94a3b8" }} />
                            <input
                                type="text"
                                className="search-input"
                                placeholder={isStaff ? "Cari nama peserta, kegiatan, atau tanggal..." : "Cari judul kegiatan, deskripsi, atau catatan..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    style={{ position: "absolute", right: "12px", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
                                    title="Hapus pencarian"
                                >
                                    <X size={15} />
                                </button>
                            )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#ffffff", padding: "0 12px", height: "42px", borderRadius: "10px", border: "1px solid #cbd5e1" }}>
                            <Calendar size={15} color="#6366f1" />
                            <label htmlFor="logbook-month" style={{ fontSize: "12px", fontWeight: "700", color: "#475569", whiteSpace: "nowrap" }}>
                                BULAN:
                            </label>
                            <input
                                id="logbook-month"
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                style={{ border: "none", background: "transparent", fontSize: "13px", fontWeight: "600", color: "#0f172a", outline: "none", cursor: "pointer" }}
                            />
                            {selectedMonth && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedMonth("")}
                                    style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "12px", fontWeight: "700", padding: "2px 4px", lineHeight: 1 }}
                                    title="Tampilkan semua bulan"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <select
                            className="filter-select"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            style={{ height: "42px", minWidth: "150px" }}
                        >
                            <option value="">Semua Kategori</option>
                            {availableCategories.map((kat) => (
                                <option key={kat} value={kat}>{kat}</option>
                            ))}
                        </select>

                        <select
                            className="filter-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ height: "42px", minWidth: "170px" }}
                        >
                            <option value="">Semua Status</option>
                            <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                            <option value="Disetujui">Disetujui</option>
                            <option value="Perlu Revisi">Perlu Revisi</option>
                        </select>

                        {isStaff && (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "0 12px", height: "42px", borderRadius: "10px", border: "1px solid #cbd5e1" }}>
                                <Users size={15} color="#6366f1" />
                                <select
                                    value={selectedParticipant}
                                    onChange={(e) => setSelectedParticipant(e.target.value)}
                                    style={{ border: "none", background: "transparent", fontSize: "13px", fontWeight: "600", color: "#0f172a", outline: "none", cursor: "pointer", maxWidth: "180px" }}
                                >
                                    <option value="all">Semua Peserta ({participantsList.length})</option>
                                    {participantsList.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {isFiltered && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    setCategoryFilter("");
                                    setStatusFilter("");
                                    setSelectedMonth(currentMonthStr);
                                    setSelectedParticipant("all");
                                }}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    height: "42px",
                                    padding: "0 14px",
                                    borderRadius: "10px",
                                    background: "#f1f5f9",
                                    border: "1.5px solid #cbd5e1",
                                    color: "#475569",
                                    fontSize: "12.5px",
                                    fontWeight: "650",
                                    cursor: "pointer",
                                }}
                            >
                                <RotateCcw size={14} />
                                <span>Reset</span>
                            </button>
                        )}
                    </div>

                    {/* Main Logbook Table Card */}
                    <div className="table-card" style={{ background: "#ffffff", borderRadius: "18px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 16px rgba(15, 23, 42, 0.03)" }}>
                        <div className="table-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid #f1f5f9", background: "#ffffff", flexWrap: "wrap", gap: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{ width: 38, height: 38, borderRadius: "10px", background: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <FileText size={19} />
                                </div>
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <h3 style={{ margin: 0, fontSize: "15.5px", fontWeight: 800, color: "#0f172a" }}>
                                            {isStaff ? "Daftar Logbook Harian Peserta" : "Catatan Kegiatan Harian Saya"}
                                        </h3>
                                        <span style={{ fontSize: "11.5px", fontWeight: 700, padding: "2px 9px", borderRadius: "9999px", background: "#eef2ff", color: "#4f46e5" }}>
                                            {filteredItems.length} Catatan
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                                {!isStaff && (
                                    <button
                                        type="button"
                                        onClick={openCreateModal}
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "7px",
                                            padding: "9px 16px",
                                            borderRadius: "10px",
                                            background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                                            color: "#ffffff",
                                            border: "none",
                                            fontSize: "13px",
                                            fontWeight: "700",
                                            cursor: "pointer",
                                            boxShadow: "0 4px 12px rgba(79, 70, 229, 0.28)",
                                        }}
                                    >
                                        <Plus size={15} />
                                        <span>Catat Kegiatan</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={exportLogbookPdf}
                                    disabled={filteredItems.length === 0}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "8px 14px",
                                        borderRadius: "10px",
                                        background: filteredItems.length === 0 ? "#f1f5f9" : "#ffffff",
                                        border: "1.5px solid #cbd5e1",
                                        color: filteredItems.length === 0 ? "#94a3b8" : "#0f172a",
                                        fontSize: "12.5px",
                                        fontWeight: "650",
                                        cursor: filteredItems.length === 0 ? "not-allowed" : "pointer",
                                    }}
                                    title="Unduh rekap logbook harian dalam format PDF"
                                >
                                    <Download size={14} />
                                    <span>Unduh PDF</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={loadLogbooks}
                                    disabled={loading}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "8px 14px",
                                        borderRadius: "10px",
                                        background: "#f8fafc",
                                        border: "1.5px solid #e2e8f0",
                                        color: "#475569",
                                        fontSize: "12.5px",
                                        fontWeight: 650,
                                        cursor: loading ? "not-allowed" : "pointer",
                                    }}
                                >
                                    <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                                    <span>{loading ? "Memuat..." : "Segarkan"}</span>
                                </button>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table className="enterprise-table custom-table" style={{ width: "100%", minWidth: "820px" }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: "44px", textAlign: "center" }}>#</th>
                                        <th style={{ minWidth: "155px" }}>TANGGAL &amp; WAKTU</th>
                                        {isStaff && <th style={{ minWidth: "160px" }}>PESERTA</th>}
                                        <th style={{ minWidth: "280px" }}>KEGIATAN HARIAN</th>
                                        <th style={{ width: "160px" }}>STATUS VERIFIKASI</th>
                                        <th style={{ minWidth: "190px" }}>CATATAN PEMBIMBING</th>
                                        <th style={{ width: "160px", textAlign: "right" }}>AKSI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.length > 0 ? (
                                        filteredItems.map((item, idx) => {
                                            const dateInfo = formatDateInfo(item.tanggal);
                                            const badge = getStatusBadgeStyle(item.status);
                                            const canEditOrDeleteParticipant = !isStaff && item.status !== "Disetujui";

                                            return (
                                                <tr key={item.id}>
                                                    <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>{idx + 1}</td>
                                                    <td>
                                                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>{dateInfo.fullDate}</div>
                                                        <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                                                            {dateInfo.day} • {item.jam_mulai || "08:00"} – {item.jam_selesai || "17:00"} WIB
                                                        </div>
                                                    </td>
                                                    {isStaff && (
                                                        <td>
                                                            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>
                                                                {item.nama_peserta || item.user?.name || "Peserta Magang"}
                                                            </div>
                                                            <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                                                                {item.nim_peserta ? `NIM: ${item.nim_peserta}` : item.asal_instansi || "-"}
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                                                            <span
                                                                style={{
                                                                    fontSize: "11px",
                                                                    fontWeight: 700,
                                                                    padding: "2px 8px",
                                                                    borderRadius: "6px",
                                                                    background: "#f1f5f9",
                                                                    color: "#475569",
                                                                }}
                                                            >
                                                                {item.kategori || "Teknis"}
                                                            </span>
                                                            <strong style={{ fontSize: "13.5px", color: "#0f172a" }}>{item.judul_kegiatan}</strong>
                                                        </div>
                                                        <p style={{ margin: 0, fontSize: "12.5px", color: "#475569", lineHeight: 1.5, whiteSpace: "pre-line" }}>
                                                            {item.deskripsi_kegiatan}
                                                        </p>
                                                        {(item.foto_url || item.video_url || getSafeVideoUrl(item.link_video)) && (
                                                            <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                                                {item.foto_url && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setPreviewImage({
                                                                                url: getPhotoUrl(item.foto_url),
                                                                                title: item.judul_kegiatan,
                                                                                date: dateInfo.fullDate,
                                                                            })
                                                                        }
                                                                        style={{
                                                                            display: "inline-flex",
                                                                            alignItems: "center",
                                                                            gap: "5px",
                                                                            fontSize: "11.5px",
                                                                            fontWeight: 650,
                                                                            color: "#4f46e5",
                                                                            background: "#eef2ff",
                                                                            border: "1px solid #c7d2fe",
                                                                            borderRadius: "7px",
                                                                            padding: "4px 9px",
                                                                            cursor: "pointer",
                                                                        }}
                                                                    >
                                                                        <Camera size={12} />
                                                                        <span>Lihat Dokumentasi</span>
                                                                    </button>
                                                                )}
                                                                {item.video_url && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setPreviewVideo({
                                                                                url: getPhotoUrl(item.video_url),
                                                                                title: item.judul_kegiatan,
                                                                                date: dateInfo.fullDate,
                                                                            })
                                                                        }
                                                                        style={{
                                                                            display: "inline-flex",
                                                                            alignItems: "center",
                                                                            gap: "5px",
                                                                            fontSize: "11.5px",
                                                                            fontWeight: 650,
                                                                            color: "#7c3aed",
                                                                            background: "#f5f3ff",
                                                                            border: "1px solid #ddd6fe",
                                                                            borderRadius: "7px",
                                                                            padding: "4px 9px",
                                                                            cursor: "pointer",
                                                                        }}
                                                                    >
                                                                        <Video size={12} />
                                                                        <span>Putar Video</span>
                                                                    </button>
                                                                )}
                                                                {getSafeVideoUrl(item.link_video) && (
                                                                    <a
                                                                        href={getSafeVideoUrl(item.link_video)}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        style={{
                                                                            display: "inline-flex",
                                                                            alignItems: "center",
                                                                            gap: "5px",
                                                                            fontSize: "11.5px",
                                                                            fontWeight: 650,
                                                                            color: "#0369a1",
                                                                            background: "#f0f9ff",
                                                                            border: "1px solid #bae6fd",
                                                                            borderRadius: "7px",
                                                                            padding: "4px 9px",
                                                                            textDecoration: "none",
                                                                        }}
                                                                    >
                                                                        <Video size={12} />
                                                                        <span>Lihat Video</span>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span
                                                            style={{
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                gap: "6px",
                                                                padding: "5px 10px",
                                                                borderRadius: "9999px",
                                                                background: badge.bg,
                                                                color: badge.color,
                                                                border: `1px solid ${badge.border}`,
                                                                fontSize: "11.5px",
                                                                fontWeight: 700,
                                                            }}
                                                        >
                                                            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: badge.dot }}></span>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {item.catatan_pembimbing ? (
                                                            <div style={{ fontSize: "12px", color: "#334155", background: "#f8fafc", padding: "8px 10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                                                {item.catatan_pembimbing}
                                                                {item.nama_verifikator && (
                                                                    <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "4px" }}>
                                                                        — {item.nama_verifikator}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: "#94a3b8", fontSize: "12px" }}>-</span>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: "right" }}>
                                                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                                                            {canEditOrDeleteParticipant && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openEditModal(item)}
                                                                        style={{
                                                                            display: "inline-flex",
                                                                            alignItems: "center",
                                                                            gap: "4px",
                                                                            padding: "6px 10px",
                                                                            borderRadius: "7px",
                                                                            background: "#f8fafc",
                                                                            border: "1px solid #cbd5e1",
                                                                            color: "#334155",
                                                                            fontSize: "12px",
                                                                            fontWeight: 650,
                                                                            cursor: "pointer",
                                                                        }}
                                                                    >
                                                                        <Edit3 size={12} />
                                                                        <span>Ubah</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDelete(item)}
                                                                        style={{
                                                                            display: "inline-flex",
                                                                            alignItems: "center",
                                                                            gap: "4px",
                                                                            padding: "6px 10px",
                                                                            borderRadius: "7px",
                                                                            background: "#fef2f2",
                                                                            border: "1px solid #fecaca",
                                                                            color: "#dc2626",
                                                                            fontSize: "12px",
                                                                            fontWeight: 650,
                                                                            cursor: "pointer",
                                                                        }}
                                                                    >
                                                                        <Trash2 size={12} />
                                                                        <span>Hapus</span>
                                                                    </button>
                                                                </>
                                                            )}

                                                            {!isStaff && item.status === "Disetujui" && (
                                                                <span style={{ fontSize: "11.5px", color: "#16a34a", fontWeight: 650 }}>Terkunci ✓</span>
                                                            )}

                                                            {isStaff && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openVerifyModal(item)}
                                                                        style={{
                                                                            display: "inline-flex",
                                                                            alignItems: "center",
                                                                            gap: "5px",
                                                                            padding: "6px 11px",
                                                                            borderRadius: "7px",
                                                                            background: "#eef2ff",
                                                                            border: "1px solid #c7d2fe",
                                                                            color: "#4338ca",
                                                                            fontSize: "12px",
                                                                            fontWeight: 700,
                                                                            cursor: "pointer",
                                                                        }}
                                                                    >
                                                                        <MessageSquare size={12} />
                                                                        <span>Verifikasi</span>
                                                                    </button>
                                                                    {role === "admin" && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDelete(item)}
                                                                            style={{
                                                                                display: "inline-flex",
                                                                                alignItems: "center",
                                                                                padding: "6px 8px",
                                                                                borderRadius: "7px",
                                                                                background: "#fef2f2",
                                                                                border: "1px solid #fecaca",
                                                                                color: "#dc2626",
                                                                                cursor: "pointer",
                                                                            }}
                                                                            title="Hapus logbook"
                                                                        >
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={isStaff ? 7 : 6} style={{ padding: 0 }}>
                                                <div className="empty-state-modern">
                                                    <div className="empty-state-icon-circle">
                                                        <BookOpen size={26} color="#6366f1" />
                                                    </div>
                                                    <h4>Belum Ada Catatan Logbook Harian</h4>
                                                    <p style={{ maxWidth: "430px", margin: "0 auto 16px" }}>
                                                        {isFiltered
                                                            ? "Tidak ada catatan kegiatan harian yang sesuai dengan filter yang dipilih."
                                                            : isStaff
                                                                ? "Peserta magang belum mengirimkan catatan kegiatan harian."
                                                                : "Mulai catat aktivitas dan pekerjaan harian Anda selama magang agar dapat dipantau pembimbing."}
                                                    </p>
                                                    {!isStaff && !isFiltered && (
                                                        <button
                                                            type="button"
                                                            onClick={openCreateModal}
                                                            className="action-btn"
                                                            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                                                        >
                                                            <Plus size={14} />
                                                            <span>Catat Kegiatan Pertama</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Modal Tambah / Ubah Logbook (Peserta) */}
                    {formOpen && (
                        <div
                            className="modal-overlay"
                            onClick={() => setFormOpen(false)}
                            style={{
                                position: "fixed",
                                inset: 0,
                                background: "rgba(15, 23, 42, 0.6)",
                                backdropFilter: "blur(4px)",
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "center",
                                overflowY: "auto",
                                padding: "24px 16px",
                                zIndex: 9999,
                            }}
                        >
                            <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    width: "100%",
                                    maxWidth: "560px",
                                    maxHeight: "calc(100vh - 48px)",
                                    margin: "auto",
                                    overflowY: "auto",
                                    background: "#ffffff",
                                    borderRadius: "20px",
                                    padding: "24px",
                                    boxShadow: "0 24px 48px rgba(15, 23, 42, 0.22)",
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>
                                            {editingItem ? "Perbarui Logbook Harian" : "Catat Kegiatan Harian"}
                                        </h3>
                                        <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#64748b" }}>
                                            Tuliskan aktivitas magang secara jelas dan terstruktur.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormOpen(false)}
                                        style={{ background: "#f1f5f9", border: "none", borderRadius: "8px", padding: "6px", cursor: "pointer", color: "#475569" }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {formError && (
                                    <div className="message error" role="alert" style={{ marginBottom: "14px" }}>
                                        {formError}
                                    </div>
                                )}

                                <form onSubmit={handleSaveForm} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                                        <div>
                                            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                                                Tanggal
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                value={form.tanggal}
                                                onChange={(e) => setForm((p) => ({ ...p, tanggal: e.target.value }))}
                                                style={{ width: "100%", padding: "9px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                                                Jam Mulai
                                            </label>
                                            <input
                                                type="time"
                                                value={form.jam_mulai}
                                                onChange={(e) => setForm((p) => ({ ...p, jam_mulai: e.target.value }))}
                                                style={{ width: "100%", padding: "9px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                                                Jam Selesai
                                            </label>
                                            <input
                                                type="time"
                                                value={form.jam_selesai}
                                                onChange={(e) => setForm((p) => ({ ...p, jam_selesai: e.target.value }))}
                                                style={{ width: "100%", padding: "9px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                                            Kategori Kegiatan
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            maxLength={50}
                                            placeholder="Contoh: Teknis, Rapat, Administrasi, Desain UI, dll."
                                            value={form.kategori}
                                            onChange={(e) => setForm((p) => ({ ...p, kategori: e.target.value }))}
                                            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13.5px", boxSizing: "border-box", background: "#ffffff" }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                                            Judul / Ringkasan Kegiatan
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Contoh: Pembuatan API modul laporan & uji coba endpoint"
                                            value={form.judul_kegiatan}
                                            onChange={(e) => setForm((p) => ({ ...p, judul_kegiatan: e.target.value }))}
                                            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13.5px", boxSizing: "border-box" }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                                            Deskripsi Detail Kegiatan
                                        </label>
                                        <textarea
                                            required
                                            rows={4}
                                            placeholder="Jelaskan langkah kerja, hasil yang dicapai, atau kendala yang ditemui hari ini..."
                                            value={form.deskripsi_kegiatan}
                                            onChange={(e) => setForm((p) => ({ ...p, deskripsi_kegiatan: e.target.value }))}
                                            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13.5px", boxSizing: "border-box", resize: "vertical" }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                                            Upload Video Kegiatan (Opsional)
                                        </label>
                                        <input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/*" onChange={handleVideoChange} style={{ fontSize: "12.5px" }} />
                                        <small style={{ display: "block", marginTop: "4px", fontSize: "11.5px", color: "#64748b" }}>
                                            Format: MP4, WEBM, MOV, atau AVI (maksimal 15 MB). Untuk video panjang, gunakan Link URL Video di bawah.
                                        </small>
                                        {videoPreview && (
                                            <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                                                <video
                                                    src={videoPreview}
                                                    controls
                                                    style={{ width: "140px", height: "84px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#0f172a" }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setVideoPreview("");
                                                        setForm((p) => ({ ...p, video_kegiatan: null, remove_video: true }));
                                                    }}
                                                    style={{ fontSize: "12px", color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                                                >
                                                    Hapus Video
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                                            Link URL Video Kegiatan (Opsional)
                                        </label>
                                        <input
                                            type="url"
                                            placeholder="https://www.youtube.com/watch?v=... atau tautan Google Drive"
                                            value={form.link_video}
                                            onChange={(e) => setForm((p) => ({ ...p, link_video: e.target.value }))}
                                            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13.5px", boxSizing: "border-box" }}
                                        />
                                        <small style={{ display: "block", marginTop: "4px", fontSize: "11.5px", color: "#64748b" }}>
                                            Opsional: tempelkan link URL video kegiatan (YouTube, Google Drive, atau tautan video lainnya).
                                        </small>
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                                            Foto Dokumentasi (Opsional)
                                        </label>
                                        <input type="file" accept="image/*" onChange={handleFileChange} style={{ fontSize: "12.5px" }} />
                                        <small style={{ display: "block", marginTop: "4px", fontSize: "11.5px", color: "#64748b" }}>
                                            {photoInfo || "Foto otomatis dikompresi ke ±250 KB sebelum diunggah agar tetap tajam dan hemat ruang."}
                                        </small>
                                        {photoPreview && (
                                            <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                                                <img
                                                    src={photoPreview}
                                                    alt="Preview dokumentasi"
                                                    style={{ width: "78px", height: "58px", objectFit: "cover", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setPhotoPreview("");
                                                        setPhotoInfo("");
                                                        setForm((p) => ({ ...p, foto_kegiatan: null, remove_foto: true }));
                                                    }}
                                                    style={{ fontSize: "12px", color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                                                >
                                                    Hapus Foto
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
                                        <button
                                            type="button"
                                            onClick={() => setFormOpen(false)}
                                            style={{ padding: "9px 16px", borderRadius: "9px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#475569", fontWeight: 650, cursor: "pointer" }}
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            style={{ padding: "9px 18px", borderRadius: "9px", border: "none", background: "#4f46e5", color: "#ffffff", fontWeight: 700, cursor: saving ? "wait" : "pointer" }}
                                        >
                                            {saving ? "Menyimpan..." : editingItem ? "Simpan Perubahan" : "Simpan Logbook"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Modal Verifikasi Pembimbing / Admin */}
                    {verifyTarget && (
                        <div
                            className="modal-overlay"
                            onClick={() => setVerifyTarget(null)}
                            style={{
                                position: "fixed",
                                inset: 0,
                                background: "rgba(15, 23, 42, 0.6)",
                                backdropFilter: "blur(4px)",
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "center",
                                overflowY: "auto",
                                padding: "24px 16px",
                                zIndex: 9999,
                            }}
                        >
                            <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    width: "100%",
                                    maxWidth: "500px",
                                    maxHeight: "calc(100vh - 48px)",
                                    margin: "auto",
                                    overflowY: "auto",
                                    background: "#ffffff",
                                    borderRadius: "20px",
                                    padding: "24px",
                                    boxShadow: "0 24px 48px rgba(15, 23, 42, 0.22)",
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                                    <h3 style={{ margin: 0, fontSize: "16.5px", fontWeight: 800, color: "#0f172a" }}>
                                        Verifikasi Logbook Harian
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setVerifyTarget(null)}
                                        style={{ background: "#f1f5f9", border: "none", borderRadius: "8px", padding: "6px", cursor: "pointer", color: "#475569" }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px", marginBottom: "14px", fontSize: "12.5px" }}>
                                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{verifyTarget.judul_kegiatan}</div>
                                    <div style={{ color: "#64748b", marginTop: "2px" }}>
                                        {verifyTarget.nama_peserta || "Peserta"} • {formatDateInfo(verifyTarget.tanggal).fullDate}
                                    </div>
                                    <p style={{ margin: "6px 0 0", color: "#334155", lineHeight: 1.45 }}>{verifyTarget.deskripsi_kegiatan}</p>
                                    {verifyTarget.video_url && (
                                        <div style={{ marginTop: "8px" }}>
                                            <video
                                                src={getPhotoUrl(verifyTarget.video_url)}
                                                controls
                                                style={{ width: "100%", maxHeight: "200px", borderRadius: "8px", background: "#0f172a" }}
                                            />
                                        </div>
                                    )}
                                    {getSafeVideoUrl(verifyTarget.link_video) && (
                                        <a
                                            href={getSafeVideoUrl(verifyTarget.link_video)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                marginTop: "8px",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "5px",
                                                fontSize: "12px",
                                                fontWeight: 650,
                                                color: "#0369a1",
                                                textDecoration: "none",
                                            }}
                                        >
                                            <Video size={13} />
                                            <span>Buka Link Video Kegiatan</span>
                                        </a>
                                    )}
                                </div>

                                {verifyError && (
                                    <div className="message error" role="alert" style={{ marginBottom: "12px" }}>
                                        {verifyError}
                                    </div>
                                )}

                                <form onSubmit={handleSubmitVerify} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                                            Keputusan Verifikasi
                                        </label>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                            <button
                                                type="button"
                                                onClick={() => setVerifyStatus("Disetujui")}
                                                style={{
                                                    padding: "10px",
                                                    borderRadius: "8px",
                                                    border: verifyStatus === "Disetujui" ? "2px solid #16a34a" : "1px solid #cbd5e1",
                                                    background: verifyStatus === "Disetujui" ? "#dcfce7" : "#ffffff",
                                                    color: verifyStatus === "Disetujui" ? "#15803d" : "#475569",
                                                    fontWeight: 700,
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: "6px",
                                                }}
                                            >
                                                <CheckCircle2 size={15} />
                                                <span>Setujui</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setVerifyStatus("Perlu Revisi")}
                                                style={{
                                                    padding: "10px",
                                                    borderRadius: "8px",
                                                    border: verifyStatus === "Perlu Revisi" ? "2px solid #d97706" : "1px solid #cbd5e1",
                                                    background: verifyStatus === "Perlu Revisi" ? "#fef3c7" : "#ffffff",
                                                    color: verifyStatus === "Perlu Revisi" ? "#b45309" : "#475569",
                                                    fontWeight: 700,
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: "6px",
                                                }}
                                            >
                                                <XCircle size={15} />
                                                <span>Perlu Revisi</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                                            Catatan Pembimbing {verifyStatus === "Perlu Revisi" ? "(Wajib)" : "(Opsional)"}
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={verifyNote}
                                            onChange={(e) => setVerifyNote(e.target.value)}
                                            placeholder="Berikan apresiasi atau catatan perbaikan rincian kegiatan..."
                                            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                                        />
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                                        <button
                                            type="button"
                                            onClick={() => setVerifyTarget(null)}
                                            style={{ padding: "9px 16px", borderRadius: "9px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#475569", fontWeight: 650, cursor: "pointer" }}
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={verifying}
                                            style={{ padding: "9px 18px", borderRadius: "9px", border: "none", background: "#4f46e5", color: "#ffffff", fontWeight: 700, cursor: verifying ? "wait" : "pointer" }}
                                        >
                                            {verifying ? "Menyimpan..." : "Simpan Verifikasi"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Modal Preview Foto Dokumentasi */}
                    {previewImage && (
                        <div
                            className="modal-overlay"
                            onClick={() => setPreviewImage(null)}
                            style={{
                                position: "fixed",
                                inset: 0,
                                background: "rgba(15, 23, 42, 0.78)",
                                backdropFilter: "blur(5px)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "20px",
                                zIndex: 10000,
                            }}
                        >
                            <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    maxWidth: "700px",
                                    width: "100%",
                                    background: "#ffffff",
                                    borderRadius: "18px",
                                    overflow: "hidden",
                                    boxShadow: "0 25px 50px rgba(0,0,0,0.35)",
                                }}
                            >
                                <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <strong style={{ fontSize: "14px", color: "#0f172a" }}>{previewImage.title}</strong>
                                        <div style={{ fontSize: "11.5px", color: "#64748b" }}>{previewImage.date}</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewImage(null)}
                                        style={{ background: "#f1f5f9", border: "none", borderRadius: "8px", padding: "6px", cursor: "pointer" }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                                <div style={{ padding: "16px", background: "#0f172a", display: "flex", justifyContent: "center" }}>
                                    <img
                                        src={previewImage.url}
                                        alt={previewImage.title}
                                        style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: "8px", objectFit: "contain" }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modal Preview Video Kegiatan */}
                    {previewVideo && (
                        <div
                            className="modal-overlay"
                            onClick={() => setPreviewVideo(null)}
                            style={{
                                position: "fixed",
                                inset: 0,
                                background: "rgba(15, 23, 42, 0.78)",
                                backdropFilter: "blur(5px)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "20px",
                                zIndex: 10000,
                            }}
                        >
                            <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    maxWidth: "760px",
                                    width: "100%",
                                    background: "#ffffff",
                                    borderRadius: "18px",
                                    overflow: "hidden",
                                    boxShadow: "0 25px 50px rgba(0,0,0,0.35)",
                                }}
                            >
                                <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <strong style={{ fontSize: "14px", color: "#0f172a" }}>{previewVideo.title}</strong>
                                        <div style={{ fontSize: "11.5px", color: "#64748b" }}>{previewVideo.date}</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewVideo(null)}
                                        style={{ background: "#f1f5f9", border: "none", borderRadius: "8px", padding: "6px", cursor: "pointer" }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                                <div style={{ padding: "16px", background: "#0f172a", display: "flex", justifyContent: "center" }}>
                                    <video
                                        src={previewVideo.url}
                                        controls
                                        autoPlay
                                        style={{ width: "100%", maxHeight: "70vh", borderRadius: "8px", background: "#000000" }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

