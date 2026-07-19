import React, { useState } from 'react';
import { CashBookEntry } from '../types';
import { X } from 'lucide-react';
import { format } from 'date-fns';

interface CashBookEntryFormProps {
  entry?: CashBookEntry | null;
  onSave: (entry: CashBookEntry) => Promise<void>;
  onClose: () => void;
}

export function CashBookEntryForm({ entry, onSave, onClose }: CashBookEntryFormProps) {
  const [date, setDate] = useState(entry?.date || format(new Date(), 'yyyy-MM-dd'));
  const [esp, setEsp] = useState(entry?.esp || 'RC');
  const [description, setDescription] = useState(entry?.description || '');
  const [type, setType] = useState<'inflow' | 'outflow'>(
    entry ? (entry.outflow > 0 ? 'outflow' : 'inflow') : 'inflow'
  );
  const [amount, setAmount] = useState(
    entry ? (entry.inflow > 0 ? entry.inflow.toString() : entry.outflow.toString()) : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || isNaN(parseFloat(amount))) return;

    setIsSubmitting(true);
    try {
      const parsedAmount = parseFloat(amount);
      const newEntry: CashBookEntry = {
        id: entry?.id || crypto.randomUUID(),
        date,
        esp: type === 'inflow' ? esp : '',
        description,
        inflow: type === 'inflow' ? parsedAmount : 0,
        outflow: type === 'outflow' ? parsedAmount : 0,
      };

      await onSave(newEntry);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">
            {entry ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
              <input
                type="date"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            {type === 'inflow' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Especialidade</label>
                <select
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={esp}
                  onChange={e => setEsp(e.target.value)}
                >
                  <option value="RC">Registro Civil (RC)</option>
                  <option value="TAB">Tabelionato de Notas (TAB)</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <input
              type="text"
              required
              placeholder="Descrição do lançamento"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <div className="flex rounded-lg overflow-hidden border border-slate-300">
                <button
                  type="button"
                  onClick={() => setType('inflow')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    type === 'inflow' ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Entrada (Receita)
                </button>
                <div className="w-px bg-slate-300"></div>
                <button
                  type="button"
                  onClick={() => setType('outflow')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    type === 'outflow' ? 'bg-rose-100 text-rose-800' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Saída (Despesa)
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500 font-medium">R$</span>
                </div>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="0,00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
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
              disabled={isSubmitting}
              className="px-6 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
