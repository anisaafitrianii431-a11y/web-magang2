import { useCallback, useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { getNationalHoliday } from "../utils/holidays";

function Riwayat() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reviewMessage, setReviewMessage] = useState("");
    const [reviewingId, setReviewingId] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [selectedParticipant, setSelectedParticipant] = useState("all");
    const [downloadingLetter, setDownloadingLetter] = useState(false);
    const [clock, setClock] = useState(new Date());
    const [previewImage, setPreviewImage] = useState(null);
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

    const filteredData = useMemo(() => {
        let result = data;
        if (activeMonth) {
            result = result.filter((item) => String(item.tanggal || "").slice(0, 7) === activeMonth);
        }
        if (selectedParticipant !== "all") {
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
        return result;
    }, [data, activeMonth, selectedParticipant, participantsList]);

    const displayedData = (role === "pembimbing" || role === "admin") ? filteredData : data;

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    };

    const exportMonthlyPdf = () => {
        const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
        doc.setLineHeightFactor(1.5);
        const [yearStr, monthStr] = (activeMonth || new Date().toISOString().slice(0, 7)).split("-");
        const year = parseInt(yearStr, 10);
        const monthIndex = parseInt(monthStr, 10) - 1;
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        const monthYearLabel = new Date(year, monthIndex, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

        // Hitung jumlah hari kerja (Senin - Jumat dan bukan hari libur nasional) dalam bulan yang dipilih
        let hariKerjaCount = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, monthIndex, d);
            const dayOfWeek = dateObj.getDay();
            const dateKey = `${yearStr}-${monthStr}-${String(d).padStart(2, "0")}`;
            const holiday = getNationalHoliday(dateKey);
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holiday) {
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
        const supervisorName = currentUser?.name || currentUser?.nama || "Ibrahim";

        const targetList = selectedParticipant !== "all"
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
                    const nationalHoliday = getNationalHoliday(dateKey);
                    const rawStatus = String(record?.status || "").trim().toLowerCase();
                    let status = "-";
                    let notes = nationalHoliday
                        ? `Libur Nasional (${nationalHoliday})`
                        : weekend
                            ? "Libur Akhir Pekan"
                            : "-";

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
                            nationalHoliday ? `Libur Nasional: ${nationalHoliday}` : "",
                            record.jam_masuk ? `Masuk: ${record.jam_masuk}` : "",
                            record.jam_pulang ? `Pulang: ${record.jam_pulang}` : "",
                        ].filter(Boolean);
                        notes = details.length ? details.join(" | ") : (nationalHoliday ? `Libur Nasional (${nationalHoliday})` : "-");
                    }

                    return {
                        date,
                        dayLabel: date.toLocaleDateString("id-ID", { weekday: "long" }),
                        dateLabel: `${String(day).padStart(2, "0")}/${monthStr}/${year}`,
                        status,
                        notes,
                        isHoliday: Boolean(nationalHoliday),
                        isWeekend: weekend,
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
                    const isRedDay = row.isHoliday || row.isWeekend;
                    values.forEach((value, columnIndex) => {
                        if (row.isHoliday) {
                            doc.setFillColor(254, 242, 242);
                        } else if (row.isWeekend) {
                            doc.setFillColor(248, 250, 252);
                        } else {
                            const rowShade = index % 2 ? 250 : 255;
                            doc.setFillColor(rowShade, rowShade, rowShade);
                        }
                        doc.setDrawColor(...border);
                        doc.rect(x, tableY, columnWidths[columnIndex], rowHeight, "FD");
                        doc.setFont("helvetica", isRedDay ? "bold" : "normal");
                        doc.setFontSize(columnIndex === 4 ? 6 : 6.2);
                        if (row.isHoliday) {
                            doc.setTextColor(220, 38, 38);
                        } else if (row.isWeekend) {
                            doc.setTextColor(185, 28, 28);
                        } else {
                            doc.setTextColor(0);
                        }
                        doc.text(value, x + (columnIndex === 4 ? 2 : columnWidths[columnIndex] / 2), tableY + rowHeight / 2 + 1, {
                            align: columnIndex === 4 ? "left" : "center",
                            maxWidth: columnWidths[columnIndex] - 3,
                        });
                        x += columnWidths[columnIndex];
                    });
                    tableY += rowHeight;
                });
            });

            const filename = `rekap-absensi-${targetList[0].code || targetList[0].name.toLowerCase().replace(/\s+/g, "-")}-${activeMonth}.pdf`;
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

        const filename = selectedParticipant !== "all"
            ? `laporan-rekap-absensi-${selectedParticipant}-${activeMonth}.pdf`
            : `laporan-rekap-absensi-bulanan-${activeMonth}.pdf`;
        doc.save(filename);
    };

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                <Navbar />
                <main className="main">
                    <div className="page-heading">
                        <div>
                            <p className="eyebrow">{role === "admin" ? "PORTAL ADMINISTRATOR" : role === "pembimbing" ? "PORTAL PEMBIMBING" : "ARSIP KEHADIRAN"}</p>
                            <h1>{role === "admin" ? "Kelola Data Absensi" : "Absensi Magang"}</h1>
                            <p className="subtitle">{role === "admin" ? "Kelola, pantau, dan verifikasi seluruh rekapan data absensi WFO & Daring (Zoom)." : role === "pembimbing" ? "Rekap kehadiran peserta magang (WFO & Daring Zoom)." : "Riwayat absensi ini hanya dapat dilihat oleh akun Anda."}</p>
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
                                <span className="management-icon">🗓️</span>
                                <span>
                                    <strong>Periode Magang</strong>
                                    <small>Kelola periode & peserta magang.</small>
                                </span>
                                <span className="management-arrow">→</span>
                            </Link>
                            <Link to="/riwayat" className="management-link" aria-current="page">
                                <span className="management-icon">📅</span>
                                <span>
                                    <strong>Kelola Absensi</strong>
                                    <small>Kelola data absensi seluruh peserta.</small>
                                </span>
                                <span className="management-arrow">→</span>
                            </Link>
                            <Link to="/admin/lokasi" className="management-link">
                                <span className="management-icon">📍</span>
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
                                <span className="management-icon">🕒</span>
                                <span>
                                    <strong>Jadwal Absensi</strong>
                                    <small>Atur jam pulang peserta bimbingan.</small>
                                </span>
                                <span className="management-arrow">→</span>
                            </Link>
                            <Link to="/periode" className="management-link">
                                <span className="management-icon">🗓️</span>
                                <span>
                                    <strong>Tahun Periode</strong>
                                    <small>Lihat dan kelola tahun periode magang.</small>
                                </span>
                                <span className="management-arrow">→</span>
                            </Link>
                        </nav>
                    )}

                    {role !== "admin" && role !== "pembimbing" && (
                        <div className="attendance-card" style={{ marginBottom: "20px" }}>
                            <p className="eyebrow">RIWAYAT PRIBADI</p>
                            <strong>Total absen masuk: {data.filter((item) => item.jam_masuk).length} kali</strong>
                        </div>
                    )}

                    {reviewMessage && <div className="message" role="status" style={{ marginBottom: "16px" }}>{reviewMessage}</div>}
                    {error ? (
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
                    ) : (
                        <>
                            {(role === "pembimbing" || role === "admin") && (
                                <div className="attendance-card" style={{ marginBottom: "18px", padding: "12px 16px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <label htmlFor="absensi-month" style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Bulan</label>
                                            <input
                                                id="absensi-month"
                                                type="month"
                                                value={activeMonth}
                                                onChange={(event) => setSelectedMonth(event.target.value)}
                                                style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#fff", height: "34px", boxSizing: "border-box" }}
                                            />
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <label htmlFor="absensi-peserta" style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Peserta</label>
                                            <select
                                                id="absensi-peserta"
                                                value={selectedParticipant}
                                                onChange={(event) => setSelectedParticipant(event.target.value)}
                                                style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#fff", color: "#1e293b", fontWeight: 500, height: "34px", boxSizing: "border-box" }}
                                            >
                                                <option value="all">Semua Peserta</option>
                                                {participantsList.map((p) => (
                                                    <option key={p.code} value={p.code}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={exportMonthlyPdf}
                                            disabled={!filteredData.length}
                                            title="Export Rekap Absensi Bulanan (PDF)"
                                            style={{
                                                background: "#2563eb",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: "6px",
                                                padding: "6px 12px",
                                                fontSize: "12px",
                                                fontWeight: 600,
                                                cursor: filteredData.length ? "pointer" : "not-allowed",
                                                opacity: filteredData.length ? 1 : 0.5,
                                                height: "34px",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "5px",
                                                whiteSpace: "nowrap",
                                                boxSizing: "border-box",
                                            }}
                                        >
                                            <span>📄</span>
                                            <span>Export PDF</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="table-card">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>No</th>
                                            <th>Tanggal</th>
                                            <th>Nama</th>
                                            <th>Masuk</th>
                                            <th>Pulang</th>
                                            <th>Status Kehadiran</th>
                                            <th>Keterangan & Bukti</th>
                                            {role === "pembimbing" && <th>Aksi</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan={role === "pembimbing" ? "8" : "7"} className="empty">Memuat data absensi...</td>
                                            </tr>
                                        ) : displayedData.length ? (
                                            displayedData.map((item, index) => {
                                                const isPendingLeave = item.approval_status === "pending";
                                                const isZoom = String(item.keterangan || "").includes("[ZOOM");
                                                const holidayName = getNationalHoliday(item.tanggal);
                                                const baseKeterangan = String(item.keterangan || "")
                                                    .replace("[ZOOM / DARING]", "")
                                                    .replace("[ZOOM]", "")
                                                    .trim();
                                                const cleanKeterangan = baseKeterangan
                                                    ? (holidayName ? `${baseKeterangan} (Libur: ${holidayName})` : baseKeterangan)
                                                    : (holidayName ? `Libur Nasional (${holidayName})` : "");
                                                return (
                                                    <tr key={item.id}>
                                                        <td>{index + 1}</td>
                                                        <td>{formatDate(item.tanggal)}</td>
                                                        <td>
                                                            <strong style={{ color: "#0f172a", display: "block" }}>{item.participant_name}</strong>
                                                            {item.institution && (
                                                                <small style={{ color: "#64748b" }}>{item.institution}</small>
                                                            )}
                                                        </td>
                                                        <td>{item.jam_masuk || "-"}</td>
                                                        <td>{item.jam_pulang || "-"}</td>
                                                        <td>
                                                            {isPendingLeave ? (
                                                                <span className="badge badge-belum-hadir">Menunggu izin</span>
                                                            ) : item.approval_status === "rejected" ? (
                                                                <span className="badge badge-alpa">Alpa</span>
                                                            ) : item.status === "Hadir" && isZoom ? (
                                                                <span
                                                                    style={{
                                                                        display: "inline-flex",
                                                                        alignItems: "center",
                                                                        gap: "5px",
                                                                        background: "#e0e7ff",
                                                                        color: "#4338ca",
                                                                        border: "1px solid #c7d2fe",
                                                                        padding: "3px 8px",
                                                                        borderRadius: "12px",
                                                                        fontSize: "12px",
                                                                        fontWeight: "600",
                                                                    }}
                                                                >
                                                                    <span>📹</span>
                                                                    <span>Daring (Zoom)</span>
                                                                </span>
                                                            ) : item.status === "Hadir" ? (
                                                                <span className="badge badge-hadir" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                                                    <span>🏢</span>
                                                                    <span>WFO (Kantor)</span>
                                                                </span>
                                                            ) : (
                                                                <span className={`badge badge-${String(item.status).toLowerCase().replace(" ", "-")}`}>
                                                                    {item.status}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                                <small style={{ color: "#334155" }}>{cleanKeterangan || "-"}</small>
                                                                {item.foto_url && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPreviewImage({
                                                                            url: item.foto_url,
                                                                            name: item.participant_name,
                                                                            tanggal: item.tanggal,
                                                                            jam: item.jam_masuk,
                                                                            isZoom: isZoom,
                                                                        })}
                                                                        style={{
                                                                            display: "inline-flex",
                                                                            alignItems: "center",
                                                                            gap: "5px",
                                                                            background: isZoom ? "#eff6ff" : "#f8fafc",
                                                                            border: isZoom ? "1px solid #bfdbfe" : "1px solid #cbd5e1",
                                                                            borderRadius: "4px",
                                                                            padding: "3px 8px",
                                                                            fontSize: "11px",
                                                                            fontWeight: "600",
                                                                            color: isZoom ? "#1d4ed8" : "#334155",
                                                                            cursor: "pointer",
                                                                            width: "fit-content",
                                                                        }}
                                                                    >
                                                                        <span>{isZoom ? "📹" : "📷"}</span>
                                                                        <span>{isZoom ? "Lihat Bukti Zoom" : "Lihat Foto Absen"}</span>
                                                                    </button>
                                                                )}
                                                                {item.jarak_meter !== null && item.jarak_meter !== undefined && (
                                                                    <small style={{ color: "#64748b", fontSize: "10.5px" }}>
                                                                        Jarak: ± {item.jarak_meter}m {isZoom ? "(Daring)" : ""}
                                                                    </small>
                                                                )}
                                                            </div>
                                                        </td>
                                                        {role === "pembimbing" && (
                                                            <td>
                                                                {isPendingLeave ? (
                                                                    <div style={{ display: "flex", gap: "6px" }}>
                                                                        <button type="button" onClick={() => handleReviewLeave(item.id, "approved")} disabled={reviewingId === item.id} style={{ border: "none", background: "#10b981", color: "#fff", padding: "5px 8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>Setujui</button>
                                                                        <button type="button" onClick={() => handleReviewLeave(item.id, "rejected")} disabled={reviewingId === item.id} style={{ border: "none", background: "#ef4444", color: "#fff", padding: "5px 8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>Tolak</button>
                                                                    </div>
                                                                ) : "-"}
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={role === "pembimbing" ? "8" : "7"} className="empty">Belum ada data absensi untuk bulan yang dipilih.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

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
                                backdropFilter: "blur(2px)",
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
                                    borderRadius: "12px",
                                    maxWidth: "580px",
                                    width: "100%",
                                    overflow: "hidden",
                                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.25)",
                                    border: "1px solid #cbd5e1",
                                }}
                            >
                                <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                                            {previewImage.isZoom ? "📹 Bukti Tangkapan Layar Zoom Meeting" : "📷 Bukti Foto Kehadiran"}
                                        </h3>
                                        <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#64748b" }}>
                                            {previewImage.name} • {formatDate(previewImage.tanggal)} ({previewImage.jam || "-"})
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewImage(null)}
                                        style={{
                                            background: "#e2e8f0",
                                            border: "none",
                                            borderRadius: "6px",
                                            padding: "6px 10px",
                                            cursor: "pointer",
                                            fontSize: "13px",
                                            fontWeight: "700",
                                            color: "#334155",
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div style={{ padding: "18px", textAlign: "center", background: "#0f172a" }}>
                                    <img
                                        src={previewImage.url}
                                        alt="Bukti Absensi"
                                        style={{
                                            maxWidth: "100%",
                                            maxHeight: "440px",
                                            borderRadius: "6px",
                                            objectFit: "contain",
                                            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                                        }}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = "https://placehold.co/600x400?text=Gambar+Tidak+Ditemukan";
                                        }}
                                    />
                                </div>
                                <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                                        {previewImage.isZoom ? "Peserta memilih kehadiran daring / Zoom" : "Presensi luring di kantor"}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewImage(null)}
                                        style={{
                                            background: "#4f46e5",
                                            color: "#ffffff",
                                            border: "none",
                                            padding: "8px 18px",
                                            borderRadius: "6px",
                                            fontWeight: "600",
                                            fontSize: "13px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Tutup
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

export default Riwayat;
