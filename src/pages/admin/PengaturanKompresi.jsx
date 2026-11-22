import { useEffect, useState } from "react";
import { CheckCircle2, FileText, Save } from "lucide-react";
import api from "../../services/api";

const MAX_FILE_SIZE_MB = 10;
const MIN_PHOTO_TARGET_SIZE_KB = 50;
const MAX_PHOTO_TARGET_SIZE_KB = 1024;

export default function PengaturanKompresi() {
    const [maxFileSizeMb, setMaxFileSizeMb] = useState("10");
    const [photoTargetSizeKb, setPhotoTargetSizeKb] = useState("100");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        let cancelled = false;

        api.get("/admin/pengaturan-kompresi")
            .then((response) => {
                if (!cancelled) {
                    setMaxFileSizeMb(String(response.data?.data?.max_file_size_mb ?? ""));
                    setPhotoTargetSizeKb(String(response.data?.data?.photo_target_size_kb ?? ""));
                }
            })
            .catch((requestError) => {
                if (!cancelled) {
                    setError(requestError.response?.data?.message || "Pengaturan batas ukuran gagal dimuat.");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const saveSettings = async (event) => {
        event.preventDefault();
        const parsedMaxFileSizeMb = Number(maxFileSizeMb);
        const parsedPhotoTargetSizeKb = Number(photoTargetSizeKb);
        if (!Number.isInteger(parsedMaxFileSizeMb) || parsedMaxFileSizeMb < 1 || parsedMaxFileSizeMb > MAX_FILE_SIZE_MB) {
            setError(`Masukkan bilangan bulat antara 1 dan ${MAX_FILE_SIZE_MB} MB.`);
            setSuccess("");
            return;
        }
        if (
            !Number.isInteger(parsedPhotoTargetSizeKb)
            || parsedPhotoTargetSizeKb < MIN_PHOTO_TARGET_SIZE_KB
            || parsedPhotoTargetSizeKb > MAX_PHOTO_TARGET_SIZE_KB
        ) {
            setError(`Target pas foto harus berupa bilangan bulat ${MIN_PHOTO_TARGET_SIZE_KB}–${MAX_PHOTO_TARGET_SIZE_KB} KB.`);
            setSuccess("");
            return;
        }

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await api.put("/admin/pengaturan-kompresi", {
                max_file_size_mb: parsedMaxFileSizeMb,
                photo_target_size_kb: parsedPhotoTargetSizeKb,
            });
            setMaxFileSizeMb(String(response.data?.data?.max_file_size_mb ?? parsedMaxFileSizeMb));
            setPhotoTargetSizeKb(String(response.data?.data?.photo_target_size_kb ?? parsedPhotoTargetSizeKb));
            setSuccess(response.data?.message || "Pengaturan kompresi berkas berhasil disimpan.");
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Pengaturan batas ukuran gagal disimpan.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <section style={{ maxWidth: "1100px" }}>
            <section style={{ marginBottom: "22px" }}>
                <p style={{ margin: "0 0 6px", color: "#4f46e5", fontSize: "12px", fontWeight: 800, letterSpacing: "1px" }}>
                    PENGATURAN BERKAS
                </p>
                <h1 style={{ margin: 0, color: "#0f172a", fontSize: "24px" }}>Pengaturan kompresi berkas pendaftaran</h1>
                <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "14px", lineHeight: 1.6 }}>
                    Atur batas surat pengantar dan target kompresi pas foto yang berlaku untuk semua peserta.
                </p>
            </section>

            <section style={{ padding: "22px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#fff" }}>
                {loading ? (
                    <p role="status" style={{ margin: 0, color: "#64748b" }}>Memuat pengaturan...</p>
                ) : (
                    <form onSubmit={saveSettings}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                            <div style={{ padding: "18px", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                                <label htmlFor="max-letter-size" style={{ display: "block", marginBottom: "8px", color: "#334155", fontSize: "14px", fontWeight: 700 }}>
                                    Batas maksimum surat pengantar
                                </label>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", maxWidth: "320px" }}>
                                    <input
                                        id="max-letter-size"
                                        type="number"
                                        min="1"
                                        max={MAX_FILE_SIZE_MB}
                                        step="1"
                                        value={maxFileSizeMb}
                                        onChange={(event) => {
                                            setMaxFileSizeMb(event.target.value);
                                            setError("");
                                            setSuccess("");
                                        }}
                                        required
                                        style={{ width: "100%", padding: "11px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", color: "#0f172a", fontSize: "15px" }}
                                    />
                                    <span style={{ color: "#475569", fontWeight: 700 }}>MB</span>
                                </div>
                                <p style={{ margin: "9px 0 0", color: "#64748b", fontSize: "12px", lineHeight: 1.6 }}>
                                    Batas file surat setelah kompresi. Nilai yang diizinkan 1–{MAX_FILE_SIZE_MB} MB.
                                </p>
                                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginTop: "14px", padding: "12px", borderRadius: "9px", background: "#eff6ff", color: "#1e40af", fontSize: "12px", lineHeight: 1.6 }}>
                                    <FileText size={17} style={{ flexShrink: 0, marginTop: "1px" }} />
                                    <span>
                                        Kompresi surat tetap menargetkan 100 KB. Jika target tidak tercapai, berkas masih dapat dikirim selama tidak melebihi batas ini.
                                    </span>
                                </div>
                            </div>

                            <div style={{ padding: "18px", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                                <label htmlFor="photo-target-size" style={{ display: "block", marginBottom: "8px", color: "#334155", fontSize: "14px", fontWeight: 700 }}>
                                    Target maksimum kompresi pas foto formal
                                </label>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", maxWidth: "320px" }}>
                                    <input
                                        id="photo-target-size"
                                        type="number"
                                        min={MIN_PHOTO_TARGET_SIZE_KB}
                                        max={MAX_PHOTO_TARGET_SIZE_KB}
                                        step="1"
                                        value={photoTargetSizeKb}
                                        onChange={(event) => {
                                            setPhotoTargetSizeKb(event.target.value);
                                            setError("");
                                            setSuccess("");
                                        }}
                                        required
                                        style={{ width: "100%", padding: "11px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", color: "#0f172a", fontSize: "15px" }}
                                    />
                                    <span style={{ color: "#475569", fontWeight: 700 }}>KB</span>
                                </div>
                                <p style={{ margin: "9px 0 0", color: "#64748b", fontSize: "12px", lineHeight: 1.6 }}>
                                    Nilai yang diizinkan {MIN_PHOTO_TARGET_SIZE_KB}–{MAX_PHOTO_TARGET_SIZE_KB} KB. Nilai awal 100 KB.
                                </p>
                                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginTop: "14px", padding: "12px", borderRadius: "9px", background: "#eff6ff", color: "#1e40af", fontSize: "12px", lineHeight: 1.6 }}>
                                    <FileText size={17} style={{ flexShrink: 0, marginTop: "1px" }} />
                                    <span>
                                        Foto otomatis dikompres ke target ini. Jika hasilnya masih lebih besar, peserta diminta memilih foto lain.
                                    </span>
                                </div>
                            </div>
                        </div>

                        {error && <p role="alert" style={{ margin: "14px 0 0", color: "#b91c1c", fontSize: "13px" }}>{error}</p>}
                        {success && (
                            <p role="status" style={{ display: "flex", alignItems: "center", gap: "7px", margin: "14px 0 0", color: "#047857", fontSize: "13px" }}>
                                <CheckCircle2 size={16} />
                                {success}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={saving}
                            style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginTop: "18px", padding: "10px 16px", border: 0, borderRadius: "8px", background: saving ? "#94a3b8" : "#4f46e5", color: "#fff", fontWeight: 700, cursor: saving ? "wait" : "pointer" }}
                        >
                            <Save size={16} />
                            {saving ? "Menyimpan..." : "Simpan pengaturan"}
                        </button>
                    </form>
                )}
            </section>
        </section>
    );
}
