import React from 'react';
import { Bill } from '../types';
import { TableView } from './TableView';

interface RecurringViewProps {
  bills: Bill[];
  onTogglePaid: (bill: Bill) => void;
  onEdit: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
}

export function RecurringView({ bills, onTogglePaid, onEdit, onDelete }: RecurringViewProps) {
  // Only show the "root" recurring bills to avoid cluttering with all future instances
  // or show all recurring bills if that's preferred. We'll show the root ones (parentId is falsy).
  const recurringBills = bills.filter(b => b.recurrence !== 'none' && !b.parentId);

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50">
      <TableView 
        title="Contas Recorrentes (Ativas)"
        bills={recurringBills}
        emptyMessage="Você não tem nenhuma conta configurada com recorrência mensal ou anual."
        onTogglePaid={onTogglePaid}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}
