import React from 'react';
import ListAktivitas from './ListAktivitas';
import { Activity } from 'lucide-react';

function AktivitasPage({ onSelectAktivitas }) {
  return (
    <div className="section-container" id="aktivitas-magang">
      <div className="section-header">
        <div>
          <span className="section-badge">
            <Activity size={16} />
            <span>Aktivitas & Logbook Magang</span>
          </span>
          <h2 className="section-title">Dokumentasi & Kegiatan Magang</h2>
          <p className="section-subtitle">
            Lihat berbagai kegiatan harian, dokumentasi proyek, dan diskusi antar peserta magang.
          </p>
        </div>
      </div>

      <ListAktivitas onSelectAktivitas={onSelectAktivitas} />
    </div>
  );
}

export default AktivitasPage;
