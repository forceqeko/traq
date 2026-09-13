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
    backgroundColor = '#0B0E14',
  } = options;

  const element = typeof targetElement === 'string' ? document.getElementById(targetElement) : targetElement;
  if (!element) {
    throw new Error('Elemen kanvas tidak ditemukan untuk diekspor.');
  }

  // High-DPI capture
  const canvas = await html2canvas(element, {
    scale: 2.5,
    useCORS: true,
    allowTaint: true,
    backgroundColor: backgroundColor,
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
