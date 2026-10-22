import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import LaporanMagangPage from './LaporanMagangPage';
import PenilaianPage from './PenilaianPage';
import RekapitulasiPage from './RekapitulasiPage';
import UploadLaporanModal from '../components/UploadLaporanModal';
import RevisiModal from '../components/RevisiModal';
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
  const [isRevisiOpen, setIsRevisiOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [apiError, setApiError] = useState('');
  const [revisiError, setRevisiError] = useState('');
  const [assessmentError, setAssessmentError] = useState('');
  const [statusError, setStatusError] = useState('');

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

    try {
      const response = await api.post(laporanEndpoint, laporan);
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

  const handleSubmitPenilaian = async (penilaian) => {
    setIsSaving(true);
    setAssessmentError('');

    try {
      await api.post('/v1/penilaian', penilaian);
      return true;
    } catch (error) {
      setAssessmentError(getApiError(error, 'Penilaian gagal disimpan ke database.'));
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

  const handleSaveDetailStatus = async (idLaporan, status) => {
    setIsSaving(true);
    setStatusError('');

    try {
      const response = await api.post(`${laporanEndpoint}/${idLaporan}/review`, {
        status_laporan: status,
      });
      const updatedLaporan = response.data.data;
      setLaporanList((items) => items.map((item) => item.id_laporan === idLaporan
        ? { ...item, ...updatedLaporan }
        : item));
      setSelectedLaporan((item) => item?.id_laporan === idLaporan
        ? { ...item, ...updatedLaporan }
        : item);
      return true;
    } catch (error) {
      setStatusError(getApiError(error, 'Status laporan gagal disimpan.'));
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
              onOpenRevisi={(laporan) => {
                setSelectedLaporan(laporan);
                setRevisiError('');
                setIsRevisiOpen(true);
              }}
              onOpenDetail={(laporan) => {
                setStatusError('');
                setSelectedLaporan(laporan);
                setIsDetailOpen(true);
              }}
              onDelete={handleDelete}
            />
          ) : activeView === 'penilaian' ? (
            <PenilaianPage
              onSubmit={handleSubmitPenilaian}
              isSaving={isSaving}
              submitError={assessmentError}
            />
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
      {isDetailOpen && selectedLaporan && (
        <DetailModal
          key={selectedLaporan.id_laporan}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          laporan={selectedLaporan}
          canModerate={currentRole === 'pembimbing'}
          onSubmitStatus={handleSaveDetailStatus}
          isSavingStatus={isSaving}
          statusError={statusError}
        />
      )}
    </div>
  );
}

export default LaporanModule;
