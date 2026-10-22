import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { getStoredUser } from '../../utils/auth';

export default function FormPendaftaran() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [myRegistration, setMyRegistration] = useState(null);
  const [replyLetterMessage, setReplyLetterMessage] = useState('');
  const [isDownloadingReplyLetter, setIsDownloadingReplyLetter] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(() => getStoredUser() || {});
  const [formData, setFormData] = useState({ 
    no_hp: loggedInUser.no_hp || '',
    program_studi: loggedInUser.program_studi || '',
    alamat: loggedInUser.alamat || '',
    pas_foto: null,
    asal_instansi: '', 
    periode_id: '', 
    file_surat_pengantar: null
  });

  const [listPeriode, setListPeriode] = useState([]);
  const displayName = loggedInUser.name || loggedInUser.nama || loggedInUser.email || 'Pengguna';
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
            no_hp: user.no_hp || current.no_hp,
            program_studi: user.program_studi || current.program_studi,
            alamat: user.alamat || current.alamat,
          }));
        }
        setListPeriode(periodeRes.data.data);
        if (pendaftaranRes.data.data) {
          const reg = pendaftaranRes.data.data;
          setMyRegistration(reg);
          if (reg.user) {
            setLoggedInUser(reg.user);
          }
          setIsSubmitted(true);
          if (reg.status === 'Pemagang Aktif' && (!reg.file_surat_balasan || reg.surat_balasan_diterima_at)) {
            window.location.replace('/absensi');
            return;
          }
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

    const payload = new FormData();
    payload.append('no_hp', formData.no_hp);
    payload.append('program_studi', formData.program_studi);
    payload.append('alamat', formData.alamat);
    payload.append('periode_id', formData.periode_id);
    payload.append('asal_instansi', formData.asal_instansi);
    payload.append('pas_foto', formData.pas_foto);
    if (formData.file_surat_pengantar) {
      payload.append('file_surat_pengantar', formData.file_surat_pengantar);
    }

    try {
      const response = await api.post('/pendaftaran', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      const updatedUser = response.data.data.user;
      if (updatedUser) {
        setLoggedInUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      setMyRegistration(response.data.data);
      setIsSubmitted(true);
      alert(response.data.message);
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal mengirim pendaftaran');
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
        surat_balasan_diterima_at: new Date().toISOString(),
      }));
      setReplyLetterMessage('Surat balasan berhasil diunduh. Mengalihkan ke halaman absensi...');
      window.setTimeout(() => {
        window.location.replace('/absensi');
      }, 1200);
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
      alert(response.data.message);
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", background: '#f8fafc', flexDirection: 'column' }}>
      <nav style={{ background: '#1e293b', padding: '15px 30px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: '#3b82f6', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '16px' }}>🎓</div>
          <h3 style={{ margin: 0, fontWeight: '600' }}>
            {myRegistration?.status === 'Pemagang Aktif' ? 'Portal Peserta Magang' : 'Portal Calon Pemagang'}
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '14px', color: '#cbd5e1' }}>Halo, {displayName}!</span>
          <button onClick={handleLogout} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Logout</button>
        </div>
      </nav>

      <div style={{ flex: 1, padding: '40px 20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div style={{ width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Status Alert Dinamis */}
          {isSubmitted && myRegistration && (
            <>
              {myRegistration.status === 'Pemagang Aktif' && (
                <div style={{ background: '#f0fdf4', border: '2px solid #4ade80', padding: '25px', borderRadius: '12px', display: 'flex', gap: '20px', alignItems: 'flex-start', boxShadow: '0 4px 6px -1px rgba(74, 222, 128, 0.2)' }}>
                  <div style={{ fontSize: '32px' }}>🎉</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#166534', fontSize: '18px' }}>Selamat! Pendaftaran Magang Anda Diterima</h4>
                    <p style={{ margin: 0, color: '#15803d', fontSize: '14px', lineHeight: '1.6' }}>
                      Anda telah resmi terdaftar sebagai pemagang aktif untuk periode <strong>{myRegistration.periode ? `${new Date(myRegistration.periode.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase()} - ${new Date(myRegistration.periode.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase()}` : '-'}</strong>.
                      <br/>Pembimbing Lapangan Anda adalah: <strong>{myRegistration.pembimbing?.nama}</strong>
                    </p>
                    {myRegistration.file_surat_balasan && (
                      <div style={{ marginTop: '15px', padding: '15px', background: 'white', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#166534' }}>SURAT BALASAN RESMI</div>
                            <div style={{ fontSize: '14px', color: '#374151' }}>📄 {myRegistration.file_surat_balasan}</div>
                        </div>
                        <button
                          type="button"
                          onClick={handleDownloadReplyLetter}
                          disabled={isDownloadingReplyLetter}
                          style={{ marginTop: '12px', background: '#16a34a', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '6px', cursor: isDownloadingReplyLetter ? 'wait' : 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                        >
                          {isDownloadingReplyLetter ? 'Mengunduh...' : myRegistration.surat_balasan_diterima_at ? 'Unduh Ulang Surat' : 'Unduh Surat Balasan'}
                        </button>
                        {replyLetterMessage && <p role="status" style={{ margin: '10px 0 0', color: '#166534', fontSize: '13px' }}>{replyLetterMessage}</p>}
                        {myRegistration.surat_balasan_diterima_at && (
                          <Link to="/absensi" style={{ display: 'inline-block', marginTop: '12px', marginLeft: '10px', color: '#4338ca', fontWeight: '600', fontSize: '13px' }}>
                            Lanjut ke absensi →
                          </Link>
                        )}
                      </div>
                    )}
                    {!myRegistration.file_surat_balasan && (
                      <p style={{ marginTop: '15px', color: '#92400e', fontSize: '14px' }}>
                        Surat balasan belum tersedia. Hubungi admin agar surat diunggah sebelum Anda melakukan absensi.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {myRegistration.status === 'Ditolak' && (
                <div style={{ background: '#fef2f2', border: '2px solid #f87171', padding: '25px', borderRadius: '12px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '32px' }}>❌</div>
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', color: '#991b1b', fontSize: '18px' }}>Mohon Maaf, Pendaftaran Ditolak</h4>
                    <p style={{ margin: 0, color: '#b91c1c', fontSize: '14px', lineHeight: '1.6' }}>
                      Berdasarkan verifikasi kami, kuota magang untuk periode ini mungkin sudah penuh atau berkas Anda belum memenuhi syarat.
                    </p>
                  </div>
                </div>
              )}

              {myRegistration.status === 'Calon Pemagang' && (
                <div style={{ background: '#eff6ff', border: '2px solid #93c5fd', padding: '25px', borderRadius: '12px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '32px' }}>⏳</div>
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', color: '#1e40af', fontSize: '18px' }}>Berkas Sedang Diproses</h4>
                    <p style={{ margin: 0, color: '#1d4ed8', fontSize: '14px', lineHeight: '1.6' }}>
                      Berkas pendaftaran magang Anda berhasil dikirim dan saat ini sedang menunggu proses verifikasi oleh Admin kami. Silakan cek halaman ini secara berkala.
                    </p>
                    <button onClick={handleCancel} style={{ marginTop: '15px', background: '#ef4444', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }}>
                      Batalkan Pengajuan
                    </button>
                  </div>
                </div>
              )}

              {myRegistration.status === 'Dibatalkan' && (
                <div style={{ background: '#f8fafc', border: '2px solid #cbd5e1', padding: '25px', borderRadius: '12px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '32px' }}>📁</div>
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '18px' }}>Pengajuan Dibatalkan</h4>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>
                      Anda telah membatalkan pengajuan magang ini. Data pendaftaran tetap tersimpan sebagai riwayat.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {myRegistration?.status === 'Pemagang Aktif' && (
            <section style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)' }}>
              <h3 style={{ margin: '0 0 16px', color: '#0f172a', fontSize: '18px' }}>Fitur Peserta Magang</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {[
                  ...(myRegistration.surat_balasan_diterima_at ? [{ to: '/absensi', title: 'Absensi Magang', description: 'Lihat dan catat kehadiran.' }] : []),
                  { to: '/tugas', title: 'Tugas Magang', description: 'Lihat tugas dan kumpulkan hasil.' },
                  { to: '/laporan', title: 'Laporan Magang', description: 'Kelola dan kirim laporan.' },
                ].map((feature) => (
                  <Link
                    key={feature.to}
                    to={feature.to}
                    style={{ display: 'block', padding: '16px', border: '1px solid #cbd5e1', borderRadius: '10px', color: '#1e293b', textDecoration: 'none', background: '#f8fafc' }}
                  >
                    <strong style={{ display: 'block', marginBottom: '6px', color: '#4338ca' }}>{feature.title}</strong>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>{feature.description}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Main Form Card (Hanya muncul jika belum daftar) */}
          {!isSubmitted && (
            <div style={{ background: 'white', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
              <h2 style={{ margin: '0 0 5px 0', color: '#0f172a', fontSize: '22px' }}>Pengajuan Magang Baru</h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '30px' }}>Lengkapi informasi diri dan pastikan data sesuai dengan surat pengantar.</p>

              {listPeriode.length === 0 && (
                <div role="alert" style={{ marginBottom: '20px', padding: '14px 16px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', fontSize: '14px', lineHeight: 1.5 }}>
                  Belum ada periode pendaftaran magang. Hubungi admin agar menambahkan periode sebelum Anda mengirim pengajuan.
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <section style={{ padding: '18px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 14px', fontSize: '16px', color: '#0f172a' }}>Informasi Pribadi</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    {[
                      ['Nama Lengkap', loggedInUser.nama || loggedInUser.name || '-'],
                      ['NIM', loggedInUser.nim || '-'],
                      ['Email', loggedInUser.email || '-'],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <span style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#64748b' }}>{label}</span>
                        <div style={{ fontSize: '14px', color: '#334155', fontWeight: '500' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <div>
                  <label htmlFor="application-phone" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>No. HP / WhatsApp <span style={{color: '#ef4444'}}>*</span></label>
                  <input
                    id="application-phone"
                    type="tel"
                    value={formData.no_hp}
                    onChange={(e) => setFormData({...formData, no_hp: e.target.value})}
                    placeholder="Contoh: 081234567890"
                    autoComplete="tel"
                    maxLength={20}
                    style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box', color: '#334155', background: 'white' }}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="application-study-program" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>Program Studi / Jurusan <span style={{color: '#ef4444'}}>*</span></label>
                  <input
                    id="application-study-program"
                    type="text"
                    value={formData.program_studi}
                    onChange={(e) => setFormData({...formData, program_studi: e.target.value})}
                    placeholder="Contoh: Teknik Informatika"
                    maxLength={150}
                    style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box', color: '#334155', background: 'white' }}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="application-address" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>Alamat Domisili <span style={{color: '#ef4444'}}>*</span></label>
                  <textarea
                    id="application-address"
                    value={formData.alamat}
                    onChange={(e) => setFormData({...formData, alamat: e.target.value})}
                    placeholder="Masukkan alamat domisili lengkap"
                    maxLength={1000}
                    rows={3}
                    autoComplete="street-address"
                    style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box', color: '#334155', background: 'white', resize: 'vertical' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>Asal Instansi / Universitas <span style={{color: '#ef4444'}}>*</span></label>
                  <input 
                    type="text" 
                    value={formData.asal_instansi} 
                    onChange={(e) => setFormData({...formData, asal_instansi: e.target.value})}
                    placeholder="Contoh: Universitas Indonesia"
                    style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box', transition: 'border-color 0.2s', color: '#334155', background: 'white' }}
                    onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    required 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>Pilih Gelombang / Periode <span style={{color: '#ef4444'}}>*</span></label>
                  <select 
                    value={formData.periode_id} 
                    onChange={(e) => setFormData({...formData, periode_id: e.target.value})}
                    style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box', background: 'white', color: '#334155' }}
                    required
                  >
                    <option value="" disabled>-- {listPeriode.length ? 'Pilih Periode' : 'Periode Belum Tersedia'} --</option>
                    {listPeriode.map(p => {
                      const formatDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase();
                      return (
                        <option key={p.id} value={p.id}>
                          {formatDate(p.tanggal_mulai)} - {formatDate(p.tanggal_selesai)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>Upload Surat Pengantar (.pdf) <span style={{color: '#ef4444'}}>*</span></label>
                  <div style={{ position: 'relative', width: '100%', padding: '30px', border: '2px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', background: '#f8fafc', boxSizing: 'border-box', transition: 'all 0.2s' }}>
                    <input 
                      type="file" 
                      accept=".pdf"
                      onChange={(e) => setFormData({...formData, file_surat_pengantar: e.target.files[0]})}
                      style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                      required
                    />
                    <div style={{ fontSize: '30px', marginBottom: '10px' }}>📄</div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                      {formData.file_surat_pengantar ? formData.file_surat_pengantar.name : 'Klik atau seret file PDF ke sini'}
                    </p>
                    <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#94a3b8' }}>Maksimal ukuran file: 2MB</p>
                  </div>
                </div>

                <div>
                  <label htmlFor="application-photo" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>
                    Pas Foto 3 × 4 <span style={{color: '#ef4444'}}>*</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Pratinjau pas foto 3 x 4"
                        style={{ width: '90px', height: '120px', objectFit: 'cover', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f1f5f9' }}
                      />
                    ) : (
                      <div style={{ width: '90px', height: '120px', display: 'grid', placeItems: 'center', textAlign: 'center', padding: '8px', boxSizing: 'border-box', color: '#64748b', border: '1px dashed #94a3b8', borderRadius: '6px', background: '#f8fafc', fontSize: '12px' }}>
                        Pratinjau<br />3 × 4
                      </div>
                    )}
                    <div style={{ flex: '1 1 240px' }}>
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
                        style={{ display: 'block', width: '100%', fontSize: '14px', color: '#334155' }}
                      />
                      <p style={{ margin: '8px 0 0', fontSize: '12px', lineHeight: 1.5, color: '#64748b' }}>
                        Pilih foto JPG, JPEG, atau PNG. Pratinjau menggunakan rasio 3:4 dan ukuran file maksimal 2 MB.
                      </p>
                    </div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />

                <button 
                  type="submit" 
                  disabled={listPeriode.length === 0}
                  style={{ background: listPeriode.length === 0 ? '#94a3b8' : '#4f46e5', color: 'white', padding: '14px', border: 'none', borderRadius: '8px', cursor: listPeriode.length === 0 ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '15px', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.4)' }}
                >
                  Kirim Pengajuan Magang
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
