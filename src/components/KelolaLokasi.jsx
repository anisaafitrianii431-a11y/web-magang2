import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../services/api";

const initialForm = {
    nama_lokasi: "",
    alamat: "",
    latitude: -6.200000,
    longitude: 106.816666,
    radius_meter: 100,
    is_active: true,
};

const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: "14px",
    boxSizing: "border-box",
    background: "#fff",
    color: "#334155",
};

const createMarkerIcon = () => {
    return L.divIcon({
        className: "custom-leaflet-marker",
        html: `
            <div style="
                width: 34px;
                height: 34px;
                background: #4f46e5;
                color: #ffffff;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                box-shadow: 0 4px 12px rgba(79, 70, 229, 0.45);
                border: 2px solid #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <span style="transform: rotate(45deg); font-size: 16px;">📍</span>
            </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -34],
    });
};

export default function KelolaLokasi() {
    const [locations, setLocations] = useState([]);
    const [form, setForm] = useState(initialForm);
    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);

    // Pengaturan Kebijakan Absensi Daring & Zoom
    const [attendancePolicy, setAttendancePolicy] = useState({
        allow_zoom: true,
        require_zoom_proof: true,
        zoom_note: "Peserta yang sedang mengikuti rapat/kegiatan Zoom atau WFH dapat melakukan absensi dengan melampirkan screenshot ruang Zoom.",
    });
    const [policyLoading, setPolicyLoading] = useState(false);
    const [policySaving, setPolicySaving] = useState(false);
    const [policySuccess, setPolicySuccess] = useState("");

    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const circleRef = useRef(null);
    const formSectionRef = useRef(null);

    const loadLocations = async () => {
        setIsLoading(true);
        setError("");
        try {
            const response = await api.get("/admin/lokasi");
            setLocations(response.data.data || []);
        } catch (requestError) {
            setError(
                requestError.response?.data?.message
                || "Gagal memuat data lokasi absensi."
            );
        } finally {
            setIsLoading(false);
        }
    };

    const loadPolicy = async () => {
        setPolicyLoading(true);
        try {
            const response = await api.get("/admin/pengaturan-absensi");
            if (response.data?.data) {
                setAttendancePolicy(response.data.data);
            }
        } catch {
            // Gunakan nilai default jika gagal
        } finally {
            setPolicyLoading(false);
        }
    };

    const handleSavePolicy = async (e) => {
        if (e) e.preventDefault();
        setPolicySaving(true);
        setPolicySuccess("");
        setError("");
        try {
            const response = await api.post("/admin/pengaturan-absensi", attendancePolicy);
            setPolicySuccess(response.data?.message || "Kebijakan absensi daring (Zoom) berhasil disimpan!");
            setTimeout(() => setPolicySuccess(""), 4000);
        } catch (requestError) {
            setError(
                requestError.response?.data?.message
                || "Gagal menyimpan kebijakan absensi daring."
            );
        } finally {
            setPolicySaving(false);
        }
    };

    useEffect(() => {
        loadLocations();
        loadPolicy();
    }, []);

    // Initialize Leaflet Map
    useEffect(() => {
        if (!mapContainerRef.current) return;

        if (!mapInstanceRef.current) {
            const initialLat = Number(form.latitude) || -6.200000;
            const initialLng = Number(form.longitude) || 106.816666;
            const initialRadius = Number(form.radius_meter) || 100;

            const map = L.map(mapContainerRef.current, {
                center: [initialLat, initialLng],
                zoom: 16,
            });

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
            }).addTo(map);

            const icon = createMarkerIcon();
            const marker = L.marker([initialLat, initialLng], {
                icon,
                draggable: true,
            }).addTo(map);

            const circle = L.circle([initialLat, initialLng], {
                radius: initialRadius,
                color: "#4f46e5",
                fillColor: "#6366f1",
                fillOpacity: 0.18,
                weight: 2,
                dashArray: "4, 6",
            }).addTo(map);

            marker.on("dragend", (event) => {
                const position = event.target.getLatLng();
                setForm((prev) => ({
                    ...prev,
                    latitude: Number(position.lat.toFixed(6)),
                    longitude: Number(position.lng.toFixed(6)),
                }));
                circle.setLatLng(position);
            });

            map.on("click", (event) => {
                const { lat, lng } = event.latlng;
                const roundedLat = Number(lat.toFixed(6));
                const roundedLng = Number(lng.toFixed(6));
                marker.setLatLng([roundedLat, roundedLng]);
                circle.setLatLng([roundedLat, roundedLng]);
                setForm((prev) => ({
                    ...prev,
                    latitude: roundedLat,
                    longitude: roundedLng,
                }));
            });

            mapInstanceRef.current = map;
            markerRef.current = marker;
            circleRef.current = circle;

            // Invalidate size after modal/container render
            setTimeout(() => {
                map.invalidateSize();
            }, 250);
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markerRef.current = null;
                circleRef.current = null;
            }
        };
    }, []);

    // Sync map when form lat/lng/radius changes
    const syncMapToCoordinates = (lat, lng, radius) => {
        const numLat = Number(lat);
        const numLng = Number(lng);
        const numRadius = Number(radius);

        if (isNaN(numLat) || isNaN(numLng)) return;

        if (markerRef.current) {
            markerRef.current.setLatLng([numLat, numLng]);
        }
        if (circleRef.current) {
            circleRef.current.setLatLng([numLat, numLng]);
            if (!isNaN(numRadius) && numRadius > 0) {
                circleRef.current.setRadius(numRadius);
            }
        }
        if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([numLat, numLng], mapInstanceRef.current.getZoom() || 16);
            mapInstanceRef.current.invalidateSize();
        }
    };

    const handleCoordinateChange = (field, value) => {
        const nextForm = { ...form, [field]: value };
        setForm(nextForm);
        syncMapToCoordinates(
            field === "latitude" ? value : form.latitude,
            field === "longitude" ? value : form.longitude,
            form.radius_meter
        );
    };

    const handleRadiusChange = (radius) => {
        const nextForm = { ...form, radius_meter: radius };
        setForm(nextForm);
        if (circleRef.current) {
            circleRef.current.setRadius(Number(radius) || 100);
        }
    };

    const handleGetGpsLocation = () => {
        if (!navigator.geolocation) {
            setError("Browser Anda tidak mendukung fitur Geolocation.");
            return;
        }

        setGeoLoading(true);
        setError("");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = Number(position.coords.latitude.toFixed(6));
                const lng = Number(position.coords.longitude.toFixed(6));
                const accuracy = Math.round(position.coords.accuracy);

                setForm((prev) => ({
                    ...prev,
                    latitude: lat,
                    longitude: lng,
                }));
                syncMapToCoordinates(lat, lng, form.radius_meter);
                setGeoLoading(false);
                setSuccess(`Titik lokasi perangkat berhasil dideteksi (Akurasi: ±${accuracy} meter).`);
            },
            (geoError) => {
                setGeoLoading(false);
                let message = "Gagal mengambil lokasi GPS.";
                if (geoError.code === 1) {
                    message = "Izin akses lokasi ditolak. Mohon aktifkan izin lokasi di browser Anda.";
                } else if (geoError.code === 2) {
                    message = "Lokasi tidak dapat ditemukan.";
                } else if (geoError.code === 3) {
                    message = "Waktu permintaan lokasi habis (timeout).";
                }
                setError(message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    };

    const handleEdit = (loc) => {
        setEditingId(loc.id);
        const newForm = {
            nama_lokasi: loc.nama_lokasi || "",
            alamat: loc.alamat || "",
            latitude: Number(loc.latitude),
            longitude: Number(loc.longitude),
            radius_meter: Number(loc.radius_meter) || 100,
            is_active: Boolean(loc.is_active),
        };
        setForm(newForm);
        syncMapToCoordinates(newForm.latitude, newForm.longitude, newForm.radius_meter);
        setError("");
        setSuccess("");

        if (formSectionRef.current) {
            formSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setForm(initialForm);
        syncMapToCoordinates(initialForm.latitude, initialForm.longitude, initialForm.radius_meter);
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setIsSubmitting(true);

        const payload = {
            nama_lokasi: form.nama_lokasi.trim(),
            alamat: form.alamat ? form.alamat.trim() : null,
            latitude: parseFloat(form.latitude),
            longitude: parseFloat(form.longitude),
            radius_meter: parseInt(form.radius_meter, 10),
            is_active: Boolean(form.is_active),
        };

        if (!payload.nama_lokasi) {
            setError("Nama lokasi wajib diisi.");
            setIsSubmitting(false);
            return;
        }

        if (isNaN(payload.latitude) || isNaN(payload.longitude)) {
            setError("Titik koordinat Latitude dan Longitude harus berupa angka yang valid.");
            setIsSubmitting(false);
            return;
        }

        try {
            if (editingId) {
                const res = await api.put(`/admin/lokasi/${editingId}`, payload);
                setSuccess(res.data.message || "Lokasi absensi berhasil diperbarui.");
                setEditingId(null);
            } else {
                const res = await api.post("/admin/lokasi", payload);
                setSuccess(res.data.message || "Lokasi absensi baru berhasil ditambahkan.");
            }
            setForm(initialForm);
            syncMapToCoordinates(initialForm.latitude, initialForm.longitude, initialForm.radius_meter);
            await loadLocations();
        } catch (requestError) {
            const validationErrors = requestError.response?.data?.errors;
            const validationMsg = validationErrors
                ? Object.values(validationErrors).flat().join(" ")
                : null;
            setError(
                validationMsg
                || requestError.response?.data?.message
                || "Gagal menyimpan lokasi absensi."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleActive = async (id) => {
        try {
            const res = await api.patch(`/admin/lokasi/${id}/toggle`);
            setSuccess(res.data.message || "Status lokasi berhasil diubah.");
            await loadLocations();
        } catch (err) {
            setError(err.response?.data?.message || "Gagal mengubah status aktif lokasi.");
        }
    };

    const handleDelete = async (id, nama) => {
        const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus lokasi "${nama}"?`);
        if (!confirmDelete) return;

        try {
            const res = await api.delete(`/admin/lokasi/${id}`);
            setSuccess(res.data.message || "Lokasi berhasil dihapus.");
            if (editingId === id) {
                handleCancelEdit();
            }
            await loadLocations();
        } catch (err) {
            setError(err.response?.data?.message || "Gagal menghapus lokasi.");
        }
    };

    return (
        <div style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}>
            {/* Header Page */}
            <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "24px" }}>📍</span>
                    <div>
                        <h2 style={{ margin: 0, color: "#0f172a", fontSize: "20px", fontWeight: "700" }}>
                            Kelola Lokasi Absensi Magang
                        </h2>
                        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
                            Tentukan titik koordinat kantor dan batas radius toleransi agar peserta hanya bisa absen di lokasi yang sah.
                        </p>
                    </div>
                </div>
            </div>

            {/* Info Notice Box */}
            <div
                style={{
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "10px",
                    padding: "14px 18px",
                    marginBottom: "22px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    color: "#1e40af",
                    fontSize: "13.5px",
                    lineHeight: "1.5",
                }}
            >
                <span style={{ fontSize: "18px" }}>ℹ️</span>
                <div>
                    <strong>Bagaimana cara kerjanya?</strong>
                    <div style={{ marginTop: "3px", color: "#1e3a8a" }}>
                        Sistem ini menggunakan geofencing GPS. Anda dapat mengatur titik kantor dengan mengklik langsung pada peta, menggeser pin lokasi, atau menggunakan tombol <strong>"Gunakan GPS Saya Saat Ini"</strong> jika Anda sedang berada di kantor.
                    </div>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div
                    role="alert"
                    style={{
                        marginBottom: "18px",
                        padding: "12px 16px",
                        color: "#991b1b",
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: "8px",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }}
                >
                    <span>⚠️</span>
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div
                    role="status"
                    style={{
                        marginBottom: "18px",
                        padding: "12px 16px",
                        color: "#065f46",
                        background: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        borderRadius: "8px",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }}
                >
                    <span>✓</span>
                    <span>{success}</span>
                </div>
            )}

            {/* Panel Kebijakan Absensi Daring (Zoom / WFH) */}
            <div
                style={{
                    background: "#ffffff",
                    border: "1px solid #c7d2fe",
                    borderRadius: "12px",
                    padding: "20px 24px",
                    marginBottom: "26px",
                    boxShadow: "0 2px 10px rgba(99, 102, 241, 0.08)",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                            style={{
                                width: "42px",
                                height: "42px",
                                borderRadius: "10px",
                                background: "#eef2ff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "22px",
                                border: "1px solid #c7d2fe",
                            }}
                        >
                            💻
                        </div>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1e1b4b" }}>
                                    Kebijakan Absensi Daring & Zoom (WFH / Online)
                                </h3>
                                <span
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        padding: "3px 10px",
                                        borderRadius: "20px",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        background: attendancePolicy.allow_zoom ? "#ecfdf5" : "#fef2f2",
                                        color: attendancePolicy.allow_zoom ? "#065f46" : "#991b1b",
                                        border: attendancePolicy.allow_zoom ? "1px solid #a7f3d0" : "1px solid #fecaca",
                                    }}
                                >
                                    <span
                                        style={{
                                            width: "6px",
                                            height: "6px",
                                            borderRadius: "50%",
                                            background: attendancePolicy.allow_zoom ? "#10b981" : "#ef4444",
                                        }}
                                    />
                                    {attendancePolicy.allow_zoom ? "Mode Zoom Aktif" : "Mode Zoom Nonaktif"}
                                </span>
                            </div>
                            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
                                Atur apakah peserta diperbolehkan absen tanpa batasan radius saat ada rapat Zoom mendadak atau WFH.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleSavePolicy}
                        disabled={policySaving || policyLoading}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            background: policySaving ? "#94a3b8" : "#4f46e5",
                            color: "#ffffff",
                            padding: "9px 18px",
                            borderRadius: "6px",
                            border: "none",
                            fontSize: "13px",
                            fontWeight: "600",
                            cursor: policySaving ? "not-allowed" : "pointer",
                            boxShadow: "0 1px 3px rgba(79, 70, 229, 0.3)",
                            transition: "background 0.2s",
                        }}
                    >
                        <span>{policySaving ? "⏳" : "💾"}</span>
                        <span>{policySaving ? "Menyimpan..." : "Simpan Kebijakan"}</span>
                    </button>
                </div>

                {policySuccess && (
                    <div
                        style={{
                            marginBottom: "16px",
                            padding: "10px 14px",
                            background: "#ecfdf5",
                            border: "1px solid #a7f3d0",
                            borderRadius: "6px",
                            color: "#065f46",
                            fontSize: "13px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                        }}
                    >
                        <span>✓</span>
                        <span>{policySuccess}</span>
                    </div>
                )}

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                        gap: "14px",
                        marginBottom: "16px",
                    }}
                >
                    {/* Toggle 1: Izinkan Zoom */}
                    <div
                        style={{
                            background: attendancePolicy.allow_zoom ? "#f5f3ff" : "#f8fafc",
                            border: attendancePolicy.allow_zoom ? "1px solid #c7d2fe" : "1px solid #e2e8f0",
                            borderRadius: "8px",
                            padding: "14px 16px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                            <div>
                                <strong style={{ fontSize: "14px", color: "#1e293b", display: "block" }}>
                                    1. Izinkan Absensi Daring / Zoom
                                </strong>
                                <span style={{ fontSize: "12.5px", color: "#64748b", marginTop: "4px", display: "block", lineHeight: "1.4" }}>
                                    Jika aktif, peserta dapat memilih opsi <strong>"Hadir Daring (Zoom)"</strong>. Validasi radius kantor akan dilewati secara otomatis.
                                </span>
                            </div>
                            <label style={{ position: "relative", display: "inline-block", width: "46px", height: "24px", flexShrink: 0, cursor: "pointer" }}>
                                <input
                                    type="checkbox"
                                    checked={attendancePolicy.allow_zoom}
                                    onChange={(e) => setAttendancePolicy({ ...attendancePolicy, allow_zoom: e.target.checked })}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span
                                    style={{
                                        position: "absolute",
                                        cursor: "pointer",
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: attendancePolicy.allow_zoom ? "#4f46e5" : "#cbd5e1",
                                        borderRadius: "24px",
                                        transition: "0.2s",
                                    }}
                                >
                                    <span
                                        style={{
                                            position: "absolute",
                                            content: '""',
                                            height: "18px",
                                            width: "18px",
                                            left: attendancePolicy.allow_zoom ? "25px" : "3px",
                                            bottom: "3px",
                                            backgroundColor: "white",
                                            borderRadius: "50%",
                                            transition: "0.2s",
                                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                                        }}
                                    />
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Toggle 2: Wajib Bukti Screenshot Zoom */}
                    <div
                        style={{
                            background: attendancePolicy.require_zoom_proof ? "#f5f3ff" : "#f8fafc",
                            border: attendancePolicy.require_zoom_proof ? "1px solid #c7d2fe" : "1px solid #e2e8f0",
                            borderRadius: "8px",
                            padding: "14px 16px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                            <div>
                                <strong style={{ fontSize: "14px", color: "#1e293b", display: "block" }}>
                                    2. Wajib Lampirkan Bukti Screenshot Zoom
                                </strong>
                                <span style={{ fontSize: "12.5px", color: "#64748b", marginTop: "4px", display: "block", lineHeight: "1.4" }}>
                                    Peserta wajib melampirkan screenshot layar saat berada di room Zoom meeting (terlihat nama/muka peserta) sebagai verifikasi.
                                </span>
                            </div>
                            <label style={{ position: "relative", display: "inline-block", width: "46px", height: "24px", flexShrink: 0, cursor: "pointer" }}>
                                <input
                                    type="checkbox"
                                    checked={attendancePolicy.require_zoom_proof}
                                    onChange={(e) => setAttendancePolicy({ ...attendancePolicy, require_zoom_proof: e.target.checked })}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span
                                    style={{
                                        position: "absolute",
                                        cursor: "pointer",
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: attendancePolicy.require_zoom_proof ? "#4f46e5" : "#cbd5e1",
                                        borderRadius: "24px",
                                        transition: "0.2s",
                                    }}
                                >
                                    <span
                                        style={{
                                            position: "absolute",
                                            content: '""',
                                            height: "18px",
                                            width: "18px",
                                            left: attendancePolicy.require_zoom_proof ? "25px" : "3px",
                                            bottom: "3px",
                                            backgroundColor: "white",
                                            borderRadius: "50%",
                                            transition: "0.2s",
                                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                                        }}
                                    />
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Petunjuk / Catatan untuk Peserta */}
                <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                        Panduan / Catatan Khusus untuk Peserta saat Absen Daring:
                    </label>
                    <input
                        type="text"
                        value={attendancePolicy.zoom_note || ""}
                        onChange={(e) => setAttendancePolicy({ ...attendancePolicy, zoom_note: e.target.value })}
                        placeholder="Contoh: Lampirkan screenshot Zoom meeting dan isi keterangan agenda rapat Anda."
                        style={inputStyle}
                    />
                </div>
            </div>

            {/* Form Section */}
            <div
                ref={formSectionRef}
                style={{
                    background: "#f8fafc",
                    padding: "24px",
                    borderRadius: "12px",
                    marginBottom: "32px",
                    border: "1px solid #e2e8f0",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
                            {editingId ? "✏️ Edit Lokasi Absensi" : "➕ Tambah Titik Lokasi Baru"}
                        </h3>
                        <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#64748b" }}>
                            {editingId ? "Perbarui informasi atau batas radius lokasi ini." : "Isi form dan tentukan koordinat kantor pada peta."}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleGetGpsLocation}
                        disabled={geoLoading}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "7px",
                            background: geoLoading ? "#94a3b8" : "#0284c7",
                            color: "#ffffff",
                            padding: "9px 14px",
                            borderRadius: "6px",
                            border: "none",
                            fontSize: "13px",
                            fontWeight: "600",
                            cursor: geoLoading ? "not-allowed" : "pointer",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                        }}
                    >
                        <span>{geoLoading ? "⏳" : "🎯"}</span>
                        <span>{geoLoading ? "Mendeteksi..." : "Ambil Lokasi GPS Saya Saat Ini"}</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "16px" }}>
                        <div>
                            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                                Nama Lokasi / Kantor <span style={{ color: "#ef4444" }}>*</span>
                            </label>
                            <input
                                type="text"
                                value={form.nama_lokasi}
                                onChange={(e) => setForm({ ...form, nama_lokasi: e.target.value })}
                                placeholder="Contoh: Kantor Utama / Gedung Diskominfotik"
                                style={inputStyle}
                                required
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                                Alamat Lengkap / Keterangan
                            </label>
                            <input
                                type="text"
                                value={form.alamat}
                                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                                placeholder="Contoh: Jl. Diponegoro No. 12, Lantai 3"
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr", gap: "16px", marginBottom: "18px" }}>
                        <div>
                            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                                Latitude <span style={{ color: "#ef4444" }}>*</span>
                            </label>
                            <input
                                type="number"
                                step="any"
                                value={form.latitude}
                                onChange={(e) => handleCoordinateChange("latitude", e.target.value)}
                                placeholder="-6.200000"
                                style={inputStyle}
                                required
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                                Longitude <span style={{ color: "#ef4444" }}>*</span>
                            </label>
                            <input
                                type="number"
                                step="any"
                                value={form.longitude}
                                onChange={(e) => handleCoordinateChange("longitude", e.target.value)}
                                placeholder="106.816666"
                                style={inputStyle}
                                required
                            />
                        </div>

                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                <label style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                                    Radius Batas Absensi: <span style={{ color: "#4f46e5", fontWeight: "700" }}>{form.radius_meter} Meter</span>
                                </label>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <input
                                    type="range"
                                    min="20"
                                    max="1000"
                                    step="10"
                                    value={form.radius_meter}
                                    onChange={(e) => handleRadiusChange(e.target.value)}
                                    style={{ flex: 1, accentColor: "#4f46e5", cursor: "pointer" }}
                                />
                                <input
                                    type="number"
                                    min="10"
                                    max="10000"
                                    value={form.radius_meter}
                                    onChange={(e) => handleRadiusChange(e.target.value)}
                                    style={{ ...inputStyle, width: "85px", padding: "6px 8px", textAlign: "center" }}
                                    required
                                />
                            </div>

                            {/* Quick Presets */}
                            <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                                {[50, 100, 200, 500].map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => handleRadiusChange(preset)}
                                        style={{
                                            border: form.radius_meter === preset ? "1px solid #4f46e5" : "1px solid #cbd5e1",
                                            background: form.radius_meter === preset ? "#eef2ff" : "#ffffff",
                                            color: form.radius_meter === preset ? "#4f46e5" : "#64748b",
                                            borderRadius: "4px",
                                            padding: "3px 8px",
                                            fontSize: "11px",
                                            fontWeight: "600",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {preset}m
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Interactive Leaflet Map Picker */}
                    <div style={{ marginBottom: "20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <span style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                                🗺️ Peta Titik Lokasi & Radius Absensi (Klik peta atau seret pin untuk memindahkan)
                            </span>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>
                                Lingkaran ungu menunjukkan batas radius absensi peserta.
                            </span>
                        </div>
                        <div
                            ref={mapContainerRef}
                            id="location-map-container"
                            style={{
                                width: "100%",
                                height: "320px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                zIndex: 1,
                                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.06)",
                            }}
                        />
                    </div>

                    {/* Active Status Checkbox */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "22px" }}>
                        <input
                            type="checkbox"
                            id="is_active_checkbox"
                            checked={form.is_active}
                            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                            style={{ width: "18px", height: "18px", accentColor: "#4f46e5", cursor: "pointer" }}
                        />
                        <label htmlFor="is_active_checkbox" style={{ fontSize: "14px", fontWeight: "500", color: "#334155", cursor: "pointer" }}>
                            Aktifkan lokasi ini (peserta dapat melakukan absensi jika berada di dalam radius lokasi ini)
                        </label>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                background: isSubmitting ? "#94a3b8" : "#4f46e5",
                                color: "#ffffff",
                                padding: "11px 24px",
                                border: "none",
                                borderRadius: "6px",
                                cursor: isSubmitting ? "not-allowed" : "pointer",
                                fontWeight: "600",
                                fontSize: "14px",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                            }}
                        >
                            <span>{editingId ? "💾" : "➕"}</span>
                            <span>{isSubmitting ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan Lokasi Absensi"}</span>
                        </button>

                        {editingId && (
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                style={{
                                    background: "#ffffff",
                                    color: "#475569",
                                    padding: "11px 20px",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontWeight: "600",
                                    fontSize: "14px",
                                }}
                            >
                                Batal Edit
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Table of Configured Locations */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", background: "#ffffff" }}>
                <div
                    style={{
                        padding: "16px 20px",
                        background: "#f8fafc",
                        borderBottom: "1px solid #e2e8f0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "18px" }}>🏢</span>
                        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                            Daftar Lokasi Absensi ({locations.length} Lokasi Terdaftar)
                        </h3>
                    </div>

                    <button
                        onClick={loadLocations}
                        style={{
                            background: "transparent",
                            border: "1px solid #cbd5e1",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#475569",
                            cursor: "pointer",
                        }}
                    >
                        🔄 Refresh
                    </button>
                </div>

                {isLoading ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
                        Memuat data lokasi absensi...
                    </div>
                ) : locations.length === 0 ? (
                    <div style={{ padding: "50px 20px", textAlign: "center", color: "#64748b" }}>
                        <span style={{ fontSize: "36px", display: "block", marginBottom: "10px" }}>📍</span>
                        <strong style={{ fontSize: "16px", color: "#334155" }}>Belum ada lokasi absensi yang dibuat</strong>
                        <p style={{ margin: "6px 0 0", fontSize: "13px" }}>
                            Gunakan formulir di atas untuk menambahkan kantor atau titik lokasi absensi magang.
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                                    <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>
                                        Nama Lokasi & Alamat
                                    </th>
                                    <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>
                                        Koordinat GPS
                                    </th>
                                    <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>
                                        Radius
                                    </th>
                                    <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>
                                        Status
                                    </th>
                                    <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", textAlign: "right" }}>
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {locations.map((loc) => (
                                    <tr
                                        key={loc.id}
                                        style={{
                                            borderBottom: "1px solid #f1f5f9",
                                            background: editingId === loc.id ? "#f5f3ff" : "transparent",
                                        }}
                                    >
                                        <td style={{ padding: "16px 20px" }}>
                                            <div style={{ fontWeight: "600", color: "#0f172a", fontSize: "14px" }}>
                                                {loc.nama_lokasi}
                                            </div>
                                            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
                                                {loc.alamat || "Alamat belum diatur"}
                                            </div>
                                        </td>
                                        <td style={{ padding: "16px 20px" }}>
                                            <div style={{ fontFamily: "monospace", fontSize: "13px", color: "#334155" }}>
                                                {loc.latitude}, {loc.longitude}
                                            </div>
                                            <a
                                                href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    fontSize: "11px",
                                                    color: "#4f46e5",
                                                    textDecoration: "none",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                    marginTop: "3px",
                                                }}
                                            >
                                                <span>↗ Buka di Google Maps</span>
                                            </a>
                                        </td>
                                        <td style={{ padding: "16px 20px" }}>
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    background: "#eef2ff",
                                                    color: "#4338ca",
                                                    padding: "4px 10px",
                                                    borderRadius: "12px",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                ± {loc.radius_meter} meter
                                            </span>
                                        </td>
                                        <td style={{ padding: "16px 20px" }}>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleActive(loc.id)}
                                                title="Klik untuk ubah status aktif"
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "6px",
                                                    background: loc.is_active ? "#ecfdf5" : "#f1f5f9",
                                                    color: loc.is_active ? "#065f46" : "#64748b",
                                                    border: loc.is_active ? "1px solid #a7f3d0" : "1px solid #cbd5e1",
                                                    padding: "4px 10px",
                                                    borderRadius: "12px",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        width: "7px",
                                                        height: "7px",
                                                        borderRadius: "50%",
                                                        background: loc.is_active ? "#10b981" : "#94a3b8",
                                                    }}
                                                />
                                                <span>{loc.is_active ? "Aktif" : "Non-aktif"}</span>
                                            </button>
                                        </td>
                                        <td style={{ padding: "16px 20px", textAlign: "right" }}>
                                            <div style={{ display: "inline-flex", gap: "8px" }}>
                                                <button
                                                    onClick={() => handleEdit(loc)}
                                                    style={{
                                                        background: "#f1f5f9",
                                                        border: "1px solid #cbd5e1",
                                                        color: "#334155",
                                                        padding: "6px 12px",
                                                        borderRadius: "6px",
                                                        fontSize: "12px",
                                                        fontWeight: "600",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(loc.id, loc.nama_lokasi)}
                                                    style={{
                                                        background: "#fef2f2",
                                                        border: "1px solid #fecaca",
                                                        color: "#dc2626",
                                                        padding: "6px 12px",
                                                        borderRadius: "6px",
                                                        fontSize: "12px",
                                                        fontWeight: "600",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
