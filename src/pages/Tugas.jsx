import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Clock,
  Calendar,
  User,
  Users,
  UploadCloud,
  Download,
  Edit3,
  MessageSquare,
  Award,
  AlertCircle,
  CheckCircle2,
  X,
  Search,
  RotateCcw,
  Eye,
  BookOpen,
  Trash2,
  Filter,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import api from '../api';
import Login from './Login';
import Sidebar from '../components/Sidebar';
import { normalizeRole } from '../utils/auth';

// Helper: Format deadline informasi lengkap (Hari, Tanggal, Jam WIB, dan status countdown)
function formatDeadlineInfo(deadlineString) {
  if (!deadlineString) return null;
  const d = new Date(deadlineString);
  if (isNaN(d.getTime())) return null;

  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const isPast = diffMs < 0;
  const diffHours = Math.abs(diffMs) / (1000 * 60 * 60);
  const diffDays = Math.floor(diffHours / 24);

  let badgeText = '';
  let badgeType = 'normal';

  if (isPast) {
    badgeText = 'Tenggat Waktu Berakhir';
    badgeType = 'danger';
  } else if (diffDays === 0) {
    const hoursLeft = Math.floor(diffHours);
    badgeText = hoursLeft <= 1 ? 'Segera Berakhir (< 1 jam)' : `Tersisa ${hoursLeft} jam lagi`;
    badgeType = 'warning';
  } else if (diffDays === 1) {
    badgeText = 'Tersisa 1 hari lagi';
    badgeType = 'warning';
  } else {
    badgeText = `Tersisa ${diffDays} hari lagi`;
    badgeType = 'normal';
  }

  const formattedDate = d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }) + ' WIB';

  return { formattedDate, formattedTime, badgeText, badgeType, isPast };
}

// Helper: Format ukuran file (Bytes -> KB, MB)
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper: Format nilai angka menjadi predikat huruf
function formatNilaiAkhir(nilai) {
  if (nilai === null || nilai === undefined || nilai === '') {
    return { label: 'Belum Dinilai', className: 'grade-none', short: '-' };
  }
  const n = Number(nilai);
  if (n >= 85) return { label: 'A (Sangat Baik)', className: 'grade-a', short: 'A' };
  if (n >= 78) return { label: 'B+ (Baik)', className: 'grade-b', short: 'B+' };
  if (n >= 70) return { label: 'B (Cukup)', className: 'grade-b', short: 'B' };
  if (n >= 60) return { label: 'C (Kurang)', className: 'grade-c', short: 'C' };
  return { label: `D (${n})`, className: 'grade-c', short: 'D' };
}

// Helper: Format tanggal Indonesia yang rapi (Contoh: "17 Okt 2026", "23:35 WIB")
function formatTanggal(dateString) {
  if (!dateString) return { date: '-', time: '-' };
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return { date: '-', time: '-' };
    const pad = (n) => String(n).padStart(2, '0');
    const date = d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())} WIB`;
    return { date, time, rawDate: d };
  } catch {
    return { date: '-', time: '-' };
  }
}

// Helper: Status badge (menerima deadline untuk mendeteksi pengumpulan terlambat)
function getStatusSubmisi(submisi, deadline) {
  if (!submisi) {
    return { label: 'Belum Dikerjakan', className: 'unsubmitted' };
  }

  // Terlambat jika waktu submit melewati deadline
  const isLate =
    !!deadline &&
    !!submisi.tanggal_submit &&
    new Date(submisi.tanggal_submit) > new Date(deadline);

  if (submisi.status === 'sudah_dinilai') {
    if (isLate) {
      return { label: 'Disetujui / Selesai (Terlambat)', className: 'late' };
    }
    return { label: 'Disetujui / Selesai', className: 'approved' };
  }

  if (isLate) {
    return { label: 'Terlambat - Menunggu Review', className: 'late' };
  }
  return { label: 'Menunggu Review', className: 'pending' };
}

// Helper: Hitung jumlah submisi yang terlambat pada satu tugas
function hitungTerlambat(submisiList, deadline) {
  if (!deadline) return 0;
  return (submisiList || []).filter(
    (s) => s.tanggal_submit && new Date(s.tanggal_submit) > new Date(deadline)
  ).length;
}

// Helper: Ambil submisi milik peserta yang sedang login
function getParticipantSubmisi(submisiList, userId) {
  const list = submisiList || [];
  if (!userId) return list[0] || null;
  return list.find((s) => Number(s.user_id) === Number(userId)) || list[0] || null;
}

// Top Navbar Component
function TopNavbar({ user, isConnected }) {
  const currentRole = user?.role || 'peserta';
  const roleLabel = {
    admin: 'Administrator',
    pembimbing: 'Pembimbing',
    peserta: 'Peserta Magang',
  }[currentRole] || 'Peserta Magang';

  return (
    <header className="top-navbar">
      <div className="topbar-left">
        <h2 className="topbar-title">Sistem Tugas Magang</h2>
        <span className="topbar-subtitle">
          Magang Core &bull; Laravel 8.83.29 &bull; {isConnected ? 'REST API Terhubung' : 'REST API Standby (http://127.0.0.1:8000)'}
        </span>
      </div>

      <div className="topbar-right">
        {/* Status Pill */}
        <div
          className="api-status-pill"
          style={
            isConnected
              ? {}
              : {
                  backgroundColor: '#fffbeb',
                  color: '#b45309',
                  borderColor: '#fde68a',
                }
          }
          title={
            isConnected
              ? 'Terhubung ke Laravel API di http://127.0.0.1:8000/api'
              : 'Backend belum aktif. Jalankan "php artisan serve" di folder backend(laravel)'
          }
        >
          <span
            className="pulse-dot"
            style={isConnected ? {} : { backgroundColor: '#f59e0b', animation: 'none' }}
          ></span>
          <span>{isConnected ? 'REST API Active' : 'REST API Standby'}</span>
        </div>

        <div className="actor-mode-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Role:</span>
          <span
            className="actor-select"
            style={{
              display: 'inline-block',
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              outline: 'none',
              fontSize: '0.82rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
            aria-label={`Role: ${roleLabel}`}
          >
            {roleLabel}
          </span>
        </div>
      </div>
    </header>
  );
}

// Main App Component
function Tugas() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      if (saved) return JSON.parse(saved);
      return null;
    } catch {
      return null;
    }
  });

  // Role checks
  const role = normalizeRole(user?.role);
  const isAdminOrPembimbing = role === 'admin' || role === 'pembimbing';
  const isPembimbing = role === 'pembimbing';
  const isAdmin = role === 'admin';
  const isPeserta = role === 'pemagang';

  const [daftarTugas, setDaftarTugas] = useState([]);
  const [taskLoadError, setTaskLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals state
  const [modalDetail, setModalDetail] = useState(null);           // Lihat Detail Tugas
  const [modalSubmisiList, setModalSubmisiList] = useState(null);  // Lihat Daftar Submisi (Admin & Pembimbing)
  const [modalNilai, setModalNilai] = useState(null);             // Beri Nilai & Feedback (Hanya Pembimbing)
  const [modalFormTugas, setModalFormTugas] = useState(null);     // Buat / Ubah Tugas (Admin & Pembimbing)
  const [modalSubmit, setModalSubmit] = useState(null);           // Kumpulkan / Ubah Submisi (Peserta)

  // Nilai Form state
  const [inputNilai, setInputNilai] = useState('');
  const [inputFeedback, setInputFeedback] = useState('');
  const [savingNilai, setSavingNilai] = useState(false);

  // Form Tugas state (Buat & Ubah Tugas)
  const [formTugasData, setFormTugasData] = useState({
    judul: '',
    deskripsi: '',
    deadline: '',
    kategori: 'Individu',
  });
  const [savingTugas, setSavingTugas] = useState(false);

  // Upload file state (Peserta)
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadCatatan, setUploadCatatan] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Clear session
  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  // Logout API
  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch {
      /* abaikan error logout */
    }
    clearSession();
    window.location.href = '/';
  };

  // Fetch tasks
  const fetchTugas = useCallback(() => {
    api.get('/tugas')
      .then((response) => {
        setIsBackendConnected(true);
        setTaskLoadError('');
        setDaftarTugas(Array.isArray(response.data) ? response.data : []);
        setLoading(false);
      })
      .catch((error) => {
        if (error.response?.status === 401) {
          clearSession();
          return;
        }
        setIsBackendConnected(Boolean(error.response));
        setTaskLoadError(error.response?.data?.message || 'Tidak dapat memuat tugas dari server.');
        setDaftarTugas([]);
        setLoading(false);
      });
  }, [clearSession]);

  const refreshTugas = useCallback(() => {
    setLoading(true);
    fetchTugas();
  }, [fetchTugas]);

  // Sinkronisasi status user & token dengan backend saat pertama kali dibuka
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/me')
        .then((res) => {
          const currentUser = res.data?.data || res.data?.user || res.data;
          if (currentUser?.id) {
            localStorage.setItem('user', JSON.stringify(currentUser));
            setUser(currentUser);
          }
        })
        .catch(() => {
          clearSession();
        });
    }
  }, [clearSession]);

  useEffect(() => {
    if (user) {
      fetchTugas();
    }
  }, [user, fetchTugas]);

  // USE CASE 3 (Admin & Pembimbing): Hapus Tugas
  const handleHapusTugas = async (id, e) => {
    if (e) e.stopPropagation();
    if (window.confirm('Yakin ingin menghapus tugas magang ini? Seluruh data submisi terkait juga akan terhapus.')) {
      try {
        await api.delete(`/tugas/${id}`);
        refreshTugas();
        alert('Tugas magang berhasil dihapus.');
      } catch (err) {
        const errMsg = err?.response?.data?.message || 'Gagal menghapus tugas. Silakan coba lagi.';
        alert('❌ Gagal: ' + errMsg);
      }
    }
  };

  // USE CASE 1 & 2 (Admin & Pembimbing): Buat & Ubah Tugas
  const handleSimpanTugas = async (e) => {
    e.preventDefault();
    setSavingTugas(true);
    try {
      if (modalFormTugas?.id) {
        // Ubah Tugas
        await api.put(`/tugas/${modalFormTugas.id}`, {
          judul: formTugasData.judul,
          deskripsi: formTugasData.deskripsi,
          kategori: formTugasData.kategori,
          deadline: formTugasData.deadline,
        });
        alert('Tugas magang berhasil diubah!');
      } else {
        // Buat Tugas Baru
        await api.post('/tugas', {
          judul: formTugasData.judul,
          deskripsi: formTugasData.deskripsi,
          kategori: formTugasData.kategori,
          deadline: formTugasData.deadline,
        });
        alert('Tugas magang baru berhasil diterbitkan!');
      }
      setModalFormTugas(null);
      refreshTugas();
    } catch (err) {
      const errMsg = err?.response?.data?.message
        || (err?.response?.data?.errors ? JSON.stringify(err?.response?.data?.errors) : null)
        || 'Gagal menyimpan tugas. Silakan coba lagi.';
      alert('❌ Gagal: ' + errMsg);
    } finally {
      setSavingTugas(false);
    }
  };

  // Buka modal edit tugas
  const handleOpenEditTugas = (tugas, e) => {
    if (e) e.stopPropagation();
    setFormTugasData({
      judul: tugas.judul,
      deskripsi: tugas.deskripsi,
      deadline: tugas.deadline ? tugas.deadline.slice(0, 16) : '',
      kategori: tugas.kategori || 'Individu',
    });
    setModalFormTugas(tugas);
  };

  // Buka modal buat tugas baru
  const handleOpenCreateTugas = () => {
    setFormTugasData({
      judul: '',
      deskripsi: '',
      deadline: '',
      kategori: 'Individu',
    });
    setModalFormTugas({ isNew: true });
  };

  // USE CASE 6 (Admin & Pembimbing): Beri Nilai & Feedback
  const handleOpenNilai = (tugas, submisi, e) => {
    if (e) e.stopPropagation();
    setInputNilai(submisi?.nilai !== null && submisi?.nilai !== undefined ? submisi.nilai : '');
    setInputFeedback(submisi?.feedback || '');
    setModalNilai({ tugas, submisi });
  };

  const handleSimpanNilai = async (e) => {
    e.preventDefault();
    if (!modalNilai?.submisi) {
      alert('Belum ada berkas submisi peserta untuk dinilai.');
      return;
    }
    const val = Number(inputNilai);
    if (isNaN(val) || val < 0 || val > 100) {
      alert('Nilai harus berupa angka antara 0 dan 100.');
      return;
    }

    setSavingNilai(true);
    try {
      await api.put(`/submisi/${modalNilai.submisi.id}/nilai`, {
        nilai: val,
        feedback: inputFeedback,
      });
      alert('Nilai & feedback berhasil disimpan!');
      setModalNilai(null);
      refreshTugas();
    } catch (err) {
      const errMsg = err?.response?.data?.message || 'Gagal menyimpan nilai. Silakan coba lagi.';
      alert('❌ Gagal: ' + errMsg);
    } finally {
      setSavingNilai(false);
    }
  };

  // USE CASE 5 (Admin & Pembimbing): Unduh File Submisi
  const handleDownloadSubmisi = async (submisiId, namaPeserta) => {
    try {
      const res = await api.get(`/submisi/${submisiId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tugas_${namaPeserta || 'Peserta'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Mengunduh contoh berkas submisi peserta: Tugas_' + (namaPeserta || 'Peserta') + '.pdf');
    }
  };

  // USE CASE 3 & 4 (Peserta): Kumpulkan Tugas & Ubah Submisi
  const handleOpenSubmit = (tugas, e) => {
    if (e) e.stopPropagation();
    const existingSubmisi = tugas.submisi?.[0];
    setUploadCatatan(existingSubmisi?.catatan_peserta || '');
    setUploadFile(null);
    setModalSubmit(tugas);
  };

  const handleKumpulTugas = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Silakan pilih berkas laporan tugas terlebih dahulu.');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    if (uploadCatatan) {
      formData.append('catatan_peserta', uploadCatatan);
    }

    try {
      await api.post(`/tugas/${modalSubmit.id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Tugas magang berhasil dikumpulkan!');
      setModalSubmit(null);
      setUploadFile(null);
      setUploadCatatan('');
      refreshTugas();
    } catch (err) {
      // Tampilkan pesan error yang sebenarnya dari backend
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Gagal mengumpulkan tugas. Silakan coba lagi atau hubungi pembimbing.';
      alert('❌ Gagal: ' + errMsg);
    } finally {
      setUploading(false);
    }
  };

  // Filter list data
  const filteredData = useMemo(() => {
    return daftarTugas.filter((item) => {
      const submisiList = item.submisi || [];
      const submisi = isPeserta ? getParticipantSubmisi(submisiList, user?.id) : submisiList[0];

      const matchSearch =
        !searchQuery ||
        item.judul?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.deskripsi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submisiList.some((s) => s.peserta?.name?.toLowerCase().includes(searchQuery.toLowerCase()));

      const itemKategori = item.kategori || 'Individu';
      const matchKategori = !filterKategori || itemKategori === filterKategori;

      const statusInfo = getStatusSubmisi(submisi, item.deadline);
      const matchStatus = !filterStatus || statusInfo.label.includes(filterStatus);

      return matchSearch && matchKategori && matchStatus;
    });
  }, [daftarTugas, searchQuery, filterKategori, filterStatus, isPeserta, user?.id]);

  // Ringkasan statistik tugas untuk kartu metrik
  const stats = useMemo(() => {
    const total = daftarTugas.length;
    let belumDikerjakan = 0;
    let menungguReview = 0;
    let selesai = 0;
    const nilaiList = [];

    daftarTugas.forEach((tugas) => {
      const submisiList = tugas.submisi || [];
      const mySub = isPeserta ? getParticipantSubmisi(submisiList, user?.id) : null;

      if (isPeserta) {
        if (!mySub) {
          belumDikerjakan++;
        } else if (mySub.status === 'sudah_dinilai') {
          selesai++;
          if (mySub.nilai !== null && mySub.nilai !== undefined && mySub.nilai !== '') {
            nilaiList.push(Number(mySub.nilai));
          }
        } else {
          menungguReview++;
        }
      } else {
        if (submisiList.length === 0) {
          belumDikerjakan++;
        } else {
          const allGraded = submisiList.every((s) => s.status === 'sudah_dinilai');
          if (allGraded) {
            selesai++;
          } else {
            menungguReview++;
          }
        }
      }
    });

    const rataRata = nilaiList.length
      ? (nilaiList.reduce((acc, n) => acc + n, 0) / nilaiList.length).toFixed(1)
      : null;

    return { total, belumDikerjakan, menungguReview, selesai, rataRata };
  }, [daftarTugas, isPeserta, user?.id]);

  if (!user) {
    return <Login />;
  }

  return (
    <div className={`layout ${isPeserta ? "participant-panel" : ""}`} style={{ background: "#f8fafc", minHeight: "100vh" }}>
      {/* SIDEBAR */}
      <Sidebar onLogout={handleLogout} />

      {/* MAIN CONTENT AREA */}
      <div className="content">
        {/* TOPBAR */}
        {!isPeserta && <TopNavbar user={user} isConnected={isBackendConnected} />}

        {/* CONTENT BODY */}
        <main className="main participant-page-container">
          {/* Page Heading & Subtitle */}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: "#6366f1", marginRight: "6px" }}></span>
                PENUGASAN MAGANG
              </div>
              <h1>Data Tugas Magang</h1>
              <p className="subtitle">
                {isPeserta
                  ? 'Lihat daftar tugas magang dan kumpulkan berkas laporan Anda sebelum deadline.'
                  : isAdmin
                  ? 'Kelola tugas magang: buat, ubah, dan hapus tugas serta pantau status pengumpulan peserta.'
                  : 'Kelola tugas magang, unduh berkas submisi peserta, serta berikan penilaian dan feedback.'}
              </p>
            </div>

            {/* USE CASE 1 (Hanya Pembimbing): Buat Tugas */}
            {isPembimbing && (
              <button className="btn-primary" onClick={handleOpenCreateTugas}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Buat Tugas Baru</span>
              </button>
            )}
          </div>

          {/* Metric Overview Cards Grid */}
          <div className="task-overview-grid">
            {/* 1. Total Tugas */}
            <div
              className={`task-metric-card ${filterStatus === '' ? 'active' : ''}`}
              onClick={() => setFilterStatus('')}
              title="Tampilkan semua tugas"
            >
              <div className="task-metric-icon indigo">
                <BookOpen size={22} />
              </div>
              <div className="task-metric-content">
                <span className="task-metric-num">{stats.total}</span>
                <span className="task-metric-label">Total Tugas</span>
                <span className="task-metric-sub">
                  {isPeserta ? 'Diberikan pembimbing' : 'Seluruh tugas magang'}
                </span>
              </div>
            </div>

            {/* 2. Belum Dikerjakan */}
            <div
              className={`task-metric-card ${filterStatus === 'Belum Dikerjakan' ? 'active' : ''}`}
              onClick={() => setFilterStatus(filterStatus === 'Belum Dikerjakan' ? '' : 'Belum Dikerjakan')}
              title="Filter tugas yang belum dikerjakan"
            >
              <div className="task-metric-icon amber">
                <AlertCircle size={22} />
              </div>
              <div className="task-metric-content">
                <span className="task-metric-num" style={{ color: '#d97706' }}>{stats.belumDikerjakan}</span>
                <span className="task-metric-label">Belum Dikerjakan</span>
                <span className="task-metric-sub">
                  {isPeserta ? 'Menunggu pengerjaan' : 'Belum mengumpulkan'}
                </span>
              </div>
            </div>

            {/* 3. Menunggu Review */}
            <div
              className={`task-metric-card ${filterStatus === 'Menunggu' ? 'active' : ''}`}
              onClick={() => setFilterStatus(filterStatus === 'Menunggu' ? '' : 'Menunggu')}
              title="Filter tugas yang menunggu review"
            >
              <div className="task-metric-icon blue">
                <Clock size={22} />
              </div>
              <div className="task-metric-content">
                <span className="task-metric-num" style={{ color: '#2563eb' }}>{stats.menungguReview}</span>
                <span className="task-metric-label">Menunggu Review</span>
                <span className="task-metric-sub">
                  {isPeserta ? 'Terkirim & dievaluasi' : 'Perlu dinilai pembimbing'}
                </span>
              </div>
            </div>

            {/* 4. Selesai / Dinilai */}
            <div
              className={`task-metric-card ${filterStatus === 'Disetujui' ? 'active' : ''}`}
              onClick={() => setFilterStatus(filterStatus === 'Disetujui' ? '' : 'Disetujui')}
              title="Filter tugas yang sudah selesai / dinilai"
            >
              <div className="task-metric-icon green">
                <CheckCircle2 size={22} />
              </div>
              <div className="task-metric-content">
                <span className="task-metric-num" style={{ color: '#16a34a' }}>{stats.selesai}</span>
                <span className="task-metric-label">Selesai & Dinilai</span>
                <span className="task-metric-sub">
                  {isPeserta
                    ? (stats.rataRata ? `Rata-rata Nilai: ${stats.rataRata}` : 'Telah dinilai pembimbing')
                    : 'Selesai dievaluasi'}
                </span>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="filter-card">
            <div className="search-input-wrapper">
              <Search className="search-icon-inside" size={17} />
              <input
                type="text"
                className="search-input"
                placeholder="Cari judul tugas, kata kunci, atau deskripsi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Hapus pencarian"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <select
              className="filter-select"
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
            >
              <option value="">Semua Kategori</option>
              <option value="Individu">Individu</option>
              <option value="Kelompok">Kelompok</option>
            </select>

            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="Belum Dikerjakan">Belum Dikerjakan</option>
              <option value="Menunggu">Menunggu Review</option>
              <option value="Disetujui">Disetujui / Selesai</option>
            </select>

            {(searchQuery || filterKategori || filterStatus) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterKategori('');
                  setFilterStatus('');
                }}
                className="btn-reset-filter"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 16px',
                  height: '42px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  border: '1.5px solid #cbd5e1',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 650,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
                title="Reset semua filter"
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Main Data Table Card */}
          <div className="table-card">
            <div className="table-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #f1f5f9', background: '#ffffff', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 38, height: 38, borderRadius: '10px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={19} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#0f172a' }}>Daftar Tugas Magang</h3>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, padding: '2px 9px', borderRadius: '9999px', background: '#eef2ff', color: '#4f46e5' }}>
                      {filteredData.length} Data
                    </span>
                  </div>
                  {(searchQuery || filterKategori || filterStatus) && (
                    <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                      Filter: {searchQuery && `"${searchQuery}" `}{filterKategori && `[${filterKategori}] `}{filterStatus && `[${filterStatus}]`}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={refreshTugas}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 650,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.borderColor = '#c7d2fe'; e.currentTarget.style.color = '#4338ca'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
                title="Segarkan data dari server"
              >
                <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                <span>{loading ? 'Memuat...' : 'Segarkan'}</span>
              </button>
            </div>

            <div className="table-responsive">
              <table className="enterprise-table task-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                    <th style={{ minWidth: '240px' }}>{isPeserta ? 'JUDUL TUGAS & PESERTA' : 'JUDUL TUGAS'}</th>
                    <th style={{ width: '120px' }}>KATEGORI</th>
                    <th style={{ width: '190px', whiteSpace: 'nowrap' }}>BATAS WAKTU (DEADLINE)</th>
                    <th style={{ width: '175px' }}>{isPeserta ? 'STATUS TUGAS' : 'STATUS SUBMISI'}</th>
                    <th style={{ width: '230px', textAlign: 'right' }}>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '52px 20px', color: '#64748b' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>Memuat data penugasan magang...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: 0 }}>
                        <div className="empty-state-modern">
                          <div className="empty-state-icon-circle">
                            <FileText size={26} color="#6366f1" />
                          </div>
                          <h4>Belum Ada Tugas Magang</h4>
                          <p style={{ maxWidth: '420px', margin: '0 auto 16px' }}>
                            {taskLoadError || (
                              searchQuery || filterKategori || filterStatus
                                ? 'Tidak ada data tugas yang sesuai dengan filter pencarian Anda saat ini.'
                                : 'Tugas magang yang diberikan oleh pembimbing akan muncul di daftar ini.'
                            )}
                          </p>
                          {(searchQuery || filterKategori || filterStatus) && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery('');
                                setFilterKategori('');
                                setFilterStatus('');
                              }}
                              className="action-btn"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <RotateCcw size={13} />
                              <span>Hapus Semua Filter</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((tugas, index) => {
                      const submisiList = tugas.submisi || [];
                      const submisi = isPeserta ? getParticipantSubmisi(submisiList, user?.id) : submisiList[0];
                      const statusInfo = getStatusSubmisi(submisi, tugas.deadline);
                      const deadlineInfo = formatDeadlineInfo(tugas.deadline);
                      const deadlineFormatted = formatTanggal(tugas.deadline);
                      const tanggalSubmit = submisi?.tanggal_submit ? formatTanggal(submisi.tanggal_submit) : null;

                      return (
                        <tr key={tugas.id}>
                          {/* Col 1: # */}
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: '#f1f5f9', color: '#64748b', fontSize: '12px', fontWeight: 700 }}>
                              {index + 1}
                            </span>
                          </td>

                          {/* Col 2: Judul Tugas & Info */}
                          <td>
                            <div className="col-title-wrap">
                              <span className="item-main-title" style={{ fontSize: '14.5px', fontWeight: 750, color: '#0f172a' }}>
                                {tugas.judul}
                              </span>
                              {isPeserta ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#6366f1', fontWeight: 600 }}>
                                    <User size={13} />
                                    <span>{user.name} (Anda)</span>
                                  </span>
                                  <span style={{ color: '#cbd5e1' }}>•</span>
                                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                                    {user.institusi || 'Peserta Magang'}
                                  </span>
                                </div>
                              ) : (
                                <span className="item-subtitle" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                                  <Users size={12} color="#6366f1" />
                                  <span>{submisiList.length > 0 ? `${submisiList.length} Peserta Telah Mengumpulkan` : 'Belum ada peserta mengumpulkan'}</span>
                                </span>
                              )}
                              {tugas.deskripsi && (
                                <p style={{ margin: '4px 0 0 0', fontSize: '11.5px', color: '#94a3b8', lineHeight: 1.4, maxWidth: '420px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {tugas.deskripsi}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Col 3: Kategori */}
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                borderRadius: '9999px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                background: tugas.kategori === 'Kelompok' ? '#f5f3ff' : '#eef2ff',
                                color: tugas.kategori === 'Kelompok' ? '#7c3aed' : '#4f46e5',
                                border: `1px solid ${tugas.kategori === 'Kelompok' ? '#ddd6fe' : '#c7d2fe'}`
                              }}
                            >
                              {tugas.kategori === 'Kelompok' ? <Users size={12} /> : <User size={12} />}
                              <span>{tugas.kategori || 'Individu'}</span>
                            </span>
                          </td>

                          {/* Col 4: Batas Waktu / Deadline */}
                          <td>
                            <div className="date-cell">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Calendar size={13} style={{ color: '#6366f1', flexShrink: 0 }} />
                                <span className="date-main">{deadlineFormatted.date}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#64748b' }}>
                                <Clock size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                <span>{deadlineFormatted.time}</span>
                              </div>
                              {deadlineInfo && (
                                <span className={`deadline-chip ${deadlineInfo.badgeType}`}>
                                  {deadlineInfo.badgeType === 'danger' ? <AlertCircle size={10} /> : <Clock size={10} />}
                                  <span>{deadlineInfo.badgeText}</span>
                                </span>
                              )}
                              {isPeserta && tanggalSubmit && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10.5px', fontWeight: 600, color: '#166534', background: '#dcfce7', padding: '1px 7px', borderRadius: '4px', marginTop: '3px', width: 'fit-content' }}>
                                  ✓ Diserahkan: {tanggalSubmit.date}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Col 5: Status Tugas */}
                          <td>
                            {isPeserta ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                <span className={`badge-status-dot ${statusInfo.className}`}>
                                  <span className="dot"></span>
                                  <span>{statusInfo.label}</span>
                                </span>
                                {submisi?.nilai !== null && submisi?.nilai !== undefined && submisi?.nilai !== '' && (
                                  <div
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      background: '#eef2ff',
                                      color: '#3730a3',
                                      padding: '3px 9px',
                                      borderRadius: '6px',
                                      fontSize: '11.5px',
                                      fontWeight: 700,
                                      border: '1px solid #c7d2fe'
                                    }}
                                  >
                                    <Award size={12} color="#4f46e5" />
                                    <span>Nilai: {submisi.nilai} ({formatNilaiAkhir(submisi.nilai).short})</span>
                                  </div>
                                )}
                                {submisi?.feedback && (
                                  <span
                                    title={submisi.feedback}
                                    style={{
                                      fontSize: '11px',
                                      color: '#475569',
                                      maxWidth: '170px',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    💬 "{submisi.feedback}"
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                                <span className={`badge-status-dot ${submisiList.length > 0 ? 'approved' : 'unsubmitted'}`}>
                                  <span className="dot"></span>
                                  <span>{submisiList.length > 0 ? `${submisiList.length} Submisi Masuk` : 'Belum Ada Submisi'}</span>
                                </span>
                                {hitungTerlambat(submisiList, tugas.deadline) > 0 && (
                                  <span className="badge-status-dot late">
                                    <span className="dot"></span>
                                    <span>{hitungTerlambat(submisiList, tugas.deadline)} Terlambat</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Col 6: Aksi */}
                          <td className="task-actions-cell" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div className="table-action-group task-action-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                              {/* Detail Button */}
                              <button
                                type="button"
                                className="action-btn"
                                onClick={() => setModalDetail(tugas)}
                                title="Lihat Detail Instruksi Tugas"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '7px 14px',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: 650,
                                  border: '1.5px solid #cbd5e1',
                                  background: '#ffffff',
                                  color: '#334155',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  whiteSpace: 'nowrap'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.background = '#f8fafc'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#ffffff'; }}
                              >
                                <Eye size={13} color="#6366f1" />
                                <span>Detail</span>
                              </button>

                              {/* Admin & Pembimbing: Lihat Submisi */}
                              {isAdminOrPembimbing && (
                                <button
                                  type="button"
                                  className="action-btn btn-review-action"
                                  onClick={() => setModalSubmisiList(tugas)}
                                  title="Lihat Daftar Submisi Masuk Peserta"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 650, whiteSpace: 'nowrap' }}
                                >
                                  <FileText size={13} color="#2563eb" />
                                  <span>Submisi ({submisiList.length})</span>
                                </button>
                              )}

                              {/* Pembimbing: Nilai */}
                              {isPembimbing && (
                                <button
                                  type="button"
                                  className="action-btn btn-nilai-action"
                                  onClick={(e) => handleOpenNilai(tugas, submisi, e)}
                                  title="Beri Nilai & Evaluasi Tugas"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 650, whiteSpace: 'nowrap' }}
                                >
                                  <Award size={13} color="#16a34a" />
                                  <span>Nilai</span>
                                </button>
                              )}

                              {/* Peserta: Lihat Nilai (jika sudah dinilai) atau Kumpulkan / Ubah */}
                              {isPeserta && submisi?.status === 'sudah_dinilai' ? (
                                <button
                                  type="button"
                                  className="action-btn"
                                  onClick={() => setModalDetail(tugas)}
                                  title="Lihat Nilai & Feedback Pembimbing"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '7px 14px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                                    border: 'none',
                                    color: '#ffffff',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <Award size={13} />
                                  <span>Lihat Nilai</span>
                                </button>
                              ) : isPeserta && (
                                <button
                                  type="button"
                                  className="action-btn btn-submit-action"
                                  onClick={(e) => handleOpenSubmit(tugas, e)}
                                  title={submisi ? 'Ubah Berkas Submisi' : 'Kumpulkan Berkas Tugas'}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '7px 16px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    background: submisi ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    border: 'none',
                                    color: '#ffffff',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.28)',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.1)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
                                >
                                  {submisi ? <Edit3 size={13} /> : <UploadCloud size={13} />}
                                  <span>{submisi ? 'Ubah Tugas' : 'Kumpulkan'}</span>
                                </button>
                              )}

                              {/* Pembimbing: Edit */}
                              {isPembimbing && (
                                <button
                                  type="button"
                                  className="action-btn"
                                  onClick={(e) => handleOpenEditTugas(tugas, e)}
                                  title="Ubah Rincian Tugas"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 650, whiteSpace: 'nowrap' }}
                                >
                                  <Edit3 size={13} color="#475569" />
                                  <span>Edit</span>
                                </button>
                              )}

                              {/* Pembimbing: Hapus */}
                              {isPembimbing && (
                                <button
                                  type="button"
                                  className="action-btn btn-delete-action"
                                  onClick={(e) => handleHapusTugas(tugas.id, e)}
                                  title="Hapus Tugas Magang"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 650, color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2', whiteSpace: 'nowrap' }}
                                >
                                  <Trash2 size={13} />
                                  <span>Hapus</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* ================= MODAL DETAIL TUGAS ================= */}
      {modalDetail && (() => {
        const mySub = isPeserta ? getParticipantSubmisi(modalDetail.submisi, user?.id) : null;
        const deadlineInfo = formatDeadlineInfo(modalDetail.deadline);
        const isKelompok = modalDetail.kategori === 'Kelompok';
        const subStatus = mySub ? getStatusSubmisi(mySub, modalDetail.deadline) : null;
        const gradeInfo = mySub?.nilai !== undefined && mySub?.nilai !== null && mySub?.nilai !== ''
          ? formatNilaiAkhir(mySub.nilai)
          : null;

        return (
          <div
            className="modal-overlay"
            onClick={() => setModalDetail(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              overflowY: 'auto'
            }}
          >
            <div
              className="modal-dialog modal-detail-tugas"
              style={{
                maxWidth: '620px',
                width: '100%',
                maxHeight: '90vh',
                borderRadius: '18px',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
                margin: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="modal-header" style={{ padding: '18px 24px', background: '#ffffff', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.12))',
                    color: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(99, 102, 241, 0.2)'
                  }}>
                    <FileText size={22} />
                  </div>
                  <div>
                    <h3 className="modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      Detail Tugas Magang
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                      Informasi instruksi pengerjaan &amp; status pengumpulan
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-modal-close"
                  onClick={() => setModalDetail(null)}
                  title="Tutup"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    background: '#f1f5f9',
                    color: '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div
                className="modal-body"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  background: '#f8fafc',
                  overflowY: 'auto',
                  flex: 1,
                  maxHeight: 'calc(90vh - 140px)'
                }}
              >
                {/* Judul & Kategori & Deadline Card */}
                <div style={{ background: '#ffffff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: isKelompok ? '#f5f3ff' : '#eef2ff',
                          color: isKelompok ? '#7c3aed' : '#4f46e5',
                          border: isKelompok ? '1px solid #ddd6fe' : '1px solid #c7d2fe'
                        }}
                      >
                        {isKelompok ? <Users size={12} /> : <User size={12} />}
                        Tugas {modalDetail.kategori || 'Individu'}
                      </span>
                    </div>

                    {isPeserta && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: mySub ? (subStatus?.className === 'approved' ? '#f0fdf4' : '#eff6ff') : '#fffbeb',
                          color: mySub ? (subStatus?.className === 'approved' ? '#15803d' : '#1d4ed8') : '#b45309',
                          border: mySub ? (subStatus?.className === 'approved' ? '1px solid #bbf7d0' : '1px solid #bfdbfe') : '1px solid #fde68a'
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: mySub ? (subStatus?.className === 'approved' ? '#16a34a' : '#2563eb') : '#f59e0b'
                          }}
                        />
                        {mySub ? subStatus?.label : 'Belum Dikumpulkan'}
                      </span>
                    )}
                  </div>

                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 14px', lineHeight: '1.35' }}>
                    {modalDetail.judul}
                  </h2>

                  {/* Deadline Card */}
                  {deadlineInfo && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: deadlineInfo.isPast ? '#fef2f2' : '#f8fafc',
                        border: deadlineInfo.isPast ? '1px solid #fecaca' : '1px solid #e2e8f0',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '8px',
                            background: deadlineInfo.isPast ? '#fee2e2' : '#eff6ff',
                            color: deadlineInfo.isPast ? '#ef4444' : '#3b82f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <Clock size={18} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                            Batas Waktu (Deadline)
                          </span>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: deadlineInfo.isPast ? '#b91c1c' : '#1e293b' }}>
                            {deadlineInfo.formattedDate} • {deadlineInfo.formattedTime}
                          </span>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '6px',
                          background: deadlineInfo.isPast
                            ? '#fee2e2'
                            : deadlineInfo.badgeType === 'warning'
                            ? '#fef3c7'
                            : '#eff6ff',
                          color: deadlineInfo.isPast
                            ? '#dc2626'
                            : deadlineInfo.badgeType === 'warning'
                            ? '#b45309'
                            : '#2563eb'
                        }}
                      >
                        {deadlineInfo.badgeText}
                      </span>
                    </div>
                  )}
                </div>

                {/* Deskripsi & Instruksi Pengerjaan */}
                <div style={{ background: '#ffffff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '6px', background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={15} />
                    </div>
                    <h4 style={{ margin: 0, fontSize: '0.84rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Deskripsi &amp; Instruksi Pengerjaan
                    </h4>
                  </div>
                  <div
                    style={{
                      color: '#334155',
                      fontSize: '0.93rem',
                      lineHeight: '1.68',
                      whiteSpace: 'pre-wrap',
                      background: '#f8fafc',
                      padding: '14px 16px',
                      borderRadius: '10px',
                      border: '1px solid #f1f5f9'
                    }}
                  >
                    {modalDetail.deskripsi || 'Tidak ada deskripsi tambahan.'}
                  </div>
                </div>

                {/* Status Submisi untuk Peserta */}
                {isPeserta && (
                  <div style={{ background: '#ffffff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: 26, height: 26, borderRadius: '6px', background: mySub ? '#ecfdf5' : '#fffbeb', color: mySub ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {mySub ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                        </div>
                        <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
                          Status Pengumpulan Tugas Anda
                        </h4>
                      </div>
                    </div>

                    {!mySub ? (
                      <div
                        style={{
                          background: 'linear-gradient(135deg, rgba(238, 242, 255, 0.7) 0%, rgba(245, 243, 255, 0.7) 100%)',
                          border: '1.5px dashed #c7d2fe',
                          borderRadius: '12px',
                          padding: '16px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '14px',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: 40, height: 40, borderRadius: '10px', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <UploadCloud size={20} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', marginBottom: '2px' }}>
                              Anda Belum Mengumpulkan Tugas Ini
                            </div>
                            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                              Segera unggah berkas tugas Anda sebelum tenggat waktu berakhir.
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn-save-primary"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '9px 18px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.86rem',
                            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                            cursor: 'pointer'
                          }}
                          onClick={() => { setModalDetail(null); setModalSubmit(modalDetail); }}
                        >
                          <UploadCloud size={16} />
                          Kumpulkan Sekarang
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Status bar */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Status:</span>
                            <span className={`badge-status-dot ${subStatus?.className}`}>
                              <span className="dot" />
                              {subStatus?.label}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                            <Clock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            Submit: {new Date(mySub.tanggal_submit).toLocaleString('id-ID')}
                          </div>
                        </div>

                        {/* Nilai & Feedback jika sudah dinilai */}
                        {gradeInfo && (
                          <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', padding: '14px 16px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: mySub.feedback || mySub.penilai || mySub.tanggal_dinilai ? '8px' : 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Award size={18} color="#16a34a" />
                                <strong style={{ fontSize: '0.94rem', color: '#166534' }}>
                                  Nilai Tugas: {mySub.nilai} — {gradeInfo.label}
                                </strong>
                              </div>
                              {(mySub.penilai?.name || mySub.tanggal_dinilai) && (
                                <span style={{ fontSize: '0.76rem', color: '#15803d', fontWeight: 600 }}>
                                  {mySub.penilai?.name ? `Dinilai oleh ${mySub.penilai.name}` : ''}
                                  {mySub.penilai?.name && mySub.tanggal_dinilai ? ' • ' : ''}
                                  {mySub.tanggal_dinilai ? new Date(mySub.tanggal_dinilai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                                </span>
                              )}
                            </div>
                            {mySub.feedback && (
                              <div style={{ fontSize: '0.88rem', color: '#14532d', background: 'rgba(255,255,255,0.7)', padding: '10px 12px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                                <span style={{ fontWeight: 600 }}>Feedback Pembimbing:</span> "{mySub.feedback}"
                              </div>
                            )}
                          </div>
                        )}

                        {/* Catatan Peserta */}
                        {mySub.catatan_peserta && (
                          <div style={{ fontSize: '0.86rem', color: '#475569', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <strong style={{ color: '#1e293b' }}>Catatan Anda:</strong> "{mySub.catatan_peserta}"
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn-search"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '0.86rem', fontWeight: 600 }}
                            onClick={() => handleDownloadSubmisi(mySub.id, user.name)}
                          >
                            <Download size={15} />
                            Unduh Berkas Saya
                          </button>
                          {mySub.status !== 'sudah_dinilai' && (
                            <button
                              type="button"
                              className="action-btn btn-submit-action"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '0.86rem', fontWeight: 600 }}
                              onClick={() => { setModalDetail(null); setModalSubmit(modalDetail); }}
                            >
                              <Edit3 size={15} />
                              Ubah Submisi
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Info Submisi untuk Admin & Pembimbing */}
                {isAdminOrPembimbing && (
                  <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                          {(modalDetail.submisi || []).length} Peserta Telah Mengumpulkan
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Periksa dan berikan penilaian berkas tugas peserta
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="action-btn btn-review-action"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}
                      onClick={() => { setModalDetail(null); setModalSubmisiList(modalDetail); }}
                    >
                      <Users size={15} />
                      Lihat Semua Submisi
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="modal-footer" style={{ padding: '14px 24px', background: '#ffffff', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600 }}
                  onClick={() => setModalDetail(null)}
                >
                  Tutup
                </button>
                {isPeserta && !mySub && (
                  <button
                    type="button"
                    className="btn-save-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600 }}
                    onClick={() => { setModalDetail(null); setModalSubmit(modalDetail); }}
                  >
                    <UploadCloud size={15} />
                    Kumpulkan Tugas
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= MODAL LIHAT DAFTAR SUBMISI (ADMIN & PEMBIMBING) ================= */}
      {modalSubmisiList && (
        <div className="modal-overlay" onClick={() => setModalSubmisiList(null)}>
          <div className="modal-dialog" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Daftar Submisi Masuk</h3>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Tugas: <strong>{modalSubmisiList.judul}</strong>
                </span>
              </div>
              <button className="btn-modal-close" onClick={() => setModalSubmisiList(null)}>✕</button>
            </div>
            <div className="modal-body">
              {(modalSubmisiList.submisi || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                  <div>Belum ada peserta yang mengumpulkan tugas ini.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {(modalSubmisiList.submisi || []).map((sub, i) => (
                    <div
                      key={sub.id || i}
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '0.96rem', color: '#0f172a' }}>
                            {sub.peserta?.name || 'Peserta Magang'}
                          </strong>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {sub.peserta?.instansi || 'Universitas Indonesia'} &bull; Dikumpulkan pada: {new Date(sub.tanggal_submit).toLocaleString('id-ID')}
                          </div>
                        </div>
                        <span className={`badge-status-dot ${getStatusSubmisi(sub, modalSubmisiList.deadline).className}`}>
                          <span className="dot"></span>
                          {getStatusSubmisi(sub, modalSubmisiList.deadline).label}
                        </span>
                      </div>

                      {sub.catatan_peserta && (
                        <div style={{ fontSize: '0.85rem', color: '#475569', backgroundColor: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <strong>Catatan Peserta:</strong> "{sub.catatan_peserta}"
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px dashed #e2e8f0', paddingTop: '10px' }}>
                        <div>
                          <span style={{ fontSize: '0.82rem', color: '#64748b', marginRight: '8px' }}>Nilai:</span>
                          <span className={`badge-score-pill ${formatNilaiAkhir(sub.nilai).className}`}>
                            {formatNilaiAkhir(sub.nilai).label} ({sub.nilai ?? '0'}/100)
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          {/* Unduh File Submisi - hanya Pembimbing */}
                          {user?.role === 'pembimbing' && (
                            <button
                              className="action-btn"
                              onClick={() => handleDownloadSubmisi(sub.id, sub.peserta?.name)}
                              title="Unduh Berkas Peserta"
                            >
                              📥 Unduh Berkas
                            </button>
                          )}

                          {/* Beri Nilai & Feedback - hanya Pembimbing */}
                          {user?.role === 'pembimbing' && (
                            <button
                              className="action-btn btn-nilai-action"
                              onClick={(e) => {
                                setModalSubmisiList(null);
                                handleOpenNilai(modalSubmisiList, sub, e);
                              }}
                            >
                              ⭐ {sub.status === 'sudah_dinilai' ? 'Ubah Nilai' : 'Beri Nilai'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModalSubmisiList(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL BERI NILAI & FEEDBACK (HANYA PEMBIMBING) ================= */}
      {modalNilai && (
        <div className="modal-overlay" onClick={() => setModalNilai(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Penilaian &amp; Feedback Tugas</h3>
              <button className="btn-modal-close" onClick={() => setModalNilai(null)}>✕</button>
            </div>
            <form onSubmit={handleSimpanNilai}>
              <div className="modal-body">
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                    {modalNilai.tugas.judul}
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                    Peserta: <strong>{modalNilai.submisi?.peserta?.name || 'Peserta Magang'}</strong>
                  </p>
                </div>

                {!modalNilai.submisi ? (
                  <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '14px', borderRadius: '10px', color: '#b45309', fontSize: '0.88rem' }}>
                    ⚠️ Belum ada berkas yang dikumpulkan peserta untuk tugas ini.
                  </div>
                ) : (
                  <>
                    <div className="form-field-group">
                      <label className="form-field-label">Skor Nilai Akhir (0 - 100)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="form-control-input"
                          style={{ width: '120px' }}
                          placeholder="85"
                          value={inputNilai}
                          onChange={(e) => setInputNilai(e.target.value)}
                          required
                        />
                        <span className={`badge-score-pill ${formatNilaiAkhir(inputNilai).className}`}>
                          Predikat: {formatNilaiAkhir(inputNilai).label}
                        </span>
                      </div>
                    </div>

                    <div className="form-field-group">
                      <label className="form-field-label">Catatan &amp; Feedback Evaluasi</label>
                      <textarea
                        className="form-control-textarea"
                        placeholder="Tuliskan evaluasi pengerjaan, poin perbaikan, atau catatan apresiasi untuk peserta magang..."
                        value={inputFeedback}
                        onChange={(e) => setInputFeedback(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModalNilai(null)}>
                  Batal
                </button>
                {modalNilai.submisi && (
                  <button type="submit" className="btn-save-primary" disabled={savingNilai}>
                    {savingNilai ? 'Menyimpan...' : 'Simpan Nilai & Feedback'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL BUAT / UBAH TUGAS (ADMIN & PEMBIMBING) ================= */}
      {modalFormTugas && (
        <div className="modal-overlay" onClick={() => setModalFormTugas(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalFormTugas.id ? 'Ubah Tugas Magang' : 'Buat Tugas Magang Baru'}
              </h3>
              <button className="btn-modal-close" onClick={() => setModalFormTugas(null)}>✕</button>
            </div>
            <form className="task-form" onSubmit={handleSimpanTugas}>
              <div className="modal-body">
                <div className="form-field-group">
                  <label className="form-field-label">Judul Tugas</label>
                  <input
                    type="text"
                    className="form-control-input"
                    placeholder="Contoh: Buat Tugas Magang Baru"
                    value={formTugasData.judul}
                    onChange={(e) => setFormTugasData({ ...formTugasData, judul: e.target.value })}
                    required
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">Kategori</label>
                  <select
                    className="form-control-select"
                    value={formTugasData.kategori}
                    onChange={(e) => setFormTugasData({ ...formTugasData, kategori: e.target.value })}
                  >
                    <option value="Individu">Individu</option>
                    <option value="Kelompok">Kelompok</option>
                  </select>
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">Batas Waktu (Deadline)</label>
                  <input
                    type="datetime-local"
                    className="form-control-input"
                    value={formTugasData.deadline}
                    onChange={(e) => setFormTugasData({ ...formTugasData, deadline: e.target.value })}
                    required
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">Deskripsi &amp; Instruksi Pengerjaan</label>
                  <textarea
                    className="form-control-textarea"
                    placeholder="Tuliskan petunjuk pengerjaan tugas secara rinci dan jelas..."
                    value={formTugasData.deskripsi}
                    onChange={(e) => setFormTugasData({ ...formTugasData, deskripsi: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModalFormTugas(null)}>
                  Batal
                </button>
                <button type="submit" className="btn-save-primary" disabled={savingTugas}>
                  {savingTugas ? 'Menyimpan...' : modalFormTugas.id ? 'Simpan Perubahan' : 'Terbitkan Tugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL KUMPUL / UBAH SUBMISI (PESERTA) ================= */}
      {modalSubmit && (() => {
        const isEdit = Boolean(modalSubmit.submisi?.[0]);
        const deadlineInfo = formatDeadlineInfo(modalSubmit.deadline);
        const isKelompok = modalSubmit.kategori === 'Kelompok';

        return (
          <div
            className="modal-overlay"
            onClick={() => setModalSubmit(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              overflowY: 'auto'
            }}
          >
            <div
              className="modal-dialog"
              style={{
                maxWidth: '600px',
                width: '100%',
                maxHeight: '90vh',
                borderRadius: '18px',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
                margin: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="modal-header"
                style={{
                  padding: '18px 24px',
                  background: '#ffffff',
                  borderBottom: '1px solid #f1f5f9',
                  flexShrink: 0
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '12px',
                      background: isEdit
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.12))'
                        : 'linear-gradient(135deg, rgba(79, 70, 229, 0.12), rgba(99, 102, 241, 0.12))',
                      color: isEdit ? '#d97706' : '#4f46e5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isEdit ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(99, 102, 241, 0.25)'
                    }}
                  >
                    <UploadCloud size={22} />
                  </div>
                  <div>
                    <h3 className="modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      {isEdit ? 'Ubah Berkas Submisi Tugas' : 'Kumpulkan Tugas Magang'}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                      {isEdit ? 'Perbarui berkas atau catatan tugas Anda' : 'Unggah berkas hasil pengerjaan tugas Anda'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-modal-close"
                  onClick={() => setModalSubmit(null)}
                  title="Tutup"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    background: '#f1f5f9',
                    color: '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <form
                onSubmit={handleKumpulTugas}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  flex: 1
                }}
              >
                <div
                  className="modal-body"
                  style={{
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px',
                    background: '#f8fafc',
                    overflowY: 'auto',
                    flex: 1,
                    maxHeight: 'calc(90vh - 145px)'
                  }}
                >
                  {/* Task Info Card */}
                  <div
                    style={{
                      background: '#ffffff',
                      padding: '16px 18px',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          background: isKelompok ? '#f5f3ff' : '#eef2ff',
                          color: isKelompok ? '#7c3aed' : '#4f46e5',
                          border: isKelompok ? '1px solid #ddd6fe' : '1px solid #c7d2fe'
                        }}
                      >
                        {isKelompok ? <Users size={12} /> : <User size={12} />}
                        Tugas {modalSubmit.kategori || 'Individu'}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', lineHeight: '1.35' }}>
                      {modalSubmit.judul}
                    </h4>

                    {deadlineInfo && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: deadlineInfo.isPast ? '#fef2f2' : '#f8fafc',
                          border: deadlineInfo.isPast ? '1px solid #fecaca' : '1px solid #f1f5f9',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Clock size={16} color={deadlineInfo.isPast ? '#ef4444' : '#64748b'} />
                          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: deadlineInfo.isPast ? '#b91c1c' : '#334155' }}>
                            Tenggat: {deadlineInfo.formattedDate} • {deadlineInfo.formattedTime}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '5px',
                            background: deadlineInfo.isPast ? '#fee2e2' : '#eff6ff',
                            color: deadlineInfo.isPast ? '#dc2626' : '#2563eb'
                          }}
                        >
                          {deadlineInfo.badgeText}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* File Upload Dropzone */}
                  <div
                    style={{
                      background: '#ffffff',
                      padding: '18px 20px',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                      Pilih Berkas Tugas <span style={{ color: '#ef4444' }}>*</span>
                    </label>

                    {!uploadFile ? (
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          if (e.dataTransfer.files?.[0]) {
                            setUploadFile(e.dataTransfer.files[0]);
                          }
                        }}
                        style={{
                          position: 'relative',
                          border: isDragging ? '2px dashed #4f46e5' : '2px dashed #cbd5e1',
                          borderRadius: '12px',
                          padding: '26px 20px',
                          textAlign: 'center',
                          background: isDragging ? 'rgba(99, 102, 241, 0.05)' : '#f8fafc',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.zip,.rar,.jpg,.jpeg,.png"
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                          required={!isEdit}
                          style={{
                            opacity: 0,
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            cursor: 'pointer'
                          }}
                        />
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: '#e0e7ff',
                            color: '#4f46e5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 10px'
                          }}
                        >
                          <UploadCloud size={24} />
                        </div>
                        <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                          Klik untuk memilih berkas atau seret ke sini
                        </div>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                          Format didukung: <strong>PDF, DOCX, DOC, ZIP, RAR, JPG, PNG</strong> (Maksimal 5 MB)
                        </p>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          padding: '14px 16px',
                          borderRadius: '12px',
                          background: '#f0fdf4',
                          border: '1.5px solid #86efac'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <div
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: '10px',
                              background: '#dcfce7',
                              color: '#16a34a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <FileText size={22} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '0.92rem',
                                fontWeight: 700,
                                color: '#14532d',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                              title={uploadFile.name}
                            >
                              {uploadFile.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#166534', marginTop: '2px' }}>
                              <span>{formatFileSize(uploadFile.size)}</span>
                              <span>•</span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                                <CheckCircle2 size={12} color="#16a34a" /> Siap diunggah
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setUploadFile(null)}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #bbf7d0',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: '#dc2626',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                        >
                          Ganti Berkas
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Catatan Peserta Textarea */}
                  <div
                    style={{
                      background: '#ffffff',
                      padding: '18px 20px',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label htmlFor="modal-submit-catatan" style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1e293b' }}>
                        Catatan Tambahan
                      </label>
                      <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 500 }}>
                        Opsional
                      </span>
                    </div>

                    <textarea
                      id="modal-submit-catatan"
                      placeholder="Tuliskan catatan pengerjaan, ringkasan, atau tautan repositori (GitHub / Google Drive)..."
                      value={uploadCatatan}
                      onChange={(e) => setUploadCatatan(e.target.value)}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.9rem',
                        fontFamily: 'inherit',
                        lineHeight: '1.5',
                        resize: 'vertical',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.12)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                    <span style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
                      💡 Catatan ini akan terbaca oleh pembimbing saat melakukan pemeriksaan dan penilaian berkas tugas Anda.
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="modal-footer"
                  style={{
                    padding: '16px 24px',
                    background: '#ffffff',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    flexShrink: 0
                  }}
                >
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '9px 18px', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600 }}
                    onClick={() => setModalSubmit(null)}
                    disabled={uploading}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn-save-primary"
                    disabled={uploading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 20px',
                      borderRadius: '8px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                      cursor: uploading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {uploading ? (
                      <>
                        <div style={{ width: 14, height: 14, border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={16} />
                        <span>{isEdit ? 'Simpan Perubahan' : 'Kumpulkan Tugas'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default Tugas;
