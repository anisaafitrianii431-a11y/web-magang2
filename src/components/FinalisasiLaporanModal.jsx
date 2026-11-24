import { useEffect, useState } from 'react';
import api from '../services/api';

const endpoint = '/v1/laporan-magang';
const signaturePlacement = { x: 64, y: 6, width: 30, height: 18 };

export default function FinalisasiLaporanModal({
  laporan,
  onClose,
  onSave,
  isSaving,
  submitError,
}) {
  const [sourcePdf, setSourcePdf] = useState(null);
  const [signature, setSignature] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [assetsConfigured, setAssetsConfigured] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [generatedFile, setGeneratedFile] = useState(null);
  const [isLoadingSource, setIsLoadingSource] = useState(true);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sourceLabel, setSourceLabel] = useState('PDF yang diunggah');
  const [error, setError] = useState('');
  const googleDocAvailable = Boolean(
    laporan.link_google_doc || laporan.riwayat_revisi?.some((revision) => revision.link_google_doc)
  );

  const setSourceDocument = async (bytes, label) => {
    const { PDFDocument } = await import('pdf-lib');
    const document = await PDFDocument.load(bytes);
    const totalPages = document.getPageCount();
    if (totalPages < 1) throw new Error('PDF laporan tidak memiliki halaman.');

    setSourcePdf(bytes);
    setPageCount(totalPages);
    setSourceLabel(label);
  };

  useEffect(() => {
    let active = true;
    const loadAssets = async () => {
      try {
        const response = await api.get(`${endpoint}/pdf-assets`);
        const configured = Boolean(response.data?.data?.configured);

        if (configured) {
          const signatureResponse = await api.get(`${endpoint}/pdf-assets/signature`, {
            responseType: 'blob',
          });
          if (!active) return;

          setSignature(new File(
            [signatureResponse.data],
            'signature',
            { type: signatureResponse.data.type || 'image/png' }
          ));
        }

        if (active) setAssetsConfigured(configured);
      } catch (requestError) {
        if (active) {
          setError(requestError.response?.data?.message || 'Foto tanda tangan gagal dimuat.');
        }
      } finally {
        if (active) setIsLoadingAssets(false);
      }
    };

    void loadAssets();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadSourcePdf = async () => {
      try {
        const useGoogleDoc = !laporan.file_laporan_pdf && googleDocAvailable;
        const response = await api.get(
          useGoogleDoc
            ? `${endpoint}/${laporan.id_laporan}/google-doc-pdf`
            : `${endpoint}/${laporan.id_laporan}/download?source=1`,
          { responseType: 'blob' }
        );
        const bytes = new Uint8Array(await response.data.arrayBuffer());
        if (active) {
          await setSourceDocument(
            bytes,
            useGoogleDoc ? 'Google Docs/Drive versi terbaru' : 'PDF yang diunggah'
          );
        }
      } catch (requestError) {
        if (active) {
          let responseData = requestError.response?.data;
          if (responseData instanceof Blob) {
            try {
              responseData = JSON.parse(await responseData.text());
            } catch {
              responseData = null;
            }
          }
          setError(responseData?.message || 'PDF laporan sumber gagal dimuat.');
        }
      } finally {
        if (active) setIsLoadingSource(false);
      }
    };

    loadSourcePdf();

    return () => {
      active = false;
    };
  }, [laporan.file_laporan_pdf, laporan.id_laporan, googleDocAvailable]);

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
      await setSourceDocument(bytes, 'Google Docs/Drive versi terbaru');
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

  const generateFinalPdf = async () => {
    if (!sourcePdf) {
      setError('PDF laporan sumber belum siap.');
      return null;
    }
    if (isLoadingAssets) {
      setError('Pengaturan foto tanda tangan masih dimuat.');
      return null;
    }
    if (!signature) {
      setError('Unggah foto tanda tangan yang sudah berada di atas stempel untuk mengaktifkan penggunaan otomatis.');
      return null;
    }

    try {
      const { PDFDocument } = await import('pdf-lib');
      const document = await PDFDocument.load(sourcePdf);
      const pages = document.getPages();

      const addImage = async (file, placement) => {
        const page = pages[pages.length - 1];
        if (!page) throw new Error('Halaman tujuan tanda tangan tidak valid.');
        const bytes = await file.arrayBuffer();
        const image = file.type === 'image/png'
          ? await document.embedPng(bytes)
          : file.type === 'image/jpeg' || file.type === 'image/jpg'
            ? await document.embedJpg(bytes)
            : null;
        if (!image) throw new Error('Gunakan foto tanda tangan PNG atau JPG.');

        const { width, height } = page.getSize();
        const imageSize = image.scaleToFit(
          width * placement.width / 100,
          height * placement.height / 100
        );
        page.drawImage(image, {
          x: width * placement.x / 100,
          y: height * placement.y / 100,
          ...imageSize,
        });
      };

      await addImage(signature, signaturePlacement);
      const bytes = await document.save();
      return new Blob([bytes], { type: 'application/pdf' });
    } catch (generationError) {
      setError(generationError.message || 'PDF final gagal dibuat. Pastikan PDF laporan tidak rusak atau terkunci.');
      return null;
    }
  };

  const handlePreview = async () => {
    setError('');
    setIsGenerating(true);
    try {
      const file = await generateFinalPdf();
      if (!file) return;
      setGeneratedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedFile) return;
    const fileUrl = URL.createObjectURL(generatedFile);
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = `laporan-final-${laporan.id_laporan}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(fileUrl), 30000);
  };

  const handleSave = async () => {
    setError('');
    setIsGenerating(true);
    try {
      if (!assetsConfigured) {
        if (!signature) {
          setError('Unggah foto tanda tangan yang sudah berada di atas stempel untuk mengaktifkan penggunaan otomatis.');
          return;
        }

        const formData = new FormData();
        formData.append('signature', signature);
        try {
          await api.post(`${endpoint}/pdf-assets`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          setAssetsConfigured(true);
        } catch (requestError) {
          const validationErrors = requestError.response?.data?.errors;
          setError(validationErrors
            ? Object.values(validationErrors).flat().join(' ')
            : requestError.response?.data?.message || 'Foto tanda tangan gagal disimpan.');
          return;
        }
      }

      const file = generatedFile || await generateFinalPdf();
      if (!file) return;

      if (!generatedFile) {
        setGeneratedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      }

      const formData = new FormData();
      formData.append('file', file, `laporan-final-${laporan.id_laporan}.pdf`);
      const saved = await onSave(formData);
      if (saved) onClose();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3 className="modal-title">Tanda Tangan & PDF Final</h3>
          <button className="modal-close-btn" onClick={onClose} disabled={isSaving}>&times;</button>
        </div>

        <div className="modal-body">
          <p style={{ color: '#475569', marginTop: 0 }}>
            {laporan.judul_laporan} — foto tanda tangan yang sudah berada di atas stempel otomatis ditempatkan pada halaman terakhir.
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

          {isLoadingAssets ? (
            <p style={{ color: '#475569' }}>Memuat pengaturan foto tanda tangan...</p>
          ) : assetsConfigured ? (
            <p style={{ color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '0.75rem' }}>
              Foto tanda tangan di atas stempel sudah tersimpan dan akan digunakan otomatis pada halaman terakhir
              {pageCount ? ` (halaman ${pageCount})` : ''}.
            </p>
          ) : (
            <>
              <p style={{ color: '#475569' }}>
                Unggah foto gabungan satu kali. Foto tersebut akan digunakan otomatis untuk laporan berikutnya.
              </p>
              <div className="form-group">
                <label className="form-label" htmlFor="signature-image">Foto tanda tangan di atas stempel (PNG/JPG)</label>
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
            </>
          )}

          <button
            type="button"
            className="btn-secondary"
            onClick={handlePreview}
            disabled={isLoadingSource || isLoadingAssets || !sourcePdf || isSaving || isGenerating}
          >
            {isLoadingSource ? 'Memuat PDF sumber...' : isGenerating ? 'Membuat PDF...' : 'Buat / Perbarui Pratinjau'}
          </button>
          {generatedFile && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleDownload}
              style={{ marginLeft: '0.5rem' }}
            >
              Unduh PDF Final
            </button>
          )}

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
          <button type="button" className="btn-primary" onClick={handleSave} disabled={isLoadingSource || isLoadingAssets || !sourcePdf || isSaving || isGenerating}>
            {isSaving ? 'Menyimpan...' : isGenerating ? 'Membuat PDF...' : 'Simpan PDF Final'}
          </button>
        </div>
      </div>
    </div>
  );
}
