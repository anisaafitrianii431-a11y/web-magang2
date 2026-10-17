import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { GraduationCap } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nama: '',
    nim: '',
    email: '',
    password: '',
    role: 'Pemagang',
    no_hp: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await api.post('/register', formData);
      navigate('/login', {
        state: {
          registeredEmail: formData.email,
          registrationNotice: 'Akun berhasil dibuat. Masuk untuk melengkapi data diri dan mengirim pengajuan magang.',
        },
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message
          || 'Terjadi kesalahan saat mendaftar. Silakan periksa koneksi atau data Anda.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 15px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#334155',
    marginBottom: '6px',
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
        background: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'white',
          padding: '40px',
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              background: '#3b82f6',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '30px',
              margin: '0 auto 15px',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)',
            }}
          >
            <GraduationCap size={30} color="#fff" strokeWidth={1.8} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 5px' }}>
            Buat Akun Baru
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Bergabunglah dengan MagangAdmin
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: '16px',
              padding: '12px',
              color: '#991b1b',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              fontSize: '13px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label htmlFor="register-name" style={labelStyle}>Nama Lengkap</label>
            <input
              id="register-name"
              type="text"
              value={formData.nama}
              onChange={(event) => setFormData({ ...formData, nama: event.target.value })}
              placeholder="Nama lengkap"
              style={inputStyle}
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label htmlFor="register-nim" style={labelStyle}>NIM</label>
            <input
              id="register-nim"
              type="text"
              value={formData.nim}
              onChange={(event) => setFormData({ ...formData, nim: event.target.value })}
              placeholder="Nomor Induk Mahasiswa"
              style={inputStyle}
              autoComplete="off"
              maxLength={50}
              required
            />
          </div>

          <div>
            <label htmlFor="register-email" style={labelStyle}>Email Address</label>
            <input
              id="register-email"
              type="email"
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              placeholder="nama@email.com"
              style={inputStyle}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="register-password" style={labelStyle}>Password</label>
            <input
              id="register-password"
              type="password"
              value={formData.password}
              onChange={(event) => setFormData({ ...formData, password: event.target.value })}
              placeholder="Minimal 8 karakter"
              style={inputStyle}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div>
            <label htmlFor="register-phone" style={labelStyle}>No. HP / WhatsApp (Opsional)</label>
            <input
              id="register-phone"
              type="tel"
              value={formData.no_hp}
              onChange={(event) => setFormData({ ...formData, no_hp: event.target.value })}
              placeholder="08123456789"
              style={inputStyle}
              autoComplete="tel"
            />
          </div>

          <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
            Pendaftaran mandiri membuat akun Pemagang. Akun Admin dan Pembimbing diberikan oleh pengelola.
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              background: '#4f46e5',
              color: 'white',
              padding: '14px',
              border: 'none',
              borderRadius: '8px',
              cursor: isSubmitting ? 'wait' : 'pointer',
              fontWeight: 'bold',
              fontSize: '15px',
              marginTop: '10px',
              boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.4)',
            }}
          >
            {isSubmitting ? 'Mendaftarkan...' : 'Daftar Sekarang'}
          </button>
        </form>

        <div style={{ marginTop: '25px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
          Sudah memiliki akun?{' '}
          <Link to="/login" style={{ color: '#4f46e5', fontWeight: 'bold', textDecoration: 'none' }}>
            Login di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
