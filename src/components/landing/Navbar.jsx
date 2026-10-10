import React from 'react';
import { GraduationCap, LogIn, UserCheck, LogOut, Home, Building2, Users, Activity, MessageSquare, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';

function Navbar({ activeSection, setActiveSection, user, token, onOpenAuth, onLogout }) {
  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    if (sectionId === 'auth') return;
    
    const idMap = {
      beranda: 'hero-section',
      profil: 'profil-kantor',
      alumni: 'alumni-magang',
      aktivitas: 'aktivitas-magang',
      komentar: 'komentar-aplikasi'
    };

    const targetId = idMap[sectionId] || sectionId;
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className="main-navbar">
      <div className="nav-container">
        <div className="nav-brand" onClick={() => scrollToSection('beranda')} style={{ cursor: 'pointer' }}>
          <div className="brand-logo">
            <GraduationCap size={22} color="#ffffff" />
          </div>
          <div className="brand-text">
            <span className="brand-title">PORTAL MAGANG</span>
            <span className="brand-sub">& ALUMNI</span>
          </div>
        </div>

        <div className="nav-links">
          <button
            type="button"
            className={`nav-item ${activeSection === 'beranda' ? 'active' : ''}`}
            onClick={() => scrollToSection('beranda')}
          >
            <Home size={16} />
            <span>Beranda</span>
          </button>
          <button
            type="button"
            className={`nav-item ${activeSection === 'profil' ? 'active' : ''}`}
            onClick={() => scrollToSection('profil')}
          >
            <Building2 size={16} />
            <span>Profil Kantor</span>
          </button>
          <button
            type="button"
            className={`nav-item ${activeSection === 'alumni' ? 'active' : ''}`}
            onClick={() => scrollToSection('alumni')}
          >
            <Users size={16} />
            <span>Alumni</span>
          </button>
          <button
            type="button"
            className={`nav-item ${activeSection === 'aktivitas' ? 'active' : ''}`}
            onClick={() => scrollToSection('aktivitas')}
          >
            <Activity size={16} />
            <span>Aktivitas</span>
          </button>
          <button
            type="button"
            className={`nav-item ${activeSection === 'komentar' ? 'active' : ''}`}
            onClick={() => scrollToSection('komentar')}
          >
            <MessageSquare size={16} />
            <span>Ulasan</span>
          </button>
        </div>

        <div className="nav-auth" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            to="/dashboard"
            className="btn-link-dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              color: '#c7d2fe',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <LayoutDashboard size={16} />
            <span>Ke Dashboard</span>
          </Link>
          {token ? (
            <div className="user-menu">
              <button
                type="button"
                className="btn-user-profile"
                onClick={() => setActiveSection('auth')}
              >
                <div className="nav-avatar">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <UserCheck size={16} />}
                </div>
                <span className="nav-username">{user?.name || 'Akun Saya'}</span>
              </button>
              <button type="button" className="btn-icon-logout" onClick={onLogout} title="Keluar">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-nav-login" onClick={onOpenAuth}>
              <LogIn size={16} />
              <span>Masuk / Daftar</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
