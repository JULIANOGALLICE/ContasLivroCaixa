import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { Bill } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

async function decryptPdfWithPdfjs(arrayBuffer: ArrayBuffer, password?: string): Promise<Uint8Array | null> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      password: password,
    });
    
    const pdf = await loadingTask.promise;
    const newPdf = await PDFDocument.create();
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewportOriginal = page.getViewport({ scale: 1.0 });
      const viewportHighRes = page.getViewport({ scale: 4.0 }); // High-DPI (288 DPI) for crisp, professional resolution
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;
      
      canvas.height = viewportHighRes.height;
      canvas.width = viewportHighRes.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewportHighRes
      } as any).promise;
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const img = await newPdf.embedJpg(imgData);
      
      // Create page with original dimensions
      const pdfPage = newPdf.addPage([viewportOriginal.width, viewportOriginal.height]);
      
      // Draw high-resolution image scaled down to the original dimensions to preserve pristine quality
      pdfPage.drawImage(img, {
        x: 0,
        y: 0,
        width: viewportOriginal.width,
        height: viewportOriginal.height
      });
    }
    
    return await newPdf.save();
  } catch (error: any) {
    if (error?.name === 'PasswordException' || error?.message?.includes('No password given')) {
      return null; // Silently return null for missing/incorrect passwords so we can prompt the user
    }
    console.error("PDF.js render error:", error);
    return null;
  }
}

async function getPdfBytes(pdfData: string): Promise<Uint8Array | null> {
  if (!pdfData) return null;
  if (pdfData.startsWith('data:')) {
    const base64Data = pdfData.split(',')[1];
    return Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  } else {
    try {
      const response = await fetch(`/api/uploads/${pdfData}`);
      if (!response.ok) throw new Error('Failed to fetch pdf');
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (e) {
      console.error('Error fetching PDF:', e);
      return null;
    }
  }
}

export async function generateDailyPdf(bills: Bill[], dateString: string): Promise<boolean> {
  const mergedPdf = await PDFDocument.create();
  let hasPages = false;
  
  for (const bill of bills) {
    if (bill.pdfData) {
      try {
        const pdfBytes = await getPdfBytes(bill.pdfData);
        if (pdfBytes) {
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          
          for (const page of copiedPages) {
            mergedPdf.addPage(page);
            hasPages = true;
          }
        }
      } catch (e) {
        console.error('Error merging boleto PDF for bill', bill.title, e);
      }
    }

    if (bill.invoicePdfData) {
      try {
        const pdfBytes = await getPdfBytes(bill.invoicePdfData);
        if (pdfBytes) {
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          
          for (const page of copiedPages) {
            mergedPdf.addPage(page);
            hasPages = true;
          }
        }
      } catch (e) {
        console.error('Error merging invoice PDF for bill', bill.title, e);
      }
    }
    if (bill.receiptPdfData) {
      try {
        const pdfBytes = await getPdfBytes(bill.receiptPdfData);
        if (pdfBytes) {
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          
          for (const page of copiedPages) {
            mergedPdf.addPage(page);
            hasPages = true;
          }
        }
      } catch (e) {
        console.error('Error merging receipt PDF for bill', bill.title, e);
      }
    }
  }

  if (!hasPages) {
    return false;
  }

  const mergedPdfBytes = await mergedPdf.save();
  const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `boletos_${dateString}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  return true;
}

export async function generatePeriodPdf(bills: Bill[], periodName: string): Promise<boolean> {
  const mergedPdf = await PDFDocument.create();
  let hasPages = false;
  
  for (const bill of bills) {
    // 1. BOLETO
    if (bill.pdfData) {
      try {
        const pdfBytes = await getPdfBytes(bill.pdfData);
        if (pdfBytes) {
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          for (const page of copiedPages) {
            mergedPdf.addPage(page);
            hasPages = true;
          }
        }
      } catch (e) {
        console.error('Error merging boleto PDF for bill', bill.title, e);
      }
    }

    // 2. COMPROVANTE (Receipt)
    if (bill.receiptPdfData) {
      try {
        const pdfBytes = await getPdfBytes(bill.receiptPdfData);
        if (pdfBytes) {
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          for (const page of copiedPages) {
            mergedPdf.addPage(page);
            hasPages = true;
          }
        }
      } catch (e) {
        console.error('Error merging receipt PDF for bill', bill.title, e);
      }
    }

    // 3. NOTA (Invoice)
    if (bill.invoicePdfData) {
      try {
        const pdfBytes = await getPdfBytes(bill.invoicePdfData);
        if (pdfBytes) {
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          for (const page of copiedPages) {
            mergedPdf.addPage(page);
            hasPages = true;
          }
        }
      } catch (e) {
        console.error('Error merging invoice PDF for bill', bill.title, e);
      }
    }
  }

  if (!hasPages) {
    return false;
  }

  const mergedPdfBytes = await mergedPdf.save();
  const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio_documentos_${periodName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  return true;
}

export async function processPdfForUpload(file: File, password?: string, forceAttach: boolean = false): Promise<{ data: string; name: string; requiresPassword: boolean; error?: string; canForceAttach?: boolean; originalData?: string }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    if (forceAttach) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const result = await res.json();
      return { data: result.filename, name: file.name, requiresPassword: false };
    }

    await PDFDocument.load(arrayBuffer, { updateMetadata: false });
    
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const result = await res.json();
    
    return { data: result.filename, name: file.name, requiresPassword: false };
  } catch (error: any) {
    const isEncryptionError = error.message?.toLowerCase().includes('encrypt') || error.name === 'EncryptedPDFError' || error.message?.toLowerCase().includes('password');
    
    if (!isEncryptionError) {
      console.error('PDF processing error:', error);
    }
    
    const uploadOriginal = async () => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      return (await res.json()).filename;
    };

    if (isEncryptionError) {
      const decryptedBytes = await decryptPdfWithPdfjs(await file.arrayBuffer(), password);
      
      if (decryptedBytes) {
        const blob = new Blob([decryptedBytes], { type: 'application/pdf' });
        const formData = new FormData();
        formData.append('file', blob, file.name);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const result = await res.json();
        return { data: result.filename, name: file.name, requiresPassword: false };
      }

      if (password) {
        const originalFilename = await uploadOriginal();
        return { 
          data: '', 
          name: file.name, 
          requiresPassword: true, 
          error: `A senha fornecida está incorreta. (Ou a criptografia não é suportada e falhou no modo de compatibilidade)`,
          canForceAttach: true,
          originalData: originalFilename
        };
      }
      return { data: '', name: file.name, requiresPassword: true };
    }
    
    return { data: '', name: file.name, requiresPassword: false, error: `Erro ao processar PDF: ${error.message}` };
  }
}

export function downloadBase64Pdf(dataOrPath: string, filename: string) {
  if (dataOrPath.startsWith('data:')) {
    const a = document.createElement('a');
    a.href = dataOrPath;
    a.download = filename || 'documento.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    window.open(`/api/uploads/${dataOrPath}`, '_blank');
  }
}
