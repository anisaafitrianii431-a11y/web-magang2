import { useState } from 'react';
import { User, Hash, Mail, Lock, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

function RegisterForm({ onRegisterSuccess }) {
  const [formData, setFormData] = useState({ name: '', nim: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setFieldErrors({});
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const response = await api.post('/register', formData);
      const result = response.data;

      if (result.status === 'success') {
        setSuccessMessage('Akun berhasil dibuat. Silakan masuk untuk melengkapi dan mengirim pengajuan magang.');
        if (onRegisterSuccess) {
          onRegisterSuccess(formData.email);
        }

      } else {
        const msg = result.message || 'Registrasi gagal. Silakan periksa kembali data pendaftaran Anda.';
        setErrorMessage(msg);
        setFieldErrors(result.errors || {});
      }
    } catch (error) {
      const responseErrors = error.response?.data?.errors || {};
      setFieldErrors(responseErrors);
      setErrorMessage(
        error.response?.data?.message
          || 'Gagal terhubung ke layanan server. Silakan periksa koneksi internet Anda.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="auth-form">
      {errorMessage && (
        <div className="alert alert-danger" role="alert">
          <AlertCircle className="alert-icon" size={18} />
          <div>
            <div>{errorMessage}</div>
            {Object.keys(fieldErrors).length > 0 && (
              <ul className="error-list">
                {Object.entries(fieldErrors).map(([field, msgs]) => (
                  <li key={field}>{Array.isArray(msgs) ? msgs.join(', ') : msgs}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success" role="alert">
          <CheckCircle2 className="alert-icon" size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      <p className="auth-subtitle">
        Buat akun terlebih dahulu. Setelah masuk, Anda dapat melengkapi data diri dan mengirim pengajuan magang.
      </p>

      <div className="form-group">
        <label htmlFor="reg-name">Nama Lengkap Peserta</label>
        <div className="input-wrapper">
          <User className="input-icon" size={18} />
          <input
            id="reg-name"
            type="text"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            placeholder="Masukkan nama lengkap Anda"
            required
            autoComplete="name"
          />
        </div>
        {fieldErrors.name && <span className="field-error">{fieldErrors.name[0]}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="reg-nim">NIM</label>
        <div className="input-wrapper">
          <Hash className="input-icon" size={18} />
          <input
            id="reg-nim"
            type="text"
            value={formData.nim}
            onChange={e => setFormData({ ...formData, nim: e.target.value })}
            placeholder="Masukkan Nomor Induk Mahasiswa"
            required
            maxLength={50}
            autoComplete="off"
          />
        </div>
        {fieldErrors.nim && <span className="field-error">{fieldErrors.nim[0]}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="reg-email">Alamat Email</label>
        <div className="input-wrapper">
          <Mail className="input-icon" size={18} />
          <input
            id="reg-email"
            type="email"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            placeholder="nama@email.com"
            required
            autoComplete="email"
          />
        </div>
        {fieldErrors.email && <span className="field-error">{fieldErrors.email[0]}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="reg-password">Kata Sandi</label>
        <div className="input-wrapper">
          <Lock className="input-icon" size={18} />
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
            placeholder="Minimal 8 karakter"
            required
            autoComplete="new-password"
            minLength={8}
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
        {fieldErrors.password && <span className="field-error">{fieldErrors.password[0]}</span>}
      </div>

      <button type="submit" className="btn btn-primary" disabled={isLoading}>
        {isLoading ? (
          <span className="spinner-wrapper">
            <span className="spinner"></span>
            Memproses...
          </span>
        ) : (
          <>
            <UserPlus size={18} />
            <span>Daftar Akun Peserta</span>
          </>
        )}
      </button>
    </form>
  );
}

export default RegisterForm;
