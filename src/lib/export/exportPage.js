import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Custom High-Resolution Canvas Exporter for TRAQ
 * Supports Portrait/Landscape, Multi-page PDF, and High-DPI PNG.
 */
export async function exportCustomCanvas(targetElement, options = {}) {
  const {
    filename = 'TRAQ_Laporan.pdf',
    format = 'pdf', // 'pdf' | 'png'
    orientation = 'landscape', // 'landscape' | 'portrait'
    backgroundColor,
  } = options;

  const defaultBg = typeof window !== 'undefined'
    ? (getComputedStyle(document.documentElement).getPropertyValue('--surface-0').trim() || '#FFFFFF')
    : '#FFFFFF';
  const effectiveBg = backgroundColor || defaultBg;

  const element = typeof targetElement === 'string' ? document.getElementById(targetElement) : targetElement;
  if (!element) {
    throw new Error('Elemen kanvas tidak ditemukan untuk diekspor.');
  }

  // High-DPI capture
  const canvas = await html2canvas(element, {
    scale: 2.5,
    useCORS: true,
    allowTaint: true,
    backgroundColor: effectiveBg,
    logging: false,
    windowWidth: element.scrollWidth || 1200,
  });

  if (format === 'png') {
    const image = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.href = image;
    link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    link.click();
    return;
  }

  // PDF Generation with exact page orientation
  const imgData = canvas.toDataURL('image/png', 1.0);
  const pdf = new jsPDF({
    orientation: orientation === 'portrait' ? 'portrait' : 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgProps = pdf.getImageProperties(imgData);
  const imgHeightOnPdf = (imgProps.height * pageWidth) / imgProps.width;

  let heightLeft = imgHeightOnPdf;
  let position = 0;

  // First page
  pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeightOnPdf, '', 'FAST');
  heightLeft -= pageHeight;

  // Add subsequent pages if content exceeds one page
  while (heightLeft > 2) {
    position = position - pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeightOnPdf, '', 'FAST');
    heightLeft -= pageHeight;
  }

  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

/**
 * Multi-Page High-Resolution Canvas Exporter for TRAQ
 * Renders multiple A4 canvas pages sequentially into a single PDF or multiple PNGs.
 */
export async function exportMultiPageCanvas(pageElements, options = {}) {
  const {
    filename = 'TRAQ_Laporan',
    format = 'pdf', // 'pdf' | 'png'
    orientation = 'landscape', // 'landscape' | 'portrait'
    backgroundColor,
    onProgress = () => {},
  } = options;

  const defaultBg = typeof window !== 'undefined'
    ? (getComputedStyle(document.documentElement).getPropertyValue('--surface-0').trim() || '#FFFFFF')
    : '#FFFFFF';
  const effectiveBg = backgroundColor || defaultBg;

  if (!pageElements || pageElements.length === 0) {
    throw new Error('Tidak ada halaman untuk diekspor.');
  }

  // Handle PNG: download each page as high-res image
  if (format === 'png') {
    for (let i = 0; i < pageElements.length; i++) {
      if (onProgress) onProgress(i + 1, pageElements.length, `Merender Halaman ${i + 1}...`);
      const el = pageElements[i];
      const canvas = await html2canvas(el, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: effectiveBg,
        logging: false,
        windowWidth: el.scrollWidth || 1200,
      });

      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = image;
      const cleanName = filename.replace(/\.(png|pdf)$/i, '');
      const pageSuffix = pageElements.length > 1 ? `_Halaman_${i + 1}` : '';
      link.download = `${cleanName}${pageSuffix}.png`;
      link.click();

      if (pageElements.length > 1) {
        await new Promise((r) => setTimeout(r, 350));
      }
    }
    return;
  }

  // Handle PDF: multi-page document matching exact A4 dimensions
  const pdf = new jsPDF({
    orientation: orientation === 'portrait' ? 'portrait' : 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < pageElements.length; i++) {
    if (onProgress) onProgress(i + 1, pageElements.length, `Menyusun Halaman ${i + 1} dari ${pageElements.length}...`);
    const el = pageElements[i];
    const canvas = await html2canvas(el, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: effectiveBg,
      logging: false,
      windowWidth: el.scrollWidth || 1200,
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    if (i > 0) {
      pdf.addPage();
    }
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, '', 'FAST');
  }

  const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(finalFilename);
}

/**
 * Legacy single-click PNG exporter
 */
export async function exportToImage(targetElement, filename = 'TRAQ_Dashboard.png') {
  return exportCustomCanvas(targetElement, {
    filename,
    format: 'png',
    orientation: 'landscape',
  });
}

/**
 * Legacy single-click PDF exporter
 */
export async function exportToPdf(targetElement, filename = 'TRAQ_Laporan.pdf') {
  return exportCustomCanvas(targetElement, {
    filename,
    format: 'pdf',
    orientation: 'landscape',
  });
}
