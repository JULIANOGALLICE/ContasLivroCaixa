import React, { useState } from 'react';
import { Bill, CashBookEntry } from '../types';
import { X } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface ImportBillsFormProps {
  bills: Bill[];
  onImport: (entries: CashBookEntry[], updatedBills: Bill[]) => Promise<void>;
  onClose: () => void;
}

export function ImportBillsForm({ bills, onImport, onClose }: ImportBillsFormProps) {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const billsToImport = bills.filter(b => 
        b.dueDate >= startDate && 
        b.dueDate <= endDate &&
        b.addToCashBook !== false
      );

      if (billsToImport.length === 0) {
        alert('Nenhuma conta encontrada neste período para importar.');
        setIsSubmitting(false);
        return;
      }

      const newEntries: CashBookEntry[] = billsToImport.map(bill => ({
        id: crypto.randomUUID(),
        date: bill.dueDate,
        esp: '',
        description: bill.title,
        inflow: 0,
        outflow: bill.amount,
      }));

      const updatedBills = billsToImport.map(bill => ({
        ...bill,
        isPaid: true,
        addToCashBook: false
      }));

      await onImport(newEntries, updatedBills);
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  // Count how many bills will be imported based on current dates
  const count = bills.filter(b => 
    b.dueDate >= startDate && 
    b.dueDate <= endDate &&
    b.addToCashBook !== false
  ).length;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Importar do Calendário</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Selecione o período para importar as contas do calendário para o livro caixa. As contas importadas serão marcadas como pagas e não aparecerão duplicadas.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data Inicial</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data Final</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm flex items-center justify-between">
              <span>Contas a serem importadas:</span>
              <span className="font-bold text-lg">{count}</span>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || count === 0}
              className="px-6 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Importar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
