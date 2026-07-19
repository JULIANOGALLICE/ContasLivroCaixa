import React, { useMemo, useState } from 'react';
import { CashBookEntry } from '../types';
import { format, parseISO, getYear, getMonth, isSameYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '../lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';

interface Props {
  entries: CashBookEntry[];
}

export function CashBookDashboardView({ entries }: Props) {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const availableYears = useMemo(() => {
    const years = new Set(entries.map(e => getYear(parseISO(e.date))));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [entries]);

  const yearEntries = useMemo(() => {
    return entries.filter(e => getYear(parseISO(e.date)) === selectedYear);
  }, [entries, selectedYear]);

  // Statistics
  const { totalInflow, totalOutflow, totalRc, totalTab } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    let rc = 0;
    let tab = 0;

    yearEntries.forEach(entry => {
      inflow += entry.inflow;
      outflow += entry.outflow;
      if (entry.esp === 'RC') rc += entry.inflow;
      if (entry.esp === 'TAB') tab += entry.inflow;
    });

    return { totalInflow: inflow, totalOutflow: outflow, totalRc: rc, totalTab: tab };
  }, [yearEntries]);

  const balance = totalInflow - totalOutflow;

  // Monthly Data for Bar Chart & Line Chart
  const monthlyData = useMemo(() => {
    const data = Array.from({ length: 12 }, (_, i) => ({
      name: format(new Date(selectedYear, i, 1), 'MMM', { locale: ptBR }),
      Entradas: 0,
      Saídas: 0,
      Saldo: 0,
      RC: 0,
      TAB: 0
    }));

    yearEntries.forEach(entry => {
      const monthIndex = getMonth(parseISO(entry.date));
      data[monthIndex].Entradas += entry.inflow;
      data[monthIndex].Saídas += entry.outflow;
      data[monthIndex].Saldo += entry.inflow - entry.outflow;
      if (entry.esp === 'RC') data[monthIndex].RC += entry.inflow;
      if (entry.esp === 'TAB') data[monthIndex].TAB += entry.inflow;
    });

    return data;
  }, [yearEntries, selectedYear]);

  const pieData = [
    { name: 'Reg. Civil (RC)', value: totalRc },
    { name: 'Tabelionato (TAB)', value: totalTab },
    { name: 'Outros', value: totalInflow - (totalRc + totalTab) }
  ].filter(item => item.value > 0);

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-md rounded-lg text-sm">
          <p className="font-semibold text-slate-800 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-medium">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50 p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard do Livro Caixa</h2>
          <p className="text-slate-500">Visão geral e estatísticas financeiras</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
          <div className="pl-3 pr-2 py-2 text-slate-500">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-transparent border-none focus:ring-0 text-slate-700 font-medium cursor-pointer py-2 pr-4 outline-none"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <p className="text-slate-500 font-medium">Entradas Totais</p>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{formatCurrency(totalInflow)}</h3>
          <p className="text-sm text-slate-400 mt-2">Ano {selectedYear}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <p className="text-slate-500 font-medium">Saídas Totais</p>
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{formatCurrency(totalOutflow)}</h3>
          <p className="text-sm text-slate-400 mt-2">Ano {selectedYear}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <p className="text-slate-500 font-medium">Saldo Anual</p>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${balance >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
              <DollarSign className={`w-5 h-5 ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
            </div>
          </div>
          <h3 className={`text-3xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {formatCurrency(balance)}
          </h3>
          <p className="text-sm text-slate-400 mt-2">Ano {selectedYear}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <p className="text-slate-500 font-medium">Margem Operacional</p>
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-slate-800">
            {totalInflow > 0 ? Math.round((balance / totalInflow) * 100) : 0}%
          </h3>
          <p className="text-sm text-slate-400 mt-2">Saldo / Entradas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Entradas vs Saídas Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Receitas vs Despesas (Mensal)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(val) => `R$ ${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend iconType="circle" />
                <Bar dataKey="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Saídas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição de Receitas Pie Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Composição de Receitas</h3>
          {totalInflow > 0 ? (
            <div className="h-80 w-full flex flex-col">
              <ResponsiveContainer width="100%" height="70%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 flex flex-col justify-center gap-3 px-4">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-slate-600 font-medium">{entry.name}</span>
                    </div>
                    <span className="font-semibold text-slate-800">
                      {Math.round((entry.value / totalInflow) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-80 w-full flex items-center justify-center">
              <p className="text-slate-400">Sem dados para exibir</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Saldo Cumulativo Line Chart */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Evolução do Saldo</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(val) => `R$ ${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend iconType="circle" />
              <Line type="monotone" dataKey="Saldo" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
