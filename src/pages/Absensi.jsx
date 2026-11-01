import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function Absensi() {
    const navigate = useNavigate();
    const [participant, setParticipant] = useState(null);
    const [data, setData] = useState(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);
    const [downloadingLetter, setDownloadingLetter] = useState(false);
    const [clock, setClock] = useState(new Date());
    const [checkoutTime, setCheckoutTime] = useState("17:00");
    const [attendanceStatus, setAttendanceStatus] = useState("Hadir");
    const [keterangan, setKeterangan] = useState("");

    // Kebijakan absensi daring / Zoom
    const [policy, setPolicy] = useState({
        allow_zoom: true,
        require_zoom_proof: true,
        zoom_note: "",
    });
    const [zoomFile, setZoomFile] = useState(null);
    const [zoomPreview, setZoomPreview] = useState(null);

    // Geofencing state
    const [offices, setOffices] = useState([]);
    const [userCoords, setUserCoords] = useState(null);
    const [locationLoading, setLocationLoading] = useState(true);
    const [locationError, setLocationError] = useState("");
    const [locationStatus, setLocationStatus] = useState({
        hasOffices: false,
        isWithinRadius: false,
        closestOffice: null,
        distance: null,
    });

    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setZoomFile(file);
            setZoomPreview(URL.createObjectURL(file));
        } else {
            setZoomFile(null);
            setZoomPreview(null);
        }
    };

    const handleDownloadReplyLetter = async () => {
        setDownloadingLetter(true);
        try {
            const response = await api.get('/pendaftaran/me/surat-balasan/download', {
                responseType: 'blob',
            });
            const url = URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'surat-balasan-magang.pdf';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 30000);
            setError("");
            window.location.reload();
        } catch (downloadError) {
            alert(downloadError.response?.status === 404
                ? "Berkas surat balasan belum tersedia di server. Silakan hubungi admin."
                : "Gagal mengunduh surat balasan. Silakan coba lagi.");
        } finally {
            setDownloadingLetter(false);
        }
    };

    const detectLocation = () => {
        if (!navigator.geolocation) {
            setLocationError("Browser Anda tidak mendukung deteksi lokasi (Geolocation).");
            setLocationLoading(false);
            return;
        }

        setLocationLoading(true);
        setLocationError("");

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords = {
                    latitude: Number(pos.coords.latitude.toFixed(6)),
                    longitude: Number(pos.coords.longitude.toFixed(6)),
                    accuracy: Math.round(pos.coords.accuracy),
                };
                setUserCoords(coords);
                setLocationLoading(false);
            },
            (err) => {
                setLocationLoading(false);
                let msg = "Gagal mengambil lokasi GPS.";
                if (err.code === 1) {
                    msg = "Izin akses lokasi GPS ditolak oleh browser. Mohon aktifkan izin lokasi agar sistem dapat memverifikasi kehadiran Anda di kantor.";
                } else if (err.code === 2) {
                    msg = "Sinyal GPS atau titik lokasi tidak tersedia.";
                } else if (err.code === 3) {
                    msg = "Waktu permintaan lokasi habis. Silakan klik Perbarui Lokasi.";
                }
                setLocationError(msg);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    };

    // Load active office locations
    const loadOfficeLocations = async () => {
        try {
            const res = await api.get("/lokasi-absensi");
            const activeLocations = res.data.data || [];
            setOffices(activeLocations);
        } catch (err) {
            console.error("Gagal memuat daftar lokasi kantor:", err);
        }
    };

    // Load attendance policy
    const loadAttendancePolicy = async () => {
        try {
            const res = await api.get("/pengaturan-absensi");
            if (res.data?.data) {
                setPolicy(res.data.data);
            }
        } catch (err) {
            console.error("Gagal memuat kebijakan absensi:", err);
        }
    };

    useEffect(() => {
        let cancelled = false;

        const loadProfile = async () => {
            try {
                const response = await api.get("/me");
                const user = response.data?.data;
                let profile = user?.magang || null;

                if (!profile) {
                    const registrationResponse = await api.get("/pendaftaran/me");
                    const registration = registrationResponse.data?.data;
                    if (registration?.status === "Pemagang Aktif") {
                        profile = {
                            participant_name: user?.name || user?.nama || "Peserta Magang",
                            participant_code: null,
                            institution: registration.asal_instansi,
                        };
                    }
                }

                if (cancelled) return;
                setParticipant(profile);

                if (!profile) {
                    setError("Akun peserta bersama tidak dapat dipakai untuk absensi pribadi. Keluar dan masuk dengan NPM/NIM serta password akun pribadi Anda.");
                    return;
                }

                const attendanceResponse = await api.get("/absensi/hari-ini");
                if (cancelled) return;
                const scheduleResponse = await api.get("/absensi/jadwal");
                if (cancelled) return;
                setCheckoutTime(scheduleResponse.data?.data?.jam_pulang || "17:00");
                const attendance = attendanceResponse.data;
                if (attendance && typeof attendance === "object" && attendance.id) {
                    setData(attendance);
                    if (attendance.approval_status) {
                        setAttendanceStatus("Izin");
                        setMessage(
                            attendance.approval_status === "pending"
                                ? "Permohonan izin sedang menunggu persetujuan pembimbing."
                                : attendance.approval_status === "approved"
                                    ? "Permohonan izin sudah disetujui pembimbing."
                                    : "Permohonan izin ditolak pembimbing."
                        );
                    } else if (attendance.status) {
                        setAttendanceStatus(attendance.status);
                    }
                    if (attendance.keterangan) setKeterangan(attendance.keterangan);
                } else {
                    setData(null);
                    setMessage("");
                }
            } catch (requestError) {
                if (!cancelled) {
                    setError(requestError.response?.data?.message || "Profil atau data absensi belum dapat dimuat.");
                    setData(null);
                }
            } finally {
                if (!cancelled) setProfileLoading(false);
            }
        };

        void loadProfile();
        void loadOfficeLocations();
        void loadAttendancePolicy();
        detectLocation();

        const timer = setInterval(() => setClock(new Date()), 1000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, []);

    useEffect(() => {
        if (profileLoading || !participant || data) return;

        let cancelled = false;
        const refreshAttendance = async () => {
            try {
                const response = await api.get("/absensi/hari-ini");
                if (cancelled) return;

                const attendance = response.data;
                if (attendance && typeof attendance === "object" && attendance.id) {
                    setError("");
                    setData(attendance);
                    setAttendanceStatus(attendance.status || "Hadir");
                    if (attendance.keterangan) setKeterangan(attendance.keterangan);
                } else {
                    setData(null);
                }
            } catch (requestError) {
                if (!cancelled) {
                    setError(requestError.response?.data?.message || "Status absensi belum dapat diperbarui.");
                }
            }
        };

        void refreshAttendance();
        const timer = setInterval(() => void refreshAttendance(), 15000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [data, participant, profileLoading]);

    // Calculate geofence distance whenever userCoords or offices change
    useEffect(() => {
        if (offices.length === 0) {
            setLocationStatus({
                hasOffices: false,
                isWithinRadius: true,
                closestOffice: null,
                distance: null,
            });
            return;
        }

        if (!userCoords) {
            setLocationStatus({
                hasOffices: true,
                isWithinRadius: false,
                closestOffice: offices[0] || null,
                distance: null,
            });
            return;
        }

        let minDistance = Infinity;
        let closest = offices[0] || null;
        let matchedOffice = null;

        for (const office of offices) {
            const dist = calculateHaversineDistance(
                userCoords.latitude,
                userCoords.longitude,
                Number(office.latitude),
                Number(office.longitude)
            );
            const radius = Number(office.radius_meter) || 100;

            if (dist <= radius) {
                if (!matchedOffice || dist < minDistance) {
                    matchedOffice = office;
                    minDistance = dist;
                    closest = office;
                }
            } else if (!matchedOffice && dist < minDistance) {
                minDistance = dist;
                closest = office;
            }
        }

        const isWithin = matchedOffice !== null;
        const targetOffice = matchedOffice || closest;

        setLocationStatus({
            hasOffices: true,
            isWithinRadius: isWithin,
            closestOffice: targetOffice,
            distance: Math.round(minDistance),
        });
    }, [userCoords, offices]);

    // Render / update Leaflet mini map
    useEffect(() => {
        if (!mapContainerRef.current || !userCoords || !locationStatus.closestOffice) {
            return;
        }

        const userLat = userCoords.latitude;
        const userLng = userCoords.longitude;
        const officeLat = Number(locationStatus.closestOffice.latitude);
        const officeLng = Number(locationStatus.closestOffice.longitude);
        const radius = Number(locationStatus.closestOffice.radius_meter) || 100;

        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        const map = L.map(mapContainerRef.current, {
            center: [userLat, userLng],
            zoom: 16,
            zoomControl: false,
            attributionControl: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
        }).addTo(map);

        const officeIcon = L.divIcon({
            className: "office-marker",
            html: `
                <div style="
                    width: 28px;
                    height: 28px;
                    background: #4f46e5;
                    color: #fff;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    border: 2px solid #ffffff;
                ">
                    <span style="font-size: 13px;">🏢</span>
                </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
        });

        const boundsPoints = [[userLat, userLng]];

        // Render every active office circle and pin
        offices.forEach((office) => {
            const oLat = Number(office.latitude);
            const oLng = Number(office.longitude);
            const oRad = Number(office.radius_meter) || 100;
            const isClosest = locationStatus.closestOffice?.id === office.id;

            L.circle([oLat, oLng], {
                radius: oRad,
                color: isClosest ? "#4f46e5" : "#94a3b8",
                fillColor: isClosest ? "#818cf8" : "#cbd5e1",
                fillOpacity: isClosest ? 0.22 : 0.12,
                weight: isClosest ? 2 : 1.5,
                dashArray: "3, 5",
            }).addTo(map);

            L.marker([oLat, oLng], { icon: officeIcon })
                .bindPopup(`<b>${office.nama_lokasi}</b><br>Radius: ${oRad}m${isClosest ? "<br><i>(Lokasi Anda / Terdekat)</i>" : ""}`)
                .addTo(map);

            boundsPoints.push([oLat, oLng]);
        });

        // User pin
        const userIcon = L.divIcon({
            className: "user-marker",
            html: `
                <div style="
                    width: 26px;
                    height: 26px;
                    background: #0284c7;
                    color: #fff;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0 0 4px rgba(2, 132, 199, 0.3);
                    border: 2px solid #ffffff;
                ">
                    <span style="font-size: 12px;">👤</span>
                </div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
        });

        L.marker([userLat, userLng], { icon: userIcon })
            .bindPopup("<b>Posisi Anda Saat Ini</b>")
            .addTo(map);

        // Fit bounds for user and all active offices
        const bounds = L.latLngBounds(boundsPoints);
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 17 });

        mapInstanceRef.current = map;

        setTimeout(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.invalidateSize();
            }
        }, 200);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [userCoords, locationStatus.closestOffice]);

    const submitAttendance = async (type) => {
        if (!participant) {
            setError("Akun peserta belum terhubung ke NPM/NIM.");
            return;
        }

        const isZoom = attendanceStatus === "Zoom";

        if (type === "in" && isZoom) {
            if (policy.require_zoom_proof && !zoomFile) {
                setError("Wajib melampirkan screenshot layar Zoom meeting sebagai bukti kehadiran daring.");
                return;
            }
        } else if (type === "in" && attendanceStatus !== "Hadir" && !keterangan.trim()) {
            setError(`Mohon isi keterangan/alasan untuk status ${attendanceStatus}.`);
            return;
        }

        // Verifikasi lokasi kantor jika status adalah "Hadir" WFO
        if (attendanceStatus === "Hadir" && locationStatus.hasOffices) {
            if (locationLoading) {
                setError("Sedang memverifikasi lokasi GPS Anda. Mohon tunggu sebentar...");
                return;
            }
            if (locationError || !userCoords) {
                setError("Akses lokasi GPS diperlukan untuk absensi Hadir di kantor. Mohon izinkan akses lokasi di browser Anda.");
                return;
            }
            if (!locationStatus.isWithinRadius) {
                setError(
                    `Anda tidak dapat melakukan absensi Hadir di kantor karena berada di luar batas radius (${locationStatus.distance} meter dari ${locationStatus.closestOffice?.nama_lokasi}, maksimal ${locationStatus.closestOffice?.radius_meter} meter). Jika Anda sedang mengikuti rapat online, pilih opsi 'Hadir Daring (Zoom)'.`
                );
                return;
            }
        }

        // Verifikasi saat checkout untuk absensi Hadir WFO (jika bukan Zoom)
        const isZoomAttendance = String(data?.keterangan || "").includes("[ZOOM");
        if (type === "out" && data?.status === "Hadir" && !isZoomAttendance && locationStatus.hasOffices) {
            if (locationError || !userCoords) {
                setError("Akses lokasi GPS diperlukan untuk absensi pulang. Mohon aktifkan GPS.");
                return;
            }
            if (!locationStatus.isWithinRadius) {
                setError(
                    `Absensi pulang ditolak karena Anda berada di luar radius kantor (${locationStatus.distance} meter dari ${locationStatus.closestOffice?.nama_lokasi}).`
                );
                return;
            }
        }

        setLoading(true);
        setMessage("");
        setError("");
        try {
            const endpoint = type === "in" ? "/absensi/masuk" : "/absensi/pulang";
            let payload;
            let headers = {};

            if (type === "in") {
                const formData = new FormData();
                if (isZoom) {
                    formData.append("status", "Hadir");
                    formData.append("tipe_kehadiran", "Zoom");
                } else {
                    formData.append("status", attendanceStatus);
                    formData.append("tipe_kehadiran", "WFO");
                }
                formData.append("keterangan", keterangan);
                if (userCoords?.latitude) formData.append("latitude", userCoords.latitude);
                if (userCoords?.longitude) formData.append("longitude", userCoords.longitude);
                if (zoomFile) formData.append("foto", zoomFile);

                payload = formData;
                headers = { "Content-Type": "multipart/form-data" };
            } else {
                payload = {
                    latitude: userCoords?.latitude || null,
                    longitude: userCoords?.longitude || null,
                };
            }

            const response = await api.post(endpoint, payload, { headers });
            setMessage(response.data.message);
            setData(response.data.data);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Absensi gagal dicatat.");
            if (requestError.response?.data?.data && requestError.response.data.data.id) {
                setData(requestError.response.data.data);
            }
        } finally {
            setLoading(false);
        }
    };

    const dateLabel = clock.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const beforeCheckInTime = clock.getHours() < 8;
    const beforeCheckoutTime = clock.toTimeString().slice(0, 5) < checkoutTime;
    const isZoomAttendance = String(data?.keterangan || "").includes("[ZOOM");
    const isZoom = attendanceStatus === "Zoom";
    const displayedStatus =
        data?.approval_status === "pending"
            ? "Menunggu persetujuan"
            : data?.approval_status === "approved"
            ? "Izin disetujui"
            : data?.approval_status === "rejected"
            ? "Alpa"
            : data?.status === "Hadir" && isZoomAttendance
            ? "Hadir Daring (Zoom)"
            : data?.status || "Belum hadir";

    // Can check in?
    const isCheckInDisabled =
        loading ||
        !!data ||
        (attendanceStatus === "Hadir" && locationStatus.hasOffices && (!locationStatus.isWithinRadius || locationLoading || !!locationError)) ||
        (isZoom && policy.require_zoom_proof && !zoomFile);

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                <Navbar />
                <main className="main">
                    <div className="page-heading">
                        <div>
                            <p className="eyebrow">PORTAL PESERTA</p>
                            <h1>Absensi Harian</h1>
                            <p className="subtitle">Catat jam masuk dan jam pulang sesuai jadwal operasional kantor atau kegiatan Zoom.</p>
                        </div>
                        <div className="live-clock">
                            <strong>{clock.toLocaleTimeString("id-ID")}</strong>
                            <span>{dateLabel}</span>
                        </div>
                    </div>

                    <section className="attendance-box">
                        <div className="attendance-profile-box">
                            <div>
                                <p className="eyebrow">AKUN PESERTA</p>
                                <h2>{profileLoading ? "Memuat profil..." : participant?.participant_name || "Akun belum terhubung"}</h2>
                                {participant?.participant_code && <p className="subtitle">NPM: {participant.participant_code}</p>}
                            </div>
                        </div>

                        {!profileLoading && !participant ? (
                            <div className="alert-card error" style={{ marginTop: "16px" }}>
                                <p><strong>Akun Anda belum terhubung dengan data magang.</strong></p>
                                <p>Silakan keluar dan masuk kembali memakai NPM yang valid atau selesaikan pendaftaran magang terlebih dahulu.</p>
                            </div>
                        ) : (
                            <>
                                <div className="attendance-status-box">
                                    <div>
                                        <p className="eyebrow">STATUS HARI INI</p>
                                        <h2 className={data?.status === "Hadir" || data?.approval_status === "approved" ? "hadir" : data?.status === "Alpa" || data?.approval_status === "rejected" ? "alpa-status" : "muted-status"}>{displayedStatus}</h2>
                                        {data?.keterangan && <p style={{ marginTop: "5px", fontSize: "14px", color: data?.status === "Alpa" ? "#ef4444" : "#666" }}>Catatan: {data.keterangan}</p>}
                                    </div>
                                </div>

                                <label className="attendance-status-select">
                                    Status kehadiran
                                    <select 
                                        value={attendanceStatus} 
                                        onChange={(event) => setAttendanceStatus(event.target.value)} 
                                        disabled={loading || !!data?.id}
                                    >
                                        <option value="Hadir">Hadir (Wajib di Area Kantor)</option>
                                        {policy.allow_zoom && <option value="Zoom">Hadir Daring (Zoom)</option>}
                                        <option value="Izin">Izin (perlu persetujuan pembimbing)</option>
                                        <option value="Sakit">Sakit</option>
                                        <option value="Alpa">Alpa</option>
                                    </select>
                                    {attendanceStatus === "Izin" && !data && (
                                        <small className="attendance-hint">
                                            Status izin baru tercatat setelah disetujui pembimbing. Permohonan izin dapat diajukan tanpa batasan lokasi kantor.
                                        </small>
                                    )}
                                </label>

                                {/* Form Khusus Mode Zoom: Upload Bukti & Agenda */}
                                {attendanceStatus === "Zoom" && !data && (
                                    <div
                                        style={{
                                            marginTop: "16px",
                                            padding: "16px 18px",
                                            background: "#f5f3ff",
                                            border: "1px dashed #818cf8",
                                            borderRadius: "10px",
                                        }}
                                    >
                                        <label style={{ display: "block", fontWeight: "700", fontSize: "13.5px", color: "#312e81", marginBottom: "4px" }}>
                                            📸 Unggah Bukti Screenshot Layar Zoom Meeting {policy.require_zoom_proof && <span style={{ color: "#ef4444" }}>*</span>}
                                        </label>
                                        <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#6366f1" }}>
                                            Lampirkan tangkapan layar saat Anda berada di room rapat Zoom (terlihat nama/wajah dan jam).
                                        </p>

                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            disabled={loading || !!data}
                                            style={{
                                                display: "block",
                                                width: "100%",
                                                fontSize: "13px",
                                                color: "#334155",
                                                cursor: "pointer",
                                            }}
                                            required={policy.require_zoom_proof}
                                        />

                                        {zoomPreview && (
                                            <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
                                                <img
                                                    src={zoomPreview}
                                                    alt="Preview Bukti Zoom"
                                                    style={{ width: "90px", height: "60px", objectFit: "cover", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                                />
                                                <span style={{ fontSize: "12px", color: "#065f46", fontWeight: "600" }}>
                                                    ✓ Berkas terpilih: {zoomFile?.name}
                                                </span>
                                            </div>
                                        )}

                                        <div style={{ marginTop: "14px" }}>
                                            <label style={{ display: "block", fontWeight: "600", fontSize: "13px", color: "#334155", marginBottom: "4px" }}>
                                                Agenda / Topik Pertemuan Zoom:
                                            </label>
                                            <input
                                                type="text"
                                                value={keterangan}
                                                onChange={(e) => setKeterangan(e.target.value)}
                                                placeholder="Contoh: Rapat koordinasi mingguan bersama pembimbing"
                                                disabled={loading || !!data}
                                                style={{
                                                    width: "100%",
                                                    padding: "8px 12px",
                                                    borderRadius: "6px",
                                                    border: "1px solid #cbd5e1",
                                                    fontSize: "13px",
                                                    boxSizing: "border-box",
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {attendanceStatus !== "Hadir" && attendanceStatus !== "Zoom" && (
                                    <label className="attendance-status-select">
                                        Keterangan / Alasan
                                        <textarea 
                                            value={keterangan} 
                                            onChange={(e) => setKeterangan(e.target.value)} 
                                            placeholder={`Masukkan alasan kenapa Anda ${attendanceStatus.toLowerCase()}...`}
                                            disabled={loading || !!data?.id}
                                            className="attendance-reason"
                                            required
                                        ></textarea>
                                    </label>
                                )}

                                {/* WIDGET CEK LOKASI GPS (GEOFENCE) */}
                                <div
                                    style={{
                                        marginTop: "20px",
                                        padding: "16px",
                                        borderRadius: "10px",
                                        border: "1px solid #e2e8f0",
                                        background: "#f8fafc",
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span style={{ fontSize: "16px" }}>📍</span>
                                            <strong style={{ fontSize: "13.5px", color: "#1e293b" }}>
                                                Verifikasi Lokasi Absensi
                                            </strong>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={detectLocation}
                                            disabled={locationLoading}
                                            style={{
                                                background: "#ffffff",
                                                border: "1px solid #cbd5e1",
                                                borderRadius: "6px",
                                                padding: "5px 10px",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                color: "#475569",
                                                cursor: locationLoading ? "wait" : "pointer",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "4px",
                                            }}
                                        >
                                            <span>{locationLoading ? "⏳" : "🔄"}</span>
                                            <span>{locationLoading ? "Mendeteksi..." : "Perbarui Lokasi GPS"}</span>
                                        </button>
                                    </div>

                                    {locationLoading && (
                                        <div style={{ padding: "12px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                                            📡 Mendeteksi koordinat GPS perangkat Anda...
                                        </div>
                                    )}

                                    {!locationLoading && locationError && (
                                        <div
                                            style={{
                                                padding: "12px 14px",
                                                background: "#fef2f2",
                                                border: "1px solid #fecaca",
                                                borderRadius: "8px",
                                                color: "#991b1b",
                                                fontSize: "13px",
                                                lineHeight: "1.5",
                                            }}
                                        >
                                            <strong>⚠️ Lokasi GPS Belum Terdeteksi:</strong> {locationError}
                                        </div>
                                    )}

                                    {!locationLoading && !locationError && locationStatus.hasOffices && (
                                        <div>
                                            {attendanceStatus === "Zoom" ? (
                                                <div
                                                    style={{
                                                        padding: "12px 14px",
                                                        borderRadius: "8px",
                                                        background: "#e0e7ff",
                                                        border: "1px solid #c7d2fe",
                                                        color: "#3730a3",
                                                        fontSize: "13px",
                                                        lineHeight: "1.5",
                                                        marginBottom: "12px",
                                                    }}
                                                >
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", marginBottom: "4px" }}>
                                                        <span>📹</span>
                                                        <span>Mode Daring (Zoom / WFH): Bebas Batas Radius Kantor</span>
                                                    </div>
                                                    <div>
                                                        Anda diperbolehkan absen dari jarak jauh (posisi Anda saat ini: <strong>±{locationStatus.distance ?? "-"} meter</strong> dari kantor). Koordinat GPS tetap dicatat untuk transparansi data kehadiran.
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    style={{
                                                        padding: "12px 14px",
                                                        borderRadius: "8px",
                                                        background: locationStatus.isWithinRadius ? "#ecfdf5" : "#fef2f2",
                                                        border: `1px solid ${locationStatus.isWithinRadius ? "#a7f3d0" : "#fecaca"}`,
                                                        color: locationStatus.isWithinRadius ? "#065f46" : "#991b1b",
                                                        fontSize: "13px",
                                                        lineHeight: "1.5",
                                                        marginBottom: "12px",
                                                    }}
                                                >
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", marginBottom: "4px" }}>
                                                        <span>{locationStatus.isWithinRadius ? "✓" : "⛔"}</span>
                                                        <span>
                                                            {locationStatus.isWithinRadius
                                                                ? "Lokasi Sah: Anda Berada di Area Kantor"
                                                                : "Lokasi Tidak Sah: Anda di Luar Radius Kantor"}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        {locationStatus.isWithinRadius ? (
                                                            <span>
                                                                Jarak Anda saat ini <strong>±{locationStatus.distance} meter</strong> dari{" "}
                                                                <strong>{locationStatus.closestOffice?.nama_lokasi}</strong> (Batas toleransi:{" "}
                                                                {locationStatus.closestOffice?.radius_meter} meter). Anda dapat melakukan absensi.
                                                            </span>
                                                        ) : (
                                                            <span>
                                                                Jarak Anda saat ini <strong>±{locationStatus.distance} meter</strong> dari kantor{" "}
                                                                <strong>{locationStatus.closestOffice?.nama_lokasi}</strong>. Batas maksimal radius adalah{" "}
                                                                <strong>{locationStatus.closestOffice?.radius_meter} meter</strong>. Silakan mendekat ke area kantor untuk absen Hadir WFO, atau pilih mode <strong>Hadir Daring (Zoom)</strong> jika sedang rapat daring.
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Mini Map Preview */}
                                            {userCoords && (
                                                <div>
                                                    <div
                                                        ref={mapContainerRef}
                                                        id="user-location-map"
                                                        style={{
                                                            width: "100%",
                                                            height: "190px",
                                                            borderRadius: "8px",
                                                            border: "1px solid #cbd5e1",
                                                            zIndex: 1,
                                                        }}
                                                    />
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", fontSize: "11px", color: "#64748b" }}>
                                                        <span>🔵 Pin Biru: Posisi Anda &nbsp;|&nbsp; 🏢 Pin Ungu: Kantor ({locationStatus.closestOffice?.radius_meter}m radius)</span>
                                                        <span>Akurasi GPS: ±{userCoords.accuracy}m</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {!locationLoading && !locationError && !locationStatus.hasOffices && (
                                        <div style={{ padding: "10px", color: "#475569", fontSize: "13px" }}>
                                            ℹ️ Tidak ada pembatasan radius lokasi kantor yang aktif saat ini.
                                        </div>
                                    )}
                                </div>

                                <div className="time-container attendance-time-container">
                                    <div className="time-box">
                                        <span>JAM MASUK</span>
                                        <strong>{data?.jam_masuk || "--:--"}</strong>
                                        <small className="time-note">
                                            {data?.status === "Alpa"
                                                ? "Ditandai Alpa otomatis (tidak hadir seharian)"
                                                : data?.approval_status === "pending"
                                                ? "Menunggu keputusan pembimbing"
                                                : data?.jam_masuk
                                                ? "Waktu masuk tercatat"
                                                : isZoom
                                                ? policy.require_zoom_proof && !zoomFile
                                                    ? "Wajib pilih foto screenshot Zoom"
                                                    : "Siap melakukan absensi daring (Zoom)"
                                                : attendanceStatus === "Hadir"
                                                ? beforeCheckInTime
                                                    ? "Absen masuk aktif mulai pukul 08:00"
                                                    : locationStatus.hasOffices && !locationStatus.isWithinRadius
                                                    ? "Terkunci: Anda berada di luar area kantor"
                                                    : "Belum melakukan absen masuk"
                                                : `Status ${attendanceStatus.toLowerCase()} tidak memakai jam masuk`}
                                        </small>

                                        <button
                                            type="button"
                                            onClick={() => submitAttendance("in")}
                                            disabled={loading || !!data?.id || (isZoom && policy.require_zoom_proof && !zoomFile) || (attendanceStatus === "Hadir" && (beforeCheckInTime || (locationStatus.hasOffices && !locationStatus.isWithinRadius)))}
                                            className={attendanceStatus === "Hadir" && (beforeCheckInTime || (locationStatus.hasOffices && !locationStatus.isWithinRadius)) && !data?.id ? "btn-secondary" : "btn-attendance-in"}
                                            style={
                                                attendanceStatus === "Hadir" && locationStatus.hasOffices && !locationStatus.isWithinRadius && !data
                                                    ? { background: "#cbd5e1", color: "#64748b", cursor: "not-allowed" }
                                                    : {}
                                            }
                                        >
                                            {data?.approval_status === "pending"
                                                ? "Menunggu persetujuan"
                                                : data?.approval_status === "approved"
                                                ? "Izin disetujui"
                                                : data?.approval_status === "rejected"
                                                ? "Izin ditolak"
                                                : data?.status === "Alpa"
                                                ? "Tidak hadir (Alpa)"
                                                : data?.id
                                                ? "Sudah tercatat"
                                                : isZoom
                                                ? "Absen Masuk (Zoom)"
                                                : attendanceStatus === "Hadir"
                                                ? beforeCheckInTime
                                                    ? "Belum Buka (08:00)"
                                                    : locationStatus.hasOffices && !locationStatus.isWithinRadius
                                                    ? "Di Luar Area Kantor"
                                                    : "Absen masuk"
                                                : `Kirim Status ${attendanceStatus}`}
                                        </button>
                                    </div>

                                    <div className="time-box checkout">
                                        <span>JAM PULANG</span>
                                        <strong>{data?.jam_pulang || "--:--"}</strong>
                                        <small className="time-note">
                                            {data?.status === "Alpa"
                                                ? "Ditandai Alpa otomatis (tidak hadir seharian)"
                                                : data?.jam_pulang
                                                ? "Waktu pulang tercatat"
                                                : beforeCheckoutTime
                                                ? `Absen pulang aktif mulai pukul ${checkoutTime}`
                                                : data?.jam_masuk
                                                ? `Absen pulang telah dibuka (mulai pukul ${checkoutTime})`
                                                : "Aktif setelah absen masuk"}
                                        </small>
                                        <button
                                            type="button"
                                            onClick={() => submitAttendance("out")}
                                            disabled={
                                                loading ||
                                                !data?.jam_masuk ||
                                                !!data?.jam_pulang ||
                                                beforeCheckoutTime ||
                                                data?.status === "Alpa" ||
                                                (!isZoomAttendance && data?.status === "Hadir" && locationStatus.hasOffices && !locationStatus.isWithinRadius)
                                            }
                                            className={data?.jam_pulang || beforeCheckoutTime || data?.status === "Alpa" ? "btn-secondary" : "btn-success"}
                                            style={
                                                (beforeCheckoutTime || data?.status === "Alpa") && !data?.jam_pulang
                                                    ? { opacity: 0.6, cursor: "not-allowed", background: "#e2e8f0", color: "#64748b" }
                                                    : {}
                                            }
                                        >
                                            {data?.status === "Alpa" ? "Tidak hadir (Alpa)" : data?.jam_pulang ? "Sudah tercatat" : "Absen pulang"}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {error && (
                            <div
                                className="message error"
                                role="alert"
                                style={{
                                    marginTop: "20px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                    gap: "12px",
                                }}
                            >
                                <span>{error}</span>
                                {error.toLowerCase().includes("surat balasan") && (
                                    <button
                                        type="button"
                                        onClick={handleDownloadReplyLetter}
                                        disabled={downloadingLetter}
                                        style={{
                                            background: "#16a34a",
                                            color: "#ffffff",
                                            padding: "8px 16px",
                                            border: "none",
                                            borderRadius: "6px",
                                            fontWeight: "600",
                                            cursor: downloadingLetter ? "wait" : "pointer",
                                            fontSize: "13px",
                                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {downloadingLetter ? "Mengunduh..." : "📥 Unduh Surat Balasan Sekarang"}
                                    </button>
                                )}
                            </div>
                        )}

                        {!profileLoading && !participant && (
                            <button
                                type="button"
                                onClick={() => {
                                    localStorage.removeItem("token");
                                    localStorage.removeItem("user");
                                    navigate("/login");
                                }}
                                style={{
                                    marginTop: "12px",
                                    border: "none",
                                    background: "#4f46e5",
                                    color: "#fff",
                                    padding: "10px 14px",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    fontWeight: "600",
                                }}
                            >
                                Keluar dan masuk memakai NPM/NIM pribadi
                            </button>
                        )}

                        {message && !error && (
                            <div className="message" role="status" style={{ marginTop: "20px" }}>
                                {message}
                            </div>
                        )}
                    </section>

                    {participant && (
                        <div className="history-link">
                            <span>Perlu melihat kehadiran sebelumnya?</span>
                            <Link to="/riwayat">Buka riwayat absensi →</Link>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default Absensi;
