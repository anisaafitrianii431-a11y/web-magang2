import { useState } from 'react';
import api from '../services/api';
import StatusBadge from './StatusBadge';

export default function DetailModal({ isOpen, onClose, laporan, canModerate = false, onSubmitStatus, isSavingStatus = false, statusError = '' }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  if (!isOpen || !laporan) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError('');

    try {
      const response = await api.get(`/v1/laporan-magang/${laporan.id_laporan}/download`, {
        responseType: 'blob',
      });
      const fileUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = laporan.file_laporan_pdf?.split('/').pop() || `laporan-${laporan.id_laporan}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(fileUrl);
    } catch (error) {
      setDownloadError(error.response?.data?.message || 'PDF laporan gagal diunduh.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!selectedStatus || !onSubmitStatus) return;
    const saved = await onSubmitStatus(laporan.id_laporan, 'Disetujui');
    if (saved) setSelectedStatus('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Detail Laporan Magang</h3>
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

          {laporan.link_google_doc ? (
            <div className="form-group">
              <label className="form-label">Link Laporan Google Docs</label>
              <a
                href={laporan.link_google_doc}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', padding: '0.85rem 1rem', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe', color: '#1d4ed8', wordBreak: 'break-all' }}
              >
                Buka laporan di Google Docs
              </a>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Berkas PDF Laporan</label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e40af' }}>{laporan.file_laporan_pdf}</span>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '0.45rem 0.9rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  {isDownloading ? 'Mengunduh...' : 'Unduh PDF'}
                </button>
              </div>
              {downloadError && <p role="alert" style={{ color: '#b91c1c', marginTop: '0.5rem' }}>{downloadError}</p>}
            </div>
          )}

          {canModerate && (
            <div className="form-group">
              <label className="form-label" htmlFor="laporan-status">Status Laporan</label>
              <select
                id="laporan-status"
                className="form-control"
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
              >
                <option value="">Pilih status</option>
                <option value="Diterima">Diterima</option>
              </select>
              {statusError && <p role="alert" style={{ color: '#b91c1c', marginTop: '0.5rem' }}>{statusError}</p>}
            </div>
          )}

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
          {canModerate && (
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveStatus}
              disabled={!selectedStatus || isSavingStatus}
            >
              {isSavingStatus ? 'Menyimpan...' : 'Simpan'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
