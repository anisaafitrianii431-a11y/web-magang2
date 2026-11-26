const KOP_IMAGE_URL = '/kop-pam.png';
const KOP_ASPECT_RATIO = 3477 / 2340;
const KOP_PDF_X = 9.75;
const KOP_PDF_Y = 3.1;
const KOP_PDF_W = 190.5;
const KOP_PDF_H = Number((KOP_PDF_W * KOP_ASPECT_RATIO).toFixed(2));

export const KOP_TOP_SAFE_Y = 36;
export const KOP_BOTTOM_SAFE_MARGIN = 30;

let cachedDataUrl = null;
let cachedArrayBuffer = null;

function isPngSignature(bytes) {
  return (
    bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4E
    && bytes[3] === 0x47
  );
}

async function fetchKopArrayBuffer() {
  if (cachedArrayBuffer) return cachedArrayBuffer;
  try {
    const response = await fetch(KOP_IMAGE_URL, { cache: 'force-cache' });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (!isPngSignature(bytes)) return null;
    cachedArrayBuffer = buffer;
    return cachedArrayBuffer;
  } catch {
    return null;
  }
}

export async function loadKopDataUrl() {
  if (cachedDataUrl) return cachedDataUrl;
  const buffer = await fetchKopArrayBuffer();
  if (!buffer) return null;

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  cachedDataUrl = `data:image/png;base64,${btoa(binary)}`;
  return cachedDataUrl;
}

function drawFallbackPdfKop(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(10, 58, 94);
  doc.text('CV. PUTRA ANUGRAH MANDIRI', pageWidth - 12, 11.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 52, 82);
  doc.text('Jl. M. Yunus No. 06 Kalawi, Kel. Lubuk Lintah Padang', pageWidth - 12, 16, { align: 'right' });
  doc.text('+6285274828427 | +625274153595', pageWidth - 12, 20, { align: 'right' });
  doc.text('putra.anugrahmandiri2016@gmail.com | www.pam-techno.co.id', pageWidth - 12, 24, { align: 'right' });

  doc.setDrawColor(10, 58, 94);
  doc.setLineWidth(1.1);
  doc.line(10, 27.5, pageWidth - 10, 27.5);

  doc.setLineWidth(0.9);
  doc.line(10, pageHeight - 17, pageWidth - 10, pageHeight - 17);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(10, 58, 94);
  doc.text('IT DEVELOPER  |  MAINTENANCE  |  SUPPLIER', pageWidth / 2, pageHeight - 10.5, { align: 'center' });
}

export function applyKopToPdfPage(doc, kopDataUrl) {
  if (kopDataUrl) {
    try {
      doc.addImage(kopDataUrl, 'PNG', KOP_PDF_X, KOP_PDF_Y, KOP_PDF_W, KOP_PDF_H);
      return;
    } catch {
      // Fallback to crisp vector text kop if image embedding fails
    }
  }
  drawFallbackPdfKop(doc);
}

export async function createKopDocxSectionConfig(docxModule) {
  const {
    AlignmentType,
    Header,
    HorizontalPositionAlign,
    HorizontalPositionRelativeFrom,
    ImageRun,
    Paragraph,
    TextRun,
    TextWrappingType,
    VerticalPositionRelativeFrom,
  } = docxModule;

  const buffer = await fetchKopArrayBuffer();
  if (!buffer) {
    return {
      header: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'CV. PUTRA ANUGRAH MANDIRI', font: 'Times New Roman', bold: true, size: 28, color: '0A3A5E' }),
            ],
            spacing: { after: 20 },
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: 'Jl. M. Yunus No. 06 Kalawi, Kel. Lubuk Lintah Padang | +6285274828427 | www.pam-techno.co.id',
                font: 'Times New Roman',
                size: 16,
                color: '0F3452',
              }),
            ],
            spacing: { after: 120 },
          }),
        ],
      }),
      margin: { top: 1500, right: 900, bottom: 1100, left: 900, header: 400, footer: 400 },
    };
  }

  return {
    header: new Header({
      children: [
        new Paragraph({
          children: [
            new ImageRun({
              type: 'png',
              data: buffer.slice(0),
              transformation: {
                width: 720,
                height: 1070,
              },
              floating: {
                horizontalPosition: {
                  relative: HorizontalPositionRelativeFrom.PAGE,
                  align: HorizontalPositionAlign.CENTER,
                },
                verticalPosition: {
                  relative: VerticalPositionRelativeFrom.PAGE,
                  offset: 112142,
                },
                behindDocument: true,
                allowOverlap: true,
                wrap: {
                  type: TextWrappingType.NONE,
                },
              },
            }),
          ],
        }),
      ],
    }),
    margin: { top: 2050, right: 900, bottom: 1550, left: 900, header: 180, footer: 180 },
  };
}

