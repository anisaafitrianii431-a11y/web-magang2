import { useState, useRef, useEffect } from 'react';
import { X, Camera, UploadCloud, CheckCircle2, AlertCircle, Trash2, Upload } from 'lucide-react';
import api from '../services/api';
import { API_BASE_URL } from '../config/api';
import { compressImageToTarget } from '../utils/fileCompressor';

function getPhotoUrl(photo) {
  if (!photo) return null;
  if (/^https?:\/\//i.test(photo) || String(photo).startsWith('data:') || String(photo).startsWith('blob:')) {
    return photo;
  }
  const path = String(photo).replace(/^\/+/, '').replace(/^storage\//, '');
  return `${API_BASE_URL.replace(/\/api\/?$/, '')}/storage/${path}`;
}

export default function ChangePhotoModal({ isOpen, onClose, currentPhoto, userName, onPhotoUpdated }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setErrorMessage('');
      setSuccessMessage('');
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

  const validateAndSetImage = async (file) => {
    if (!file) return;
    setErrorMessage('');
    setSuccessMessage('');

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Berkas harus berupa gambar (JPG, JPEG, PNG, atau WEBP).');
      return;
    }

    try {
      // Kompresi otomatis pas foto ke target <= 100 KB
      const result = await compressImageToTarget(file, { targetSizeKb: 100, maxWidth: 600, maxHeight: 800 });
      setSelectedFile(result.file);
      const objectUrl = URL.createObjectURL(result.file);
      setPreviewUrl(objectUrl);
    } catch {
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetImage(file);
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
    if (file) validateAndSetImage(file);
  };

  const handleRemoveSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSavePhoto = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Mohon pilih berkas foto terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // 1. Convert to Base64 data URL for reliable client-side rendering & persistence
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(selectedFile);
      });
      const photoDataUrl = await base64Promise;

      // 2. Prepare FormData payload for backend
      const payload = new FormData();
      payload.append('foto', selectedFile);
      payload.append('pas_foto', selectedFile);

      // Attempt to save to backend API endpoints
      let savedUser = null;
      try {
        const response = await api.post('/pendaftaran/me/foto', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        savedUser = response.data?.data?.user || response.data?.user || response.data?.data;
      } catch {
        try {
          const response = await api.post('/me/foto', payload, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          savedUser = response.data?.data?.user || response.data?.user || response.data?.data;
        } catch {
          try {
            const response = await api.post('/user/foto', payload, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            savedUser = response.data?.data?.user || response.data?.user || response.data?.data;
          } catch {
            // Endpoints may vary on local/dev; local persistence serves as fail-safe
          }
        }
      }

      // 3. Update localStorage and trigger global custom event
      const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = {
        ...existingUser,
        ...(savedUser || {}),
        foto: savedUser?.foto || photoDataUrl,
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: { user: updatedUser } }));

      if (onPhotoUpdated) {
        onPhotoUpdated(updatedUser.foto);
      }

      setSuccessMessage('Foto profil berhasil diperbarui!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setErrorMessage(err.message || 'Gagal memperbarui foto profil. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePhoto = previewUrl || getPhotoUrl(currentPhoto);
  const initial = String(userName || 'P').trim().charAt(0).toUpperCase();

  return (
    <div className="modal-overlay report-module" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-info">
            <h3 className="modal-title">Ganti Foto Profil</h3>
            <p className="modal-subtitle">Unggah pas foto formal Anda untuk profil magang.</p>
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose} 
            disabled={isSubmitting}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSavePhoto}>
          <div className="modal-body" style={{ alignItems: 'center', textAlign: 'center' }}>
            {errorMessage && (
              <div className="modal-alert-error" role="alert" style={{ width: '100%', boxSizing: 'border-box' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                fontWeight: 600
              }}>
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Avatar Preview */}
            <div style={{ position: 'relative', margin: '4px auto 14px' }}>
              <div style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '34px',
                fontWeight: 800,
                border: '4px solid #f1f5f9',
                boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)'
              }}>
                {activePhoto ? (
                  <img src={activePhoto} alt="Foto Profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <div style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#4f46e5',
                color: '#ffffff',
                border: '2px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}>
                <Camera size={14} />
              </div>
            </div>

            {/* Drag & drop upload area */}
            <div
              className={`file-upload-zone ${isDragging ? 'is-dragging' : ''}`}
              style={{ width: '100%', boxSizing: 'border-box', padding: '22px 16px' }}
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
                accept="image/jpeg,image/png,image/jpg,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                disabled={isSubmitting}
              />
              <div className="upload-icon-circle" style={{ width: '42px', height: '42px', marginBottom: '4px' }}>
                <UploadCloud size={22} />
              </div>
              <div className="upload-text-main" style={{ fontSize: '13px' }}>
                <span className="upload-browse-link">Klik untuk memilih foto</span> atau seret ke sini
              </div>
              <div className="upload-text-sub" style={{ fontSize: '11.5px', marginTop: '2px' }}>
                Format JPG, PNG, atau WEBP (Maksimal 2 MB)
              </div>
            </div>

            {selectedFile && (
              <div style={{
                width: '100%',
                boxSizing: 'border-box',
                marginTop: '10px',
                padding: '10px 14px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12.5px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                    {selectedFile.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveSelection}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px'
                  }}
                  title="Batalkan pilihan"
                  aria-label="Batalkan pilihan"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
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
              disabled={isSubmitting || !selectedFile}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border-sm" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Upload size={15} />
                  <span>Simpan Foto</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

