import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { getStoredUser } from '../../utils/auth';
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
  MessageCircle
} from 'lucide-react';

export default function FormPendaftaran() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [myRegistration, setMyRegistration] = useState(null);
  const [replyLetterMessage, setReplyLetterMessage] = useState('');
  const [isDownloadingReplyLetter, setIsDownloadingReplyLetter] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(() => getStoredUser() || {});
  const [waNotification, setWaNotification] = useState(null);
  const [showWaModal, setShowWaModal] = useState(false);
  
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
          // Peserta yang sudah diterima tetap dapat mengakses halaman ini untuk mengunduh ulang surat balasan kapan saja
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

  const handleCancel = async () => {
    if (!window.confirm('Apakah Anda yakin ingin membatalkan pengajuan magang ini?')) return;
    try {
      const response = await api.put('/pendaftaran/cancel');
      setMyRegistration(response.data.data);
      alert(response.data.message || 'Pengajuan magang berhasil dibatalkan.');
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
    window.location.replace('/login');
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1.5px solid #cbd5e1',
    outline: 'none',
    fontSize: '14px',
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)', flexDirection: 'column' }}>
      
      {/* Top Navbar Modern */}
      <header style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '14px 28px', color: '#ffffff', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)' }}>
              <GraduationCap size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '-0.2px', color: '#f8fafc' }}>
                {myRegistration?.status === 'Pemagang Aktif' ? 'Portal Peserta Magang' : 'Portal Calon Pemagang'}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                Sistem Pendaftaran & Administrasi Magang
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.06)', padding: '6px 14px', borderRadius: '30px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#f1f5f9' }}>
                {displayName}
              </span>
            </div>

            <button 
              onClick={handleLogout} 
              title="Keluar dari akun"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                background: 'rgba(239, 68, 68, 0.12)', 
                color: '#f87171', 
                border: '1px solid rgba(239, 68, 68, 0.25)', 
                padding: '7px 14px', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontWeight: '600', 
                fontSize: '13px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'; e.currentTarget.style.color = '#f87171'; }}
            >
              <LogOut size={14} />
              <span>Keluar</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '32px 20px 60px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Hero Banner Modern */}
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1e3a8a 100%)',
            borderRadius: '18px',
            padding: '30px 34px',
            color: '#ffffff',
            boxShadow: '0 10px 30px -5px rgba(30, 27, 75, 0.35)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0) 70%)', pointerEvents: 'none' }}></div>
            <div style={{ position: 'absolute', bottom: '-60px', left: '30%', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0) 70%)', pointerEvents: 'none' }}></div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)', padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
                <Sparkles size={13} color="#fbbf24" />
                <span>Program Magang Resmi</span>
              </div>
              <h1 style={{ margin: '0 0 8px', fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px', color: '#ffffff' }}>
                Formulir Pengajuan Magang Baru
              </h1>
              <p style={{ margin: 0, fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6', maxWidth: '620px' }}>
                Lengkapi biodata diri, identitas akademik kampus, dan unggah berkas persyaratan resmi untuk diproses dan diverifikasi oleh Admin.
              </p>

              {/* Stepper Wizard Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.12)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: isSubmitted ? '#10b981' : '#38bdf8', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                    {isSubmitted ? '✓' : '1'}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#f8fafc' }}>1. Isi Formulir</span>
                </div>
                <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '12px' }}>—</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: isSubmitted ? 1 : 0.65 }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: isSubmitted ? (myRegistration?.status === 'Pemagang Aktif' ? '#10b981' : '#f59e0b') : 'rgba(255, 255, 255, 0.18)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                    2
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#f8fafc' }}>2. Verifikasi Admin</span>
                </div>
                <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '12px' }}>—</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: myRegistration?.status === 'Pemagang Aktif' ? 1 : 0.65 }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: myRegistration?.status === 'Pemagang Aktif' ? '#10b981' : 'rgba(255, 255, 255, 0.18)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                    3
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#f8fafc' }}>3. Mulai Magang</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Alert Dinamis Saat Sudah Mengajukan */}
          {isSubmitted && myRegistration && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {myRegistration.status === 'Pemagang Aktif' && (
                <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', padding: '28px', borderRadius: '16px', display: 'flex', gap: '20px', alignItems: 'flex-start', boxShadow: '0 6px 16px rgba(34, 197, 94, 0.1)' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle2 size={28} color="#16a34a" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'inline-block', background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>
                      STATUS: DITERIMA
                    </div>
                    <h3 style={{ margin: '0 0 8px 0', color: '#14532d', fontSize: '20px', fontWeight: '800' }}>
                      Selamat! Pengajuan Magang Anda Telah Disetujui
                    </h3>
                    <p style={{ margin: 0, color: '#166534', fontSize: '14px', lineHeight: '1.6' }}>
                      Anda telah resmi terdaftar sebagai pemagang aktif untuk periode <strong>{myRegistration.periode ? `${new Date(myRegistration.periode.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} s.d. ${new Date(myRegistration.periode.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` : '-'}</strong>.
                      <br/>Pembimbing Lapangan yang ditugaskan: <strong>{myRegistration.pembimbing?.nama || myRegistration.pembimbing?.name || 'Belum Ditentukan'}</strong>
                    </p>

                    {myRegistration.file_surat_balasan && (
                      <div style={{ marginTop: '20px', padding: '16px 20px', background: '#ffffff', borderRadius: '12px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FileText size={15} />
                            SURAT BALASAN RESMI KANTOR
                          </div>
                          <div style={{ fontSize: '13px', color: '#4b5563', marginTop: '2px' }}>
                            {myRegistration.file_surat_balasan.split('/').pop()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleDownloadReplyLetter}
                          disabled={isDownloadingReplyLetter}
                          style={{ background: '#16a34a', color: '#ffffff', padding: '10px 18px', border: 'none', borderRadius: '8px', cursor: isDownloadingReplyLetter ? 'wait' : 'pointer', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)' }}
                        >
                          <Download size={16} />
                          {isDownloadingReplyLetter ? 'Mengunduh...' : myRegistration.surat_balasan_diterima_at ? 'Unduh Ulang Surat' : 'Unduh Surat Balasan Resmi'}
                        </button>
                      </div>
                    )}
                    {replyLetterMessage && <p role="status" style={{ margin: '12px 0 0', color: '#166534', fontSize: '13px', fontWeight: '500' }}>{replyLetterMessage}</p>}
                    
                    {myRegistration.surat_balasan_diterima_at && (
                      <div style={{ marginTop: '16px' }}>
                        <Link to="/absensi" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#4338ca', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '14px', boxShadow: '0 4px 10px rgba(67, 56, 202, 0.3)' }}>
                          <span>Buka Menu Absensi Sekarang</span>
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {myRegistration.status === 'Calon Pemagang' && (
                <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', padding: '28px', borderRadius: '16px', display: 'flex', gap: '20px', alignItems: 'flex-start', boxShadow: '0 6px 16px rgba(59, 130, 246, 0.08)' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock size={28} color="#2563eb" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'inline-block', background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>
                      STATUS: MENUNGGU VERIFIKASI
                    </div>
                    <h3 style={{ margin: '0 0 8px 0', color: '#1e3a8a', fontSize: '19px', fontWeight: '800' }}>
                      Berkas Pengajuan Anda Sedang Ditinjau Admin
                    </h3>
                    <p style={{ margin: 0, color: '#1e40af', fontSize: '14px', lineHeight: '1.6' }}>
                      Terima kasih telah mengajukan magang! Berkas persyaratan Anda (Surat Pengantar dan Pas Foto) sudah berhasil masuk ke sistem kami dan sedang menunggu persetujuan dari tim Administrator. Silakan pantau halaman ini secara berkala.
                    </p>

                    {/* Status Konfirmasi Berkas Pendaftaran */}
                    <div style={{ marginTop: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#22c55e', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(34, 197, 94, 0.25)' }}>
                        <CheckCircle2 size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#15803d' }}>
                          Pendaftaran Berhasil Masuk ke Antrean Verifikasi
                        </div>
                        <div style={{ fontSize: '12.5px', color: '#166534', marginTop: '2px', lineHeight: '1.5' }}>
                          Seluruh berkas persyaratan telah kami simpan dengan aman. Admin Penerimaan Magang PAM Techno akan memverifikasi kelengkapan berkas Anda. Kontak WhatsApp terdaftar Anda: <strong>{loggedInUser.no_hp || myRegistration.user?.no_hp || '-'}</strong>.
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '18px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button 
                        onClick={handleCancel} 
                        style={{ background: '#ffffff', color: '#dc2626', border: '1px solid #fca5a5', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s ease' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                      >
                        <XCircle size={15} />
                        Batalkan Pengajuan
                      </button>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Pengajuan dikirim pada: {new Date(myRegistration.created_at || myRegistration.tanggal_daftar || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              )}

              {myRegistration.status === 'Ditolak' && (
                <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', padding: '28px', borderRadius: '16px', display: 'flex', gap: '20px', alignItems: 'flex-start', boxShadow: '0 6px 16px rgba(239, 68, 68, 0.08)' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <XCircle size={28} color="#dc2626" />
                  </div>
                  <div>
                    <div style={{ display: 'inline-block', background: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>
                      STATUS: PENDAFTARAN DITOLAK
                    </div>
                    <h3 style={{ margin: '0 0 8px 0', color: '#991b1b', fontSize: '19px', fontWeight: '800' }}>
                      Mohon Maaf, Pengajuan Magang Belum Dapat Diterima
                    </h3>
                    <p style={{ margin: 0, color: '#b91c1c', fontSize: '14px', lineHeight: '1.6' }}>
                      Berdasarkan hasil verifikasi panitia, kuota magang untuk periode pilihan Anda mungkin sudah penuh atau berkas belum memenuhi kualifikasi instansi kami. Anda dapat menghubungi pihak Admin untuk informasi lebih lanjut.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form Pengajuan Utama (Hanya Tampil Jika Belum Mengajukan) */}
          {!isSubmitted && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              
              {/* Card 1: Informasi Identitas Akun */}
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '26px 28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={18} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Identitas Mahasiswa</h2>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Data identitas utama yang terdaftar pada akun Anda.</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  
                  {/* Nama Lengkap */}
                  <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                      <User size={12} color="#6366f1" />
                      <span>Nama Lengkap</span>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                      {loggedInUser.nama || loggedInUser.name || '-'}
                    </div>
                  </div>

                  {/* NIM */}
                  <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
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
                          borderRadius: '6px',
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
                  <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                      <Mail size={12} color="#6366f1" />
                      <span>Email Terdaftar</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                      {loggedInUser.email || '-'}
                    </div>
                  </div>

                </div>
              </div>

              {/* Card 2: Informasi Akademik & Periode */}
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '26px 28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building size={18} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Data Akademik & Pilihan Periode</h2>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Asal instansi kampus dan gelombang pelaksanaan magang.</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
                  
                  {/* Asal Instansi */}
                  <div>
                    <label style={labelStyle}>
                      <Building size={14} color="#4f46e5" />
                      <span>Asal Instansi / Universitas <span style={{ color: '#ef4444' }}>*</span></span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.asal_instansi} 
                      onChange={(e) => setFormData({ ...formData, asal_instansi: e.target.value })}
                      placeholder="Contoh: Universitas Indonesia"
                      style={inputStyle}
                      required 
                    />
                  </div>

                  {/* Program Studi */}
                  <div>
                    <label style={labelStyle}>
                      <BookOpen size={14} color="#4f46e5" />
                      <span>Program Studi / Jurusan <span style={{ color: '#ef4444' }}>*</span></span>
                    </label>
                    <input
                      type="text"
                      value={formData.program_studi}
                      onChange={(e) => setFormData({ ...formData, program_studi: e.target.value })}
                      placeholder="Contoh: Teknik Informatika / Sistem Informasi"
                      style={inputStyle}
                      required
                    />
                  </div>

                  {/* Periode Magang */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>
                      <Calendar size={14} color="#4f46e5" />
                      <span>Pilih Gelombang / Periode Magang <span style={{ color: '#ef4444' }}>*</span></span>
                    </label>
                    <select 
                      value={formData.periode_id} 
                      onChange={(e) => setFormData({ ...formData, periode_id: e.target.value })}
                      style={{ ...inputStyle, cursor: 'pointer', background: '#f8fafc' }}
                      required
                    >
                      <option value="" disabled>-- Pilih Periode Magang Tersedia --</option>
                      {listPeriode.map(p => {
                        const formatDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
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
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '26px 28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Phone size={18} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Kontak & Domisili</h2>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Nomor telepon aktif dan alamat tempat tinggal selama magang.</p>
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
                      maxLength={20}
                      style={inputStyle}
                      required
                    />
                    <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '5px' }}>
                      *Pastikan nomor terhubung dengan WhatsApp untuk konfirmasi pengumuman penerimaan.
                    </span>
                  </div>

                  {/* Alamat Domisili */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>
                      <MapPin size={14} color="#ef4444" />
                      <span>Alamat Domisili Lengkap <span style={{ color: '#ef4444' }}>*</span></span>
                    </label>
                    <textarea
                      value={formData.alamat}
                      onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                      placeholder="Masukkan alamat tempat tinggal / kost / domisili lengkap Anda saat ini..."
                      maxLength={1000}
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical' }}
                      required
                    />
                  </div>

                </div>
              </div>

              {/* Card 4: Berkas Persyaratan (PDF & Pas Foto) */}
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '26px 28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UploadCloud size={18} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Berkas Persyaratan Magang</h2>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Unggah surat pengantar resmi dari kampus dan pas foto formal Anda.</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                  
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
                      border: formData.file_surat_pengantar ? '2px solid #22c55e' : '2px dashed #cbd5e1',
                      borderRadius: '12px',
                      textAlign: 'center',
                      background: formData.file_surat_pengantar ? '#f0fdf4' : '#f8fafc',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}>
                      <input 
                        type="file" 
                        accept=".pdf"
                        onChange={(e) => setFormData({ ...formData, file_surat_pengantar: e.target.files[0] })}
                        style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                        required
                      />
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: formData.file_surat_pengantar ? '#dcfce7' : '#e0e7ff', color: formData.file_surat_pengantar ? '#16a34a' : '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                        {formData.file_surat_pengantar ? <Check size={22} /> : <UploadCloud size={22} />}
                      </div>
                      <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: '700', marginBottom: '3px' }}>
                        {formData.file_surat_pengantar ? formData.file_surat_pengantar.name : 'Pilih Berkas PDF'}
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                        {formData.file_surat_pengantar ? '✓ File PDF berhasil dipilih' : 'Klik atau seret file PDF surat pengantar (Maks. 2MB)'}
                      </p>
                    </div>
                  </div>

                  {/* Upload Pas Foto 3x4 */}
                  <div>
                    <label style={labelStyle}>
                      <Camera size={14} color="#4f46e5" />
                      <span>Pas Foto Formal 3 × 4 <span style={{ color: '#ef4444' }}>*</span></span>
                    </label>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Pratinjau pas foto"
                          style={{ width: '84px', height: '112px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #3b82f6', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{ width: '84px', height: '112px', borderRadius: '8px', border: '2px dashed #94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '11px', textAlign: 'center', flexShrink: 0, background: '#ffffff' }}>
                          <Camera size={24} style={{ marginBottom: '4px', opacity: 0.6 }} />
                          <span>Ukuran<br />3 × 4</span>
                        </div>
                      )}
                      
                      <div style={{ flex: 1 }}>
                        <input
                          id="application-photo"
                          type="file"
                          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            if (file && file.size > 2 * 1024 * 1024) {
                              alert('Ukuran pas foto maksimal 2 MB.');
                              e.target.value = '';
                              return;
                            }
                            if (photoPreviewUrl.current) URL.revokeObjectURL(photoPreviewUrl.current);
                            photoPreviewUrl.current = file ? URL.createObjectURL(file) : null;
                            setPhotoPreview(photoPreviewUrl.current);
                            setFormData({ ...formData, pas_foto: file });
                          }}
                          required
                          style={{ display: 'block', width: '100%', fontSize: '13px', color: '#475569' }}
                        />
                        <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '6px', lineHeight: '1.4' }}>
                          Format file: JPG, JPEG, atau PNG.<br />Gunakan foto berpakaian rapi / almamater formal.
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Submit Action Box */}
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px 28px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)' }}>
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
                    borderRadius: '10px',
                    cursor: isSubmitting || listPeriode.length === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: '700',
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
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
