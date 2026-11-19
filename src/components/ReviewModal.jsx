export default function ReviewModal({ isOpen, onClose, laporan, onSubmit, isSubmitting, submitError }) {
  if (!isOpen || !laporan) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const saved = await onSubmit(laporan.id_laporan, {
      status_laporan: 'Disetujui',
    });
    if (saved) onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">Review & Moderasi Laporan</h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {submitError && <p role="alert" style={{ color: '#b91c1c' }}>{submitError}</p>}
            <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Laporan yang Di-review:</div>
              <div style={{ fontWeight: 700, color: '#1e293b' }}>{laporan.judul_laporan}</div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.2rem' }}>
                Peserta: <b>{laporan.nama_peserta}</b> ({laporan.kategori_laporan})
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Hasil Moderasi / Review</label>
              <div className="form-control" style={{ backgroundColor: '#f8fafc' }}>
                Disetujui (Siap Dinilai)
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>Batal</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
