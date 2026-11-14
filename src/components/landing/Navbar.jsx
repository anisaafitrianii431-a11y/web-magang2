import { GraduationCap, LogIn, UserCheck, LogOut, Home, Building2, Users, Activity, MessageSquare } from 'lucide-react';

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
            <img src="/logo.png" alt="Logo PAM-TECHNO" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
          </div>
          <div className="brand-text">
            <span className="brand-title">PAM-TECHNO</span>
            <span className="brand-sub">PORTAL MAGANG</span>
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
          {token ? (
            <div className="user-menu">
              <button
                type="button"
                className="btn-user-profile"
                onClick={() => setActiveSection('auth')}
              >
                <div className="nav-avatar" style={{ overflow: 'hidden' }}>
                  {user?.foto ? (
                    <img 
                      src={user.foto.startsWith('data:') || /^https?:\/\//i.test(user.foto) ? user.foto : `http://127.0.0.1:8000/storage/${String(user.foto).replace(/^\/+/, '').replace(/^storage\//, '')}`} 
                      alt="Avatar" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                      onError={(e) => {
                        const fallback = `/storage/${String(user?.foto || '').replace(/^\/+/, '').replace(/^storage\//, '')}`;
                        if (e.currentTarget.src !== fallback && !fallback.endsWith('/')) {
                          e.currentTarget.src = fallback;
                        } else {
                          e.currentTarget.style.display = 'none';
                        }
                      }}
                    />
                  ) : user?.name ? (
                    user.name.charAt(0).toUpperCase()
                  ) : (
                    <UserCheck size={16} />
                  )}
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
