import { formatFileSize, compressImageToTarget } from './fileCompressor';

// Test file
export async function test() {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
  console.log(pdfjsLib.version);
}

