import { jsPDF } from 'jspdf';
import { domToCanvas } from 'modern-screenshot';
import { EXCLUDE_FROM_PDF_SELECTOR } from '../core/constants';

export interface PdfBuildOptions {
  element: HTMLElement;
  filename: string;
  orientation: 'portrait' | 'landscape';
  widthPx?: number;
  filterExcluded?: boolean;
}

export interface GeneratedPdf {
  blob: Blob;
  file: File;
  save: () => void;
}

function shouldIncludeNode(node: Node): boolean {
  if (!(node instanceof Element)) return true;
  return !node.matches(EXCLUDE_FROM_PDF_SELECTOR);
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? img.decode().catch(() => {})
        : new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
    ),
  );
}

export async function renderElementToPdf(opts: PdfBuildOptions): Promise<GeneratedPdf> {
  await waitForImages(opts.element);

  const canvas = await domToCanvas(opts.element, {
    scale: Math.min(Math.max(window.devicePixelRatio || 2, 2), 2.5),
    backgroundColor: '#ffffff',
    width: opts.widthPx ?? opts.element.scrollWidth,
    filter: opts.filterExcluded ? shouldIncludeNode : undefined,
  });

  const pdf = new jsPDF({
    orientation: opts.orientation,
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const margin = 8;
  const printW = pdf.internal.pageSize.getWidth() - margin * 2;
  const printH = pdf.internal.pageSize.getHeight() - margin * 2;

  const pageSlicePx = Math.max(1, Math.floor((printH * canvas.width) / printW));
  const sliceCanvas = document.createElement('canvas');
  sliceCanvas.width = canvas.width;
  const ctx = sliceCanvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');

  let offsetY = 0;
  let pageIndex = 0;

  while (offsetY < canvas.height) {
    const sliceH = Math.min(pageSlicePx, canvas.height - offsetY);
    sliceCanvas.height = sliceH;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sliceCanvas.width, sliceH);
    ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

    if (pageIndex > 0) pdf.addPage();
    const renderedH = (sliceH * printW) / canvas.width;
    const imgData = sliceCanvas.toDataURL('image/jpeg', 0.94);
    pdf.addImage(imgData, 'JPEG', margin, margin, printW, renderedH, undefined, 'FAST');

    offsetY += sliceH;
    pageIndex += 1;
  }

  const blob = pdf.output('blob');
  const file = new File([blob], opts.filename, { type: 'application/pdf' });

  return {
    blob,
    file,
    save: () => pdf.save(opts.filename),
  };
}
