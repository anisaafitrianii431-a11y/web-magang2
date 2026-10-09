import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../utils/api';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch {
      // Local logout continues even if the API request fails.
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", background: '#f8fafc' }}>
      
      {/* Sidebar Kiri */}
      <aside style={{ width: '260px', background: '#1e293b', color: 'white', display: 'flex', flexDirection: 'column' }}>
        {/* Logo/Brand Area */}
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '30px', height: '30px', background: '#3b82f6', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>🎓</div>
            MagangAdmin
          </h2>
          <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#94a3b8' }}>ENTERPRISE PORTAL</p>
        </div>

        {/* Menu Items */}
        <div style={{ padding: '20px 10px', flex: 1, overflowY: 'auto' }}>
          <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '10px', paddingLeft: '10px' }}>MAIN CORE</p>
          
          <Link 
            to="/admin/pendaftaran"
            style={{ 
              padding: '10px 15px', 
              marginBottom: '5px',
              borderRadius: '8px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              background: location.pathname === '/admin/pendaftaran' ? '#4f46e5' : 'transparent',
              color: location.pathname === '/admin/pendaftaran' ? 'white' : '#cbd5e1',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: '16px' }}>📝</span>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Pendaftaran Baru</span>
          </Link>

          <Link 
            to="/admin/periode"
            style={{ 
              padding: '10px 15px', 
              marginBottom: '5px',
              borderRadius: '8px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              background: location.pathname === '/admin/periode' ? '#4f46e5' : 'transparent',
              color: location.pathname === '/admin/periode' ? 'white' : '#cbd5e1',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: '16px' }}>📅</span>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Kelola Periode</span>
          </Link>

        </div>

        {/* User Profile / Logout Area di Bawah */}
        <div style={{ padding: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '35px', height: '35px', background: '#3b82f6', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
              {loggedInUser.nama ? loggedInUser.nama.charAt(0).toUpperCase() : 'A'}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{loggedInUser.nama || 'Admin User'}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{loggedInUser.email || 'Administrator'}</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Logout"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Area Konten Utama Kanan */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header Atas */}
        <header style={{ height: '70px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Backend Administrator</h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
              Magang Core <span style={{ margin: '0 5px' }}>•</span> <span style={{ color: '#4f46e5' }}>Laravel 8.83.29</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#10b981', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '6px 12px', borderRadius: '20px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }}></div>
              REST API Active
            </span>
            <span style={{ fontSize: '12px', color: '#334155', background: 'white', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '20px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              &lt;/&gt; API Explorer
            </span>
            <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 5px' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <div style={{ width: '28px', height: '28px', background: '#4f46e5', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', color: 'white', fontSize: '12px' }}>
                {loggedInUser.nama ? loggedInUser.nama.charAt(0).toUpperCase() : 'A'}
              </div>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#334155' }}>{loggedInUser.nama || 'widya anjelina'}</span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>▼</span>
            </div>
          </div>
        </header>

        {/* Konten Halaman */}
        <div style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
          {/* Welcome Alert */}
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '15px 20px', borderRadius: '8px', color: '#065f46', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>✅</span>
            <span>Selamat datang kembali di panel administrasi!</span>
          </div>

          {/* Konten Dinamis Berdasarkan Router */}
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '25px', minHeight: '400px' }}>
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
