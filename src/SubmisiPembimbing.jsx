import { useState, useEffect, useCallback } from 'react';
import api from './api';

const formatTanggal = (t) => (t ? new Date(t).toLocaleString('id-ID') : '-');

// Ambil pesan error paling informatif dari respons Laravel
const ambilPesan = (err, cadangan) => {
  const data = err.response?.data;
  if (data?.errors) return Object.values(data.errors).flat()[0];
  return data?.message || cadangan;
};

// Nama file unduhan: NamaPeserta_tugas1.pdf
const namaFile = (item) => {
  const ext = item.file_path?.split('.').pop() || 'file';
  const nama = String(item.peserta?.name || 'peserta')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '_');
  return `${nama || 'peserta'}_tugas${item.tugas_id}.${ext}`;
};

// Daftar submisi untuk SATU tugas, khusus Pembimbing:
// lihat, unduh file, beri nilai & feedback.
function SubmisiPembimbing({ tugasId }) {
  const [daftar, setDaftar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMuat, setErrorMuat] = useState('');
  const [form, setForm] = useState({}); // { [idSubmisi]: { nilai, feedback } }
  const [menyimpan, setMenyimpan] = useState(null);
  const [notif, setNotif] = useState(null); // { tipe: 'ok' | 'error', teks }

  const muat = useCallback(async () => {
    try {
      const res = await api.get(`/tugas/${tugasId}/submisi`);
      setDaftar(res.data);
      setErrorMuat('');
    } catch (err) {
      setErrorMuat(ambilPesan(err, 'Gagal memuat daftar submisi.'));
    } finally {
      setLoading(false);
    }
  }, [tugasId]);

  useEffect(() => {
    muat();
  }, [muat]);

  // Isian form: yang sedang diketik, atau nilai yang sudah tersimpan
  const isian = (item) => form[item.id] ?? { nilai: item.nilai ?? '', feedback: item.feedback ?? '' };
  const ubahIsian = (item, perubahan) =>
    setForm((prev) => ({ ...prev, [item.id]: { ...isian(item), ...perubahan } }));

  // Unduh file: butuh token, jadi lewat axios (blob) lalu disimpan
  const handleUnduh = async (item) => {
    try {
      const res = await api.get(`/submisi/${item.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = namaFile(item);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      let pesan = 'Gagal mengunduh file.';
      if (err.response?.data instanceof Blob) {
        try {
          pesan = JSON.parse(await err.response.data.text()).message || pesan;
        } catch {
          /* pakai pesan bawaan */
        }
      }
      setNotif({ tipe: 'error', teks: pesan });
    }
  };

  // Simpan nilai & feedback
  const handleSimpan = async (item) => {
    const isi = isian(item);
    const angka = Number(isi.nilai);

    if (isi.nilai === '' || !Number.isInteger(angka) || angka < 0 || angka > 100) {
      setNotif({ tipe: 'error', teks: 'Nilai harus berupa bilangan bulat 0 sampai 100.' });
      return;
    }

    setMenyimpan(item.id);
    try {
      await api.put(`/submisi/${item.id}/nilai`, { nilai: angka, feedback: isi.feedback });
      setNotif({ tipe: 'ok', teks: `Nilai untuk ${item.peserta?.name || 'peserta'} berhasil disimpan.` });
      setForm((prev) => {
        const salinan = { ...prev };
        delete salinan[item.id];
        return salinan;
      });
      await muat();
    } catch (err) {
      setNotif({ tipe: 'error', teks: ambilPesan(err, 'Gagal menyimpan nilai.') });
    } finally {
      setMenyimpan(null);
    }
  };

  return (
    <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
      <h3 style={{ marginTop: 0 }}>Daftar Submisi Masuk ({daftar.length})</h3>

      {notif && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: notif.tipe === 'ok' ? '#dcfce7' : '#fee2e2',
            color: notif.tipe === 'ok' ? '#166534' : '#991b1b',
          }}
        >
          <span>{notif.teks}</span>
          <button
            onClick={() => setNotif(null)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {loading && <p style={{ color: '#64748b' }}>Memuat submisi...</p>}
      {errorMuat && <p style={{ color: '#991b1b' }}>{errorMuat}</p>}
      {!loading && !errorMuat && daftar.length === 0 && (
        <p style={{ color: '#64748b' }}>Belum ada peserta yang mengumpulkan.</p>
      )}

      {daftar.map((item) => {
        const sudah = item.status === 'sudah_dinilai';
        const isi = isian(item);

        return (
          <div
            key={item.id}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderLeft: `4px solid ${sudah ? '#10b981' : '#f59e0b'}`,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px',
            }}
          >
            {/* Peserta + status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div>
                <strong style={{ fontSize: '16px' }}>{item.peserta?.name || 'Peserta'}</strong>
                <div style={{ color: '#64748b', fontSize: '13px', marginTop: '2px' }}>
                  Dikumpulkan: {formatTanggal(item.tanggal_submit)}
                </div>
              </div>
              <span
                style={{
                  alignSelf: 'flex-start',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  background: sudah ? '#dcfce7' : '#fef3c7',
                  color: sudah ? '#166534' : '#92400e',
                }}
              >
                {sudah ? `Dinilai: ${item.nilai}` : 'Belum dinilai'}
              </span>
            </div>

            {item.catatan_peserta && (
              <div style={{ marginTop: '8px', fontSize: '14px', color: '#334155' }}>
                Catatan peserta: “{item.catatan_peserta}”
              </div>
            )}

            {/* Unduh file tugas */}
            <button
              onClick={() => handleUnduh(item)}
              style={{
                marginTop: '12px',
                padding: '8px 14px',
                cursor: 'pointer',
                border: '1px solid #4f46e5',
                color: '#4f46e5',
                background: '#fff',
                borderRadius: '8px',
                fontWeight: 'bold',
              }}
            >
              📥 Unduh File Tugas
            </button>

            {/* Nilai & feedback */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginTop: '14px',
                paddingTop: '14px',
                borderTop: '1px solid #e2e8f0',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="number"
                min="0"
                max="100"
                placeholder="Nilai"
                value={isi.nilai}
                onChange={(e) => ubahIsian(item, { nilai: e.target.value })}
                style={{ width: '90px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
              <textarea
                placeholder="Feedback / catatan untuk peserta..."
                value={isi.feedback}
                onChange={(e) => ubahIsian(item, { feedback: e.target.value })}
                style={{
                  flex: 1,
                  minWidth: '200px',
                  minHeight: '40px',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={() => handleSimpan(item)}
                disabled={menyimpan === item.id}
                style={{
                  padding: '9px 16px',
                  background: '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {menyimpan === item.id ? 'Menyimpan...' : sudah ? 'Perbarui Nilai' : 'Simpan Nilai'}
              </button>
            </div>

            {sudah && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                Dinilai pada {formatTanggal(item.tanggal_dinilai)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default SubmisiPembimbing;