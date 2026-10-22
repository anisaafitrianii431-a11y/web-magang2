import { useState } from 'react';
import api from '../services/api';

export default function PenilaianAkhirPdfModal({ participant, onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  if (!participant) return null;

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Pilih file PDF penilaian akhir terlebih dahulu.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setIsSaving(true);
    setError('');

    try {
      await api.post(`/v1/penilaian/peserta/${participant.user_id}/pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(participant.user_id);
      onClose();
    } catch (uploadError) {
      const validationErrors = uploadError.response?.data?.errors;
      setError(validationErrors
        ? Object.values(validationErrors).flat().join(' ')
        : uploadError.response?.data?.message || 'PDF penilaian akhir gagal diunggah.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setError('');
    try {
      const response = await api.get(`/v1/penilaian/peserta/${participant.user_id}/pdf`, {
        responseType: 'blob',
      });
      const fileUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `penilaian-akhir-${participant.user_id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(fileUrl);
    } catch (downloadError) {
      setError(downloadError.response?.data?.message || 'PDF penilaian akhir gagal diunduh.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Penilaian Akhir Pemagang</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} disabled={isSaving}>
            &times;
          </button>
        </div>

        <form onSubmit={handleUpload}>
          <div className="modal-body">
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                {participant.nama_peserta}
              </h2>
              <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.25rem' }}>
                {participant.asal_instansi || participant.email}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="penilaian-akhir-pdf">
                Tambahkan Penilaian Akhir PDF
              </label>
              {participant.has_penilaian_akhir_pdf && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleDownload}
                  disabled={isDownloading || isSaving}
                  style={{ display: 'block', marginBottom: '0.75rem' }}
                >
                  {isDownloading ? 'Mengunduh...' : 'Unduh PDF saat ini'}
                </button>
              )}
              <input
                id="penilaian-akhir-pdf"
                type="file"
                accept=".pdf,application/pdf"
                className="form-control"
                onChange={(event) => {
                  setFile(event.target.files?.[0] || null);
                  setError('');
                }}
                required={!participant.has_penilaian_akhir_pdf}
              />
              <small style={{ display: 'block', marginTop: '0.5rem', color: '#64748b' }}>
                Format PDF, ukuran maksimal 25 MB.
                {participant.has_penilaian_akhir_pdf && ' Mengunggah file baru akan mengganti PDF sebelumnya.'}
              </small>
            </div>

            {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
              Tutup
            </button>
            <button type="submit" className="btn-primary" disabled={!file || isSaving}>
              {isSaving ? 'Menyimpan...' : 'Simpan PDF'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
