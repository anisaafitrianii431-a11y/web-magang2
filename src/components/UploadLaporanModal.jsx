import { useState, useRef } from 'react';

export default function UploadLaporanModal({ isOpen, onClose, onSubmit, isSubmitting, submitError }) {
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState('Individu');
  const [abstrak, setAbstrak] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        alert('Mohon pilih file berformat PDF!');
        return;
      }
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        alert('Mohon pilih file berformat PDF!');
        return;
      }
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!judul || !selectedFile) {
      alert('Mohon isi Judul Laporan dan pilih berkas File Laporan PDF!');
      return;
    }

    const saved = await onSubmit({
      judul_laporan: judul,
      kategori_laporan: kategori,
      abstrak: abstrak,
      file_laporan_pdf: selectedFile
    });

    if (!saved) return;

    setJudul('');
    setAbstrak('');
    setSelectedFile(null);
    setFileName('');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">Mengunggah Laporan Magang</h3>
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
              <label className="form-label">Abstrak Laporan</label>
              <textarea 
                className="form-control" 
                placeholder="Ringkasan singkat isi laporan magang..."
                value={abstrak}
                onChange={(e) => setAbstrak(e.target.value)}
              />
            </div>

            {/* File Upload Selector Zone */}
            <div className="form-group">
              <label className="form-label">File Laporan (PDF) *</label>
              
              {/* Hidden file input supporting laptop / Android device storage */}
              <input 
                type="file" 
                ref={fileInputRef}
                accept=".pdf,application/pdf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {!selectedFile && !fileName ? (
                <div 
                  className="file-upload-zone"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <div className="upload-icon-circle">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                  </div>
                  <div className="upload-text-main">Pilih File PDF dari Perangkat (Laptop / HP)</div>
                  <div className="upload-text-sub">Klik atau seret file PDF di sini (Maks. 25 MB)</div>
                  <button type="button" className="btn-browse">
                    Browse File PDF
                  </button>
                </div>
              ) : (
                <div className="file-info-badge">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="pdf-icon-box">PDF</div>
                    <div>
                      <div className="file-name-text">{fileName || selectedFile.name}</div>
                      {selectedFile && (
                        <div className="file-size-text">{formatFileSize(selectedFile.size)}</div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      type="button" 
                      className="btn-change-file"
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    >
                      Ganti
                    </button>
                    <button 
                      type="button" 
                      className="btn-remove-file"
                      onClick={handleRemoveFile}
                    >
                      &times;
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>Batal</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Unggah Laporan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
