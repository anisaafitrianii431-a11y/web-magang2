import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

function formatDate(value) {
  if (!value) return 'Belum ditentukan';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 'Belum ditentukan' : date.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function toScore(value) {
  if (value === null || value === undefined || value === '') return null;
  const score = typeof value === 'number' ? value : /^\d+(?:\.\d+)?$/.test(String(value).trim()) ? Number(value) : null;
  return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
}

function getFinalGrade(participant) {
  const tasks = participant.detail_tugas || [];
  const gradedTaskScores = tasks.map((task) => toScore(task.nilai)).filter((score) => score !== null);
  const taskScore = gradedTaskScores.length
    ? gradedTaskScores.reduce((sum, score) => sum + score, 0) / gradedTaskScores.length
    : null;
  const report = participant.laporan_terakhir;
  const reportScores = (participant.daftar_laporan || [])
    .map((item) => toScore(item.nilai_laporan) ?? toScore(item.penilaian?.[0]?.poin_nilai))
    .filter((score) => score !== null);
  const reportScore = reportScores.length
    ? reportScores.reduce((sum, score) => sum + score, 0) / reportScores.length
    : toScore(report?.nilai_laporan) ?? toScore(report?.penilaian?.[0]?.poin_nilai);
  const attendanceScore = toScore(participant.persentase_absensi) ?? 0;
  const totalTasks = Number(participant.total_tugas) || 0;
  const submittedTasks = Number(participant.tugas_selesai) || 0;
  const allTasksGraded = gradedTaskScores.length > 0
    && gradedTaskScores.length === tasks.length
    && (totalTasks === 0 || submittedTasks >= totalTasks);
  const finalScore = taskScore !== null && reportScore !== null && allTasksGraded
    ? attendanceScore * 0.10 + taskScore * 0.55 + reportScore * 0.35
    : null;

  return { attendanceScore, taskScore, reportScore, finalScore, gradedTaskCount: gradedTaskScores.length, allTasksGraded };
}

function RekapitulasiPage() {
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  })();
  const isMentor = String(currentUser?.role || '').trim().toLowerCase() === 'pembimbing';
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/v1/rekapitulasi');
      setData(Array.isArray(response.data) ? response.data : response.data?.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Rekapitulasi belum dapat dimuat. Pastikan backend aktif dan Anda sudah login.');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const downloadParticipantRecap = async () => {
    if (!selectedParticipant) return;

    try {
      const { AlignmentType, BorderStyle, Document, Packer, Paragraph, ShadingType, Table, TableBorders, TableCell, TableRow, TextRun, WidthType } = await import('docx');
      const reports = selectedParticipant.daftar_laporan || [];
      const tasks = selectedParticipant.detail_tugas || [];
      const grade = getFinalGrade(selectedParticipant);
      const font = 'Times New Roman';
      const tableWidth = 9900;
      const borders = {
        top: { style: BorderStyle.SINGLE, size: 1, color: '808080' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: '808080' },
        left: { style: BorderStyle.SINGLE, size: 1, color: '808080' },
        right: { style: BorderStyle.SINGLE, size: 1, color: '808080' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '808080' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '808080' },
      };
      const createCell = (value, { header = false, label = false, size = 20 } = {}) => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({
            text: String(value ?? '-'),
            font,
            bold: header || label,
            size,
            color: '000000',
          })],
          spacing: { before: 20, after: 20 },
        })],
        shading: header
          ? { type: ShadingType.CLEAR, fill: 'E7E7E7' }
          : label
            ? { type: ShadingType.CLEAR, fill: 'F5F5F5' }
            : undefined,
        margins: { top: 75, bottom: 75, left: 90, right: 90 },
        verticalAlign: 'center',
      });
      const createTable = (headers, rows, columnWidths, size = 20) => new Table({
        rows: [
          new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((header) => createCell(header, { header, size })) }),
          ...rows.map((row) => new TableRow({ cantSplit: true, children: row.map((value) => createCell(value, { size })) })),
        ],
        width: { size: tableWidth, type: WidthType.DXA },
        columnWidths,
        borders,
      });
      const createDetailsTable = (rows) => new Table({
        rows: rows.map(([label, value]) => new TableRow({ cantSplit: true,
          children: [createCell(label, { label: true }), createCell(value)],
        })),
        width: { size: tableWidth, type: WidthType.DXA },
        columnWidths: [3000, tableWidth - 3000],
        borders,
      });
      const sectionHeading = (text) => new Paragraph({
        children: [new TextRun({ text, font, size: 22, bold: true, color: '000000' })],
        keepNext: true,
        spacing: { before: 260, after: 100 },
      });
      const signatureCell = (title, name) => new TableCell({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: title, font, size: 20, color: '000000' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '\u00A0', font, size: 20, color: '000000' })],
            spacing: { before: 850, after: 100 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: name, font, size: 20, bold: true, underline: {}, color: '000000' })],
          }),
        ],
        verticalAlign: 'center',
      });
      const letterhead = new Table({
        rows: [new TableRow({
          cantSplit: true,
          children: [new TableCell({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: 'CV PUTRA ANUGRAH MANDIRI',
                font,
                bold: true,
                size: 26,
                color: '000000',
              })],
              spacing: { after: 80 },
            })],
            margins: { top: 80, bottom: 100, left: 100, right: 100 },
          })],
        })],
        width: { size: tableWidth, type: WidthType.DXA },
        columnWidths: [tableWidth],
        borders: new TableBorders({
          top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          bottom: { style: BorderStyle.DOUBLE, size: 8, color: '000000' },
          left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        }),
      });
      const taskRows = tasks.length
        ? tasks.map((task) => [
            task.judul || 'Tugas telah dihapus',
            task.status || 'Terkumpul',
            `${formatDate(task.deadline)}\nDikumpulkan: ${formatDate(task.tanggal_submit)}`,
            task.nilai ?? 'Belum dinilai',
            task.feedback || '-',
          ])
        : [['Belum ada tugas yang dikumpulkan', '-', '-', '-', '-']];
      const reportRows = reports.length
        ? reports.map((report) => [
            report.kategori_laporan || '-',
            report.judul_laporan || '-',
            report.status_laporan || '-',
            report.tgl_submit ? formatDate(report.tgl_submit) : '-',
            toScore(report.nilai_laporan) ?? 'Belum dinilai',
            report.penilaian?.[0]?.judul_nilai || '-',
            report.penilaian?.[0]?.catatan || '-',
          ])
        : [['-', 'Belum ada laporan', '-', '-', '-', '-', '-']];
      const filename = String(selectedParticipant.nama_peserta || 'peserta')
        .trim()
        .replace(/[^a-z0-9-_]+/gi, '-')
        .toLowerCase();
      const documentFile = new Document({
        styles: {
          default: {
            document: {
              run: { font, size: 20, color: '000000' },
              paragraph: { spacing: { after: 100 } },
            },
          },
        },
        sections: [{
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: { top: 900, right: 900, bottom: 900, left: 900 },
            },
          },
          children: [
            letterhead,
            new Paragraph({
              children: [new TextRun({ text: 'REKAPITULASI MAGANG', font, size: 28, bold: true, color: '000000' })],
              alignment: AlignmentType.CENTER,
              keepNext: true,
              spacing: { before: 160, after: 100 },
            }),
            new Paragraph({
              children: [new TextRun({
                text: `Dibuat pada ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
                font,
                color: '000000',
                size: 18,
              })],
              spacing: { after: 180 },
            }),
            sectionHeading('Data Peserta dan Magang'),
            createDetailsTable([
              ['Nama Peserta', selectedParticipant.nama_peserta],
              ['Instansi', selectedParticipant.instansi || '-'],
              ['Periode Magang', selectedParticipant.periode || '-'],
              ['Tanggal Mulai', formatDate(selectedParticipant.tanggal_mulai)],
              ['Tanggal Selesai', formatDate(selectedParticipant.tanggal_selesai)],
              ['Persentase Absensi', `${selectedParticipant.persentase_absensi ?? 0}%`],
              ['Tugas Selesai', `${selectedParticipant.tugas_selesai ?? 0} / ${selectedParticipant.total_tugas ?? 0}`],
            ]),
            sectionHeading('Detail Tugas'),
            createTable(
              ['Judul Tugas', 'Status', 'Tenggat / Pengumpulan', 'Nilai', 'Feedback'],
              taskRows,
              [2400, 1200, 2200, 800, 3300],
            ),
            sectionHeading('Rekapitulasi Laporan Magang'),
            createTable(
              ['Jenis', 'Judul Laporan', 'Status', 'Tanggal Dikirim', 'Nilai', 'Hasil Penilaian', 'Catatan'],
              reportRows,
              [950, 1900, 1050, 1250, 650, 1900, 2200],
              18,
            ),
            sectionHeading('Penilaian Akhir Magang'),
            createDetailsTable([
              ['Nilai Absensi (10%)', `${grade.attendanceScore}% → ${(grade.attendanceScore * 0.10).toFixed(2)}`],
              ['Nilai Tugas (55%)', grade.taskScore === null ? 'Belum dinilai' : `${grade.taskScore.toFixed(2)} → ${(grade.taskScore * 0.55).toFixed(2)} (${grade.gradedTaskCount} tugas dinilai)`],
              ['Rata-rata Nilai Laporan (35%)', grade.reportScore === null ? 'Belum dinilai' : `${grade.reportScore.toFixed(2)} → ${(grade.reportScore * 0.35).toFixed(2)}`],
              ['Nilai Akhir', grade.finalScore === null ? 'Belum lengkap - seluruh tugas harus dinilai dan nilai laporan harus tersedia' : `${grade.finalScore.toFixed(2)} / 100`],
            ]),
            new Table({
              rows: [new TableRow({
                cantSplit: true,
                children: [
                  signatureCell('Pembimbing', 'Ibrohim'),
                  signatureCell('Pimpinan', 'Hengky'),
                ],
              })],
              width: { size: tableWidth, type: WidthType.DXA },
              columnWidths: [tableWidth / 2, tableWidth / 2],
              borders: TableBorders.NONE,
            }),
          ],
        }],
      });
      const blob = await Packer.toBlob(documentFile);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rekapitulasi-${filename}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      console.error('Gagal membuat dokumen rekapitulasi Word.', downloadError);
      setError('Dokumen Word rekapitulasi gagal dibuat. Silakan coba lagi.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Rekapitulasi Tugas &amp; Absensi</h1>
          <p className="page-description">
            Rekap kehadiran peserta magang, tugas yang sudah dikumpulkan, dan periode magang.
          </p>
        </div>
        <button type="button" className="btn-save-primary" onClick={loadData} disabled={loading}>
          {loading ? 'Memuat…' : 'Muat Ulang'}
        </button>
      </div>

      {error && (
        <div role="alert" style={{ margin: '0 0 16px', padding: '12px 16px', borderRadius: 8, color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      <div className="table-card">
        <div className="table-card-header recap-card-header">
          <svg className="table-card-header-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" />
          </svg>
          Daftar Pendaftaran / Pemagang ({data.length} Data)
        </div>

        <div className="recap-table-scroll">
          <table className="custom-table recap-table">
            <thead>
              <tr>
                <th>#</th>
                <th>PESERTA &amp; INSTANSI</th>
                <th>PROJEK / TUGAS</th>
                <th>LAMPIRAN TANGGAL PROJEK</th>
                <th>PERSENTASE ABSENSI</th>
                <th>TUGAS SELESAI</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="empty">Memuat rekapitulasi dari server…</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="6" className="empty">{error ? 'Data belum bisa ditampilkan.' : isMentor ? 'Belum ada peserta magang aktif yang ditugaskan kepada Anda. Admin perlu menetapkan Anda sebagai pembimbing lapangan pada data pendaftaran.' : 'Belum ada peserta dengan status Pemagang Aktif.'}</td></tr>
              ) : data.map((item, index) => (
                <tr key={item.user_id}>
                  <td>{index + 1}</td>
                  <td>
                    <div className="cell-main-title">{item.nama_peserta}</div>
                    <div className="cell-subtitle">{item.instansi || 'Instansi belum diisi'}{item.jurusan ? ` • ${item.jurusan}` : ''}</div>
                  </td>
                  <td>
                    <div className="recap-project">{item.projek || 'Belum ada tugas yang dikumpulkan'}</div>
                  </td>
                  <td>
                    {item.lampiran_tanggal_mulai ? (
                      <span className="recap-date-range">
                        {formatDate(item.lampiran_tanggal_mulai)}
                        {item.lampiran_tanggal_akhir && item.lampiran_tanggal_akhir !== item.lampiran_tanggal_mulai
                          ? ` – ${formatDate(item.lampiran_tanggal_akhir)}`
                          : ''}
                      </span>
                    ) : <span className="cell-subtitle">Belum ada lampiran tugas</span>}
                  </td>
                  <td>
                    <span className="recap-metric recap-attendance">{item.persentase_absensi ?? 0}% →</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="recap-metric recap-tasks recap-task-button"
                      onClick={() => setSelectedParticipant(item)}
                      aria-label={`Lihat detail ${item.tugas_selesai ?? 0} tugas yang dikumpulkan ${item.nama_peserta}`}
                    >
                      {item.tugas_selesai ?? 0} / {item.total_tugas ?? 0} Tugas →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="page-description" style={{ marginTop: 12 }}>
        Judul tugas dan tanggal lampiran diambil dari pengumpulan tugas peserta. Persentase kehadiran dihitung dari hari kerja Senin–Sabtu selama periode magang.
      </p>

      {selectedParticipant && (
        <div className="modal-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedParticipant(null);
        }}>
          <section className="modal-content recap-task-modal" role="dialog" aria-modal="true" aria-labelledby="recap-task-modal-title">
            <header className="modal-header">
              <div>
                <h2 className="modal-title" id="recap-task-modal-title">Detail Rekapitulasi Peserta</h2>
                <p className="recap-modal-subtitle">{selectedParticipant.nama_peserta} · {selectedParticipant.instansi || 'Instansi belum diisi'}</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setSelectedParticipant(null)} aria-label="Tutup">×</button>
            </header>
            <div className="recap-task-list">
              <section className="recap-task-detail" aria-labelledby="recap-participant-summary-title">
                <h3 id="recap-participant-summary-title">Data Peserta dan Magang</h3>
                <dl className="recap-task-meta">
                  <div><dt>Nama peserta</dt><dd>{selectedParticipant.nama_peserta}</dd></div>
                  <div><dt>Instansi</dt><dd>{selectedParticipant.instansi || '-'}</dd></div>
                  <div><dt>Periode</dt><dd>{selectedParticipant.periode || '-'}</dd></div>
                  <div><dt>Persentase absensi</dt><dd>{selectedParticipant.persentase_absensi ?? 0}%</dd></div>
                  <div><dt>Tugas selesai</dt><dd>{selectedParticipant.tugas_selesai ?? 0} / {selectedParticipant.total_tugas ?? 0}</dd></div>
                </dl>
              </section>
              {(selectedParticipant.detail_tugas || []).length === 0 ? (
                <div className="recap-task-empty">Peserta ini belum mengumpulkan tugas.</div>
              ) : selectedParticipant.detail_tugas.map((task) => (
                <article className="recap-task-detail" key={task.tugas_id}>
                  <div className="recap-task-detail-heading">
                    <h3>{task.judul}</h3>
                    <span className="recap-submission-status">{task.status || 'Terkumpul'}</span>
                  </div>
                  {task.deskripsi && <p className="recap-task-description">{task.deskripsi}</p>}
                  <dl className="recap-task-meta">
                    <div><dt>Tenggat</dt><dd>{formatDate(task.deadline)}</dd></div>
                    <div><dt>Tanggal dikumpulkan</dt><dd>{formatDate(task.tanggal_submit)}</dd></div>
                    <div><dt>Nilai</dt><dd>{task.nilai ?? 'Belum dinilai'}</dd></div>
                  </dl>
                  {task.feedback && <p className="recap-task-feedback"><strong>Catatan pembimbing:</strong> {task.feedback}</p>}
                </article>
              ))}
              <section className="recap-task-detail recap-report-summary" aria-labelledby="recap-report-summary-title">
                <div className="recap-task-detail-heading">
                  <h3 id="recap-report-summary-title">Rekapitulasi Laporan Magang</h3>
                  <span className="recap-submission-status">
                    {(selectedParticipant.daftar_laporan || []).length} laporan
                  </span>
                </div>
                {(selectedParticipant.daftar_laporan || []).length ? (
                  (selectedParticipant.daftar_laporan || []).map((report) => (
                    <article className="recap-task-detail" key={report.id_laporan}>
                      <div className="recap-task-detail-heading">
                        <h4>{report.judul_laporan}</h4>
                        <span className="recap-submission-status">{report.status_laporan}</span>
                      </div>
                      <dl className="recap-task-meta">
                        <div><dt>Jenis laporan</dt><dd>{report.kategori_laporan || 'Tidak ditentukan'}</dd></div>
                        <div><dt>Tanggal dikirim</dt><dd>{formatDate(report.tgl_submit)}</dd></div>
                        <div><dt>Nilai</dt><dd>{toScore(report.nilai_laporan) ?? 'Belum dinilai'}</dd></div>
                        {report.penilaian?.[0]?.judul_nilai && (
                          <div><dt>Hasil penilaian</dt><dd>{report.penilaian[0].judul_nilai}</dd></div>
                        )}
                      </dl>
                      {report.penilaian?.[0]?.catatan && (
                        <p className="recap-task-feedback"><strong>Catatan pembimbing:</strong> {report.penilaian[0].catatan}</p>
                      )}
                    </article>
                  ))
                ) : (
                  <p className="recap-task-description">Peserta ini belum mengirim laporan magang.</p>
                )}
              </section>
              <section className="recap-task-detail" aria-labelledby="recap-final-grade-title">
                <h3 id="recap-final-grade-title">Penilaian Akhir Magang</h3>
                {(() => {
                  const grade = getFinalGrade(selectedParticipant);
                  return (
                    <>
                      <dl className="recap-task-meta">
                        <div><dt>Absensi (10%)</dt><dd>{grade.attendanceScore}% = {(grade.attendanceScore * 0.10).toFixed(2)}</dd></div>
                        <div><dt>Rata-rata tugas (55%)</dt><dd>{grade.taskScore === null ? 'Belum dinilai' : `${grade.taskScore.toFixed(2)} = ${(grade.taskScore * 0.55).toFixed(2)}`}</dd></div>
                        <div><dt>Rata-rata laporan (35%)</dt><dd>{grade.reportScore === null ? 'Belum dinilai' : `${grade.reportScore.toFixed(2)} = ${(grade.reportScore * 0.35).toFixed(2)}`}</dd></div>
                        <div><dt>Nilai akhir</dt><dd>{grade.finalScore === null ? 'Belum lengkap' : `${grade.finalScore.toFixed(2)} / 100`}</dd></div>
                      </dl>
                      <p className="recap-task-description">Rumus: (Absensi × 10%) + (rata-rata nilai tugas × 55%) + (rata-rata nilai semua laporan yang dinilai × 35%). Nilai akhir ditampilkan setelah seluruh tugas dikumpulkan dan dinilai, serta minimal satu laporan dinilai.</p>
                    </>
                  );
                })()}
              </section>
              <div className="recap-task-detail">
                <button type="button" className="btn-secondary recap-download-button" onClick={downloadParticipantRecap}>
                  Unduh tabel rekapitulasi
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default RekapitulasiPage;
