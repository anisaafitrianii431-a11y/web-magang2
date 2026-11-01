import { useCallback, useEffect, useRef, useState } from "react";
import {
    ArrowUpRight,
    Building2,
    CalendarDays,
    Eye,
    ImagePlus,
    MapPin,
    MessageSquareText,
    Pencil,
    Plus,
    Save,
    Trash2,
    Users,
    X,
} from "lucide-react";
import api from "../../services/api";
import "./LandingPageManagement.css";

const getErrorMessage = (error, fallback) => {
    const responseData = error.response?.data;
    if (responseData?.errors) return Object.values(responseData.errors).flat()[0];
    return responseData?.message || fallback;
};

// Resolve URL foto: prioritas foto_url (sudah absolut dari backend), fallback ke foto (relative path)
const resolveStorageUrl = (path) => {
    if (!path) return "";
    // Sudah URL lengkap → kembalikan apa adanya
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    // Blob URL (preview lokal saat upload) → kembalikan apa adanya
    if (path.startsWith("blob:")) return path;
    // Path relatif seperti "storage/uploads/..." → prepend base Laravel
    const base = "http://127.0.0.1:8000";
    return base + (path.startsWith("/") ? path : "/" + path);
};

const emptyProfile = {
    nama_perusahaan: "",
    deskripsi_singkat: "",
    tentang_kantor: "",
    bidang_usaha: "",
    visi: "",
    misi: "",
    alamat: "",
    email: "",
    telepon: "",
    website: "",
};

const emptyAlumni = {
    nama: "",
    asal_instansi: "",
    jurusan: "",
    periode_magang: "",
    kesan_pesan: "",
};

const emptyAktivitas = {
    judul: "",
    deskripsi: "",
    tanggal: new Date().toISOString().slice(0, 10),
    kategori: "",
    lokasi: "",
    status: "active",
    foto: null,
};

const tabs = [
    { id: "profil", label: "Profil", icon: Building2 },
    { id: "alumni", label: "Alumni", icon: Users },
    { id: "aktivitas", label: "Aktivitas", icon: CalendarDays },
    { id: "ulasan", label: "Ulasan", icon: MessageSquareText },
];

function LandingPageManagement() {
    const [data, setData] = useState({
        profil_kantor: null,
        alumni_magang: [],
        aktivitas_magang: [],
        komentar_aplikasi: [],
    });
    const [activeTab, setActiveTab] = useState("profil");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [formType, setFormType] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({});
    const [fotoFile, setFotoFile] = useState(null);
    const [removeFoto, setRemoveFoto] = useState(false);
    const [fotoPreview, setFotoPreview] = useState("");
    const fotoInputRef = useRef(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await api.get("/admin/landing-page");
            const aktivitas = response.data?.data?.aktivitas_magang || [];
            setData({
                profil_kantor: response.data?.data?.profil_kantor || null,
                alumni_magang: response.data?.data?.alumni_magang || [],
                aktivitas_magang: aktivitas,
                komentar_aplikasi: response.data?.data?.komentar_aplikasi || [],
            });
        } catch (requestError) {
            setError(getErrorMessage(requestError, "Gagal memuat data pengelolaan landing page."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(loadData, 0);
        return () => clearTimeout(timeoutId);
    }, [loadData]);

    const openForm = (type, item = null) => {
        setNotice("");
        setError("");
        setEditingId(item?.id ?? null);
        setFormType(type);
        setFotoFile(null);
        setRemoveFoto(false);
        setFotoPreview("");
        if (type === "profil") setForm({ ...emptyProfile, ...(item || {}) });
        if (type === "alumni") setForm({ ...emptyAlumni, ...(item || {}) });
        if (type === "aktivitas") {
            setForm({
                ...emptyAktivitas,
                ...(item || {}),
                tanggal: item?.tanggal?.slice(0, 10) || emptyAktivitas.tanggal,
            });
            // Jika item sudah punya foto, tampilkan preview
            if (item?.foto_url) setFotoPreview(resolveStorageUrl(item.foto_url));
            else if (item?.foto) setFotoPreview(resolveStorageUrl(item.foto));
        }
    };

    const closeForm = () => {
        setFormType("");
        setEditingId(null);
        setForm({});
        setFotoFile(null);
        setRemoveFoto(false);
        setFotoPreview("");
    };

    const saveForm = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        try {
            if (formType === "profil") {
                await api.put("/admin/landing-page/profil", form);
            } else if (formType === "alumni") {
                const path = editingId
                    ? `/admin/landing-page/alumni/${editingId}`
                    : "/admin/landing-page/alumni";
                await api[editingId ? "put" : "post"](path, form);
            } else if (formType === "aktivitas") {
                const path = editingId
                    ? `/admin/landing-page/aktivitas/${editingId}`
                    : "/admin/landing-page/aktivitas";
                const aktivitasData = {
                    judul: form.judul,
                    deskripsi: form.deskripsi,
                    tanggal: form.tanggal,
                    kategori: form.kategori,
                    lokasi: form.lokasi,
                    status: form.status,
                };

                if (fotoFile) {
                    const formData = new FormData();
                    Object.entries(aktivitasData).forEach(([key, val]) => {
                        if (val !== null && val !== undefined) formData.append(key, val);
                    });
                    formData.append("foto", fotoFile);
                    if (editingId) formData.append("_method", "PUT");
                    await api.post(path, formData, {
                        headers: { "Content-Type": "multipart/form-data" },
                    });
                } else {
                    await api[editingId ? "put" : "post"](path, {
                        ...aktivitasData,
                        ...(editingId && removeFoto ? { foto: null } : {}),
                    });
                }
            }
            closeForm();
            setNotice("Perubahan berhasil disimpan.");
            await loadData();
        } catch (requestError) {
            setError(getErrorMessage(requestError, "Gagal menyimpan perubahan."));
        } finally {
            setSaving(false);
        }
    };

    const deleteRecord = async (type, item) => {
        const labels = {
            alumni: `alumni "${item.nama}"`,
            aktivitas: `aktivitas "${item.judul}"`,
            ulasan: "ulasan ini",
        };
        if (!window.confirm(`Hapus ${labels[type]}?`)) return;

        setError("");
        setNotice("");
        try {
            if (type === "alumni" || type === "aktivitas") {
                await api.delete(`/admin/landing-page/${type}/${item.id}`);
            } else {
                await api.delete(`/admin/landing-page/komentar/${item.id}`);
            }
            setNotice("Data berhasil dihapus.");
            await loadData();
        } catch (requestError) {
            setError(getErrorMessage(requestError, "Gagal menghapus data."));
        }
    };

    const toggleReview = async (review) => {
        setError("");
        setNotice("");
        try {
            await api.patch(`/admin/landing-page/komentar/${review.id}/status`, {
                status: review.status === "published" ? "pending" : "published",
            });
            setNotice("Status ulasan berhasil diperbarui.");
            await loadData();
        } catch (requestError) {
            setError(getErrorMessage(requestError, "Gagal mengubah status ulasan."));
        }
    };

    const profile = data.profil_kantor;
    const counts = {
        alumni: data.alumni_magang.length,
        aktivitas: data.aktivitas_magang.length,
        reviews: data.komentar_aplikasi.filter((item) => item.status === "published").length,
    };

    return (
        <section className="landing-admin">
            <div className="landing-admin-hero">
                <a className="landing-admin-preview" href="/beranda" target="_blank" rel="noreferrer">
                    <Eye size={17} />
                    Pratinjau halaman
                    <ArrowUpRight size={16} />
                </a>
                <div className="landing-admin-eyebrow"><span /> MANAJEMEN KONTEN</div>
                <h2>Landing Page</h2>
                <p>Kelola informasi dan cerita yang tampil di halaman publik portal magang.</p>
                <div className="landing-admin-stats">
                    <div className="landing-admin-stat">
                        <span className="landing-admin-stat-icon purple"><Building2 size={19} /></span>
                        <div><strong>{profile ? "Siap" : "Belum diatur"}</strong><small>Profil perusahaan</small></div>
                    </div>
                    <div className="landing-admin-stat">
                        <span className="landing-admin-stat-icon blue"><Users size={19} /></span>
                        <div><strong>{counts.alumni}</strong><small>Alumni ditampilkan</small></div>
                    </div>
                    <div className="landing-admin-stat">
                        <span className="landing-admin-stat-icon teal"><CalendarDays size={19} /></span>
                        <div><strong>{counts.aktivitas}</strong><small>Aktivitas publik</small></div>
                    </div>
                    <div className="landing-admin-stat">
                        <span className="landing-admin-stat-icon amber"><MessageSquareText size={19} /></span>
                        <div><strong>{counts.reviews}</strong><small>Ulasan tayang</small></div>
                    </div>
                </div>
            </div>

            {(error || notice) && (
                <div className={`landing-admin-alert ${error ? "is-error" : "is-success"}`} role="status">
                    <span>{error || notice}</span>
                    <button type="button" aria-label="Tutup pemberitahuan" onClick={() => { setError(""); setNotice(""); }}><X size={16} /></button>
                </div>
            )}

            <div className="landing-admin-tabs" role="tablist" aria-label="Konten landing page">
                {tabs.map(({ id, label, icon: Icon }) => (
                    <button
                        className={`landing-admin-tab ${activeTab === id ? "active" : ""}`}
                        key={id}
                        onClick={() => setActiveTab(id)}
                        role="tab"
                        aria-selected={activeTab === id}
                        type="button"
                    >
                        <Icon size={17} />
                        {label}
                        {id !== "profil" && <span>{id === "alumni" ? counts.alumni : id === "aktivitas" ? counts.aktivitas : data.komentar_aplikasi.length}</span>}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="landing-admin-state">Memuat konten landing page...</div>
            ) : (
                <div className="landing-admin-panel">
                    {activeTab === "profil" && (
                        <>
                            <div className="landing-admin-panel-heading">
                                <span className="landing-admin-heading-icon"><Building2 size={19} /></span>
                                <div><h3>Profil perusahaan</h3><p>Informasi ini menjadi identitas utama halaman publik.</p></div>
                                <button className="landing-admin-button secondary" onClick={() => openForm("profil", profile)} type="button">
                                    <Pencil size={15} /> {profile ? "Edit profil" : "Atur profil"}
                                </button>
                            </div>
                            {profile ? (
                                <div className="landing-admin-profile-grid">
                                    <ProfileField label="Nama perusahaan" value={profile.nama_perusahaan} />
                                    <ProfileField label="Bidang usaha" value={profile.bidang_usaha} />
                                    <ProfileField label="Deskripsi singkat" value={profile.deskripsi_singkat} />
                                    <ProfileField label="Tentang kantor" value={profile.tentang_kantor} />
                                    <ProfileField label="Visi" value={profile.visi} />
                                    <ProfileField label="Misi" value={profile.misi} />
                                    <ProfileField label="Alamat" value={profile.alamat} />
                                    <ProfileField label="Email" value={profile.email} />
                                    <ProfileField label="Telepon" value={profile.telepon} />
                                    <ProfileField label="Website" value={profile.website} />
                                </div>
                            ) : (
                                <div className="landing-admin-empty">Profil perusahaan belum diatur. Lengkapi profil agar informasi tampil pada halaman publik.</div>
                            )}
                        </>
                    )}

                    {activeTab === "alumni" && (
                        <DataSection
                            title="Alumni magang"
                            description="Cerita dan pengalaman peserta yang ditampilkan di halaman publik."
                            icon={Users}
                            addLabel="Tambah alumni"
                            onAdd={() => openForm("alumni")}
                            empty="Belum ada data alumni."
                        >
                            {data.alumni_magang.map((item) => (
                                <article className="landing-admin-record" key={item.id}>
                                    <div className="landing-admin-record-main"><strong>{item.nama}</strong><span>{item.jurusan} · {item.asal_instansi} · {item.periode_magang}</span><p>{item.kesan_pesan}</p></div>
                                    <RecordActions onEdit={() => openForm("alumni", item)} onDelete={() => deleteRecord("alumni", item)} />
                                </article>
                            ))}
                        </DataSection>
                    )}

                    {activeTab === "aktivitas" && (
                        <DataSection
                            title="Aktivitas magang"
                            description="Kelola aktivitas dan cerita yang tampil pada halaman publik."
                            icon={CalendarDays}
                            addLabel="Tambah aktivitas"
                            onAdd={() => openForm("aktivitas")}
                            empty="Belum ada aktivitas yang ditambahkan."
                            isEmpty={data.aktivitas_magang.length === 0}
                        >
                            <div className="landing-admin-aktivitas-grid">
                                {data.aktivitas_magang.map((item) => {
                                    const statusMap = {
                                        active: { label: "Aktif", cls: "aktif" },
                                        draft: { label: "Draft", cls: "draft" },
                                        archived: { label: "Arsip", cls: "arsip" },
                                    };
                                    const st = statusMap[item.status] || statusMap.draft;
                                    return (
                                        <article className="landing-admin-aktivitas-card" key={item.id}>
                                            {/* Foto / Placeholder */}
                                            <div className="landing-admin-card-img-wrap">
                                                {(item.foto_url || item.foto) ? (
                                                    <AktivitasThumbnail
                                                        src={resolveStorageUrl(item.foto_url || item.foto)}
                                                        fallbackSrc={item.foto ? resolveStorageUrl(item.foto) : null}
                                                        alt={item.judul}
                                                        fullCard
                                                    />
                                                ) : (
                                                    <div className="landing-admin-card-no-foto">
                                                        <CalendarDays size={28} />
                                                        <span>Belum ada foto</span>
                                                    </div>
                                                )}
                                                <span className={`landing-admin-card-status ${st.cls}`}>{st.label}</span>
                                            </div>

                                            {/* Konten */}
                                            <div className="landing-admin-card-body">
                                                {item.kategori && (
                                                    <span className="landing-admin-card-kategori">{item.kategori}</span>
                                                )}
                                                <h4 className="landing-admin-card-judul">{item.judul}</h4>
                                                <div className="landing-admin-card-meta">
                                                    <span><CalendarDays size={12} />{item.tanggal}</span>
                                                    {item.lokasi && <span><MapPin size={12} />{item.lokasi}</span>}
                                                    <span><Users size={12} />{item.user?.name || "Admin"}</span>
                                                </div>
                                                <p className="landing-admin-card-desc">{item.deskripsi}</p>
                                            </div>

                                            {/* Aksi */}
                                            <div className="landing-admin-card-footer">
                                                <button
                                                    className="landing-admin-button secondary small"
                                                    type="button"
                                                    onClick={() => openForm("aktivitas", item)}
                                                >
                                                    <Pencil size={13} /> Edit
                                                </button>
                                                <button
                                                    className="landing-admin-icon-button danger"
                                                    type="button"
                                                    aria-label="Hapus"
                                                    onClick={() => deleteRecord("aktivitas", item)}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </DataSection>
                    )}


                    {activeTab === "ulasan" && (
                        <DataSection
                            title="Ulasan pengguna"
                            description="Tentukan ulasan yang ditampilkan pada halaman publik."
                            icon={MessageSquareText}
                            empty="Belum ada ulasan pengguna."
                        >
                            {data.komentar_aplikasi.map((item) => (
                                <article className="landing-admin-record" key={item.id}>
                                    <div className="landing-admin-record-main">
                                        <strong>{item.nama_pengguna || item.user?.name || "Pengguna"} <span className={`landing-admin-status ${item.status === "published" ? "published" : ""}`}>{item.status === "published" ? "Tayang" : "Disembunyikan"}</span></strong>
                                        <span>{item.email || item.user?.email || "Email tidak tersedia"} · Rating {item.rating}/5</span>
                                        <p>{item.komentar}</p>
                                    </div>
                                    <div className="landing-admin-actions">
                                        <button className="landing-admin-button secondary" type="button" onClick={() => toggleReview(item)}>{item.status === "published" ? "Sembunyikan" : "Tayangkan"}</button>
                                        <button className="landing-admin-icon-button danger" type="button" aria-label="Hapus ulasan" onClick={() => deleteRecord("ulasan", item)}><Trash2 size={16} /></button>
                                    </div>
                                </article>
                            ))}
                        </DataSection>
                    )}
                </div>
            )}

            {formType && (
                <div className="landing-admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
                    <form className="landing-admin-modal" onSubmit={saveForm} role="dialog" aria-modal="true" aria-labelledby="landing-admin-modal-title">
                        <div className="landing-admin-modal-heading">
                            <div><h3 id="landing-admin-modal-title">{formType === "profil" ? "Profil perusahaan" : `${editingId ? "Edit" : "Tambah"} ${formType === "alumni" ? "alumni" : "aktivitas"}`}</h3><p>Isi informasi yang akan disimpan untuk halaman publik.</p></div>
                            <button className="landing-admin-icon-button" type="button" aria-label="Tutup" onClick={closeForm}><X size={18} /></button>
                        </div>
                        <div className="landing-admin-form-grid">
                            {formType === "profil" && (
                                <>
                                    <FormField label="Nama perusahaan" name="nama_perusahaan" value={form.nama_perusahaan} onChange={setForm} required />
                                    <FormField label="Bidang usaha" name="bidang_usaha" value={form.bidang_usaha} onChange={setForm} required />
                                    <FormField label="Deskripsi singkat" name="deskripsi_singkat" value={form.deskripsi_singkat} onChange={setForm} required wide multiline />
                                    <FormField label="Tentang kantor" name="tentang_kantor" value={form.tentang_kantor} onChange={setForm} required wide multiline />
                                    <FormField label="Visi" name="visi" value={form.visi} onChange={setForm} wide multiline />
                                    <FormField label="Misi" name="misi" value={form.misi} onChange={setForm} wide multiline />
                                    <FormField label="Alamat" name="alamat" value={form.alamat} onChange={setForm} />
                                    <FormField label="Email" name="email" value={form.email} onChange={setForm} type="email" />
                                    <FormField label="Telepon" name="telepon" value={form.telepon} onChange={setForm} />
                                    <FormField label="Website" name="website" value={form.website} onChange={setForm} type="url" />
                                </>
                            )}
                            {formType === "alumni" && (
                                <>
                                    <FormField label="Nama" name="nama" value={form.nama} onChange={setForm} required />
                                    <FormField label="Asal instansi" name="asal_instansi" value={form.asal_instansi} onChange={setForm} required />
                                    <FormField label="Jurusan" name="jurusan" value={form.jurusan} onChange={setForm} required />
                                    <FormField label="Periode magang" name="periode_magang" value={form.periode_magang} onChange={setForm} required />
                                    <FormField label="Kesan dan pesan" name="kesan_pesan" value={form.kesan_pesan} onChange={setForm} required wide multiline />
                                </>
                            )}
                            {formType === "aktivitas" && (
                                <>
                                    <FormField label="Judul" name="judul" value={form.judul} onChange={setForm} required />
                                    <FormField label="Tanggal" name="tanggal" value={form.tanggal} onChange={setForm} required type="date" />
                                    <FormField label="Kategori" name="kategori" value={form.kategori} onChange={setForm} />
                                    <FormField label="Lokasi" name="lokasi" value={form.lokasi} onChange={setForm} />
                                    <label className="landing-admin-field"><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">Aktif</option><option value="draft">Draft</option><option value="archived">Arsip</option></select></label>
                                    <FormField label="Deskripsi" name="deskripsi" value={form.deskripsi} onChange={setForm} required wide multiline />

                                    {/* Input Upload Foto */}
                                    <div className="landing-admin-field wide landing-admin-foto-field">
                                        <span>Foto Aktivitas</span>
                                        <input
                                            ref={fotoInputRef}
                                            id="landing-admin-foto"
                                            type="file"
                                            accept="image/*"
                                            style={{ display: "none" }}
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;
                                                setFotoFile(file);
                                                setRemoveFoto(false);
                                                setFotoPreview(URL.createObjectURL(file));
                                            }}
                                        />
                                        {fotoPreview ? (
                                            <div className="landing-admin-foto-preview-wrap">
                                                <img
                                                    className="landing-admin-foto-preview"
                                                    src={fotoPreview}
                                                    alt="Preview foto aktivitas"
                                                />
                                                <div className="landing-admin-foto-preview-actions">
                                                    <button
                                                        type="button"
                                                        className="landing-admin-button secondary"
                                                        onClick={() => fotoInputRef.current?.click()}
                                                    >
                                                        <ImagePlus size={15} /> Ganti foto
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="landing-admin-icon-button danger"
                                                        aria-label="Hapus foto"
                                                        onClick={() => {
                                                            setFotoFile(null);
                                                            setRemoveFoto(Boolean(editingId && form.foto));
                                                            setFotoPreview("");
                                                            if (fotoInputRef.current) fotoInputRef.current.value = "";
                                                        }}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                className="landing-admin-foto-upload-btn"
                                                onClick={() => fotoInputRef.current?.click()}
                                            >
                                                <ImagePlus size={28} />
                                                <span>Klik untuk unggah foto</span>
                                                <small>JPG, PNG, WEBP – maks. 2 MB</small>
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                        {error && <div className="landing-admin-alert is-error">{error}</div>}
                        <div className="landing-admin-modal-actions">
                            <button className="landing-admin-button secondary" type="button" onClick={closeForm}>Batal</button>
                            <button className="landing-admin-button primary" type="submit" disabled={saving}><Save size={16} />{saving ? "Menyimpan..." : "Simpan"}</button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
}

function ProfileField({ label, value }) {
    return <div className="landing-admin-profile-field"><span>{label}</span><strong>{value || "—"}</strong></div>;
}

function DataSection({ title, description, icon: Icon, addLabel, onAdd, empty, children, isEmpty }) {
    return (
        <>
            <div className="landing-admin-panel-heading">
                <span className="landing-admin-heading-icon"><Icon size={19} /></span>
                <div><h3>{title}</h3><p>{description}</p></div>
                {onAdd && <button className="landing-admin-button primary" type="button" onClick={onAdd}><Plus size={16} />{addLabel}</button>}
            </div>
            {(isEmpty !== undefined ? !isEmpty : (Array.isArray(children) ? children.length > 0 : Boolean(children))) ? <div className="landing-admin-record-list">{children}</div> : <div className="landing-admin-empty">{empty}</div>}
        </>
    );
}

function RecordActions({ onEdit, onDelete }) {
    return (
        <div className="landing-admin-actions">
            <button className="landing-admin-icon-button" type="button" aria-label="Edit" onClick={onEdit}><Pencil size={16} /></button>
            <button className="landing-admin-icon-button danger" type="button" aria-label="Hapus" onClick={onDelete}><Trash2 size={16} /></button>
        </div>
    );
}

function FormField({ label, name, value, onChange, type = "text", required = false, wide = false, multiline = false }) {
    const props = {
        id: `landing-admin-${name}`,
        name,
        value: value || "",
        onChange: (event) => onChange((current) => ({ ...current, [name]: event.target.value })),
        required,
    };
    return (
        <label className={`landing-admin-field ${wide ? "wide" : ""}`} htmlFor={props.id}>
            <span>{label}</span>
            {multiline ? <textarea {...props} rows={3} /> : <input {...props} type={type} />}
        </label>
    );
}

function AktivitasThumbnail({ src, fallbackSrc, alt }) {
    const [status, setStatus] = useState("loading"); // loading | ok | fallback | broken
    const [currentSrc, setCurrentSrc] = useState(src);

    const handleError = () => {
        if (status === "loading" && fallbackSrc && fallbackSrc !== src) {
            // Coba fallback URL (foto path relatif)
            setCurrentSrc(fallbackSrc);
            setStatus("fallback");
        } else {
            // Kedua URL gagal → tampilkan placeholder
            setStatus("broken");
        }
    };

    if (status === "broken") {
        return (
            <div
                className="landing-admin-record-thumb landing-admin-thumb-broken"
                title="Foto tidak ditemukan di storage – buka Edit dan upload ulang foto"
            >
                <span>🖼️</span>
                <small>Foto hilang</small>
            </div>
        );
    }

    return (
        <img
            className="landing-admin-record-thumb"
            src={currentSrc}
            alt={alt}
            onLoad={() => setStatus("ok")}
            onError={handleError}
        />
    );
}

export default LandingPageManagement;
