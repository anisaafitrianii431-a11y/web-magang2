import React from 'react';
import { GraduationCap, Heart, ShieldCheck } from 'lucide-react';

function Footer() {
  return (
    <footer className="main-footer">
      <div className="footer-container">
        <div className="footer-brand">
          <div className="brand-logo">
            <GraduationCap size={20} color="#ffffff" />
          </div>
          <span>Portal Magang & Alumni Peserta</span>
        </div>

        <div className="footer-info">
          <p>Platform Resmi Pengelolaan Data Alumni, Informasi Magang, & Pengembangan Karir Mahasiswa.</p>
        </div>

        <div className="footer-copy">
          <span>&copy; {new Date().getFullYear()} Portal Magang & Karir Alumni. Hak Cipta Dilindungi.</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
