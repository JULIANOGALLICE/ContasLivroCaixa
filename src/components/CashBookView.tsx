import { v4 as uuidv4 } from 'uuid';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Bill, CashBookEntry, SealedMonth } from '../types';
import { format, parseISO, isSameMonth, subMonths, getYear, addMonths, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '../lib/utils';
import { Plus, ChevronLeft, ChevronRight, Edit2, Trash2, Upload, Lock, Unlock, FileText, BarChart2 } from 'lucide-react';
import { db } from '../db';
import { read, utils } from 'xlsx';
import { generateCashBookPdf } from '../lib/pdfCashBook';

interface CashBookViewProps {
  bills: Bill[];
  entries: CashBookEntry[];
  sealedMonths: SealedMonth[];
  onAddEntry: () => void;
  onEditEntry: (entry: CashBookEntry) => void;
  onDeleteEntry: (id: string) => void;
  onImportEntries: (entries: CashBookEntry[]) => Promise<void>;
  onOpenDailyEntries: () => void;
  onOpenImportBills: () => void;
  onToggleSealMonth: (month: number, year: number, isSealing: boolean, bookNumber?: string, pageCount?: number, pdfBlob?: Blob) => Promise<void>;
}

export function CashBookView({ bills, entries, sealedMonths, onAddEntry, onEditEntry, onDeleteEntry, onImportEntries, onOpenDailyEntries, onOpenImportBills, onToggleSealMonth }: CashBookViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isImporting, setIsImporting] = useState(false);
  const [sealConfirmType, setSealConfirmType] = useState<'seal' | 'unseal' | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousBookFileInputRef = useRef<HTMLInputElement>(null);

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const currentMonth = getMonth(currentDate) + 1;
  const currentYear = getYear(currentDate);
  const isCurrentMonthSealed = sealedMonths.some(m => m.month === currentMonth && m.year === currentYear);

  const handlePreviousBookUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = read(arrayBuffer, { type: 'buffer' });
      const newEntries: CashBookEntry[] = [];
      
      const sheetNamesToProcess = workbook.SheetNames.includes('LIVRO') 
        ? ['LIVRO'] 
        : workbook.SheetNames;

      for (const sheetName of sheetNamesToProcess) {
        const worksheet = workbook.Sheets[sheetName];
        const rows = utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        
        // Skip header row (i = 1)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 3) continue;
          
          // A (index 0): Date
          const dateVal = row[0];
          let date = '';
          if (typeof dateVal === 'number') {
             const jsDate = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
             jsDate.setMinutes(jsDate.getMinutes() + jsDate.getTimezoneOffset());
             date = format(jsDate, 'yyyy-MM-dd');
          } else if (typeof dateVal === 'string') {
             const parts = dateVal.split(/[/|-]/);
             if (parts.length >= 3) {
               if (parts[0].length === 4) date = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0').substring(0, 2)}`;
               else date = `${parts[2].substring(0, 4)}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
             }
          }
          if (!date) continue;

          // B (index 1): ESP
          const esp = row[1]?.toString() || '';
          
          // C (index 2): Descrição
          const description = row[2]?.toString() || '';
          
          // D (index 3): Entrada
          const inflowVal = parseFloat(row[3]);
          const inflow = isNaN(inflowVal) ? 0 : inflowVal;
          
          // E (index 4): Saida
          const outflowVal = parseFloat(row[4]);
          const outflow = isNaN(outflowVal) ? 0 : outflowVal;

          if (inflow === 0 && outflow === 0 && !description) continue;

          newEntries.push({
            id: uuidv4(),
            date,
            esp,
            description,
            inflow,
            outflow
          });
        }
      }

      if (newEntries.length > 0) {
        await onImportEntries(newEntries);
        alert(`${newEntries.length} lançamentos do livro anterior importados com sucesso!`);
      } else {
        alert('Nenhum lançamento válido encontrado no arquivo.');
      }
    } catch (error) {
      console.error('Error importing excel:', error);
      alert('Erro ao importar o arquivo. Verifique se o formato está correto.');
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = read(arrayBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = utils.sheet_to_json<any[]>(worksheet, { header: 1 });
      
      const newEntries: CashBookEntry[] = [];
      // Skip header row (i = 1)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 8) continue;
        
        // E (index 4): Esp (1 -> RC, 4 -> TAB)
        const espVal = row[4];
        let esp = '';
        if (espVal == 1 || espVal === '1') esp = 'RC';
        else if (espVal == 4 || espVal === '4') esp = 'TAB';
        else esp = espVal?.toString() || '';
        
        // F (index 5): Date
        const dateVal = row[5];
        let date = '';
        if (typeof dateVal === 'number') {
           // Excel serial date to JS Date
           const jsDate = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
           // Add timezone offset to fix off-by-one errors with UTC dates
           jsDate.setMinutes(jsDate.getMinutes() + jsDate.getTimezoneOffset());
           date = format(jsDate, 'yyyy-MM-dd');
        } else if (typeof dateVal === 'string') {
           const parts = dateVal.split(/[/|-]/);
           if (parts.length >= 3) {
             if (parts[0].length === 4) date = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0').substring(0, 2)}`;
             else date = `${parts[2].substring(0, 4)}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
           }
        }
        if (!date) continue;

        // G (index 6): Descrição
        const description = row[6]?.toString() || '';
        
        // H (index 7): Valor (Receita)
        const amountVal = parseFloat(row[7]);
        if (isNaN(amountVal)) continue;

        newEntries.push({
          id: uuidv4(),
          date,
          esp,
          description,
          inflow: amountVal,
          outflow: 0
        });
      }

      if (newEntries.length > 0) {
        await onImportEntries(newEntries);
        alert(`${newEntries.length} lançamentos importados com sucesso!`);
      } else {
        alert('Nenhum lançamento válido encontrado no arquivo.');
      }
    } catch (error) {
      console.error('Error importing excel:', error);
      alert('Erro ao importar o arquivo. Verifique se o formato está correto.');
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  // Combine bills and entries
  const allRows = useMemo(() => {
    const rows = [];

    // Add paid bills that have addToCashBook = true
    const paidBills = bills.filter(b => b.isPaid && b.addToCashBook !== false);
    for (const bill of paidBills) {
      rows.push({
        id: bill.id,
        isBill: true,
        date: bill.dueDate, // using due date as payment date for simplicity
        esp: 'PGTO',
        description: bill.title,
        inflow: 0,
        outflow: bill.amount,
        originalBill: bill
      });
    }

    // Add manual entries
    for (const entry of entries) {
      rows.push({
        id: entry.id,
        isBill: false,
        date: entry.date,
        esp: entry.esp,
        description: entry.description,
        inflow: entry.inflow,
        outflow: entry.outflow,
        originalEntry: entry
      });
    }

    // Sort by date ascending
    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return rows;
  }, [bills, entries]);

  // Filter by current month FIRST
  const rawCurrentMonthRows = allRows.filter(row => isSameMonth(parseISO(row.date), currentDate));

  // Calculate cumulative balance only within the current month
  let runningBalance = 0;
  const currentMonthRows = rawCurrentMonthRows.map(row => {
    runningBalance += row.inflow - row.outflow;
    return { ...row, balance: runningBalance };
  });

  const startingBalance = 0; // "não vai carregar o saldo anterior para o proximo mês"

  const totalInflow = currentMonthRows.reduce((sum, r) => sum + r.inflow, 0);
  const totalOutflow = currentMonthRows.reduce((sum, r) => sum + r.outflow, 0);

  const receitaFunarpen = currentMonthRows
    .filter(r => r.esp === 'RC' && r.description.toUpperCase().includes('FUNARPEN'))
    .reduce((sum, r) => sum + r.inflow, 0);

  const receitaComExpressao = currentMonthRows
    .filter(r => {
      const desc = r.description.toUpperCase();
      // Baseado na sua fórmula do Excel: contém "N fls", não contém "ATA NOTARIAL...", e valor > 174.51
      return desc.includes('N FLS') && 
             !desc.includes('ATA NOTARIAL EXTERNA') && 
             !desc.includes('ATA NOTARIAL INTERNA') && 
             r.inflow > 174.51;
    })
    .reduce((sum, r) => sum + r.inflow, 0);

  const receitaSemExpressao = totalInflow - (receitaFunarpen + receitaComExpressao);

  const previousSealedMonthsInYear = sealedMonths.filter(m => m.year === currentYear && m.month < currentMonth);
  const autoStartPage = 1 + previousSealedMonthsInYear.reduce((acc, m) => acc + (m.pageCount || 0), 0);
  const lastSealedMonth = sealedMonths.reduce((latest, m) => {
     if (!latest) return m;
     if (m.year > latest.year || (m.year === latest.year && m.month > latest.month)) return m;
     return latest;
  }, null as any);
  const defaultBookNumber = lastSealedMonth?.bookNumber || '81';

  const [sealBookNumber, setSealBookNumber] = useState(defaultBookNumber);
  const [sealStartPage, setSealStartPage] = useState(autoStartPage.toString());

  // Update defaults when modal opens
  useEffect(() => {
    if (sealConfirmType === 'seal') {
      setSealBookNumber(defaultBookNumber);
      setSealStartPage(autoStartPage.toString());
    }
  }, [sealConfirmType, currentMonth, currentYear]);

  const confirmToggleSeal = async () => {
    if (!sealConfirmType) return;
    
    try {
      if (sealConfirmType === 'unseal') {
        await onToggleSealMonth(currentMonth, currentYear, false);
      } else {
        // Generate PDF first to get the page count
        const rcTotal = currentMonthRows.filter(r => r.esp === 'RC').reduce((sum, r) => sum + r.inflow, 0);
        const tabTotal = currentMonthRows.filter(r => r.esp === 'TAB').reduce((sum, r) => sum + r.inflow, 0);
        
        const { pageCount, blob } = generateCashBookPdf(currentMonth, currentYear, currentMonthRows, {
          inflow: totalInflow,
          outflow: totalOutflow,
          rc: rcTotal,
          tab: tabTotal,
          balance: totalInflow - totalOutflow
        }, sealBookNumber, parseInt(sealStartPage, 10));

        await onToggleSealMonth(currentMonth, currentYear, true, sealBookNumber, pageCount, blob);
      }
    } catch (err: any) {
      console.error("Erro ao lavrar/deslavrar:", err);
      alert("Houve um erro: " + err.message);
    } finally {
      setSealConfirmType(null);
    }
  };

  const handleToggleSeal = () => {
    setSealConfirmType(isCurrentMonthSealed ? 'unseal' : 'seal');
  };

  const handleReprintMonth = () => {
    const sealedMonthData = sealedMonths.find(m => m.month === currentMonth && m.year === currentYear);
    if (!sealedMonthData) return;
    
    if (sealedMonthData.pdfPath) {
      window.open(`/api/uploads/${sealedMonthData.pdfPath}`, '_blank');
      return;
    }

    const rcTotal = currentMonthRows.filter(r => r.esp === 'RC').reduce((sum, r) => sum + r.inflow, 0);
    const tabTotal = currentMonthRows.filter(r => r.esp === 'TAB').reduce((sum, r) => sum + r.inflow, 0);
    
    generateCashBookPdf(currentMonth, currentYear, currentMonthRows, {
      inflow: totalInflow,
      outflow: totalOutflow,
      rc: rcTotal,
      tab: tabTotal,
      balance: totalInflow - totalOutflow
    }, sealedMonthData.bookNumber || sealBookNumber, autoStartPage);
  };

  const handlePrintAnnualBook = () => {
    const yearRows = allRows.filter(row => getYear(parseISO(row.date)) === currentYear);
    const sortedYearRows = [...yearRows].sort((a, b) => a.date.localeCompare(b.date));
    
    import('../lib/pdfCashBook').then(({ generateAnnualCashBookPdf }) => {
      generateAnnualCashBookPdf(currentYear, sortedYearRows, sealBookNumber);
    });
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-white p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Livro Caixa</h2>
          <p className="text-slate-500">Controle de Receitas e Despesas</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrintAnnualBook}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <FileText className="w-5 h-5" />
            Imprimir Livro Anual
          </button>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            className="hidden" 
            ref={previousBookFileInputRef} 
            onChange={handlePreviousBookUpload} 
          />
          <button
            onClick={() => previousBookFileInputRef.current?.click()}
            disabled={isImporting || isCurrentMonthSealed}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm ${
              isCurrentMonthSealed
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : isImporting 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            {isImporting ? (
              <span className="w-5 h-5 border-2 border-amber-300 border-t-amber-500 rounded-full animate-spin"></span>
            ) : (
              <Upload className="w-5 h-5" />
            )}
            Importar Livro Anterior
          </button>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting || isCurrentMonthSealed}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm ${
              isCurrentMonthSealed
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : isImporting 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {isImporting ? (
              <span className="w-5 h-5 border-2 border-emerald-300 border-t-emerald-500 rounded-full animate-spin"></span>
            ) : (
              <Upload className="w-5 h-5" />
            )}
            Importar Lavraturas
          </button>
          <button
            onClick={onOpenDailyEntries}
            disabled={isCurrentMonthSealed}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-sm ${isCurrentMonthSealed ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
          >
            Lançamentos Diários
          </button>
          <button
            onClick={onAddEntry}
            disabled={isCurrentMonthSealed}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-sm ${isCurrentMonthSealed ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            <Plus className="w-5 h-5" />
            Lançar Item
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-4">
          <button onClick={previousMonth} className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-800 capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            {isCurrentMonthSealed && (
              <span className="flex items-center gap-1 text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                <Lock className="w-3 h-3" /> Lavrado
              </span>
            )}
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex gap-3 items-center">
          <button
            onClick={() => setIsSummaryModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors shadow-sm"
          >
            <BarChart2 className="w-4 h-4" /> Resumo Mensal
          </button>
          {isCurrentMonthSealed && (
            <button
              onClick={handleReprintMonth}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition-colors shadow-sm"
            >
              <FileText className="w-4 h-4" /> Reimprimir
            </button>
          )}
          <button
            onClick={handleToggleSeal}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm ${
              isCurrentMonthSealed
                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {isCurrentMonthSealed ? (
              <>
                <Unlock className="w-4 h-4" /> Deslavrar
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" /> Lavrar Mês (Gerar PDF)
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-600 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">DATA</th>
                <th className="px-4 py-3 font-semibold">ESP</th>
                <th className="px-4 py-3 font-semibold">DESCRIÇÃO</th>
                <th className="px-4 py-3 font-semibold text-right">ENTRADA</th>
                <th className="px-4 py-3 font-semibold text-right">SAÍDA</th>
                <th className="px-4 py-3 font-semibold text-right">SALDO</th>
                <th className="px-4 py-3 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentMonthRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Nenhum lançamento neste mês.
                  </td>
                </tr>
              ) : (
                currentMonthRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-600">
                      {format(parseISO(row.date), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.esp}</td>
                    <td className="px-4 py-3 text-slate-800">{row.description}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                      {row.inflow > 0 ? formatCurrency(row.inflow) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-rose-600 font-medium">
                      {row.outflow > 0 ? formatCurrency(row.outflow) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-800 font-bold">
                      {formatCurrency(row.balance)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {!row.isBill && (
                          <>
                            {isCurrentMonthSealed ? (
                              <span className="text-xs text-slate-400 italic">Bloqueado</span>
                            ) : (
                              <>
                                <button
                                  onClick={() => onEditEntry(row.originalEntry as CashBookEntry)}
                                  className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                  title="Editar"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => onDeleteEntry(row.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                        {row.isBill && (
                          <span className="text-xs text-slate-400 italic">Conta</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right text-slate-800">TOTAIS DO MÊS:</td>
                <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(totalInflow)}</td>
                <td className="px-4 py-3 text-right text-rose-600">{formatCurrency(totalOutflow)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        {currentMonthRows.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 p-6 flex flex-col md:flex-row justify-between items-end md:items-start gap-4">
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between w-64">
                <span>Entradas (RC):</span>
                <span className="font-medium">{formatCurrency(currentMonthRows.filter(r => r.esp === 'RC').reduce((sum, r) => sum + r.inflow, 0))}</span>
              </div>
              <div className="flex justify-between w-64">
                <span>Entradas (TAB):</span>
                <span className="font-medium">{formatCurrency(currentMonthRows.filter(r => r.esp === 'TAB').reduce((sum, r) => sum + r.inflow, 0))}</span>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between w-64 text-emerald-700">
                <span>Total de Entradas:</span>
                <span className="font-semibold">{formatCurrency(totalInflow)}</span>
              </div>
              <div className="flex justify-between w-64 text-rose-700">
                <span>Total de Saídas:</span>
                <span className="font-semibold">{formatCurrency(totalOutflow)}</span>
              </div>
              <div className="flex justify-between w-64 text-slate-900 border-t border-slate-200 pt-2 mt-2">
                <span className="font-semibold">Saldo do Mês:</span>
                <span className="font-bold text-base">{formatCurrency(totalInflow - totalOutflow)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {sealConfirmType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-2">
                {sealConfirmType === 'seal' ? 'Lavrar Mês' : 'Deslavrar Mês'}
              </h2>
              <p className="text-slate-600 text-sm mb-4">
                {sealConfirmType === 'seal' 
                  ? `Deseja realmente LAVRAR o mês de ${format(currentDate, 'MMMM/yyyy', { locale: ptBR })}? As contas não poderão mais ser alteradas.`
                  : `Deseja realmente DESLAVRAR o mês de ${format(currentDate, 'MMMM/yyyy', { locale: ptBR })}?`}
              </p>

              {sealConfirmType === 'seal' && (
                <div className="space-y-4 mt-4 border-t border-slate-100 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Livro Nº
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      value={sealBookNumber}
                      onChange={e => setSealBookNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Folha Inicial
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      value={sealStartPage}
                      onChange={e => setSealStartPage(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setSealConfirmType(null)}
                className="px-4 py-2 text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmToggleSeal}
                className={`px-4 py-2 text-white rounded-lg font-medium transition-colors shadow-sm ${
                  sealConfirmType === 'seal' 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {sealConfirmType === 'seal' ? 'Lavrar e Gerar PDF' : 'Deslavrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSummaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4 text-slate-800">
                Resumo de {format(currentDate, 'MMMM/yyyy', { locale: ptBR })}
              </h2>
              
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">1. Receita FUNARPEN</span>
                  <span className="font-semibold text-emerald-700">{formatCurrency(receitaFunarpen)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium text-left mr-2">2. Receita com Expressão Econômica</span>
                  <span className="font-semibold text-emerald-700">{formatCurrency(receitaComExpressao)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium text-left mr-2">3. Receita sem Expressão Econômica</span>
                  <span className="font-semibold text-emerald-700">{formatCurrency(receitaSemExpressao)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-800 font-bold">4. Total da Receita Mensal</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(totalInflow)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-800 font-bold">5. Total da Despesa</span>
                  <span className="font-bold text-rose-700">{formatCurrency(totalOutflow)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-900 font-bold text-base">6. Resultado (Receita - Despesa)</span>
                  <span className={`font-bold text-base ${totalInflow - totalOutflow >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                    {formatCurrency(totalInflow - totalOutflow)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setIsSummaryModalOpen(false)}
                className="px-6 py-2 text-white bg-slate-800 hover:bg-slate-900 rounded-lg font-medium transition-colors shadow-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
