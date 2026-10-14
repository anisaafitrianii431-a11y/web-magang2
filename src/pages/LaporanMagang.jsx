import { useState, useEffect } from 'react';
import api from '../api';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import LaporanMagangPage from './LaporanMagangPage';
import UploadLaporanModal from '../components/UploadLaporanModal';
import ReviewModal from '../components/ReviewModal';
import RevisiModal from '../components/RevisiModal';
import PenilaianModal from '../components/PenilaianModal';
import DetailModal from '../components/DetailModal';

export default function LaporanMagang() {
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  })();
  const currentRole = currentUser?.role || 'peserta';

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
    } catch (error) {
      console.error('Gagal memuat laporan:', error);
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
    } catch (err) {
      alert('Gagal menghapus laporan');
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat data laporan...</div>;

  return (
    <div className="layout">
      <Sidebar />
      <div className="content">
        <Navbar />
        <main className="main">
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
        </main>
      </div>
    </div>
  );
}
