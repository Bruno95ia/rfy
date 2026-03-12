'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { DealRow } from './revenue-engine';

interface RiskRankingTableProps {
  title: string;
  deals: DealRow[];
  pipelineTotal: number;
  valueAtRisk: number;
  valueAtRiskByStage: Record<string, number>;
  formatCurrency: (n: number) => string;
}

export function RiskRankingTable({
  title,
  deals,
  pipelineTotal,
  valueAtRisk,
  valueAtRiskByStage,
  formatCurrency,
}: RiskRankingTableProps) {
  const pctRisk = pipelineTotal > 0 ? (valueAtRisk / pipelineTotal) * 100 : 0;
  const top5 = [...deals]
    .map((d) => ({
      ...d,
      impactScore: (d.value ?? 0) * (d.days_without_activity ?? d.age_days ?? 0),
    }))
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 5);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <CardTitle className="text-lg font-semibold text-slate-900">{title}</CardTitle>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              % Pipeline em risco
            </p>
            <p className="mt-1 text-xl font-bold text-amber-600 tabular-nums">
              {pctRisk.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Valor em risco
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
              {formatCurrency(valueAtRisk)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Oportunidades em risco
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{deals.length}</p>
          </div>
        </div>
        {Object.keys(valueAtRiskByStage).length > 0 && (
          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Distribuição por etapa
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(valueAtRiskByStage).map(([stage, val]) => (
                <Badge key={stage} variant="warning" className="text-xs">
                  {stage}: {formatCurrency(val)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">
          Top 5 deals por Impact Score (valor × dias parado)
        </h4>
        {top5.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
            Nenhum deal em risco identificado
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Dias parado</TableHead>
                  <TableHead className="text-right">Impact Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top5.map((d, i) => {
                  const days = d.days_without_activity ?? d.age_days ?? 0;
                  const impact = (d.value ?? 0) * days;
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-slate-900">
                        {d.company_name ?? '-'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(d.value ?? 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="warning">{days} dias</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-amber-600">
                        {formatCurrency(impact)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
