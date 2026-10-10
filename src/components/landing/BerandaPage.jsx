import React, { useEffect, useState } from 'react';
import ProfilKantor from './ProfilKantor';
import AlumniList from './AlumniList';
import AktivitasPage from './AktivitasPage';
import ListKomentar from './ListKomentar';
import FormKomentar from './FormKomentar';
import { ArrowRight } from 'lucide-react';

function BerandaPage({ token, user, onOpenAuth, activeSection, setActiveSection, onSelectAktivitas }) {
  const [berandaData, setBerandaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKomentar, setRefreshKomentar] = useState(0);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/beranda', {
      headers: { 'Accept': 'application/json' }
    })
      .then(res => res.json())
      .then(resData => {
        setBerandaData(resData.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching beranda:', err);
        setLoading(false);
      });
  }, []);

  const scrollToElement = (id) => {
    if (setActiveSection) {
      if (id === 'alumni-magang') setActiveSection('alumni');
      if (id === 'aktivitas-magang') setActiveSection('aktivitas');
      if (id === 'komentar-aplikasi') setActiveSection('komentar');
    }
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
        Memuat informasi portal magang...
      </div>
    );
  }

  return (
    <div className="beranda-page">
      {/* Hero Section */}
      <section className="hero-section" id="hero-section">
        <div className="hero-badge">
          <span className="pulse-dot"></span>
          <span>Program Magang & Praktik Kerja Lapangan (PKL)</span>
        </div>

        <h1 className="hero-title">
          {berandaData?.profil_kantor?.nama_perusahaan || 'Portal Alumni Magang'} <br />
          <span className="text-gradient">Wadah Pengalaman & Pengembangan Karir</span>
        </h1>

        <p className="hero-description">
          {berandaData?.profil_kantor?.deskripsi_singkat ||
            'Platform resmi informasi program magang, direktori alumni peserta, cerita pengalaman kerja lapangan, serta wadah ulasan peserta.'}
        </p>

        <div className="hero-actions">
          <button
            type="button"
            className="btn btn-primary btn-hero"
            onClick={() => scrollToElement('alumni-magang')}
          >
            <span>Lihat Alumni Magang</span>
            <ArrowRight size={20} />
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-hero"
            onClick={() => scrollToElement('aktivitas-magang')}
          >
            <span>Aktivitas Magang</span>
          </button>
        </div>
      </section>

      {/* Render ALL Sections in One Continuous Single Page */}
      <ProfilKantor />
      <AlumniList />
      <AktivitasPage onOpenAuth={onOpenAuth} onSelectAktivitas={onSelectAktivitas} />
      
      <div className="section-container" id="komentar-aplikasi">
        <div className="section-header">
          <div>
            <span className="section-badge">Pengalaman & Feedback</span>
            <h2 className="section-title">Ulasan & Kesan Peserta Magang</h2>
          </div>
        </div>
        <div className="komentar-wrapper">
          <FormKomentar
            onCommentAdded={() => setRefreshKomentar(prev => prev + 1)}
            onOpenAuth={onOpenAuth}
          />
          <ListKomentar refreshTrigger={refreshKomentar} />
        </div>
      </div>
    </div>
  );
}

export default BerandaPage;
