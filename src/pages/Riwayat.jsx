import { useCallback, useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";

function Riwayat() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reviewMessage, setReviewMessage] = useState("");
    const [reviewingId, setReviewingId] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [selectedParticipant, setSelectedParticipant] = useState("all");
    const [clock, setClock] = useState(new Date());
    const [role] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null")?.role?.toLowerCase() || "peserta";
        } catch {
            return "peserta";
        }
    });

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
            const code = item.participant_code || (item.user_id ? `USER-${item.user_id}` : item.participant_name);
            if (code && !unique.has(code)) {
                unique.set(code, {
                    code,
                    name: item.participant_name || item.user?.name || "Peserta Magang",
                    institution: item.institution || item.instansi || "Sekolah Tinggi Teknologi Payakumbuh",
                });
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
            result = result.filter((item) => {
                const code = item.participant_code || (item.user_id ? `USER-${item.user_id}` : item.participant_name);
                return code === selectedParticipant;
            });
        }
        return result;
    }, [data, activeMonth, selectedParticipant]);
    const displayedData = role === "pembimbing" ? filteredData : data;

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    };

    const exportMonthlyPdf = () => {
        const doc = new jsPDF({ unit: "mm", format: "a4" });
        const [yearStr, monthStr] = (activeMonth || new Date().toISOString().slice(0, 7)).split("-");
        const year = parseInt(yearStr, 10);
        const monthIndex = parseInt(monthStr, 10) - 1;
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        const monthYearLabel = new Date(year, monthIndex, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

        const currentUser = (() => {
            try {
                return JSON.parse(localStorage.getItem("user") || "null");
            } catch {
                return null;
            }
        })();
        const supervisorName = currentUser?.name || currentUser?.nama || "Ibrahim";

        let targets = [];
        if (selectedParticipant !== "all") {
            const found = participantsList.find((p) => p.code === selectedParticipant);
            if (found) {
                targets = [found];
            } else {
                targets = [{
                    code: selectedParticipant,
                    name: "Peserta Magang",
                    institution: "Sekolah Tinggi Teknologi Payakumbuh",
                }];
            }
        } else if (participantsList.length > 0) {
            targets = participantsList;
        } else {
            targets = [{
                code: "template",
                name: "........................................................",
                institution: "........................................................",
            }];
        }

        targets.forEach((participant, targetIdx) => {
            if (targetIdx > 0) {
                doc.addPage();
            }

            const participantRecords = data.filter((item) => {
                const dateMatch = String(item.tanggal || "").slice(0, 7) === activeMonth;
                if (!dateMatch) return false;
                if (participant.code === "template") return false;
                const code = item.participant_code || (item.user_id ? `USER-${item.user_id}` : item.participant_name);
                return code === participant.code;
            });

            const dayRows = [];
            let hariKerjaCount = 0;
            let hadirCount = 0;
            let izinCount = 0;
            let sakitCount = 0;
            let alpaCount = 0;

            for (let d = 1; d <= daysInMonth; d++) {
                const dateObj = new Date(year, monthIndex, d);
                const dd = String(d).padStart(2, "0");
                const mm = String(monthIndex + 1).padStart(2, "0");
                const yyyy = year;
                const dateIso = `${yyyy}-${mm}-${dd}`;
                const dayOfWeek = dateObj.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const dayName = dateObj.toLocaleDateString("id-ID", { weekday: "long" });
                const dateDisplay = `${dd}/${mm}/${yyyy}`;

                if (!isWeekend) {
                    hariKerjaCount++;
                }

                const match = participantRecords.find((r) => String(r.tanggal || "").slice(0, 10) === dateIso);
                let statusText = "........................";
                let keteranganText = "..................................................";

                if (match) {
                    const rawStatus = (match.status || "").trim();
                    if (match.approval_status === "pending") {
                        statusText = "Izin (Pending)";
                        izinCount++;
                    } else if (match.approval_status === "rejected") {
                        statusText = "Alpha";
                        alpaCount++;
                    } else if (rawStatus.toLowerCase() === "hadir") {
                        statusText = "Hadir";
                        hadirCount++;
                    } else if (rawStatus.toLowerCase() === "izin") {
                        statusText = "Izin";
                        izinCount++;
                    } else if (rawStatus.toLowerCase() === "sakit") {
                        statusText = "Sakit";
                        sakitCount++;
                    } else if (rawStatus.toLowerCase() === "alpa" || rawStatus.toLowerCase() === "tidak hadir") {
                        statusText = "Alpha";
                        alpaCount++;
                    } else {
                        statusText = rawStatus;
                    }
                    keteranganText = match.keterangan || (match.jam_masuk ? `Masuk: ${match.jam_masuk.slice(0, 5)}` : "-");
                } else if (isWeekend) {
                    statusText = "-";
                    keteranganText = "Libur Akhir Pekan";
                }

                dayRows.push({
                    no: d,
                    tanggal: dateDisplay,
                    hari: dayName,
                    status: statusText,
                    keterangan: keteranganText,
                    isWeekend,
                });
            }

            const persentaseHadir = hariKerjaCount > 0
                ? Math.min(100, Math.round((hadirCount / hariKerjaCount) * 100)) + " %"
                : "........ %";

            // ---------------- PAGE 1 ----------------
            // Title
            doc.setFont("helvetica", "bold");
            doc.setFontSize(15);
            doc.setTextColor(26, 54, 93);
            doc.text("REKAP LAPORAN ABSENSI MAGANG", 14, 18);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text("Laporan bulanan • Format sederhana untuk diisi sesuai data kehadiran sebenarnya", 14, 23);

            // Metadata Table Box
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.3);
            doc.setFillColor(255, 255, 255);
            doc.rect(14, 26, 182, 16, "FD");
            doc.line(14, 34, 196, 34);
            doc.line(116, 26, 116, 42);

            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(51, 65, 85);
            doc.text("Nama", 17, 30);
            doc.text("Instansi/Perusahaan", 17, 33);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(30, 41, 59);
            doc.text(`:   ${participant.institution || "........................................................"}`, 54, 31.5);

            doc.setFont("helvetica", "bold");
            doc.setTextColor(51, 65, 85);
            doc.text("Nama Peserta Magang", 17, 39.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(30, 41, 59);
            doc.text(`:   ${participant.name || "........................................................"}`, 54, 39.5);

            doc.setFont("helvetica", "bold");
            doc.setTextColor(51, 65, 85);
            doc.text("Bulan / Tahun", 119, 31.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(30, 41, 59);
            doc.text(`:   ${monthYearLabel}`, 150, 31.5);

            doc.setFont("helvetica", "bold");
            doc.setTextColor(51, 65, 85);
            doc.text("Pembimbing", 119, 38);
            doc.text("Lapangan", 119, 41);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(30, 41, 59);
            doc.text(`:   ${supervisorName}`, 150, 39.5);

            // Ringkasan Kehadiran Bulan Ini
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(30, 41, 59);
            doc.text("Ringkasan Kehadiran Bulan Ini", 14, 48);

            const sumColWidth = 182 / 6;
            const sumX = 14;
            const sumY = 51;
            const sumHeaders = ["Hari Kerja", "Hadir", "Izin", "Sakit", "Tanpa Keterangan", "Persentase Hadir"];
            const sumValues = [
                hariKerjaCount ? String(hariKerjaCount) : ".......",
                hadirCount ? String(hadirCount) : ".......",
                izinCount ? String(izinCount) : ".......",
                sakitCount ? String(sakitCount) : ".......",
                alpaCount ? String(alpaCount) : ".......",
                persentaseHadir,
            ];

            doc.setFontSize(7.5);
            sumHeaders.forEach((h, idx) => {
                const xPos = sumX + idx * sumColWidth;
                if (idx === 1) {
                    doc.setFillColor(236, 253, 245);
                } else if (idx === 5) {
                    doc.setFillColor(239, 246, 255);
                } else {
                    doc.setFillColor(248, 250, 252);
                }
                doc.rect(xPos, sumY, sumColWidth, 7, "FD");
                doc.setFont("helvetica", "bold");
                doc.setTextColor(71, 85, 105);
                doc.text(h, xPos + sumColWidth / 2, sumY + 4.5, { align: "center" });
            });

            sumValues.forEach((val, idx) => {
                const xPos = sumX + idx * sumColWidth;
                if (idx === 1) {
                    doc.setFillColor(240, 253, 244);
                } else if (idx === 5) {
                    doc.setFillColor(245, 249, 255);
                } else {
                    doc.setFillColor(255, 255, 255);
                }
                doc.rect(xPos, sumY + 7, sumColWidth, 7, "FD");
                doc.setFont("helvetica", "bold");
                doc.setTextColor(30, 41, 59);
                doc.text(val, xPos + sumColWidth / 2, sumY + 11.5, { align: "center" });
            });

            // Detail Absensi Harian (Page 1: days 1 to 21)
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(30, 41, 59);
            doc.text("Detail Absensi Harian", 14, 71);

            const tableX = 14;
            const tableHeaderY = 74;
            const colWidths = [10, 26, 26, 48, 72];
            const headers = ["No.", "Tanggal", "Hari", "Status (Hadir/Izin/Sakit/Alpha)", "Keterangan"];

            const drawTableHeader = (y) => {
                doc.setFillColor(26, 54, 93);
                doc.rect(tableX, y, 182, 7, "F");
                doc.setFont("helvetica", "bold");
                doc.setFontSize(7.5);
                doc.setTextColor(255, 255, 255);

                let curX = tableX;
                colWidths.forEach((w, i) => {
                    if (i === 4) {
                        doc.text(headers[i], curX + 3, y + 4.8);
                    } else {
                        doc.text(headers[i], curX + w / 2, y + 4.8, { align: "center" });
                    }
                    curX += w;
                });
            };

            drawTableHeader(tableHeaderY);

            const rowHeight = 6.2;
            const page1Rows = dayRows.slice(0, 21);

            page1Rows.forEach((row, idx) => {
                const yPos = tableHeaderY + 7 + idx * rowHeight;
                if (row.isWeekend) {
                    doc.setFillColor(248, 250, 252);
                } else if (idx % 2 === 1) {
                    doc.setFillColor(252, 253, 255);
                } else {
                    doc.setFillColor(255, 255, 255);
                }
                doc.setDrawColor(226, 232, 240);
                doc.rect(tableX, yPos, 182, rowHeight, "FD");

                let curX = tableX;
                for (let i = 0; i < colWidths.length - 1; i++) {
                    curX += colWidths[i];
                    doc.line(curX, yPos, curX, yPos + rowHeight);
                }

                doc.setFont("helvetica", "normal");
                doc.setFontSize(7.5);
                doc.setTextColor(51, 65, 85);

                let cellX = tableX;
                doc.text(String(row.no), cellX + colWidths[0] / 2, yPos + 4.2, { align: "center" });
                cellX += colWidths[0];

                doc.text(row.tanggal, cellX + colWidths[1] / 2, yPos + 4.2, { align: "center" });
                cellX += colWidths[1];

                doc.text(row.hari, cellX + colWidths[2] / 2, yPos + 4.2, { align: "center" });
                cellX += colWidths[2];

                if (row.status === "Hadir") {
                    doc.setTextColor(22, 101, 52);
                    doc.setFont("helvetica", "bold");
                } else if (row.status.startsWith("Izin")) {
                    doc.setTextColor(30, 64, 175);
                    doc.setFont("helvetica", "bold");
                } else if (row.status === "Sakit") {
                    doc.setTextColor(194, 65, 12);
                    doc.setFont("helvetica", "bold");
                } else if (row.status === "Alpha") {
                    doc.setTextColor(185, 28, 28);
                    doc.setFont("helvetica", "bold");
                } else {
                    doc.setTextColor(148, 163, 184);
                    doc.setFont("helvetica", "normal");
                }
                doc.text(row.status, cellX + colWidths[3] / 2, yPos + 4.2, { align: "center" });
                cellX += colWidths[3];

                doc.setFont("helvetica", "normal");
                doc.setTextColor(71, 85, 105);
                doc.text(row.keterangan, cellX + 3, yPos + 4.2, { maxWidth: colWidths[4] - 6 });
            });

            // Page 1 Footer
            doc.setDrawColor(226, 232, 240);
            doc.line(14, 282, 196, 282);
            doc.setFont("helvetica", "italic");
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text("Format rekap absensi magang bulanan", 14, 287);
            doc.setFont("helvetica", "normal");
            doc.text("Halaman 1", 196, 287, { align: "right" });

            // ---------------- PAGE 2 ----------------
            doc.addPage();

            const p2TableY = 16;
            drawTableHeader(p2TableY);

            const page2Rows = dayRows.slice(21);
            page2Rows.forEach((row, idx) => {
                const yPos = p2TableY + 7 + idx * rowHeight;
                if (row.isWeekend) {
                    doc.setFillColor(248, 250, 252);
                } else if (idx % 2 === 1) {
                    doc.setFillColor(252, 253, 255);
                } else {
                    doc.setFillColor(255, 255, 255);
                }
                doc.setDrawColor(226, 232, 240);
                doc.rect(tableX, yPos, 182, rowHeight, "FD");

                let curX = tableX;
                for (let i = 0; i < colWidths.length - 1; i++) {
                    curX += colWidths[i];
                    doc.line(curX, yPos, curX, yPos + rowHeight);
                }

                doc.setFont("helvetica", "normal");
                doc.setFontSize(7.5);
                doc.setTextColor(51, 65, 85);

                let cellX = tableX;
                doc.text(String(row.no), cellX + colWidths[0] / 2, yPos + 4.2, { align: "center" });
                cellX += colWidths[0];

                doc.text(row.tanggal, cellX + colWidths[1] / 2, yPos + 4.2, { align: "center" });
                cellX += colWidths[1];

                doc.text(row.hari, cellX + colWidths[2] / 2, yPos + 4.2, { align: "center" });
                cellX += colWidths[2];

                if (row.status === "Hadir") {
                    doc.setTextColor(22, 101, 52);
                    doc.setFont("helvetica", "bold");
                } else if (row.status.startsWith("Izin")) {
                    doc.setTextColor(30, 64, 175);
                    doc.setFont("helvetica", "bold");
                } else if (row.status === "Sakit") {
                    doc.setTextColor(194, 65, 12);
                    doc.setFont("helvetica", "bold");
                } else if (row.status === "Alpha") {
                    doc.setTextColor(185, 28, 28);
                    doc.setFont("helvetica", "bold");
                } else {
                    doc.setTextColor(148, 163, 184);
                    doc.setFont("helvetica", "normal");
                }
                doc.text(row.status, cellX + colWidths[3] / 2, yPos + 4.2, { align: "center" });
                cellX += colWidths[3];

                doc.setFont("helvetica", "normal");
                doc.setTextColor(71, 85, 105);
                doc.text(row.keterangan, cellX + 3, yPos + 4.2, { maxWidth: colWidths[4] - 6 });
            });

            const endOfTableY = p2TableY + 7 + page2Rows.length * rowHeight;

            // Catatan / Evaluasi Pembimbing
            const evalTitleY = endOfTableY + 10;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(30, 41, 59);
            doc.text("Catatan / Evaluasi Pembimbing", 14, evalTitleY);

            const evalBoxY = evalTitleY + 3;
            doc.setDrawColor(203, 213, 225);
            doc.rect(14, evalBoxY, 182, 18, "S");

            // Dotted lines inside note box
            if (typeof doc.setLineDashPattern === "function") {
                doc.setLineDashPattern([1, 1], 0);
                doc.line(18, evalBoxY + 6, 192, evalBoxY + 6);
                doc.line(18, evalBoxY + 12, 192, evalBoxY + 12);
                doc.setLineDashPattern([], 0);
            } else {
                const dots = ".".repeat(140);
                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);
                doc.text(dots, 18, evalBoxY + 6);
                doc.text(dots, 18, evalBoxY + 12);
            }

            // Signatures Block
            const sigY = evalBoxY + 26;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(51, 65, 85);

            // Left Signature: Pembimbing Lapangan
            doc.text("Mengetahui,", 45, sigY, { align: "center" });
            doc.text("Pembimbing Lapangan", 45, sigY + 4.5, { align: "center" });

            doc.line(22, sigY + 26, 68, sigY + 26);
            doc.setFont("helvetica", "bold");
            doc.text(`( ${supervisorName} )`, 45, sigY + 30.5, { align: "center" });

            // Right Signature: Peserta Magang
            doc.setFont("helvetica", "normal");
            doc.text("......................................, ................. 20...", 155, sigY, { align: "center" });
            doc.text("Peserta Magang", 155, sigY + 4.5, { align: "center" });

            doc.line(132, sigY + 26, 178, sigY + 26);
            doc.setFont("helvetica", "bold");
            doc.text(`( ${participant.name || "......................................."} )`, 155, sigY + 30.5, { align: "center" });

            // Page 2 Footer
            doc.setDrawColor(226, 232, 240);
            doc.line(14, 282, 196, 282);
            doc.setFont("helvetica", "italic");
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text("Format rekap absensi magang bulanan", 14, 287);
            doc.setFont("helvetica", "normal");
            doc.text("Halaman 2", 196, 287, { align: "right" });
        });

        const filename = selectedParticipant !== "all"
            ? `rekap-absensi-${selectedParticipant}-${activeMonth}.pdf`
            : `rekap-absensi-${activeMonth}.pdf`;
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
                            <p className="subtitle">{role === "admin" ? "Kelola, ubah, dan pantau seluruh rekapan data absensi peserta magang." : role === "pembimbing" ? "Rekap kehadiran peserta magang." : "Riwayat absensi ini hanya dapat dilihat oleh akun Anda."}</p>
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
                        </nav>
                    )}

                    {/* Menu Navigasi Khusus Pembimbing */}
                    {role === "pembimbing" && (
                        <nav className="management-links attendance-management-links" aria-label="Menu pembimbing">
                            <Link to="/riwayat" className="management-link" aria-current="page">
                                <span className="management-icon">📅</span>
                                <span>
                                    <strong>Absensi Magang</strong>
                                    <small>Lihat rekap kehadiran peserta.</small>
                                </span>
                                <span className="management-arrow">→</span>
                            </Link>
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
                        <div className="message error" role="alert">{error}</div>
                    ) : (
                        <>
                            {role === "pembimbing" && (
                                <div className="attendance-card" style={{ marginBottom: "18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <label htmlFor="absensi-month" style={{ fontSize: "14px", fontWeight: 600, color: "#334155" }}>Bulan</label>
                                            <input
                                                id="absensi-month"
                                                type="month"
                                                value={activeMonth}
                                                onChange={(event) => setSelectedMonth(event.target.value)}
                                                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", background: "#fff" }}
                                            />
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <label htmlFor="absensi-peserta" style={{ fontSize: "14px", fontWeight: 600, color: "#334155" }}>Peserta</label>
                                            <select
                                                id="absensi-peserta"
                                                value={selectedParticipant}
                                                onChange={(event) => setSelectedParticipant(event.target.value)}
                                                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", background: "#fff", color: "#1e293b", fontWeight: 500 }}
                                            >
                                                <option value="all">Semua Peserta</option>
                                                {participantsList.map((p) => (
                                                    <option key={p.code} value={p.code}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={exportMonthlyPdf}
                                        disabled={!filteredData.length}
                                        style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", padding: "9px 14px", fontWeight: 600, cursor: filteredData.length ? "pointer" : "not-allowed", opacity: filteredData.length ? 1 : 0.5 }}
                                    >
                                        Export PDF Bulanan
                                    </button>
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
                                            <th>Status</th>
                                            <th>Keterangan</th>
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
                                                const displayStatus = isPendingLeave
                                                    ? "Menunggu izin"
                                                    : item.approval_status === "rejected"
                                                        ? "Alpa"
                                                        : item.status;
                                                return (
                                                    <tr key={item.id}>
                                                        <td>{index + 1}</td>
                                                        <td>{formatDate(item.tanggal)}</td>
                                                        <td>{item.participant_name}</td>
                                                        <td>{item.jam_masuk || "-"}</td>
                                                        <td>{item.jam_pulang || "-"}</td>
                                                        <td>
                                                            <span className={`badge ${isPendingLeave ? "badge-belum-hadir" : "badge-" + String(item.status).toLowerCase().replace(" ", "-")}`}>
                                                                {displayStatus}
                                                            </span>
                                                        </td>
                                                        <td><small>{item.keterangan || "-"}</small></td>
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

                </main>
            </div>
        </div>
    );
}

export default Riwayat;
