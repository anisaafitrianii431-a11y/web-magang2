import React, { useState, useEffect } from 'react';
import '../landing.css';
import Navbar from '../components/landing/Navbar';
import BerandaPage from '../components/landing/BerandaPage';
import DetailAktivitas from '../components/landing/DetailAktivitas';
import LoginForm from '../components/landing/LoginForm';
import RegisterForm from '../components/landing/RegisterForm';
import Footer from '../components/landing/Footer';
import WhatsAppButton from '../components/landing/WhatsAppButton';
import { LogIn, UserPlus, Zap, ArrowLeft } from 'lucide-react';

function LandingPage() {
  const [activeSection, setActiveSection] = useState('beranda');
  const [activeTab, setActiveTab] = useState('login');
  const [selectedAktivitasId, setSelectedAktivitasId] = useState(null);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [loginNotice, setLoginNotice] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken) setToken(storedToken);
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  useEffect(() => {
    if (token && activeSection === 'auth') {
      setActiveSection('beranda');
    }
  }, [token, activeSection]);

  const handleAuthSuccess = () => {
    const freshToken = localStorage.getItem('token');
    const freshUser = localStorage.getItem('user');
    if (freshToken) setToken(freshToken);
    if (freshUser) setUser(JSON.parse(freshUser));
    setLoginNotice('');
    setActiveSection('beranda');
  };

  const handleRegisterSuccess = (email) => {
    setRegisteredEmail(email);
    setLoginNotice('Registrasi berhasil! Silakan masuk dengan akun baru Anda.');
    setActiveTab('login');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setLoginNotice('');
    setActiveSection('beranda');
  };

  const openAuthView = (tab = 'login') => {
    if (token) {
      setActiveSection('beranda');
      return;
    }
    setActiveTab(tab);
    setActiveSection('auth');
  };

  const handleSelectAktivitas = (id) => {
    setSelectedAktivitasId(id);
    setActiveSection('detail-aktivitas');
  };

  return (
    <div className="landing-page-root app-root">
      {activeSection !== 'auth' && (
        <Navbar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          user={user}
          token={token}
          onOpenAuth={() => openAuthView('login')}
          onLogout={handleLogout}
        />
      )}

      <main className={activeSection === 'auth' ? 'auth-fullscreen-container' : 'main-content'}>
        {activeSection === 'auth' ? (
          <div className="auth-view-wrapper">
            <button
              type="button"
              className="btn-back-home"
              onClick={() => setActiveSection('beranda')}
            >
              <ArrowLeft size={16} />
              <span>Kembali ke Beranda</span>
            </button>

            <div className="auth-page shadow-card">
              <div className="auth-banner">
                <div>
                  <div className="banner-brand">
                    <div className="brand-icon">
                      <Zap size={22} color="#ffffff" />
                    </div>
                    <span>PORTAL MAGANG & ALUMNI</span>
                  </div>

                  <div className="banner-content">
                    <h1 className="banner-title">
                      Selamat Datang di Portal Peserta
                    </h1>
                    <p className="banner-description">
                      Daftarkan diri Anda untuk mengakses informasi magang, direktori alumni, serta portofolio pengalaman kerja lapangan.
                    </p>
                  </div>
                </div>

                <div className="banner-footer">
                  <span>&copy; {new Date().getFullYear()} Portal Alumni Magang</span>
                  <span>Pusat Layanan Karir</span>
                </div>
              </div>

              <div className="auth-container">
                <div>
                  <div className="auth-header">
                    <h2 className="auth-title">
                      {activeTab === 'login' ? 'Masuk ke Akun Peserta' : 'Pendaftaran Akun Baru'}
                    </h2>
                    <p className="auth-subtitle">
                      {activeTab === 'login'
                        ? 'Masukkan email dan kata sandi Anda untuk melanjutkan'
                        : 'Isi formulir pendaftaran akun magang di bawah ini'}
                    </p>
                  </div>

                  <div className="auth-tabs" role="tablist">
                    <button
                      type="button"
                      className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
                      onClick={() => setActiveTab('login')}
                    >
                      <LogIn size={16} />
                      <span>Masuk</span>
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
                      onClick={() => setActiveTab('register')}
                    >
                      <UserPlus size={16} />
                      <span>Daftar</span>
                    </button>
                  </div>

                  {activeTab === 'login' ? (
                    <LoginForm
                      onSuccess={handleAuthSuccess}
                      noticeMessage={loginNotice}
                    />
                  ) : (
                    <RegisterForm onRegisterSuccess={handleRegisterSuccess} />
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeSection === 'detail-aktivitas' ? (
          <DetailAktivitas
            id={selectedAktivitasId}
            onBack={() => setActiveSection('beranda')}
            onOpenAuth={() => openAuthView('login')}
            user={user}
          />
        ) : (
          <BerandaPage
            token={token}
            user={user}
            onOpenAuth={() => openAuthView('login')}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            onSelectAktivitas={handleSelectAktivitas}
          />
        )}
      </main>

      {activeSection !== 'auth' && (
        <>
          <WhatsAppButton />
          <Footer />
        </>
      )}
    </div>
  );
}

export default LandingPage;
