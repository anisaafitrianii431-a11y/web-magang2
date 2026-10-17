import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import LaporanMagangPage from './LaporanMagangPage';
import PenilaianPage from './PenilaianPage';
import RekapitulasiPage from './RekapitulasiPage';
import UploadLaporanModal from '../components/UploadLaporanModal';
import PenilaianModal from '../components/PenilaianModal';
import RevisiModal from '../components/RevisiModal';
import ReviewModal from '../components/ReviewModal';
import DetailModal from '../components/DetailModal';
import '../App.css';

const laporanEndpoint = '/v1/laporan-magang';

function getApiError(error, fallback) {
  const validationErrors = error.response?.data?.errors;
  if (validationErrors) return Object.values(validationErrors).flat().join(' ');
  return error.response?.data?.message || fallback;
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

function LaporanModule() {
  const location = useLocation();
  const currentUser = getCurrentUser();
  const currentRole = currentUser?.role === 'pembimbing' ? 'pembimbing' : 'anak_magang';
  const [laporanList, setLaporanList] = useState([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLaporan, setSelectedLaporan] = useState(null);
  const [isPenilaianOpen, setIsPenilaianOpen] = useState(false);
  const [isRevisiOpen, setIsRevisiOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [apiError, setApiError] = useState('');
  const [penilaianError, setPenilaianError] = useState('');
  const [revisiError, setRevisiError] = useState('');
  const [reviewError, setReviewError] = useState('');

  const fetchLaporan = useCallback(async () => {
    try {
      const response = await api.get(laporanEndpoint);
      const data = Array.isArray(response.data) ? response.data : response.data?.data;
      if (!Array.isArray(data)) {
        throw new Error('Format data laporan dari server tidak valid.');
      }

      setLaporanList(data);
      setApiError('');
    } catch (error) {
      setApiError(getApiError(
        error,
        error.message || 'Tidak dapat terhubung ke server untuk mengambil laporan magang.'
      ));
    }
  }, []);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') fetchLaporan();
    };

    const initialRefresh = window.setTimeout(fetchLaporan, 0);
    const refreshInterval = window.setInterval(refreshWhenVisible, 30000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [fetchLaporan, location.pathname]);

  const handleUpload = async (laporan) => {
    setIsSaving(true);
    setApiError('');

    const formData = new FormData();
    formData.append('judul_laporan', laporan.judul_laporan);
    formData.append('kategori_laporan', laporan.kategori_laporan);
    formData.append('abstrak', laporan.abstrak);
    formData.append('file_laporan_pdf', laporan.file_laporan_pdf);

    try {
      const response = await api.post(laporanEndpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLaporanList((items) => [response.data.data, ...items]);
      await fetchLaporan();
      return true;
    } catch (error) {
      setApiError(getApiError(error, 'Laporan gagal disimpan. Periksa koneksi server dan konfigurasi database.'));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitPenilaian = async (idLaporan, penilaian) => {
    setIsSaving(true);
    setPenilaianError('');

    try {
      const response = await api.post('/v1/penilaian', penilaian);
      const savedPenilaian = response.data.data;
      setLaporanList((items) => items.map((item) => item.id_laporan === idLaporan
        ? {
            ...item,
            nilai_laporan: penilaian.nilai_laporan,
            tanggal_dinilai: savedPenilaian.tanggal_nilai,
            status_laporan: 'Disetujui',
            penilaian: [savedPenilaian, ...(item.penilaian || [])],
          }
        : item));
      return true;
    } catch (error) {
      setPenilaianError(getApiError(error, 'Penilaian gagal disimpan ke database.'));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitRevisi = async (idLaporan, revisi) => {
    setIsSaving(true);
    setRevisiError('');

    try {
      const response = await api.post(`${laporanEndpoint}/${idLaporan}/revisi`, revisi);
      const savedRevisi = response.data.data.revisi;
      setLaporanList((items) => items.map((item) => item.id_laporan === idLaporan
        ? {
            ...item,
            status_laporan: response.data.data.laporan.status_laporan,
            riwayat_revisi: [savedRevisi, ...(item.riwayat_revisi || [])],
          }
        : item));
      return true;
    } catch (error) {
      setRevisiError(getApiError(error, 'Revisi gagal disimpan ke database.'));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitReview = async (idLaporan, review) => {
    setIsSaving(true);
    setReviewError('');

    try {
      const response = await api.post(`${laporanEndpoint}/${idLaporan}/review`, review);
      setLaporanList((items) => items.map((item) => item.id_laporan === idLaporan
        ? { ...item, ...response.data.data }
        : item));
      return true;
    } catch (error) {
      setReviewError(getApiError(error, 'Review gagal disimpan ke database.'));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (idLaporan) => {
    if (!window.confirm('Yakin ingin menghapus laporan ini?')) return;
    setApiError('');

    try {
      await api.delete(`${laporanEndpoint}/${idLaporan}`);
      setLaporanList((items) => items.filter((item) => item.id_laporan !== idLaporan));
    } catch (error) {
      setApiError(getApiError(error, 'Laporan gagal dihapus dari database.'));
    }
  };

  const activeView = location.pathname === '/laporan/penilaian'
    ? 'penilaian'
    : location.pathname === '/laporan/rekapitulasi'
      ? 'rekapitulasi'
      : 'laporan';

  return (
    <div className="layout report-module">
      <Sidebar />
      <div className="content">
        <Navbar />
        <main className="main report-main">
          {apiError && <p className="report-error" role="alert">{apiError}</p>}
          {activeView === 'laporan' ? (
            <LaporanMagangPage
              laporanList={laporanList}
              currentRole={currentRole}
              currentUserName={currentUser?.name || currentUser?.nama || 'Peserta Magang'}
              onOpenUpload={() => {
                setApiError('');
                setIsUploadOpen(true);
              }}
              onOpenReview={(laporan) => {
                setSelectedLaporan(laporan);
                setReviewError('');
                setIsReviewOpen(true);
              }}
              onOpenRevisi={(laporan) => {
                setSelectedLaporan(laporan);
                setRevisiError('');
                setIsRevisiOpen(true);
              }}
              onOpenPenilaian={(laporan) => {
                setSelectedLaporan(laporan);
                setPenilaianError('');
                setIsPenilaianOpen(true);
              }}
              onOpenDetail={(laporan) => {
                setSelectedLaporan(laporan);
                setIsDetailOpen(true);
              }}
              onDelete={handleDelete}
            />
          ) : activeView === 'penilaian' ? (
            <PenilaianPage laporanList={laporanList} currentRole={currentRole} />
          ) : (
            <RekapitulasiPage />
          )}
        </main>
      </div>
      <UploadLaporanModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSubmit={handleUpload}
        isSubmitting={isSaving}
        submitError={apiError}
      />
      {isPenilaianOpen && selectedLaporan && (
        <PenilaianModal
          key={selectedLaporan.id_laporan}
          isOpen={isPenilaianOpen}
          onClose={() => setIsPenilaianOpen(false)}
          laporan={selectedLaporan}
          onSubmit={handleSubmitPenilaian}
          isSubmitting={isSaving}
          submitError={penilaianError}
        />
      )}
      {isRevisiOpen && selectedLaporan && (
        <RevisiModal
          key={selectedLaporan.id_laporan}
          isOpen={isRevisiOpen}
          onClose={() => setIsRevisiOpen(false)}
          laporan={selectedLaporan}
          onSubmit={handleSubmitRevisi}
          isSubmitting={isSaving}
          submitError={revisiError}
        />
      )}
      {isReviewOpen && selectedLaporan && (
        <ReviewModal
          key={selectedLaporan.id_laporan}
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          laporan={selectedLaporan}
          onSubmit={handleSubmitReview}
          isSubmitting={isSaving}
          submitError={reviewError}
        />
      )}
      {isDetailOpen && selectedLaporan && (
        <DetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          laporan={selectedLaporan}
        />
      )}
    </div>
  );
}

export default LaporanModule;
