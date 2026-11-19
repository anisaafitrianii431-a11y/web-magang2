import React, { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  MapPin,
  User,
  MessageSquare,
  ArrowLeft,
  Clock,
  Tag,
  Video,
  Image as ImageIcon,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  Lock,
  LogIn,
  Send,
  CheckCircle2
} from 'lucide-react';
import { API_BASE_URL } from '../../config/api';
import { getStoredUser } from '../../utils/auth';

function DetailAktivitas({ id = 1, onBack, user, token, onOpenAuth }) {
  const [currentId, setCurrentId] = useState(id);
  const [data, setData] = useState(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [allActivities, setAllActivities] = useState([]);

  const activeToken = token || localStorage.getItem('token');
  const activeUser = user || getStoredUser();
  const isAuthenticated = Boolean(activeToken);

  const getInitialEmail = () => {
    if (user?.email) return user.email;
    const stored = getStoredUser();
    if (stored?.email) return stored.email;
    return localStorage.getItem('aktivitas_comment_email') || '';
  };

  const [email, setEmail] = useState(getInitialEmail);
  const [komentar, setKomentar] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    } else {
      const stored = getStoredUser();
      if (stored?.email) {
        setEmail(stored.email);
      }
    }
  }, [user]);

  useEffect(() => {
    setCurrentId(id);
  }, [id]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/aktivitas`, {
      headers: { Accept: 'application/json' },
    })
      .then((res) => res.json())
      .then((result) => {
        if (result?.data && Array.isArray(result.data)) {
          setAllActivities(result.data);
        }
      })
      .catch((err) => console.error('Error fetching all activities:', err));
  }, []);

  const fetchDetail = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/aktivitas/${currentId}`, {
      headers: { Accept: 'application/json' },
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Gagal memuat detail aktivitas.');
    }

    return result.data;
  }, [currentId]);

  useEffect(() => {
    let isCurrent = true;
    setLoading(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchDetail()
      .then((activity) => {
        if (isCurrent) {
          setData(activity);
          setError('');
          setImgFailed(false);
          setCurrentMediaIndex(0);
        }
      })
      .catch((err) => {
        console.error('Error fetching detail aktivitas:', err);
        if (isCurrent) setError(err.message || 'Gagal memuat detail aktivitas.');
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [fetchDetail]);

  const getImageUrl = (foto) => {
    if (!foto) return null;
    if (foto.startsWith('http://') || foto.startsWith('https://')) return foto;
    const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
    if (foto.startsWith('/')) return `${baseUrl}${foto}`;
    return `${baseUrl}/${foto}`;
  };

  const getVideoUrl = (video) => {
    if (!video) return null;
    if (video.startsWith('http://') || video.startsWith('https://')) return video;
    const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
    if (video.startsWith('/')) return `${baseUrl}${video}`;
    return `${baseUrl}/${video}`;
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = String(url).match(regExp);
    return (match && match[2].length === 11)
      ? `https://www.youtube.com/embed/${match[2]}?rel=0`
      : null;
  };

  const extractYouTubeFromText = (text) => {
    if (!text) return null;
    const match = String(text).match(/https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/i);
    return match ? match[0] : null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email.trim()) {
      setError('Email pengirim wajib diisi.');
      return;
    }

    if (!komentar.trim()) {
      setError('Komentar tidak boleh kosong.');
      return;
    }

    setSubmitting(true);

    try {
      const tokenToSend = activeToken || localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/aktivitas/${currentId}/komentar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(tokenToSend ? { Authorization: `Bearer ${tokenToSend}` } : {})
          },
          body: JSON.stringify({
            email: email.trim(),
            komentar: komentar.trim(),
          }),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        const validationError = result.errors
          ? Object.values(result.errors).flat().join(' ')
          : result.message;
        throw new Error(validationError || 'Komentar gagal dikirim.');
      }

      localStorage.setItem('aktivitas_comment_email', email.trim());
      setKomentar('');
      setReplyTo(null);
      setSuccessMsg('Komentar Anda berhasil dikirim!');
      setTimeout(() => setSuccessMsg(''), 4000);
      setData(await fetchDetail());
    } catch (err) {
      console.error('Error submitting komentar:', err);
      setError(err.message || 'Komentar gagal dikirim.');
    } finally {
      setSubmitting(false);
    }
  };

  const tampilkanKomentar = (items, depth = 0) => (
    items.map((item) => {
      const authorName = item.user?.name || item.user?.email || item.nama_pengguna || item.email || 'Pengguna';
      const initial = authorName.charAt(0).toUpperCase();

      return (
        <div
          key={item.id}
          className="activity-comment-thread"
          style={{ marginLeft: `${Math.min(depth, 6) * 20}px` }}
        >
          <div className="comment-item-card">
            <div className="comment-avatar">
              {initial}
            </div>
            <div className="comment-body">
              <div className="comment-header">
                <strong className="comment-author">
                  {authorName}
                </strong>
                {item.created_at && (
                  <span className="comment-date">
                    <Clock size={12} />
                    {new Date(item.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
              <p className="comment-text">{item.komentar}</p>
              <button
                type="button"
                className="activity-reply-button"
                onClick={() => {
                  setReplyTo({ id: item.id, name: authorName });
                  setKomentar((prev) => (prev.startsWith(`@${authorName} `) ? prev : `@${authorName} ${prev}`));
                  const textarea = document.getElementById('activity-comment-text');
                  if (textarea) textarea.focus();
                }}
              >
                Balas
              </button>
            </div>
          </div>
          {item.replies?.length > 0 && tampilkanKomentar(item.replies, depth + 1)}
        </div>
      );
    })
  );

  if (loading || (data && String(data.id) !== String(currentId))) {
    return (
      <div className="detail-full-page shadow-card">
        <div className="aktivitas-loading">
          <div className="spinner"></div>
          <p>Memuat detail aktivitas magang...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="detail-full-page shadow-card">
        <div className="aktivitas-error">
          <p role="alert">⚠️ {error}</p>
          {onBack && (
            <button type="button" onClick={onBack} className="btn btn-secondary">
              <ArrowLeft size={16} /> Kembali ke Beranda
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const imgUrl = getImageUrl(data.foto);
  const rawVideo = data.video || data.video_url || extractYouTubeFromText(data.deskripsi);
  const youtubeUrl = getYouTubeEmbedUrl(rawVideo);
  const directVideoUrl = rawVideo && !youtubeUrl ? getVideoUrl(rawVideo) : null;
  const hasVideo = Boolean(youtubeUrl || directVideoUrl);
  const hasPhoto = Boolean(imgUrl && !imgFailed);
  const comments = data.komentar || [];

  const mediaList = [];
  if (hasPhoto) {
    mediaList.push({
      type: 'photo',
      url: imgUrl,
      title: 'Foto Dokumentasi Kegiatan',
      badge: 'Foto Dokumentasi'
    });
  }
  if (hasVideo) {
    mediaList.push({
      type: 'video',
      url: directVideoUrl,
      youtubeUrl: youtubeUrl,
      title: 'Video Kegiatan Magang',
      badge: 'Video Kegiatan'
    });
  }

  const safeMediaIndex = Math.min(currentMediaIndex, Math.max(0, mediaList.length - 1));
  const activeMedia = mediaList[safeMediaIndex] || null;

  const currentIdx = allActivities.findIndex((a) => String(a.id) === String(currentId));
  const prevActivity = currentIdx > 0 ? allActivities[currentIdx - 1] : null;
  const nextActivity = currentIdx >= 0 && currentIdx < allActivities.length - 1 ? allActivities[currentIdx + 1] : null;

  return (
    <div className="detail-full-page shadow-card">
      <div className="detail-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        {onBack && (
          <button type="button" className="btn-back-link" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>Kembali ke Beranda dan Aktivitas</span>
          </button>
        )}

        {/* Quick Prev / Next Activity Mini Arrows in Header */}
        {allActivities.length > 1 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              disabled={!prevActivity}
              onClick={() => {
                if (prevActivity) {
                  setCurrentId(prevActivity.id);
                  setCurrentMediaIndex(0);
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: prevActivity ? '#ffffff' : '#f1f5f9',
                color: prevActivity ? '#1e293b' : '#94a3b8',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: prevActivity ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease'
              }}
              title={prevActivity ? `Sebelumnya: ${prevActivity.judul}` : 'Tidak ada aktivitas sebelumnya'}
            >
              <ChevronLeft size={15} />
              <span>Sebelumnya</span>
            </button>

            <span style={{ fontSize: '0.78rem', color: '#64748b', padding: '0 4px' }}>
              {currentIdx >= 0 ? currentIdx + 1 : 1}/{allActivities.length}
            </span>

            <button
              type="button"
              disabled={!nextActivity}
              onClick={() => {
                if (nextActivity) {
                  setCurrentId(nextActivity.id);
                  setCurrentMediaIndex(0);
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: nextActivity ? '#ffffff' : '#f1f5f9',
                color: nextActivity ? '#1e293b' : '#94a3b8',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: nextActivity ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease'
              }}
              title={nextActivity ? `Selanjutnya: ${nextActivity.judul}` : 'Tidak ada aktivitas selanjutnya'}
            >
              <span>Selanjutnya</span>
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Hero Media Container with Arrow Buttons */}
      {mediaList.length > 0 && (
        <div style={{ width: '100%', marginBottom: '10px' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              borderRadius: '20px',
              overflow: 'hidden',
              background: '#090d16',
              boxShadow: '0 12px 36px -4px rgba(15, 23, 42, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            {/* Active Media Display */}
            <div
              style={{
                minHeight: '380px',
                maxHeight: '520px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0b0f19',
                position: 'relative'
              }}
            >
              {activeMedia?.type === 'photo' ? (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    maxHeight: '500px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px'
                  }}
                >
                  <img
                    src={activeMedia.url}
                    alt={data.judul}
                    onError={() => setImgFailed(true)}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '480px',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                      transition: 'opacity 0.25s ease'
                    }}
                  />
                </div>
              ) : activeMedia?.type === 'video' ? (
                <div style={{ width: '100%', height: '100%' }}>
                  {activeMedia.youtubeUrl ? (
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                      <iframe
                        src={activeMedia.youtubeUrl}
                        title={`Video Kegiatan: ${data.judul}`}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          border: 0,
                          borderRadius: '16px'
                        }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <video
                      controls
                      src={activeMedia.url}
                      poster={hasPhoto ? imgUrl : undefined}
                      preload="metadata"
                      style={{
                        width: '100%',
                        maxHeight: '520px',
                        display: 'block',
                        background: '#000000'
                      }}
                    >
                      Peramban Anda tidak mendukung pemutar video HTML5.
                    </video>
                  )}
                </div>
              ) : null}
            </div>

            {/* Tombol Panah Kiri (Previous Media) */}
            {mediaList.length > 1 && (
              <button
                type="button"
                onClick={() => setCurrentMediaIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length)}
                aria-label="Lihat media sebelumnya"
                title="Lihat foto atau video sebelumnya"
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(15, 23, 42, 0.8)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.45)',
                  zIndex: 20,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#4f46e5';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.12)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }}
              >
                <ChevronLeft size={28} />
              </button>
            )}

            {/* Tombol Panah Kanan (Next Media) */}
            {mediaList.length > 1 && (
              <button
                type="button"
                onClick={() => setCurrentMediaIndex((prev) => (prev + 1) % mediaList.length)}
                aria-label="Lihat media berikutnya"
                title="Lihat foto atau video berikutnya"
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(15, 23, 42, 0.8)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.45)',
                  zIndex: 20,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#4f46e5';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.12)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }}
              >
                <ChevronRight size={28} />
              </button>
            )}

            {/* Badge Info Media Aktif di Pojok Kiri Atas */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                zIndex: 20
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(8px)',
                  color: '#ffffff',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }}
              >
                {activeMedia?.type === 'photo' ? (
                  <>
                    <ImageIcon size={14} style={{ color: '#38bdf8' }} />
                    <span>Foto Dokumentasi</span>
                  </>
                ) : (
                  <>
                    <Video size={14} style={{ color: '#a78bfa' }} />
                    <span>Video Kegiatan</span>
                  </>
                )}
                {mediaList.length > 1 && (
                  <span style={{ color: '#94a3b8', fontSize: '0.78rem', marginLeft: '4px' }}>
                    ({safeMediaIndex + 1}/{mediaList.length})
                  </span>
                )}
              </span>
            </div>

            {/* Indikator Tombol di Bawah Media */}
            {mediaList.length > 1 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(8px)',
                  padding: '5px 12px',
                  borderRadius: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  zIndex: 20
                }}
              >
                {mediaList.map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentMediaIndex(idx)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: safeMediaIndex === idx ? '#4f46e5' : 'transparent',
                      color: safeMediaIndex === idx ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      padding: '5px 12px',
                      borderRadius: '16px',
                      fontSize: '0.76rem',
                      fontWeight: safeMediaIndex === idx ? '700' : '500',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title={`Lihat ${m.badge}`}
                  >
                    {m.type === 'photo' ? <ImageIcon size={12} /> : <Video size={12} />}
                    <span>{m.badge}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mini Thumbnail Strip Switcher */}
          {mediaList.length > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginTop: '12px',
                padding: '6px 4px'
              }}
            >
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600' }}>
                Pilihan Media:
              </span>
              {mediaList.map((m, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentMediaIndex(idx)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    borderRadius: '12px',
                    border: safeMediaIndex === idx ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                    background: safeMediaIndex === idx ? '#eef2ff' : '#ffffff',
                    color: safeMediaIndex === idx ? '#4338ca' : '#475569',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: safeMediaIndex === idx ? '0 2px 8px rgba(79, 70, 229, 0.2)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {m.type === 'photo' ? (
                    <ImageIcon size={15} style={{ color: safeMediaIndex === idx ? '#4f46e5' : '#64748b' }} />
                  ) : (
                    <Video size={15} style={{ color: safeMediaIndex === idx ? '#4f46e5' : '#64748b' }} />
                  )}
                  <span>{m.badge}</span>
                  {safeMediaIndex === idx && (
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#4f46e5',
                      display: 'inline-block'
                    }}></span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="detail-title-section">
        {data.kategori && (
          <span className="detail-kategori-tag">
            <Tag size={13} />
            {data.kategori}
          </span>
        )}
        <h1 className="detail-page-title">{data.judul}</h1>

        <div className="detail-meta-pills">
          <span className="meta-pill author">
            <User size={15} />
            <span>Oleh: <strong>{data.user?.name || 'Admin'}</strong></span>
          </span>
          <span className="meta-pill date">
            <Calendar size={15} />
            <span>Tanggal: <strong>{data.tanggal}</strong></span>
          </span>
          {data.lokasi && (
            <span className="meta-pill location">
              <MapPin size={15} />
              <span>Lokasi: <strong>{data.lokasi}</strong></span>
            </span>
          )}
        </div>

        {/* Indikator Dokumentasi Lengkap jika terdapat Foto & Video */}
        {hasPhoto && hasVideo && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            fontSize: '0.85rem',
            color: '#475569',
            width: 'fit-content',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontWeight: 700, color: '#1e293b' }}>Dokumentasi Tersedia:</span>
            <button
              type="button"
              onClick={() => setCurrentMediaIndex(0)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: safeMediaIndex === 0 ? '#4f46e5' : '#0284c7',
                fontWeight: 700,
                textDecoration: 'underline'
              }}
            >
              <ImageIcon size={14} /> 1 Foto Dokumentasi
            </button>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <button
              type="button"
              onClick={() => setCurrentMediaIndex(1)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: safeMediaIndex === 1 ? '#4f46e5' : '#6366f1',
                fontWeight: 700,
                textDecoration: 'underline'
              }}
            >
              <Video size={14} /> 1 Video Kegiatan
            </button>
          </div>
        )}
      </div>

      <div className="detail-description-section">
        <h3>Deskripsi Aktivitas</h3>
        <p className="detail-text-content">{data.deskripsi}</p>
      </div>

      {/* Navigasi Panah ke Kegiatan Magang Lainnya (Sebelumnya / Selanjutnya) */}
      {allActivities.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          marginTop: '16px',
          marginBottom: '20px'
        }}>
          <div>
            {prevActivity ? (
              <button
                type="button"
                onClick={() => {
                  setCurrentId(prevActivity.id);
                  setCurrentMediaIndex(0);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '9px 16px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  color: '#1e293b',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4f46e5';
                  e.currentTarget.style.color = '#4f46e5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.color = '#1e293b';
                }}
                title={prevActivity.judul}
              >
                <ChevronLeft size={18} />
                <span>Kegiatan Sebelumnya</span>
              </button>
            ) : (
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                Kegiatan Pertama
              </span>
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <span style={{
              display: 'inline-block',
              fontSize: '0.82rem',
              color: '#64748b',
              fontWeight: '600',
              background: '#ffffff',
              padding: '4px 14px',
              borderRadius: '20px',
              border: '1px solid #e2e8f0'
            }}>
              Kegiatan {currentIdx >= 0 ? currentIdx + 1 : 1} dari {allActivities.length}
            </span>
          </div>

          <div>
            {nextActivity ? (
              <button
                type="button"
                onClick={() => {
                  setCurrentId(nextActivity.id);
                  setCurrentMediaIndex(0);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '9px 16px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  color: '#1e293b',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4f46e5';
                  e.currentTarget.style.color = '#4f46e5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.color = '#1e293b';
                }}
                title={nextActivity.judul}
              >
                <span>Kegiatan Selanjutnya</span>
                <ChevronRight size={18} />
              </button>
            ) : (
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                Kegiatan Terakhir
              </span>
            )}
          </div>
        </div>
      )}

      <hr className="detail-divider" />

      <div className="detail-comments-section">
        <div className="comments-title-bar">
          <MessageSquare size={22} className="icon-primary" />
          <h3>Komentar ({data.komentar_count ?? comments.length})</h3>
        </div>

        <form onSubmit={handleSubmit} className="comment-form-box">
          {activeUser?.email ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'rgba(99, 102, 241, 0.06)', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.95rem' }}>
                {(activeUser.name || activeUser.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Berkomentar sebagai akun login:</span>
                <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#1e293b' }}>
                  {activeUser.name || 'Pengguna'} <span style={{ fontWeight: '400', color: '#64748b', fontSize: '0.84rem' }}>({activeUser.email})</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="activity-comment-email">
                Email Pengirim
                <span style={{ fontSize: '0.82em', color: '#6366f1', marginLeft: '8px', fontWeight: '500' }}>
                  (Bisa langsung komentar tanpa perlu login)
                </span>
              </label>
              <input
                id="activity-comment-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nama@email.com"
                required
                autoComplete="email"
              />
            </div>
          )}

          {replyTo && (
            <div className="activity-reply-notice" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '0.85rem', color: '#1d4ed8' }}>
              <span>Membalas komentar dari <strong>{replyTo.name}</strong></span>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}
                onClick={() => setReplyTo(null)}
              >
                Batal membalas
              </button>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="activity-comment-text">Komentar</label>
            <textarea
              id="activity-comment-text"
              className="comment-textarea"
              value={komentar}
              onChange={(event) => setKomentar(event.target.value)}
              placeholder="Tuliskan komentar atau masukan Anda..."
              minLength={3}
              required
              rows={3}
            />
          </div>

          {error && (
            <p className="field-error" role="alert" style={{ color: '#ef4444', fontSize: '0.88rem', margin: 0, fontWeight: '500' }}>
              ⚠️ {error}
            </p>
          )}

          {successMsg && (
            <p style={{ color: '#10b981', fontSize: '0.88rem', margin: 0, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} /> {successMsg}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-submit-comment" disabled={submitting}>
            <Send size={16} />
            {submitting ? 'Mengirim...' : 'Kirim Komentar'}
          </button>
        </form>

        <div className="comments-list-wrapper">
          {comments.length === 0 ? (
            <p className="no-comments-text">
              Belum ada komentar pada aktivitas ini. Jadilah yang pertama memberikan masukan!
            </p>
          ) : (
            tampilkanKomentar(comments)
          )}
        </div>
      </div>
    </div>
  );
}

export default DetailAktivitas;
