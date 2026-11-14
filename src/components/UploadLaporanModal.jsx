import { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, X, Trash2, CheckCircle2, AlertCircle, Upload, User, Users } from 'lucide-react';

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export default function UploadLaporanModal({ isOpen, onClose, onSubmit, isSubmitting, submitError }) {
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState('Individu');
  const [fileLaporan, setFileLaporan] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setJudul('');
      setKategori('Individu');
      setFileLaporan(null);
      setValidationError('');
      setIsDragging(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const validateAndSetFile = (file) => {
    if (!file) return;
    setValidationError('');

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setValidationError('Berkas harus berupa dokumen format PDF (.pdf).');
      return;
    }

    const maxSize = 25 * 1024 * 1024; // 25 MB
    if (file.size > maxSize) {
      setValidationError('Ukuran berkas melebihi batas maksimal 25 MB.');
      return;
    }

    setFileLaporan(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setFileLaporan(null);
    setValidationError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!judul.trim()) {
      setValidationError('Mohon masukkan judul laporan magang.');
      return;
    }

    if (!fileLaporan) {
      setValidationError('Mohon pilih atau unggah berkas PDF laporan magang.');
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
    setValidationError('');
    onClose();
  };

  return (
    <div className="modal-overlay report-module" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div 
          className="modal-header"
          style={{
            padding: '22px 26px',
            borderBottom: '1px solid #f1f5f9',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
              flexShrink: 0
            }}>
              <UploadCloud size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                Tambah Laporan Baru
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                Unggah berkas laporan akhir magang Anda dalam format PDF.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose} 
            disabled={isSubmitting}
            aria-label="Tutup"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { if (!isSubmitting) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#64748b'; }}
          >
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {(submitError || validationError) && (
              <div className="modal-alert-error" role="alert">
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{validationError || submitError}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="judul-laporan">
                Judul Laporan <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input 
                id="judul-laporan"
                type="text" 
                className="form-control" 
                placeholder="Contoh: Laporan Akhir Magang - Pengembangan Frontend Aplikasi Web"
                value={judul}
                onChange={(e) => {
                  setJudul(e.target.value);
                  if (validationError) setValidationError('');
                }}
                disabled={isSubmitting}
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Kategori Laporan <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="category-toggle-container">
                <button
                  type="button"
                  className={`category-toggle-btn ${kategori === 'Individu' ? 'active' : ''}`}
                  onClick={() => setKategori('Individu')}
                  disabled={isSubmitting}
                >
                  <User size={16} />
                  <span>Individu</span>
                </button>
                <button
                  type="button"
                  className={`category-toggle-btn ${kategori === 'Kelompok' ? 'active' : ''}`}
                  onClick={() => setKategori('Kelompok')}
                  disabled={isSubmitting}
                >
                  <Users size={16} />
                  <span>Kelompok</span>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Berkas Laporan PDF <span style={{ color: '#ef4444' }}>*</span>
              </label>

              {!fileLaporan ? (
                <div
                  className={`file-upload-zone ${isDragging ? 'is-dragging' : ''}`}
                  onClick={() => !isSubmitting && fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !isSubmitting) {
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    style={{ display: 'none' }}
                    onChange={handleFileInputChange}
                    disabled={isSubmitting}
                  />
                  <div className="upload-icon-circle">
                    <UploadCloud size={24} />
                  </div>
                  <div className="upload-text-main">
                    <span className="upload-browse-link">Klik untuk memilih berkas</span> atau seret PDF ke sini
                  </div>
                  <div className="upload-text-sub">
                    Mendukung dokumen PDF (Maksimal 25 MB)
                  </div>
                </div>
              ) : (
                <div className="file-info-badge">
                  <div className="file-info-left">
                    <div className="pdf-icon-box">
                      <FileText size={20} />
                      <span>PDF</span>
                    </div>
                    <div className="file-details">
                      <div className="file-name-text" title={fileLaporan.name}>
                        {fileLaporan.name}
                      </div>
                      <div className="file-meta">
                        <span className="file-size-text">{formatFileSize(fileLaporan.size)}</span>
                        <span className="file-status-tag">
                          <CheckCircle2 size={13} />
                          Siap diunggah
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="file-info-actions">
                    <button
                      type="button"
                      className="btn-change-file"
                      onClick={() => !isSubmitting && fileInputRef.current?.click()}
                      disabled={isSubmitting}
                    >
                      Ganti
                    </button>
                    <button
                      type="button"
                      className="btn-remove-file"
                      onClick={handleRemoveFile}
                      disabled={isSubmitting}
                      title="Hapus berkas"
                      aria-label="Hapus berkas"
                    >
                      <Trash2 size={16} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      style={{ display: 'none' }}
                      onChange={handleFileInputChange}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onClose} 
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isSubmitting || !judul.trim() || !fileLaporan}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border-sm" />
                  <span>Mengirim Laporan...</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>Kirim Laporan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
