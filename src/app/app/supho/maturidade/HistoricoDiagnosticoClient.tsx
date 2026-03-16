'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

type HistoryRow = {
  id: string;
  campaign_id: string;
  campaign_name: string | null;
  computed_at: string;
  ic: number;
  ih: number;
  ip: number;
  itsmo: number;
  nivel: number;
  sample_size: number;
};

export function HistoricoDiagnosticoClient() {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/supho/diagnostic/history')
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  if (loading || history.length === 0) return null;

  const chartData = history.map((h) => ({
    data: new Date(h.computed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }),
    IC: h.ic,
    IH: h.ih,
    IP: h.ip,
    ITSMO: h.itsmo,
  }));

  return (
    <Card className="border-[var(--color-border)]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-[var(--color-primary)]" />
          Histórico de diagnósticos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="data" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="IC" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="IH" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="IP" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="ITSMO" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
