import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { API_BASE_URL } from "../config/api";

function getPhotoUrl(photo) {
    if (!photo) return null;
    if (/^https?:\/\//i.test(photo) || String(photo).startsWith("data:") || String(photo).startsWith("blob:")) return photo;
    const path = String(photo).replace(/^\/+/, "").replace(/^storage\//, "");
    return `${API_BASE_URL.replace(/\/api\/?$/, "")}/storage/${path}`;
}

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
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    });
    const [photoError, setPhotoError] = useState(false);
    const [participant, setParticipant] = useState(null);

    useEffect(() => {
        setPhotoError(false);
    }, [currentUser?.foto, participant?.foto]);
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

    useEffect(() => {
        const handleProfileUpdated = (event) => {
            if (event.detail?.user) {
                setCurrentUser(event.detail.user);
            }
        };
        window.addEventListener("user-profile-updated", handleProfileUpdated);
        return () => window.removeEventListener("user-profile-updated", handleProfileUpdated);
    }, []);

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
                if (user) {
                    setCurrentUser(user);
                }
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

    const photoUrl = getPhotoUrl(currentUser?.foto || participant?.foto);

    return (
        <div className="layout" style={{ background: "#f8fafc", minHeight: "100vh" }}>
            <Sidebar />
            <div className="content">
                <Navbar />
                <main className="main participant-page-container">
                    {/* Header Halaman */}
                    <div className="page-heading">
                        <div>
                            <div className="eyebrow">
                                <span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: "#6366f1", marginRight: "6px" }}></span>
                                PRESENSI KEHADIRAN
                            </div>
                            <h1>Absensi Harian</h1>
                            <p className="subtitle">Catat jam masuk dan jam pulang sesuai jadwal operasional kantor atau kegiatan daring Zoom.</p>
                        </div>
                        <div className="live-clock">
                            <strong>{clock.toLocaleTimeString("id-ID")}</strong>
                            <span>{dateLabel}</span>
                        </div>
                    </div>

                    {/* Ringkasan Profil & Status Hari Ini */}
                    <div className="attendance-top-summary">
                        <div className="attendance-user-strip">
                            <div className="attendance-avatar-circle">
                                {photoUrl && !photoError ? (
                                    <img
                                        src={photoUrl}
                                        alt="Foto Profil"
                                        onError={(e) => {
                                            const relativeUrl = `/storage/${String(currentUser?.foto || participant?.foto || "").replace(/^\/+/, "").replace(/^storage\//, "")}`;
                                            if (e.currentTarget.dataset.triedRelative !== "true" && e.currentTarget.src !== window.location.origin + relativeUrl) {
                                                e.currentTarget.dataset.triedRelative = "true";
                                                e.currentTarget.src = relativeUrl;
                                            } else {
                                                setPhotoError(true);
                                            }
                                        }}
                                    />
                                ) : (
                                    <span>{String(participant?.participant_name || currentUser?.name || currentUser?.nama || "P").trim().charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            <div>
                                <span className="attendance-meta-label">AKUN PESERTA MAGANG</span>
                                <h2 className="attendance-user-name">
                                    {profileLoading ? "Memuat profil..." : participant?.participant_name || "Akun belum terhubung"}
                                </h2>
                                {participant?.participant_code && (
                                    <span className="attendance-meta-npm">NPM: {participant.participant_code}</span>
                                )}
                            </div>
                        </div>
                        <div className="attendance-status-pill-box">
                            <span className="attendance-meta-label" style={{ textAlign: "right" }}>STATUS HARI INI</span>
                            <div>
                                <span className={`attendance-badge-lg ${
                                    data?.status === "Hadir" || data?.approval_status === "approved"
                                        ? "badge-success"
                                        : data?.status === "Alpa" || data?.approval_status === "rejected"
                                        ? "badge-danger"
                                        : "badge-neutral"
                                }`}>
                                    <span style={{
                                        display: "inline-block",
                                        width: "8px",
                                        height: "8px",
                                        borderRadius: "50%",
                                        background: data?.status === "Hadir" || data?.approval_status === "approved" ? "#22c55e" : data?.status === "Alpa" || data?.approval_status === "rejected" ? "#ef4444" : "#94a3b8"
                                    }}></span>
                                    {displayedStatus}
                                </span>
                            </div>
                            {data?.keterangan && (
                                <small style={{ display: "block", marginTop: "4px", fontSize: "12px", color: "#64748b" }}>
                                    Catatan: {data.keterangan}
                                </small>
                            )}
                        </div>
                    </div>

                    {!profileLoading && !participant ? (
                        <div className="alert-card error" style={{ marginBottom: "20px" }}>
                            <p><strong>Akun Anda belum terhubung dengan data magang.</strong></p>
                            <p>Silakan keluar dan masuk kembali memakai NPM yang valid atau selesaikan pendaftaran magang terlebih dahulu.</p>
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
                                    padding: "8px 16px",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    fontWeight: "600",
                                    fontSize: "13px",
                                }}
                            >
                                Keluar dan masuk memakai NPM/NIM pribadi
                            </button>
                        </div>
                    ) : (
                        <div className="attendance-grid-layout">
                            {/* KOLOM KIRI: Form Pilihan Status & Kartu Jam */}
                            <div className="attendance-left-col">
                                <div className="attendance-card-neat">
                                    <h3 className="attendance-card-title">
                                        <span style={{ fontSize: "16px" }}>📝</span>
                                        <span>Status & Keterangan Kehadiran</span>
                                    </h3>

                                    <div style={{ marginBottom: "14px" }}>
                                        <label style={{ display: "block", fontSize: "12.5px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                                            Pilih Status Kehadiran
                                        </label>
                                        <select 
                                            className="filter-select"
                                            style={{ width: "100%", height: "42px" }}
                                            value={attendanceStatus} 
                                            onChange={(event) => setAttendanceStatus(event.target.value)} 
                                            disabled={loading || !!data?.id}
                                        >
                                            <option value="Hadir">🏢 Hadir (Wajib di Area Kantor / WFO)</option>
                                            {policy.allow_zoom && <option value="Zoom">📹 Hadir Daring (Zoom / WFH)</option>}
                                            <option value="Izin">✉️ Izin (Perlu Persetujuan Pembimbing)</option>
                                            <option value="Sakit">🏥 Sakit</option>
                                            <option value="Alpa">❌ Alpa</option>
                                        </select>
                                        {attendanceStatus === "Izin" && !data && (
                                            <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#6366f1", lineHeight: "1.4" }}>
                                                ℹ️ Status izin baru tercatat setelah disetujui pembimbing. Permohonan izin dapat diajukan tanpa batasan lokasi kantor.
                                            </p>
                                        )}
                                    </div>

                                    {/* Form Khusus Mode Zoom: Upload Bukti & Agenda */}
                                    {attendanceStatus === "Zoom" && !data && (
                                        <div
                                            style={{
                                                marginTop: "16px",
                                                padding: "16px",
                                                background: "#f5f3ff",
                                                border: "1px dashed #818cf8",
                                                borderRadius: "12px",
                                            }}
                                        >
                                            <label style={{ display: "block", fontWeight: "700", fontSize: "13px", color: "#312e81", marginBottom: "4px" }}>
                                                📸 Unggah Bukti Screenshot Layar Zoom {policy.require_zoom_proof && <span style={{ color: "#ef4444" }}>*</span>}
                                            </label>
                                            <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#6366f1" }}>
                                                Lampirkan tangkapan layar saat berada di room rapat Zoom (terlihat nama/wajah dan jam).
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
                                                <label style={{ display: "block", fontWeight: "600", fontSize: "12.5px", color: "#334155", marginBottom: "4px" }}>
                                                    Agenda / Topik Pertemuan Zoom:
                                                </label>
                                                <input
                                                    type="text"
                                                    className="input-neat"
                                                    value={keterangan}
                                                    onChange={(e) => setKeterangan(e.target.value)}
                                                    placeholder="Contoh: Rapat koordinasi mingguan bersama pembimbing"
                                                    disabled={loading || !!data}
                                                    style={{ width: "100%" }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Form Alasan Izin / Sakit */}
                                    {attendanceStatus !== "Hadir" && attendanceStatus !== "Zoom" && (
                                        <div style={{ marginTop: "14px" }}>
                                            <label style={{ display: "block", fontSize: "12.5px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                                                Keterangan / Alasan {attendanceStatus}
                                            </label>
                                            <textarea 
                                                value={keterangan} 
                                                onChange={(e) => setKeterangan(e.target.value)} 
                                                placeholder={`Masukkan alasan kenapa Anda ${attendanceStatus.toLowerCase()}...`}
                                                disabled={loading || !!data?.id}
                                                className="input-neat"
                                                style={{
                                                    width: "100%",
                                                    minHeight: "80px",
                                                    padding: "10px 14px",
                                                    resize: "vertical",
                                                    boxSizing: "border-box",
                                                    fontFamily: "inherit"
                                                }}
                                                required
                                            ></textarea>
                                        </div>
                                    )}
                                </div>

                                {/* Kartu Jam Masuk & Jam Pulang */}
                                <div className="time-cards-neat-grid">
                                    {/* JAM MASUK */}
                                    <div className="time-card-box">
                                        <span className="time-card-label">JAM MASUK</span>
                                        <strong className="time-card-big">{data?.jam_masuk || "--:--"}</strong>
                                        <small className="time-card-note">
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
                                            className="btn-checkin-action"
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
                                                    : "Absen Masuk"
                                                : `Kirim Status ${attendanceStatus}`}
                                        </button>
                                    </div>

                                    {/* JAM PULANG */}
                                    <div className="time-card-box">
                                        <span className="time-card-label">JAM PULANG</span>
                                        <strong className="time-card-big">{data?.jam_pulang || "--:--"}</strong>
                                        <small className="time-card-note">
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
                                            className="btn-checkout-action"
                                        >
                                            {data?.status === "Alpa" ? "Tidak hadir (Alpa)" : data?.jam_pulang ? "Sudah tercatat" : "Absen Pulang"}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* KOLOM KANAN: Verifikasi GPS & Interactive Map */}
                            <div className="attendance-right-col">
                                <div className="attendance-card-neat">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                                        <h3 className="attendance-card-title" style={{ margin: 0 }}>
                                            <span style={{ fontSize: "16px" }}>📍</span>
                                            <span>Verifikasi Lokasi GPS</span>
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={detectLocation}
                                            disabled={locationLoading}
                                            style={{
                                                background: "#f8fafc",
                                                border: "1px solid #cbd5e1",
                                                borderRadius: "8px",
                                                padding: "6px 12px",
                                                fontSize: "12px",
                                                fontWeight: "650",
                                                color: "#475569",
                                                cursor: locationLoading ? "wait" : "pointer",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                transition: "all 0.2s ease"
                                            }}
                                        >
                                            <span>{locationLoading ? "⏳" : "🔄"}</span>
                                            <span>{locationLoading ? "Mendeteksi..." : "Perbarui GPS"}</span>
                                        </button>
                                    </div>

                                    {locationLoading && (
                                        <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontSize: "13px", background: "#f8fafc", borderRadius: "10px", marginBottom: "14px" }}>
                                            📡 Mendeteksi koordinat GPS perangkat Anda...
                                        </div>
                                    )}

                                    {!locationLoading && locationError && (
                                        <div
                                            style={{
                                                padding: "12px 14px",
                                                background: "#fef2f2",
                                                border: "1px solid #fecaca",
                                                borderRadius: "10px",
                                                color: "#991b1b",
                                                fontSize: "13px",
                                                lineHeight: "1.5",
                                                marginBottom: "14px",
                                            }}
                                        >
                                            <strong>⚠️ Lokasi GPS Belum Terdeteksi:</strong> {locationError}
                                        </div>
                                    )}

                                    {!locationLoading && !locationError && locationStatus.hasOffices && (
                                        <div style={{ marginBottom: "14px" }}>
                                            {attendanceStatus === "Zoom" ? (
                                                <div
                                                    style={{
                                                        padding: "12px 14px",
                                                        borderRadius: "10px",
                                                        background: "#e0e7ff",
                                                        border: "1px solid #c7d2fe",
                                                        color: "#3730a3",
                                                        fontSize: "12.5px",
                                                        lineHeight: "1.5",
                                                    }}
                                                >
                                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "750", marginBottom: "4px" }}>
                                                        <span>📹</span>
                                                        <span>Mode Daring (Zoom / WFH): Bebas Radius Kantor</span>
                                                    </div>
                                                    <div>
                                                        Bebas absen jarak jauh (Posisi saat ini: <strong>±{locationStatus.distance ?? "-"} meter</strong> dari kantor). Koordinat GPS tetap dicatat untuk transparansi data kehadiran.
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    style={{
                                                        padding: "12px 14px",
                                                        borderRadius: "10px",
                                                        background: locationStatus.isWithinRadius ? "#ecfdf5" : "#fef2f2",
                                                        border: `1px solid ${locationStatus.isWithinRadius ? "#a7f3d0" : "#fecaca"}`,
                                                        color: locationStatus.isWithinRadius ? "#065f46" : "#991b1b",
                                                        fontSize: "12.5px",
                                                        lineHeight: "1.5",
                                                    }}
                                                >
                                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "750", marginBottom: "4px" }}>
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
                                                                Jarak saat ini <strong>±{locationStatus.distance} m</strong> dari{" "}
                                                                <strong>{locationStatus.closestOffice?.nama_lokasi}</strong> (Radius:{" "}
                                                                {locationStatus.closestOffice?.radius_meter}m). Anda dapat melakukan absensi.
                                                            </span>
                                                        ) : (
                                                            <span>
                                                                Jarak Anda <strong>±{locationStatus.distance} m</strong> dari kantor{" "}
                                                                <strong>{locationStatus.closestOffice?.nama_lokasi}</strong> (Maks:{" "}
                                                                {locationStatus.closestOffice?.radius_meter}m). Silakan mendekat ke kantor untuk WFO, atau pilih mode <strong>Zoom</strong> jika rapat daring.
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {!locationLoading && !locationError && !locationStatus.hasOffices && (
                                        <div style={{ padding: "12px", color: "#475569", fontSize: "13px", background: "#f8fafc", borderRadius: "10px", marginBottom: "14px" }}>
                                            ℹ️ Tidak ada pembatasan radius lokasi kantor yang aktif saat ini.
                                        </div>
                                    )}

                                    {/* Leaflet Map Preview */}
                                    <div style={{ position: "relative" }}>
                                        <div
                                            ref={mapContainerRef}
                                            id="user-location-map"
                                            style={{
                                                width: "100%",
                                                height: "230px",
                                                borderRadius: "12px",
                                                border: "1px solid #e2e8f0",
                                                zIndex: 1,
                                                overflow: "hidden"
                                            }}
                                        />
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "11px", color: "#64748b" }}>
                                            <span>🔵 Posisi Anda &nbsp;|&nbsp; 🏢 Kantor ({locationStatus.closestOffice?.radius_meter || 100}m radius)</span>
                                            {userCoords && <span>Akurasi: ±{userCoords.accuracy}m</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
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

                    {message && !error && (
                        <div className="message" role="status" style={{ marginTop: "20px" }}>
                            {message}
                        </div>
                    )}

                    {participant && (
                        <div className="history-link" style={{ marginTop: "24px", textAlign: "center" }}>
                            <span style={{ color: "#64748b", fontSize: "13.5px" }}>Perlu melihat riwayat kehadiran sebelumnya? </span>
                            <Link to="/riwayat" style={{ color: "#6366f1", fontWeight: "700", textDecoration: "none" }}>Buka Riwayat Absensi →</Link>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default Absensi;
