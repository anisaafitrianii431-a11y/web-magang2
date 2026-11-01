import { useState } from 'react';

export default function UploadLaporanModal({ isOpen, onClose, onSubmit, isSubmitting, submitError }) {
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState('Individu');
  const [fileLaporan, setFileLaporan] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!judul.trim() || !fileLaporan) {
      alert('Mohon isi judul dan pilih berkas PDF laporan.');
      return;
    }

    const formData = new FormData();
    formData.append('judul_laporan', judul.trim());
    formData.append('kategori_laporan', kategori);
    formData.append('file_laporan', fileLaporan);

    const saved = await onSubmit(formData);

    if (!saved) return;

    setJudul('');
    setKategori('Individu');
    setFileLaporan(null);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">Mengirim Laporan Magang</h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {submitError && <p role="alert" style={{ color: '#b91c1c' }}>{submitError}</p>}
            <div className="form-group">
              <label className="form-label">Judul Laporan *</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Masukkan judul laporan magang..."
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Kategori Laporan *</label>
              <select 
                className="form-control"
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
              >
                <option value="Individu">Individu</option>
                <option value="Kelompok">Kelompok</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="file-laporan">Berkas Laporan PDF *</label>
              <input
                id="file-laporan"
                type="file"
                className="form-control"
                accept="application/pdf,.pdf"
                onChange={(e) => setFileLaporan(e.target.files?.[0] || null)}
                required
              />
              <small style={{ display: 'block', marginTop: '0.5rem', color: '#64748b' }}>
                Pilih berkas PDF, maksimal 25 MB.
              </small>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>Batal</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Kirim Laporan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
