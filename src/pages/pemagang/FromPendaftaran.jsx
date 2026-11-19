import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { getStoredUser } from '../../utils/auth';
import {
  compressImageToTarget,
  optimizePdf,
  convertScanImageToCompressedPdf,
  formatFileSize
} from '../../utils/fileCompressor';
import {
  GraduationCap,
  User,
  Mail,
  Phone,
  BookOpen,
  Building,
  Calendar,
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  LogOut,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  MapPin,
  Camera,
  Download,
  Check,
  Send,
  MessageCircle,
  ExternalLink,
  Eye,
  Info,
  HelpCircle,
  FileCheck,
  RefreshCw
} from 'lucide-react';

export default function FormPendaftaran() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [myRegistration, setMyRegistration] = useState(null);
  const [replyLetterMessage, setReplyLetterMessage] = useState('');
  const [isDownloadingReplyLetter, setIsDownloadingReplyLetter] = useState(false);
  const [isOpeningLetter, setIsOpeningLetter] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(() => getStoredUser() || {});
  const [waNotification, setWaNotification] = useState(null);
  
  const [formData, setFormData] = useState({ 
    nim: loggedInUser.nim || '',
    no_hp: loggedInUser.no_hp || '',
    program_studi: loggedInUser.program_studi || '',
    alamat: loggedInUser.alamat || '',
    pas_foto: null,
    asal_instansi: '', 
    periode_id: '', 
    file_surat_pengantar: null
  });

  const [listPeriode, setListPeriode] = useState([]);
  const displayName = loggedInUser.name || loggedInUser.nama || loggedInUser.email || 'Peserta';
  const photoPreviewUrl = useRef(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // State kompresi berkas persyaratan
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [photoCompressionInfo, setPhotoCompressionInfo] = useState(null);
  const [compressingPdf, setCompressingPdf] = useState(false);
  const [pdfCompressionInfo, setPdfCompressionInfo] = useState(null);

  // Helper untuk resolve URL file dari backend/storage
  const getAssetUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('data:') || path.startsWith('blob:') || /^https?:\/\//i.test(path)) return path;
    const clean = String(path).replace(/^\/+/, '').replace(/^storage\//, '');
    return `http://127.0.0.1:8000/storage/${clean}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Format berkas pas foto harus berupa gambar (JPG, JPEG, atau PNG).');
      e.target.value = '';
      return;
    }

    setCompressingPhoto(true);
    try {
      const result = await compressImageToTarget(file, {
        targetSizeKb: 100,
        maxWidth: 600,
        maxHeight: 800
      });

      if (photoPreviewUrl.current) URL.revokeObjectURL(photoPreviewUrl.current);
      photoPreviewUrl.current = URL.createObjectURL(result.file);
      setPhotoPreview(photoPreviewUrl.current);
      setFormData(prev => ({ ...prev, pas_foto: result.file }));
      setPhotoCompressionInfo(result);
    } catch (err) {
      console.error('Gagal mengompresi foto:', err);
      if (photoPreviewUrl.current) URL.revokeObjectURL(photoPreviewUrl.current);
      photoPreviewUrl.current = URL.createObjectURL(file);
      setPhotoPreview(photoPreviewUrl.current);
      setFormData(prev => ({ ...prev, pas_foto: file }));
      setPhotoCompressionInfo({
        originalSizeFormatted: formatFileSize(file.size),
        compressedSizeFormatted: formatFileSize(file.size),
        isUnderTarget: file.size <= 100 * 1024,
        savedPercent: 0
      });
    } finally {
      setCompressingPhoto(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressingPdf(true);
    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(file.name);

      let result;
      if (isPdf) {
        result = await optimizePdf(file, 100);
      } else if (isImage) {
        result = await convertScanImageToCompressedPdf(file, 100);
      } else {
        alert('Format surat pengantar harus berupa file PDF atau scan dokumen JPG/PNG.');
        e.target.value = '';
        setCompressingPdf(false);
        return;
      }

      setFormData(prev => ({ ...prev, file_surat_pengantar: result.file }));
      setPdfCompressionInfo(result);
    } catch (err) {
      console.error('Gagal mengompresi dokumen:', err);
      setFormData(prev => ({ ...prev, file_surat_pengantar: file }));
      setPdfCompressionInfo({
        originalSizeFormatted: formatFileSize(file.size),
        compressedSizeFormatted: formatFileSize(file.size),
        isUnderTarget: file.size <= 100 * 1024,
        savedPercent: 0
      });
    } finally {
      setCompressingPdf(false);
    }
  };

  useEffect(() => {
    return () => {
      if (photoPreviewUrl.current) URL.revokeObjectURL(photoPreviewUrl.current);
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, periodeRes, pendaftaranRes] = await Promise.all([
          api.get('/me'),
          api.get('/periode'),
          api.get('/pendaftaran/me')
        ]);
        const user = userRes.data?.data;
        if (user) {
          setLoggedInUser(user);
          localStorage.setItem('user', JSON.stringify(user));
          setFormData((current) => ({
            ...current,
            nim: user.nim || current.nim || '',
            no_hp: user.no_hp || current.no_hp,
            program_studi: user.program_studi || current.program_studi,
            alamat: user.alamat || current.alamat,
          }));
        }
        setListPeriode(periodeRes.data?.data || []);
        if (pendaftaranRes.data?.data) {
          const reg = pendaftaranRes.data.data;
          setMyRegistration(reg);
          if (reg.user) {
            setLoggedInUser(reg.user);
          }
          setIsSubmitted(true);
        }
      } catch (error) {
        console.error('Error fetching data', error);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.periode_id) {
      alert('Periode magang belum dipilih. Hubungi admin untuk menambahkan periode pendaftaran.');
      return;
    }

    if (compressingPhoto || compressingPdf) {
      alert('Sedang mengompresi berkas persyaratan, mohon tunggu sebentar sampai selesai.');
      return;
    }

    setIsSubmitting(true);
    
    const payload = new FormData();
    payload.append('no_hp', formData.no_hp);
    payload.append('program_studi', formData.program_studi);
    payload.append('alamat', formData.alamat);
    payload.append('periode_id', formData.periode_id);
    payload.append('asal_instansi', formData.asal_instansi);
    payload.append('pas_foto', formData.pas_foto);
    if (formData.nim) {
      payload.append('nim', formData.nim);
    }
    if (formData.file_surat_pengantar) {
      payload.append('file_surat_pengantar', formData.file_surat_pengantar);
    }

    try {
      const response = await api.post('/pendaftaran', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      const updatedUser = response.data.data?.user;
      if (updatedUser) {
        setLoggedInUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      setMyRegistration(response.data.data);
      setIsSubmitted(true);
      const waInfo = response.data.whatsapp_notification;
      if (waInfo) {
        setWaNotification(waInfo);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal mengirim pendaftaran. Periksa kembali kelengkapan formulir Anda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadReplyLetter = async () => {
    setIsDownloadingReplyLetter(true);
    setReplyLetterMessage('');
    try {
      const response = await api.get('/pendaftaran/me/surat-balasan/download', {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = myRegistration?.file_surat_balasan?.split('/').pop() || 'surat-balasan.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMyRegistration((current) => ({
        ...current,
        surat_balasan_diterima_at: current?.surat_balasan_diterima_at || new Date().toISOString(),
      }));
      setReplyLetterMessage('✓ Surat balasan berhasil diunduh. Anda dapat mengunduh ulang berkas ini kapan saja.');
    } catch (error) {
      setReplyLetterMessage(error.response?.status === 404
        ? 'Berkas surat balasan belum tersedia. Silakan hubungi admin.'
        : 'Surat balasan gagal diunduh. Silakan coba lagi.');
    } finally {
      setIsDownloadingReplyLetter(false);
    }
  };

  const handleViewLetter = async () => {
    if (isOpeningLetter) return;
    setIsOpeningLetter(true);
    try {
      // Panggil endpoint download berautentikasi (membawa Bearer token)
      const response = await api.get('/pendaftaran/me/surat-pengantar/download', {
        responseType: 'blob',
      });
      const fileBlob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(fileBlob);
      window.open(blobUrl, '_blank');
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      console.warn('Gagal memuat via endpoint API resmi, mencoba jalur fallback:', err);
      if (userLetter) {
        window.open(userLetter, '_blank');
      } else {
        alert('Berkas surat pengantar tidak dapat dibuka. Silakan hubungi administrator.');
      }
    } finally {
      setIsOpeningLetter(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Apakah Anda yakin ingin membatalkan pengajuan magang ini? Anda dapat mengajukan ulang setelah dibatalkan.')) return;
    try {
      const response = await api.put('/pendaftaran/cancel');
      setMyRegistration(null);
      setIsSubmitted(false);
      alert(response.data.message || 'Pengajuan magang berhasil dibatalkan. Anda dapat mengisi formulir kembali.');
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal membatalkan pengajuan');
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('participant');
    if (token) {
      void api.post('/logout', {}, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch((error) => {
        console.error('Failed to invalidate logout session on the server', error);
      });
    }
    window.location.replace('/');
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1.5px solid #cbd5e1',
    outline: 'none',
    fontSize: '13.5px',
    boxSizing: 'border-box',
    color: '#0f172a',
    background: '#ffffff',
    transition: 'all 0.2s ease',
  };

  const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e293b',
  };

  // Referensi data yang diajukan
  const regUser = myRegistration?.user || loggedInUser;
  const regPeriode = myRegistration?.periode || listPeriode.find(p => String(p.id) === String(formData.periode_id || myRegistration?.periode_id));
  const userPhoto = getAssetUrl(myRegistration?.pas_foto || photoPreview || regUser?.foto);
  const userLetter = myRegistration?.file_surat_pengantar ? getAssetUrl(myRegistration.file_surat_pengantar) : null;

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      fontFamily: "'Poppins', sans-serif",
      background: 'radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.04) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(59, 130, 246, 0.04) 0px, transparent 50%), #f8fafc',
      flexDirection: 'column'
    }}>
      
      {/* Top Colorful Energy Lightbar */}
      <div style={{
        height: '3.5px',
        width: '100%',
        background: 'linear-gradient(90deg, #4f46e5 0%, #3b82f6 30%, #06b6d4 60%, #10b981 100%)',
        position: 'sticky',
        top: 0,
        zIndex: 51
      }} />

      {/* Top Navbar Modern, Luminous, & Berenergi */}
      <header style={{
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.85)',
        padding: '12px 28px',
        position: 'sticky',
        top: '3.5px',
        zIndex: 50,
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          
          {/* Logo & Portal Info */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none' }}>
            <div style={{
              width: '44px',
              height: '44px',
              background: '#ffffff',
              borderRadius: '50%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.15)',
              overflow: 'hidden',
              padding: '3px',
              border: '1.5px solid #e0e7ff',
              transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <img src="/logo.png" alt="Logo PAM-TECHNO" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '17px',
                  fontWeight: '800',
                  letterSpacing: '-0.3px',
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  PAM-TECHNO
                </span>
                <span style={{
                  fontSize: '11px',
                  background: '#e0e7ff',
                  color: '#4338ca',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  border: '1px solid #c7d2fe',
                  letterSpacing: '0.2px'
                }}>
                  {myRegistration?.status === 'Pemagang Aktif' ? 'Peserta Magang' : 'Calon Pemagang'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', fontWeight: '500' }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'inline-block',
                  boxShadow: '0 0 8px #10b981'
                }}></span>
                Sistem Pendaftaran & Administrasi Magang
              </div>
            </div>
          </Link>

          {/* User Profile Area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

            {/* User Profile Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#f8fafc',
              padding: '5px 14px 5px 6px',
              borderRadius: '30px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 'bold',
                overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)',
                border: '2px solid #ffffff'
              }}>
                {userPhoto ? (
                  <img 
                    src={userPhoto} 
                    alt="Foto Profil" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', lineHeight: '1.2' }}>
                  {displayName}
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  color: myRegistration?.status === 'Pemagang Aktif' ? '#15803d' : '#b45309'
                }}>
                  {myRegistration?.status === 'Pemagang Aktif'
                    ? '● Pemagang Resmi'
                    : isSubmitted
                      ? '● Verifikasi Berkas'
                      : '● Calon Pemagang'}
                </span>
              </div>
            </div>

            {/* Tombol Keluar Modern */}
            <button 
              onClick={handleLogout} 
              title="Keluar dari akun"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                background: '#fef2f2', 
                color: '#dc2626', 
                border: '1px solid #fecaca', 
                padding: '8px 14px', 
                borderRadius: '10px', 
                cursor: 'pointer', 
                fontWeight: '600', 
                fontSize: '12.5px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ef4444';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = '#ef4444';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fef2f2';
                e.currentTarget.style.color = '#dc2626';
                e.currentTarget.style.borderColor = '#fecaca';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <LogOut size={14} />
              <span>Keluar</span>
            </button>

          </div>

        </div>
      </header>

      {/* Main Container dengan layout lapang & proporsional */}
      <main style={{ flex: 1, padding: '32px 24px 80px' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '26px' }}>

          {/* Hero Banner Dinamis (Berubah sesuai status pengajuan) */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #1e3a8a 100%)',
            borderRadius: '20px',
            padding: '32px 38px',
            color: '#ffffff',
            boxShadow: '0 12px 35px -5px rgba(15, 23, 42, 0.25)',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {/* Dekorasi Cahaya Gradient */}
            <div style={{ position: 'absolute', top: '-60px', right: '-40px', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, rgba(99, 102, 241, 0) 70%)', pointerEvents: 'none' }}></div>
            <div style={{ position: 'absolute', bottom: '-70px', left: '20%', width: '220px', height: '220px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, rgba(56, 189, 248, 0) 70%)', pointerEvents: 'none' }}></div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)', padding: '5px 14px', borderRadius: '20px', fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px', border: '1px solid rgba(255, 255, 255, 0.18)' }}>
                    <Sparkles size={13} color="#fbbf24" />
                    <span>{isSubmitted ? 'Portal Pengajuan Magang' : 'Penerimaan Magang Resmi'}</span>
                  </div>
                  
                  <h1 style={{ margin: '0 0 8px', fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px', color: '#ffffff' }}>
                    {isSubmitted ? 'Status & Riwayat Pengajuan Magang' : 'Formulir Pengajuan Magang Baru'}
                  </h1>
                  
                  <p style={{ margin: 0, fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6', maxWidth: '680px' }}>
                    {isSubmitted 
                      ? 'Berkas pendaftaran Anda telah berhasil terkirim. Pantau proses verifikasi administrasi dan rincian data pengajuan Anda secara berkala pada halaman ini.'
                      : 'Lengkapi identitas diri, data akademik kampus, dan unggah berkas persyaratan resmi untuk diverifikasi oleh tim Administrator.'}
                  </p>
                </div>

                {/* Status Chip Menonjol di Kanan Banner */}
                {isSubmitted && (
                  <div style={{
                    background: myRegistration?.status === 'Pemagang Aktif'
                      ? 'rgba(34, 197, 94, 0.18)'
                      : myRegistration?.status === 'Ditolak'
                        ? 'rgba(239, 68, 68, 0.18)'
                        : 'rgba(245, 158, 11, 0.18)',
                    border: `1.5px solid ${myRegistration?.status === 'Pemagang Aktif' ? '#4ade80' : myRegistration?.status === 'Ditolak' ? '#f87171' : '#fbbf24'}`,
                    padding: '10px 18px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    backdropFilter: 'blur(8px)'
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: myRegistration?.status === 'Pemagang Aktif' ? '#22c55e' : myRegistration?.status === 'Ditolak' ? '#ef4444' : '#f59e0b',
                      display: 'inline-block',
                      boxShadow: `0 0 10px ${myRegistration?.status === 'Pemagang Aktif' ? '#22c55e' : '#f59e0b'}`
                    }} />
                    <div>
                      <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', fontWeight: '600' }}>Status Pendaftaran</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff' }}>
                        {myRegistration?.status === 'Calon Pemagang' ? 'Sedang Ditinjau Admin' : myRegistration?.status}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Stepper Wizard Horizontal */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.12)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                    ✓
                  </div>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#f8fafc' }}>1. Formulir Terkirim</span>
                </div>
                
                <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '14px' }}>—</span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: isSubmitted ? 1 : 0.6 }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: myRegistration?.status === 'Pemagang Aktif' ? '#10b981' : (isSubmitted ? '#f59e0b' : 'rgba(255, 255, 255, 0.2)'),
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    boxShadow: isSubmitted && myRegistration?.status !== 'Pemagang Aktif' ? '0 0 10px rgba(245, 158, 11, 0.5)' : 'none'
                  }}>
                    {myRegistration?.status === 'Pemagang Aktif' ? '✓' : '2'}
                  </div>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', color: isSubmitted ? '#fef3c7' : '#f8fafc' }}>
                    2. Verifikasi Dokumen
                  </span>
                </div>
                
                <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '14px' }}>—</span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: myRegistration?.status === 'Pemagang Aktif' ? 1 : 0.5 }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: myRegistration?.status === 'Pemagang Aktif' ? '#10b981' : 'rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    3
                  </div>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#f8fafc' }}>
                    3. Pengumuman & Mulai Magang
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* TAMPILAN JIKA SUDAH MENGAJUKAN (Layout 2 Kolom Seimbang & Kaya Informasi) */}
          {isSubmitted && myRegistration && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '24px',
              alignItems: 'start'
            }}>
              
              {/* KOLOM KIRI: STATUS PROSES & LINIMASA VERIFIKASI */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                
                {/* 1. Card Status Utama */}
                {myRegistration.status === 'Pemagang Aktif' && (
                  <div style={{
                    background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)',
                    border: '1.5px solid #86efac',
                    padding: '28px',
                    borderRadius: '18px',
                    boxShadow: '0 8px 24px -4px rgba(34, 197, 94, 0.15)'
                  }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)' }}>
                        <CheckCircle2 size={30} color="#16a34a" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'inline-block', background: '#dcfce7', color: '#166534', padding: '3px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.4px', marginBottom: '8px' }}>
                          STATUS: RESMI DITERIMA
                        </div>
                        <h3 style={{ margin: '0 0 6px', color: '#14532d', fontSize: '20px', fontWeight: '800' }}>
                          Selamat! Pengajuan Magang Anda Diterima
                        </h3>
                        <p style={{ margin: 0, color: '#166534', fontSize: '14px', lineHeight: '1.6' }}>
                          Anda telah resmi disetujui sebagai pemagang aktif di <strong>PAM Techno</strong>. Silakan unduh surat balasan resmi sebagai bukti penerimaan magang.
                        </p>
                      </div>
                    </div>

                    {/* Info Pembimbing Lapangan */}
                    <div style={{ marginTop: '20px', background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <GraduationCap size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Pembimbing Lapangan Ditugaskan</div>
                        <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a' }}>
                          {myRegistration.pembimbing?.nama || myRegistration.pembimbing?.name || 'Akan segera diumumkan'}
                        </div>
                      </div>
                    </div>

                    {/* Tombol Unduh Surat Balasan Resmi */}
                    {myRegistration.file_surat_balasan && (
                      <div style={{ marginTop: '16px', background: '#ffffff', borderRadius: '12px', border: '1px solid #bbf7d0', padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '800', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FileText size={15} />
                            SURAT BALASAN RESMI KANTOR
                          </div>
                          <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                            {myRegistration.file_surat_balasan.split('/').pop()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleDownloadReplyLetter}
                          disabled={isDownloadingReplyLetter}
                          style={{
                            background: '#16a34a',
                            color: '#ffffff',
                            padding: '10px 18px',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: isDownloadingReplyLetter ? 'wait' : 'pointer',
                            fontWeight: '700',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 3px 8px rgba(22, 163, 74, 0.3)'
                          }}
                        >
                          <Download size={15} />
                          {isDownloadingReplyLetter ? 'Mengunduh...' : 'Unduh Surat Balasan'}
                        </button>
                      </div>
                    )}
                    {replyLetterMessage && <p role="status" style={{ margin: '12px 0 0', color: '#166534', fontSize: '13px', fontWeight: '600' }}>{replyLetterMessage}</p>}

                    {/* Tombol Lanjut ke Absensi */}
                    <div style={{ marginTop: '20px' }}>
                      <Link 
                        to="/absensi" 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          background: 'linear-gradient(135deg, #4338ca 0%, #3b82f6 100%)',
                          color: '#ffffff',
                          padding: '12px 20px',
                          borderRadius: '10px',
                          textDecoration: 'none',
                          fontWeight: '700',
                          fontSize: '14.5px',
                          boxShadow: '0 4px 14px rgba(67, 56, 202, 0.35)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span>Buka Menu Absensi Magang</span>
                        <ArrowRight size={18} />
                      </Link>
                    </div>
                  </div>
                )}

                {myRegistration.status === 'Calon Pemagang' && (
                  <div style={{
                    background: 'linear-gradient(180deg, #f0f7ff 0%, #ffffff 100%)',
                    border: '1.5px solid #bfdbfe',
                    padding: '28px',
                    borderRadius: '18px',
                    boxShadow: '0 8px 24px -4px rgba(59, 130, 246, 0.12)'
                  }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)' }}>
                        <Clock size={28} color="#2563eb" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#dbeafe', color: '#1d4ed8', padding: '3px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.4px', marginBottom: '8px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563eb', display: 'inline-block' }}></span>
                          STATUS: MENUNGGU VERIFIKASI ADMIN
                        </div>
                        <h3 style={{ margin: '0 0 6px', color: '#1e3a8a', fontSize: '20px', fontWeight: '800' }}>
                          Berkas Pengajuan Anda Sedang Ditinjau
                        </h3>
                        <p style={{ margin: 0, color: '#1e40af', fontSize: '13.5px', lineHeight: '1.6' }}>
                          Terima kasih telah mendaftar! Seluruh data dan berkas persyaratan Anda (Surat Pengantar & Pas Foto) sudah berhasil masuk ke antrean verifikasi tim Administrator PAM Techno.
                        </p>
                      </div>
                    </div>

                    {/* Alur Linimasa Verifikasi */}
                    <div style={{ marginTop: '22px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Info size={16} color="#3b82f6" />
                        <span>Alur Verifikasi Pendaftaran</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        
                        {/* Tahap 1: Pengajuan Masuk */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#22c55e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>✓</div>
                            <div style={{ width: '2px', height: '100%', minHeight: '26px', background: '#bbf7d0', margin: '4px 0' }}></div>
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Pengajuan Berhasil Dikirimkan</div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                              Diterima pada {formatDate(myRegistration.created_at || Date.now())}
                            </div>
                          </div>
                        </div>

                        {/* Tahap 2: Sedang Diverifikasi */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}>2</div>
                            <div style={{ width: '2px', height: '100%', minHeight: '26px', background: '#e2e8f0', margin: '4px 0' }}></div>
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>Pemeriksaan Berkas oleh Administrator</span>
                              <span style={{ fontSize: '10px', background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '8px', fontWeight: '700' }}>Sedang Berjalan</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                              Admin memverifikasi kesesuaian dokumen surat pengantar & ketersediaan kuota (Estimasi: 1–3 hari kerja).
                            </div>
                          </div>
                        </div>

                        {/* Tahap 3: Keputusan Akhir */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#e2e8f0', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>3</div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Penerbitan Surat Balasan Resmi</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                              Surat keputusan resmi akan langsung diterbitkan pada portal ini setelah verifikasi selesai.
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Informasi Bantuan WhatsApp */}
                    <div style={{ marginTop: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <MessageCircle size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}>Kontak WhatsApp Anda</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {regUser.no_hp || '-'}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                          onClick={handleCancel} 
                          style={{
                            background: '#ffffff',
                            color: '#dc2626',
                            border: '1px solid #fca5a5',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                        >
                          <XCircle size={14} />
                          Batalkan Pengajuan
                        </button>
                      </div>
                    </div>

                  </div>
                )}

                {myRegistration.status === 'Ditolak' && (
                  <div style={{
                    background: 'linear-gradient(180deg, #fef2f2 0%, #ffffff 100%)',
                    border: '1.5px solid #fecaca',
                    padding: '28px',
                    borderRadius: '18px',
                    boxShadow: '0 8px 24px -4px rgba(239, 68, 68, 0.1)'
                  }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <XCircle size={28} color="#dc2626" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'inline-block', background: '#fee2e2', color: '#991b1b', padding: '3px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', marginBottom: '8px' }}>
                          STATUS: PENGAJUAN DITOLAK
                        </div>
                        <h3 style={{ margin: '0 0 6px', color: '#991b1b', fontSize: '19px', fontWeight: '800' }}>
                          Mohon Maaf, Pengajuan Magang Belum Dapat Diterima
                        </h3>
                        <p style={{ margin: 0, color: '#b91c1c', fontSize: '13.5px', lineHeight: '1.6' }}>
                          Berdasarkan hasil verifikasi panitia, kuota magang untuk periode pilihan Anda mungkin sudah penuh atau berkas belum memenuhi kualifikasi instansi kami.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* KOLOM KANAN: KARTU RANGKUMAN BERKAS & IDENTITAS CALON PEMAGANG */}
              <div style={{
                background: '#ffffff',
                borderRadius: '18px',
                border: '1px solid #e2e8f0',
                padding: '26px',
                boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.06)'
              }}>
                
                {/* Header Kartu Rangkuman */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileCheck size={18} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Rangkuman Berkas</h3>
                      <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>Data pendaftaran yang tersimpan</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#16a34a', background: '#dcfce7', border: '1px solid #bbf7d0', padding: '3px 9px', borderRadius: '12px', fontWeight: '700' }}>
                    ✓ Terverifikasi Sistem
                  </span>
                </div>

                {/* Profil Singkat & Foto */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
                  <div style={{
                    width: '68px',
                    height: '90px',
                    borderRadius: '8px',
                    background: '#e2e8f0',
                    overflow: 'hidden',
                    flexShrink: 0,
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
                    border: '2px solid #ffffff'
                  }}>
                    {userPhoto ? (
                      <img src={userPhoto} alt="Pas Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        <Camera size={24} />
                      </div>
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {regUser.nama || regUser.name || displayName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#4f46e5', fontWeight: '700', marginTop: '2px' }}>
                      NIM: {regUser.nim || '-'}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Mail size={12} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{regUser.email || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Detail Informasi Akademik */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                  
                  {/* Instansi */}
                  <div style={{ paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Building size={12} color="#6366f1" />
                      Asal Instansi / Kampus
                    </div>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>
                      {myRegistration.asal_instansi || '-'}
                    </div>
                  </div>

                  {/* Program Studi */}
                  <div style={{ paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <BookOpen size={12} color="#6366f1" />
                      Program Studi / Jurusan
                    </div>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>
                      {regUser?.program_studi || myRegistration?.user?.program_studi || formData?.program_studi || loggedInUser?.program_studi || '-'}
                    </div>
                  </div>

                  {/* Periode Magang */}
                  <div style={{ paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={12} color="#6366f1" />
                      Gelombang Periode Magang
                    </div>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>
                      {regPeriode?.nama ? `${regPeriode.nama} : ` : ''}
                      {regPeriode?.tanggal_mulai ? `${formatDate(regPeriode.tanggal_mulai)} s.d. ${formatDate(regPeriode.tanggal_selesai)}` : 'Periode Magang Terpilih'}
                    </div>
                  </div>

                  {/* Alamat Domisili */}
                  <div style={{ paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <MapPin size={12} color="#6366f1" />
                      Alamat Tempat Tinggal
                    </div>
                    <div style={{ fontWeight: '500', color: '#334155', lineHeight: '1.4' }}>
                      {regUser.alamat || '-'}
                    </div>
                  </div>

                  {/* Berkas Surat Pengantar */}
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <FileText size={12} color="#6366f1" />
                      Surat Pengantar Kampus
                    </div>
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileText size={15} />
                        </div>
                        <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                          {myRegistration.file_surat_pengantar ? myRegistration.file_surat_pengantar.split('/').pop() : 'surat_pengantar.pdf'}
                        </span>
                      </div>

                      {myRegistration?.file_surat_pengantar && (
                        <button
                          type="button"
                          onClick={handleViewLetter}
                          disabled={isOpeningLetter}
                          title="Klik untuk melihat dokumen surat pengantar"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: isOpeningLetter ? '#f1f5f9' : '#ffffff',
                            color: isOpeningLetter ? '#94a3b8' : '#4f46e5',
                            border: '1px solid #c7d2fe',
                            padding: '6px 12px',
                            borderRadius: '7px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            cursor: isOpeningLetter ? 'not-allowed' : 'pointer',
                            flexShrink: 0,
                            boxShadow: '0 1px 3px rgba(79, 70, 229, 0.08)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isOpeningLetter ? (
                            <>
                              <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                              <span>Membuka...</span>
                            </>
                          ) : (
                            <>
                              <Eye size={13} />
                              <span>Lihat</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                </div>

                {/* Footer Security Watermark */}
                <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#94a3b8' }}>
                  <ShieldCheck size={14} color="#10b981" />
                  <span>Data terenkripsi dan disimpan resmi pada sistem PAM Techno.</span>
                </div>

              </div>

            </div>
          )}

          {/* TAMPILAN FORM PENDAFTARAN UTAMA (Saat Belum Mengajukan) */}
          {!isSubmitted && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              
              {/* Card 1: Informasi Identitas Akun */}
              <div style={{ background: '#ffffff', borderRadius: '18px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={20} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>Identitas Mahasiswa</h2>
                    <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>Data identitas utama yang terdaftar pada akun Anda.</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  
                  {/* Nama Lengkap */}
                  <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                      <User size={12} color="#6366f1" />
                      <span>Nama Lengkap</span>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                      {loggedInUser.nama || loggedInUser.name || '-'}
                    </div>
                  </div>

                  {/* NIM */}
                  <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                      <FileText size={12} color="#6366f1" />
                      <span>Nomor Induk Mahasiswa (NIM)</span>
                    </div>
                    {loggedInUser.nim ? (
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                        {loggedInUser.nim}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={formData.nim || ''}
                        onChange={(e) => setFormData({ ...formData, nim: e.target.value })}
                        placeholder="Ketik NIM Anda di sini"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#0f172a',
                          background: '#ffffff',
                          boxSizing: 'border-box',
                          outline: 'none',
                          marginTop: '2px'
                        }}
                      />
                    )}
                  </div>

                  {/* Email */}
                  <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                      <Mail size={12} color="#6366f1" />
                      <span>Email Terdaftar</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {loggedInUser.email || '-'}
                    </div>
                  </div>

                </div>
              </div>

              {/* Card 2: Informasi Akademik & Periode */}
              <div style={{ background: '#ffffff', borderRadius: '18px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building size={20} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>Data Akademik & Pilihan Periode</h2>
                    <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>Asal instansi kampus dan gelombang pelaksanaan magang.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Asal Instansi (Lebar Penuh) */}
                  <div style={{ width: '100%' }}>
                    <label style={labelStyle}>
                      <Building size={14} color="#4f46e5" />
                      <span>Asal Instansi / Universitas <span style={{ color: '#ef4444' }}>*</span></span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.asal_instansi} 
                      onChange={(e) => setFormData({ ...formData, asal_instansi: e.target.value })}
                      placeholder="Contoh: Universitas Indonesia / STT Payakumbuh"
                      style={{ ...inputStyle, width: '100%' }}
                      required 
                    />
                  </div>

                  {/* Program Studi (Lebar Penuh) */}
                  <div style={{ width: '100%' }}>
                    <label style={labelStyle}>
                      <BookOpen size={14} color="#4f46e5" />
                      <span>Program Studi / Jurusan <span style={{ color: '#ef4444' }}>*</span></span>
                    </label>
                    <input
                      type="text"
                      value={formData.program_studi}
                      onChange={(e) => setFormData({ ...formData, program_studi: e.target.value })}
                      placeholder="Contoh: Teknik Informatika / Sistem Informasi"
                      style={{ ...inputStyle, width: '100%' }}
                      required
                    />
                  </div>

                  {/* Periode Magang (Lebar Penuh) */}
                  <div style={{ width: '100%' }}>
                    <label style={labelStyle}>
                      <Calendar size={14} color="#4f46e5" />
                      <span>Pilih Gelombang / Periode Magang <span style={{ color: '#ef4444' }}>*</span></span>
                    </label>
                    <select 
                      value={formData.periode_id} 
                      onChange={(e) => setFormData({ ...formData, periode_id: e.target.value })}
                      style={{ ...inputStyle, width: '100%', cursor: 'pointer', background: '#f8fafc' }}
                      required
                    >
                      <option value="" disabled>-- Pilih Periode Magang Tersedia --</option>
                      {listPeriode.map(p => {
                        return (
                          <option key={p.id} value={p.id}>
                            {p.nama ? `${p.nama} : ` : ''}{formatDate(p.tanggal_mulai)} s.d. {formatDate(p.tanggal_selesai)}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                </div>
              </div>

              {/* Card 3: Kontak & Domisili */}
              <div style={{ background: '#ffffff', borderRadius: '18px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Phone size={20} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>Kontak & Domisili</h2>
                    <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>Nomor telepon aktif dan alamat tempat tinggal selama magang.</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
                  
                  {/* No HP */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>
                      <Phone size={14} color="#16a34a" />
                      <span>Nomor HP / WhatsApp Aktif <span style={{ color: '#ef4444' }}>*</span></span>
                    </label>
                    <input
                      type="tel"
                      value={formData.no_hp}
                      onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })}
                      placeholder="Contoh: 081234567890"
                      style={inputStyle}
                      required
                    />
                    <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      Pastikan nomor WhatsApp aktif untuk menerima pembaruan status pendaftaran.
                    </span>
                  </div>

                  {/* Alamat Domisili */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>
                      <MapPin size={14} color="#6366f1" />
                      <span>Alamat Domisili Saat Ini <span style={{ color: '#ef4444' }}>*</span></span>
                    </label>
                    <textarea
                      rows="2"
                      value={formData.alamat}
                      onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                      placeholder="Alamat domisili / tempat tinggal Anda saat magang..."
                      style={{ ...inputStyle, resize: 'vertical' }}
                      required
                    />
                  </div>

                </div>
              </div>

              {/* Card 4: Berkas Persyaratan Magang */}
              <div style={{ background: '#ffffff', borderRadius: '18px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UploadCloud size={20} />
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>Berkas Persyaratan Magang</h2>
                      <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>Unggah surat pengantar resmi dari kampus dan pas foto formal Anda.</p>
                    </div>
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: '#065f46' }}>
                    <Sparkles size={14} color="#059669" />
                    <span>Auto-Kompresi Aktif</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '22px' }}>
                  
                  {/* Upload Surat Pengantar */}
                  <div>
                    <label style={labelStyle}>
                      <FileText size={14} color="#4f46e5" />
                      <span>Surat Pengantar Kampus (.pdf) <span style={{ color: '#ef4444' }}>*</span></span>
                    </label>
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      padding: '24px 16px',
                      borderRadius: '12px',
                      border: formData.file_surat_pengantar ? '2px solid #86efac' : '2px dashed #cbd5e1',
                      background: formData.file_surat_pengantar ? '#f0fdf4' : '#f8fafc',
                      textAlign: 'center',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s',
                      cursor: compressingPdf ? 'wait' : 'pointer'
                    }}>
                      <input 
                        type="file" 
                        accept=".pdf,image/jpeg,image/png,.jpg,.jpeg,.png"
                        onChange={handleDocumentUpload}
                        disabled={compressingPdf}
                        style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: compressingPdf ? 'wait' : 'pointer' }}
                        required={!formData.file_surat_pengantar}
                      />
                      <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: formData.file_surat_pengantar ? '#dcfce7' : '#e0e7ff', color: formData.file_surat_pengantar ? '#16a34a' : '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                        {compressingPdf ? (
                          <div style={{ width: '22px', height: '22px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        ) : formData.file_surat_pengantar ? (
                          <Check size={24} />
                        ) : (
                          <UploadCloud size={24} />
                        )}
                      </div>
                      <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: '700', marginBottom: '3px' }}>
                        {compressingPdf
                          ? 'Mengompresi Dokumen...'
                          : formData.file_surat_pengantar
                            ? formData.file_surat_pengantar.name
                            : 'Pilih Berkas PDF / Scan Surat'}
                      </div>
                      <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#64748b' }}>
                        {compressingPdf
                          ? 'Sedang mengompresi dokumen...'
                          : formData.file_surat_pengantar
                            ? '✓ Dokumen siap dikirimkan'
                            : 'Klik atau seret file PDF surat pengantar (Bisa file PDF atau foto scan)'}
                      </p>

                      {/* Info kompresi dokumen */}
                      {pdfCompressionInfo && !compressingPdf && (
                        <div style={{
                          marginTop: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: '#dcfce7',
                          border: '1px solid #86efac',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#15803d'
                        }}>
                          <span>
                            {pdfCompressionInfo.originalSizeFormatted !== pdfCompressionInfo.compressedSizeFormatted
                              ? `${pdfCompressionInfo.originalSizeFormatted} ➔ ${pdfCompressionInfo.compressedSizeFormatted}`
                              : `Ukuran: ${pdfCompressionInfo.compressedSizeFormatted}`}
                            {pdfCompressionInfo.savedPercent > 0 && ` (-${pdfCompressionInfo.savedPercent}%)`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload Pas Foto 3x4 */}
                  <div>
                    <label style={labelStyle}>
                      <Camera size={14} color="#4f46e5" />
                      <span>Pas Foto Formal 3 × 4 <span style={{ color: '#ef4444' }}>*</span></span>
                    </label>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ width: '70px', height: '92px', borderRadius: '8px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, border: '2px solid #cbd5e1' }}>
                        {photoPreview ? (
                          <img src={photoPreview} alt="Preview Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Camera size={26} color="#94a3b8" />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input 
                          type="file" 
                          accept="image/jpeg,image/png,image/jpg"
                          onChange={handlePhotoUpload}
                          disabled={compressingPhoto}
                          required={!formData.pas_foto}
                          style={{ display: 'block', width: '100%', fontSize: '13px', color: '#475569', cursor: compressingPhoto ? 'wait' : 'pointer' }}
                        />
                        <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '6px', lineHeight: '1.4' }}>
                          Format: JPG, JPEG, PNG. Foto akan otomatis dikompres.
                        </span>

                        {compressingPhoto && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#4f46e5', fontWeight: '600', marginTop: '6px' }}>
                            <div style={{ width: '12px', height: '12px', border: '2px solid #4f46e5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            <span>Mengompresi pas foto...</span>
                          </div>
                        )}

                        {photoCompressionInfo && !compressingPhoto && (
                          <div style={{
                            marginTop: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: '#dcfce7',
                            border: '1px solid #86efac',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: '#15803d'
                          }}>
                            <span>
                              {photoCompressionInfo.originalSizeFormatted !== photoCompressionInfo.compressedSizeFormatted
                                ? `${photoCompressionInfo.originalSizeFormatted} ➔ ${photoCompressionInfo.compressedSizeFormatted}`
                                : `Ukuran: ${photoCompressionInfo.compressedSizeFormatted}`}
                              {photoCompressionInfo.savedPercent > 0 && ` (-${photoCompressionInfo.savedPercent}%)`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Submit Action Box */}
              <div style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '24px 28px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={22} color="#16a34a" />
                  <span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                    Pastikan seluruh data dan berkas yang Anda unggah sudah benar sebelum dikirimkan ke Admin.
                  </span>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting || listPeriode.length === 0}
                  style={{
                    background: isSubmitting || listPeriode.length === 0 ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                    color: '#ffffff',
                    padding: '14px 28px',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: isSubmitting || listPeriode.length === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: '700',
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { if (!isSubmitting && listPeriode.length > 0) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                >
                  <Send size={16} />
                  <span>{isSubmitting ? 'Mengirim Data...' : 'Kirim Pengajuan Magang'}</span>
                </button>
              </div>

            </form>
          )}

        </div>
      </main>

    </div>
  );
}