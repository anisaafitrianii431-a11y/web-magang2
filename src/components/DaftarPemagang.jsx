import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function DaftarPemagang() {
  const [dataPendaftaran, setDataPendaftaran] = useState([]);
  const [listPeriode, setListPeriode] = useState([]);
  const [listPembimbing, setListPembimbing] = useState([]);

  const fetchData = async () => {
    try {
      const [pendaftaranRes, periodeRes, pembimbingRes] = await Promise.all([
        api.get('/pendaftaran'),
        api.get('/periode'),
        api.get('/pembimbing')
      ]);
      setDataPendaftaran(pendaftaranRes.data.data);
      setListPeriode(periodeRes.data.data);
      setListPembimbing(pembimbingRes.data.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(fetchData, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  const [formData, setFormData] = useState({ 
    nama_user: '', 
    periode_id: '1', 
    pembimbing_id: '',
    asal_instansi: '', 
    file_surat_pengantar: null, 
    status: 'Calon Pemagang',
    tanggal_daftar: new Date().toISOString().split('T')[0],
    tanggal_selesai: '',
    file_surat_balasan: null
  });

  const [editingId, setEditingId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId === null) return;

    const payload = new FormData();
    payload.append('status', formData.status);
    if (formData.pembimbing_id) {
        payload.append('pembimbing_id', formData.pembimbing_id);
    }
    if (formData.tanggal_selesai) {
        payload.append('tanggal_selesai', formData.tanggal_selesai);
    }
    if (formData.file_surat_balasan instanceof File) {
        payload.append('file_surat_balasan', formData.file_surat_balasan);
    }

    try {
        await api.post(`/pendaftaran/${editingId}/status`, payload, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        alert('Status pendaftaran berhasil diupdate');
        setEditingId(null);
        fetchData(); // Refresh
    } catch (error) {
        console.log(error.response?.data);
        alert(`Gagal mengupdate status pendaftaran: ${error.response?.data?.message || JSON.stringify(error.response?.data?.errors)}`);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      nama_user: item.user?.nama,
      email_user: item.user?.email,
      no_hp_user: item.no_hp_user,
      periode_id: item.periode_id ? item.periode_id.toString() : '1',
      pembimbing_id: item.pembimbing_id ? item.pembimbing_id.toString() : '',
      asal_instansi: item.asal_instansi,
      file_surat_pengantar: item.file_surat_pengantar, // Tetap set supaya tampil namanya
      status: item.status,
      tanggal_daftar: item.tanggal_daftar,
      tanggal_selesai: item.tanggal_selesai || '',
      file_surat_balasan: item.file_surat_balasan || null
    });
  };

  const handleDelete = async () => {
    alert('Fitur hapus belum tersedia di API');
  };

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '20px' }}>Data Pendaftaran & Pemagang</h2>
          <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '14px' }}>Kelola informasi peserta, instansi mitra, serta status pemagang.</p>
        </div>
      </div>

      {/* Form Pengelolaan Data (Hanya Muncul Saat Edit) */}
      {editingId !== null && (
      <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '30px', border: '2px solid #3b82f6', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1)' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>✏️ Ubah Status / Data Pendaftaran</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Kiri: Data Pemagang (Read-Only) */}
          <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#334155', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px' }}>Data Pendaftar (Otomatis)</h4>
            <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>NAMA PEMAGANG</span>
                <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{formData.nama_user}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{formData.email_user || '-'} | {formData.no_hp_user || '-'}</div>
            </div>
            <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>ASAL INSTANSI</span>
                <div style={{ fontSize: '14px', color: '#0f172a' }}>{formData.asal_instansi}</div>
            </div>
            <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>GELOMBANG MAGANG</span>
                <div style={{ fontSize: '14px', color: '#0f172a' }}>
                  {(() => {
                    const p = listPeriode.find(p => p.id.toString() === formData.periode_id);
                    return p ? `${new Date(p.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase()} - ${new Date(p.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase()}` : '-';
                  })()}
                </div>
            </div>
            <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>SURAT PENGANTAR (DARI KAMPUS/SEKOLAH)</span>
                <div style={{ fontSize: '13px', color: '#3b82f6', fontWeight: '500', cursor: 'pointer' }}>📄 {formData.file_surat_pengantar ? (typeof formData.file_surat_pengantar === 'string' ? formData.file_surat_pengantar : formData.file_surat_pengantar.name) : 'Tidak ada berkas'}</div>
            </div>
          </div>

          {/* Kanan: Aksi Admin (Editable) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h4 style={{ margin: '0', fontSize: '14px', color: '#334155', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px' }}>Tindakan Admin</h4>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Upload Surat Balasan (.pdf) <span style={{color: '#ef4444'}}>*</span></label>
              <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#64748b' }}>Berikan surat balasan persetujuan/penolakan resmi kepada pemagang.</p>
              <div style={{ position: 'relative', width: '100%', padding: '15px', border: '1px dashed #cbd5e1', borderRadius: '6px', textAlign: 'center', background: 'white', cursor: 'pointer' }}>
                <input 
                  type="file" 
                  accept=".pdf"
                  onChange={(e) => setFormData({...formData, file_surat_balasan: e.target.files[0]})}
                  style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                />
                <div style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                  {formData.file_surat_balasan ? (typeof formData.file_surat_balasan === 'string' ? formData.file_surat_balasan : formData.file_surat_balasan.name) : 'Klik untuk upload surat balasan'}
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Pilih Status Pendaftaran</label>
              <select 
                value={formData.status} 
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box', background: 'white', color: '#0f172a' }}
              >
                <option value="Calon Pemagang" style={{ color: '#0f172a', background: 'white' }}>Menunggu Keputusan</option>
                <option value="Pemagang Aktif" style={{ color: '#0f172a', background: 'white' }}>Terima (Pemagang Aktif)</option>
                <option value="Ditolak" style={{ color: '#0f172a', background: 'white' }}>Tolak</option>
                <option value="Alumni" style={{ color: '#0f172a', background: 'white' }}>Selesai Magang (Alumni)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Tugaskan Pembimbing Lapangan</label>
              <select 
                value={formData.pembimbing_id} 
                onChange={(e) => setFormData({...formData, pembimbing_id: e.target.value})}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box', background: 'white', color: '#0f172a' }}
              >
                <option value="" style={{ color: '#0f172a', background: 'white' }}>-- Belum Ditentukan --</option>
                {listPembimbing.map(p => (
                  <option key={p.id} value={p.id} style={{ color: '#0f172a', background: 'white' }}>{p.nama}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Set Tanggal Selesai Magang</label>
              <input 
                type="date" 
                value={formData.tanggal_selesai} 
                onChange={(e) => setFormData({...formData, tanggal_selesai: e.target.value})}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box', color: '#0f172a', background: 'white' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', gridColumn: '1 / -1', marginTop: '5px' }}>
            <button type="submit" style={{ background: '#4f46e5', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              {editingId !== null ? 'Simpan Perubahan' : 'Tambah Data'}
            </button>
            {editingId !== null && (
              <button 
                type="button" 
                onClick={() => { 
                  setEditingId(null); 
                  setFormData({ nama_user: '', periode_id: '1', pembimbing_id: '', asal_instansi: '', file_surat_pengantar: null, status: 'Calon Pemagang', tanggal_daftar: new Date().toISOString().split('T')[0], tanggal_selesai: '', file_surat_balasan: null }); 
                }}
                style={{ background: 'white', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
              >
                Batal
              </button>
            )}
          </div>
        </form>
      </div>
      )}

      {/* Tabel Rekapitulasi Data Pendaftaran */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>👥</span>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>Daftar Pendaftaran / Pemagang ({dataPendaftaran.length} Data)</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '15px 20px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>User / Instansi</th>
                <th style={{ padding: '15px 20px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Periode & Pembimbing</th>
                <th style={{ padding: '15px 20px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Berkas</th>
                <th style={{ padding: '15px 20px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '15px 20px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {dataPendaftaran.map((item, index) => (
                <tr key={item.id} style={{ borderBottom: index === dataPendaftaran.length - 1 ? 'none' : '1px solid #e2e8f0', transition: 'background 0.2s', ':hover': { background: '#f8fafc' } }}>
                  <td style={{ padding: '15px 20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{item.user?.nama}</div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{item.asal_instansi}</div>
                  </td>
                  <td style={{ padding: '15px 20px' }}>
                    <div style={{ fontSize: '13px', color: '#334155', background: '#e2e8f0', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', marginBottom: '4px' }}>
                      {item.periode ? `${new Date(item.periode.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase()} - ${new Date(item.periode.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase()}` : '-'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>👨‍🏫 {item.pembimbing?.nama || '-'}</div>
                  </td>
                  <td style={{ padding: '15px 20px' }}>
                    <div style={{ fontSize: '12px', color: '#3b82f6', marginBottom: '2px' }}>📄 {item.file_surat_pengantar || '-'}</div>
                    <div style={{ fontSize: '12px', color: '#10b981' }}>✉️ {item.file_surat_balasan || '-'}</div>
                  </td>
                  <td style={{ padding: '15px 20px' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '20px', 
                      fontSize: '12px',
                      fontWeight: '600',
                      background: item.status === 'Pemagang Aktif' ? '#dcfce7' : item.status === 'Ditolak' ? '#fee2e2' : item.status === 'Alumni' ? '#e0e7ff' : '#fef3c7',
                      color: item.status === 'Pemagang Aktif' ? '#166534' : item.status === 'Ditolak' ? '#991b1b' : item.status === 'Alumni' ? '#3730a3' : '#92400e'
                    }}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                    <button 
                      onClick={() => handleEdit(item)}
                      style={{ background: 'white', color: '#0ea5e9', border: '1px solid #bae6fd', padding: '6px 12px', marginRight: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={handleDelete}
                      style={{ background: 'white', color: '#ef4444', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
              {dataPendaftaran.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '14px' }}>Belum ada data pendaftaran magang.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}