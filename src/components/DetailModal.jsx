import StatusBadge from './StatusBadge';

export default function DetailModal({ isOpen, onClose, laporan }) {
  if (!isOpen || !laporan) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Detail & Unduh Laporan Magang</h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          {/* Header Info */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <StatusBadge status={laporan.status_laporan} />
              <span className="badge badge-kategori">{laporan.kategori_laporan}</span>
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>{laporan.judul_laporan}</h2>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
              Diunggah oleh: <b>{laporan.nama_peserta || 'Peserta Magang'}</b> • Submit: {laporan.tgl_submit}
            </div>
          </div>

          {/* Abstrak */}
          <div className="form-group">
            <label className="form-label">Abstrak Laporan</label>
            <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.88rem', color: '#334155' }}>
              {laporan.abstrak || 'Tidak ada ringkasan abstrak.'}
            </div>
          </div>

          {/* File Download Section */}
          <div className="form-group">
            <label className="form-label">Berkas PDF Laporan</label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e40af' }}>{laporan.file_laporan_pdf}</span>
              </div>
              <a
                href={`http://127.0.0.1:8000/api/v1/laporan-magang/${laporan.id_laporan}/download`}
                download
                style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '0.45rem 0.9rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Unduh PDF
              </a>
            </div>
          </div>

          {/* Catatan Revisi jika ada */}
          {laporan.catatan_revisi && (
            <div className="form-group">
              <label className="form-label">Catatan Review Pembimbing</label>
              <div style={{ padding: '0.85rem', backgroundColor: '#fff1f2', borderRadius: '8px', border: '1px solid #fecdd3', fontSize: '0.88rem', color: '#991b1b' }}>
                {laporan.catatan_revisi}
              </div>
            </div>
          )}

          {/* Riwayat Revisi Tautan Google Doc */}
          {laporan.riwayat_revisi && laporan.riwayat_revisi.length > 0 && (
            <div className="form-group">
              <label className="form-label">Riwayat Tautan Revisi (Tabel riwayat_revisi_laporan)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {laporan.riwayat_revisi.map((rev, idx) => (
                  <div key={idx} style={{ padding: '0.65rem 0.85rem', backgroundColor: '#f5f3ff', borderRadius: '8px', border: '1px solid #ddd6fe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6d28d9' }}>Google Doc Revisi #{rev.id_revisi}</div>
                      <a href={rev.link_google_doc} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: '#4c1d95', wordBreak: 'break-all' }}>{rev.link_google_doc}</a>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#7c3aed' }}>{rev.tanggal_revisi}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Penilaian Section jika sudah dinilai */}
          {(laporan.nilai_laporan || laporan.poin_nilai || (laporan.penilaian && laporan.penilaian.length > 0)) && (
            <div className="form-group">
              <label className="form-label">Nilai Akhir (Predikat Huruf - Tabel penilaian)</label>
              <div style={{ padding: '1rem', backgroundColor: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 600 }}>Hasil Evaluasi Pembimbing</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#065f46' }}>
                    {laporan.poin_nilai || (laporan.penilaian && laporan.penilaian[0] ? laporan.penilaian[0].poin_nilai : 'A (Sangat Baik)')}
                  </div>
                  {laporan.penilaian && laporan.penilaian[0] && laporan.penilaian[0].catatan && (
                    <div style={{ fontSize: '0.82rem', color: '#047857', marginTop: '0.2rem' }}>
                      Catatan: "{laporan.penilaian[0].catatan}"
                    </div>
                  )}
                </div>
                <div style={{ background: '#10b981', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.9rem' }}>
                  Lulus / Disetujui
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
}
