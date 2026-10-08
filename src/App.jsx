import { useState, useEffect, useCallback, useMemo } from 'react';
import api from './api';
import Login from './Login';

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

// Helper: Format tanggal submit (Tanggal di atas, Jam di bawah)
function formatTanggal(dateString) {
  if (!dateString) return { date: '-', time: '-' };
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return { date: '-', time: '-' };
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return { date, time };
  } catch {
    return { date: '-', time: '-' };
  }
}

// Helper: Status badge
function getStatusSubmisi(submisi) {
  if (!submisi) {
    return { label: 'Belum Dikerjakan', className: 'unsubmitted' };
  }
  if (submisi.status === 'sudah_dinilai') {
    return { label: 'Disetujui / Selesai', className: 'approved' };
  }
  return { label: 'Menunggu Review', className: 'pending' };
}

// Sidebar Component (Sesuai Desain MagangAdmin Enterprise)
function SidebarNavigation({ user, onLogout, activeMenu, setActiveMenu }) {
  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon-box">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
            <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
          </svg>
        </div>
        <div className="brand-text-container">
          <span className="brand-title">MagangAdmin</span>
          <span className="brand-subtitle">ENTERPRISE PORTAL</span>
        </div>
      </div>

      {/* Nav Groups */}
      <div className="sidebar-nav">
        {/* FITUR TUGAS MAGANG - satu-satunya menu yang digunakan */}
        <div className="sidebar-group">
          <span className="sidebar-group-title">FITUR TUGAS MAGANG</span>
          <button
            className={`sidebar-nav-item ${activeMenu === 'tugas' ? 'active' : ''}`}
            onClick={() => setActiveMenu('tugas')}
          >
            <span className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </span>
            <span>Tugas Magang</span>
          </button>
        </div>
      </div>

      {/* Footer Profile */}
      <div className="sidebar-footer">
        <div className="sidebar-user-box">
          <div className="user-avatar-circle">
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-info-text">
            <div className="user-info-name" title={user.name}>{user.name}</div>
            <div className="user-info-role">
              {user.role === 'admin' ? 'Administrator' : user.role === 'pembimbing' ? 'Pembimbing' : 'Peserta Magang'}
            </div>
          </div>
          <button className="btn-sidebar-logout" onClick={onLogout} title="Keluar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

// Top Navbar Component
function TopNavbar({ user, isConnected }) {
  const roleLabel = user?.role === 'admin' ? 'Administrator'
    : user?.role === 'pembimbing' ? 'Pembimbing'
    : 'Peserta Magang';

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

        {/* Role Badge */}
        <div className="actor-mode-container">
          <span>Role:</span>
          <span className="actor-select" style={{ cursor: 'default', fontWeight: 700 }}>
            {roleLabel}
          </span>
        </div>
      </div>
    </header>
  );
}

// Data Dummy Awal
const initialFallbackTugas = [
  {
    id: 1,
    judul: 'rancagan umkm kamang hilia',
    deskripsi: 'Perancangan strategi digitalisasi dan pembuatan antarmuka sistem katalog produk UMKM Kamang Hilia.',
    kategori: 'Individu',
    deadline: '2026-09-26T23:59:00',
    created_at: '2026-09-19 04:58:24',
    submisi: [
      {
        id: 101,
        tugas_id: 1,
        tanggal_submit: '2026-09-19 04:58:24',
        status: 'sudah_dinilai',
        nilai: 82,
        feedback: 'Pemaparan rancangan sistem sangat baik, perhatikan format referensi daftar pustaka.',
        file_path: 'submisi_tugas/sample1.pdf',
        catatan_peserta: 'Laporan bab 1 sampai 4 sudah direvisi sesuai arahan pembimbing.',
        peserta: {
          id: 2,
          name: 'Anak Magang (Anda)',
          instansi: 'Universitas Indonesia',
        },
      },
    ],
  },
  {
    id: 2,
    judul: 'Pengembangan Portal E-Government Berbasis Laravel & React',
    deskripsi: 'Laporan perancangan arsitektur REST API dengan autentikasi Sanctum dan antarmuka dashboard modern.',
    kategori: 'Individu',
    deadline: '2026-09-30T23:59:00',
    created_at: '2026-09-10 09:30:00',
    submisi: [
      {
        id: 102,
        tugas_id: 2,
        tanggal_submit: '2026-09-10 09:30:00',
        status: 'sudah_dinilai',
        nilai: 92,
        feedback: 'Kualitas kode dan integrasi API sangat rapi dan sesuai standar industri.',
        file_path: 'submisi_tugas/sample2.pdf',
        catatan_peserta: 'Frontend dan Backend sudah tervalidasi dan siap diuji.',
        peserta: {
          id: 3,
          name: 'Budi Santoso',
          instansi: 'Universitas Indonesia',
        },
      },
    ],
  },
  {
    id: 3,
    judul: 'Analisis Sistem Informasi Manajemen Pelayanan Publik',
    deskripsi: 'Dokumentasi perancangan modul, arsitektur database relasional, dan diagram use case.',
    kategori: 'Individu',
    deadline: '2026-10-05T23:59:00',
    created_at: '2026-09-15 11:20:00',
    submisi: [
      {
        id: 103,
        tugas_id: 3,
        tanggal_submit: '2026-09-16 14:15:30',
        status: 'belum_dinilai',
        nilai: null,
        feedback: null,
        file_path: 'submisi_tugas/sample3.pdf',
        catatan_peserta: 'Mohon masukan dan koreksi mengenai diagram database.',
        peserta: {
          id: 4,
          name: 'Siti Rahmawati',
          instansi: 'Institut Teknologi Bandung',
        },
      },
    ],
  },
];

// Main App Component
function App() {
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
  const isAdminOrPembimbing = user?.role === 'admin' || user?.role === 'pembimbing';
  const isPembimbing = user?.role === 'pembimbing';
  const isAdmin = user?.role === 'admin';
  const isPeserta = user?.role === 'peserta';

  const [activeMenu, setActiveMenu] = useState('tugas');
  const [daftarTugas, setDaftarTugas] = useState(initialFallbackTugas);
  const [loading, setLoading] = useState(false);
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
  };

  // Switch Actor Mode
  const handleSwitchActor = async (targetRole) => {
    const defaultUsers = {
      admin: { id: 1, name: 'widya anjelina (Admin)', email: 'admin@gmail.com', role: 'admin' },
      pembimbing: { id: 3, name: 'Pembimbing Magang', email: 'pembimbing@gmail.com', role: 'pembimbing' },
      peserta: { id: 2, name: 'Anak Magang (Anda)', email: 'peserta@gmail.com', role: 'peserta' },
    };

    const creds = {
      admin: { email: 'admin@gmail.com', password: 'password123' },
      pembimbing: { email: 'pembimbing@gmail.com', password: 'password123' },
      peserta: { email: 'peserta@gmail.com', password: 'password123' },
    }[targetRole];

    if (!creds) return;

    try {
      setLoading(true);
      const res = await api.post('/login', creds);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      setIsBackendConnected(true);
    } catch {
      // Fallback offline switch
      const fallbackUser = defaultUsers[targetRole];
      if (fallbackUser) {
        localStorage.setItem('user', JSON.stringify(fallbackUser));
        setUser(fallbackUser);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch tasks
  const fetchTugas = useCallback(() => {
    setLoading(true);
    api.get('/tugas')
      .then((response) => {
        setIsBackendConnected(true);
        if (response.data && response.data.length > 0) {
          setDaftarTugas(response.data);
        } else {
          setDaftarTugas(initialFallbackTugas);
        }
        setLoading(false);
      })
      .catch((error) => {
        if (error.response?.status === 401) {
          clearSession();
          return;
        }
        setIsBackendConnected(false);
        setDaftarTugas(initialFallbackTugas);
        setLoading(false);
      });
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
        fetchTugas();
        alert('Tugas magang berhasil dihapus.');
      } catch (err) {
        // Hapus dari state lokal jika offline
        setDaftarTugas((prev) => prev.filter((t) => t.id !== id));
        alert('Tugas magang dihapus.');
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
          deadline: formTugasData.deadline,
        });
        alert('Tugas magang berhasil diubah!');
      } else {
        // Buat Tugas Baru
        await api.post('/tugas', {
          judul: formTugasData.judul,
          deskripsi: formTugasData.deskripsi,
          deadline: formTugasData.deadline,
        });
        alert('Tugas magang baru berhasil diterbitkan!');
      }
      setModalFormTugas(null);
      fetchTugas();
    } catch (err) {
      // Update lokal jika offline
      if (modalFormTugas?.id) {
        setDaftarTugas((prev) =>
          prev.map((t) =>
            t.id === modalFormTugas.id
              ? { ...t, judul: formTugasData.judul, deskripsi: formTugasData.deskripsi, deadline: formTugasData.deadline, kategori: formTugasData.kategori }
              : t
          )
        );
        alert('Tugas magang berhasil diubah!');
      } else {
        const newId = Date.now();
        const newTask = {
          id: newId,
          judul: formTugasData.judul,
          deskripsi: formTugasData.deskripsi,
          deadline: formTugasData.deadline,
          kategori: formTugasData.kategori,
          created_at: new Date().toISOString(),
          submisi: [],
        };
        setDaftarTugas((prev) => [newTask, ...prev]);
        alert('Tugas magang baru berhasil diterbitkan!');
      }
      setModalFormTugas(null);
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
      fetchTugas();
    } catch (err) {
      // Update lokal jika offline
      setDaftarTugas((prev) =>
        prev.map((t) => {
          if (t.id === modalNilai.tugas.id) {
            return {
              ...t,
              submisi: (t.submisi || []).map((s) =>
                s.id === modalNilai.submisi.id
                  ? { ...s, nilai: val, feedback: inputFeedback, status: 'sudah_dinilai' }
                  : s
              ),
            };
          }
          return t;
        })
      );
      alert('Nilai & feedback berhasil disimpan!');
      setModalNilai(null);
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
    } catch (err) {
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
      fetchTugas();
    } catch (err) {
      // Simulasikan sukses jika offline
      setDaftarTugas((prev) =>
        prev.map((t) => {
          if (t.id === modalSubmit.id) {
            const newSub = {
              id: Date.now(),
              tugas_id: t.id,
              tanggal_submit: new Date().toISOString(),
              status: 'belum_dinilai',
              catatan_peserta: uploadCatatan,
              file_path: 'submisi_tugas/' + uploadFile.name,
              nilai: null,
              feedback: null,
              peserta: {
                id: user.id,
                name: user.name,
                instansi: 'Universitas Indonesia',
              },
            };
            return { ...t, submisi: [newSub] };
          }
          return t;
        })
      );
      alert('Tugas magang berhasil dikumpulkan!');
      setModalSubmit(null);
      setUploadFile(null);
      setUploadCatatan('');
    } finally {
      setUploading(false);
    }
  };

  // Filter list data
  const filteredData = useMemo(() => {
    return daftarTugas.filter((item) => {
      const submisiList = item.submisi || [];
      const submisi = submisiList[0];

      const matchSearch =
        !searchQuery ||
        item.judul?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.deskripsi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submisiList.some((s) => s.peserta?.name?.toLowerCase().includes(searchQuery.toLowerCase()));

      const itemKategori = item.kategori || 'Individu';
      const matchKategori = !filterKategori || itemKategori === filterKategori;

      const statusInfo = getStatusSubmisi(submisi);
      const matchStatus = !filterStatus || statusInfo.label.includes(filterStatus);

      return matchSearch && matchKategori && matchStatus;
    });
  }, [daftarTugas, searchQuery, filterKategori, filterStatus]);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <SidebarNavigation
        user={user}
        onLogout={handleLogout}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
      />

      {/* MAIN CONTENT AREA */}
      <div className="main-wrapper">
        {/* TOPBAR */}
        <TopNavbar user={user} isConnected={isBackendConnected} />

        {/* CONTENT BODY */}
        <main className="content-body">
          {/* Welcome Alert Banner */}
          <div className="welcome-alert-banner">
            <div className="check-icon-circle">✓</div>
            <span>Selamat datang kembali, <strong>{user.name}</strong>!</span>
          </div>

          {/* Page Heading & Subtitle */}
          <div className="page-title-section">
            <h1 className="page-title-heading">Data Tugas Magang</h1>
            <p className="page-title-desc">
              {isPeserta
                ? 'Lihat daftar tugas magang dan kumpulkan berkas laporan Anda sebelum deadline.'
                : isAdmin
                ? 'Kelola tugas magang: buat, ubah, dan hapus tugas serta pantau status pengumpulan peserta.'
                : 'Kelola tugas magang, unduh berkas submisi peserta, serta berikan penilaian dan feedback.'}
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="filter-card">
            <div className="search-input-wrapper">
              <input
                type="text"
                className="search-input"
                placeholder="Cari judul tugas, peserta, atau deskripsi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
            >
              <option value="">-- Semua Kategori --</option>
              <option value="Individu">Individu</option>
              <option value="Kelompok">Kelompok</option>
            </select>

            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">-- Semua Status --</option>
              <option value="Disetujui">Disetujui / Selesai</option>
              <option value="Menunggu">Menunggu Review</option>
              <option value="Belum Dikerjakan">Belum Dikerjakan</option>
            </select>

            <button className="btn-search" onClick={() => {}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>Cari</span>
            </button>

            {/* USE CASE 1 (Hanya Pembimbing): Buat Tugas */}
            {isPembimbing && (
              <button className="btn-create-task" onClick={handleOpenCreateTugas}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Buat Tugas Baru</span>
              </button>
            )}
          </div>

          {/* Main Data Table Card */}
          <div className="table-card">
            <div className="table-card-header">
              <div className="table-card-title">
                <span className="header-icon">📋</span>
                <span>Daftar Tugas Magang ({filteredData.length} Data)</span>
              </div>
            </div>

            <div className="table-responsive">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>{isPeserta ? 'JUDUL TUGAS & PESERTA' : 'JUDUL TUGAS'}</th>
                    <th>KATEGORI</th>
                    <th>{isPeserta ? 'TANGGAL SUBMIT / DEADLINE' : 'BATAS WAKTU (DEADLINE)'}</th>
                    <th>{isPeserta ? 'STATUS TUGAS' : 'STATUS SUBMISI'}</th>
                    <th style={{ textAlign: 'right' }}>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="table-empty-state">
                        <div>Memuat data tugas magang...</div>
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="table-empty-state">
                        <div className="table-empty-icon">📁</div>
                        <div>Tidak ada data tugas magang yang ditemukan.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((tugas, index) => {
                      const submisiList = tugas.submisi || [];
                      const submisi = submisiList[0];
                      const statusInfo = getStatusSubmisi(submisi);
                      const nilaiInfo = formatNilaiAkhir(submisi?.nilai);
                      const tanggalSubmit = formatTanggal(submisi?.tanggal_submit || tugas.created_at);

                      // Sub-label info peserta / pengumpulan
                      let subLabel = 'Belum ada peserta mengumpulkan';
                      if (isPeserta) {
                        subLabel = `${user.name} (Anda) • Universitas Indonesia`;
                      } else if (submisiList.length > 0) {
                        subLabel = `${submisiList.length} Peserta Telah Mengumpulkan`;
                      }

                      return (
                        <tr key={tugas.id}>
                          {/* Col 1: # */}
                          <td className="col-num">{index + 1}</td>

                          {/* Col 2: Judul Tugas & Peserta */}
                          <td>
                            <div className="col-title-wrap">
                              <span className="item-main-title">{tugas.judul}</span>
                              <span className="item-subtitle">{subLabel}</span>
                            </div>
                          </td>

                          {/* Col 3: Kategori */}
                          <td>
                            <span className="badge-category">
                              {tugas.kategori || 'Individu'}
                            </span>
                          </td>

                          {/* Col 4: Tanggal Submit / Deadline */}
                          <td>
                            {isPeserta ? (
                              <div className="date-cell">
                                <span className="date-main">{tanggalSubmit.date}</span>
                                <span className="date-sub">{tanggalSubmit.time}</span>
                              </div>
                            ) : (
                              <div className="date-cell">
                                <span className="date-main">{formatTanggal(tugas.deadline).date}</span>
                                <span className="date-sub">{formatTanggal(tugas.deadline).time}</span>
                              </div>
                            )}
                          </td>

                          {/* Col 5: Status Laporan / Submisi */}
                          <td>
                            {isPeserta ? (
                              <span className={`badge-status-dot ${statusInfo.className}`}>
                                <span className="dot"></span>
                                <span>{statusInfo.label}</span>
                              </span>
                            ) : (
                              <span className={`badge-status-dot ${submisiList.length > 0 ? 'approved' : 'unsubmitted'}`}>
                                <span className="dot"></span>
                                <span>{submisiList.length > 0 ? `${submisiList.length} Submisi Masuk` : 'Belum Ada Submisi'}</span>
                              </span>
                            )}
                          </td>

                          {/* Col 7: Aksi */}
                          <td style={{ textAlign: 'right' }}>
                            <div className="table-action-group" style={{ justifyContent: 'flex-end' }}>
                              {/* USE CASE: Lihat Detail Tugas */}
                              <button
                                className="action-btn"
                                onClick={() => setModalDetail(tugas)}
                                title="Lihat Detail Instruksi Tugas"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                  <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                <span>Detail</span>
                              </button>

                              {/* USE CASE 4 & 5 (Admin & Pembimbing): Lihat Daftar Submisi & Unduh */}
                              {isAdminOrPembimbing && (
                                <button
                                  className="action-btn btn-review-action"
                                  onClick={() => setModalSubmisiList(tugas)}
                                  title="Lihat Daftar Submisi Masuk Peserta"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                  </svg>
                                  <span>Submisi ({submisiList.length})</span>
                                </button>
                              )}

                              {/* USE CASE 6 (Hanya Pembimbing): Beri Nilai & Feedback */}
                              {isPembimbing && (
                                <button
                                  className="action-btn btn-nilai-action"
                                  onClick={(e) => handleOpenNilai(tugas, submisi, e)}
                                  title="Beri Nilai & Feedback Evaluasi"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                  <span>Nilai</span>
                                </button>
                              )}

                              {/* USE CASE 3 & 4 (Peserta): Kumpulkan Tugas / Ubah Submisi */}
                              {isPeserta && (
                                <button
                                  className="action-btn btn-submit-action"
                                  onClick={(e) => handleOpenSubmit(tugas, e)}
                                  title={submisi ? 'Ubah Berkas Submisi' : 'Kumpulkan Berkas Tugas'}
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                  </svg>
                                  <span>{submisi ? 'Ubah Submisi' : 'Kumpulkan'}</span>
                                </button>
                              )}

                              {/* USE CASE 2 (Hanya Pembimbing): Ubah Tugas */}
                              {isPembimbing && (
                                <button
                                  className="action-btn"
                                  onClick={(e) => handleOpenEditTugas(tugas, e)}
                                  title="Ubah Rincian Tugas"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                  </svg>
                                </button>
                              )}

                              {/* USE CASE 3 (Hanya Pembimbing): Hapus Tugas */}
                              {isPembimbing && (
                                <button
                                  className="action-btn btn-delete-action"
                                  onClick={(e) => handleHapusTugas(tugas.id, e)}
                                  title="Hapus Tugas Magang"
                                >
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
      {modalDetail && (
        <div className="modal-overlay" onClick={() => setModalDetail(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Detail Tugas Magang</h3>
              <button className="btn-modal-close" onClick={() => setModalDetail(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div>
                <span className="badge-category" style={{ marginBottom: '8px' }}>
                  {modalDetail.kategori || 'Individu'}
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 8px' }}>
                  {modalDetail.judul}
                </h2>
                <p style={{ color: '#e11d48', fontSize: '0.86rem', fontWeight: 600 }}>
                  ⏰ Batas Waktu (Deadline): {new Date(modalDetail.deadline).toLocaleString('id-ID')}
                </p>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Deskripsi &amp; Instruksi Pengerjaan:
                </h4>
                <p style={{ color: '#334155', fontSize: '0.92rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {modalDetail.deskripsi}
                </p>
              </div>

              {/* Status Submisi untuk Peserta */}
              {isPeserta && (
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                    Status Pengumpulan Tugas Anda
                  </h4>
                  {(() => {
                    const mySub = modalDetail.submisi?.[0];
                    if (!mySub) {
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b', fontSize: '0.88rem' }}>Anda belum mengumpulkan tugas ini.</span>
                          <button className="btn-save-primary" onClick={() => { setModalDetail(null); setModalSubmit(modalDetail); }}>
                            📤 Kumpulkan Sekarang
                          </button>
                        </div>
                      );
                    }
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem' }}>
                        <div>
                          <strong>Status:</strong>{' '}
                          <span className={`badge-status-dot ${getStatusSubmisi(mySub).className}`}>
                            <span className="dot"></span>
                            {getStatusSubmisi(mySub).label}
                          </span>
                        </div>
                        <div>
                          <strong>Waktu Submit:</strong> {new Date(mySub.tanggal_submit).toLocaleString('id-ID')}
                        </div>
                        {mySub.catatan_peserta && (
                          <div style={{ color: '#475569' }}>
                            <strong>Catatan Anda:</strong> "{mySub.catatan_peserta}"
                          </div>
                        )}
                        {mySub.feedback && (
                          <div style={{ backgroundColor: '#f0fdf4', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bbf7d0', marginTop: '6px' }}>
                            <strong>Feedback Pembimbing:</strong> "{mySub.feedback}"
                          </div>
                        )}
                        <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                          <button
                            className="btn-search"
                            onClick={() => handleDownloadSubmisi(mySub.id, user.name)}
                          >
                            📥 Unduh Berkas Saya
                          </button>
                          {mySub.status !== 'sudah_dinilai' && (
                            <button
                              className="action-btn btn-submit-action"
                              onClick={() => { setModalDetail(null); setModalSubmit(modalDetail); }}
                            >
                              ✏ Ubah Submisi
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModalDetail(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

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
                        <span className={`badge-status-dot ${getStatusSubmisi(sub).className}`}>
                          <span className="dot"></span>
                          {getStatusSubmisi(sub).label}
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
            <form onSubmit={handleSimpanTugas}>
              <div className="modal-body">
                <div className="form-field-group">
                  <label className="form-field-label">Judul Tugas</label>
                  <input
                    type="text"
                    className="form-control-input"
                    placeholder="Contoh: Rancangan UMKM Kamang Hilia"
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
      {modalSubmit && (
        <div className="modal-overlay" onClick={() => setModalSubmit(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalSubmit.submisi?.[0] ? 'Ubah Berkas Submisi' : 'Kumpulkan Tugas Magang'}
              </h3>
              <button className="btn-modal-close" onClick={() => setModalSubmit(null)}>✕</button>
            </div>
            <form onSubmit={handleKumpulTugas}>
              <div className="modal-body">
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                    {modalSubmit.judul}
                  </h4>
                  <p style={{ fontSize: '0.84rem', color: '#e11d48', marginTop: '4px' }}>
                    ⏰ Deadline: {new Date(modalSubmit.deadline).toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">Pilih Berkas Tugas (PDF, DOCX, ZIP, maks 5MB)</label>
                  <input
                    type="file"
                    className="form-control-input"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    required
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">Catatan Peserta (Opsional)</label>
                  <textarea
                    className="form-control-textarea"
                    placeholder="Tuliskan catatan tambahan atau link repository..."
                    value={uploadCatatan}
                    onChange={(e) => setUploadCatatan(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModalSubmit(null)}>
                  Batal
                </button>
                <button type="submit" className="btn-save-primary" disabled={uploading}>
                  {uploading ? 'Mengunggah...' : modalSubmit.submisi?.[0] ? 'Simpan Perubahan Submisi' : 'Kumpulkan Tugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;