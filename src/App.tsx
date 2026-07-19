import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { Bill, CashBookEntry, SealedMonth } from './types';
import { format, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from './components/Calendar';
import { BillList } from './components/BillList';
import { BillForm } from './components/BillForm';
import { SearchView } from './components/SearchView';
import { RecurringView } from './components/RecurringView';
import { ReportsView } from './components/ReportsView';
import { CashBookView } from './components/CashBookView';
import { CashBookDashboardView } from './components/CashBookDashboardView';
import { CashBookEntryForm } from './components/CashBookEntryForm';
import { DailyEntriesForm } from './components/DailyEntriesForm';
import { ImportBillsForm } from './components/ImportBillsForm';
import { generateDailyPdf } from './lib/pdf';
import { Plus, ChevronLeft, ChevronRight, Wallet, Calendar as CalendarIcon, RefreshCw, BarChart2, Search, BookOpen, PieChart } from 'lucide-react';

type ViewState = 'calendar' | 'search' | 'recurring' | 'reports' | 'cashbook' | 'cashbook_dashboard';

export default function App() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [cashBookEntries, setCashBookEntries] = useState<CashBookEntry[]>([]);
  const [sealedMonths, setSealedMonths] = useState<SealedMonth[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCashBookFormOpen, setIsCashBookFormOpen] = useState(false);
  const [isDailyEntriesFormOpen, setIsDailyEntriesFormOpen] = useState(false);
  const [isImportBillsFormOpen, setIsImportBillsFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editingCashBookEntry, setEditingCashBookEntry] = useState<CashBookEntry | null>(null);
  const [billToDelete, setBillToDelete] = useState<Bill | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [pdfMessage, setPdfMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('calendar');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [loadedBills, loadedEntries, loadedSealedMonths] = await Promise.all([
        db.getBills(),
        db.getCashBookEntries(),
        db.getSealedMonths()
      ]);
      setBills(loadedBills);
      setCashBookEntries(loadedEntries);
      setSealedMonths(loadedSealedMonths);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBill = async (bill: Bill) => {
    try {
      if (editingBill) {
        await db.updateBill(bill);
      } else {
        await db.addBill(bill);
        
        // Handle recurring bill (create for the next 11 months as a simple implementation)
        if (bill.recurrence === 'monthly') {
          const futureBills = [];
          let nextDate = new Date(bill.dueDate + 'T12:00:00');
          
          for (let i = 1; i <= 11; i++) {
            nextDate = addMonths(nextDate, 1);
            futureBills.push({
              ...bill,
              amount: bill.isMutableAmount ? 0 : bill.amount,
              id: uuidv4(),
              dueDate: format(nextDate, 'yyyy-MM-dd'),
              isPaid: false,
              parentId: bill.id,
              pdfPassword: bill.pdfPassword,
              pdfData: undefined,
              pdfName: undefined,
              invoicePdfData: undefined,
              invoicePdfName: undefined
            });
          }
          
          for (const futureBill of futureBills) {
            await db.addBill(futureBill);
          }
        }
      }
      
      await loadData();
      setIsFormOpen(false);
      setEditingBill(null);
    } catch (error: any) {
      console.error('Failed to save bill:', error);
      alert('Erro ao salvar conta: ' + error.message);
    }
  };

  const handleTogglePaid = async (bill: Bill) => {
    await db.updateBill({ ...bill, isPaid: !bill.isPaid });
    await loadData();
  };

  const confirmDelete = async (mode: 'single' | 'future' | 'all') => {
    if (!billToDelete) return;
    
    if (mode === 'all' && (billToDelete.parentId || billToDelete.recurrence === 'monthly')) {
      const relatedId = billToDelete.parentId || billToDelete.id;
      const billsToDelete = bills.filter(b => b.id === relatedId || b.parentId === relatedId);
      for (const b of billsToDelete) {
        await db.deleteBill(b.id);
      }
    } else if (mode === 'future' && (billToDelete.parentId || billToDelete.recurrence === 'monthly')) {
      const relatedId = billToDelete.parentId || billToDelete.id;
      const billsToDelete = bills.filter(b => (b.id === relatedId || b.parentId === relatedId) && b.dueDate >= billToDelete.dueDate);
      for (const b of billsToDelete) {
        await db.deleteBill(b.id);
      }
    } else {
      await db.deleteBill(billToDelete.id);
    }
    
    setBillToDelete(null);
    await loadData();
  };

  const handleSaveCashBookEntry = async (entry: CashBookEntry) => {
    const entryDate = new Date(entry.date);
    const entryMonth = entryDate.getMonth() + 1;
    const entryYear = entryDate.getFullYear();
    
    if (sealedMonths.some(m => m.month === entryMonth && m.year === entryYear)) {
      alert(`O mês de ${format(entryDate, 'MMMM/yyyy', { locale: ptBR })} está lavrado e não pode receber novos lançamentos.`);
      return;
    }

    if (editingCashBookEntry) {
      await db.updateCashBookEntry(entry);
    } else {
      await db.addCashBookEntry(entry);
    }
    await loadData();
    setIsCashBookFormOpen(false);
    setEditingCashBookEntry(null);
  };

  const handleSaveMultipleCashBookEntries = async (entries: CashBookEntry[]) => {
    // Check for sealed months
    const invalidEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return sealedMonths.some(m => m.month === (entryDate.getMonth() + 1) && m.year === entryDate.getFullYear());
    });
    
    if (invalidEntries.length > 0) {
      alert('Alguns lançamentos pertencem a meses lavrados e não podem ser salvos.');
      return;
    }

    await db.addCashBookEntries(entries);
    await loadData();
    setIsDailyEntriesFormOpen(false);
  };

  const handleImportBillsToCashBook = async (entries: CashBookEntry[], updatedBills: Bill[]) => {
    // 1. Save new entries
    await db.addCashBookEntries(entries);
    
    // 2. Update bills
    for (const bill of updatedBills) {
      await db.updateBill(bill);
    }

    await loadData();
    setIsImportBillsFormOpen(false);
    alert(`${entries.length} contas foram importadas para o livro caixa com sucesso!`);
  };

  const handleDeleteCashBookEntry = async (id: string) => {
    setEntryToDelete(id);
  };

  const confirmDeleteEntry = async () => {
    if (entryToDelete) {
      await db.deleteCashBookEntry(entryToDelete);
      await loadData();
      setEntryToDelete(null);
    }
  };

  const handleGeneratePdf = async () => {
    const dayBills = bills.filter(b => b.dueDate === format(selectedDate, 'yyyy-MM-dd'));
    if (dayBills.length === 0) return;
    
    const success = await generateDailyPdf(dayBills, format(selectedDate, 'yyyy-MM-dd'));
    if (!success) {
      setPdfMessage('Nenhum PDF (Boleto ou Nota) válido encontrado para as contas deste dia.');
      setTimeout(() => setPdfMessage(''), 4000);
    }
  };

  const handleToggleSealMonth = async (month: number, year: number, isSealing: boolean, bookNumber?: string, pageCount?: number, pdfBlob?: Blob) => {
    if (isSealing) {
      await db.sealMonth(month, year, bookNumber, pageCount, pdfBlob);
    } else {
      await db.unsealMonth(month, year);
    }
    await loadData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const currentMonthBills = bills.filter(b => isSameMonth(new Date(b.dueDate + 'T12:00:00'), currentDate));
  const totalMonthAmount = currentMonthBills.reduce((acc, bill) => acc + bill.amount, 0);
  const paidMonthAmount = currentMonthBills.filter(b => b.isPaid).reduce((acc, bill) => acc + bill.amount, 0);
  const percentagePaid = totalMonthAmount > 0 ? (paidMonthAmount / totalMonthAmount) * 100 : 0;
  
  const todayPendingCount = bills.filter(b => b.dueDate === format(new Date(), 'yyyy-MM-dd') && !b.isPaid).length;

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">BoletoHub</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setCurrentView('calendar')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-colors ${currentView === 'calendar' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <CalendarIcon className="w-5 h-5" />
            Calendário
          </button>
          <button 
            onClick={() => setCurrentView('search')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors font-medium ${currentView === 'search' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Search className="w-5 h-5" />
            Pesquisa
          </button>
          <button 
            onClick={() => setCurrentView('recurring')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors font-medium ${currentView === 'recurring' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <RefreshCw className="w-5 h-5" />
            Recorrentes
          </button>
          <button 
            onClick={() => setCurrentView('reports')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors font-medium ${currentView === 'reports' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <BarChart2 className="w-5 h-5" />
            Relatórios
          </button>
          <button 
            onClick={() => setCurrentView('cashbook')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors font-medium ${currentView === 'cashbook' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <BookOpen className="w-5 h-5" />
            Livro Caixa
          </button>
          <button 
            onClick={() => setCurrentView('cashbook_dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors font-medium ${currentView === 'cashbook_dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <PieChart className="w-5 h-5" />
            Dashboard Caixa
          </button>
        </nav>

        <div className="p-6 m-4 bg-slate-800 rounded-xl">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Total do Mês</p>
          <p className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalMonthAmount)}</p>
          <div className="mt-4 w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${percentagePaid}%` }}></div>
          </div>
          <p className="text-[10px] mt-2 text-slate-400">{Math.round(percentagePaid)}% das contas liquidadas</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {pdfMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-800 px-4 py-2 rounded-lg border border-amber-200 shadow-sm z-20 font-medium text-sm">
            {pdfMessage}
          </div>
        )}
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            {currentView === 'calendar' && (
              <div className="flex gap-1 items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  className="p-1.5 rounded hover:bg-white text-slate-500 hover:text-slate-800 transition-colors hover:shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded hover:bg-white transition-colors hover:shadow-sm uppercase tracking-wider"
                >
                  Hoje
                </button>
                <button 
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  className="p-1.5 rounded hover:bg-white text-slate-500 hover:text-slate-800 transition-colors hover:shadow-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-800 capitalize italic leading-none">
                {currentView === 'calendar' ? format(currentDate, 'MMMM yyyy', { locale: ptBR }) : 
                 currentView === 'search' ? 'Pesquisar Contas' :
                 currentView === 'recurring' ? 'Contas Recorrentes' :
                 currentView === 'cashbook' ? 'Livro Caixa' :
                 currentView === 'cashbook_dashboard' ? 'Dashboard Livro Caixa' :
                 'Relatórios Financeiros'}
              </h1>
              {currentView === 'calendar' && (
                <p className="text-sm text-slate-500 mt-1">
                  Você tem {todayPendingCount} {todayPendingCount === 1 ? 'conta' : 'contas'} para pagar hoje
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-4">
            {(currentView !== 'cashbook' && currentView !== 'cashbook_dashboard') && (
              <button 
                onClick={() => { setEditingBill(null); setIsFormOpen(true); }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-700 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Nova Conta
              </button>
            )}
          </div>
        </header>

        {/* Views Grid */}
        <div className="flex-1 flex overflow-hidden">
          {currentView === 'calendar' ? (
            <div className="flex-1 grid grid-cols-12 overflow-hidden">
              <section className="col-span-8 p-6 bg-white border-r border-slate-200 overflow-hidden flex flex-col">
                <Calendar 
                  currentDate={currentDate}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  bills={bills}
                />
              </section>

              <aside className="col-span-4 flex flex-col bg-slate-50 overflow-hidden">
                <BillList 
                  date={selectedDate}
                  bills={bills}
                  onTogglePaid={handleTogglePaid}
                  onDelete={setBillToDelete}
                  onEdit={(bill) => {
                    setEditingBill(bill);
                    setIsFormOpen(true);
                  }}
                  onGeneratePdf={handleGeneratePdf}
                />
              </aside>
            </div>
          ) : currentView === 'search' ? (
            <SearchView 
              bills={bills}
              onTogglePaid={handleTogglePaid}
              onDelete={setBillToDelete}
              onEdit={(bill) => {
                setEditingBill(bill);
                setIsFormOpen(true);
              }}
            />
          ) : currentView === 'recurring' ? (
            <RecurringView 
              bills={bills}
              onTogglePaid={handleTogglePaid}
              onDelete={setBillToDelete}
              onEdit={(bill) => {
                setEditingBill(bill);
                setIsFormOpen(true);
              }}
            />
          ) : currentView === 'cashbook' ? (
            <CashBookView 
              bills={bills}
              entries={cashBookEntries}
              sealedMonths={sealedMonths}
              onToggleSealMonth={handleToggleSealMonth}
              onAddEntry={() => { setEditingCashBookEntry(null); setIsCashBookFormOpen(true); }}
              onEditEntry={(entry) => { setEditingCashBookEntry(entry); setIsCashBookFormOpen(true); }}
              onDeleteEntry={handleDeleteCashBookEntry}
              onImportEntries={async (entries) => {
                await db.addCashBookEntries(entries);
                await loadData();
              }}
              onOpenDailyEntries={() => setIsDailyEntriesFormOpen(true)}
              onOpenImportBills={() => setIsImportBillsFormOpen(true)}
            />
          ) : currentView === 'cashbook_dashboard' ? (
            <CashBookDashboardView entries={cashBookEntries} />
          ) : (
            <ReportsView bills={bills} />
          )}
        </div>
      </main>

      {isFormOpen && (
        <BillForm 
          initialDate={selectedDate}
          initialBill={editingBill || undefined}
          onSave={handleSaveBill}
          onCancel={() => { setIsFormOpen(false); setEditingBill(null); }}
        />
      )}

      {isCashBookFormOpen && (
        <CashBookEntryForm 
          entry={editingCashBookEntry}
          onSave={handleSaveCashBookEntry}
          onClose={() => { setIsCashBookFormOpen(false); setEditingCashBookEntry(null); }}
        />
      )}

      {isDailyEntriesFormOpen && (
        <DailyEntriesForm 
          onSave={handleSaveMultipleCashBookEntries}
          onClose={() => setIsDailyEntriesFormOpen(false)}
        />
      )}

      {isImportBillsFormOpen && (
        <ImportBillsForm 
          bills={bills}
          onImport={handleImportBillsToCashBook}
          onClose={() => setIsImportBillsFormOpen(false)}
        />
      )}

      {entryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-2">Excluir Lançamento</h2>
              <p className="text-slate-600 text-sm mb-4">
                Tem certeza que deseja excluir este lançamento do livro caixa?
              </p>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setEntryToDelete(null)}
                className="px-4 py-2 text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteEntry}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors shadow-sm"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {billToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-2">Excluir Conta</h2>
              <p className="text-slate-600 text-sm mb-4">
                Tem certeza que deseja excluir a conta <strong>{billToDelete.title}</strong>?
              </p>
              
              {(billToDelete.recurrence === 'monthly' || billToDelete.parentId) && (
                <div className="mb-4 bg-amber-50 border border-amber-100 p-3 rounded-lg text-sm text-amber-800">
                  <p className="font-semibold mb-2">Esta é uma conta recorrente.</p>
                  <div className="space-y-2">
                    <button 
                      onClick={() => confirmDelete('single')}
                      className="w-full text-left px-3 py-2 bg-white border border-amber-200 rounded hover:bg-amber-100 transition-colors"
                    >
                      Somente o item selecionado
                    </button>
                    <button 
                      onClick={() => confirmDelete('future')}
                      className="w-full text-left px-3 py-2 bg-white border border-amber-200 rounded hover:bg-amber-100 transition-colors"
                    >
                      Desta data em diante
                    </button>
                    <button 
                      onClick={() => confirmDelete('all')}
                      className="w-full text-left px-3 py-2 bg-white border border-amber-200 rounded hover:bg-amber-100 transition-colors"
                    >
                      Apagar todos os registros (lote completo)
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setBillToDelete(null)}
                className="px-4 py-2 text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              {!(billToDelete.recurrence === 'monthly' || billToDelete.parentId) && (
                <button 
                  onClick={() => confirmDelete('single')}
                  className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors shadow-sm"
                >
                  Excluir
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
