import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import PenilaianAkhirPdfModal from '../components/PenilaianAkhirPdfModal';

function getPredicate(score) {
  if (score >= 85) return 'A (Sangat Baik)';
  if (score >= 75) return 'B+ (Baik)';
  if (score >= 65) return 'B (Cukup Baik)';
  if (score >= 50) return 'C (Perlu Evaluasi)';
  return 'D (Kurang)';
}

function formatScore(score) {
  return Number.isInteger(score) ? String(score) : score.toFixed(2);
}

function getInitialScores(penilaian, criteria) {
  const savedScores = penilaian?.rincian_nilai || {};
  return Object.fromEntries(criteria.map((criterion) => [
    String(criterion.id),
    savedScores[String(criterion.id)]?.nilai ?? savedScores[criterion.kode]?.nilai ?? '',
  ]));
}

function getApiError(error) {
  const validationErrors = error.response?.data?.errors;
  if (validationErrors) return Object.values(validationErrors).flat().join(' ');
  return error.response?.data?.message || 'Daftar pemagang gagal dimuat.';
}

function isCurrentUserPembimbing() {
  try {
    return String(JSON.parse(localStorage.getItem('user') || 'null')?.role || '').trim().toLowerCase() === 'pembimbing';
  } catch {
    return false;
  }
}

async function requestParticipants() {
  const response = await api.get('/v1/penilaian/peserta');
  const data = response.data?.data;
  if (!Array.isArray(data)) throw new Error('Format data pemagang dari server tidak valid.');
  return data;
}

export default function PenilaianPage({ onSubmit, isSaving, submitError }) {
  const [participants, setParticipants] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [pdfParticipant, setPdfParticipant] = useState(null);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let cancelled = false;

    Promise.all([requestParticipants(), api.get('/v1/master-penilaian/aktif')])
      .then(([data, criteriaResponse]) => {
        if (!cancelled) {
          setParticipants(data);
          setCriteria(Array.isArray(criteriaResponse.data?.data) ? criteriaResponse.data.data : []);
          setLoadError('');
        }
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.response ? getApiError(error) : error.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const report = selectedParticipant?.laporan;
  const activeWeight = criteria.reduce((total, criterion) => total + Number(criterion.bobot || 0), 0);
  const validWeight = criteria.length > 0 && Math.round(activeWeight * 100) === 10000;
  const weightedTotal = useMemo(() => criteria.reduce((total, criterion) => {
    const score = scores[String(criterion.id)];
    return score === '' || score === undefined
      ? total
      : total + Number(score) * Number(criterion.bobot) / 100;
  }, 0), [criteria, scores]);
  const allScoresEntered = validWeight && criteria.every((criterion) => {
    const score = scores[String(criterion.id)];
    return score !== '' && score !== undefined && Number.isFinite(Number(score)) &&
      Number(score) >= 0 && Number(score) <= 100;
  });

  const openAssessment = (participant) => {
    setSelectedParticipant(participant);
    setScores(getInitialScores(participant.penilaian, criteria));
    setFormError('');
  };

  const handlePdfUploaded = (userId) => {
    setParticipants((current) => current.map((participant) => participant.user_id === userId
      ? { ...participant, has_penilaian_akhir_pdf: true }
      : participant));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!allScoresEntered) {
      setFormError(validWeight ? 'Isi seluruh nilai aspek dengan angka 0 sampai 100.' : 'Total bobot pertanyaan aktif harus tepat 100%.');
      return;
    }

    const saved = await onSubmit({
      id_peserta: selectedParticipant.user_id,
      rincian_nilai: scores,
    });
    if (!saved) return;

    try {
      setParticipants(await requestParticipants());
      setLoadError('');
    } catch (error) {
      setLoadError(error.response ? getApiError(error) : error.message);
    }
    setSelectedParticipant(null);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat daftar pemagang...</div>;

  return (
    <div>
      {!selectedParticipant ? (
        <>
          <div className="page-header">
            <div>
              <h1 className="page-title">Tabel Penilaian</h1>
              <p className="page-description">
                Klik nama pemagang untuk mengisi form penilaian, atau tambahkan PDF penilaian akhir.
              </p>
            </div>
          </div>

          {loadError && <p className="report-error" role="alert">{loadError}</p>}
          {!validWeight && <p className="report-error" role="alert">
            {criteria.length === 0 ? 'Belum ada pertanyaan penilaian aktif.' : `Total bobot aktif saat ini ${activeWeight.toFixed(2)}%, harus tepat 100%.`}{' '}
            {isCurrentUserPembimbing() && <a href="/master-penilaian">Atur Master Penilaian</a>}
          </p>}
          <div className="table-card">
            <div className="table-card-header">
              Daftar Pemagang Aktif
            </div>
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '8%' }}>#</th>
                  <th style={{ width: '46%' }}>NAMA PEMAGANG</th>
                  <th style={{ width: '18%' }}>NILAI AKHIR</th>
                  <th style={{ width: '28%' }}>PENILAIAN AKHIR</th>
                </tr>
              </thead>
              <tbody>
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      Belum ada pemagang aktif yang ditugaskan kepada Anda.
                    </td>
                  </tr>
                ) : participants.map((participant, index) => (
                    <tr key={participant.user_id}>
                      <td>{index + 1}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => openAssessment(participant)}
                          style={{
                            padding: 0,
                            border: 0,
                            background: 'none',
                            color: '#1d4ed8',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          {participant.nama_peserta}
                        </button>
                        <div className="cell-subtitle">{participant.asal_instansi || participant.email}</div>
                      </td>
                      <td>{participant.penilaian?.nilai_akhir ?? participant.laporan?.nilai_laporan ?? '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-action btn-action-detail"
                          onClick={() => setPdfParticipant(participant)}
                        >
                          {participant.has_penilaian_akhir_pdf ? 'Lihat / Ganti PDF' : 'Tambah PDF'}
                        </button>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="page-header">
            <div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedParticipant(null)}
                style={{ marginBottom: '1rem' }}
              >
                Kembali ke daftar
              </button>
              <h1 className="page-title">Form Penilaian Akhir</h1>
              <p className="page-description">
                {selectedParticipant.nama_peserta}
                {report?.judul_laporan ? ` — ${report.judul_laporan}` : ' — Penilaian peserta'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {formError && <p className="report-error" role="alert">{formError}</p>}
            {submitError && <p className="report-error" role="alert">{submitError}</p>}
            <div className="table-card">
              <div className="table-card-header">Form Penilaian Pemagang</div>
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ minWidth: '680px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '8%' }}>NO</th>
                      <th>ASPEK YANG DINILAI</th>
                      <th style={{ width: '18%' }}>NILAI (0–100)</th>
                      <th style={{ width: '14%' }}>BOBOT</th>
                      <th style={{ width: '18%' }}>NILAI AKHIR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criteria.map((criterion, index) => {
                      const criterionKey = String(criterion.id);
                      const score = scores[criterionKey];
                      const weightedScore = score === '' || score === undefined
                        ? null
                        : Math.round(Number(score) * Number(criterion.bobot)) / 100;
                      return (
                        <tr key={criterion.id}>
                          <td>{index + 1}</td>
                          <td>{criterion.pertanyaan}</td>
                          <td>
                            <input
                              aria-label={`Nilai ${criterion.pertanyaan} nomor ${index + 1}`}
                              type="number"
                              className="form-control"
                              min="0"
                              max="100"
                              step="0.01"
                              value={score}
                              onChange={(event) => setScores((current) => ({
                                ...current,
                                [criterionKey]: event.target.value,
                              }))}
                              required
                            />
                          </td>
                          <td>{Number(criterion.bobot)}%</td>
                          <td>{weightedScore === null ? '—' : formatScore(weightedScore)}</td>
                        </tr>
                      );
                    })}
                    <tr>
                      <th colSpan="3" style={{ textAlign: 'right' }}>Total nilai</th>
                      <th>{activeWeight.toFixed(2)}%</th>
                      <th>{allScoresEntered ? formatScore(weightedTotal) : '—'}</th>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <strong>
                  Predikat: {allScoresEntered ? getPredicate(weightedTotal) : 'Isi semua nilai terlebih dahulu'}
                </strong>
                <button type="submit" className="btn-primary" disabled={!allScoresEntered || isSaving}>
                  {isSaving ? 'Menyimpan...' : 'Simpan Penilaian'}
                </button>
              </div>
            </div>
          </form>
        </>
      )}
      <PenilaianAkhirPdfModal
        participant={pdfParticipant}
        onClose={() => setPdfParticipant(null)}
        onUploaded={handlePdfUploaded}
      />
    </div>
  );
}
