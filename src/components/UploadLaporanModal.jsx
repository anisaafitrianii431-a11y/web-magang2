import { useState } from 'react';

export default function UploadLaporanModal({ isOpen, onClose, onSubmit, isSubmitting, submitError }) {
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState('Individu');
  const [linkGoogleDoc, setLinkGoogleDoc] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    let parsedLink;
    try {
      parsedLink = new URL(linkGoogleDoc);
    } catch {
      alert('Masukkan tautan Google Docs yang valid.');
      return;
    }

    if (!judul || parsedLink.hostname !== 'docs.google.com') {
      alert('Mohon isi judul dan gunakan tautan dari docs.google.com.');
      return;
    }

    const saved = await onSubmit({
      judul_laporan: judul,
      kategori_laporan: kategori,
      link_google_doc: linkGoogleDoc.trim()
    });

    if (!saved) return;

    setJudul('');
    setLinkGoogleDoc('');
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
              <label className="form-label" htmlFor="link-google-doc">Link Google Docs *</label>
              <input
                id="link-google-doc"
                type="url"
                className="form-control"
                placeholder="https://docs.google.com/document/d/..."
                value={linkGoogleDoc}
                onChange={(e) => setLinkGoogleDoc(e.target.value)}
                required
              />
              <small style={{ display: 'block', marginTop: '0.5rem', color: '#64748b' }}>
                Pastikan akses dokumen Google Docs sudah dibagikan kepada pembimbing.
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
