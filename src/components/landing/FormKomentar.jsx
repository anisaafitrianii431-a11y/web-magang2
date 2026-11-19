import React, { useState } from 'react';
import { Send, Lock, Star, AlertCircle, CheckCircle2 } from 'lucide-react';

function FormKomentar({ onCommentAdded, onOpenAuth }) {
  const [rating, setRating] = useState(5);
  const [komentar, setKomentar] = useState('');
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      alert('Anda harus masuk (login) terlebih dahulu untuk membuat ulasan.');
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/komentar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating: Number(rating),
          komentar: komentar
        })
      });
      const result = await response.json();

      if (result.status === 'success') {
        alert('Terima kasih! Komentar Anda berhasil dikirim.');
        setKomentar('');
        if (onCommentAdded) onCommentAdded();
      } else {
        alert('Gagal mengirim komentar: ' + result.message);
      }
    } catch (err) {
      console.error('Error sending komentar:', err);
      alert('Gagal terhubung ke backend API.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="komentar-form-box shadow-card">
        <h3>Beri Ulasan & Rating</h3>
        <div className="login-notice">
          <Lock size={24} className="lock-icon" />
          <p>Silakan masuk ke akun Anda terlebih dahulu untuk memberikan ulasan dan rating aplikasi.</p>
          <button type="button" className="btn btn-primary" onClick={onOpenAuth}>
            Masuk / Daftar Akun
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="komentar-form-box shadow-card">
      <h3>Beri Ulasan & Rating</h3>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="rating-select-group">
          <label>Pilih Penilaian (Rating):</label>
          <div className="stars-picker">
            <select
              value={rating}
              onChange={e => setRating(e.target.value)}
              className="input-wrapper"
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontWeight: 'bold' }}
            >
              <option value="5">5 Bintang ⭐⭐⭐⭐⭐</option>
              <option value="4">4 Bintang ⭐⭐⭐⭐</option>
              <option value="3">3 Bintang ⭐⭐⭐</option>
              <option value="2">2 Bintang ⭐⭐</option>
              <option value="1">1 Bintang ⭐</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Masukan / Komentar:</label>
          <textarea
            className="input-textarea"
            placeholder="Komentar / Masukan..."
            value={komentar}
            onChange={e => setKomentar(e.target.value)}
            rows={4}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Mengirim...' : (
            <>
              <Send size={16} />
              <span>Kirim Komentar</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default FormKomentar;
