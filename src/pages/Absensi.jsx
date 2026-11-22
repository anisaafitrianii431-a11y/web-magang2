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

    // Riwayat presensi untuk statistik kehadiran bulanan & rekap per bulan
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [showMonthModal, setShowMonthModal] = useState(false);
    const [companyProfile, setCompanyProfile] = useState(null);

    const currentYear = new Date().getFullYear();
    const currentMonthNum = new Date().getMonth() + 1;

    const loadCompanyProfile = async () => {
        try {
            const res = await api.get("/beranda/profil");
            const prof = res.data?.data || res.data;
            if (prof && typeof prof === "object") {
                setCompanyProfile(prof);
            }
        } catch (err) {
            console.warn("Profil kantor belum dapat dimuat dari landing page:", err);
        }
    };

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

    const monthsList = [
        { value: "01", label: "Januari" },
        { value: "02", label: "Februari" },
        { value: "03", label: "Maret" },
        { value: "04", label: "April" },
        { value: "05", label: "Mei" },
        { value: "06", label: "Juni" },
        { value: "07", label: "Juli" },
        { value: "08", label: "Agustus" },
        { value: "09", label: "September" },
        { value: "10", label: "Oktober" },
        { value: "11", label: "November" },
        { value: "12", label: "Desember" },
    ];
    const yearsList = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

    const [selectedYearVal, selectedMonthVal] = useMemo(() => {
        const parts = (selectedMonth || "").split("-");
        return [parts[0] || String(currentYear), parts[1] || String(currentMonthNum).padStart(2, "0")];
    }, [selectedMonth, currentYear, currentMonthNum]);

    const sortedMonthlyRecords = useMemo(() => {
        return [...monthlyRecords].sort((a, b) => String(a.tanggal || "").localeCompare(String(b.tanggal || "")));
    }, [monthlyRecords]);

    const exportMonthlyPdf = async () => {
        let currentProfile = companyProfile;
        if (!currentProfile) {
            try {
                const res = await api.get("/beranda/profil");
                currentProfile = res.data?.data || res.data;
                if (currentProfile) setCompanyProfile(currentProfile);
            } catch {}
        }

        const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
        const [y, m] = (selectedMonth || "").split("-");
        const monthYearTitle = `BULAN ${new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" }).toUpperCase()}`;

        const participantName = participant?.participant_name || currentUser?.name || "Peserta Magang";
        const participantCode = participant?.participant_code || currentUser?.npm || currentUser?.nim || "-";
        const institution = participant?.institution || currentUser?.institution || "Sekolah Tinggi Teknologi Payakumbuh";
        const supervisorName = participant?.pembimbing?.nama || participant?.pembimbing?.name || participant?.supervisor_name || "Ibrahim Saputra, S.Kom";

        // 1. Kop Surat Dinamis dari Profil Landing Page
        const companyName = currentProfile?.nama_perusahaan || "CV. PUTRA ANUGRAH MANDIRI (PAM-TECHNO)";
        const companyAddress = currentProfile?.alamat || "Jl. M. Yunus No. 6, Lubuk Lintah, Kec. Kuranji, Kota Padang, Sumatera Barat 25153";
        const companyPhone = currentProfile?.telepon || "";
        const companyEmail = currentProfile?.email || "";
        const companyWebsite = currentProfile?.website || "";

        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42);
        doc.text(companyName.toUpperCase(), 105, 15, { align: "center", maxWidth: 180 });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text("Sistem Informasi Portal Magang & Praktik Kerja Lapangan (PKL)", 105, 20.5, { align: "center" });

        // Baris alamat kantor
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(companyAddress, 105, 25, { align: "center", maxWidth: 180 });

        // Baris kontak (Telepon, Email, Web)
        const contactParts = [];
        if (companyPhone) contactParts.push(`Telp: ${companyPhone}`);
        if (companyEmail) contactParts.push(`Email: ${companyEmail}`);
        if (companyWebsite) contactParts.push(`Web: ${companyWebsite}`);
        const contactLine = contactParts.join("   |   ");

        let headerLineY = 28.5;
        if (contactLine) {
            doc.text(contactLine, 105, 29.5, { align: "center", maxWidth: 180 });
            headerLineY = 33.5;
        }

        // Garis Ganda Pembatas Kop Surat (Rapi & Tidak Bertabrakan)
        doc.setDrawColor(79, 70, 229);
        doc.setLineWidth(0.6);
        doc.line(14, headerLineY, 196, headerLineY);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.line(14, headerLineY + 0.9, 196, headerLineY + 0.9);

        // 2. Judul Laporan
        const titleY = headerLineY + 9;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text("REKAPITULASI KEHADIRAN MAGANG BULANAN", 105, titleY, { align: "center" });
        doc.setFontSize(10);
        doc.setTextColor(79, 70, 229);
        doc.text(monthYearTitle, 105, titleY + 6, { align: "center" });

        // 3. Kotak Identitas Peserta
        const idBoxY = titleY + 11;
        const idBoxHeight = 22;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, idBoxY, 182, idBoxHeight, 2, 2, "F");
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(14, idBoxY, 182, idBoxHeight, 2, 2, "D");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text("Nama Peserta", 18, idBoxY + 6.8);
        doc.text("NPM / NIM", 18, idBoxY + 12.8);
        doc.text("Instansi / Kampus", 18, idBoxY + 18.8);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(`:  ${participantName}`, 55, idBoxY + 6.8);
        doc.text(`:  ${participantCode}`, 55, idBoxY + 12.8);
        doc.text(`:  ${institution}`, 55, idBoxY + 18.8);

        // 4. Header Tabel Harian (Dimulai tepat di bawah Kotak Identitas, tanpa strip ringkasan)
        const tableHeaderY = idBoxY + idBoxHeight + 6;
        const colWidths = [10, 44, 24, 24, 24, 56];
        const colHeaders = ["NO", "HARI & TANGGAL", "JAM MASUK", "JAM PULANG", "STATUS", "KETERANGAN"];

        const drawTableHeader = (y) => {
            doc.setFillColor(79, 70, 229);
            doc.rect(14, y, 182, 7.5, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(255, 255, 255);
            let curX = 14;
            colHeaders.forEach((h, i) => {
                const w = colWidths[i];
                if (i === 1 || i === 5) {
                    doc.text(h, curX + 3, y + 4.8);
                } else {
                    doc.text(h, curX + w / 2, y + 4.8, { align: "center" });
                }
                curX += w;
            });
        };

        drawTableHeader(tableHeaderY);
        let currentY = tableHeaderY + 7.5;
        const rowHeight = 7.5;
        const pageBottom = 238;

        if (sortedMonthlyRecords.length === 0) {
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(226, 232, 240);
            doc.rect(14, currentY, 182, 10, "FD");
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8.5);
            doc.setTextColor(148, 163, 184);
            doc.text("Belum ada catatan presensi pada bulan ini.", 105, currentY + 6.2, { align: "center" });
            currentY += 10;
        } else {
            sortedMonthlyRecords.forEach((rec, idx) => {
                if (currentY + rowHeight > pageBottom) {
                    doc.addPage();
                    currentY = 20;
                    drawTableHeader(currentY);
                    currentY += 7.5;
                }

                if (idx % 2 === 1) {
                    doc.setFillColor(248, 250, 252);
                    doc.rect(14, currentY, 182, rowHeight, "F");
                }
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.2);
                doc.rect(14, currentY, 182, rowHeight, "D");

                let tglFormatted = rec.tanggal || "-";
                try {
                    const d = new Date(rec.tanggal);
                    tglFormatted = d.toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
                } catch {}

                let curX = 14;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(15, 23, 42);

                // NO
                doc.text(String(idx + 1), curX + colWidths[0] / 2, currentY + 4.8, { align: "center" });
                curX += colWidths[0];

                // HARI & TANGGAL
                doc.text(tglFormatted, curX + 3, currentY + 4.8);
                curX += colWidths[1];

                // JAM MASUK
                doc.text(rec.jam_masuk || "--:--", curX + colWidths[2] / 2, currentY + 4.8, { align: "center" });
                curX += colWidths[2];

                // JAM PULANG
                doc.text(rec.jam_pulang || "--:--", curX + colWidths[3] / 2, currentY + 4.8, { align: "center" });
                curX += colWidths[3];

                // STATUS
                const s = rec.status || "Hadir";
                doc.setFont("helvetica", "bold");
                if (s.toLowerCase() === "hadir") doc.setTextColor(21, 128, 61);
                else if (s.toLowerCase() === "izin") doc.setTextColor(67, 56, 202);
                else if (s.toLowerCase() === "sakit") doc.setTextColor(180, 83, 9);
                else doc.setTextColor(185, 28, 28);
                doc.text(s, curX + colWidths[4] / 2, currentY + 4.8, { align: "center" });
                curX += colWidths[4];

                // KETERANGAN
                doc.setFont("helvetica", "normal");
                doc.setTextColor(71, 85, 105);
                const ket = (rec.keterangan || "-").slice(0, 36);
                doc.text(ket, curX + 3, currentY + 4.8, { maxWidth: colWidths[5] - 6 });

                currentY += rowHeight;
            });
        }

        // Baris Total Akumulatif (Footer Tabel Presisi)
        if (currentY + 8.5 > pageBottom) {
            doc.addPage();
            currentY = 20;
        }
        doc.setFillColor(238, 242, 255);
        doc.rect(14, currentY, 182, 8.5, "F");
        doc.setDrawColor(199, 210, 254);
        doc.setLineWidth(0.3);
        doc.rect(14, currentY, 182, 8.5, "D");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(30, 27, 75);

        // Kolom 1+2 (Judul Total)
        doc.text("TOTAL BULAN INI", 18, currentY + 5.2);

        // Kolom 3 (Hadir)
        doc.setTextColor(21, 128, 61);
        doc.text(`Hadir: ${monthlyStats.hadir} hari`, 14 + colWidths[0] + colWidths[1] + colWidths[2] / 2, currentY + 5.2, { align: "center" });

        // Kolom 4 (Izin)
        doc.setTextColor(67, 56, 202);
        doc.text(`Izin: ${monthlyStats.izin} hari`, 14 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] / 2, currentY + 5.2, { align: "center" });

        // Kolom 5 (Sakit)
        doc.setTextColor(180, 83, 9);
        doc.text(`Sakit: ${monthlyStats.sakit} hari`, 14 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] / 2, currentY + 5.2, { align: "center" });

        // Kolom 6 (Alpa & Persentase)
        doc.setTextColor(185, 28, 28);
        doc.text(`Alpa: ${monthlyStats.alpa} hari`, 14 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 3, currentY + 5.2);

        doc.setTextColor(67, 56, 202);
        doc.text(`${monthlyStats.percentage}% Kehadiran`, 193, currentY + 5.2, { align: "right" });

        currentY += 8.5 + 5;

        // Catatan Evaluasi di Bawah Tabel
        if (currentY + 8 > pageBottom) {
            doc.addPage();
            currentY = 20;
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`* Total kehadiran efektif sebanyak ${monthlyStats.hadir} hari kerja dari akumulasi ${monthlyStats.total} catatan presensi (${monthlyStats.percentage}% kehadiran).`, 14, currentY);

        currentY += 12;

        // Tanda Tangan (Sejajar dan Proporsional)
        if (currentY + 36 > 282) {
            doc.addPage();
            currentY = 25;
        }
        let city = "Kota Padang";
        if (currentProfile?.alamat) {
            const addressParts = currentProfile.alamat.split(",").map((s) => s.trim()).filter(Boolean);
            if (addressParts.length >= 2) {
                city = addressParts[addressParts.length - 2] || addressParts[0];
            } else if (addressParts.length === 1 && addressParts[0]) {
                city = addressParts[0];
            }
        }
        const signDate = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);

        // Baris Tanggal di Atas Tanda Tangan Kanan
        doc.text(`${city}, ${signDate}`, 135, currentY);
        currentY += 5;

        // Baris Posisi/Jabatan
        doc.text("Peserta Magang,", 22, currentY);
        doc.text("Pembimbing Magang,", 135, currentY);

        currentY += 20; // Ruang tanda tangan

        // Baris Nama
        doc.setFont("helvetica", "bold");
        doc.text(participantName, 22, currentY);
        doc.text(supervisorName, 135, currentY);

        doc.save(`rekap-absensi-bulanan-${participantName.toLowerCase().replace(/\s+/g, "-")}-${selectedMonth}.pdf`);
    };

    useEffect(() => {
        const handleProfileUpdated = (event) => {
            if (event.detail?.user) {
                setCurrentUser(event.detail.user);
            }
        };
        const handleCompanyProfileUpdated = (event) => {
            if (event.detail) {
                setCompanyProfile(event.detail);
            } else {
                void loadCompanyProfile();
            }
        };
        window.addEventListener("user-profile-updated", handleProfileUpdated);
        window.addEventListener("company-profile-updated", handleCompanyProfileUpdated);
        return () => {
            window.removeEventListener("user-profile-updated", handleProfileUpdated);
            window.removeEventListener("company-profile-updated", handleCompanyProfileUpdated);
        };
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
                            participant_code:
                                registration?.nim
                                || registration?.nim_user
                                || registration?.participant_code
                                || user?.nim
                                || user?.npm
                                || null,
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
        void loadAttendanceHistory();
        void loadCompanyProfile();
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
                                        onClick={() => setShowMonthModal(true)}
                                    >
                                        <FileText size={16} />
                                        <span>Rekap per Bulan</span>
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

                    {/* Modal Rekapitulasi Kehadiran per Bulan */}
                    {showMonthModal && (
                        <div className="attendance-modal-backdrop" onClick={() => setShowMonthModal(false)}>
                            <div className="attendance-modal-dialog" onClick={(e) => e.stopPropagation()}>
                                <div className="attendance-modal-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <div className="attendance-monthly-icon-box" style={{ width: "38px", height: "38px" }}>
                                            <FileText size={18} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#0f172a" }}>
                                                Rekapitulasi Kehadiran per Bulan
                                            </h3>
                                            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                                                {participant?.participant_name} ({participant?.participant_code || "-"})
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowMonthModal(false)}
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
                                    {/* Filter Bulan & Tahun */}
                                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", background: "#f8fafc", padding: "12px 16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                                        <div style={{ flex: 1, minWidth: "160px" }}>
                                            <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "4px" }}>
                                                PILIH BULAN
                                            </label>
                                            <select
                                                value={selectedMonthVal}
                                                onChange={(e) => setSelectedMonth(`${selectedYearVal}-${e.target.value}`)}
                                                style={{ width: "100%", padding: "7px 10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13px", fontWeight: "600", outline: "none", background: "#ffffff" }}
                                            >
                                                {monthsList.map((m) => (
                                                    <option key={m.value} value={m.value}>{m.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div style={{ width: "120px" }}>
                                            <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "4px" }}>
                                                TAHUN
                                            </label>
                                            <select
                                                value={parseInt(selectedYearVal, 10)}
                                                onChange={(e) => setSelectedMonth(`${e.target.value}-${selectedMonthVal}`)}
                                                style={{ width: "100%", padding: "7px 10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13px", fontWeight: "600", outline: "none", background: "#ffffff" }}
                                            >
                                                {yearsList.map((y) => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Stat Mini Strip in Modal */}
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "8px" }}>
                                        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "8px 12px", borderRadius: "8px", textAlign: "center" }}>
                                            <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#166534", display: "block" }}>TOTAL HADIR</span>
                                            <strong style={{ fontSize: "16px", color: "#15803d" }}>{monthlyStats.hadir} Hari</strong>
                                        </div>
                                        <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", padding: "8px 12px", borderRadius: "8px", textAlign: "center" }}>
                                            <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#3730a3", display: "block" }}>TOTAL IZIN</span>
                                            <strong style={{ fontSize: "16px", color: "#4338ca" }}>{monthlyStats.izin} Hari</strong>
                                        </div>
                                        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "8px 12px", borderRadius: "8px", textAlign: "center" }}>
                                            <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#92400e", display: "block" }}>TOTAL SAKIT</span>
                                            <strong style={{ fontSize: "16px", color: "#b45309" }}>{monthlyStats.sakit} Hari</strong>
                                        </div>
                                        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "8px 12px", borderRadius: "8px", textAlign: "center" }}>
                                            <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#991b1b", display: "block" }}>TOTAL ALPA</span>
                                            <strong style={{ fontSize: "16px", color: "#b91c1c" }}>{monthlyStats.alpa} Hari</strong>
                                        </div>
                                        <div style={{ background: "#0f172a", border: "1px solid #312e81", padding: "8px 12px", borderRadius: "8px", textAlign: "center" }}>
                                            <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#a5b4fc", display: "block" }}>% KEHADIRAN</span>
                                            <strong style={{ fontSize: "16px", color: "#38bdf8" }}>{monthlyStats.percentage}%</strong>
                                        </div>
                                    </div>

                                    {/* Tabel Rincian Harian Bulan Ini */}
                                    <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "12px", maxHeight: "360px" }}>
                                        <table className="semester-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: "35px", textAlign: "center" }}>No</th>
                                                    <th>Hari & Tanggal</th>
                                                    <th style={{ textAlign: "center" }}>Jam Masuk</th>
                                                    <th style={{ textAlign: "center" }}>Jam Pulang</th>
                                                    <th style={{ textAlign: "center" }}>Status</th>
                                                    <th>Keterangan</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedMonthlyRecords.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} style={{ textAlign: "center", padding: "28px 16px", color: "#64748b" }}>
                                                            Belum ada catatan presensi pada bulan ini.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    sortedMonthlyRecords.map((m, idx) => {
                                                        const s = String(m.status || "Hadir").toLowerCase();
                                                        const badgeStyle =
                                                            s === "hadir" ? { bg: "#dcfce7", color: "#15803d" }
                                                            : s === "izin" ? { bg: "#e0e7ff", color: "#4338ca" }
                                                            : s === "sakit" ? { bg: "#fef3c7", color: "#b45309" }
                                                            : { bg: "#fee2e2", color: "#b91c1c" };

                                                        let tglFormatted = m.tanggal || "-";
                                                        try {
                                                            const d = new Date(m.tanggal);
                                                            tglFormatted = d.toLocaleDateString("id-ID", {
                                                                weekday: "short",
                                                                day: "numeric",
                                                                month: "short",
                                                                year: "numeric"
                                                            });
                                                        } catch {}

                                                        return (
                                                            <tr key={m.id || idx}>
                                                                <td style={{ color: "#94a3b8", fontWeight: "600", textAlign: "center" }}>{idx + 1}</td>
                                                                <td style={{ fontWeight: "700", whiteSpace: "nowrap" }}>{tglFormatted}</td>
                                                                <td style={{ textAlign: "center" }}>{m.jam_masuk || "--:--"}</td>
                                                                <td style={{ textAlign: "center" }}>{m.jam_pulang || "--:--"}</td>
                                                                <td style={{ textAlign: "center" }}>
                                                                    <span style={{
                                                                        display: "inline-block",
                                                                        padding: "2px 8px",
                                                                        borderRadius: "6px",
                                                                        fontSize: "11.5px",
                                                                        fontWeight: "700",
                                                                        background: badgeStyle.bg,
                                                                        color: badgeStyle.color
                                                                    }}>
                                                                        {m.status || "Hadir"}
                                                                    </span>
                                                                </td>
                                                                <td style={{ fontSize: "12px", color: "#475569" }}>{m.keterangan || "—"}</td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                                {sortedMonthlyRecords.length > 0 && (
                                                    <tr className="total-row">
                                                        <td colSpan={2}>TOTAL BULAN INI</td>
                                                        <td colSpan={2} style={{ textAlign: "center" }}>{monthlyStats.hadir} Hadir / {monthlyStats.total} Presensi</td>
                                                        <td style={{ textAlign: "center" }}>{monthlyStats.percentage}%</td>
                                                        <td style={{ fontSize: "11.5px" }}>{monthlyStats.izin} Izin, {monthlyStats.sakit} Sakit, {monthlyStats.alpa} Alpa</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="attendance-modal-footer">
                                    <button
                                        type="button"
                                        onClick={() => setShowMonthModal(false)}
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
                                        onClick={exportMonthlyPdf}
                                    >
                                        <Download size={16} />
                                        <span>Unduh PDF Rekap Bulanan</span>
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
