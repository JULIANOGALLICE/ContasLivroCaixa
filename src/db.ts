import { Bill, CashBookEntry, FixedItem, SealedMonth } from './types';

const API_BASE = '/api';

export const db = {
  async getBills(): Promise<Bill[]> {
    const res = await fetch(`${API_BASE}/bills`);
    return res.json();
  },
  
  async addBill(bill: Bill): Promise<void> {
    const res = await fetch(`${API_BASE}/bills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bill)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to add bill: ${res.status} - ${err}`);
    }
  },

  async updateBill(updatedBill: Bill): Promise<void> {
    const res = await fetch(`${API_BASE}/bills/${updatedBill.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedBill)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to update bill: ${res.status} - ${err}`);
    }
  },

  async deleteBill(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/bills/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to delete bill: ${res.status} - ${err}`);
    }
  },

  async getCashBookEntries(): Promise<CashBookEntry[]> {
    const res = await fetch(`${API_BASE}/cashbook`);
    return res.json();
  },
  
  async addCashBookEntry(entry: CashBookEntry): Promise<void> {
    await fetch(`${API_BASE}/cashbook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
  },

  async addCashBookEntries(entries: CashBookEntry[]): Promise<void> {
    await fetch(`${API_BASE}/cashbook/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entries)
    });
  },

  async updateCashBookEntry(updatedEntry: CashBookEntry): Promise<void> {
    await fetch(`${API_BASE}/cashbook/${updatedEntry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedEntry)
    });
  },

  async deleteCashBookEntry(id: string): Promise<void> {
    await fetch(`${API_BASE}/cashbook/${id}`, {
      method: 'DELETE'
    });
  },

  async getFixedItems(): Promise<FixedItem[]> {
    const res = await fetch(`${API_BASE}/fixed-items`);
    return res.json();
  },

  async addFixedItem(item: FixedItem): Promise<void> {
    await fetch(`${API_BASE}/fixed-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
  },

  async saveFixedItems(items: FixedItem[]): Promise<void> {
    await fetch(`${API_BASE}/fixed-items/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items)
    });
  },

  async getSealedMonths(): Promise<SealedMonth[]> {
    const res = await fetch(`${API_BASE}/sealed-months`);
    return res.json();
  },

  async sealMonth(month: number, year: number, bookNumber?: string, pageCount?: number, pdfBlob?: Blob): Promise<void> {
    const formData = new FormData();
    formData.append('month', month.toString());
    formData.append('year', year.toString());
    if (bookNumber) formData.append('bookNumber', bookNumber);
    if (pageCount) formData.append('pageCount', pageCount.toString());
    if (pdfBlob) formData.append('pdf', pdfBlob, `Livro_Caixa_${month.toString().padStart(2, '0')}_${year}.pdf`);

    await fetch(`${API_BASE}/sealed-months/seal`, {
      method: 'POST',
      body: formData
    });
  },

  async unsealMonth(month: number, year: number): Promise<void> {
    await fetch(`${API_BASE}/sealed-months/unseal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year })
    });
  }
};

