import StatusBadge from '../components/StatusBadge';

function formatSubmittedAt(value) {
  if (!value) return { date: '—', time: '' };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: String(value), time: '' };
  return {
    date: parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    time: parsed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function LaporanMagangPage({ 
  laporanList, 
  currentRole, 
  currentUserName,
  onOpenUpload, 
  onOpenRevisi, 
  onOpenDetail, 
  onDelete 
}) {
  return (
    <div>
      {/* Alert Banner from Image */}
      <div className="alert-welcome">
        <div className="alert-icon">✓</div>
        <span>Selamat datang kembali, {currentRole === 'anak_magang' ? `${currentUserName}!` : `${currentUserName || 'Pembimbing'}!`}</span>
      </div>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Data Laporan Magang</h1>
          <p className="page-description">
            Kelola pengajuan laporan, riwayat revisi google doc, moderasi review, dan penilaian akhir peserta magang.
          </p>
        </div>

        {/* UC-02 Action Button */}
        {currentRole === 'anak_magang' && (
          <button className="btn-primary" onClick={onOpenUpload}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Tambah Laporan Baru
          </button>
        )}
      </div>

      {/* Table Card */}
      <div className="table-card">
        <div className="table-card-header">
          <svg className="table-card-header-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          Daftar Laporan Magang ({laporanList.length} Data)
        </div>

        <table className="custom-table" style={{ width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: '5%' }}>#</th>
              <th style={{ width: '34%' }}>JUDUL LAPORAN & PESERTA</th>
              <th style={{ width: '12%' }}>KATEGORI</th>
              <th style={{ width: '15%' }}>TANGGAL SUBMIT</th>
              <th style={{ width: '18%' }}>STATUS LAPORAN</th>
              <th style={{ width: '16%', textAlign: 'right' }}>AKSI</th>
            </tr>
          </thead>
          <tbody>
            {laporanList.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  Tidak ada data laporan magang ditemukan.
                </td>
              </tr>
            ) : (
              laporanList.map((item, index) => (
                <tr key={item.id_laporan}>
                  <td style={{ fontWeight: 600, color: '#64748b' }}>{index + 1}</td>
                  <td>
                    <div className="cell-main-title">{item.judul_laporan}</div>
                    <div className="cell-subtitle">
                      {item.nama_peserta || 'Peserta Magang'} • {item.asal_instansi || 'Perguruan Tinggi'}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-kategori">{item.kategori_laporan}</span>
                  </td>
                  <td>
                    {(() => {
                      const submittedAt = formatSubmittedAt(item.tgl_submit);
                      return (
                        <div className="report-date-cell">
                          <strong>{submittedAt.date}</strong>
                          {submittedAt.time && <span>{submittedAt.time}</span>}
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    <StatusBadge status={item.status_laporan} />
                  </td>
                  <td>
                    <div className="action-buttons" style={{ justifyContent: 'flex-end', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {/* UC-06 Detail & Download Button */}
                      <button className="btn-action btn-action-detail" onClick={() => onOpenDetail(item)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        Detail
                      </button>

                      {/* UC-04 Mengunggah Revisi Button (Anak Magang) */}
                      {currentRole === 'anak_magang' && item.status_laporan === 'Revisi' && (
                        <button className="btn-action btn-action-revisi" onClick={() => onOpenRevisi(item)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                          </svg>
                          Revisi
                        </button>
                      )}

                      {/* Delete button */}
                      <button className="btn-action btn-action-delete" onClick={() => onDelete(item.id_laporan)}>
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
