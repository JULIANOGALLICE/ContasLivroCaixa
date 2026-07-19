import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Bill, RecurrenceType } from '../types';
import { processPdfForUpload } from '../lib/pdf';
import { X, Upload, FileText, Receipt, CheckCircle, Lock } from 'lucide-react';
import { format } from 'date-fns';

interface BillFormProps {
  initialDate?: Date;
  initialBill?: Bill;
  onSave: (bill: Bill) => void;
  onCancel: () => void;
}

export function BillForm({ initialDate, initialBill, onSave, onCancel }: BillFormProps) {
  const [title, setTitle] = useState(initialBill?.title || '');
  const [amount, setAmount] = useState(initialBill?.amount.toString() || '');
  const [dueDate, setDueDate] = useState(initialBill?.dueDate || (initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')));
  const [recurrence, setRecurrence] = useState<RecurrenceType>(initialBill?.recurrence || 'none');
  const [isMutableAmount, setIsMutableAmount] = useState<boolean>(initialBill?.isMutableAmount || false);
  const [addToCashBook, setAddToCashBook] = useState<boolean>(initialBill?.addToCashBook ?? true);
  const [savedPdfPassword, setSavedPdfPassword] = useState<string>(initialBill?.pdfPassword || '');
  
  const [existingPdf, setExistingPdf] = useState<{name?: string, data?: string}>({ name: initialBill?.pdfName, data: initialBill?.pdfData });
  const [existingInvoice, setExistingInvoice] = useState<{name?: string, data?: string}>({ name: initialBill?.invoicePdfName, data: initialBill?.invoicePdfData });
  const [existingReceipt, setExistingReceipt] = useState<{name?: string, data?: string}>({ name: initialBill?.receiptPdfName, data: initialBill?.receiptPdfData });

  const [passwordPrompt, setPasswordPrompt] = useState<{ isOpen: boolean, fileType: 'boleto' | 'invoice' | 'receipt', file: File | null, error?: string, canForceAttach?: boolean, originalData?: string }>({ isOpen: false, fileType: 'boleto', file: null });
  const [pdfPassword, setPdfPassword] = useState('');
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement> | null, fileType: 'boleto' | 'invoice' | 'receipt', password?: string) => {
    const file = e?.target?.files?.[0] || passwordPrompt.file;
    if (!file) return;

    const effectivePassword = password || (fileType === 'boleto' ? savedPdfPassword : undefined);

    setIsProcessingPdf(true);
    const result = await processPdfForUpload(file, effectivePassword);
    setIsProcessingPdf(false);
    
    if (result.requiresPassword) {
      setPasswordPrompt({ isOpen: true, fileType, file, error: result.error, canForceAttach: result.canForceAttach, originalData: result.originalData });
      return;
    }
    
    // If successful and we used a password for boleto, save it
    if (fileType === 'boleto' && effectivePassword) {
      setSavedPdfPassword(effectivePassword);
    }
    
    setPasswordPrompt({ isOpen: false, fileType: 'boleto', file: null });
    setPdfPassword('');

    if (result.error) {
      alert(result.error);
      return;
    }

    if (fileType === 'boleto') {
      setExistingPdf({ name: result.name, data: result.data });
    } else if (fileType === 'invoice') {
      setExistingInvoice({ name: result.name, data: result.data });
    } else if (fileType === 'receipt') {
      setExistingReceipt({ name: result.name, data: result.data });
    }
    
    if (e && e.target) e.target.value = '';
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFileSelect(null, passwordPrompt.fileType, pdfPassword);
  };

  const handleForceAttach = () => {
    if (!passwordPrompt.file || !passwordPrompt.originalData) return;
    
    const { fileType, file, originalData } = passwordPrompt;
    
    if (fileType === 'boleto') {
      setExistingPdf({ name: file.name, data: originalData });
    } else if (fileType === 'invoice') {
      setExistingInvoice({ name: file.name, data: originalData });
    } else if (fileType === 'receipt') {
      setExistingReceipt({ name: file.name, data: originalData });
    }
    
    setPasswordPrompt({ isOpen: false, fileType: 'boleto', file: null });
    setPdfPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !dueDate) return;

    const bill: Bill = {
      id: initialBill?.id || uuidv4(),
      title,
      amount: parseFloat(amount),
      dueDate,
      recurrence,
      isMutableAmount,
      addToCashBook,
      pdfPassword: savedPdfPassword,
      isPaid: initialBill?.isPaid || false,
      parentId: initialBill?.parentId,
      pdfData: existingPdf.data,
      pdfName: existingPdf.name,
      invoicePdfData: existingInvoice.data,
      invoicePdfName: existingInvoice.name,
      receiptPdfData: existingReceipt.data,
      receiptPdfName: existingReceipt.name
    };

    onSave(bill);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">Nova Conta</h2>
          <button onClick={onCancel} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
            <input 
              required
              type="text" 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder="Ex: Conta de Luz"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
              <input 
                required
                type="number" 
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="0,00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vencimento</label>
              <input 
                required
                type="date" 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Recorrência</label>
            <select 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              value={recurrence}
              onChange={e => {
                setRecurrence(e.target.value as RecurrenceType);
                if (e.target.value !== 'monthly') {
                  setIsMutableAmount(false);
                }
              }}
            >
              <option value="none">Avulsa (Única vez)</option>
              <option value="monthly">Mensal</option>
            </select>
          </div>

          {recurrence === 'monthly' && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex items-center h-5">
                <input
                  id="mutableAmount"
                  type="checkbox"
                  checked={isMutableAmount}
                  onChange={e => setIsMutableAmount(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="mutableAmount" className="text-sm font-medium text-slate-800 cursor-pointer">
                  Valor Variável / Mutável
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  Se marcado, este valor ({amount ? `R$ ${amount}` : 'atual'}) será usado apenas no 1º vencimento. Os próximos meses serão criados com valor pendente (R$ 0,00) para preenchimento futuro.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center h-5">
              <input
                id="addToCashBook"
                type="checkbox"
                checked={addToCashBook}
                onChange={e => setAddToCashBook(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="addToCashBook" className="text-sm font-medium text-slate-800 cursor-pointer">
                Incluir no Livro Caixa
              </label>
              <p className="text-xs text-slate-500 mt-1">
                Marque esta opção se esta conta deve constar no Livro de Receitas e Despesas futuramente.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Boleto (PDF)</label>
              <div className="mt-1 flex justify-center px-4 pt-4 pb-4 border-2 border-slate-200 border-dashed rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="space-y-1 text-center">
                  {existingPdf.name ? (
                    <div className="flex flex-col items-center">
                      <FileText className="mx-auto h-8 w-8 text-blue-500" />
                      <p className="text-xs text-slate-900 font-medium mt-2 truncate w-full max-w-[100px]">{existingPdf.name}</p>
                      <button type="button" onClick={() => setExistingPdf({})} className="text-[10px] text-red-500 mt-1 hover:underline">
                        Remover
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-8 w-8 text-slate-400" />
                      <div className="flex text-xs text-slate-600 justify-center mt-2">
                        <label className="relative cursor-pointer bg-transparent rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                          <span>{isProcessingPdf ? 'Aguarde...' : 'Selecionar'}</span>
                          <input type="file" accept="application/pdf" className="sr-only" onChange={e => handleFileSelect(e, 'boleto')} disabled={isProcessingPdf} />
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nota Fiscal</label>
              <div className="mt-1 flex justify-center px-4 pt-4 pb-4 border-2 border-slate-200 border-dashed rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="space-y-1 text-center">
                  {existingInvoice.name ? (
                    <div className="flex flex-col items-center">
                      <Receipt className="mx-auto h-8 w-8 text-emerald-500" />
                      <p className="text-xs text-slate-900 font-medium mt-2 truncate w-full max-w-[100px]">{existingInvoice.name}</p>
                      <button type="button" onClick={() => setExistingInvoice({})} className="text-[10px] text-red-500 mt-1 hover:underline">
                        Remover
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-8 w-8 text-slate-400" />
                      <div className="flex text-xs text-slate-600 justify-center mt-2">
                        <label className="relative cursor-pointer bg-transparent rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                          <span>{isProcessingPdf ? 'Aguarde...' : 'Selecionar'}</span>
                          <input type="file" accept="application/pdf" className="sr-only" onChange={e => handleFileSelect(e, 'invoice')} disabled={isProcessingPdf} />
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Comprovante</label>
              <div className="mt-1 flex justify-center px-4 pt-4 pb-4 border-2 border-slate-200 border-dashed rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="space-y-1 text-center">
                  {existingReceipt.name ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle className="mx-auto h-8 w-8 text-indigo-500" />
                      <p className="text-xs text-slate-900 font-medium mt-2 truncate w-full max-w-[100px]">{existingReceipt.name}</p>
                      <button type="button" onClick={() => setExistingReceipt({})} className="text-[10px] text-red-500 mt-1 hover:underline">
                        Remover
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-8 w-8 text-slate-400" />
                      <div className="flex text-xs text-slate-600 justify-center mt-2">
                        <label className="relative cursor-pointer bg-transparent rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                          <span>{isProcessingPdf ? 'Aguarde...' : 'Selecionar'}</span>
                          <input type="file" accept="application/pdf" className="sr-only" onChange={e => handleFileSelect(e, 'receipt')} disabled={isProcessingPdf} />
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t shrink-0">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors shadow-sm">
              Salvar Conta
            </button>
          </div>
        </form>

        {passwordPrompt.isOpen && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex items-center justify-center p-4">
            <form onSubmit={handlePasswordSubmit} className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 w-full max-w-sm">
              <div className="flex items-center gap-3 mb-4 text-slate-800">
                <Lock className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-lg">PDF Protegido</h3>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                O arquivo <strong>{passwordPrompt.file?.name}</strong> está protegido por senha.
                Para que o sistema possa gerar os lotes futuramente, insira a senha para remover a proteção (o arquivo será salvo sem senha no sistema).
              </p>
              
              {passwordPrompt.error && (
                <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                  {passwordPrompt.error}
                </div>
              )}

              <input
                type="password"
                required
                autoFocus
                placeholder="Senha do PDF"
                value={pdfPassword}
                onChange={e => setPdfPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors mb-4"
              />

              <div className="flex flex-col gap-2">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordPrompt({ isOpen: false, fileType: 'boleto', file: null });
                      setPdfPassword('');
                    }}
                    className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingPdf}
                    className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors text-sm disabled:opacity-50"
                  >
                    {isProcessingPdf ? 'Desbloqueando...' : 'Desbloquear PDF'}
                  </button>
                </div>
                {passwordPrompt.canForceAttach && (
                  <button
                    type="button"
                    onClick={handleForceAttach}
                    className="w-full mt-2 px-4 py-2 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg font-medium transition-colors text-sm text-center"
                  >
                    Anexar arquivo original com senha (não entrará no lote)
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
