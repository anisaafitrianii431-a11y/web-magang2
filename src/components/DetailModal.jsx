import { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  User, 
  Users, 
  Calendar, 
  Clock, 
  Award,
  Sparkles
} from 'lucide-react';
import api from '../services/api';

function formatSubmitDate(dateString) {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';
  } catch {
    return String(dateString);
  }
}

function getDisplayFilename(filePath, defaultName = 'Laporan-Magang.pdf') {
  if (!filePath) return defaultName;
  const rawName = String(filePath).split('/').pop() || defaultName;
  if (rawName.length > 32) {
    return rawName.slice(0, 15) + '...' + rawName.slice(-12);
  }
  return rawName;
}

export default function DetailModal({ 
  isOpen, 
  onClose, 
  laporan, 
  canModerate = false, 
  showStatus = true, 
  onSubmitStatus, 
  isSavingStatus = false, 
  statusError = '' 
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  const status = String(laporan.status_laporan || 'Menunggu Review').trim();
  const isApproved = status.toLowerCase() === 'disetujui' || status.toLowerCase() === 'diterima';
  const isRevision = status.toLowerCase() === 'revisi';
  const isPending = !isApproved && !isRevision;

  const isKelompok = String(laporan.kategori_laporan || '').toLowerCase() === 'kelompok';
  const userInitial = String(laporan.nama_peserta || 'P').trim().charAt(0).toUpperCase();

  return (
    <div className="modal-overlay report-module" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '640px', 
          borderRadius: '20px', 
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid rgba(226, 232, 240, 0.9)'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Modal */}
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
              <FileText size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                Detail Laporan Magang
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                Informasi lengkap berkas dan status evaluasi laporan magang.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose}
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
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#64748b'; }}
          >
            <X size={17} />
          </button>
        </div>
        
        {/* Body Modal */}
        <div className="modal-body" style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 1. Overview Card (Badges, Judul, Author) */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
          }}>
            
            {/* Badges Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              
              {/* Category Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '11.5px',
                fontWeight: 700,
                background: isKelompok ? '#f3e8ff' : '#e0e7ff',
                color: isKelompok ? '#7e22ce' : '#4338ca',
                border: isKelompok ? '1px solid #e9d5ff' : '1px solid #c7d2fe'
              }}>
                {isKelompok ? <Users size={12} /> : <User size={12} />}
                <span>{isKelompok ? 'Laporan Kelompok' : 'Laporan Individu'}</span>
              </div>

              {/* Status Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '11.5px',
                fontWeight: 700,
                background: isApproved ? '#dcfce7' : isRevision ? '#fee2e2' : '#eff6ff',
                color: isApproved ? '#15803d' : isRevision ? '#b91c1c' : '#1d4ed8',
                border: isApproved ? '1px solid #bbf7d0' : isRevision ? '1px solid #fecaca' : '1px solid #bfdbfe'
              }}>
                {isApproved ? <CheckCircle2 size={12} /> : isRevision ? <AlertCircle size={12} /> : <Clock size={12} />}
                <span>{status}</span>
              </div>

            </div>

            {/* Title */}
            <h2 style={{
              margin: '0 0 16px 0',
              fontSize: '19px',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: '1.4',
              letterSpacing: '-0.2px'
            }}>
              {laporan.judul_laporan || 'Tanpa Judul Laporan'}
            </h2>

            {/* Metadata Bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              padding: '12px 14px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #edf2f7'
            }}>
              
              {/* Uploader */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '13px',
                  flexShrink: 0
                }}>
                  {userInitial}
                </div>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: '10.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block', letterSpacing: '0.4px' }}>
                    Pengunggah
                  </span>
                  <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {laporan.nama_peserta || 'Peserta Magang'}
                  </strong>
                </div>
              </div>

              {/* Submit Date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  color: '#4f46e5',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Calendar size={15} />
                </div>
                <div>
                  <span style={{ fontSize: '10.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block', letterSpacing: '0.4px' }}>
                    Waktu Pengiriman
                  </span>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e293b' }}>
                    {formatSubmitDate(laporan.tgl_submit)}
                  </span>
                </div>
              </div>

            </div>

          </div>

          {/* 2. Berkas PDF Lampiran Laporan */}
          {laporan.link_google_doc ? (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                <ExternalLink size={14} color="#2563eb" />
                <span>Dokumen Daring (Google Docs)</span>
              </label>
              <div style={{
                padding: '16px 18px',
                background: '#eff6ff',
                borderRadius: '14px',
                border: '1.5px solid #bfdbfe',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '14px',
                flexWrap: 'wrap'
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e3a8a' }}>Tautan Laporan Google Docs</div>
                  <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '3px', wordBreak: 'break-all' }}>{laporan.link_google_doc}</div>
                </div>
                <a
                  href={laporan.link_google_doc}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 16px',
                    background: '#2563eb',
                    color: '#ffffff',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Buka Dokumen</span>
                </a>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                  <FileText size={15} color="#4f46e5" />
                  <span>Berkas Dokumen Laporan (PDF)</span>
                </label>
                <span style={{ fontSize: '11px', color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  Format Resmi PDF
                </span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
                borderRadius: '14px',
                border: '1.5px solid #dbeafe',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.04)',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.15)',
                    border: '1px solid #fecaca'
                  }}>
                    <FileText size={20} />
                    <span style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.5px', marginTop: '1px' }}>PDF</span>
                  </div>
                  
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }} title={laporan.judul_laporan}>
                      {laporan.judul_laporan ? `${laporan.judul_laporan}.pdf` : 'Berkas Laporan Akhir.pdf'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ color: '#94a3b8' }}>ID Sistem:</span>
                      <code style={{ fontSize: '11px', background: 'rgba(255,255,255,0.9)', padding: '2px 6px', borderRadius: '4px', color: '#334155', border: '1px solid #cbd5e1' }}>
                        {getDisplayFilename(laporan.file_laporan_pdf)}
                      </code>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: isDownloading ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                    color: '#ffffff',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: isDownloading ? 'wait' : 'pointer',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.28)',
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => { if (!isDownloading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                >
                  <Download size={15} />
                  <span>{isDownloading ? 'Mengunduh...' : 'Unduh PDF'}</span>
                </button>
              </div>

              {downloadError && (
                <div style={{ marginTop: '8px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={15} />
                  <span>{downloadError}</span>
                </div>
              )}
            </div>
          )}

          {/* 3. Catatan Review Pembimbing (Jika ada catatan) */}
          {laporan.catatan_revisi && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                <AlertCircle size={15} color="#dc2626" />
                <span>Catatan Koreksi / Review Pembimbing</span>
              </label>
              <div style={{
                padding: '14px 18px',
                backgroundColor: '#fef2f2',
                borderRadius: '12px',
                border: '1.5px solid #fecaca',
                fontSize: '13.5px',
                color: '#7f1d1d',
                lineHeight: '1.5',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.05)'
              }}>
                "{laporan.catatan_revisi}"
              </div>
            </div>
          )}

          {/* 4. Nilai Akhir Pembimbing (Jika sudah dinilai) */}
          {(laporan.nilai_laporan || laporan.poin_nilai || (laporan.penilaian && laporan.penilaian.length > 0)) && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                <Award size={16} color="#059669" />
                <span>Hasil Penilaian Pembimbing</span>
              </label>
              <div style={{
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                borderRadius: '14px',
                border: '1.5px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#047857', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Predikat & Nilai Laporan
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#065f46', marginTop: '2px' }}>
                    {laporan.poin_nilai || (laporan.penilaian?.[0]?.poin_nilai) || (laporan.nilai_laporan ? `${laporan.nilai_laporan} / 100` : 'A (Sangat Baik)')}
                  </div>
                  {laporan.penilaian?.[0]?.catatan && (
                    <div style={{ fontSize: '12.5px', color: '#047857', marginTop: '4px', fontStyle: 'italic' }}>
                      Catatan: "{laporan.penilaian[0].catatan}"
                    </div>
                  )}
                </div>
                <div style={{
                  background: '#10b981',
                  color: '#ffffff',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontWeight: 800,
                  fontSize: '12.5px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)'
                }}>
                  <CheckCircle2 size={16} />
                  <span>Disetujui</span>
                </div>
              </div>
            </div>
          )}

          {/* Form Moderasi Status (Jika Pembimbing / Admin) */}
          {showStatus && canModerate && (
            <div style={{ paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '8px' }} htmlFor="laporan-status">
                Ubah Status Laporan (Aksi Pembimbing)
              </label>
              <select
                id="laporan-status"
                className="form-control"
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
              >
                <option value="">Pilih status evaluasi</option>
                <option value="Diterima">Diterima & Disetujui</option>
              </select>
              {statusError && <p role="alert" style={{ color: '#b91c1c', marginTop: '6px', fontSize: '12.5px' }}>{statusError}</p>}
            </div>
          )}

        </div>

        {/* Footer Modal */}
        <div 
          className="modal-footer"
          style={{
            padding: '16px 26px',
            borderTop: '1px solid #f1f5f9',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            style={{
              padding: '10px 22px',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
          >
            Tutup
          </button>
          
          {showStatus && canModerate && (
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveStatus}
              disabled={!selectedStatus || isSavingStatus}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '14px',
                cursor: !selectedStatus || isSavingStatus ? 'not-allowed' : 'pointer'
              }}
            >
              {isSavingStatus ? 'Menyimpan...' : 'Simpan Status'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
