import React, { useState } from 'react';
import { Bill } from '../types';
import { formatCurrency } from '../lib/utils';
import { format, parseISO, isSameMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, DollarSign, Calendar as CalendarIcon, Download } from 'lucide-react';
import { generatePeriodPdf } from '../lib/pdf';

interface ReportsViewProps {
  bills: Bill[];
}

export function ReportsView({ bills }: ReportsViewProps) {
  const currentDate = new Date();
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  const currentMonthBills = bills.filter(b => isSameMonth(parseISO(b.dueDate), currentDate));
  const previousMonthBills = bills.filter(b => isSameMonth(parseISO(b.dueDate), subMonths(currentDate, 1)));

  const currentTotal = currentMonthBills.reduce((acc, bill) => acc + bill.amount, 0);
  const previousTotal = previousMonthBills.reduce((acc, bill) => acc + bill.amount, 0);
  const currentPaid = currentMonthBills.filter(b => b.isPaid).reduce((acc, bill) => acc + bill.amount, 0);
  
  const percentageChange = previousTotal > 0 
    ? ((currentTotal - previousTotal) / previousTotal) * 100 
    : 0;

  const handleExport = async () => {
    if (!exportStartDate || !exportEndDate) {
      setExportMessage('Por favor, selecione as datas de início e fim.');
      return;
    }

    if (exportStartDate > exportEndDate) {
      setExportMessage('A data de início deve ser anterior ou igual à data de fim.');
      return;
    }

    setIsExporting(true);
    setExportMessage('');

    try {
      const billsToExport = bills
        .filter(b => b.dueDate >= exportStartDate && b.dueDate <= exportEndDate)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

      if (billsToExport.length === 0) {
        setExportMessage('Nenhuma conta encontrada neste período.');
        setIsExporting(false);
        return;
      }

      const hasDocuments = billsToExport.some(b => b.pdfData || b.receiptPdfData || b.invoicePdfData);
      
      if (!hasDocuments) {
        setExportMessage('Nenhuma conta neste período possui documentos anexados.');
        setIsExporting(false);
        return;
      }

      const periodName = `${exportStartDate}_a_${exportEndDate}`;
      const success = await generatePeriodPdf(billsToExport, periodName);
      
      if (success) {
        setExportMessage('Exportação concluída com sucesso!');
      } else {
        setExportMessage('Não foi possível gerar o arquivo PDF.');
      }
    } catch (e) {
      console.error(e);
      setExportMessage('Erro ao exportar documentos.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-white p-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-8">Visão Geral e Relatórios</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3 text-slate-500 mb-4">
            <CalendarIcon className="w-5 h-5" />
            <h3 className="font-medium">Neste Mês ({format(currentDate, 'MMM/yyyy', { locale: ptBR })})</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">{formatCurrency(currentTotal)}</p>
          <div className="mt-4 flex items-center gap-2 text-sm">
            {percentageChange > 0 ? (
              <span className="flex items-center gap-1 text-red-600 font-medium bg-red-50 px-2 py-1 rounded">
                <TrendingUp className="w-4 h-4" />
                +{percentageChange.toFixed(1)}%
              </span>
            ) : percentageChange < 0 ? (
              <span className="flex items-center gap-1 text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded">
                <TrendingDown className="w-4 h-4" />
                {percentageChange.toFixed(1)}%
              </span>
            ) : (
              <span className="text-slate-500">Sem alteração</span>
            )}
            <span className="text-slate-500">vs. mês passado</span>
          </div>
        </div>

        <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-100">
          <div className="flex items-center gap-3 text-emerald-700 mb-4">
            <DollarSign className="w-5 h-5" />
            <h3 className="font-medium">Total Pago (Mês)</h3>
          </div>
          <p className="text-3xl font-bold text-emerald-800">{formatCurrency(currentPaid)}</p>
          <div className="mt-4 w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all" 
              style={{ width: `${currentTotal > 0 ? (currentPaid / currentTotal) * 100 : 0}%` }}
            />
          </div>
          <p className="text-sm mt-2 text-emerald-700">
            {currentTotal > 0 ? Math.round((currentPaid / currentTotal) * 100) : 0}% das contas liquidadas
          </p>
        </div>

        <div className="p-6 bg-amber-50 rounded-xl border border-amber-100">
          <div className="flex items-center gap-3 text-amber-700 mb-4">
            <TrendingUp className="w-5 h-5" />
            <h3 className="font-medium">Total Pendente (Mês)</h3>
          </div>
          <p className="text-3xl font-bold text-amber-800">{formatCurrency(currentTotal - currentPaid)}</p>
          <p className="text-sm mt-4 text-amber-700">
            Contas a pagar até o fim do mês
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Próximos Vencimentos</h3>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="divide-y divide-slate-100">
              {currentMonthBills
                .filter(b => !b.isPaid && parseISO(b.dueDate) >= new Date(new Date().setHours(0,0,0,0)))
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .slice(0, 5)
                .map(bill => (
                  <div key={bill.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="font-medium text-slate-800">{bill.title}</p>
                      <p className="text-sm text-slate-500">{format(parseISO(bill.dueDate), "dd 'de' MMMM", { locale: ptBR })}</p>
                    </div>
                    <p className="font-bold text-slate-700">{formatCurrency(bill.amount)}</p>
                  </div>
                ))}
              {currentMonthBills.filter(b => !b.isPaid && parseISO(b.dueDate) >= new Date(new Date().setHours(0,0,0,0))).length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  Nenhuma conta pendente para os próximos dias deste mês.
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Exportar Documentos</h3>
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <p className="text-sm text-slate-600 mb-6">
              Exporte todos os documentos (Boleto, Comprovante e Nota) das contas de um determinado período em um único arquivo PDF.
            </p>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data Inicial</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-600"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data Final</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-600"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                  />
                </div>
              </div>
              
              <button
                onClick={handleExport}
                disabled={isExporting}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm
                  ${isExporting 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                {isExporting ? (
                  <span className="w-5 h-5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></span>
                ) : (
                  <Download className="w-5 h-5" />
                )}
                {isExporting ? 'Gerando PDF...' : 'Exportar PDFs do Período'}
              </button>
              
              {exportMessage && (
                <div className={`p-3 rounded text-sm text-center ${
                  exportMessage.includes('sucesso') 
                    ? 'bg-emerald-50 text-emerald-700' 
                    : exportMessage.includes('Por favor') || exportMessage.includes('anterior')
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-700'
                }`}>
                  {exportMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
