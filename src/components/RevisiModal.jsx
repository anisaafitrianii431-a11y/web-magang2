import { useState, useEffect } from 'react';
import { X, Send, AlertCircle, FileEdit, Link2 } from 'lucide-react';

export default function RevisiModal({ isOpen, onClose, laporan, onSubmit, isSubmitting, submitError }) {
  const [linkDoc, setLinkDoc] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setLinkDoc('');
      setValidationError('');
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

  if (!isOpen || !laporan) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    const trimmedLink = linkDoc.trim();
    if (!trimmedLink) {
      setValidationError('Mohon masukkan tautan Google Docs revisi.');
      return;
    }

    if (!/^https?:\/\//i.test(trimmedLink)) {
      setValidationError('Tautan harus diawali dengan http:// atau https://');
      return;
    }

    const saved = await onSubmit(laporan.id_laporan, {
      link_google_doc: trimmedLink,
    });

    if (!saved) return;

    setLinkDoc('');
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
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(217, 119, 6, 0.3)',
              flexShrink: 0
            }}>
              <FileEdit size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                Revisi Laporan Magang
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                Kirimkan tautan Google Docs berkas yang telah diperbaiki.
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

            <div style={{
              padding: '14px 16px',
              backgroundColor: '#fff1f2',
              borderRadius: '12px',
              border: '1px solid #fecdd3',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#be123c', fontWeight: 700 }}>
                <FileEdit size={15} />
                <span>Catatan Revisi dari Pembimbing:</span>
              </div>
              <div style={{ fontSize: '13.5px', color: '#881337', lineHeight: 1.5 }}>
                {laporan.catatan_revisi || 'Belum ada catatan detail khusus dari pembimbing.'}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="link-gdoc">
                Tautan Google Docs Berkas Revisi <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  id="link-gdoc"
                  type="url" 
                  className="form-control" 
                  placeholder="https://docs.google.com/document/d/..."
                  value={linkDoc}
                  onChange={(e) => {
                    setLinkDoc(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  disabled={isSubmitting}
                  required 
                />
              </div>
              <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Pastikan akses dokumen Google Docs sudah diatur ke <b>"Anyone with the link can view / comment"</b> agar dapat diperiksa oleh pembimbing.
              </span>
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
              disabled={isSubmitting || !linkDoc.trim()}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border-sm" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Kirim Revisi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
