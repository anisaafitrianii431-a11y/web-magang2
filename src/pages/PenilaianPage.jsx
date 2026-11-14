import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import api from '../services/api';

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

function getSavedCriteria(penilaian) {
  const details = penilaian?.rincian_nilai;
  if (!details || typeof details !== 'object' || Array.isArray(details)) return [];

  return Object.entries(details)
    .filter(([, criterion]) => criterion && criterion.nilai !== undefined && criterion.nilai !== null)
    .map(([id, criterion]) => ({ id, ...criterion }));
}

function hasCompletedAssessment(penilaian) {
  const savedCriteria = getSavedCriteria(penilaian);
  return savedCriteria.length > 0 && savedCriteria.every(({ nilai }) => (
    Number.isFinite(Number(nilai)) && Number(nilai) >= 0 && Number(nilai) <= 100
  ));
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
  const [downloadingUserId, setDownloadingUserId] = useState(null);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [downloadError, setDownloadError] = useState('');
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

  const handleDownloadPdf = async (participant) => {
    setDownloadingUserId(participant.user_id);
    setDownloadError('');

    try {
      const evaluation = participant.penilaian;
      if (!hasCompletedAssessment(evaluation)) {
        throw new Error('Penilaian belum lengkap dan belum dapat diunduh.');
      }

      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 18;
      const total = Number(evaluation.nilai_akhir);

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('FORM PENILAIAN AKHIR PEMAGANG', margin, 22);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nama peserta: ${participant.nama_peserta || '-'}`, margin, 34);
      doc.text(`Asal instansi: ${participant.asal_instansi || '-'}`, margin, 41);
      if (participant.laporan?.judul_laporan) {
        doc.text(`Judul laporan: ${participant.laporan.judul_laporan}`, margin, 48, {
          maxWidth: pageWidth - margin * 2,
        });
      }

      const tableTop = participant.laporan?.judul_laporan ? 62 : 57;
      const columns = [margin, margin + 10, margin + 101, margin + 128, margin + 151];
      const tableRight = pageWidth - margin;
      const rowHeight = 10;

      doc.setFillColor(239, 246, 255);
      doc.rect(margin, tableTop, tableRight - margin, rowHeight, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('No.', columns[0] + 1, tableTop + 6.5);
      doc.text('Aspek yang dinilai', columns[1], tableTop + 6.5);
      doc.text('Nilai', columns[2], tableTop + 6.5);
      doc.text('Bobot', columns[3], tableTop + 6.5);
      doc.text('Nilai akhir', columns[4], tableTop + 6.5);

      const savedCriteria = getSavedCriteria(evaluation);
      savedCriteria.forEach((criterion, index) => {
        const rowY = tableTop + rowHeight * (index + 1);
        const score = Number(criterion.nilai);
        const weight = Number(criterion.bobot);
        const weightedScore = Number(criterion.nilai_akhir ?? (score * weight / 100));

        doc.setDrawColor(203, 213, 225);
        doc.line(margin, rowY + rowHeight, tableRight, rowY + rowHeight);
        doc.setFont('helvetica', 'normal');
        doc.text(String(index + 1), columns[0] + 1, rowY + 6.5);
        doc.text(criterion.pertanyaan || criterion.aspek || '-', columns[1], rowY + 6.5, { maxWidth: 88 });
        doc.text(formatScore(score), columns[2], rowY + 6.5);
        doc.text(`${weight}%`, columns[3], rowY + 6.5);
        doc.text(formatScore(weightedScore), columns[4], rowY + 6.5);
      });

      const totalY = tableTop + rowHeight * (savedCriteria.length + 1) + 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Total nilai:', columns[3], totalY);
      doc.text(formatScore(total), columns[4], totalY);
      doc.text(`Predikat: ${evaluation.poin_nilai || getPredicate(total)}`, margin, totalY + 9);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Tanggal penilaian: ${evaluation.tanggal_nilai ? new Date(evaluation.tanggal_nilai).toLocaleDateString('id-ID') : '-'}`,
        margin,
        totalY + 18
      );

      doc.save(`penilaian-akhir-${participant.user_id}.pdf`);
    } catch (error) {
      setDownloadError(error.message || 'PDF penilaian akhir gagal dibuat.');
    } finally {
      setDownloadingUserId(null);
    }
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
                Klik nama pemagang untuk membuka formulir penilaian, atau unduh PDF penilaian akhir.
              </p>
            </div>
            {isCurrentUserPembimbing() && (
              <Link to="/master-penilaian" className="btn-secondary" style={{ textDecoration: 'none' }}>
                Atur Master Penilaian
              </Link>
            )}
          </div>

          {loadError && <p className="report-error" role="alert">{loadError}</p>}
          {!validWeight && <p className="report-error" role="alert">
            {criteria.length === 0 ? 'Belum ada pertanyaan penilaian aktif.' : `Total bobot aktif saat ini ${activeWeight.toFixed(2)}%, harus tepat 100%.`}{' '}
            {isCurrentUserPembimbing() && <Link to="/master-penilaian">Atur Master Penilaian</Link>}
          </p>}
          <div className="table-card">
            <div className="table-card-header">
              Daftar Pemagang Aktif
            </div>
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '8%' }}>#</th>
                  <th style={{ width: '45%' }}>NAMA PEMAGANG</th>
                  <th style={{ width: '20%' }}>NILAI AKHIR</th>
                  <th style={{ width: '27%' }}>DOWNLOAD PENILAIAN</th>
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
                          onClick={() => handleDownloadPdf(participant)}
                          disabled={!hasCompletedAssessment(participant.penilaian) || downloadingUserId === participant.user_id}
                          title={hasCompletedAssessment(participant.penilaian)
                            ? 'Unduh PDF berdasarkan data penilaian'
                            : 'Penilaian akhir belum lengkap'}
                        >
                          {downloadingUserId === participant.user_id
                            ? 'Membuat PDF...'
                            : hasCompletedAssessment(participant.penilaian)
                              ? 'Download PDF'
                              : 'Belum dinilai'}
                        </button>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
          {downloadError && <p className="report-error" role="alert">{downloadError}</p>}
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
    </div>
  );
}
