import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

export default function FormPendaftaran() {
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [myRegistration, setMyRegistration] = useState(null);
  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [formData, setFormData] = useState({ 
    asal_instansi: '', 
    periode_id: '', 
    file_surat_pengantar: null
  });

  const [listPeriode, setListPeriode] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [periodeRes, pendaftaranRes] = await Promise.all([
          api.get('/periode'),
          api.get('/pendaftaran/me')
        ]);
        setListPeriode(periodeRes.data.data);
        if (pendaftaranRes.data.data) {
          setMyRegistration(pendaftaranRes.data.data);
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
    
    const payload = new FormData();
    payload.append('periode_id', formData.periode_id);
    payload.append('asal_instansi', formData.asal_instansi);
    if (formData.file_surat_pengantar) {
      payload.append('file_surat_pengantar', formData.file_surat_pengantar);
    }

    try {
      const response = await api.post('/pendaftaran', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      setMyRegistration(response.data.data);
      setIsSubmitted(true);
      alert(response.data.message);
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal mengirim pendaftaran');
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
    try {
      await api.post('/logout');
    } catch {
      // Local logout continues even if the API request fails.
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", background: '#f8fafc', flexDirection: 'column' }}>
      <nav style={{ background: '#1e293b', padding: '15px 30px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: '#3b82f6', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '16px' }}>🎓</div>
          <h3 style={{ margin: 0, fontWeight: '600' }}>Portal Calon Pemagang</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '14px', color: '#cbd5e1' }}>Halo, {loggedInUser.nama || 'Siswa/Mahasiswa'}!</span>
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
                      <div style={{ marginTop: '15px', padding: '15px', background: 'white', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#166534' }}>SURAT BALASAN RESMI</div>
                            <div style={{ fontSize: '14px', color: '#374151' }}>📄 {myRegistration.file_surat_balasan}</div>
                        </div>
                        <a 
                          href={`http://localhost:8000/${myRegistration.file_surat_balasan}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ background: '#16a34a', color: 'white', padding: '8px 15px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px' }}
                        >
                          Unduh Surat
                        </a>
                      </div>
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

          {/* Main Form Card (Hanya muncul jika belum daftar) */}
          {!isSubmitted && (
            <div style={{ background: 'white', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
              <h2 style={{ margin: '0 0 5px 0', color: '#0f172a', fontSize: '22px' }}>Pengajuan Magang Baru</h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '30px' }}>Pastikan data yang Anda masukkan sesuai dengan surat pengantar.</p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                  >
                    <option value="" disabled>-- Pilih Periode --</option>
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

                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />

                <button 
                  type="submit" 
                  style={{ background: '#4f46e5', color: 'white', padding: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.4)' }}
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
