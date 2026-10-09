import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function KelolaPeriode() {
  const [listPeriode, setListPeriode] = useState([]);
  const [formPeriode, setFormPeriode] = useState({ tanggal_mulai: '', tanggal_selesai: '' });
  const [editingId, setEditingId] = useState(null);

  const fetchPeriode = async () => {
    try {
      const response = await api.get('/periode');
      setListPeriode(response.data.data);
    } catch (error) {
      console.error('Failed to fetch periode', error);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(fetchPeriode, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  const handleTambahPeriode = async (e) => {
    e.preventDefault();

    try {
      await api.post('/periode', formPeriode);
      setFormPeriode({ tanggal_mulai: '', tanggal_selesai: '' });
      fetchPeriode(); // Refresh data
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal menambah periode');
    }
  };

  const handleEditPeriode = (periode) => {
    setEditingId(periode.id);
    setFormPeriode({
      tanggal_mulai: periode.tanggal_mulai.slice(0, 10),
      tanggal_selesai: periode.tanggal_selesai.slice(0, 10),
    });
  };

  const handleUpdatePeriode = async (e) => {
    e.preventDefault();

    try {
      await api.put(`/periode/${editingId}`, formPeriode);
      setEditingId(null);
      setFormPeriode({ tanggal_mulai: '', tanggal_selesai: '' });
      fetchPeriode();
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal mengubah periode');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/periode/${id}`);
      fetchPeriode(); // Refresh data
    } catch (error) {
      console.error('Failed to delete periode', error);
    }
  };


  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '20px' }}>Kelola Periode Magang</h2>
          <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '14px' }}>Data periode/gelombang pendaftaran program magang.</p>
        </div>
      </div>

      <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '30px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#0f172a' }}>{editingId ? 'Edit Periode' : 'Tambah Periode Baru'}</h3>
        <form onSubmit={editingId ? handleUpdatePeriode : handleTambahPeriode} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#475569' }}>Tanggal Mulai</label>
            <input 
              type="date" 
              value={formPeriode.tanggal_mulai} 
              onChange={(e) => setFormPeriode({...formPeriode, tanggal_mulai: e.target.value})}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box', background: 'white', color: '#334155', colorScheme: 'light' }}
              required 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#475569' }}>Tanggal Selesai</label>
            <input 
              type="date" 
              value={formPeriode.tanggal_selesai} 
              onChange={(e) => setFormPeriode({...formPeriode, tanggal_selesai: e.target.value})}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box', background: 'white', color: '#334155', colorScheme: 'light' }}
              required 
            />
          </div>
          <button type="submit" style={{ background: '#4f46e5', color: 'white', padding: '10px 20px', height: '42px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            {editingId ? 'Simpan Perubahan' : 'Simpan'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setFormPeriode({ tanggal_mulai: '', tanggal_selesai: '' }); }} style={{ background: 'white', color: '#475569', padding: '10px 16px', height: '42px', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
              Batal
            </button>
          )}
        </form>
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>📅</span>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>Daftar Periode Magang ({listPeriode.length} Data)</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '15px 20px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>ID</th>
              <th style={{ padding: '15px 20px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Tanggal Mulai</th>
              <th style={{ padding: '15px 20px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Tanggal Selesai</th>
              <th style={{ padding: '15px 20px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {listPeriode.map((p, index) => (
              <tr key={p.id} style={{ borderBottom: index === listPeriode.length - 1 ? 'none' : '1px solid #e2e8f0', transition: 'background 0.2s', ':hover': { background: '#f8fafc' } }}>
                <td style={{ padding: '15px 20px', fontSize: '14px', color: '#334155' }}>{p.id}</td>
                <td style={{ padding: '15px 20px', fontSize: '14px', color: '#334155' }}>{new Date(p.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                <td style={{ padding: '15px 20px', fontSize: '14px', color: '#334155' }}>{new Date(p.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                  <button
                    onClick={() => handleEditPeriode(p)}
                    style={{ background: 'white', color: '#0ea5e9', border: '1px solid #bae6fd', padding: '6px 12px', marginRight: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(p.id)}
                    style={{ background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}