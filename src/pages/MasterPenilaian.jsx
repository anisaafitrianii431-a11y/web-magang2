import { useCallback, useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import api from '../services/api';
import '../App.css';

const emptyForm = { pertanyaan: '', bobot: '', urutan: '' };

function apiMessage(error, fallback) {
  const errors = error.response?.data?.errors;
  return errors ? Object.values(errors).flat().join(' ') : error.response?.data?.message || fallback;
}

export default function MasterPenilaian() {
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadQuestions = useCallback(async () => {
    setError('');
    try {
      const response = await api.get('/v1/master-penilaian');
      setQuestions(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (requestError) {
      setError(apiMessage(requestError, 'Pertanyaan master gagal dimuat.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadQuestions(); }, [loadQuestions]);

  const activeWeight = questions.filter((item) => item.aktif)
    .reduce((sum, item) => sum + Number(item.bobot || 0), 0);
  const validWeight = Math.round(activeWeight * 100) === 10000;

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({ pertanyaan: item.pertanyaan, bobot: String(item.bobot), urutan: String(item.urutan) });
    setNotice('');
  };

  const saveQuestion = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const payload = {
      pertanyaan: form.pertanyaan.trim(),
      bobot: Number(form.bobot),
      urutan: Number(form.urutan),
    };
    try {
      if (editingId) await api.put(`/v1/master-penilaian/${editingId}`, payload);
      else await api.post('/v1/master-penilaian', payload);
      resetForm();
      setNotice(editingId ? 'Pertanyaan berhasil diperbarui.' : 'Pertanyaan berhasil ditambahkan.');
      await loadQuestions();
    } catch (requestError) {
      setError(apiMessage(requestError, 'Pertanyaan gagal disimpan.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleQuestion = async (item) => {
    const action = item.aktif ? 'menonaktifkan' : 'mengaktifkan';
    if (!window.confirm(`Yakin ingin ${action} pertanyaan ini?`)) return;
    setError('');
    setNotice('');
    try {
      if (item.aktif) await api.delete(`/v1/master-penilaian/${item.id}`);
      else await api.put(`/v1/master-penilaian/${item.id}`, {
        pertanyaan: item.pertanyaan,
        bobot: Number(item.bobot),
        urutan: Number(item.urutan),
        aktif: true,
      });
      setNotice(item.aktif ? 'Pertanyaan dinonaktifkan. Riwayat nilai lama tetap tersimpan.' : 'Pertanyaan diaktifkan kembali.');
      await loadQuestions();
    } catch (requestError) {
      setError(apiMessage(requestError, 'Status pertanyaan gagal diperbarui.'));
    }
  };

  return (
    <div className="layout report-module master-assessment">
      <Sidebar />
      <div className="content">
        <Navbar />
        <main className="main report-main">
          <div className="page-header">
            <div>
              <h1 className="page-title">Master Penilaian</h1>
              <p className="page-description">Atur pertanyaan dan bobot yang akan digunakan pada form penilaian peserta.</p>
            </div>
          </div>

          {error && <p className="report-error" role="alert">{error}</p>}
          {notice && <p role="status" style={{ padding: '12px 16px', color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8 }}>{notice}</p>}

          <section className="table-card" style={{ marginBottom: '1.25rem' }}>
            <div className="table-card-header">{editingId ? 'Ubah Pertanyaan' : 'Tambah Pertanyaan'}</div>
            <form className="master-assessment-form" onSubmit={saveQuestion}>
              <label className="form-group master-assessment-field">
                <span>Pertanyaan / Aspek Penilaian</span>
                <input className="form-control" value={form.pertanyaan} maxLength={500} required
                  onChange={(event) => setForm({ ...form, pertanyaan: event.target.value })}
                  placeholder="Contoh: Kedisiplinan selama magang" />
              </label>
              <label className="form-group master-assessment-field">
                <span>Bobot (%)</span>
                <input className="form-control" type="number" min="0.01" max="100" step="0.01" value={form.bobot} required
                  onChange={(event) => setForm({ ...form, bobot: event.target.value })} />
              </label>
              <label className="form-group master-assessment-field">
                <span>Urutan</span>
                <input className="form-control" type="number" min="1" step="1" value={form.urutan} required
                  onChange={(event) => setForm({ ...form, urutan: event.target.value })} />
              </label>
              <div className="master-assessment-form-actions">
                <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Menyimpan…' : editingId ? 'Simpan' : 'Tambah'}</button>
                {editingId && <button className="btn-secondary" type="button" onClick={resetForm}>Batal</button>}
              </div>
            </form>
          </section>

          <section className="table-card">
            <div className="table-card-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span>Daftar Pertanyaan Master ({questions.length})</span>
              <strong style={{ color: validWeight ? '#047857' : '#b91c1c' }}>
                Total bobot aktif: {activeWeight.toFixed(2)}% {validWeight ? '✓' : '— harus 100%'}
              </strong>
            </div>
            {!validWeight && <p style={{ margin: 0, padding: '12px 16px', color: '#92400e', background: '#fffbeb' }}>
              Form penilaian belum dapat disimpan sampai total bobot pertanyaan aktif tepat 100%.
            </p>}
            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead><tr><th>URUTAN</th><th>PERTANYAAN</th><th>BOBOT</th><th>STATUS</th><th>AKSI</th></tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem' }}>Memuat pertanyaan…</td></tr>
                    : questions.length === 0 ? <tr><td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem' }}>Belum ada pertanyaan master.</td></tr>
                      : questions.map((item) => (
                        <tr key={item.id}>
                          <td>{item.urutan}</td><td>{item.pertanyaan}</td><td>{Number(item.bobot).toFixed(2)}%</td>
                          <td>{item.aktif ? 'Aktif' : 'Nonaktif'}</td>
                          <td>
                            <div className="master-assessment-actions">
                              <button type="button" className="master-assessment-edit" onClick={() => startEdit(item)}>Edit</button>
                              <button
                                type="button"
                                className={item.aktif ? 'master-assessment-delete' : 'master-assessment-enable'}
                                title={item.aktif ? 'Pertanyaan dinonaktifkan agar riwayat nilai tetap tersimpan' : 'Aktifkan pertanyaan ini kembali'}
                                onClick={() => void toggleQuestion(item)}
                              >
                                {item.aktif ? 'Hapus' : 'Aktifkan'}
                            </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
