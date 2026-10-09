export default function Navbar({ currentRole, setCurrentRole }) {
  return (
    <header className="top-navbar">
      <div className="navbar-title-group">
        <h6 className="navbar-title">Halaman Laporan Magang</h6>
      </div>

        {/* Role Switcher for seamless testing of Use Cases */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Aktor Mode:</span>
          <select 
            className="role-switcher-select"
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
          >
            <option value="pembimbing">Pembimbing (Admin)</option>
            <option value="anak_magang">Anak Magang (User)</option>
          </select>
      </div>
    </header>
  );
}
