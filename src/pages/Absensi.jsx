import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import { Calendar, FileText, Download, X } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { API_BASE_URL } from "../config/api";
import { applyKopToPdfPage, KOP_BOTTOM_SAFE_MARGIN, KOP_TOP_SAFE_Y, loadKopDataUrl } from "../utils/kopSurat";

function normalizeIsoDate(value) {
    const text = String(value || "").trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function formatPeriodDate(value, withLongMonth = false) {
    const iso = normalizeIsoDate(value);
    if (!iso) return "-";
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("id-ID", {
        day: "numeric",
        month: withLongMonth ? "long" : "short",
        year: "numeric",
    });
}

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
    const [registration, setRegistration] = useState(null);

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

    // Riwayat presensi untuk statistik kehadiran bulanan & rekap periode magang
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [showSemesterModal, setShowSemesterModal] = useState(false);
    const [customPeriodRange, setCustomPeriodRange] = useState({ start: "", end: "" });

    const registeredPeriod = registration?.periode || null;
    const registeredPeriodStart = normalizeIsoDate(
        registeredPeriod?.tanggal_mulai || registration?.tanggal_mulai || participant?.tanggal_mulai || currentUser?.tanggal_mulai
    );
    const registeredPeriodEnd = normalizeIsoDate(
        registeredPeriod?.tanggal_selesai || registration?.tanggal_selesai || participant?.tanggal_selesai || currentUser?.tanggal_selesai
    );
    const registeredPeriodName = registeredPeriod?.nama_periode || registeredPeriod?.nama || "";

    const fallbackMonthStart = `${selectedMonth}-01`;
    const fallbackMonthEnd = useMemo(() => {
        const [yStr, mStr] = String(selectedMonth || "").split("-");
        const y = parseInt(yStr, 10) || new Date().getFullYear();
        const m = parseInt(mStr, 10) || (new Date().getMonth() + 1);
        const lastDay = new Date(y, m, 0).getDate();
        return `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    }, [selectedMonth]);

    const recapStartDate = customPeriodRange.start || registeredPeriodStart || fallbackMonthStart;
    const recapEndDate = customPeriodRange.end || registeredPeriodEnd || fallbackMonthEnd;
    const isCustomRangeActive = Boolean(customPeriodRange.start || customPeriodRange.end);

    const loadAttendanceHistory = async () => {
        try {
            const role = currentUser?.role?.toLowerCase() || "";
            const isSupervisorOrAdmin = role === "admin" || role === "pembimbing";
            const endpoint = isSupervisorOrAdmin ? "/absensi" : "/absensi-saya";
            const res = await api.get(endpoint);
            const list = res.data?.data || res.data || [];
            setAttendanceHistory(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error("Gagal memuat riwayat presensi peserta:", err);
        }
    };

    const monthlyRecords = useMemo(() => {
        return attendanceHistory.filter((item) => String(item.tanggal || "").startsWith(selectedMonth));
    }, [attendanceHistory, selectedMonth]);

    const monthlyStats = useMemo(() => {
        let hadir = 0;
        let izin = 0;
        let sakit = 0;
        let alpa = 0;

        monthlyRecords.forEach((item) => {
            const s = String(item.status || "").toLowerCase();
            const app = String(item.approval_status || "").toLowerCase();
            if (s === "hadir" || app === "approved") {
                hadir++;
            } else if (s === "izin") {
                izin++;
            } else if (s === "sakit") {
                sakit++;
            } else if (s === "alpa" || app === "rejected") {
                alpa++;
            }
        });

        const total = hadir + izin + sakit + alpa;
        const percentage = total > 0 ? Math.round((hadir / total) * 100) : 0;

        return { hadir, izin, sakit, alpa, total, percentage };
    }, [monthlyRecords]);

    const periodStats = useMemo(() => {
        const rawStart = normalizeIsoDate(recapStartDate) || fallbackMonthStart;
        const rawEnd = normalizeIsoDate(recapEndDate) || fallbackMonthEnd;
        const [startBound, endBound] = rawStart <= rawEnd ? [rawStart, rawEnd] : [rawEnd, rawStart];

        const [startYear, startMonth] = startBound.split("-").map(Number);
        const [endYear, endMonth] = endBound.split("-").map(Number);

        const monthsData = [];
        let totalHadir = 0;
        let totalIzin = 0;
        let totalSakit = 0;
        let totalAlpa = 0;

        let y = startYear;
        let m = startMonth;
        let guard = 0;

        while ((y < endYear || (y === endYear && m <= endMonth)) && guard < 36) {
            guard += 1;
            const mStr = String(m).padStart(2, "0");
            const key = `${y}-${mStr}`;
            const mName = new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

            const recs = attendanceHistory.filter((item) => {
                const dateKey = normalizeIsoDate(item.tanggal);
                return dateKey.startsWith(key) && dateKey >= startBound && dateKey <= endBound;
            });

            let hadir = 0;
            let izin = 0;
            let sakit = 0;
            let alpa = 0;

            recs.forEach((item) => {
                const s = String(item.status || "").toLowerCase();
                const app = String(item.approval_status || "").toLowerCase();
                if (s === "hadir" || app === "approved") hadir++;
                else if (s === "izin") izin++;
                else if (s === "sakit") sakit++;
                else if (s === "alpa" || app === "rejected") alpa++;
            });

            const total = hadir + izin + sakit + alpa;
            const pct = total > 0 ? Math.round((hadir / total) * 100) : 0;

            totalHadir += hadir;
            totalIzin += izin;
            totalSakit += sakit;
            totalAlpa += alpa;

            monthsData.push({
                monthKey: key,
                monthName: mName,
                hadir,
                izin,
                sakit,
                alpa,
                total,
                pct,
            });

            m += 1;
            if (m > 12) {
                m = 1;
                y += 1;
            }
        }

        const grandTotal = totalHadir + totalIzin + totalSakit + totalAlpa;
        const avgPct = grandTotal > 0 ? Math.round((totalHadir / grandTotal) * 100) : 0;

        return {
            startBound,
            endBound,
            monthsData,
            totalHadir,
            totalIzin,
            totalSakit,
            totalAlpa,
            grandTotal,
            avgPct,
        };
    }, [attendanceHistory, recapStartDate, recapEndDate, fallbackMonthStart, fallbackMonthEnd]);

    const exportPeriodPdf = async () => {
        const kopDataUrl = await loadKopDataUrl();
        const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
        const pageHeight = doc.internal.pageSize.getHeight();
        const periodLabel = `${formatPeriodDate(periodStats.startBound, true)} - ${formatPeriodDate(periodStats.endBound, true)}`.toUpperCase();
        const periodTitle = registeredPeriodName && !isCustomRangeActive
            ? `${registeredPeriodName.toUpperCase()} (${periodLabel})`
            : `PERIODE MAGANG: ${periodLabel}`;

        const participantName = participant?.participant_name || currentUser?.name || currentUser?.nama || "Peserta Magang";
        const participantCode = participant?.participant_code || currentUser?.npm || currentUser?.nim || "-";
        const institution = participant?.institution || registration?.asal_instansi || currentUser?.institution || "Sekolah Tinggi Teknologi Payakumbuh";

        applyKopToPdfPage(doc, kopDataUrl);

        // Judul Laporan
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text("REKAPITULASI KEHADIRAN PERIODE MAGANG", 105, KOP_TOP_SAFE_Y + 4, { align: "center" });
        doc.setFontSize(9.5);
        doc.setTextColor(79, 70, 229);
        doc.text(periodTitle, 105, 46, { align: "center", maxWidth: 182 });

        // Kotak Identitas Peserta
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 52, 182, 22, 2, 2, "F");
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, 52, 182, 22, 2, 2, "D");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text("Nama Peserta", 18, 59);
        doc.text("NPM / NIM", 18, 65);
        doc.text("Instansi / Kampus", 18, 71);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        doc.text(`:  ${participantName}`, 55, 59);
        doc.text(`:  ${participantCode}`, 55, 65);
        doc.text(`:  ${institution}`, 55, 71);

        const drawTableHeader = (yPos) => {
            doc.setFillColor(79, 70, 229);
            doc.rect(14, yPos, 182, 8, "F");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(255, 255, 255);
            doc.text("NO", 18, yPos + 5.5);
            doc.text("BULAN", 30, yPos + 5.5);
            doc.text("HADIR", 75, yPos + 5.5, { align: "center" });
            doc.text("IZIN", 100, yPos + 5.5, { align: "center" });
            doc.text("SAKIT", 125, yPos + 5.5, { align: "center" });
            doc.text("ALPA", 150, yPos + 5.5, { align: "center" });
            doc.text("% HADIR", 180, yPos + 5.5, { align: "center" });
        };

        // Header Tabel
        const startY = 82;
        drawTableHeader(startY);

        // Baris Tabel
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "normal");
        let currentY = startY + 8;

        periodStats.monthsData.forEach((m, idx) => {
            if (currentY + 8 > pageHeight - KOP_BOTTOM_SAFE_MARGIN) {
                doc.addPage();
                applyKopToPdfPage(doc, kopDataUrl);
                drawTableHeader(KOP_TOP_SAFE_Y + 2);
                currentY = KOP_TOP_SAFE_Y + 10;
            }
            if (idx % 2 === 1) {
                doc.setFillColor(248, 250, 252);
                doc.rect(14, currentY, 182, 8, "F");
            }
            doc.setDrawColor(226, 232, 240);
            doc.rect(14, currentY, 182, 8, "D");

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(15, 23, 42);
            doc.text(String(idx + 1), 18, currentY + 5.5);
            doc.text(m.monthName, 30, currentY + 5.5);
            doc.text(`${m.hadir} hari`, 75, currentY + 5.5, { align: "center" });
            doc.text(`${m.izin} hari`, 100, currentY + 5.5, { align: "center" });
            doc.text(`${m.sakit} hari`, 125, currentY + 5.5, { align: "center" });
            doc.text(`${m.alpa} hari`, 150, currentY + 5.5, { align: "center" });
            doc.text(`${m.pct}%`, 180, currentY + 5.5, { align: "center" });

            currentY += 8;
        });

        if (currentY + 60 > pageHeight - KOP_BOTTOM_SAFE_MARGIN) {
            doc.addPage();
            applyKopToPdfPage(doc, kopDataUrl);
            currentY = KOP_TOP_SAFE_Y + 4;
        }

        // Baris Total Akumulatif
        doc.setFillColor(238, 242, 255);
        doc.rect(14, currentY, 182, 9, "F");
        doc.setDrawColor(199, 210, 254);
        doc.rect(14, currentY, 182, 9, "D");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(30, 27, 75);
        doc.text("TOTAL PERIODE MAGANG", 30, currentY + 6);
        doc.text(`${periodStats.totalHadir} hari`, 75, currentY + 6, { align: "center" });
        doc.text(`${periodStats.totalIzin} hari`, 100, currentY + 6, { align: "center" });
        doc.text(`${periodStats.totalSakit} hari`, 125, currentY + 6, { align: "center" });
        doc.text(`${periodStats.totalAlpa} hari`, 150, currentY + 6, { align: "center" });
        doc.text(`${periodStats.avgPct}%`, 180, currentY + 6, { align: "center" });

        currentY += 15;

        // Catatan Evaluasi
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`Keterangan: Total kehadiran efektif sebanyak ${periodStats.totalHadir} hari kerja dari akumulasi ${periodStats.grandTotal} catatan presensi (${periodStats.avgPct}% kehadiran).`, 14, currentY, { maxWidth: 182 });

        currentY += 16;

        // Tanda Tangan
        const signDate = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
        doc.setTextColor(15, 23, 42);
        doc.text(`Padang, ${signDate}`, 145, currentY);
        currentY += 5;
        doc.text("Pembimbing Magang,", 145, currentY);

        currentY += 22;
        doc.setFont("helvetica", "bold");
        doc.text("( .................................................. )", 145, currentY);
        currentY += 4.5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text("Ibrahim Saputra, S.Kom", 145, currentY);

        doc.save(`rekap-absensi-periode-${participantName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${periodStats.startBound}-sd-${periodStats.endBound}.pdf`);
    };

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
            const res = await api.get("/pengaturan-absensi"); x``
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
                const [meRes, regRes] = await Promise.allSettled([
                    api.get("/me"),
                    api.get("/pendaftaran/me"),
                ]);
                const user = meRes.status === "fulfilled" ? meRes.value.data?.data : null;
                const regData = regRes.status === "fulfilled" ? regRes.value.data?.data : null;
                let profile = user?.magang || null;

                if (!profile && regData?.status === "Pemagang Aktif") {
                    profile = {
                        participant_name: user?.name || user?.nama || "Peserta Magang",
                        participant_code: user?.nim || user?.npm || null,
                        institution: regData.asal_instansi,
                    };
                } else if (profile && regData) {
                    profile = {
                        ...profile,
                        participant_code: profile.participant_code || user?.nim || user?.npm || null,
                        institution: profile.institution || regData.asal_instansi,
                    };
                }

                if (cancelled) return;
                if (user) {
                    setCurrentUser(user);
                }
                if (regData) {
                    setRegistration(regData);
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
        void loadAttendanceHistory();
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
                isWithinRadius: true,
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

        const targetOffice = matchedOffice || closest;

        setLocationStatus({
            hasOffices: true,
            isWithinRadius: true,
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
            void loadAttendanceHistory();
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
        (isZoom && policy.require_zoom_proof && !zoomFile);

    const photoUrl = getPhotoUrl(currentUser?.foto || participant?.foto);

    return (
        <div className="layout participant-panel" style={{ background: "#f8fafc", minHeight: "100vh" }}>
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
                                <span className={`attendance-badge-lg ${data?.status === "Hadir" || data?.approval_status === "approved"
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

                    {/* Ringkasan Statistik Kehadiran Bulanan & Tombol Rekap per Semester */}
                    {participant && (
                        <div className="attendance-monthly-card">
                            <div className="attendance-monthly-header">
                                <div className="attendance-monthly-title-group">
                                    <div className="attendance-monthly-icon-box">
                                        <Calendar size={22} />
                                    </div>
                                    <div>
                                        <h3 className="attendance-monthly-title">Statistik Kehadiran Bulanan</h3>
                                        <p className="attendance-monthly-subtitle">
                                            Frekuensi kehadiran Anda pada bulan terpilih
                                        </p>
                                    </div>
                                </div>
                                <div className="attendance-monthly-actions">
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <label htmlFor="month-picker" style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>
                                            PILIH BULAN:
                                        </label>
                                        <input
                                            id="month-picker"
                                            type="month"
                                            className="attendance-month-input"
                                            value={selectedMonth}
                                            onChange={(e) => setSelectedMonth(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-semester-recap"
                                        onClick={() => setShowSemesterModal(true)}
                                    >
                                        <FileText size={16} />
                                        <span>Rekap Periode Magang</span>
                                    </button>
                                </div>
                            </div>

                            <div className="attendance-monthly-banner">
                                <div>
                                    <span style={{ fontWeight: "700", color: "#1e1b4b" }}>
                                        📅 Bulan {(() => {
                                            try {
                                                const [y, m] = selectedMonth.split("-");
                                                return new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
                                            } catch {
                                                return selectedMonth;
                                            }
                                        })()}:
                                    </span>{" "}
                                    <span>
                                        Anda telah hadir sebanyak <strong style={{ color: "#15803d", fontSize: "15px" }}>{monthlyStats.hadir} kali</strong> ({monthlyStats.hadir} hari) dari {monthlyStats.total} catatan presensi.
                                    </span>
                                </div>
                                <div style={{ fontSize: "12.5px", color: "#4f46e5", fontWeight: "700" }}>
                                    Tingkat Kehadiran: {monthlyStats.percentage}%
                                </div>
                            </div>

                            <div className="attendance-stat-grid">
                                <div className="attendance-stat-card stat-hadir">
                                    <span className="stat-label">Total Hadir</span>
                                    <span className="stat-value">{monthlyStats.hadir} <small style={{ fontSize: "12px", fontWeight: "600" }}>Hari</small></span>
                                </div>
                                <div className="attendance-stat-card stat-izin">
                                    <span className="stat-label">Total Izin</span>
                                    <span className="stat-value">{monthlyStats.izin} <small style={{ fontSize: "12px", fontWeight: "600" }}>Hari</small></span>
                                </div>
                                <div className="attendance-stat-card stat-sakit">
                                    <span className="stat-label">Total Sakit</span>
                                    <span className="stat-value">{monthlyStats.sakit} <small style={{ fontSize: "12px", fontWeight: "600" }}>Hari</small></span>
                                </div>
                                <div className="attendance-stat-card stat-alpa">
                                    <span className="stat-label">Total Alpa</span>
                                    <span className="stat-value">{monthlyStats.alpa} <small style={{ fontSize: "12px", fontWeight: "600" }}>Hari</small></span>
                                </div>
                                <div className="attendance-stat-card stat-percentage">
                                    <span className="stat-label">% Kehadiran</span>
                                    <span className="stat-value">{monthlyStats.percentage}%</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {!profileLoading && !participant ? (
                        <div className="alert-card error" style={{ marginBottom: "20px" }}>
                            <p><strong>Akun Anda belum terhubung dengan data magang.</strong></p>
                            <p>Silakan keluar dan masuk kembali memakai NPM yang valid atau selesaikan pendaftaran magang terlebih dahulu.</p>
                            <button
                                type="button"
                                onClick={() => {
                                    localStorage.removeItem("token");
                                    localStorage.removeItem("user");
                                    navigate("/");
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
                                            <option value="Hadir">🏢 Hadir (Bisa Di Mana Saja / Fleksibel)</option>
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
                                                                    : "Belum melakukan absen masuk (bisa di mana saja)"
                                                                : `Status ${attendanceStatus.toLowerCase()} tidak memakai jam masuk`}
                                        </small>

                                        <button
                                            type="button"
                                            onClick={() => submitAttendance("in")}
                                            disabled={loading || !!data?.id || (isZoom && policy.require_zoom_proof && !zoomFile) || (attendanceStatus === "Hadir" && beforeCheckInTime)}
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
                                                data?.status === "Alpa"
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
                                                background: "#eff6ff",
                                                border: "1px solid #bfdbfe",
                                                borderRadius: "10px",
                                                color: "#1e40af",
                                                fontSize: "12.5px",
                                                lineHeight: "1.5",
                                                marginBottom: "14px",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "750", marginBottom: "4px" }}>
                                                <span>🌐</span>
                                                <span>Absensi Fleksibel Aktif: Bebas Absen Di Mana Saja</span>
                                            </div>
                                            <div>
                                                Sistem absensi saat ini mengizinkan kehadiran dari lokasi mana saja tanpa batasan radius kantor. Walaupun izin GPS browser belum aktif, Anda tetap dapat melakukan <strong>Absen Masuk</strong> dan <strong>Absen Pulang</strong> seperti biasa.
                                            </div>
                                        </div>
                                    )}

                                    {!locationLoading && !locationError && (
                                        <div style={{ marginBottom: "14px" }}>
                                            <div
                                                style={{
                                                    padding: "12px 14px",
                                                    borderRadius: "10px",
                                                    background: "#ecfdf5",
                                                    border: "1px solid #a7f3d0",
                                                    color: "#065f46",
                                                    fontSize: "12.5px",
                                                    lineHeight: "1.5",
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "750", marginBottom: "4px" }}>
                                                    <span>✓</span>
                                                    <span>Absensi Fleksibel Aktif: Bebas Absen Di Mana Saja</span>
                                                </div>
                                                <div>
                                                    {userCoords && locationStatus.closestOffice ? (
                                                        <span>
                                                            Titik GPS terdeteksi (Jarak ke {locationStatus.closestOffice.nama_lokasi}: <strong>±{locationStatus.distance ?? 0} meter</strong>). Anda bebas melakukan absensi dari lokasi mana saja.
                                                        </span>
                                                    ) : (
                                                        <span>
                                                            Anda dapat melakukan absensi masuk dan pulang dari lokasi mana saja tanpa batasan radius kantor.
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
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

                    {/* Modal Rekapitulasi Kehadiran per Semester */}
                    {showSemesterModal && (
                        <div className="attendance-modal-backdrop" onClick={() => setShowSemesterModal(false)}>
                            <div className="attendance-modal-dialog" onClick={(e) => e.stopPropagation()}>
                                <div className="attendance-modal-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <div className="attendance-monthly-icon-box" style={{ width: "38px", height: "38px" }}>
                                            <FileText size={18} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#0f172a" }}>
                                                Rekapitulasi Kehadiran Periode Magang
                                            </h3>
                                            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                                                {participant?.participant_name || currentUser?.name || "Peserta"} ({participant?.participant_code || currentUser?.nim || currentUser?.npm || "-"})
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowSemesterModal(false)}
                                        style={{
                                            border: "none",
                                            background: "#f1f5f9",
                                            borderRadius: "8px",
                                            padding: "6px",
                                            cursor: "pointer",
                                            color: "#64748b",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="attendance-modal-body">
                                    {/* Filter Periode Magang Peserta */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "#f8fafc", padding: "12px 16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                            <div>
                                                <span style={{ display: "block", fontSize: "10.5px", fontWeight: "800", letterSpacing: "0.05em", color: "#64748b" }}>
                                                    PERIODE MAGANG PESERTA
                                                </span>
                                                <strong style={{ fontSize: "13.5px", color: "#0f172a" }}>
                                                    {registeredPeriodStart && registeredPeriodEnd
                                                        ? `${registeredPeriodName ? `${registeredPeriodName} • ` : ""}${formatPeriodDate(registeredPeriodStart)} – ${formatPeriodDate(registeredPeriodEnd)}`
                                                        : `Rentang ${formatPeriodDate(periodStats.startBound)} – ${formatPeriodDate(periodStats.endBound)}`}
                                                </strong>
                                            </div>
                                            {isCustomRangeActive && registeredPeriodStart && registeredPeriodEnd && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCustomPeriodRange({ start: "", end: "" })}
                                                    style={{
                                                        border: "1px solid #c7d2fe",
                                                        background: "#eef2ff",
                                                        color: "#4338ca",
                                                        padding: "5px 10px",
                                                        borderRadius: "8px",
                                                        fontSize: "11.5px",
                                                        fontWeight: "700",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    Sesuai Periode Magang
                                                </button>
                                            )}
                                        </div>

                                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                                            <div style={{ flex: 1, minWidth: "160px" }}>
                                                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "4px" }}>
                                                    DARI TANGGAL
                                                </label>
                                                <input
                                                    type="date"
                                                    value={recapStartDate}
                                                    onChange={(e) => setCustomPeriodRange((prev) => ({ start: e.target.value, end: prev.end || recapEndDate }))}
                                                    style={{ width: "100%", padding: "7px 10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13px", fontWeight: "600", outline: "none", background: "#ffffff", boxSizing: "border-box" }}
                                                />
                                            </div>

                                            <div style={{ flex: 1, minWidth: "160px" }}>
                                                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "4px" }}>
                                                    SAMPAI TANGGAL
                                                </label>
                                                <input
                                                    type="date"
                                                    value={recapEndDate}
                                                    onChange={(e) => setCustomPeriodRange((prev) => ({ start: prev.start || recapStartDate, end: e.target.value }))}
                                                    style={{ width: "100%", padding: "7px 10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13px", fontWeight: "600", outline: "none", background: "#ffffff", boxSizing: "border-box" }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stat Mini Strip in Modal */}
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "8px" }}>
                                        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "8px 12px", borderRadius: "8px", textAlign: "center" }}>
                                            <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#166534", display: "block" }}>TOTAL HADIR</span>
                                            <strong style={{ fontSize: "16px", color: "#15803d" }}>{periodStats.totalHadir} Hari</strong>
                                        </div>
                                        <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", padding: "8px 12px", borderRadius: "8px", textAlign: "center" }}>
                                            <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#3730a3", display: "block" }}>TOTAL IZIN</span>
                                            <strong style={{ fontSize: "16px", color: "#4338ca" }}>{periodStats.totalIzin} Hari</strong>
                                        </div>
                                        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "8px 12px", borderRadius: "8px", textAlign: "center" }}>
                                            <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#92400e", display: "block" }}>TOTAL SAKIT</span>
                                            <strong style={{ fontSize: "16px", color: "#b45309" }}>{periodStats.totalSakit} Hari</strong>
                                        </div>
                                        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "8px 12px", borderRadius: "8px", textAlign: "center" }}>
                                            <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#991b1b", display: "block" }}>TOTAL ALPA</span>
                                            <strong style={{ fontSize: "16px", color: "#b91c1c" }}>{periodStats.totalAlpa} Hari</strong>
                                        </div>
                                        <div style={{ background: "#0f172a", border: "1px solid #312e81", padding: "8px 12px", borderRadius: "8px", textAlign: "center" }}>
                                            <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#a5b4fc", display: "block" }}>% RATA-RATA</span>
                                            <strong style={{ fontSize: "16px", color: "#38bdf8" }}>{periodStats.avgPct}%</strong>
                                        </div>
                                    </div>

                                    {/* Tabel Rincian Bulan Sesuai Periode */}
                                    <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "12px" }}>
                                        <table className="semester-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: "35px" }}>No</th>
                                                    <th>Bulan</th>
                                                    <th style={{ textAlign: "center" }}>Hadir</th>
                                                    <th style={{ textAlign: "center" }}>Izin</th>
                                                    <th style={{ textAlign: "center" }}>Sakit</th>
                                                    <th style={{ textAlign: "center" }}>Alpa</th>
                                                    <th style={{ textAlign: "center" }}>% Kehadiran</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {periodStats.monthsData.map((m, idx) => (
                                                    <tr key={m.monthKey}>
                                                        <td style={{ color: "#94a3b8", fontWeight: "600" }}>{idx + 1}</td>
                                                        <td style={{ fontWeight: "700" }}>{m.monthName}</td>
                                                        <td style={{ textAlign: "center", color: "#16a34a", fontWeight: "700" }}>{m.hadir} hari</td>
                                                        <td style={{ textAlign: "center", color: "#4f46e5" }}>{m.izin} hari</td>
                                                        <td style={{ textAlign: "center", color: "#d97706" }}>{m.sakit} hari</td>
                                                        <td style={{ textAlign: "center", color: "#dc2626" }}>{m.alpa} hari</td>
                                                        <td style={{ textAlign: "center", fontWeight: "700", color: m.pct >= 75 ? "#16a34a" : "#dc2626" }}>
                                                            {m.pct}%
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="total-row">
                                                    <td colSpan={2}>TOTAL PERIODE MAGANG</td>
                                                    <td style={{ textAlign: "center" }}>{periodStats.totalHadir} hari</td>
                                                    <td style={{ textAlign: "center" }}>{periodStats.totalIzin} hari</td>
                                                    <td style={{ textAlign: "center" }}>{periodStats.totalSakit} hari</td>
                                                    <td style={{ textAlign: "center" }}>{periodStats.totalAlpa} hari</td>
                                                    <td style={{ textAlign: "center" }}>{periodStats.avgPct}%</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="attendance-modal-footer">
                                    <button
                                        type="button"
                                        onClick={() => setShowSemesterModal(false)}
                                        style={{
                                            border: "1px solid #cbd5e1",
                                            background: "#ffffff",
                                            color: "#475569",
                                            padding: "8px 16px",
                                            borderRadius: "8px",
                                            fontWeight: "600",
                                            fontSize: "13px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Tutup
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-semester-recap"
                                        onClick={exportPeriodPdf}
                                    >
                                        <Download size={16} />
                                        <span>Unduh PDF Rekap Periode</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default Absensi;
