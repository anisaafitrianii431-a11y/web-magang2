import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';

export default function AdminLayout() {
  let loggedInUser = {};
  try {
    loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    loggedInUser = {};
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", background: '#f4f6fb' }}>
      <Sidebar />

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ minHeight: '70px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '12px 30px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Panel Admin</h1>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748b' }}>
              Magang Core <span style={{ margin: '0 5px' }}>•</span> Laravel 12
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', color: '#334155', fontSize: '13px', fontWeight: 600 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            REST API Active
            <span style={{ marginLeft: '12px', paddingLeft: '18px', borderLeft: '1px solid #e2e8f0' }}>
              {loggedInUser.name || loggedInUser.nama || 'Administrator'}
            </span>
          </div>
        </header>

        <div style={{ padding: '26px 30px', overflowY: 'auto', flex: 1 }}>
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '14px 18px', borderRadius: '10px', color: '#065f46', marginBottom: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span aria-hidden="true">✓</span>
            <span>Selamat datang kembali di panel administrasi!</span>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)', padding: '24px', minHeight: '400px' }}>
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
