import React from 'react';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday, parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { Bill } from '../types';
import { FileCheck, FileMinus } from 'lucide-react';

interface CalendarProps {
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  bills: Bill[];
}

export function Calendar({ currentDate, selectedDate, onSelectDate, bills }: CalendarProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden border border-slate-200 h-full">
      {/* Day Headers */}
      {weekDays.map(day => (
        <div key={day} className="bg-slate-50 p-2 text-center text-[10px] font-bold text-slate-400 uppercase">
          {day}
        </div>
      ))}

      {/* Calendar Days */}
      {days.map((day, i) => {
        const dayBills = bills.filter(b => b.dueDate === format(day, 'yyyy-MM-dd'));
        const hasPdf = dayBills.some(b => !!b.pdfData);
        const allPaid = dayBills.length > 0 && dayBills.every(b => b.isPaid);

        return (
          <div
            key={day.toString()}
            onClick={() => onSelectDate(day)}
            className={cn(
              "p-3 h-full min-h-[96px] cursor-pointer transition-colors relative overflow-hidden",
              !isSameMonth(day, monthStart) ? "bg-slate-50 border-b border-r border-slate-100" : "bg-white border-b border-r border-slate-100",
              isSameDay(day, selectedDate) && "bg-blue-50 border-2 border-blue-500 ring-inset z-10",
            )}
          >
            <span className={cn(
              "text-sm",
              isSameDay(day, selectedDate) ? "text-blue-700 font-bold" : "text-slate-800",
              !isSameMonth(day, monthStart) && "text-slate-400 font-medium"
            )}>
              {format(day, dateFormat)}
            </span>

            <div className="mt-1 space-y-1">
              {dayBills.slice(0, 3).map(bill => (
                <div 
                  key={bill.id} 
                  className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded border truncate flex items-center justify-between",
                    bill.isPaid 
                      ? "bg-slate-50 text-slate-500 border-slate-200 line-through" 
                      : (bill.pdfData ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-red-50 text-red-700 border-red-100 font-bold")
                  )}
                >
                  <span className="truncate pr-1">{bill.title}</span>
                </div>
              ))}
              {dayBills.length > 3 && (
                <div className="text-[9px] bg-slate-800 text-white px-1.5 py-0.5 rounded font-bold w-max">
                  +{dayBills.length - 3} item{dayBills.length - 3 !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
