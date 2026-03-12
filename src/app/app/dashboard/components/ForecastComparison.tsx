'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

const CHART_COLORS = {
  bruto: '#94a3b8',
  ajustado: '#4f46e5',
};

interface ForecastComparisonProps {
  pipelineBruto: number;
  forecastAjustado: number;
  formatCurrency: (n: number) => string;
  aiPowered?: boolean;
  diferençaPercentual?: number;
}

export function ForecastComparison({
  pipelineBruto,
  forecastAjustado,
  formatCurrency,
  aiPowered = false,
  diferençaPercentual,
}: ForecastComparisonProps) {
  const diff = pipelineBruto - forecastAjustado;
  const diffPct = diferençaPercentual ?? (pipelineBruto > 0 ? (diff / pipelineBruto) * 100 : 0);

  const chartData = [
    { name: 'Receita declarada', value: pipelineBruto },
    { name: 'Receita Confiável (30d)', value: forecastAjustado },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100">
            <TrendingUp className="h-5 w-5 text-teal-600" />
          </div>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Receita Declarada vs Receita Confiável
          </CardTitle>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {aiPowered
            ? 'Comparação entre receita declarada no CRM e receita confiável (previsão com base em dados)'
            : 'Comparação entre pipeline declarado e receita confiável por probabilidade de fechamento'}
        </p>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Diferença
            </p>
            <p
              className={`mt-1 text-xl font-bold tabular-nums ${
                diff >= 0 ? 'text-amber-600' : 'text-teal-600'
              }`}
            >
              {formatCurrency(diff)} ({diffPct >= 0 ? '-' : '+'}
              {Math.abs(diffPct).toFixed(1)}%)
            </p>
          </div>
          <p className="text-right text-sm text-slate-600">
            {diff >= 0
              ? 'Receita confiável é menor que a declarada (receita inflada)'
              : 'Receita confiável acima do declarado'}
          </p>
        </div>
        <div className="h-[200px] rounded-lg border border-slate-100 bg-white p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#64748b', fontSize: 12 }}
                width={95}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 16px',
                }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.name === 'Receita declarada' ? CHART_COLORS.bruto : CHART_COLORS.ajustado}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex gap-6 text-xs">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-slate-400" />
            Receita declarada
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-indigo-500" />
            Receita Confiável (30d)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
