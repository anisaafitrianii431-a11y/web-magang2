import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, MapPin, User, MessageSquare, ArrowLeft, Clock, Tag } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';

function DetailAktivitas({ id = 1, onBack, user }) {
  const [data, setData] = useState(null);

  const getInitialIdentity = () => {
    if (user?.email) {
      return user.email;
    }
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed?.email) {
          return parsed.email;
        }
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }
    return localStorage.getItem('aktivitas_comment_email') || '';
  };

  const [email, setEmail] = useState(getInitialIdentity);
  const [komentar, setKomentar] = useState('');
  const [parentId, setParentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    } else {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed?.email) {
            setEmail(parsed.email);
          }
        } catch (e) {
          console.error('Error reading user from localStorage:', e);
        }
      }
    }
  }, [user]);

  const fetchDetail = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/aktivitas/${id}`, {
      headers: { Accept: 'application/json' },
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Gagal memuat detail aktivitas.');
    }

    return result.data;
  }, [id]);

  useEffect(() => {
    let isCurrent = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchDetail()
      .then((activity) => {
        if (isCurrent) {
          setData(activity);
          setError('');
          setImgFailed(false);
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/aktivitas/${id}/komentar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            email,
            komentar,
            parent_id: parentId,
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

      localStorage.setItem('aktivitas_comment_email', email);
      setKomentar('');
      setParentId(null);
      setData(await fetchDetail());
    } catch (err) {
      console.error('Error submitting komentar:', err);
      setError(err.message || 'Komentar gagal dikirim.');
    } finally {
      setSubmitting(false);
    }
  };

  const tampilkanKomentar = (items, depth = 0) => (
    items.map((item) => (
      <div
        key={item.id}
        className="activity-comment-thread"
        style={{ marginLeft: `${Math.min(depth, 6) * 20}px` }}
      >
        <div className="comment-item-card">
          <div className="comment-avatar">
            {(item.nama_pengguna || item.email || item.user?.email || 'E')
              .charAt(0)
              .toUpperCase()}
          </div>
          <div className="comment-body">
            <div className="comment-header">
              <strong className="comment-author">
                {item.nama_pengguna || item.email || item.user?.email || 'Email tidak tersedia'}
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
              onClick={() => setParentId(item.id)}
            >
              Balas
            </button>
          </div>
        </div>
        {item.replies?.length > 0 && tampilkanKomentar(item.replies, depth + 1)}
      </div>
    ))
  );

  if (loading || (data && String(data.id) !== String(id))) {
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
  const comments = data.komentar || [];

  return (
    <div className="detail-full-page shadow-card">
      <div className="detail-page-header">
        {onBack && (
          <button type="button" className="btn-back-link" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>Kembali ke Beranda & Aktivitas</span>
          </button>
        )}
      </div>

      {imgUrl && !imgFailed && (
        <div className="detail-full-hero-img">
          <img src={imgUrl} alt={data.judul} onError={() => setImgFailed(true)} />
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
      </div>

      <div className="detail-description-section">
        <h3>Deskripsi Aktivitas</h3>
        <p className="detail-text-content">{data.deskripsi}</p>
      </div>

      <hr className="detail-divider" />

      <div className="detail-comments-section">
        <div className="comments-title-bar">
          <MessageSquare size={22} className="icon-primary" />
          <h3>Komentar ({data.komentar_count ?? comments.length})</h3>
        </div>

        <form onSubmit={handleSubmit} className="comment-form-box">
          {parentId && (
            <div className="activity-reply-notice">
              Membalas komentar #{parentId}
              <button type="button" onClick={() => setParentId(null)}>
                Batal membalas
              </button>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="activity-comment-email">
              Email Pengirim
              {(user?.name || user?.email) && (
                <span style={{ fontSize: '0.82em', color: '#10b981', marginLeft: '8px', fontWeight: '500' }}>
                  (Terisi otomatis dari akun: {user.name})
                </span>
              )}
            </label>
            <input
              id="activity-comment-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="contoh@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="activity-comment-text">Komentar</label>
            <textarea
              id="activity-comment-text"
              className="comment-textarea"
              value={komentar}
              onChange={(event) => setKomentar(event.target.value)}
              minLength={3}
              required
              rows={3}
            />
          </div>

          {error && <p className="field-error" role="alert">{error}</p>}

          <button type="submit" className="btn btn-primary btn-submit-comment" disabled={submitting}>
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
