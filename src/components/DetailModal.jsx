import { useEffect, useState } from 'react';
import { X, ExternalLink, Download, FileText, CheckCircle2, AlertCircle, Clock, Calendar, User } from 'lucide-react';
import api from '../services/api';
import StatusBadge from './StatusBadge';

export default function DetailModal({ isOpen, onClose, laporan, canModerate = false, showStatus = true, onSubmitStatus, isSavingStatus = false, statusError = '' }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(laporan?.status_laporan || 'Menunggu Review');

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

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
      link.download = laporan.file_pdf_final?.split('/').pop()
        || laporan.file_laporan_pdf?.split('/').pop()
        || `laporan-${laporan.id_laporan}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 30000);
    } catch (error) {
      setDownloadError(error.response?.data?.message || 'PDF laporan gagal diunduh.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreviewFinal = async () => {
    setIsPreviewing(true);
    setDownloadError('');

    try {
      const response = await api.get(`/v1/laporan-magang/${laporan.id_laporan}/download`, {
        responseType: 'blob',
      });
      setPreviewUrl(URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' })));
    } catch (error) {
      setDownloadError(error.response?.data?.message || 'PDF final gagal dimuat.');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!selectedStatus || !onSubmitStatus) return;
    await onSubmitStatus(laporan.id_laporan, selectedStatus);
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0',
          animation: 'fadeInModal 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff'
          }}
        >
          <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#0f172a' }}>
            Detail Laporan Magang
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}
            title="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px' }}>
          {/* Header Info */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px', background: '#eef2ff', color: '#4f46e5' }}>
                {laporan.kategori_laporan || 'Individu'}
              </span>
              {showStatus && <StatusBadge status={laporan.status_laporan} />}
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', lineHeight: 1.35 }}>
              {laporan.judul_laporan}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
              <User size={13} color="#94a3b8" />
              <span>{laporan.nama_peserta || 'Peserta Magang'}</span>
              <span>•</span>
              <Calendar size={13} color="#94a3b8" />
              <span>Submit: {laporan.tgl_submit || '—'}</span>
            </div>
          </div>

          {/* Dokumen & Google Docs Box */}
          <div style={{ background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '18px' }}>
            <span style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', letterSpacing: '0.5px', marginBottom: '10px' }}>
              DOKUMEN & TAUTAN LAPORAN:
            </span>

            {laporan.link_google_doc ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <a
                  href={laporan.link_google_doc}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: '#eff6ff',
                    borderRadius: '10px',
                    border: '1.5px solid #bfdbfe',
                    color: '#1d4ed8',
                    textDecoration: 'none',
                    fontWeight: 650,
                    fontSize: '13px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <FileText size={16} color="#2563eb" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Buka Dokumen di Google Docs</span>
                  </div>
                  <ExternalLink size={15} style={{ flexShrink: 0 }} />
                </a>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Tautan berkas Google Docs yang terhubung untuk proses telaah dan catatan review dari pembimbing.
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1.5px solid #bfdbfe' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={16} color="#2563eb" />
                  <span style={{ fontSize: '13px', fontWeight: 650, color: '#1e40af' }}>{laporan.file_laporan_pdf || 'Dokumen Laporan'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <Download size={13} />
                  <span>{isDownloading ? 'Mengunduh...' : 'Unduh'}</span>
                </button>
              </div>
            )}
          </div>

          {/* PDF Final jika ada */}
          {laporan.file_pdf_final && (
            <div style={{ background: '#f0fdf4', borderRadius: '14px', border: '1px solid #bbf7d0', padding: '16px', marginBottom: '18px' }}>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#166534', letterSpacing: '0.5px', marginBottom: '8px' }}>
                PDF FINAL BERTANDA TANGAN & STEMPEL:
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handlePreviewFinal}
                  disabled={isPreviewing}
                  style={{ padding: '7px 14px', borderRadius: '8px', background: '#ffffff', border: '1.5px solid #86efac', color: '#15803d', fontSize: '12px', fontWeight: 650, cursor: 'pointer' }}
                >
                  {isPreviewing ? 'Memuat...' : 'Pratinjau PDF'}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '8px', background: '#16a34a', border: 'none', color: '#ffffff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Download size={13} />
                  <span>{isDownloading ? 'Mengunduh...' : 'Unduh PDF Final'}</span>
                </button>
              </div>
              {previewUrl && (
                <iframe
                  title="Pratinjau PDF final laporan"
                  src={previewUrl}
                  style={{ width: '100%', height: '360px', border: '1px solid #cbd5e1', borderRadius: '10px', marginTop: '12px' }}
                />
              )}
              {downloadError && <p role="alert" style={{ color: '#b91c1c', fontSize: '12px', marginTop: '6px' }}>{downloadError}</p>}
            </div>
          )}

          {/* Catatan Revisi dari Pembimbing */}
          {laporan.catatan_revisi && (
            <div style={{ background: '#fff1f2', borderRadius: '14px', border: '1px solid #fecdd3', padding: '16px', marginBottom: '18px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, color: '#991b1b', letterSpacing: '0.5px', marginBottom: '6px' }}>
                <AlertCircle size={14} color="#e11d48" />
                <span>CATATAN REVIEW PEMBIMBING:</span>
              </span>
              <p style={{ margin: 0, fontSize: '13px', color: '#9f1239', lineHeight: 1.5 }}>
                {laporan.catatan_revisi}
              </p>
            </div>
          )}

          {/* Riwayat Revisi */}
          {laporan.riwayat_revisi && laporan.riwayat_revisi.length > 0 && (
            <div style={{ background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '18px' }}>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', letterSpacing: '0.5px', marginBottom: '10px' }}>
                RIWAYAT TAUTAN REVISI:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {laporan.riwayat_revisi.map((rev, idx) => (
                  <div key={idx} style={{ padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#4f46e5' }}>Revisi #{rev.id_revisi || idx + 1}</div>
                      <a href={rev.link_google_doc} target="_blank" rel="noreferrer" style={{ fontSize: '11.5px', color: '#2563eb', wordBreak: 'break-all' }}>
                        {rev.link_google_doc}
                      </a>
                    </div>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{rev.tanggal_revisi}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Penilaian Section jika sudah dinilai */}
          {(laporan.nilai_laporan || laporan.poin_nilai || (laporan.penilaian && laporan.penilaian.length > 0)) && (
            <div style={{ background: '#ecfdf5', borderRadius: '14px', border: '1px solid #a7f3d0', padding: '16px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#047857', letterSpacing: '0.5px' }}>
                    HASIL EVALUASI PEMBIMBING:
                  </span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#065f46', marginTop: '4px' }}>
                    {laporan.poin_nilai || (laporan.penilaian && laporan.penilaian[0] ? laporan.penilaian[0].poin_nilai : 'A (Sangat Baik)')}
                  </div>
                  {laporan.penilaian && laporan.penilaian[0]?.catatan && (
                    <div style={{ fontSize: '12px', color: '#047857', marginTop: '4px' }}>
                      Catatan: "{laporan.penilaian[0].catatan}"
                    </div>
                  )}
                </div>
                <span style={{ background: '#10b981', color: '#ffffff', padding: '5px 12px', borderRadius: '9999px', fontWeight: 700, fontSize: '11.5px' }}>
                  Lulus / Disetujui
                </span>
              </div>
            </div>
          )}

          {/* Moderasi Pembimbing */}
          {showStatus && canModerate && (
            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1.5px solid #cbd5e1', padding: '16px' }}>
              <label htmlFor="laporan-status" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Ubah Status Laporan
              </label>
              <select
                id="laporan-status"
                className="form-control"
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1.5px solid #cbd5e1', padding: '0 12px', fontSize: '13px' }}
              >
                <option value="Menunggu Review">Review</option>
                <option value="Disetujui">Selesai</option>
                {laporan.status_laporan === 'Revisi' && <option value="Revisi">Revisi</option>}
              </select>
              {statusError && <p role="alert" style={{ color: '#b91c1c', fontSize: '12px', marginTop: '6px' }}>{statusError}</p>}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #f1f5f9',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 20px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 650,
              cursor: 'pointer'
            }}
          >
            Tutup
          </button>
          {showStatus && canModerate && (
            <button
              type="button"
              onClick={handleSaveStatus}
              disabled={!selectedStatus || isSavingStatus}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: !selectedStatus || isSavingStatus ? 'not-allowed' : 'pointer'
              }}
            >
              {isSavingStatus ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
