import { useMemo, useState } from 'react';
import {
  FileText,
  BookOpen,
  Clock,
  AlertCircle,
  CheckCircle2,
  Search,
  X,
  RotateCcw,
  Eye,
  Edit3,
  Trash2,
  Plus,
  ExternalLink,
  FileCheck
} from 'lucide-react';

function formatSubmittedAt(value) {
  if (!value) return { date: '—', time: '' };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: String(value), time: '' };
  return {
    date: parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    time: parsed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  };
}

function getNormalizedStatus(statusStr) {
  const s = String(statusStr || '').toLowerCase().trim();
  if (s.includes('disetujui') || s.includes('selesai')) return 'Disetujui';
  if (s.includes('revisi')) return 'Revisi';
  return 'Review';
}

export default function LaporanMagangPage({ 
  laporanList = [], 
  currentRole, 
  currentUserName,
  onOpenUpload, 
  onOpenRevisi, 
  onOpenDetail, 
  onOpenFinalize,
  onDelete 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const stats = useMemo(() => {
    let total = laporanList.length;
    let review = 0;
    let revisi = 0;
    let disetujui = 0;

    laporanList.forEach((item) => {
      const status = getNormalizedStatus(item.status_laporan);
      if (status === 'Disetujui') disetujui++;
      else if (status === 'Revisi') revisi++;
      else review++;
    });

    return { total, review, revisi, disetujui };
  }, [laporanList]);

  const filteredList = useMemo(() => {
    return laporanList.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.judul_laporan || '').toLowerCase().includes(q) ||
        (item.nama_peserta || '').toLowerCase().includes(q) ||
        (item.asal_instansi || '').toLowerCase().includes(q) ||
        (item.kategori_laporan || '').toLowerCase().includes(q);

      const matchesKategori = !filterKategori || (item.kategori_laporan || 'Individu') === filterKategori;
      const status = getNormalizedStatus(item.status_laporan);
      const matchesStatus = !filterStatus || status === filterStatus;

      return matchesSearch && matchesKategori && matchesStatus;
    });
  }, [laporanList, searchQuery, filterKategori, filterStatus]);

  const isFiltered = Boolean(searchQuery || filterKategori || filterStatus);

  return (
    <div>
      {/* 1. Header Halaman Konsisten */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#6366f1', marginRight: '6px' }}></span>
            LAPORAN AKHIR MAGANG
          </div>
          <h1>Data Laporan Magang</h1>
          <p className="subtitle">
            {currentRole === 'anak_magang'
              ? 'Pantau status laporan magang, kumpulkan dokumen laporan baru, dan kirim revisi bila diminta pembimbing.'
              : 'Kelola pengajuan laporan, riwayat revisi Google Doc, moderasi review, dan penilaian akhir peserta magang.'}
          </p>
        </div>

        {currentRole === 'anak_magang' && (
          <button
            type="button"
            className="btn-primary"
            onClick={onOpenUpload}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 22px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
              color: '#ffffff',
              border: 'none',
              fontWeight: '700',
              fontSize: '13.5px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            <Plus size={17} strokeWidth={2.5} />
            <span>Kumpulkan Laporan</span>
          </button>
        )}
      </div>

      {/* 2. Metric Overview Cards Grid */}
      <div className="task-overview-grid" style={{ marginBottom: '24px' }}>
        {/* 1. Total Laporan */}
        <div
          className={`task-metric-card ${filterStatus === '' ? 'active' : ''}`}
          onClick={() => setFilterStatus('')}
          title="Tampilkan semua laporan"
          style={{ cursor: 'pointer' }}
        >
          <div className="task-metric-icon indigo">
            <BookOpen size={22} />
          </div>
          <div className="task-metric-content">
            <span className="task-metric-num">{stats.total}</span>
            <span className="task-metric-label">Total Laporan</span>
            <span className="task-metric-sub">
              {currentRole === 'anak_magang' ? 'Laporan diajukan' : 'Seluruh dokumen'}
            </span>
          </div>
        </div>

        {/* 2. Menunggu Review */}
        <div
          className={`task-metric-card ${filterStatus === 'Review' ? 'active' : ''}`}
          onClick={() => setFilterStatus(filterStatus === 'Review' ? '' : 'Review')}
          title="Filter laporan menunggu review"
          style={{ cursor: 'pointer' }}
        >
          <div className="task-metric-icon blue">
            <Clock size={22} />
          </div>
          <div className="task-metric-content">
            <span className="task-metric-num" style={{ color: '#2563eb' }}>{stats.review}</span>
            <span className="task-metric-label">Menunggu Review</span>
            <span className="task-metric-sub">
              {currentRole === 'anak_magang' ? 'Sedang diperiksa' : 'Perlu dimoderasi'}
            </span>
          </div>
        </div>

        {/* 3. Perlu Revisi */}
        <div
          className={`task-metric-card ${filterStatus === 'Revisi' ? 'active' : ''}`}
          onClick={() => setFilterStatus(filterStatus === 'Revisi' ? '' : 'Revisi')}
          title="Filter laporan yang perlu revisi"
          style={{ cursor: 'pointer' }}
        >
          <div className="task-metric-icon amber">
            <AlertCircle size={22} />
          </div>
          <div className="task-metric-content">
            <span className="task-metric-num" style={{ color: '#d97706' }}>{stats.revisi}</span>
            <span className="task-metric-label">Perlu Revisi</span>
            <span className="task-metric-sub">
              {currentRole === 'anak_magang' ? 'Kirim perbaikan link' : 'Menunggu revisi peserta'}
            </span>
          </div>
        </div>

        {/* 4. Selesai / Disetujui */}
        <div
          className={`task-metric-card ${filterStatus === 'Disetujui' ? 'active' : ''}`}
          onClick={() => setFilterStatus(filterStatus === 'Disetujui' ? '' : 'Disetujui')}
          title="Filter laporan yang telah disetujui"
          style={{ cursor: 'pointer' }}
        >
          <div className="task-metric-icon green">
            <CheckCircle2 size={22} />
          </div>
          <div className="task-metric-content">
            <span className="task-metric-num" style={{ color: '#16a34a' }}>{stats.disetujui}</span>
            <span className="task-metric-label">Disetujui / Selesai</span>
            <span className="task-metric-sub">
              {currentRole === 'anak_magang' ? 'Laporan diterima' : 'Selesai dievaluasi'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="filter-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '14px 18px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
        <div className="search-input-wrapper" style={{ flex: '1 1 260px', position: 'relative', minWidth: '220px' }}>
          <Search className="search-icon-inside" size={16} style={{ color: '#94a3b8' }} />
          <input
            type="text"
            className="search-input"
            placeholder="Cari judul laporan, nama peserta, atau instansi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              title="Hapus pencarian"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter Kategori */}
        <select
          className="filter-select"
          value={filterKategori}
          onChange={(e) => setFilterKategori(e.target.value)}
          style={{ height: '42px', minWidth: '150px' }}
        >
          <option value="">Semua Kategori</option>
          <option value="Individu">Individu</option>
          <option value="Kelompok">Kelompok</option>
        </select>

        {/* Filter Status */}
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ height: '42px', minWidth: '160px' }}
        >
          <option value="">Semua Status</option>
          <option value="Review">⏳ Menunggu Review</option>
          <option value="Revisi">📝 Perlu Revisi</option>
          <option value="Disetujui">✅ Disetujui / Selesai</option>
        </select>

        {/* Reset Filter Button */}
        {isFiltered && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFilterKategori('');
              setFilterStatus('');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '42px',
              padding: '0 14px',
              borderRadius: '10px',
              background: '#f1f5f9',
              border: '1.5px solid #cbd5e1',
              color: '#475569',
              fontSize: '12.5px',
              fontWeight: '650',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
            title="Kembalikan ke filter awal"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* 4. Modern Table Card */}
      <div className="table-card" style={{ background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)' }}>
        <div className="table-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #f1f5f9', background: '#ffffff', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 38, height: 38, borderRadius: '10px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={19} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#0f172a' }}>
                  Daftar Laporan Magang
                </h3>
                <span style={{ fontSize: '11.5px', fontWeight: 700, padding: '2px 9px', borderRadius: '9999px', background: '#eef2ff', color: '#4f46e5' }}>
                  {filteredList.length} Data
                </span>
              </div>
              {isFiltered && (
                <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                  {searchQuery && `• Pencarian: "${searchQuery}" `}
                  {filterKategori && `• Kategori: ${filterKategori} `}
                  {filterStatus && `• Status: ${filterStatus} `}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table enterprise-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                <th style={{ minWidth: '240px' }}>JUDUL LAPORAN & PESERTA</th>
                <th style={{ width: '120px' }}>KATEGORI</th>
                <th style={{ width: '150px' }}>TANGGAL SUBMIT</th>
                <th style={{ width: '150px' }}>STATUS LAPORAN</th>
                <th style={{ width: '180px', textAlign: 'right' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '0' }}>
                    <div className="empty-state-modern" style={{ textAlign: 'center', padding: '48px 20px' }}>
                      <div className="empty-state-icon-circle" style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#f1f5f9', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <FileText size={26} />
                      </div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 750, color: '#0f172a' }}>
                        Belum Ada Data Laporan
                      </h4>
                      <p style={{ margin: '0 auto 16px', fontSize: '13px', color: '#64748b', maxWidth: '380px', lineHeight: 1.5 }}>
                        {isFiltered
                          ? 'Tidak ada laporan yang sesuai dengan kriteria filter Anda saat ini.'
                          : 'Belum ada laporan magang yang dikumpulkan. Klik tombol Kumpulkan Laporan untuk menambahkan dokumen baru.'}
                      </p>
                      {isFiltered && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setFilterKategori('');
                            setFilterStatus('');
                          }}
                          className="action-btn"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}
                        >
                          <RotateCcw size={13} />
                          <span>Reset Filter</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, index) => {
                  const s = (item.status_laporan || '').toLowerCase();
                  const isApproved = s === 'disetujui' || s === 'selesai';
                  const isRevisi = s === 'revisi';
                  const statusLabel = item.status_laporan === 'Disetujui'
                    ? 'Siap Dinilai'
                    : getNormalizedStatus(item.status_laporan);
                  const isFinalPdfStatusEnabled = ['disetujui', 'selesai'].includes(s);

                  return (
                    <tr key={item.id_laporan}>
                      <td style={{ fontWeight: 650, color: '#94a3b8', textAlign: 'center' }}>{index + 1}</td>
                      <td>
                        <div className="col-title-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span className="item-main-title" style={{ fontWeight: 750, color: '#0f172a', fontSize: '13.5px' }}>
                            {item.judul_laporan}
                          </span>
                          <span className="item-subtitle" style={{ fontSize: '11.5px', color: '#64748b' }}>
                            {item.nama_peserta || currentUserName || 'Peserta Magang'} • {item.asal_instansi || 'Sekolah Tinggi Teknologi Payakumbuh'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="badge-category" style={{ fontSize: '11.5px', fontWeight: 650, padding: '3px 10px', borderRadius: '6px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>
                          {item.kategori_laporan || 'Individu'}
                        </span>
                      </td>
                      <td>
                        {(() => {
                          const submittedAt = formatSubmittedAt(item.tgl_submit);
                          return (
                            <div className="date-cell" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span className="date-main" style={{ fontWeight: 700, fontSize: '12.5px', color: '#1e293b' }}>
                                {submittedAt.date}
                              </span>
                              {submittedAt.time && (
                                <span className="date-sub" style={{ fontSize: '11px', color: '#64748b' }}>
                                  {submittedAt.time} WIB
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 11px',
                            borderRadius: '9999px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            background: isApproved ? '#ecfdf5' : isRevisi ? '#fffbeb' : '#eef2ff',
                            color: isApproved ? '#047857' : isRevisi ? '#b45309' : '#4338ca',
                            border: `1px solid ${isApproved ? '#a7f3d0' : isRevisi ? '#fde68a' : '#c7d2fe'}`,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: isApproved ? '#10b981' : isRevisi ? '#f59e0b' : '#6366f1',
                            }}
                          ></span>
                          <span>{statusLabel}</span>
                        </span>
                      </td>
                      <td>
                        <div className="table-action-group" style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {/* Detail Button */}
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() => onOpenDetail(item)}
                            title="Lihat Detail Laporan"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                          >
                            <Eye size={13} />
                            <span>Detail</span>
                          </button>

                          {/* Tombol Khusus Pembimbing Finalisasi */}
                          {currentRole === 'pembimbing' && (
                            <button
                              type="button"
                              className="action-btn"
                              onClick={() => onOpenFinalize(item)}
                              disabled={!isFinalPdfStatusEnabled}
                              title={item.status_laporan === 'Disetujui'
                                ? 'Buat atau perbarui PDF final sebelum laporan mendapat penilaian akhir.'
                                : item.status_laporan === 'Selesai'
                                  ? 'Perbarui PDF final laporan.'
                                  : 'PDF final tersedia setelah laporan disetujui.'}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}
                            >
                              <FileCheck size={13} />
                              <span>{item.status_laporan !== 'Selesai'
                                ? item.status_laporan === 'Disetujui'
                                  ? 'PDF Final (nilai dulu)'
                                  : 'PDF Final (setelah Selesai)'
                                : item.file_pdf_final
                                  ? 'Perbarui PDF Final'
                                  : 'Tanda Tangan & Stempel'}</span>
                            </button>
                          )}

                          {/* Tombol Unggah Revisi (Anak Magang) */}
                          {currentRole === 'anak_magang' && isRevisi && (
                            <button
                              type="button"
                              className="action-btn"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#b45309', borderColor: '#fde68a', background: '#fffbeb' }}
                              onClick={() => onOpenRevisi(item)}
                              title="Unggah Berkas Revisi"
                            >
                              <Edit3 size={13} />
                              <span>Revisi</span>
                            </button>
                          )}

                          {/* Delete button */}
                          <button
                            type="button"
                            className="action-btn action-btn-danger"
                            onClick={() => onDelete(item.id_laporan)}
                            title="Hapus Laporan"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                          >
                            <Trash2 size={13} />
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
