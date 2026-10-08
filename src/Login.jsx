import { useState } from 'react';
import api from './api';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e, customEmail, customPassword) => {
    if (e) e.preventDefault();
    const loginEmail = customEmail || email;
    const loginPass = customPassword || password;

    setError('');
    setLoading(true);

    try {
      const res = await api.post('/login', { email: loginEmail, password: loginPass });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Tidak dapat terhubung ke server backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role) => {
    const creds = {
      admin: { email: 'admin@gmail.com', password: 'password123', name: 'Administrator' },
      pembimbing: { email: 'pembimbing@gmail.com', password: 'password123', name: 'Pembimbing Magang' },
      peserta: { email: 'peserta@gmail.com', password: 'password123', name: 'Hanifa Khairunisa' },
    }[role] || { email: 'peserta@gmail.com', password: 'password123', name: 'Peserta Magang' };

    setEmail(creds.email);
    setPassword(creds.password);
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/login', { email: creds.email, password: creds.password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch {
      // Jika backend gagal atau akun belum ada di database, login dengan mode demo instan
      const demoUser = {
        id: role === 'admin' ? 1 : role === 'pembimbing' ? 2 : 3,
        name: creds.name,
        email: creds.email,
        role: role,
      };
      localStorage.setItem('user', JSON.stringify(demoUser));
      localStorage.setItem('token', 'demo-token-' + role);
      onLogin(demoUser);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand-header">
          <div className="brand-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
              <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
            </svg>
          </div>
          <div className="brand-text-container">
            <span className="brand-title" style={{ color: '#0f172a' }}>MagangAdmin</span>
            <span className="brand-subtitle">ENTERPRISE PORTAL</span>
          </div>
        </div>

        <p className="login-subtitle-text">
          Masuk ke sistem administrator portal magang terpadu.
        </p>

        <form onSubmit={(e) => handleLoginSubmit(e)}>
          <div className="form-field-group" style={{ marginBottom: '14px' }}>
            <label className="form-field-label">Alamat Email</label>
            <input
              type="email"
              className="form-control-input"
              placeholder="admin@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-field-group" style={{ marginBottom: '18px' }}>
            <label className="form-field-label">Kata Sandi</label>
            <input
              type="password"
              className="form-control-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '0.84rem',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-save-primary"
            style={{ width: '100%', padding: '11px', fontSize: '0.92rem' }}
            disabled={loading}
          >
            {loading ? 'Memproses Masuk...' : 'Masuk ke Portal'}
          </button>
        </form>

        <div className="login-quick-presets">
          <div className="quick-preset-label">Masuk Cepat Sebagai:</div>
          <div className="quick-preset-buttons">
            <button
              type="button"
              className="btn-preset-pill"
              onClick={() => handleQuickLogin('admin')}
              disabled={loading}
            >
              👑 Admin
            </button>
            <button
              type="button"
              className="btn-preset-pill"
              onClick={() => handleQuickLogin('pembimbing')}
              disabled={loading}
            >
              🧑‍🏫 Pembimbing
            </button>
            <button
              type="button"
              className="btn-preset-pill"
              onClick={() => handleQuickLogin('peserta')}
              disabled={loading}
            >
              🎓 Peserta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;