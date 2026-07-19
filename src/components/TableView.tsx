import React, { useState } from 'react';
import { Bill } from '../types';
import { formatCurrency } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileCheck, FileMinus, Receipt, Edit2, Trash2, CheckCircle2, Circle, CheckSquare, Download } from 'lucide-react';
import { downloadBase64Pdf } from '../lib/pdf';

interface TableViewProps {
  bills: Bill[];
  title: string;
  emptyMessage: string;
  onTogglePaid: (bill: Bill) => void;
  onEdit: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
}

export function TableView({ bills, title, emptyMessage, onTogglePaid, onEdit, onDelete }: TableViewProps) {
  // Sort by date descending
  const sortedBills = [...bills].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  return (
    <div className="flex-1 h-full overflow-y-auto bg-white p-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">{title}</h2>
      
      {sortedBills.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="p-4 font-semibold w-12">Status</th>
                <th className="p-4 font-semibold">Título</th>
                <th className="p-4 font-semibold">Vencimento</th>
                <th className="p-4 font-semibold text-right">Valor</th>
                <th className="p-4 font-semibold">Recorrência</th>
                <th className="p-4 font-semibold">Anexos</th>
                <th className="p-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedBills.map(bill => (
                <tr key={bill.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => onTogglePaid(bill)}
                      className={`rounded-full transition-colors ${bill.isPaid ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}
                    >
                      {bill.isPaid ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>
                  </td>
                  <td className="p-4">
                    <span className={`font-medium ${bill.isPaid ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                      {bill.title}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    {format(parseISO(bill.dueDate), "dd 'de' MMM, yyyy", { locale: ptBR })}
                  </td>
                  <td className="p-4 text-right font-medium text-slate-700">
                    {formatCurrency(bill.amount)}
                  </td>
                  <td className="p-4 text-sm text-slate-500">
                    {bill.recurrence === 'monthly' ? 'Mensal' : 'Nenhuma'}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {bill.pdfData ? (
                        <button 
                          onClick={() => downloadBase64Pdf(bill.pdfData!, bill.pdfName || 'boleto.pdf')}
                          className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded uppercase border border-emerald-100 transition-colors cursor-pointer"
                          title={bill.pdfName}
                        >
                          <FileCheck className="w-3 h-3" /> <Download className="w-3 h-3 ml-1 opacity-50" />
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase border border-amber-100">
                          <FileMinus className="w-3 h-3" />
                        </span>
                      )}

                      {bill.invoicePdfData && (
                        <button 
                          onClick={() => downloadBase64Pdf(bill.invoicePdfData!, bill.invoicePdfName || 'nota.pdf')}
                          className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded uppercase border border-indigo-100 transition-colors cursor-pointer"
                          title={bill.invoicePdfName}
                        >
                          <Receipt className="w-3 h-3" /> <Download className="w-3 h-3 ml-1 opacity-50" />
                        </button>
                      )}

                      {bill.receiptPdfData && (
                        <button 
                          onClick={() => downloadBase64Pdf(bill.receiptPdfData!, bill.receiptPdfName || 'comprovante.pdf')}
                          className="flex items-center gap-1 text-[10px] font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded uppercase border border-sky-100 transition-colors cursor-pointer"
                          title={bill.receiptPdfName}
                        >
                          <CheckSquare className="w-3 h-3" /> <Download className="w-3 h-3 ml-1 opacity-50" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onEdit(bill)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDelete(bill)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
