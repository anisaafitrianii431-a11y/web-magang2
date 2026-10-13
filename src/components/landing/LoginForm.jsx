import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { getLoginData } from '../../utils/auth';

function LoginForm({ onSuccess, noticeMessage = '' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState(noticeMessage);

  useEffect(() => {
    if (noticeMessage) {
      setSuccessMessage(noticeMessage);
    }
  }, [noticeMessage]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const response = await api.post('/login', { email, password });
      const { token: authToken, user } = getLoginData(response.data);

      if (!authToken || !user) {
        throw new Error('Respons login tidak berisi token atau data pengguna.');
      }

      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(user));
      setSuccessMessage('Login Berhasil! Selamat datang.');
      if (onSuccess) onSuccess(response.data);
    } catch (error) {
      console.error('Login error:', error);
      const errTxt = error.response?.data?.message
        || error.message
        || 'Gagal terhubung ke layanan server. Silakan periksa koneksi internet Anda.';
      setErrorMessage(errTxt);
      alert('Login Gagal: ' + errTxt);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="auth-form" autoComplete="off">
      {errorMessage && (
        <div className="alert alert-danger" role="alert">
          <AlertCircle className="alert-icon" size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success" role="alert">
          <CheckCircle2 className="alert-icon" size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="login-email">Alamat Email Peserta</label>
        <div className="input-wrapper">
          <Mail className="input-icon" size={18} />
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="contoh@email.com"
            required
            autoComplete="off"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="login-password">Kata Sandi</label>
        <div className="input-wrapper">
          <Lock className="input-icon" size={18} />
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Masukkan kata sandi akun"
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
            title={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={isLoading}>
        {isLoading ? (
          <span className="spinner-wrapper">
            <span className="spinner"></span>
            Memproses...
          </span>
        ) : (
          <>
            <LogIn size={18} />
            <span>Masuk Akun</span>
          </>
        )}
      </button>
    </form>
  );
}

export default LoginForm;
