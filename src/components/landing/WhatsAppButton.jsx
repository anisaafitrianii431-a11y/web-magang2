import React, { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';

/**
 * Utility function to convert raw phone string from Company Profile DB (e.g. "0812-3456-7890")
 * into valid WhatsApp international format ("6281234567890").
 */
export const formatWhatsAppNumber = (phone) => {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  return cleaned;
};

function WhatsAppButton() {
  const [telepon, setTelepon] = useState('');
  const [companyName, setCompanyName] = useState('Portal Magang');

  useEffect(() => {
    // Fetch Profil Perusahaan dari Database API (/beranda/profil)
    fetch(`${API_BASE_URL || 'http://127.0.0.1:8000/api'}/beranda/profil`, {
      headers: { 'Accept': 'application/json' }
    })
      .then(res => res.json())
      .then(resData => {
        const profil = resData.data;
        if (profil) {
          if (profil.nama_perusahaan) setCompanyName(profil.nama_perusahaan);
          // Ambil secara murni nomor dari kolom telepon pada profil perusahaan
          if (profil.telepon) {
            setTelepon(profil.telepon);
          }
        }
      })
      .catch(err => {
        console.error('Error fetching profil perusahaan dari DB:', err);
      });
  }, []);

  const handleOpenWhatsApp = () => {
    if (!telepon) {
      alert('Nomor telepon perusahaan belum diisi pada Profil Perusahaan.');
      return;
    }

    const numberToUse = formatWhatsAppNumber(telepon);
    const message = `Halo Admin ${companyName}, saya ingin bertanya seputar informasi program magang.`;
    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${numberToUse}?text=${encodedMessage}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      type="button"
      className="btn-whatsapp-floating"
      onClick={handleOpenWhatsApp}
      title={`Chat WhatsApp (${telepon || 'Profil Perusahaan'})`}
    >
      <div className="wa-icon-wrapper">
        <MessageCircle size={22} color="#ffffff" />
      </div>
      <span className="wa-btn-text">Chat WhatsApp</span>
    </button>
  );
}

export default WhatsAppButton;
