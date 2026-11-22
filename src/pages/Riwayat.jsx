import { useCallback, useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { Link } from "react-router-dom";
import {
    Calendar,
    Clock,
    User,
    Users,
    Building,
    CheckCircle2,
    AlertCircle,
    XCircle,
    FileText,
    Camera,
    Video,
    MapPin,
    Search,
    RotateCcw,
    Download,
    RefreshCw,
    Award,
    Check,
    X,
    ExternalLink
} from "lucide-react";
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

const formatDate = (dateStr) => {
    if (!dateStr) return { day: "-", fullDate: "-", shortDate: "-" };
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return { day: "-", fullDate: dateStr, shortDate: dateStr };
        const day = date.toLocaleDateString("id-ID", { weekday: "long" });
        const fullDate = date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
        const shortDate = date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
        return { day, fullDate, shortDate };
    } catch {
        return { day: "-", fullDate: dateStr, shortDate: dateStr };
    }
};

function Riwayat() {
    const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reviewMessage, setReviewMessage] = useState("");
    const [reviewingId, setReviewingId] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [dayFilter, setDayFilter] = useState("");
    const [selectedParticipant, setSelectedParticipant] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [downloadingLetter, setDownloadingLetter] = useState(false);
    const [clock, setClock] = useState(new Date());
    const [previewImage, setPreviewImage] = useState(null);
    const [participant, setParticipant] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [photoError, setPhotoError] = useState(false);
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    });
    const [role] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null")?.role?.toLowerCase() || "peserta";
        } catch {
            return "peserta";
        }
    });

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
            await loadData();
        } catch (downloadError) {
            alert(downloadError.response?.status === 404
                ? "Berkas surat balasan belum tersedia di server. Silakan hubungi admin."
                : "Gagal mengunduh surat balasan. Silakan coba lagi.");
        } finally {
            setDownloadingLetter(false);
        }
    };

    const fetchAttendance = useCallback(async () => {
        const endpoint = role === "admin" || role === "pembimbing" ? "/absensi" : "/absensi-saya";
        const response = await api.get(endpoint);
        const responseData = response.data?.data || response.data || [];
        return Array.isArray(responseData) ? responseData : [];
    }, [role]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const attendance = await fetchAttendance();
            setError("");
            setData(attendance);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Data absensi gagal dimuat. Pastikan server API aktif lalu muat ulang halaman.");
        } finally {
            setLoading(false);
        }
    }, [fetchAttendance]);

    useEffect(() => {
        let cancelled = false;
        const loadInitialData = async () => {
            try {
                const attendance = await fetchAttendance();
                if (!cancelled) {
                    setError("");
                    setData(attendance);
                }
            } catch (requestError) {
                if (!cancelled) {
                    setError(requestError.response?.data?.message || "Data absensi gagal dimuat. Pastikan server API aktif lalu muat ulang halaman.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void loadInitialData();
        const timer = setInterval(() => setClock(new Date()), 1000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [fetchAttendance]);

    useEffect(() => {
        let cancelled = false;
        const loadProfile = async () => {
            if (role === "admin" || role === "pembimbing") {
                setProfileLoading(false);
                return;
            }
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
            } catch {
                // Fallback using currentUser from localStorage
            } finally {
                if (!cancelled) setProfileLoading(false);
            }
        };

        void loadProfile();
        return () => {
            cancelled = true;
        };
    }, [role]);

    const handleReviewLeave = async (attendanceId, decision) => {
        setReviewingId(attendanceId);
        setReviewMessage("");
        setError("");

        try {
            const response = await api.post(`/absensi/${attendanceId}/review-izin`, { decision });
            setReviewMessage(response.data.message);
            await loadData();
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Permohonan izin gagal diproses.");
        } finally {
            setReviewingId(null);
        }
    };

    const dateLabel = clock.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const photoUrl = getPhotoUrl(currentUser?.foto || participant?.foto);
    const todayAttendance = useMemo(() => {
        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return data.find((item) => {
            if (!item?.tanggal) return false;
            return String(item.tanggal).slice(0, 10) === todayStr;
        });
    }, [data]);

    const participantsList = useMemo(() => {
        const unique = new Map();
        data.forEach((item) => {
            const rawName = (item.participant_name || item.user?.name || "").trim();
            if (!rawName) return;
            const userId = item.user_id || item.user?.id;
            const cleanName = rawName.toLowerCase().replace(/\s+/g, " ");
            const simplified = cleanName.replace(/h/g, "").replace(/n+/g, "n");

            let matchedKey = null;
            if (userId) {
                matchedKey = `USER_${userId}`;
            } else {
                for (const [key, val] of unique.entries()) {
                    const exSimplified = val.name.toLowerCase().replace(/\s+/g, " ").replace(/h/g, "").replace(/n+/g, "n");
                    if (exSimplified === simplified || cleanName.includes(val.name.toLowerCase()) || val.name.toLowerCase().includes(cleanName)) {
                        matchedKey = key;
                        break;
                    }
                }
            }

            if (!matchedKey) {
                matchedKey = simplified;
            }

            const code = item.participant_code || (userId ? `USER-${userId}` : cleanName);

            if (!unique.has(matchedKey)) {
                unique.set(matchedKey, {
                    code,
                    userId,
                    name: rawName,
                    institution: item.institution || item.instansi || "Sekolah Tinggi Teknologi Payakumbuh",
                    codes: [code],
                    names: [cleanName, simplified],
                });
            } else {
                const existing = unique.get(matchedKey);
                if (code && !existing.codes.includes(code)) {
                    existing.codes.push(code);
                }
                if (!existing.names.includes(cleanName)) {
                    existing.names.push(cleanName);
                }
                if (!existing.names.includes(simplified)) {
                    existing.names.push(simplified);
                }
                if (item.participant_code && !String(item.participant_code).startsWith("USER-")) {
                    existing.code = item.participant_code;
                }
                if (rawName.length > existing.name.length) {
                    existing.name = rawName;
                }
            }
        });
        return Array.from(unique.values());
    }, [data]);

    const activeMonth = selectedMonth;

    const stats = useMemo(() => {
        let scopedData = data;
        if (activeMonth) {
            scopedData = scopedData.filter((item) => String(item.tanggal || "").slice(0, 7) === activeMonth);
        }
        if (dayFilter) {
            scopedData = scopedData.filter((item) => formatDate(item.tanggal).day.toLowerCase() === dayFilter.toLowerCase());
        }
        if ((role === "pembimbing" || role === "admin") && selectedParticipant !== "all") {
            const selectedObj = participantsList.find((p) => p.code === selectedParticipant);
            scopedData = scopedData.filter((item) => {
                const code = item.participant_code || (item.user_id ? `USER-${item.user_id}` : item.participant_name);
                const name = (item.participant_name || item.user?.name || "").trim().toLowerCase();
                if (selectedObj) {
                    return selectedObj.codes.includes(code) || (selectedObj.name && name === selectedObj.name.toLowerCase());
                }
                return code === selectedParticipant;
            });
        }

        let hadir = 0;
        let wfo = 0;
        let zoom = 0;
        let izin = 0;
        let sakit = 0;
        let alpa = 0;
        let pending = 0;

        scopedData.forEach((item) => {
            const isZoom = String(item.keterangan || "").includes("[ZOOM");
            if (item.approval_status === "pending") {
                pending++;
            }
            if (item.status === "Hadir") {
                hadir++;
                if (isZoom) zoom++;
                else wfo++;
            } else if (item.status === "Izin") {
                izin++;
            } else if (item.status === "Sakit") {
                sakit++;
            } else if (item.status === "Tanpa Keterangan" || item.status === "Alpa" || item.approval_status === "rejected") {
                alpa++;
            }
        });

        const totalValid = hadir + izin + sakit + alpa;
        const percentage = totalValid > 0 ? Math.round((hadir / totalValid) * 100) : 0;

        return {
            total: scopedData.length,
            hadir,
            wfo,
            zoom,
            izin,
            sakit,
            alpa,
            pending,
            percentage,
        };
    }, [data, dayFilter, activeMonth, selectedParticipant, participantsList, role]);

    const filteredData = useMemo(() => {
        let result = data;
        if (activeMonth) {
            result = result.filter((item) => String(item.tanggal || "").slice(0, 7) === activeMonth);
        }
        if (dayFilter) {
            result = result.filter((item) => formatDate(item.tanggal).day.toLowerCase() === dayFilter.toLowerCase());
        }
        if ((role === "pembimbing" || role === "admin") && selectedParticipant !== "all") {
            const selectedObj = participantsList.find((p) => p.code === selectedParticipant);
            result = result.filter((item) => {
                const code = item.participant_code || (item.user_id ? `USER-${item.user_id}` : item.participant_name);
                const name = (item.participant_name || item.user?.name || "").trim().toLowerCase();
                if (selectedObj) {
                    return selectedObj.codes.includes(code) || (selectedObj.name && name === selectedObj.name.toLowerCase());
                }
                return code === selectedParticipant;
            });
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter((item) => {
                const name = (item.participant_name || item.user?.name || "").toLowerCase();
                const inst = (item.institution || item.instansi || "").toLowerCase();
                const tgl = String(item.tanggal || "").toLowerCase();
                const dInfo = formatDate(item.tanggal);
                const dayStr = (dInfo.day || "").toLowerCase();
                const fullDateStr = (dInfo.fullDate || "").toLowerCase();
                const shortDateStr = (dInfo.shortDate || "").toLowerCase();
                const ket = String(item.keterangan || "").toLowerCase();
                const status = String(item.status || "").toLowerCase();
                return (
                    name.includes(q) ||
                    inst.includes(q) ||
                    tgl.includes(q) ||
                    dayStr.includes(q) ||
                    fullDateStr.includes(q) ||
                    shortDateStr.includes(q) ||
                    ket.includes(q) ||
                    status.includes(q)
                );
            });
        }
        if (statusFilter) {
            result = result.filter((item) => {
                const isZoom = String(item.keterangan || "").includes("[ZOOM");
                if (statusFilter === "Hadir") return item.status === "Hadir";
                if (statusFilter === "WFO") return item.status === "Hadir" && !isZoom;
                if (statusFilter === "Zoom") return item.status === "Hadir" && isZoom;
                if (statusFilter === "Pending") return item.approval_status === "pending";
                if (statusFilter === "Alpa") return item.status === "Tanpa Keterangan" || item.status === "Alpa" || item.approval_status === "rejected";
                return item.status === statusFilter;
            });
        }
        return result;
    }, [data, dayFilter, activeMonth, selectedParticipant, participantsList, role, searchQuery, statusFilter]);

    const displayedData = filteredData;

    const exportMonthlyPdf = () => {
        const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
        doc.setLineHeightFactor(1.5);
        const [yearStr, monthStr] = (activeMonth || new Date().toISOString().slice(0, 7)).split("-");
        const year = parseInt(yearStr, 10);
        const monthIndex = parseInt(monthStr, 10) - 1;
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        const monthYearLabel = new Date(year, monthIndex, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

        let hariKerjaCount = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, monthIndex, d);
            const dayOfWeek = dateObj.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                hariKerjaCount++;
            }
        }

        const currentUser = (() => {
            try {
                return JSON.parse(localStorage.getItem("user") || "null");
            } catch {
                return null;
            }
        })();
        const supervisorName = currentUser?.name || currentUser?.nama || "Ibrahim Saputra, S.Kom";

        const isParticipantRole = role !== "admin" && role !== "pembimbing";
        const targetList = isParticipantRole
            ? [{
                code: currentUser?.participant_code || (currentUser?.id ? `USER-${currentUser.id}` : "me"),
                userId: currentUser?.id,
                name: currentUser?.name || currentUser?.nama || "Peserta Magang",
                institution: currentUser?.instansi || currentUser?.institution || "Sekolah Tinggi Teknologi Payakumbuh"
            }]
            : selectedParticipant !== "all"
                ? (participantsList.filter((p) => p.code === selectedParticipant).length > 0
                    ? participantsList.filter((p) => p.code === selectedParticipant)
                    : [{ code: selectedParticipant, name: "Peserta Magang", institution: "Sekolah Tinggi Teknologi Payakumbuh" }])
                : participantsList;

        const institutionName = targetList.find((p) => p.institution && p.institution !== "........................................................")?.institution
            || currentUser?.instansi
            || currentUser?.institution
            || "Sekolah Tinggi Teknologi Payakumbuh";

        const participantStats = targetList.map((participant) => {
            const participantRecords = data.filter((item) => {
                const dateMatch = String(item.tanggal || "").slice(0, 7) === activeMonth;
                if (!dateMatch) return false;
                const userId = item.user_id || item.user?.id;
                const code = item.participant_code || (userId ? `USER-${userId}` : item.participant_name);
                const rawName = (item.participant_name || item.user?.name || "").trim().toLowerCase().replace(/\s+/g, " ");
                const simplified = rawName.replace(/h/g, "").replace(/n+/g, "n");

                if (participant.userId && userId && participant.userId === userId) {
                    return true;
                }
                if (participant.codes && participant.codes.includes(code)) {
                    return true;
                }
                if (participant.names && (participant.names.includes(rawName) || participant.names.includes(simplified))) {
                    return true;
                }
                const pSimplified = (participant.name || "").toLowerCase().replace(/\s+/g, " ").replace(/h/g, "").replace(/n+/g, "n");
                return pSimplified === simplified || (participant.name && rawName === participant.name.toLowerCase());
            });

            let hadir = 0;
            let izin = 0;
            let sakit = 0;
            let alpha = 0;

            participantRecords.forEach((match) => {
                const rawStatus = (match.status || "").trim().toLowerCase();
                if (match.approval_status === "rejected") {
                    alpha++;
                } else if (match.approval_status === "pending" || rawStatus === "izin") {
                    izin++;
                } else if (rawStatus === "hadir") {
                    hadir++;
                } else if (rawStatus === "sakit") {
                    sakit++;
                } else if (rawStatus === "alpa" || rawStatus === "tidak hadir") {
                    alpha++;
                }
            });

            const persentase = hariKerjaCount > 0
                ? Math.min(100, Math.round((hadir / hariKerjaCount) * 100))
                : 0;

            return {
                code: participant.code,
                name: participant.name,
                hadir,
                izin,
                sakit,
                alpha,
                persentase,
                catatan: "-",
            };
        });

        if (selectedParticipant !== "all" && targetList.length) {
            targetList.forEach((selectedPerson, personIndex) => {
                if (personIndex > 0) doc.addPage();
                const reportInstitutionName = selectedPerson.institution
                    && selectedPerson.institution !== "........................................................"
                    ? selectedPerson.institution
                    : currentUser?.instansi || currentUser?.institution || institutionName;
                const participantRecords = data.filter((item) => {
                    if (String(item.tanggal || "").slice(0, 7) !== activeMonth) return false;
                    const userId = item.user_id || item.user?.id;
                    const code = item.participant_code || (userId ? `USER-${userId}` : item.participant_name);
                    const rawName = (item.participant_name || item.user?.name || "").trim().toLowerCase().replace(/\s+/g, " ");
                    const simplified = rawName.replace(/h/g, "").replace(/n+/g, "n");

                    if (selectedPerson.userId && userId && selectedPerson.userId === userId) return true;
                    if (selectedPerson.codes?.includes(code)) return true;
                    if (selectedPerson.names?.includes(rawName) || selectedPerson.names?.includes(simplified)) return true;
                    const personName = selectedPerson.name.toLowerCase();
                    const simplifiedPersonName = personName.replace(/\s+/g, " ").replace(/h/g, "").replace(/n+/g, "n");
                    return simplifiedPersonName === simplified || personName === rawName;
                });
                const recordsByDate = new Map();
                participantRecords.forEach((item) => {
                    const dateKey = String(item.tanggal || "").slice(0, 10);
                    if (dateKey && !recordsByDate.has(dateKey)) recordsByDate.set(dateKey, item);
                });

                const dailyRows = Array.from({ length: daysInMonth }, (_, index) => {
                    const day = index + 1;
                    const date = new Date(year, monthIndex, day);
                    const dateKey = `${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`;
                    const record = recordsByDate.get(dateKey);
                    const weekend = date.getDay() === 0 || date.getDay() === 6;
                    const rawStatus = String(record?.status || "").trim().toLowerCase();
                    let status = "-";
                    let notes = weekend ? "Libur Akhir Pekan" : "-";

                    if (record) {
                        if (record.approval_status === "rejected" || rawStatus === "alpa" || rawStatus === "tidak hadir") {
                            status = "Tanpa Keterangan";
                        } else if (record.approval_status === "pending" || rawStatus === "izin") {
                            status = "Izin";
                        } else if (rawStatus === "hadir") {
                            status = "Hadir";
                        } else if (rawStatus === "sakit") {
                            status = "Sakit";
                        } else if (record.status) {
                            status = String(record.status);
                        }

                        const details = [
                            record.keterangan,
                            record.jam_masuk ? `Masuk: ${record.jam_masuk}` : "",
                            record.jam_pulang ? `Pulang: ${record.jam_pulang}` : "",
                        ].filter(Boolean);
                        notes = details.length ? details.join(" | ") : "-";
                    }

                    return {
                        date,
                        dayLabel: date.toLocaleDateString("id-ID", { weekday: "long" }),
                        dateLabel: `${String(day).padStart(2, "0")}/${monthStr}/${year}`,
                        status,
                        notes,
                    };
                });

                const dailyTotals = dailyRows.reduce((totals, row) => {
                    if (row.status === "Hadir") totals.hadir++;
                    if (row.status === "Izin") totals.izin++;
                    if (row.status === "Sakit") totals.sakit++;
                    if (row.status === "Tanpa Keterangan") totals.alpha++;
                    return totals;
                }, { hadir: 0, izin: 0, sakit: 0, alpha: 0 });
                const individualPercentage = hariKerjaCount > 0
                    ? Math.min(100, Math.round((dailyTotals.hadir / hariKerjaCount) * 100))
                    : 0;

                const pageWidth = doc.internal.pageSize.getWidth();
                const left = 14;
                const width = pageWidth - left * 2;
                const border = [0, 0, 0];
                const columnWidths = [10, 31, 27, 52, width - 120];
                const columnTitles = ["No.", "Tanggal", "Hari", "Status (Hadir/Izin/Sakit/Alpha)", "Keterangan"];

                doc.setFont("helvetica", "bold");
                doc.setFontSize(13);
                doc.setTextColor(0);
                doc.text("LAPORAN ABSENSI MAGANG", pageWidth / 2, 20, { align: "center" });
                const metaY = 26;
                const metaHeight = 17;
                doc.setDrawColor(...border);
                doc.setFillColor(255, 255, 255);
                doc.rect(left, metaY, width, metaHeight, "FD");
                doc.line(left, metaY + 8, left + width, metaY + 8);
                doc.line(left + width / 2, metaY, left + width / 2, metaY + metaHeight);
                doc.setFontSize(6.5);
                const drawMeta = (label, value, x, y, maxWidth, valueOffset = 40) => {
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(6.5);
                    doc.setTextColor(0);
                    doc.text(label, x, y);
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(0);
                    const valueText = `: ${value || "-"}`;
                    const availableWidth = maxWidth - valueOffset - 3;
                    const valueFontSize = Math.min(6.5, (availableWidth / doc.getTextWidth(valueText)) * 6.5);
                    doc.setFontSize(valueFontSize);
                    doc.text(valueText, x + valueOffset, y);
                };
                drawMeta("Kampus", reportInstitutionName, left + 3, metaY + 5.5, width / 2 - 3, 25);
                drawMeta("Bulan / Tahun", monthYearLabel, left + width / 2 + 3, metaY + 5.5, width / 2 - 3, 31);
                drawMeta("Nama Peserta Magang", selectedPerson.name, left + 3, metaY + 13.5, width / 2 - 3, 40);
                drawMeta("Pembimbing Lapangan", supervisorName, left + width / 2 + 3, metaY + 13.5, width / 2 - 3, 40);

                const summaryTitleY = 60;
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.setTextColor(0);
                doc.text("Ringkasan Kehadiran Bulan Ini", left, summaryTitleY);

                const summaryY = 63;
                const summaryWidth = width / 6;
                const summaryHeaders = ["Hari Kerja", "Hadir", "Izin", "Sakit", "Tanpa Keterangan", "Persentase Hadir"];
                const summaryValues = [
                    String(hariKerjaCount),
                    String(dailyTotals.hadir),
                    String(dailyTotals.izin),
                    String(dailyTotals.sakit),
                    String(dailyTotals.alpha),
                    `${individualPercentage} %`,
                ];
                summaryHeaders.forEach((label, index) => {
                    const x = left + index * summaryWidth;
                    doc.setFillColor(242, 242, 242);
                    doc.setDrawColor(...border);
                    doc.rect(x, summaryY, summaryWidth, 6, "FD");
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(6);
                    doc.setTextColor(0);
                    doc.text(label, x + summaryWidth / 2, summaryY + 4, { align: "center", maxWidth: summaryWidth - 1 });

                    doc.setFillColor(248, 248, 248);
                    doc.rect(x, summaryY + 6, summaryWidth, 7, "FD");
                    doc.setFontSize(7);
                    doc.setTextColor(0);
                    doc.text(summaryValues[index], x + summaryWidth / 2, summaryY + 10.5, { align: "center" });
                });

                const sectionY = 81;
                doc.setFont("helvetica", "bold");
                doc.setFontSize(8.5);
                doc.setTextColor(0);
                doc.text("Detail Absensi Harian", left, sectionY);

                let tableY = 84;
                const headerHeight = 7;
                const rowHeight = 8.7;
                const pageBottom = doc.internal.pageSize.getHeight() - 14;
                const drawTableHeader = () => {
                    let x = left;
                    columnTitles.forEach((title, index) => {
                        doc.setFillColor(235, 235, 235);
                        doc.setDrawColor(...border);
                        doc.rect(x, tableY, columnWidths[index], headerHeight, "FD");
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(index === 3 ? 5.5 : 6.5);
                        doc.setTextColor(0);
                        doc.text(title, x + (index === 4 ? 2 : columnWidths[index] / 2), tableY + 4.5, {
                            align: index === 4 ? "left" : "center",
                            maxWidth: columnWidths[index] - 2,
                        });
                        x += columnWidths[index];
                    });
                    tableY += headerHeight;
                };
                drawTableHeader();
                dailyRows.forEach((row, index) => {
                    if (tableY + rowHeight > pageBottom) {
                        doc.addPage();
                        tableY = 14;
                        drawTableHeader();
                    }
                    let x = left;
                    const values = [String(index + 1), row.dateLabel, row.dayLabel, row.status, row.notes];
                    values.forEach((value, columnIndex) => {
                        const rowShade = index % 2 ? 248 : 255;
                        doc.setFillColor(rowShade, rowShade, rowShade);
                        doc.setDrawColor(...border);
                        doc.rect(x, tableY, columnWidths[columnIndex], rowHeight, "FD");
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(columnIndex === 4 ? 6 : 6.2);
                        doc.setTextColor(0);
                        doc.text(value, x + (columnIndex === 4 ? 2 : columnWidths[columnIndex] / 2), tableY + rowHeight / 2 + 1, {
                            align: columnIndex === 4 ? "left" : "center",
                            maxWidth: columnWidths[columnIndex] - 3,
                        });
                        x += columnWidths[columnIndex];
                    });
                    tableY += rowHeight;
                });
            });

            const filename = `rekap-absensi-${(targetList[0]?.name || targetList[0]?.code || "peserta").toLowerCase().replace(/\s+/g, "-")}-${activeMonth || "semua"}.pdf`;
            doc.save(filename);
            return;
        }

        const totalDisplayRows = participantStats.length;
        const tableRowHeight = 12.75;
        const attendanceSectionY = 62;
        const tableHeaderStartY = attendanceSectionY + 9;
        const tableHeaderHeight = 8;
        const pageBottom = doc.internal.pageSize.getHeight() - 14;
        const signatureSpace = 54;
        const ROWS_PER_PAGE = Math.max(
            1,
            Math.floor((pageBottom - tableHeaderStartY - tableHeaderHeight - signatureSpace) / tableRowHeight)
        );
        const totalPages = Math.ceil(totalDisplayRows / ROWS_PER_PAGE) || 1;

        const tableX = 14;
        const tableWidth = 182;
        const colWidths = [8, 48, 13, 13, 13, 13, 18, 25, 31];
        const headers = ["No.", "Nama Peserta", "Hadir", "Izin", "Sakit", "Alpha", "Hari Kerja", "Persentase Hadir", "Catatan"];

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            if (pageNum > 1) {
                doc.addPage();
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(17);
            doc.setTextColor(0);
            doc.text("REKAP ABSENSI MAGANG BULANAN", 105, 19, { align: "center" });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            doc.setTextColor(0);
            doc.text(
                "Laporan seluruh peserta dalam satu tabel untuk satu bulan pelaporan.",
                105,
                25,
                { align: "center", maxWidth: 170 }
            );

            doc.setDrawColor(0);
            doc.setLineWidth(0.3);
            doc.setFillColor(245, 245, 245);
            doc.roundedRect(tableX, 30, tableWidth, 22, 2, 2, "FD");

            doc.setDrawColor(0);
            doc.line(tableX, 41, tableX + tableWidth, 41);
            doc.line(114, 30, 114, 41);

            const drawMetadata = (label, value, labelX, colonX, valueX, y, maxValueWidth) => {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.setTextColor(0);
                doc.text(label, labelX, y);
                doc.setFont("helvetica", "normal");
                doc.text(":", colonX, y);

                const text = String(value || "-");
                const fontSize = Math.min(9, (maxValueWidth / doc.getTextWidth(text)) * 9);
                doc.setFontSize(fontSize);
                doc.text(text, valueX, y, { maxWidth: maxValueWidth });
            };

            drawMetadata("Kampus", institutionName, 17, 44, 49, 36, 62);
            drawMetadata("Pembimbing", supervisorName, 17, 44, 49, 48, tableWidth - 38);
            drawMetadata("Bulan / Tahun", monthYearLabel, 117, 149, 154, 36, 40);

            const sec2Y = attendanceSectionY;
            doc.setFillColor(235, 235, 235);
            doc.roundedRect(tableX, sec2Y, tableWidth, 9, 1.5, 1.5, "F");

            doc.setFillColor(0);
            doc.circle(18.8, sec2Y + 2.7, 1, "F");
            doc.circle(21.2, sec2Y + 3.2, 0.8, "F");
            doc.triangle(17.3, sec2Y + 5.8, 20.3, sec2Y + 5.8, 18.8, sec2Y + 3.8, "F");
            doc.triangle(20.2, sec2Y + 5.8, 22.4, sec2Y + 5.8, 21.3, sec2Y + 4.2, "F");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text("Laporan Absensi per Peserta Magang", 24.5, sec2Y + 6, { maxWidth: tableWidth - 30 });

            const tableHeaderY = sec2Y + 9;
            const headerHeight = 8;

            doc.setFillColor(235, 235, 235);
            doc.setDrawColor(0);
            doc.setLineWidth(0.2);
            doc.rect(tableX, tableHeaderY, tableWidth, headerHeight, "FD");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.8);
            doc.setTextColor(0);

            let curX = tableX;
            colWidths.forEach((w, i) => {
                if (i === 1) {
                    doc.text(headers[i], curX + 3, tableHeaderY + 5.5, { maxWidth: w - 4 });
                } else {
                    doc.text(headers[i], curX + w / 2, tableHeaderY + 5.5, { align: "center", maxWidth: w - 1 });
                }
                curX += w;
            });

            const rowHeight = tableRowHeight;
            const startIdx = (pageNum - 1) * ROWS_PER_PAGE;
            const endIdx = Math.min(startIdx + ROWS_PER_PAGE, totalDisplayRows);

            for (let i = startIdx; i < endIdx; i++) {
                const rowY = tableHeaderY + headerHeight + (i - startIdx) * rowHeight;
                const isEven = (i - startIdx) % 2 === 1;

                const rowShade = isEven ? 248 : 255;
                doc.setFillColor(rowShade, rowShade, rowShade);
                doc.setDrawColor(0);
                doc.setLineWidth(0.2);
                doc.rect(tableX, rowY, tableWidth, rowHeight, "FD");

                let vX = tableX;
                for (let c = 0; c < colWidths.length - 1; c++) {
                    vX += colWidths[c];
                    doc.line(vX, rowY, vX, rowY + rowHeight);
                }

                const rowNumber = i + 1;
                const pData = participantStats[i];

                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(0);

                let cX = tableX;
                doc.text(String(rowNumber), cX + colWidths[0] / 2, rowY + rowHeight / 2 + 1.5, { align: "center" });
                cX += colWidths[0];

                doc.text(pData.name, cX + 3, rowY + rowHeight / 2 + 1.5, { maxWidth: colWidths[1] - 6 });
                cX += colWidths[1];

                doc.text(String(pData.hadir), cX + colWidths[2] / 2, rowY + rowHeight / 2 + 1.5, { align: "center" });
                cX += colWidths[2];

                doc.text(String(pData.izin), cX + colWidths[3] / 2, rowY + rowHeight / 2 + 1.5, { align: "center" });
                cX += colWidths[3];

                doc.text(String(pData.sakit), cX + colWidths[4] / 2, rowY + rowHeight / 2 + 1.5, { align: "center" });
                cX += colWidths[4];

                doc.text(String(pData.alpha), cX + colWidths[5] / 2, rowY + rowHeight / 2 + 1.5, { align: "center" });
                cX += colWidths[5];

                doc.text(String(hariKerjaCount), cX + colWidths[6] / 2, rowY + rowHeight / 2 + 1.5, { align: "center" });
                cX += colWidths[6];

                doc.text(`${pData.persentase} %`, cX + colWidths[7] / 2, rowY + rowHeight / 2 + 1.5, { align: "center" });
                cX += colWidths[7];

                doc.text(pData.catatan || "-", cX + colWidths[8] / 2, rowY + rowHeight / 2 + 1.5, { align: "center" });
            }

            const tableEndY = tableHeaderY + headerHeight + (endIdx - startIdx) * rowHeight;

            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(0);
            doc.text(
                "Persentase hadir = (jumlah hadir ÷ jumlah hari kerja) × 100%. Isi satu baris untuk setiap peserta; gunakan satu PDF untuk satu bulan.",
                tableX,
                tableEndY + 5.5
            );

            if (pageNum === totalPages) {
                const sigY = tableEndY + 19;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(0);

                doc.text("Mengetahui,", 158, sigY, { align: "center" });
                doc.text("Pembimbing Lapangan", 158, sigY + 6, { align: "center" });

                doc.setDrawColor(0);
                doc.setLineWidth(0.4);
                doc.line(132, sigY + 27, 184, sigY + 27);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.setTextColor(0);
                doc.text(`( ${supervisorName} )`, 158, sigY + 32, { align: "center" });
            }
        }

        const filename = (selectedParticipant !== "all" || isParticipantRole)
            ? `laporan-rekap-absensi-${(targetList[0]?.name || "peserta").toLowerCase().replace(/\s+/g, "-")}-${activeMonth || "semua"}.pdf`
            : `laporan-rekap-absensi-bulanan-${activeMonth || "semua"}.pdf`;
        doc.save(filename);
    };

    return (
        <div className={`layout ${role !== "admin" && role !== "pembimbing" ? "participant-panel" : ""}`} style={{ background: "#f8fafc", minHeight: "100vh" }}>
            <Sidebar />
            <div className="content">
                <Navbar />
                <main className="main participant-page-container">
                    {/* Page Heading & Live Clock */}
                    <div className="page-heading">
                        <div>
                            <div className="eyebrow">
                                <span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: "#6366f1", marginRight: "6px" }}></span>
                                {role === "admin" ? "PORTAL ADMINISTRATOR" : role === "pembimbing" ? "PORTAL PEMBIMBING" : "ARSIP & RIWAYAT ABSENSI"}
                            </div>
                            <h1>{role === "admin" ? "Kelola Riwayat Absensi" : role === "pembimbing" ? "Rekap Absensi Magang" : "Riwayat Absensi Saya"}</h1>
                            <p className="subtitle">
                                {role === "admin"
                                    ? "Pantau, filter, dan kelola seluruh catatan data absensi peserta magang (WFO & Daring Zoom)."
                                    : role === "pembimbing"
                                    ? "Pantau rekapan kehadiran peserta bimbingan, verifikasi izin, serta cetak laporan bulanan."
                                    : "Daftar riwayat kehadiran presensi harian Anda dan unduh berkas rekap absensi bulanan."}
                            </p>
                        </div>
                        <div className="live-clock">
                            <strong>{clock.toLocaleTimeString("id-ID")}</strong>
                            <span>{dateLabel}</span>
                        </div>
                    </div>

                    {/* Menu Navigasi Khusus Admin */}
                    {role === "admin" && (
                        <nav className="management-links attendance-management-links" aria-label="Menu admin">
                            <Link to="/periode" className="management-link">
                                <span className="management-icon" style={{ background: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Calendar size={18} />
                                </span>
                                <span>
                                    <strong>Periode Magang</strong>
                                    <small>Kelola periode & peserta magang.</small>
                                </span>
                                <span className="management-arrow">→</span>
                            </Link>
                            <Link to="/riwayat" className="management-link" aria-current="page">
                                <span className="management-icon" style={{ background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <CheckCircle2 size={18} />
                                </span>
                                <span>
                                    <strong>Kelola Absensi</strong>
                                    <small>Kelola data absensi seluruh peserta.</small>
                                </span>
                                <span className="management-arrow">→</span>
                            </Link>
                            <Link to="/admin/lokasi" className="management-link">
                                <span className="management-icon" style={{ background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <MapPin size={18} />
                                </span>
                                <span>
                                    <strong>Lokasi & Kebijakan Daring</strong>
                                    <small>Atur radius kantor & izin absensi Zoom.</small>
                                </span>
                                <span className="management-arrow">→</span>
                            </Link>
                        </nav>
                    )}

                    {/* Menu Navigasi Khusus Pembimbing */}
                    {role === "pembimbing" && (
                        <nav className="management-links attendance-management-links" aria-label="Menu pembimbing">
                            <Link to="/pembimbing/jadwal-absensi" className="management-link">
                                <span className="management-icon" style={{ background: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Clock size={18} />
                                </span>
                                <span>
                                    <strong>Jadwal Absensi</strong>
                                    <small>Atur jam pulang peserta bimbingan.</small>
                                </span>
                                <span className="management-arrow">→</span>
                            </Link>
                            <Link to="/periode" className="management-link">
                                <span className="management-icon" style={{ background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Calendar size={18} />
                                </span>
                                <span>
                                    <strong>Tahun Periode</strong>
                                    <small>Lihat dan kelola tahun periode magang.</small>
                                </span>
                                <span className="management-arrow">→</span>
                            </Link>
                        </nav>
                    )}

                    {/* Ringkasan Profil & Status Hari Ini (Khusus Peserta) */}
                    {role !== "admin" && role !== "pembimbing" && (
                        <div className="attendance-top-summary" style={{ marginBottom: "20px" }}>
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
                                        {profileLoading ? "Memuat profil..." : (participant?.participant_name || currentUser?.name || currentUser?.nama || "Akun belum terhubung")}
                                    </h2>
                                    <span className="attendance-meta-npm">
                                        {participant?.participant_code ? `NPM: ${participant.participant_code} • ` : currentUser?.npm ? `NPM: ${currentUser.npm} • ` : ""}
                                        {participant?.institution || currentUser?.instansi || currentUser?.institution || "Sekolah Tinggi Teknologi Payakumbuh"}
                                    </span>
                                </div>
                            </div>
                            <div className="attendance-status-pill-box">
                                <span className="attendance-meta-label" style={{ textAlign: "right" }}>STATUS HARI INI</span>
                                <div>
                                    <span className={`attendance-badge-lg ${
                                        todayAttendance?.status === "Hadir" || todayAttendance?.approval_status === "approved"
                                            ? "badge-success"
                                            : todayAttendance?.status === "Alpa" || todayAttendance?.approval_status === "rejected"
                                                ? "badge-danger"
                                                : todayAttendance?.status === "Izin" || todayAttendance?.status === "Sakit"
                                                    ? "badge-warning"
                                                    : "badge-neutral"
                                    }`}>
                                        <span style={{
                                            display: "inline-block",
                                            width: "8px",
                                            height: "8px",
                                            borderRadius: "50%",
                                            background: todayAttendance?.status === "Hadir" || todayAttendance?.approval_status === "approved"
                                                ? "#22c55e"
                                                : todayAttendance?.status === "Alpa" || todayAttendance?.approval_status === "rejected"
                                                    ? "#ef4444"
                                                    : todayAttendance?.status === "Izin" || todayAttendance?.status === "Sakit"
                                                        ? "#f59e0b"
                                                        : "#94a3b8"
                                        }}></span>
                                        {todayAttendance?.status ? (todayAttendance.status === "Hadir" ? (todayAttendance.keterangan?.includes("[ZOOM") ? "Hadir (Zoom)" : "Hadir (WFO)") : todayAttendance.status) : "Belum hadir"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 5 Interactive Attendance Metric Stat Cards */}
                    <div className="attendance-stat-grid" style={{ marginBottom: "24px" }}>
                        {/* 1. Hadir */}
                        <div
                            className={`attendance-stat-card stat-hadir ${statusFilter === "Hadir" ? "active" : ""}`}
                            onClick={() => setStatusFilter(statusFilter === "Hadir" ? "" : "Hadir")}
                            title="Klik untuk filter data Hadir"
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span className="stat-label">Hadir</span>
                                <CheckCircle2 size={16} color="#15803d" />
                            </div>
                            <span className="stat-value">{stats.hadir} Hari</span>
                            <small style={{ fontSize: "11px", color: "#166534", marginTop: "2px" }}>
                                {stats.wfo} WFO • {stats.zoom} Daring (Zoom)
                            </small>
                        </div>

                        {/* 2. Izin */}
                        <div
                            className={`attendance-stat-card stat-izin ${statusFilter === "Izin" ? "active" : ""}`}
                            onClick={() => setStatusFilter(statusFilter === "Izin" ? "" : "Izin")}
                            title="Klik untuk filter data Izin"
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span className="stat-label">Izin</span>
                                <FileText size={16} color="#4338ca" />
                            </div>
                            <span className="stat-value">{stats.izin} Hari</span>
                            <small style={{ fontSize: "11px", color: "#3730a3", marginTop: "2px" }}>
                                {stats.pending > 0 ? `${stats.pending} menunggu persetujuan` : "Disetujui pembimbing"}
                            </small>
                        </div>

                        {/* 3. Sakit */}
                        <div
                            className={`attendance-stat-card stat-sakit ${statusFilter === "Sakit" ? "active" : ""}`}
                            onClick={() => setStatusFilter(statusFilter === "Sakit" ? "" : "Sakit")}
                            title="Klik untuk filter data Sakit"
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span className="stat-label">Sakit</span>
                                <AlertCircle size={16} color="#b45309" />
                            </div>
                            <span className="stat-value">{stats.sakit} Hari</span>
                            <small style={{ fontSize: "11px", color: "#92400e", marginTop: "2px" }}>
                                Surat dokter / istirahat
                            </small>
                        </div>

                        {/* 4. Tanpa Keterangan */}
                        <div
                            className={`attendance-stat-card stat-alpa ${statusFilter === "Alpa" ? "active" : ""}`}
                            onClick={() => setStatusFilter(statusFilter === "Alpa" ? "" : "Alpa")}
                            title="Klik untuk filter data Tanpa Keterangan"
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span className="stat-label">Tanpa Keterangan</span>
                                <XCircle size={16} color="#b91c1c" />
                            </div>
                            <span className="stat-value">{stats.alpa} Hari</span>
                            <small style={{ fontSize: "11px", color: "#991b1b", marginTop: "2px" }}>
                                Tidak mengisi presensi
                            </small>
                        </div>

                        {/* 5. Tingkat Kehadiran */}
                        <div
                            className="attendance-stat-card stat-percentage"
                            onClick={() => setStatusFilter("")}
                            title="Klik untuk melihat semua status"
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span className="stat-label">Tingkat Kehadiran</span>
                                <Award size={16} color="#38bdf8" />
                            </div>
                            <span className="stat-value">{stats.percentage}%</span>
                            <small style={{ fontSize: "11px", color: "#a5b4fc", marginTop: "2px" }}>
                                {stats.hadir} dari {stats.total} total catatan
                            </small>
                        </div>
                    </div>

                    {/* Flash messages */}
                    {reviewMessage && <div className="message" role="status" style={{ marginBottom: "16px" }}>{reviewMessage}</div>}
                    {error && (
                        <div
                            className="message error"
                            role="alert"
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: "12px",
                                marginBottom: "16px",
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

                    {/* Search & Filter Toolbar */}
                    <div className="filter-card" style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", padding: "14px 18px", background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", marginBottom: "20px", boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)" }}>
                        {/* 1. Search input */}
                        <div className="search-input-wrapper" style={{ flex: "1 1 240px", position: "relative", minWidth: "200px" }}>
                            <Search className="search-icon-inside" size={16} style={{ color: "#94a3b8" }} />
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Cari tanggal, keterangan, atau status..."
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

                        {/* 2. Month picker */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#ffffff", padding: "0 12px", height: "42px", borderRadius: "10px", border: "1px solid #cbd5e1", transition: "all 0.15s ease" }}>
                            <Calendar size={15} color="#6366f1" />
                            <label htmlFor="absensi-month" style={{ fontSize: "12px", fontWeight: "700", color: "#475569", whiteSpace: "nowrap" }}>BULAN:</label>
                            <input
                                id="absensi-month"
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

                        {/* 3. Filter Hari (Senin - Minggu) */}
                        <select
                            className="filter-select"
                            value={dayFilter}
                            onChange={(e) => setDayFilter(e.target.value)}
                            style={{ height: "42px", minWidth: "140px" }}
                            title="Filter hari dalam seminggu"
                        >
                            <option value="">Semua Hari</option>
                            <option value="Senin">📅 Hari Senin</option>
                            <option value="Selasa">📅 Hari Selasa</option>
                            <option value="Rabu">📅 Hari Rabu</option>
                            <option value="Kamis">📅 Hari Kamis</option>
                            <option value="Jumat">📅 Hari Jumat</option>
                            <option value="Sabtu">📅 Hari Sabtu</option>
                            <option value="Minggu">📅 Hari Minggu</option>
                        </select>

                        {/* 4. Status filter select */}
                        <select
                            className="filter-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ height: "42px", minWidth: "160px" }}
                        >
                            <option value="">Semua Status</option>
                            <option value="Hadir">Semua Hadir</option>
                            <option value="WFO">🏢 Hadir WFO (Kantor)</option>
                            <option value="Zoom">📹 Hadir Daring (Zoom)</option>
                            <option value="Izin">📝 Izin</option>
                            <option value="Sakit">🏥 Sakit</option>
                            <option value="Alpa">❌ Alpa / Tanpa Keterangan</option>
                            <option value="Pending">⏳ Menunggu Persetujuan</option>
                        </select>

                        {/* 5. Participant select (for Pembimbing & Admin) */}
                        {(role === "pembimbing" || role === "admin") && (
                            <select
                                className="filter-select"
                                value={selectedParticipant}
                                onChange={(e) => setSelectedParticipant(e.target.value)}
                                style={{ height: "42px", minWidth: "180px" }}
                            >
                                <option value="all">Semua Peserta ({participantsList.length})</option>
                                {participantsList.map((p) => (
                                    <option key={p.code} value={p.code}>{p.name}</option>
                                ))}
                            </select>
                        )}

                        {/* 6. Reset Filter Button */}
                        {(searchQuery || statusFilter || dayFilter || selectedParticipant !== "all" || selectedMonth !== currentMonthStr) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    setStatusFilter("");
                                    setDayFilter("");
                                    setSelectedParticipant("all");
                                    setSelectedMonth(currentMonthStr);
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
                                    whiteSpace: "nowrap",
                                    transition: "all 0.15s ease"
                                }}
                                title="Kembalikan ke filter awal"
                            >
                                <RotateCcw size={14} />
                                <span>Reset</span>
                            </button>
                        )}
                    </div>

                    {/* Main Table Card */}
                    <div className="table-card" style={{ background: "#ffffff", borderRadius: "18px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 16px rgba(15, 23, 42, 0.03)" }}>
                        <div className="table-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid #f1f5f9", background: "#ffffff", flexWrap: "wrap", gap: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{ width: 38, height: 38, borderRadius: "10px", background: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Calendar size={19} />
                                </div>
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <h3 style={{ margin: 0, fontSize: "15.5px", fontWeight: 800, color: "#0f172a" }}>
                                            {role === "admin" || role === "pembimbing" ? "Rekapitulasi Data Absensi" : "Daftar Riwayat Presensi"}
                                        </h3>
                                        <span style={{ fontSize: "11.5px", fontWeight: 700, padding: "2px 9px", borderRadius: "9999px", background: "#eef2ff", color: "#4f46e5" }}>
                                            {displayedData.length} Catatan
                                        </span>
                                    </div>
                                    {(searchQuery || statusFilter || dayFilter || selectedMonth || (selectedParticipant !== "all" && (role === "admin" || role === "pembimbing"))) && (
                                        <span style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px", display: "block" }}>
                                            {selectedMonth && `Bulan: ${selectedMonth} `}
                                            {dayFilter && `• Hari: ${dayFilter} `}
                                            {searchQuery && `• "${searchQuery}" `}
                                            {statusFilter && `• Status: ${statusFilter} `}
                                            {selectedParticipant !== "all" && `• Filter Peserta`}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <button
                                    type="button"
                                    onClick={loadData}
                                    disabled={loading}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "7px 14px",
                                        borderRadius: "8px",
                                        background: "#f8fafc",
                                        border: "1.5px solid #e2e8f0",
                                        color: "#475569",
                                        fontSize: "12px",
                                        fontWeight: 650,
                                        cursor: loading ? "not-allowed" : "pointer",
                                        transition: "all 0.15s ease"
                                    }}
                                    title="Segarkan data dari server"
                                >
                                    <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                                    <span>{loading ? "Memuat..." : "Segarkan"}</span>
                                </button>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table className="enterprise-table custom-table" style={{ width: "100%", minWidth: "780px" }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: "45px", textAlign: "center" }}>#</th>
                                        <th style={{ minWidth: "160px" }}>TANGGAL & HARI</th>
                                        <th style={{ minWidth: "180px" }}>{role === "admin" || role === "pembimbing" ? "PESERTA & INSTITUSI" : "NAMA PESERTA"}</th>
                                        <th style={{ width: "115px" }}>MASUK</th>
                                        <th style={{ width: "115px" }}>PULANG</th>
                                        <th style={{ width: "170px" }}>STATUS KEHADIRAN</th>
                                        <th style={{ minWidth: "190px" }}>KETERANGAN & BUKTI</th>
                                        {(role === "pembimbing" || role === "admin") && <th style={{ width: "130px", textAlign: "right" }}>AKSI</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={(role === "pembimbing" || role === "admin") ? 8 : 7} style={{ textAlign: "center", padding: "52px 20px", color: "#64748b" }}>
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                                                    <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                                                    <span style={{ fontSize: "13px", fontWeight: 600 }}>Memuat rekapan absensi...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : displayedData.length ? (
                                        displayedData.map((item, index) => {
                                            const isPendingLeave = item.approval_status === "pending";
                                            const isZoom = String(item.keterangan || "").includes("[ZOOM");
                                            const cleanKeterangan = String(item.keterangan || "")
                                                .replace("[ZOOM / DARING]", "")
                                                .replace("[ZOOM]", "")
                                                .trim();
                                            const dateObj = formatDate(item.tanggal);

                                            return (
                                                <tr key={item.id || index}>
                                                    {/* Col 1: # */}
                                                    <td style={{ textAlign: "center" }}>
                                                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "50%", background: "#f1f5f9", color: "#64748b", fontSize: "12px", fontWeight: 700 }}>
                                                            {index + 1}
                                                        </span>
                                                    </td>

                                                    {/* Col 2: Tanggal & Hari */}
                                                    <td>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                                <span style={{ fontSize: "11px", fontWeight: 700, color: "#4f46e5", background: "#eef2ff", padding: "1px 7px", borderRadius: "4px" }}>
                                                                    {dateObj.day}
                                                                </span>
                                                                <span style={{ fontWeight: 750, color: "#0f172a", fontSize: "13.5px" }}>
                                                                    {dateObj.shortDate}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Col 3: Peserta & Institusi */}
                                                    <td>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                                            <span style={{ fontWeight: 750, color: "#0f172a", fontSize: "13.5px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                                                                <User size={13} color="#6366f1" />
                                                                <span>{item.participant_name || (item.user?.name || "Peserta Magang")}</span>
                                                            </span>
                                                            <span style={{ fontSize: "11.5px", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                                                <Building size={11} color="#94a3b8" />
                                                                <span>{item.institution || item.instansi || "Sekolah Tinggi Teknologi Payakumbuh"}</span>
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Col 4: Jam Masuk */}
                                                    <td>
                                                        {item.jam_masuk ? (
                                                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#15803d", fontWeight: 700, fontSize: "12.5px" }}>
                                                                <Clock size={12} color="#16a34a" />
                                                                <span>{item.jam_masuk.slice(0, 5)} WIB</span>
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: "#94a3b8", fontSize: "12.5px" }}>-</span>
                                                        )}
                                                    </td>

                                                    {/* Col 5: Jam Pulang */}
                                                    <td>
                                                        {item.jam_pulang ? (
                                                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#0369a1", fontWeight: 700, fontSize: "12.5px" }}>
                                                                <Clock size={12} color="#0284c7" />
                                                                <span>{item.jam_pulang.slice(0, 5)} WIB</span>
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: "#94a3b8", fontSize: "12.5px" }}>-</span>
                                                        )}
                                                    </td>

                                                    {/* Col 6: Status Kehadiran */}
                                                    <td>
                                                        {isPendingLeave ? (
                                                            <span className="badge-status-dot pending">
                                                                <span className="dot"></span>
                                                                <span>Menunggu Persetujuan</span>
                                                            </span>
                                                        ) : item.approval_status === "rejected" ? (
                                                            <span className="badge-status-dot late">
                                                                <span className="dot"></span>
                                                                <span>Izin Ditolak (Alpa)</span>
                                                            </span>
                                                        ) : item.status === "Hadir" && isZoom ? (
                                                            <span
                                                                className="badge-status-dot"
                                                                style={{
                                                                    background: "#e0e7ff",
                                                                    color: "#4338ca",
                                                                    border: "1px solid #c7d2fe",
                                                                }}
                                                            >
                                                                <Video size={13} color="#4f46e5" />
                                                                <span>Daring (Zoom)</span>
                                                            </span>
                                                        ) : item.status === "Hadir" ? (
                                                            <span className="badge-status-dot approved">
                                                                <Building size={13} color="#16a34a" />
                                                                <span>WFO (Kantor)</span>
                                                            </span>
                                                        ) : item.status === "Izin" ? (
                                                            <span
                                                                className="badge-status-dot"
                                                                style={{
                                                                    background: "#f3e8ff",
                                                                    color: "#7e22ce",
                                                                    border: "1px solid #e9d5ff",
                                                                }}
                                                            >
                                                                <FileText size={13} color="#9333ea" />
                                                                <span>Izin</span>
                                                            </span>
                                                        ) : item.status === "Sakit" ? (
                                                            <span
                                                                className="badge-status-dot"
                                                                style={{
                                                                    background: "#fffbeb",
                                                                    color: "#b45309",
                                                                    border: "1px solid #fde68a",
                                                                }}
                                                            >
                                                                <AlertCircle size={13} color="#d97706" />
                                                                <span>Sakit</span>
                                                            </span>
                                                        ) : (
                                                            <span className="badge-status-dot late">
                                                                <XCircle size={13} color="#dc2626" />
                                                                <span>{item.status || "Tanpa Keterangan"}</span>
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Col 7: Keterangan & Bukti Foto */}
                                                    <td>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                            <span style={{ color: "#334155", fontSize: "12px", lineHeight: "1.4" }}>
                                                                {cleanKeterangan || "-"}
                                                            </span>
                                                            {item.foto_url && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPreviewImage({
                                                                        url: getPhotoUrl(item.foto_url),
                                                                        name: item.participant_name || (item.user?.name || "Peserta Magang"),
                                                                        tanggal: item.tanggal,
                                                                        jam: item.jam_masuk,
                                                                        isZoom: isZoom,
                                                                        jarak: item.jarak_meter,
                                                                        status: item.status,
                                                                    })}
                                                                    style={{
                                                                        display: "inline-flex",
                                                                        alignItems: "center",
                                                                        gap: "5px",
                                                                        background: isZoom ? "#eff6ff" : "#f8fafc",
                                                                        border: isZoom ? "1px solid #bfdbfe" : "1px solid #cbd5e1",
                                                                        borderRadius: "6px",
                                                                        padding: "4px 9px",
                                                                        fontSize: "11px",
                                                                        fontWeight: "650",
                                                                        color: isZoom ? "#1d4ed8" : "#334155",
                                                                        cursor: "pointer",
                                                                        width: "fit-content",
                                                                        transition: "all 0.15s ease",
                                                                    }}
                                                                    onMouseEnter={(e) => { e.currentTarget.style.background = isZoom ? "#dbeafe" : "#f1f5f9"; }}
                                                                    onMouseLeave={(e) => { e.currentTarget.style.background = isZoom ? "#eff6ff" : "#f8fafc"; }}
                                                                >
                                                                    {isZoom ? <Video size={12} color="#2563eb" /> : <Camera size={12} color="#475569" />}
                                                                    <span>{isZoom ? "Lihat Bukti Zoom" : "Lihat Foto Absen"}</span>
                                                                </button>
                                                            )}
                                                            {item.jarak_meter !== null && item.jarak_meter !== undefined && (
                                                                <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: "#64748b", fontSize: "11px" }}>
                                                                    <MapPin size={11} color="#94a3b8" />
                                                                    <span>Radius: ± {item.jarak_meter} m {isZoom ? "(Daring)" : ""}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Col 8: Aksi (Pembimbing & Admin) */}
                                                    {(role === "pembimbing" || role === "admin") && (
                                                        <td style={{ textAlign: "right" }}>
                                                            {isPendingLeave ? (
                                                                <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleReviewLeave(item.id, "approved")}
                                                                        disabled={reviewingId === item.id}
                                                                        style={{
                                                                            display: "inline-flex",
                                                                            alignItems: "center",
                                                                            gap: "4px",
                                                                            border: "none",
                                                                            background: "#10b981",
                                                                            color: "#fff",
                                                                            padding: "6px 10px",
                                                                            borderRadius: "6px",
                                                                            fontSize: "11.5px",
                                                                            cursor: reviewingId === item.id ? "wait" : "pointer",
                                                                            fontWeight: "700"
                                                                        }}
                                                                        title="Setujui permohonan izin"
                                                                    >
                                                                        <Check size={12} />
                                                                        <span>Setujui</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleReviewLeave(item.id, "rejected")}
                                                                        disabled={reviewingId === item.id}
                                                                        style={{
                                                                            display: "inline-flex",
                                                                            alignItems: "center",
                                                                            gap: "4px",
                                                                            border: "none",
                                                                            background: "#ef4444",
                                                                            color: "#fff",
                                                                            padding: "6px 10px",
                                                                            borderRadius: "6px",
                                                                            fontSize: "11.5px",
                                                                            cursor: reviewingId === item.id ? "wait" : "pointer",
                                                                            fontWeight: "700"
                                                                        }}
                                                                        title="Tolak permohonan izin"
                                                                    >
                                                                        <X size={12} />
                                                                        <span>Tolak</span>
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span style={{ color: "#94a3b8", fontSize: "12px" }}>-</span>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={(role === "pembimbing" || role === "admin") ? 8 : 7} style={{ padding: 0 }}>
                                                <div className="empty-state-modern">
                                                    <div className="empty-state-icon-circle">
                                                        <Calendar size={26} color="#6366f1" />
                                                    </div>
                                                    <h4>Belum Ada Catatan Absensi</h4>
                                                    <p style={{ maxWidth: "420px", margin: "0 auto 16px" }}>
                                                        {searchQuery || statusFilter || dayFilter || selectedMonth
                                                            ? `Tidak ada data absensi yang sesuai dengan kriteria filter ${selectedMonth ? `pada bulan ${selectedMonth}` : ""}${dayFilter ? ` hari ${dayFilter}` : ""}.`
                                                            : "Data riwayat absensi akan tercatat secara otomatis setiap kali Anda melakukan presensi harian."}
                                                    </p>
                                                    {(searchQuery || statusFilter || dayFilter || selectedMonth !== currentMonthStr || selectedParticipant !== "all") && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSearchQuery("");
                                                                setStatusFilter("");
                                                                setDayFilter("");
                                                                setSelectedParticipant("all");
                                                                setSelectedMonth(currentMonthStr);
                                                            }}
                                                            className="action-btn"
                                                            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                                                        >
                                                            <RotateCcw size={13} />
                                                            <span>Reset Filter Pencarian</span>
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

                    {/* Modal Popup Bukti Foto / Screenshot Zoom */}
                    {previewImage && (
                        <div
                            role="dialog"
                            aria-modal="true"
                            onClick={() => setPreviewImage(null)}
                            style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: "rgba(15, 23, 42, 0.75)",
                                backdropFilter: "blur(4px)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 9999,
                                padding: "20px",
                            }}
                        >
                            <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    background: "#ffffff",
                                    borderRadius: "16px",
                                    maxWidth: "600px",
                                    width: "100%",
                                    overflow: "hidden",
                                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.25)",
                                    border: "1px solid #cbd5e1",
                                }}
                            >
                                <div style={{ padding: "16px 22px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <div style={{ width: 36, height: 36, borderRadius: "10px", background: previewImage.isZoom ? "#dbeafe" : "#e0e7ff", color: previewImage.isZoom ? "#2563eb" : "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            {previewImage.isZoom ? <Video size={18} /> : <Camera size={18} />}
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "750", color: "#0f172a" }}>
                                                {previewImage.isZoom ? "Bukti Tangkapan Layar Zoom Meeting" : "Bukti Foto Kehadiran Magang"}
                                            </h3>
                                            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                                                {previewImage.name} • {formatDate(previewImage.tanggal).fullDate} ({previewImage.jam ? `${previewImage.jam.slice(0, 5)} WIB` : "-"})
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewImage(null)}
                                        style={{
                                            background: "#f1f5f9",
                                            border: "none",
                                            borderRadius: "8px",
                                            width: "30px",
                                            height: "30px",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#64748b",
                                            transition: "all 0.15s ease"
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = "#e2e8f0"; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                                <div style={{ padding: "18px", textAlign: "center", background: "#0f172a" }}>
                                    <img
                                        src={previewImage.url}
                                        alt="Bukti Absensi"
                                        style={{
                                            maxWidth: "100%",
                                            maxHeight: "440px",
                                            borderRadius: "8px",
                                            objectFit: "contain",
                                            boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
                                        }}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = "https://placehold.co/600x400?text=Gambar+Tidak+Ditemukan";
                                        }}
                                    />
                                </div>
                                <div style={{ padding: "14px 22px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", flexWrap: "wrap", gap: "10px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ fontSize: "12px", color: "#475569", fontWeight: "600" }}>
                                            {previewImage.isZoom ? "📹 Presensi Daring (Zoom)" : "🏢 Presensi WFO (Kantor)"}
                                        </span>
                                        {previewImage.jarak !== null && previewImage.jarak !== undefined && (
                                            <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                                                • Jarak: ± {previewImage.jarak}m
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <a
                                            href={previewImage.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "5px",
                                                padding: "7px 14px",
                                                borderRadius: "8px",
                                                background: "#ffffff",
                                                border: "1.5px solid #cbd5e1",
                                                color: "#334155",
                                                fontSize: "12px",
                                                fontWeight: "650",
                                                textDecoration: "none"
                                            }}
                                        >
                                            <ExternalLink size={13} />
                                            <span>Buka Ukuran Penuh</span>
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewImage(null)}
                                            style={{
                                                background: "#4f46e5",
                                                color: "#ffffff",
                                                border: "none",
                                                padding: "7px 18px",
                                                borderRadius: "8px",
                                                fontWeight: "700",
                                                fontSize: "12px",
                                                cursor: "pointer",
                                            }}
                                        >
                                            Tutup
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default Riwayat;
