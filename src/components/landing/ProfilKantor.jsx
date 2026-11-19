import React, { useEffect, useState } from 'react';
import { Target, Compass, Mail, MapPin, Phone, Globe } from 'lucide-react';

function ProfilKantor() {
  const [profil, setProfil] = useState(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/beranda/profil', {
      headers: { 'Accept': 'application/json' }
    })
      .then(res => res.json())
      .then(resData => setProfil(resData.data))
      .catch(err => console.error('Error fetching profil:', err));
  }, []);

  const renderMisi = (misiText) => {
    if (!misiText) return <p>Menyelenggarakan program pelatihan magang berbasis teknologi.</p>;

    // Format string containing "1. ... 2. ... 3. ... 4. ..." or newlines into clean array items
    const items = misiText
      .split(/(?=\d+\.\s*)/)
      .map(item => item.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);

    if (items.length > 1) {
      return (
        <ul className="misi-list">
          {items.map((item, index) => (
            <li key={index} className="misi-item">
              <span className="misi-number">{index + 1}</span>
              <span className="misi-text">{item}</span>
            </li>
          ))}
        </ul>
      );
    }

    return <p>{misiText}</p>;
  };

  return (
    <div className="section-container" id="profil-kantor">
      <div className="profil-grid">
        <div className="profil-card shadow-card">
          <h3>Tentang Perusahaan</h3>
          <p>{profil?.tentang_kantor || 'Instansi pengelola program magang & karir digital terpadu.'}</p>
          <div className="bidang-box">
            <span className="label">Bidang Usaha:</span>
            <span className="value">{profil?.bidang_usaha || 'Teknologi Informasi'}</span>
          </div>
        </div>

        <div className="profil-card shadow-card vision-mission">
          <div className="vm-item">
            <div className="vm-header">
              <Target className="vm-icon" size={20} />
              <h4>Visi</h4>
            </div>
            <p>{profil?.visi || 'Menjadi instansi terdepan dalam inovasi digital.'}</p>
          </div>

          <div className="vm-item">
            <div className="vm-header">
              <Compass className="vm-icon" size={20} />
              <h4>Misi</h4>
            </div>
            {renderMisi(profil?.misi)}
          </div>
        </div>
      </div>

      <div className="contact-strip">
        {profil?.alamat && (
          <div className="contact-item">
            <MapPin className="contact-icon" size={20} />
            <div>
              <span className="contact-label">Alamat</span>
              <span className="contact-val">{profil.alamat}</span>
            </div>
          </div>
        )}
        <div className="contact-item">
          <Mail className="contact-icon" size={20} />
          <div>
            <span className="contact-label">Email</span>
            <span className="contact-val">{profil?.email || 'info@instansi.go.id'}</span>
          </div>
        </div>
        {profil?.telepon && (
          <div className="contact-item">
            <Phone className="contact-icon" size={20} />
            <div>
              <span className="contact-label">Telepon</span>
              <span className="contact-val">{profil.telepon}</span>
            </div>
          </div>
        )}
        {profil?.website && (
          <div className="contact-item">
            <Globe className="contact-icon" size={20} />
            <div>
              <span className="contact-label">Website</span>
              <a href={profil.website} target="_blank" rel="noreferrer" className="contact-link">
                {profil.website}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilKantor;
