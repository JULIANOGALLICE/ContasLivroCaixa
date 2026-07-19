export type RecurrenceType = 'none' | 'monthly';

export interface CashBookEntry {
  id: string;
  date: string; // YYYY-MM-DD
  esp: string;
  description: string;
  inflow: number;
  outflow: number;
}

export interface SealedMonth {
  id: string;
  month: number;
  year: number;
  bookNumber?: string;
  pageCount?: number;
  pdfPath?: string;
}

export interface FixedItem {
  id: string;
  name: string;
  unitPrice: number;
  esp: string;
}

export interface Bill {
  id: string;
  title: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  recurrence: RecurrenceType;
  isMutableAmount?: boolean;
  addToCashBook?: boolean;
  pdfPassword?: string;
  pdfData?: string; // base64 string
  pdfName?: string;
  invoicePdfData?: string; // base64 string for the invoice (nota)
  invoicePdfName?: string;
  receiptPdfData?: string; // base64 string for payment receipt
  receiptPdfName?: string;
  isPaid: boolean;
  parentId?: string;
}
