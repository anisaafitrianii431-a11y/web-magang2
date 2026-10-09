export default function Sidebar({ activeTab, setActiveTab, currentRole }) {
  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        </div>
        <div>
          <div className="brand-title">pam-techno</div>
          <div className="brand-subtitle">ENTERPRISE PORTAL </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="sidebar-section">
        <div className="section-label">MAIN CORE</div>
        <ul className="nav-menu">
          <li>
            <a 
              className={`nav-item ${activeTab === 'laporan' ? 'active' : ''}`}
              onClick={() => setActiveTab('laporan')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              Laporan Magang
            </a>
          </li>
          <li>
            <a 
              className={`nav-item ${activeTab === 'rekapitulasi' ? 'active' : ''}`}
              onClick={() => setActiveTab('rekapitulasi')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              </svg>
              Rekapitulasi & Absensi
            </a>
          </li>
          <li>
            <a 
              className={`nav-item ${activeTab === 'penilaian' ? 'active' : ''}`}
              onClick={() => setActiveTab('penilaian')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              Penilaian Laporan
            </a>
          </li>
        </ul>
      </div>

      {/* User Footer Pill */}
      <div className="sidebar-footer">
        <div className="user-pill">
          <div className="avatar-circle">
            {currentRole === 'anak_magang' ? 'M' : 'P'}
          </div>
          <div className="user-info">
            <span className="user-name">
              {currentRole === 'anak_magang' ? 'Anak Magang' : 'pembimbing'}
            </span>
            <span className="user-role">
              {currentRole === 'anak_magang' ? 'Peserta Magang' : 'Pembimbing'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

