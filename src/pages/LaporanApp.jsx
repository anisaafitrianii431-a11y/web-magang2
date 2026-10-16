import { useState } from 'react';
import { useEffect } from 'react';
import api from '../api';

// Komponen Sidebar dari teman (Sidebar copy.jsx)
import SidebarTeman from '../components//Sidebar copy';
import NavbarTeman from '../components/Navbar copy';

// Halaman konten dari teman
import LaporanMagangPage from './LaporanMagangPage';
import RekapitulasiPage from './RekapitulasiPage';
import PenilaianPage from './PenilaianPage';

// Modal dari teman
import UploadLaporanModal from '../components/UploadLaporanModal';
import ReviewModal from '../components/ReviewModal';
import RevisiModal from '../components/RevisiModal';
import PenilaianModal from '../components/PenilaianModal';
import DetailModal from '../components/DetailModal';

export default function LaporanApp() {
  const [activeTab, setActiveTab] = useState('laporan');
  const [currentRole, setCurrentRole] = useState('pembimbing');

  const [laporanList, setLaporanList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [uploadModal, setUploadModal] = useState({ isOpen: false, isSubmitting: false, submitError: null });
  const [reviewModal, setReviewModal] = useState({ isOpen: false, laporan: null });
  const [revisiModal, setRevisiModal] = useState({ isOpen: false, laporan: null });
  const [penilaianModal, setPenilaianModal] = useState({ isOpen: false, laporan: null });
  const [detailModal, setDetailModal] = useState({ isOpen: false, laporan: null });

  const fetchLaporan = async () => {
    try {
      const res = await api.get('/laporan');
      setLaporanList(res.data.data || res.data || []);
    } catch {
      setLaporanList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLaporan(); }, []);

  const handleUploadSubmit = async (formData) => {
    setUploadModal(prev => ({ ...prev, isSubmitting: true, submitError: null }));
    try {
      await api.post('/laporan', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadModal({ isOpen: false, isSubmitting: false, submitError: null });
      fetchLaporan();
    } catch (err) {
      setUploadModal(prev => ({ ...prev, isSubmitting: false, submitError: err.response?.data?.message || 'Gagal upload' }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus laporan ini?')) return;
    try {
      await api.delete(`/laporan/${id}`);
      fetchLaporan();
    } catch {
      alert('Gagal menghapus laporan');
    }
  };

  const renderContent = () => {
    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat data...</div>;

    switch (activeTab) {
      case 'laporan':
        return (
          <LaporanMagangPage
            laporanList={laporanList}
            currentRole={currentRole}
            onOpenUpload={() => setUploadModal({ isOpen: true, isSubmitting: false, submitError: null })}
            onOpenReview={(laporan) => setReviewModal({ isOpen: true, laporan })}
            onOpenRevisi={(laporan) => setRevisiModal({ isOpen: true, laporan })}
            onOpenPenilaian={(laporan) => setPenilaianModal({ isOpen: true, laporan })}
            onOpenDetail={(laporan) => setDetailModal({ isOpen: true, laporan })}
            onDelete={handleDelete}
          />
        );
      case 'rekapitulasi':
        return <RekapitulasiPage />;
      case 'penilaian':
        return <PenilaianPage laporanList={laporanList} currentRole={currentRole} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}>
      {/* Sidebar dari teman */}
      <SidebarTeman
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentRole={currentRole}
      />

      {/* Area Konten */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Navbar dari teman */}
        <NavbarTeman
          currentRole={currentRole}
          setCurrentRole={setCurrentRole}
        />

        {/* Konten Utama */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#f8fafc' }}>
          {renderContent()}
        </main>
      </div>

      {/* Modals */}
      <UploadLaporanModal
        isOpen={uploadModal.isOpen}
        onClose={() => setUploadModal({ isOpen: false, isSubmitting: false, submitError: null })}
        onSubmit={handleUploadSubmit}
        isSubmitting={uploadModal.isSubmitting}
        submitError={uploadModal.submitError}
      />

      {reviewModal.isOpen && (
        <ReviewModal
          isOpen={reviewModal.isOpen}
          laporan={reviewModal.laporan}
          onClose={() => setReviewModal({ isOpen: false, laporan: null })}
          onSubmit={async (data) => {
            await api.put(`/laporan/${reviewModal.laporan.id}/review`, data);
            setReviewModal({ isOpen: false, laporan: null });
            fetchLaporan();
          }}
        />
      )}

      {revisiModal.isOpen && (
        <RevisiModal
          isOpen={revisiModal.isOpen}
          laporan={revisiModal.laporan}
          onClose={() => setRevisiModal({ isOpen: false, laporan: null })}
          onSubmit={async (data) => {
            await api.put(`/laporan/${revisiModal.laporan.id}/revisi`, data);
            setRevisiModal({ isOpen: false, laporan: null });
            fetchLaporan();
          }}
        />
      )}

      {penilaianModal.isOpen && (
        <PenilaianModal
          isOpen={penilaianModal.isOpen}
          laporan={penilaianModal.laporan}
          onClose={() => setPenilaianModal({ isOpen: false, laporan: null })}
          onSubmit={async (data) => {
            await api.put(`/laporan/${penilaianModal.laporan.id}/penilaian`, data);
            setPenilaianModal({ isOpen: false, laporan: null });
            fetchLaporan();
          }}
        />
      )}

      {detailModal.isOpen && (
        <DetailModal
          isOpen={detailModal.isOpen}
          laporan={detailModal.laporan}
          onClose={() => setDetailModal({ isOpen: false, laporan: null })}
        />
      )}
    </div>
  );
}
