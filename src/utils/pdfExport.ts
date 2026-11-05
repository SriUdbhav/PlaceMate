import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Exports a DOM element as a downloadable, high-fidelity A4 PDF with clickable hyperlinks.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  fileName: string = 'Resume.pdf'
): Promise<void> {
  // 1. Create a clean, off-screen clone of the element to capture at 100% scale without zoom transform
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  clone.style.width = '794px'; // Standard A4 pixel width at 96 DPI
  clone.style.minHeight = '1123px'; // Standard A4 pixel height at 96 DPI
  clone.style.maxWidth = '794px';
  clone.style.margin = '0';
  clone.style.padding = '36px 40px';
  clone.style.backgroundColor = '#ffffff';
  clone.style.color = '#0f172a';
  clone.style.position = 'fixed';
  clone.style.top = '-99999px';
  clone.style.left = '-99999px';
  clone.style.zIndex = '-1000';
  clone.style.boxSizing = 'border-box';
  document.body.appendChild(clone);

  try {
    // 2. High-resolution canvas render (scale: 2 gives 192 DPI crystal-clear text)
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
    });

    // 3. Initialize A4 jsPDF instance (210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = 210;
    const pageHeight = 297;
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // 4. Extract hyperlinks from clone to make them clickable in the PDF
    const links = clone.querySelectorAll('a[href]');
    const cloneRect = clone.getBoundingClientRect();
    const mmPerPx = pdfWidth / clone.offsetWidth;

    // Add first page
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');

    // Add clickable link annotations for the first page
    links.forEach((linkEl) => {
      const link = linkEl as HTMLAnchorElement;
      const href = link.href;
      if (!href || href === '#' || href.startsWith('javascript:')) return;

      const rect = link.getBoundingClientRect();
      const x = (rect.left - cloneRect.left) * mmPerPx;
      const y = (rect.top - cloneRect.top) * mmPerPx;
      const w = rect.width * mmPerPx;
      const h = rect.height * mmPerPx;

      if (y < pageHeight) {
        pdf.link(x, y, Math.max(w, 4), Math.max(h, 3), { url: href });
      }
    });

    // Multi-page handling if resume exceeds 1 page
    let heightLeft = imgHeight - pageHeight;
    let pageCount = 1;

    while (heightLeft > 5) {
      pdf.addPage();
      const position = -(pageCount * pageHeight);
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');

      // Add link annotations for subsequent pages
      const pageTopMm = pageCount * pageHeight;
      const pageBottomMm = (pageCount + 1) * pageHeight;

      links.forEach((linkEl) => {
        const link = linkEl as HTMLAnchorElement;
        const href = link.href;
        if (!href) return;

        const rect = link.getBoundingClientRect();
        const x = (rect.left - cloneRect.left) * mmPerPx;
        const y = (rect.top - cloneRect.top) * mmPerPx;
        const w = rect.width * mmPerPx;
        const h = rect.height * mmPerPx;

        if (y >= pageTopMm && y < pageBottomMm) {
          pdf.link(x, y - pageTopMm, Math.max(w, 4), Math.max(h, 3), { url: href });
        }
      });

      heightLeft -= pageHeight;
      pageCount++;
    }

    // 5. Trigger direct browser download of the PDF file
    pdf.save(fileName);
  } finally {
    // Clean up clone
    if (document.body.contains(clone)) {
      document.body.removeChild(clone);
    }
  }
}
