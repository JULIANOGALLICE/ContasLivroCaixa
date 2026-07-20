import React, { useState, useEffect } from 'react';
import { CashBookEntry, FixedItem } from '../types';
import { db } from '../db';
import { X, Settings, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

interface DailyEntriesFormProps {
  onSave: (entries: CashBookEntry[]) => Promise<void>;
  onClose: () => void;
}

export function DailyEntriesForm({ onSave, onClose }: DailyEntriesFormProps) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [fixedItems, setFixedItems] = useState<FixedItem[]>([]);
  const [quantities, setQuantities] = useState<{ [id: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);

  useEffect(() => {
    loadFixedItems();
  }, []);

  const loadFixedItems = async () => {
    const items = await db.getFixedItems();
    setFixedItems(items);
  };

  const handleQuantityChange = (id: string, value: string) => {
    setQuantities(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newEntries: CashBookEntry[] = [];

      for (const item of fixedItems) {
        const qtyStr = quantities[item.id];
        if (qtyStr) {
          const qty = parseInt(qtyStr, 10);
          if (qty > 0) {
            const amount = qty * item.unitPrice;
            newEntries.push({
              id: uuidv4(),
              date,
              esp: item.esp,
              description: `${item.name} (Qtd: ${qty})`,
              inflow: amount,
              outflow: 0
            });
          }
        }
      }

      if (newEntries.length > 0) {
        await onSave(newEntries);
      } else {
        alert('Informe a quantidade de pelo menos um item.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveItems = async (updatedItems: FixedItem[]) => {
    await db.saveFixedItems(updatedItems);
    setFixedItems(updatedItems);
    setIsConfigMode(false);
  };

  if (isConfigMode) {
    return <FixedItemsManager items={fixedItems} onSave={handleSaveItems} onClose={() => setIsConfigMode(false)} />;
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Lançamentos Diários</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsConfigMode(true)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors"
              title="Configurar Itens Fixos"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
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

          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">Quantidades</h3>
            {fixedItems.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum item configurado.</p>
            ) : (
              fixedItems.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      R$ {item.unitPrice.toFixed(2).replace('.', ',')} cada • ESP: {item.esp}
                    </p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={quantities[item.id] || ''}
                    onChange={e => handleQuantityChange(item.id, e.target.value)}
                  />
                </div>
              ))
            )}
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
              disabled={isSubmitting || fixedItems.length === 0}
              className="px-6 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Lançar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FixedItemsManager({ items, onSave, onClose }: { items: FixedItem[], onSave: (items: FixedItem[]) => void, onClose: () => void }) {
  const [currentItems, setCurrentItems] = useState<FixedItem[]>([...items]);

  const handleAddItem = () => {
    setCurrentItems([...currentItems, { id: uuidv4(), name: '', unitPrice: 0, esp: 'RC' }]);
  };

  const handleUpdateItem = (id: string, field: keyof FixedItem, value: any) => {
    setCurrentItems(currentItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleRemoveItem = (id: string) => {
    setCurrentItems(currentItems.filter(item => item.id !== id));
  };

  const handleSave = () => {
    // Filter out items with empty names or 0 price
    const validItems = currentItems.filter(i => i.name.trim() !== '');
    onSave(validItems);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Configurar Itens Fixos</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-12 gap-2 mb-2 text-xs font-semibold text-slate-500 uppercase">
            <div className="col-span-6">Nome / Descrição</div>
            <div className="col-span-2">Valor (R$)</div>
            <div className="col-span-3">Especialidade</div>
            <div className="col-span-1 text-center">Remover</div>
          </div>
          
          {currentItems.map(item => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">
                <input
                  type="text"
                  placeholder="Nome do Item"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={item.name}
                  onChange={e => handleUpdateItem(item.id, 'name', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={item.unitPrice || ''}
                  onChange={e => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="col-span-3">
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={item.esp}
                  onChange={e => handleUpdateItem(item.id, 'esp', e.target.value)}
                >
                  <option value="RC">Registro Civil (RC)</option>
                  <option value="TAB">Tabelionato (TAB)</option>
                </select>
              </div>
              <div className="col-span-1 flex justify-center">
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={handleAddItem}
            className="flex items-center gap-2 mt-4 text-blue-600 font-medium hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Adicionar Item
          </button>
        </div>

        <div className="p-6 flex justify-end gap-3 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Salvar Itens
          </button>
        </div>
      </div>
    </div>
  );
}
