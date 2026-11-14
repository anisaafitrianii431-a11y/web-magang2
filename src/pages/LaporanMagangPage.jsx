import { useState, useMemo } from 'react';
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
  laporanList = [],
  currentRole,
  currentUserName,
  onOpenUpload,
  onOpenRevisi,
  onOpenDetail,
  onDelete
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filteredList = useMemo(() => {
    return (laporanList || []).filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (item.judul_laporan || '').toLowerCase().includes(q) ||
        (item.nama_peserta || '').toLowerCase().includes(q) ||
        (item.asal_instansi || '').toLowerCase().includes(q);
      const matchKategori = !filterKategori || item.kategori_laporan === filterKategori;
      const matchStatus = !filterStatus || item.status_laporan === filterStatus;
      return matchSearch && matchKategori && matchStatus;
    });
  }, [laporanList, searchQuery, filterKategori, filterStatus]);

  return (
    <div>
      {/* Page Header */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: "#6366f1", marginRight: "6px" }}></span>
            LAPORAN AKHIR MAGANG
          </div>
          <h1>Data Laporan Magang</h1>
          <p className="subtitle">
            Kelola pengajuan berkas laporan akhir magang, pemantauan revisi, dan penilaian pembimbing.
          </p>
        </div>

        {/* UC-02 Action Button */}
        {currentRole === 'anak_magang' && (
          <button className="btn-primary" onClick={onOpenUpload}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Tambah Laporan Baru</span>
          </button>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="filter-card">
        <div className="search-input-wrapper">
          <svg className="search-icon-inside" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Cari judul laporan atau nama peserta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={filterKategori}
          onChange={(e) => setFilterKategori(e.target.value)}
        >
          <option value="">Semua Kategori</option>
          <option value="Individu">Individu</option>
          <option value="Kelompok">Kelompok</option>
        </select>

        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Semua Status</option>
          <option value="Menunggu Review">Menunggu Review</option>
          <option value="Revisi">Revisi</option>
          <option value="Disetujui">Disetujui</option>
        </select>

        <button className="btn-search" onClick={() => {}} title="Terapkan Pencarian">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>Cari</span>
        </button>
      </div>

      {/* Table Card */}
      <div className="table-card">
        <div className="table-card-header">
          <div className="table-card-title">
            <span className="header-icon">📁</span>
            <span>Daftar Laporan Magang ({filteredList.length} Data)</span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="enterprise-table custom-table">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                <th style={{ minWidth: '240px' }}>JUDUL LAPORAN &amp; PESERTA</th>
                <th style={{ width: '130px' }}>KATEGORI</th>
                <th style={{ width: '170px', whiteSpace: 'nowrap' }}>TANGGAL SUBMIT</th>
                <th style={{ width: '160px' }}>STATUS LAPORAN</th>
                <th style={{ width: '160px', textAlign: 'right' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: 0 }}>
                    <div className="empty-state-modern">
                      <div className="empty-state-icon-circle">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      </div>
                      <h4>Belum Ada Laporan Magang</h4>
                      <p>
                        {currentRole === 'anak_magang'
                          ? 'Silakan klik tombol "Tambah Laporan Baru" di atas untuk mengunggah berkas laporan akhir magang Anda.'
                          : 'Belum ada data laporan magang yang ditemukan.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, index) => {
                  const submittedAt = formatSubmittedAt(item.tgl_submit);

                  return (
                    <tr key={item.id_laporan || index}>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>{index + 1}</td>
                      <td>
                        <div className="col-title-wrap">
                          <span className="item-main-title">{item.judul_laporan}</span>
                          <span className="item-subtitle">
                            {item.nama_peserta || 'Peserta Magang'} &bull; {item.asal_instansi || 'Perguruan Tinggi'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="badge-category">{item.kategori_laporan || 'Individu'}</span>
                      </td>
                      <td>
                        <div className="date-cell">
                          <span className="date-main">{submittedAt.date}</span>
                          {submittedAt.time && <span className="date-sub">{submittedAt.time}</span>}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={item.status_laporan || 'Menunggu Review'} />
                      </td>
                      <td>
                        <div className="table-action-group">
                          {/* UC-06 Detail & Download Button */}
                          <button className="action-btn" onClick={() => onOpenDetail(item)} title="Lihat detail laporan">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            <span>Detail</span>
                          </button>

                          {/* UC-04 Mengunggah Revisi Button (Anak Magang) */}
                          {currentRole === 'anak_magang' && item.status_laporan === 'Revisi' && (
                            <button
                              className="action-btn"
                              style={{ borderColor: '#fde68a', backgroundColor: '#fffbeb', color: '#b45309' }}
                              onClick={() => onOpenRevisi(item)}
                              title="Unggah link revisi Google Doc"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                              </svg>
                              <span>Revisi</span>
                            </button>
                          )}

                          {/* Delete button */}
                          <button
                            className="action-btn action-btn-danger"
                            onClick={() => onDelete(item.id_laporan)}
                            title="Hapus laporan ini"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
