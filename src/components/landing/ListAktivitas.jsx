import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, User, MessageSquare, ArrowRight, Activity, Search } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';

function AktivitasCard({ item, onSelectAktivitas }) {
  const [imgFailed, setImgFailed] = useState(false);

  const getImageUrl = (foto) => {
    if (!foto) return null;
    if (foto.startsWith('http://') || foto.startsWith('https://')) return foto;
    const baseUrl = (API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/api\/?$/, '');
    if (foto.startsWith('/')) return `${baseUrl}${foto}`;
    return `${baseUrl}/${foto}`;
  };

  const imgUrl = getImageUrl(item.foto);

  return (
    <div className="aktivitas-card shadow-card">
      {imgUrl && !imgFailed && (
        <div className="aktivitas-card-img">
          <img
            src={imgUrl}
            alt={item.judul}
            onError={() => setImgFailed(true)}
          />
        </div>
      )}
      <div className="aktivitas-card-content">
        <div className="aktivitas-meta-row">
          <span className="aktivitas-author">
            <User size={14} />
            {item.user?.name || 'Admin / Peserta'}
          </span>
          <span className="aktivitas-date">
            <Calendar size={14} />
            {item.tanggal}
          </span>
        </div>

        <h3 className="aktivitas-card-title">{item.judul}</h3>

        {item.lokasi && (
          <p className="aktivitas-location">
            <MapPin size={14} />
            {item.lokasi}
          </p>
        )}

        <p className="aktivitas-card-desc">
          {item.deskripsi?.length > 120
            ? `${item.deskripsi.substring(0, 120)}...`
            : item.deskripsi}
        </p>

        <div className="aktivitas-card-footer">
          <button
            type="button"
            className="komentar-badge-btn"
            onClick={() => onSelectAktivitas && onSelectAktivitas(item.id)}
            title="Lihat Komentar & Detail"
          >
            <MessageSquare size={15} />
            <span>{item.komentar_count ?? item.komentar?.length ?? 0} Komentar</span>
          </button>

          <button
            type="button"
            className="btn-detail-link"
            onClick={() => onSelectAktivitas && onSelectAktivitas(item.id)}
          >
            <span>Detail</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ListAktivitas({ onSelectAktivitas }) {
  const [aktivitas, setAktivitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL || 'http://127.0.0.1:8000/api'}/aktivitas`, {
      headers: { 'Accept': 'application/json' }
    })
      .then(res => {
        if (!res.ok) throw new Error('Gagal mengambil data aktivitas');
        return res.json();
      })
      .then(result => {
        setAktivitas(result.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching aktivitas:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filteredAktivitas = aktivitas.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      item.judul?.toLowerCase().includes(q) ||
      item.deskripsi?.toLowerCase().includes(q) ||
      item.user?.name?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="aktivitas-loading">
        <div className="spinner"></div>
        <p>Memuat daftar aktivitas magang...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="aktivitas-error shadow-card">
        <p>⚠️ {error}</p>
        <button onClick={() => window.location.reload()} className="btn btn-secondary">
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="list-aktivitas-wrapper">
      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Cari aktivitas, judul, atau nama peserta..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="btn-clear" onClick={() => setSearchQuery('')}>
              &times;
            </button>
          )}
        </div>
      </div>

      {filteredAktivitas.length === 0 ? (
        <div className="empty-state shadow-card">
          <Activity size={48} className="empty-icon" />
          <h3>Belum Ada Aktivitas</h3>
          <p>Aktivitas magang tidak ditemukan atau belum ada data yang diunggah.</p>
        </div>
      ) : (
        <div className="aktivitas-grid">
          {filteredAktivitas.map(item => (
            <AktivitasCard
              key={item.id}
              item={item}
              onSelectAktivitas={onSelectAktivitas}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ListAktivitas;
