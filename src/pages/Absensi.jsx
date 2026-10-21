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
    const [attendanceStatus, setAttendanceStatus] = useState("Hadir");
    const [keterangan, setKeterangan] = useState("");

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
                    setError("Absensi hanya tersedia untuk peserta dengan pendaftaran magang aktif.");
                    return;
                }

                const attendanceResponse = await api.get("/absensi/hari-ini");
                if (cancelled) return;
                const attendance = attendanceResponse.data;
                if (attendance && Object.keys(attendance).length > 0) {
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
        detectLocation();

        const timer = setInterval(() => setClock(new Date()), 1000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, []);

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
        let closest = offices[0];

        for (const office of offices) {
            const dist = calculateHaversineDistance(
                userCoords.latitude,
                userCoords.longitude,
                Number(office.latitude),
                Number(office.longitude)
            );
            if (dist < minDistance) {
                minDistance = dist;
                closest = office;
            }
        }

        const allowedRadius = Number(closest?.radius_meter) || 100;
        const isWithin = minDistance <= allowedRadius;

        setLocationStatus({
            hasOffices: true,
            isWithinRadius: isWithin,
            closestOffice: closest,
            distance: Math.round(minDistance),
        });
    }, [userCoords, offices]);

    // Render / update Leaflet mini map
    useEffect(() => {
        if (!mapContainerRef.current || !userCoords || !locationStatus.closestOffice) {
            return;
        }

        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        const userLat = userCoords.latitude;
        const userLng = userCoords.longitude;
        const officeLat = Number(locationStatus.closestOffice.latitude);
        const officeLng = Number(locationStatus.closestOffice.longitude);
        const officeRadius = Number(locationStatus.closestOffice.radius_meter) || 100;

        const map = L.map(mapContainerRef.current, {
            zoomControl: true,
            attributionControl: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
        }).addTo(map);

        // Office pin & circle
        const officeIcon = L.divIcon({
            className: "office-marker",
            html: `
                <div style="
                    width: 30px;
                    height: 30px;
                    background: #4f46e5;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 8px rgba(79, 70, 229, 0.4);
                    border: 2px solid #ffffff;
                ">
                    <span style="transform: rotate(45deg); font-size: 13px;">🏢</span>
                </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
        });

        L.marker([officeLat, officeLng], { icon: officeIcon })
            .bindPopup(`<b>${locationStatus.closestOffice.nama_lokasi}</b><br>Batas Radius: ${officeRadius}m`)
            .addTo(map);

        L.circle([officeLat, officeLng], {
            radius: officeRadius,
            color: "#4f46e5",
            fillColor: "#6366f1",
            fillOpacity: 0.16,
            weight: 2,
            dashArray: "4, 6",
        }).addTo(map);

        // User pin
        const userIcon = L.divIcon({
            className: "user-marker",
            html: `
                <div style="
                    width: 26px;
                    height: 26px;
                    background: #0284c7;
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

        // Fit bounds
        const bounds = L.latLngBounds([
            [userLat, userLng],
            [officeLat, officeLng],
        ]);
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
            setError("Akun peserta belum terhubung ke NPM.");
            return;
        }

        if (type === "in" && attendanceStatus !== "Hadir" && !keterangan.trim()) {
            setError(`Mohon isi keterangan/alasan untuk status ${attendanceStatus}.`);
            return;
        }

        // Verifikasi lokasi kantor jika status adalah "Hadir"
        if (attendanceStatus === "Hadir" && locationStatus.hasOffices) {
            if (locationLoading) {
                setError("Sedang memverifikasi lokasi GPS Anda. Mohon tunggu sebentar...");
                return;
            }
            if (locationError || !userCoords) {
                setError("Akses lokasi GPS diperlukan untuk absensi Hadir. Mohon izinkan akses lokasi di browser Anda.");
                return;
            }
            if (!locationStatus.isWithinRadius) {
                setError(
                    `Anda tidak dapat melakukan absensi Hadir karena berada di luar batas radius kantor (${locationStatus.distance} meter dari ${locationStatus.closestOffice?.nama_lokasi}, maksimal ${locationStatus.closestOffice?.radius_meter} meter).`
                );
                return;
            }
        }

        // Verifikasi saat checkout untuk absensi Hadir
        if (type === "out" && data?.status === "Hadir" && locationStatus.hasOffices) {
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
            const payload =
                type === "in"
                    ? {
                          status: attendanceStatus,
                          keterangan,
                          latitude: userCoords?.latitude || null,
                          longitude: userCoords?.longitude || null,
                      }
                    : {
                          latitude: userCoords?.latitude || null,
                          longitude: userCoords?.longitude || null,
                      };

            const response = await api.post(endpoint, payload);
            setMessage(response.data.message);
            setData(response.data.data);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Absensi gagal dicatat.");
            if (requestError.response?.data?.data) setData(requestError.response.data.data);
        } finally {
            setLoading(false);
        }
    };

    const dateLabel = clock.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const displayedStatus =
        data?.approval_status === "pending"
            ? "Menunggu persetujuan"
            : data?.approval_status === "approved"
            ? "Izin disetujui"
            : data?.approval_status === "rejected"
            ? "Alpa"
            : data?.status || "Belum hadir";

    // Can check in?
    const isCheckInDisabled =
        loading ||
        !!data ||
        (attendanceStatus === "Hadir" && locationStatus.hasOffices && (!locationStatus.isWithinRadius || locationLoading || !!locationError));

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                <Navbar />
                <main className="main attendance-page">
                    <section className="page-heading attendance-page-heading">
                        <div>
                            <p className="eyebrow">PORTAL KEHADIRAN</p>
                            <h1>Absensi magang</h1>
                            <p className="subtitle">Catat kehadiran harianmu sesuai lokasi kantor yang ditentukan.</p>
                        </div>
                        <div className="live-clock">
                            <strong>{clock.toLocaleTimeString("id-ID")}</strong>
                            <span>{dateLabel}</span>
                        </div>
                    </section>

                    <section className="attendance-card attendance-page-card">
                        <div className="attendance-header">
                            <div>
                                <p className="eyebrow">AKUN PESERTA</p>
                                <h2>{profileLoading ? "Memuat profil..." : participant?.participant_name || "Akun belum terhubung"}</h2>
                                {participant?.participant_code && <p className="subtitle">NPM: {participant.participant_code}</p>}
                            </div>
                        </div>

                        {profileLoading && <p className="message">Memuat profil peserta...</p>}

                        {participant && (
                            <>
                                <hr className="attendance-divider" />
                                <div className="attendance-header attendance-current-status">
                                    <div>
                                        <p className="eyebrow">STATUS HARI INI</p>
                                        <h2 className={data?.status === "Hadir" || data?.approval_status === "approved" ? "hadir" : "muted-status"}>
                                            {displayedStatus}
                                        </h2>
                                        {data?.keterangan && (
                                            <p style={{ marginTop: "5px", fontSize: "14px", color: "#666" }}>Catatan: {data.keterangan}</p>
                                        )}
                                    </div>
                                </div>

                                <label className="attendance-status-select">
                                    Status kehadiran
                                    <select
                                        value={attendanceStatus}
                                        onChange={(event) => setAttendanceStatus(event.target.value)}
                                        disabled={loading || !!data}
                                    >
                                        <option value="Hadir">Hadir (Wajib di Area Kantor)</option>
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

                                {attendanceStatus !== "Hadir" && (
                                    <label className="attendance-status-select">
                                        Keterangan / Alasan
                                        <textarea
                                            value={keterangan}
                                            onChange={(e) => setKeterangan(e.target.value)}
                                            placeholder={`Masukkan alasan kenapa Anda ${attendanceStatus.toLowerCase()}...`}
                                            disabled={loading || !!data}
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
                                                            <strong>{locationStatus.closestOffice?.radius_meter} meter</strong>. Silakan mendekat ke area kantor untuk absen Hadir.
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

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
                                            {data?.approval_status === "pending"
                                                ? "Menunggu keputusan pembimbing"
                                                : data?.jam_masuk
                                                ? "Waktu masuk tercatat"
                                                : attendanceStatus === "Hadir"
                                                ? locationStatus.hasOffices && !locationStatus.isWithinRadius
                                                    ? "Terkunci: Anda berada di luar area kantor"
                                                    : "Belum melakukan absen masuk"
                                                : `Status ${attendanceStatus.toLowerCase()} tidak memakai jam masuk`}
                                        </small>

                                        <button
                                            type="button"
                                            onClick={() => submitAttendance("in")}
                                            disabled={isCheckInDisabled}
                                            className="btn-attendance-in"
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
                                                : data
                                                ? "Sudah tercatat"
                                                : attendanceStatus === "Hadir"
                                                ? locationStatus.hasOffices && !locationStatus.isWithinRadius
                                                    ? "Di Luar Area Kantor"
                                                    : "Absen masuk"
                                                : `Kirim Status ${attendanceStatus}`}
                                        </button>
                                    </div>

                                    <div className="time-box checkout">
                                        <span>JAM PULANG</span>
                                        <strong>{data?.jam_pulang || "--:--"}</strong>
                                        <small className="time-note">
                                            {data?.jam_pulang
                                                ? "Waktu pulang tercatat"
                                                : clock.getHours() < 17
                                                ? "Tombol aktif setelah jam 17:00"
                                                : "Aktif setelah absen masuk"}
                                        </small>
                                        <button
                                            onClick={() => submitAttendance("out")}
                                            disabled={
                                                loading ||
                                                !data?.jam_masuk ||
                                                !!data?.jam_pulang ||
                                                clock.getHours() < 17 ||
                                                (data?.status === "Hadir" && locationStatus.hasOffices && !locationStatus.isWithinRadius)
                                            }
                                            className={data?.jam_pulang || clock.getHours() < 17 ? "btn-secondary" : "btn-success"}
                                            style={
                                                clock.getHours() < 17 && !data?.jam_pulang
                                                    ? { opacity: 0.6, cursor: "not-allowed", background: "#e2e8f0", color: "#64748b" }
                                                    : {}
                                            }
                                        >
                                            {data?.jam_pulang ? "Sudah tercatat" : "Absen pulang"}
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
                                Keluar dan masuk memakai NPM pribadi
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
