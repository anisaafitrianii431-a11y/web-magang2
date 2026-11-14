import React, { useEffect, useState } from 'react';
import { Users, Search, GraduationCap, Calendar, Quote, Building, MessageCircle, Heart } from 'lucide-react';

function AlumniList() {
  const [alumni, setAlumni] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadAlumni = (query = '') => {
    setLoading(true);
    fetch('http://127.0.0.1:8000/api/beranda/alumni?search=' + encodeURIComponent(query), {
      headers: { 'Accept': 'application/json' }
    })
      .then(res => res.json())
      .then(resData => {
        setAlumni(resData.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading alumni:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAlumni();
  }, []);

  const renderKesanPesan = (text) => {
    if (!text) return null;

    // Replace literal '\n' string escapes with actual newlines
    const cleanText = text.replace(/\\n/g, '\n');

    // Extract Kesan and Pesan sections
    const kesanMatch = cleanText.match(/Kesan:\s*([\s\S]*?)(?=Pesan:|$)/i);
    const pesanMatch = cleanText.match(/Pesan:\s*([\s\S]*)/i);

    const kesanContent = kesanMatch ? kesanMatch[1].trim() : '';
    const pesanContent = pesanMatch ? pesanMatch[1].trim() : '';

    if (kesanContent || pesanContent) {
      return (
        <div className="kp-container">
          {kesanContent && (
            <div className="kp-block kesan-block">
              <div className="kp-header">
                <Heart size={14} className="kp-icon kesan-icon" />
                <span className="kp-label">Kesan</span>
              </div>
              <p className="kp-text">{kesanContent}</p>
            </div>
          )}

          {pesanContent && (
            <div className="kp-block pesan-block">
              <div className="kp-header">
                <MessageCircle size={14} className="kp-icon pesan-icon" />
                <span className="kp-label">Pesan</span>
              </div>
              <p className="kp-text">{pesanContent}</p>
            </div>
          )}
        </div>
      );
    }

    // Default single quote fallback
    return (
      <div className="alumni-quote">
        <Quote size={18} className="quote-icon" />
        <p>"{cleanText}"</p>
      </div>
    );
  };

  return (
    <div className="section-container" id="alumni-magang">
      <div className="section-header">
        <div>
          <span className="section-badge">
            <Users size={14} /> Direktori Alumni Magang
          </span>
          <h2 className="section-title">Daftar Alumni Magang</h2>
          <p className="section-subtitle">Pencarian data alumni beserta pengalaman & masukan selama magang.</p>
        </div>

        <div className="search-form">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Cari nama atau instansi..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                loadAlumni(e.target.value);
              }}
            />
            {search && (
              <button
                type="button"
                className="btn-clear"
                onClick={() => {
                  setSearch('');
                  loadAlumni('');
                }}
              >
                &times;
              </button>
            )}
          </div>
        </div>
      </div>

      {loading && <p style={{ textAlign: 'center', color: '#94a3b8' }}>Memuat daftar alumni...</p>}

      {!loading && alumni.length === 0 ? (
        <div className="shadow-card text-center" style={{ padding: '40px' }}>
          <Users size={40} style={{ color: '#94a3b8', marginBottom: '12px' }} />
          <p>Belum ada data alumni yang ditemukan.</p>
        </div>
      ) : (
        <div className="alumni-grid">
          {alumni.map(item => (
            <div key={item.id} className="alumni-card shadow-card">
              <div className="alumni-card-header">
                <div className="alumni-avatar">
                  {item.nama ? item.nama.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <h4 className="alumni-name">{item.nama}</h4>
                  <div className="alumni-meta">
                    <span>
                      <Building size={14} /> {item.asal_instansi || 'Instansi / Universitas'}
                    </span>
                    {item.jurusan && (
                      <span>
                        <GraduationCap size={14} /> {item.jurusan}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {item.tahun_magang && (
                <div className="alumni-badge-year">
                  <Calendar size={13} /> {item.tahun_magang}
                </div>
              )}

              {renderKesanPesan(item.kesan_pesan)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AlumniList;
