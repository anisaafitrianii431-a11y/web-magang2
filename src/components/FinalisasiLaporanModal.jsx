import { useEffect, useState } from 'react';
import api from '../services/api';

const endpoint = '/v1/laporan-magang';

function isValidPlacement(placement) {
  return placement.x >= 0
    && placement.y >= 0
    && placement.width > 0
    && placement.height > 0
    && placement.x + placement.width <= 100
    && placement.y + placement.height <= 100;
}

export default function FinalisasiLaporanModal({
  laporan,
  onClose,
  onSave,
  isSaving,
  submitError,
}) {
  const [sourcePdf, setSourcePdf] = useState(null);
  const [signature, setSignature] = useState(null);
  const [stamp, setStamp] = useState(null);
  const [signaturePlacement, setSignaturePlacement] = useState({ x: 54, y: 8, width: 24, height: 8 });
  const [stampPlacement, setStampPlacement] = useState({ x: 80, y: 8, width: 12, height: 12 });
  const [previewUrl, setPreviewUrl] = useState('');
  const [generatedFile, setGeneratedFile] = useState(null);
  const [isLoadingSource, setIsLoadingSource] = useState(true);
  const [sourceLabel, setSourceLabel] = useState('PDF yang diunggah');
  const [error, setError] = useState('');
  const googleDocAvailable = Boolean(
    laporan.link_google_doc || laporan.riwayat_revisi?.some((revision) => revision.link_google_doc)
  );

  useEffect(() => {
    let active = true;
    api.get(`${endpoint}/${laporan.id_laporan}/download?source=1`, { responseType: 'blob' })
      .then(async (response) => {
        const bytes = new Uint8Array(await response.data.arrayBuffer());
        if (active) setSourcePdf(bytes);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || 'PDF laporan sumber gagal dimuat.');
        }
      })
      .finally(() => {
        if (active) setIsLoadingSource(false);
      });

    return () => {
      active = false;
    };
  }, [laporan.id_laporan]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const clearPreview = () => {
    setGeneratedFile(null);
    setPreviewUrl('');
  };

  const handleLoadGoogleDocPdf = async () => {
    setIsLoadingSource(true);
    setError('');
    clearPreview();

    try {
      const response = await api.get(`${endpoint}/${laporan.id_laporan}/google-doc-pdf`, {
        responseType: 'blob',
      });
      const bytes = new Uint8Array(await response.data.arrayBuffer());
      setSourcePdf(bytes);
      setSourceLabel('Google Docs/Drive versi terbaru');
    } catch (requestError) {
      const responseData = requestError.response?.data;
      const message = responseData instanceof Blob
        ? (await responseData.text()).match(/"message"\s*:\s*"([^"]+)"/)?.[1]
        : responseData?.message;
      setError(message || 'PDF terbaru dari Google Docs/Drive gagal dimuat. Periksa izin berbagi dokumen.');
    } finally {
      setIsLoadingSource(false);
    }
  };

  const updatePlacement = (setter, placement, field, value) => {
    setter({ ...placement, [field]: Number(value) });
    clearPreview();
  };

  const handlePreview = async () => {
    setError('');
    if (!sourcePdf) {
      setError('PDF laporan sumber belum siap.');
      return;
    }
    if (!signature || !stamp) {
      setError('Unggah gambar tanda tangan dan stempel terlebih dahulu.');
      return;
    }
    if (!isValidPlacement(signaturePlacement) || !isValidPlacement(stampPlacement)) {
      setError('Posisi dan ukuran gambar harus berada dalam batas halaman (0–100%).');
      return;
    }

    try {
      const { PDFDocument } = await import('pdf-lib');
      const document = await PDFDocument.load(sourcePdf);
      const pages = document.getPages();
      const page = pages[pages.length - 1];
      if (!page) throw new Error('PDF laporan tidak memiliki halaman.');

      const addImage = async (file, placement) => {
        const bytes = await file.arrayBuffer();
        const image = file.type === 'image/png'
          ? await document.embedPng(bytes)
          : file.type === 'image/jpeg' || file.type === 'image/jpg'
            ? await document.embedJpg(bytes)
            : null;
        if (!image) throw new Error('Gunakan gambar PNG atau JPG untuk tanda tangan dan stempel.');

        const { width, height } = page.getSize();
        page.drawImage(image, {
          x: width * placement.x / 100,
          y: height * placement.y / 100,
          width: width * placement.width / 100,
          height: height * placement.height / 100,
        });
      };

      await addImage(signature, signaturePlacement);
      await addImage(stamp, stampPlacement);
      const bytes = await document.save();
      const file = new Blob([bytes], { type: 'application/pdf' });
      setGeneratedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } catch (generationError) {
      setError(generationError.message || 'PDF final gagal dibuat. Pastikan PDF laporan tidak rusak atau terkunci.');
    }
  };

  const handleSave = async () => {
    if (!generatedFile) return;
    const formData = new FormData();
    formData.append('file', generatedFile, `laporan-final-${laporan.id_laporan}.pdf`);
    const saved = await onSave(formData);
    if (saved) onClose();
  };

  const renderPlacement = (label, placement, setter) => (
    <fieldset style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
      <legend style={{ padding: '0 0.35rem', fontWeight: 700 }}>{label}</legend>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.6rem' }}>
        {[
          ['x', 'Kiri (%)'],
          ['y', 'Bawah (%)'],
          ['width', 'Lebar (%)'],
          ['height', 'Tinggi (%)'],
        ].map(([field, title]) => (
          <label className="form-group" key={field} style={{ marginBottom: 0 }}>
            <span className="form-label">{title}</span>
            <input
              className="form-control"
              type="number"
              min="0"
              max="100"
              step="1"
              value={placement[field]}
              onChange={(event) => updatePlacement(setter, placement, field, event.target.value)}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3 className="modal-title">Tanda Tangan & PDF Final</h3>
          <button className="modal-close-btn" onClick={onClose} disabled={isSaving}>&times;</button>
        </div>

        <div className="modal-body">
          <p style={{ color: '#475569', marginTop: 0 }}>
            {laporan.judul_laporan} — tanda tangan dan stempel ditempatkan pada halaman terakhir. Posisi diukur dari kiri dan bawah halaman.
          </p>
          <p style={{ color: '#475569', marginTop: '-0.5rem' }}>
            Sumber PDF: <strong>{sourceLabel}</strong>
          </p>
          {(error || submitError) && (
            <p role="alert" style={{ color: '#b91c1c' }}>{error || submitError}</p>
          )}

          {googleDocAvailable && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleLoadGoogleDocPdf}
              disabled={isLoadingSource || isSaving}
              style={{ marginBottom: '1rem' }}
            >
              {isLoadingSource ? 'Memuat PDF...' : 'Gunakan versi terbaru dari Google Docs/Drive'}
            </button>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="signature-image">Gambar tanda tangan (PNG/JPG)</label>
            <input
              id="signature-image"
              className="form-control"
              type="file"
              accept="image/png,image/jpeg"
              onChange={(event) => {
                setSignature(event.target.files?.[0] || null);
                clearPreview();
              }}
            />
          </div>
          {renderPlacement('Posisi tanda tangan', signaturePlacement, setSignaturePlacement)}

          <div className="form-group">
            <label className="form-label" htmlFor="stamp-image">Gambar stempel instansi (PNG/JPG)</label>
            <input
              id="stamp-image"
              className="form-control"
              type="file"
              accept="image/png,image/jpeg"
              onChange={(event) => {
                setStamp(event.target.files?.[0] || null);
                clearPreview();
              }}
            />
          </div>
          {renderPlacement('Posisi stempel', stampPlacement, setStampPlacement)}

          <button
            type="button"
            className="btn-secondary"
            onClick={handlePreview}
            disabled={isLoadingSource || !sourcePdf || isSaving}
          >
            {isLoadingSource ? 'Memuat PDF sumber...' : 'Buat / Perbarui Pratinjau'}
          </button>

          {previewUrl && (
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Pratinjau PDF final</h4>
              <iframe
                title="Pratinjau PDF final"
                src={previewUrl}
                style={{ width: '100%', height: '480px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>Batal</button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={!generatedFile || isSaving}>
            {isSaving ? 'Menyimpan...' : 'Simpan PDF Final'}
          </button>
        </div>
      </div>
    </div>
  );
}
