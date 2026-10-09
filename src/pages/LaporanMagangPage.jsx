import { useState } from 'react';
import StatusBadge from '../components/StatusBadge';

export default function LaporanMagangPage({ 
  laporanList, 
  currentRole, 
  onOpenUpload, 
  onOpenReview, 
  onOpenRevisi, 
  onOpenPenilaian, 
  onOpenDetail, 
  onDelete 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');

  const filteredData = laporanList.filter(item => {
    const matchSearch = item.judul_laporan.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (item.nama_peserta && item.nama_peserta.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        (item.asal_instansi && item.asal_instansi.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchKategori = filterKategori === 'Semua' || item.kategori_laporan === filterKategori;
    const matchStatus = filterStatus === 'Semua' || item.status_laporan === filterStatus;

    return matchSearch && matchKategori && matchStatus;
  });

  return (
    <div>
      {/* Alert Banner from Image */}
      <div className="alert-welcome">
        <div className="alert-icon">✓</div>
        <span>Selamat datang kembali, {currentRole === 'anak_magang' ? 'anak magang!' : 'pembimbing!'}</span>
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

      {/* Filter Card matching image */}
      <div className="filter-card">
        <div className="search-input-group">
          <input 
            type="text" 
            className="search-input"
            placeholder="Cari judul laporan, peserta, atau instansi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select 
          className="filter-select"
          value={filterKategori}
          onChange={(e) => setFilterKategori(e.target.value)}
        >
          <option value="Semua">-- Semua Kategori --</option>
          <option value="Individu">Individu</option>
          <option value="Kelompok">Kelompok</option>
        </select>

        <select 
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="Semua">-- Semua Status --</option>
          <option value="Menunggu Review">Menunggu Review</option>
          <option value="Revisi">Revisi</option>
          <option value="Disetujui">Disetujui</option>
        </select>

        <button className="btn-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          Cari
        </button>
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
          Daftar Laporan Magang ({filteredData.length} Data)
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>JUDUL LAPORAN & PESERTA</th>
              <th>KATEGORI</th>
              <th>TANGGAL SUBMIT</th>
              <th>STATUS LAPORAN</th>
              <th>NILAI AKHIR</th>
              <th style={{ textAlign: 'right' }}>AKSI</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  Tidak ada data laporan magang ditemukan.
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
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
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {item.tgl_submit ? item.tgl_submit.split(' ')[0] : '2026-09-15'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {item.tgl_submit ? item.tgl_submit.split(' ')[1] || '' : ''}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={item.status_laporan} />
                  </td>
                  <td>
                    {(() => {
                      let poin = item.poin_nilai;
                      if (!poin && item.penilaian && item.penilaian[0]) {
                        poin = item.penilaian[0].poin_nilai;
                      }

                      if (!poin && item.nilai_laporan) {
                        const score = parseFloat(item.nilai_laporan);
                        if (score >= 85) poin = 'A (Sangat Baik)';
                        else if (score >= 75) poin = 'B+ (Baik)';
                        else if (score >= 65) poin = 'B (Cukup)';
                        else if (score >= 50) poin = 'C (Perlu Evaluasi)';
                        else poin = 'D (Kurang)';
                      }

                      if (!poin) {
                        return (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                            Belum Dinilai
                          </span>
                        );
                      }

                      let badgeBg = '#ecfdf5';
                      let badgeColor = '#047857';
                      let badgeBorder = '#a7f3d0';

                      if (poin.startsWith('B')) {
                        badgeBg = '#eff6ff';
                        badgeColor = '#1d4ed8';
                        badgeBorder = '#bfdbfe';
                      } else if (poin.startsWith('C')) {
                        badgeBg = '#fffbeb';
                        badgeColor = '#b45309';
                        badgeBorder = '#fde68a';
                      } else if (poin.startsWith('D')) {
                        badgeBg = '#fef2f2';
                        badgeColor = '#b91c1c';
                        badgeBorder = '#fca5a5';
                      }

                      return (
                        <span style={{
                          backgroundColor: badgeBg,
                          color: badgeColor,
                          border: `1px solid ${badgeBorder}`,
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          display: 'inline-block'
                        }}>
                          {poin}
                        </span>
                      );
                    })()}
                  </td>
                  <td>
                    <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                      {/* UC-06 Detail & Download Button */}
                      <button className="btn-action btn-action-detail" onClick={() => onOpenDetail(item)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        Detail
                      </button>

                      {/* UC-03 Review & Moderasi Button (Pembimbing) */}
                      {currentRole === 'pembimbing' && (
                        <button className="btn-action btn-action-review" onClick={() => onOpenReview(item)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                          </svg>
                          Review
                        </button>
                      )}

                      {/* UC-04 Mengunggah Revisi Button (Anak Magang) */}
                      {currentRole === 'anak_magang' && item.status_laporan === 'Revisi' && (
                        <button className="btn-action btn-action-revisi" onClick={() => onOpenRevisi(item)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                          </svg>
                          Revisi
                        </button>
                      )}

                      {/* UC-05 Penilaian Button (Pembimbing) */}
                      {currentRole === 'pembimbing' && (
                        <button className="btn-action btn-action-nilai" onClick={() => onOpenPenilaian(item)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Nilai
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
