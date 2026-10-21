import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

function formatDate(value) {
  if (!value) return 'Belum ditentukan';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 'Belum ditentukan' : date.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatTime(value) {
  return value ? String(value).slice(0, 5) : '—';
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
  const [selectedAttendanceParticipant, setSelectedAttendanceParticipant] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

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

  const downloadTaskFile = async (task) => {
    setDownloadingId(task.submisi_id);
    try {
      const response = await api.get(`/submisi/${task.submisi_id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tugas-${task.tugas_id}-peserta-${selectedParticipant?.user_id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Berkas tugas tidak dapat diunduh. Pastikan berkas masih tersedia.');
    } finally {
      setDownloadingId(null);
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
                <th>STATUS KEHADIRAN</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="empty">Memuat rekapitulasi dari server…</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="7" className="empty">{error ? 'Data belum bisa ditampilkan.' : isMentor ? 'Belum ada peserta magang aktif yang ditugaskan kepada Anda. Admin perlu menetapkan Anda sebagai pembimbing lapangan pada data pendaftaran.' : 'Belum ada peserta dengan status Pemagang Aktif.'}</td></tr>
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
                    <button type="button" className="recap-metric recap-attendance recap-attendance-button" onClick={() => setSelectedAttendanceParticipant(item)} aria-label={`Lihat detail absensi ${item.nama_peserta}`} title={`Lihat detail absensi ${item.nama_peserta}`}>
                      {item.persentase_absensi ?? 0}% →
                    </button>
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
                  <td>
                    <span className={`recap-status ${item.hari_absensi_tercatat === 0 ? 'is-none' : item.hari_kerja > 0 && item.hari_hadir >= item.hari_kerja ? 'is-complete' : 'is-warning'}`}>
                      {item.status_kehadiran || 'Belum ada absensi'}
                    </span>
                    <div className="recap-status-note">
                      {item.hari_hadir ?? 0} dari {item.hari_kerja ?? 0} hari kerja
                      {item.ringkasan_absensi && <span className="recap-status-breakdown">Hadir {item.ringkasan_absensi.hadir} · Izin {item.ringkasan_absensi.izin} · Sakit {item.ringkasan_absensi.sakit} · Alpa {item.ringkasan_absensi.alpa}</span>}
                    </div>
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
                <h2 className="modal-title" id="recap-task-modal-title">Detail Tugas Peserta</h2>
                <p className="recap-modal-subtitle">{selectedParticipant.nama_peserta} · {selectedParticipant.instansi || 'Instansi belum diisi'}</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setSelectedParticipant(null)} aria-label="Tutup">×</button>
            </header>
            <div className="recap-task-list">
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
                  {task.ada_berkas && (
                    <button type="button" className="btn-secondary recap-download-button" onClick={() => downloadTaskFile(task)} disabled={downloadingId === task.submisi_id}>
                      {downloadingId === task.submisi_id ? 'Mengunduh…' : 'Unduh berkas tugas'}
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {selectedAttendanceParticipant && (
        <div className="modal-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedAttendanceParticipant(null);
        }}>
          <section className="modal-content recap-task-modal" role="dialog" aria-modal="true" aria-labelledby="recap-attendance-modal-title">
            <header className="modal-header">
              <div>
                <h2 className="modal-title" id="recap-attendance-modal-title">Detail Absensi Peserta</h2>
                <p className="recap-modal-subtitle">{selectedAttendanceParticipant.nama_peserta} · {selectedAttendanceParticipant.instansi || 'Instansi belum diisi'}</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setSelectedAttendanceParticipant(null)} aria-label="Tutup">×</button>
            </header>
            <div className="recap-attendance-summary">
              <strong>{selectedAttendanceParticipant.persentase_absensi ?? 0}% kehadiran</strong>
              <span>{selectedAttendanceParticipant.hari_hadir ?? 0} hari hadir dari {selectedAttendanceParticipant.hari_kerja ?? 0} hari kerja</span>
            </div>
            <div className="recap-attendance-list">
              {(selectedAttendanceParticipant.detail_absensi || []).length === 0 ? (
                <div className="recap-task-empty">Belum ada catatan absensi untuk peserta ini pada periode magang.</div>
              ) : selectedAttendanceParticipant.detail_absensi.map((attendance) => (
                <article className="recap-attendance-entry" key={attendance.id}>
                  <div className="recap-attendance-entry-heading">
                    <strong>{formatDate(attendance.tanggal)}</strong>
                    <span className={`recap-status ${String(attendance.status).toLowerCase() === 'hadir' ? 'is-complete' : 'is-warning'}`}>{attendance.status || 'Status tidak tersedia'}</span>
                  </div>
                  <dl className="recap-task-meta">
                    <div><dt>Jam masuk</dt><dd>{formatTime(attendance.jam_masuk)}</dd></div>
                    <div><dt>Jam pulang</dt><dd>{formatTime(attendance.jam_pulang)}</dd></div>
                  </dl>
                  {attendance.keterangan && <p className="recap-task-description"><strong>Keterangan:</strong> {attendance.keterangan}</p>}
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default RekapitulasiPage;
