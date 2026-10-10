import React from 'react';
import { LogOut } from 'lucide-react';

function LogoutButton({ onLogoutSuccess }) {
  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    try {
      if (token) {
        await fetch('http://127.0.0.1:8000/api/logout', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      alert('Anda telah berhasil Logout');
      if (onLogoutSuccess) onLogoutSuccess();
    }
  };

  return (
    <button type="button" className="btn btn-danger" onClick={handleLogout}>
      <LogOut size={16} />
      <span>Logout</span>
    </button>
  );
}

export default LogoutButton;
