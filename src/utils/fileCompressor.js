import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Inisialisasi worker URL untuk pdfjs-dist di lingkungan browser / Vite
const setupPdfWorker = () => {
  const lib = pdfjsLib.default || pdfjsLib;
  const gw = lib.GlobalWorkerOptions || pdfjsLib.GlobalWorkerOptions;
  if (gw && !gw.workerSrc) {
    gw.workerSrc = pdfjsWorker;
  }
  return lib;
};

/**
 * Format bytes to human readable format (KB, MB)
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  return `${(kb / 1024).toFixed(2)} MB`;
}

/**
 * Kompres gambar (Pas Foto / Gambar scan) hingga mendekati target ukuran (~100 KB)
 * Menggunakan HTML5 Canvas dengan adaptive quality & dimension scaling
 */
export async function compressImageToTarget(file, options = {}) {
  const {
    targetSizeKb = 100, // Target ukuran maks 100 KB
    maxWidth = 800,
    maxHeight = 1000,
    outputType = 'image/jpeg'
  } = options;

  const targetSizeBytes = targetSizeKb * 1024;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak valid atau rusak.'));
      img.onload = async () => {
        try {
          let width = img.width;
          let height = img.height;

          // Resize jika resolusi terlalu raksasa (misal foto kamera 4000x3000px)
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          // Latar belakang putih untuk gambar transparan (PNG)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Binary search/iterasi kualitas untuk mendekati targetSizeKb (misal ~85-100 KB)
          let minQuality = 0.2;
          let maxQuality = 0.92;
          let bestBlob = null;

          const testBlob = (q) => new Promise((res) => canvas.toBlob(res, outputType, q));

          let blob = await testBlob(maxQuality);
          if (blob && blob.size <= targetSizeBytes) {
            bestBlob = blob;
          } else {
            // Jika melebihi 100 KB, iterasi turunkan kualitas
            for (let i = 0; i < 5; i++) {
              const midQuality = (minQuality + maxQuality) / 2;
              blob = await testBlob(midQuality);
              if (blob && blob.size <= targetSizeBytes) {
                bestBlob = blob;
                minQuality = midQuality;
              } else if (blob) {
                maxQuality = midQuality;
                bestBlob = blob;
              }
            }

            // Jika masih di atas 100 KB setelah kualitas diturunkan, lakukan scaling dimensi
            if (bestBlob && bestBlob.size > targetSizeBytes) {
              const scaleDownRatio = Math.sqrt(targetSizeBytes / bestBlob.size) * 0.95;
              const scaledW = Math.max(200, Math.round(width * scaleDownRatio));
              const scaledH = Math.max(260, Math.round(height * scaleDownRatio));
              
              const scaledCanvas = document.createElement('canvas');
              scaledCanvas.width = scaledW;
              scaledCanvas.height = scaledH;
              const sCtx = scaledCanvas.getContext('2d');
              sCtx.fillStyle = '#ffffff';
              sCtx.fillRect(0, 0, scaledW, scaledH);
              sCtx.drawImage(img, 0, 0, scaledW, scaledH);

              const fallbackBlob = await new Promise((res) => scaledCanvas.toBlob(res, outputType, 0.72));
              if (fallbackBlob) bestBlob = fallbackBlob;
            }
          }

          const finalBlob = bestBlob || blob;
          const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
          const compressedFile = new File([finalBlob], cleanName, {
            type: outputType,
            lastModified: Date.now()
          });

          // Safety check: jika kompresi menghasilkan file rusak/0 byte, pakai file asli
          const validFile = (compressedFile && compressedFile.size > 500) ? compressedFile : file;

          resolve({
            file: validFile,
            originalSize: file.size,
            compressedSize: validFile.size,
            isUnderTarget: validFile.size <= targetSizeBytes,
            originalSizeFormatted: formatFileSize(file.size),
            compressedSizeFormatted: formatFileSize(validFile.size),
            savedPercent: Math.max(0, Math.round((1 - validFile.size / file.size) * 100))
          });
        } catch (err) {
          reject(err);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Optimasi & kompresi mendalam berkas PDF hingga mencapai target ukuran (<= 100 KB)
 * Menggunakan pdfjs-dist untuk render raster halaman dan pdf-lib untuk rekonstruksi PDF hemat memori
 */
export async function optimizePdf(file, targetSizeKb = 100) {
  const targetSizeBytes = targetSizeKb * 1024;

  // 1. Jika ukuran file sejak awal sudah <= 100 KB, tidak perlu kompresi ulang
  if (file.size <= targetSizeBytes) {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      isUnderTarget: true,
      originalSizeFormatted: formatFileSize(file.size),
      compressedSizeFormatted: formatFileSize(file.size),
      savedPercent: 0
    };
  }

  // Simpan salinan asli buffer agar aman dan tidak pernah detached (0 byte)
  const originalBuffer = await file.arrayBuffer();
  // Copy terisolasi Uint8Array yang dijamin tidak akan terpengaruh transfer web worker
  const workingBytes = new Uint8Array(originalBuffer.slice(0));

  try {
    // Inisialisasi pdfjs-dist dengan worker yang sudah dibundle oleh Vite
    const pdfLibInstance = setupPdfWorker();

    // Selalu kirim SALINAN data agar workingBytes tidak ter-detach
    const taskData = new Uint8Array(workingBytes.slice(0));
    const loadingTask = pdfLibInstance.getDocument({
      data: taskData,
      useSystemFonts: true,
      isEvalSupported: false
    });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    if (!numPages || numPages < 1) {
      throw new Error('Dokumen PDF tidak memiliki halaman yang valid.');
    }

    // Jika dokumen sangat tebal (> 120 halaman), alihkan ke optimasi stream agar browser tetap responsif.
    if (numPages > 120) {
      console.info(`Dokumen memiliki ${numPages} halaman (> 120 halaman). Menggunakan optimasi stream presisi.`);
      throw new Error('DOKUMEN_TEBAL');
    }

    // Hitung alokasi ukuran per halaman agar total dokumen berada di bawah targetSizeKb
    const overheadKb = Math.min(250, numPages * 3 + 15);
    const totalImageBudgetKb = Math.max(30, targetSizeKb - overheadKb);
    const perPageTargetKb = Math.max(12, Math.floor(totalImageBudgetKb / numPages));

    const { PDFDocument } = await import('pdf-lib');
    const newPdfDoc = await PDFDocument.create();

    // Helper konversi canvas ke JPEG Uint8Array dengan isolated buffer
    const canvasToJpegBytes = (cvs, quality) => {
      return new Promise((resolve) => {
        cvs.toBlob(async (blob) => {
          if (blob) {
            const buf = await blob.arrayBuffer();
            resolve(new Uint8Array(buf));
          } else {
            // Fallback via toDataURL jika toBlob gagal
            const dataUrl = cvs.toDataURL('image/jpeg', quality);
            const base64 = dataUrl.split(',')[1];
            const binStr = atob(base64);
            const bytes = new Uint8Array(binStr.length);
            for (let i = 0; i < binStr.length; i++) {
              bytes[i] = binStr.charCodeAt(i);
            }
            resolve(bytes);
          }
        }, 'image/jpeg', quality);
      });
    };

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);

      // Ambil ukuran dasar halaman dokumen (scale 1.0)
      const baseViewport = page.getViewport({ scale: 1.0 });

      // Pilih resolusi berdasarkan anggaran per halaman agar teks tetap tajam sekaligus memenuhi target ukuran
      const targetMaxWidth = perPageTargetKb >= 120
        ? 1150
        : perPageTargetKb >= 40
          ? 900
          : (numPages === 1 ? 880 : (numPages <= 3 ? 760 : 640));
      const targetMaxHeight = perPageTargetKb >= 120
        ? 1620
        : perPageTargetKb >= 40
          ? 1280
          : (numPages === 1 ? 1240 : (numPages <= 3 ? 1080 : 900));

      let scale = Math.min(
        targetMaxWidth / baseViewport.width,
        targetMaxHeight / baseViewport.height,
        1.5
      );

      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Iterasi kompresi JPEG halaman adaptif
      let quality = perPageTargetKb >= 120 ? 0.78 : (perPageTargetKb >= 40 ? 0.70 : 0.65);
      let pageBytes = await canvasToJpegBytes(canvas, quality);

      const qualitySteps = perPageTargetKb >= 120
        ? [0.62, 0.48, 0.36]
        : [0.50, 0.38, 0.28];

      for (const q of qualitySteps) {
        if (pageBytes.byteLength <= perPageTargetKb * 1024) break;
        quality = q;
        pageBytes = await canvasToJpegBytes(canvas, quality);
      }

      // Jika masih melebihi jatah (misal dokumen full warna/scan bertekstur berat), scaling dimensi canvas
      if (pageBytes.byteLength > perPageTargetKb * 1024 && canvas.width > 420) {
        const downRatio = Math.max(0.6, Math.sqrt((perPageTargetKb * 1024) / pageBytes.byteLength) * 0.95);
        const dw = Math.round(canvas.width * downRatio);
        const dh = Math.round(canvas.height * downRatio);

        const scaledCanvas = document.createElement('canvas');
        scaledCanvas.width = dw;
        scaledCanvas.height = dh;
        const sCtx = scaledCanvas.getContext('2d');
        sCtx.fillStyle = '#ffffff';
        sCtx.fillRect(0, 0, dw, dh);
        sCtx.drawImage(canvas, 0, 0, dw, dh);

        pageBytes = await canvasToJpegBytes(scaledCanvas, 0.40);
      }

      // Embed JPEG ke PDF baru
      const embeddedJpg = await newPdfDoc.embedJpg(pageBytes);
      const pageWidth = (page.view && page.view[2]) || 595.28;
      const pageHeight = (page.view && page.view[3]) || 841.89;
      const newPage = newPdfDoc.addPage([pageWidth, pageHeight]);

      newPage.drawImage(embeddedJpg, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight
      });
    }

    const compressedPdfBytes = await newPdfDoc.save({ useObjectStreams: true });

    // Validasi ketat hasil kompresi:
    // 1. Harus memiliki isi (> 1000 bytes)
    // 2. Tidak boleh 0 KB
    // 3. Lebih kecil dari ukuran asli ATAU berhasil masuk ke target targetSizeBytes
    let finalBytes;
    if (compressedPdfBytes && compressedPdfBytes.byteLength > 1000) {
      if (compressedPdfBytes.byteLength < file.size || compressedPdfBytes.byteLength <= targetSizeBytes) {
        finalBytes = compressedPdfBytes;
      } else {
        finalBytes = workingBytes;
      }
    } else {
      finalBytes = workingBytes;
    }

    let finalFile = new File([finalBytes], file.name, {
      type: 'application/pdf',
      lastModified: Date.now()
    });

    // Double safety check: jangan pernah kembalikan file kosong/0 byte
    if (!finalFile || finalFile.size < 500) {
      console.warn('Ukuran hasil kompresi tidak wajar, menggunakan berkas asli.');
      finalFile = file;
    }

    return {
      file: finalFile,
      originalSize: file.size,
      compressedSize: finalFile.size,
      isUnderTarget: finalFile.size <= targetSizeBytes,
      originalSizeFormatted: formatFileSize(file.size),
      compressedSizeFormatted: formatFileSize(finalFile.size),
      savedPercent: Math.max(0, Math.round((1 - finalFile.size / file.size) * 100))
    };
  } catch (err) {
    if (err.message !== 'DOKUMEN_TEBAL') {
      console.warn('Kompresi visual PDF dialihkan ke stream optimization:', err);
    }
    try {
      const { PDFDocument } = await import('pdf-lib');
      // Selalu gunakan salinan workingBytes agar tidak pernah 0 byte
      const doc = await PDFDocument.load(workingBytes.slice(0), { ignoreEncryption: true });
      const bytes = await doc.save({ useObjectStreams: true });
      
      const useCompressed = bytes && bytes.byteLength > 1000 && (bytes.byteLength < file.size || bytes.byteLength <= targetSizeBytes);
      const finalBytes = useCompressed ? bytes : workingBytes;
      
      let finalFile = new File([finalBytes], file.name, {
        type: 'application/pdf',
        lastModified: Date.now()
      });

      if (!finalFile || finalFile.size < 500) {
        finalFile = file;
      }

      return {
        file: finalFile,
        originalSize: file.size,
        compressedSize: finalFile.size,
        isUnderTarget: finalFile.size <= targetSizeBytes,
        originalSizeFormatted: formatFileSize(file.size),
        compressedSizeFormatted: formatFileSize(finalFile.size),
        savedPercent: Math.max(0, Math.round((1 - finalFile.size / file.size) * 100))
      };
    } catch (fallbackErr) {
      console.error('Semua metode kompresi gagal, mengembalikan file asli:', fallbackErr);
      return {
        file,
        originalSize: file.size,
        compressedSize: file.size,
        isUnderTarget: file.size <= targetSizeBytes,
        originalSizeFormatted: formatFileSize(file.size),
        compressedSizeFormatted: formatFileSize(file.size),
        savedPercent: 0
      };
    }
  }
}

/**
 * Konversi gambar scan surat pengantar menjadi file PDF A4 terkompresi (~100 KB)
 */
export async function convertScanImageToCompressedPdf(imageFile, targetSizeKb = 100) {
  // Kompres gambarnya dulu ke ~80 KB
  const imageCompression = await compressImageToTarget(imageFile, {
    targetSizeKb: Math.round(targetSizeKb * 0.8),
    maxWidth: 1200,
    maxHeight: 1600
  });

  const { PDFDocument } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  // Standard A4: 595.28 x 841.89 points
  const page = pdfDoc.addPage([595.28, 841.89]);
  const imageBuffer = await imageCompression.file.arrayBuffer();
  const imageBytes = new Uint8Array(imageBuffer);
  const embeddedImage = await pdfDoc.embedJpg(imageBytes);

  const { width: imgW, height: imgH } = embeddedImage;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 20;

  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;
  const ratio = Math.min(maxWidth / imgW, maxHeight / imgH);

  const finalW = imgW * ratio;
  const finalH = imgH * ratio;
  const x = (pageWidth - finalW) / 2;
  const y = (pageHeight - finalH) / 2;

  page.drawImage(embeddedImage, {
    x,
    y,
    width: finalW,
    height: finalH
  });

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  const pdfName = imageFile.name.replace(/\.[^/.]+$/, '') + '_surat_pengantar.pdf';
  const pdfFile = new File([pdfBytes], pdfName, {
    type: 'application/pdf',
    lastModified: Date.now()
  });

  const validFile = (pdfFile && pdfFile.size > 500) ? pdfFile : imageFile;

  return {
    file: validFile,
    originalSize: imageFile.size,
    compressedSize: validFile.size,
    isUnderTarget: validFile.size <= (targetSizeKb * 1024),
    originalSizeFormatted: formatFileSize(imageFile.size),
    compressedSizeFormatted: formatFileSize(validFile.size),
    savedPercent: Math.max(0, Math.round((1 - validFile.size / imageFile.size) * 100))
  };
}
