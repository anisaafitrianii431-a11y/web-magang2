import React, { useState } from 'react';
import { Send, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';

function CommentForm({ aktivitasId = 1, onCommentAdded, onOpenAuth }) {
  const [komentar, setKomentar] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const token = localStorage.getItem('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      alert('Anda harus masuk (login) terlebih dahulu untuk mengirim komentar.');
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch(`${API_BASE_URL || 'http://127.0.0.1:8000/api'}/aktivitas/${aktivitasId}/komentar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ komentar })
      });

      const result = await res.json();
      if (result.status === 'success') {
        setStatusMsg({ type: 'success', text: 'Komentar berhasil dikirim!' });
        setKomentar('');
        if (onCommentAdded) onCommentAdded();
      } else {
        setStatusMsg({ type: 'error', text: result.message || 'Gagal mengirim komentar.' });
      }
    } catch (err) {
      console.error('Error submitting komentar:', err);
      setStatusMsg({ type: 'error', text: 'Gagal terhubung ke server.' });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="comment-form-login-notice">
        <Lock size={20} />
        <span>Silakan masuk terlebih dahulu untuk menulis komentar pada aktivitas ini.</span>
        <button type="button" className="btn btn-sm btn-primary" onClick={onOpenAuth}>
          Masuk Akun
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="comment-form-box">
      {statusMsg && (
        <div className={`alert-box alert-${statusMsg.type}`}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="form-group">
        <textarea
          placeholder="Tulis komentar Anda pada aktivitas ini..."
          value={komentar}
          onChange={e => setKomentar(e.target.value)}
          required
          rows={3}
          className="comment-textarea"
        />
      </div>

      <button type="submit" className="btn btn-primary btn-submit-comment" disabled={loading}>
        {loading ? (
          <span>Mengirim...</span>
        ) : (
          <>
            <Send size={15} />
            <span>Kirim Komentar</span>
          </>
        )}
      </button>
    </form>
  );
}

export default CommentForm;
