import React from 'react';
import { Bill } from '../types';
import { formatCurrency } from '../lib/utils';
import { downloadBase64Pdf } from '../lib/pdf';
import { FileCheck, FileMinus, CheckCircle2, Circle, Trash2, Printer, AlertCircle, Receipt, Edit2, Download, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BillListProps {
  date: Date;
  bills: Bill[];
  onTogglePaid: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
  onEdit: (bill: Bill) => void;
  onGeneratePdf: () => void;
}

export function BillList({ date, bills, onTogglePaid, onDelete, onEdit, onGeneratePdf }: BillListProps) {
  const dayBills = bills.filter(b => b.dueDate === format(date, 'yyyy-MM-dd'));
  
  const totalAmount = dayBills.reduce((acc, bill) => acc + bill.amount, 0);
  const paidAmount = dayBills.filter(b => b.isPaid).reduce((acc, bill) => acc + bill.amount, 0);
  const missingPdfCount = dayBills.filter(b => !b.pdfData).length;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      <div className="flex-1 overflow-y-auto p-6">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
          Hoje: {format(date, "EEEE, d 'de' MMM", { locale: ptBR })}
        </h3>
        
        <div className="space-y-3">
          {dayBills.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              <p>Nenhuma conta para este dia.</p>
            </div>
          ) : (
            dayBills.map(bill => (
              <div 
                key={bill.id} 
                className={`group bg-white p-4 rounded-xl border flex flex-col gap-2 shadow-sm transition-all ${bill.isPaid ? 'opacity-60 border-slate-200' : (bill.pdfData ? 'border-slate-200' : 'border-slate-200 border-l-4 border-l-amber-500')}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <button 
                      onClick={() => onTogglePaid(bill)}
                      className="focus:outline-none shrink-0"
                    >
                      {bill.isPaid ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 hover:text-blue-500 transition-colors" />
                      )}
                    </button>
                    <div className="truncate">
                      <p className={`text-xs font-medium truncate ${bill.isPaid ? 'text-slate-400 line-through' : 'text-slate-500'}`}>
                        {bill.title}
                      </p>
                      <p className={`font-bold ${bill.isPaid ? 'text-slate-500' : 'text-slate-800'}`}>
                        {formatCurrency(bill.amount)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <button 
                      onClick={() => onEdit(bill)}
                      className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      title="Editar conta"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDelete(bill)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      title="Excluir conta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 ml-8">
                    {bill.pdfData ? (
                      <button 
                        onClick={() => downloadBase64Pdf(bill.pdfData!, bill.pdfName || 'boleto.pdf')}
                        className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded uppercase border border-emerald-100 transition-colors cursor-pointer"
                        title={bill.pdfName}
                      >
                        <FileCheck className="w-3 h-3" /> Boleto <Download className="w-3 h-3 ml-1 opacity-50" />
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase border border-amber-100">
                        <FileMinus className="w-3 h-3" /> S/ Boleto
                      </span>
                    )}

                    {bill.invoicePdfData && (
                      <button 
                        onClick={() => downloadBase64Pdf(bill.invoicePdfData!, bill.invoicePdfName || 'nota.pdf')}
                        className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded uppercase border border-indigo-100 transition-colors cursor-pointer"
                        title={bill.invoicePdfName}
                      >
                        <Receipt className="w-3 h-3" /> Nota <Download className="w-3 h-3 ml-1 opacity-50" />
                      </button>
                    )}

                    {bill.receiptPdfData && (
                      <button 
                        onClick={() => downloadBase64Pdf(bill.receiptPdfData!, bill.receiptPdfName || 'comprovante.pdf')}
                        className="flex items-center gap-1 text-[10px] font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded uppercase border border-sky-100 transition-colors cursor-pointer"
                        title={bill.receiptPdfName}
                      >
                        <CheckSquare className="w-3 h-3" /> Comprovante <Download className="w-3 h-3 ml-1 opacity-50" />
                      </button>
                    )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Action Footer */}
      <div className="mt-auto p-6 bg-white border-t border-slate-200 shrink-0">
        <button 
          onClick={onGeneratePdf}
          disabled={dayBills.length === 0}
          className={`w-full py-4 rounded-xl font-bold flex flex-col items-center justify-center gap-1 shadow-lg transition-colors ${dayBills.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
        >
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            <span>Gerar Lote de Hoje</span>
          </div>
          <span className={`text-[10px] font-normal px-2 ${dayBills.length === 0 ? 'text-slate-400' : 'text-slate-400'}`}>
            Compilar todos os boletos, notas e comprovantes (PDF Único)
          </span>
        </button>
        
        {missingPdfCount > 0 && dayBills.length > 0 && (
          <div className="mt-4 flex items-center justify-center gap-1 text-amber-600">
            <AlertCircle className="w-3 h-3" />
            <span className="text-[10px] font-bold">
              {missingPdfCount} conta{missingPdfCount > 1 ? 's' : ''} faltando boleto
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
