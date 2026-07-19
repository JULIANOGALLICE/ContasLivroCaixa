import React, { useState, useMemo } from 'react';
import { Bill } from '../types';
import { TableView } from './TableView';
import { Search, Calendar } from 'lucide-react';

interface SearchViewProps {
  bills: Bill[];
  onTogglePaid: (bill: Bill) => void;
  onEdit: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
}

export function SearchView({ bills, onTogglePaid, onEdit, onDelete }: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredBills = useMemo(() => {
    let result = bills;
    
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(b => 
        b.title.toLowerCase().includes(lowerQuery) || 
        (b.pdfName && b.pdfName.toLowerCase().includes(lowerQuery)) ||
        (b.invoicePdfName && b.invoicePdfName.toLowerCase().includes(lowerQuery)) ||
        (b.receiptPdfName && b.receiptPdfName.toLowerCase().includes(lowerQuery))
      );
    }
    
    if (startDate) {
      result = result.filter(b => b.dueDate >= startDate);
    }
    
    if (endDate) {
      result = result.filter(b => b.dueDate <= endDate);
    }
    
    if (!query.trim() && !startDate && !endDate) {
      return [];
    }
    
    return result;
  }, [bills, query, startDate, endDate]);

  const hasSearchCriteria = query.trim() !== '' || startDate !== '' || endDate !== '';

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50">
      <div className="p-8 pb-0 shrink-0">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-11 pr-4 py-4 border-slate-200 rounded-xl leading-5 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-lg transition-all"
              placeholder="Buscar por título, nome do arquivo do boleto, nota ou comprovante..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="date"
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-600"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex items-center text-slate-400 text-sm">até</div>
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="date"
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-600"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm"
              >
                Limpar Datas
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-1 mt-4 overflow-hidden">
        {!hasSearchCriteria ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-slate-400 max-w-sm">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Digite algo ou selecione um período para pesquisar em todas as suas contas, boletos e notas.</p>
            </div>
          </div>
        ) : (
          <TableView 
            title="Resultados da Pesquisa"
            bills={filteredBills}
            emptyMessage="Nenhuma conta encontrada para a pesquisa."
            onTogglePaid={onTogglePaid}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  );
}
