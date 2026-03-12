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
import { AlertCircle } from 'lucide-react';

interface StageRow {
  etapa: string;
  tempoMedioDias: number | null;
  pctPipeline: number;
  valorEstimado: number;
  valorEmRisco: number;
}

interface BottleneckPanelProps {
  stages: StageRow[];
  formatCurrency: (n: number) => string;
}

export function BottleneckPanel({
  stages,
  formatCurrency,
}: BottleneckPanelProps) {
  if (stages.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <AlertCircle className="h-5 w-5 text-slate-600" />
            </div>
            <CardTitle className="text-lg font-semibold text-slate-900">
              Gargalo estrutural
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="rounded-lg border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
            Sem dados suficientes para identificar gargalo
          </div>
        </CardContent>
      </Card>
    );
  }

  const bottleneck = stages.reduce(
    (acc, s) => {
      const score =
        s.valorEmRisco * (1 + s.pctPipeline / 100) +
        (s.tempoMedioDias ?? 0) * s.pctPipeline;
      const accScore =
        (acc.valorEmRisco ?? 0) * (1 + (acc.pctPipeline ?? 0) / 100) +
        ((acc.tempoMedioDias ?? 0) * (acc.pctPipeline ?? 0));
      return score > accScore ? s : acc;
    },
    stages[0]!
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <AlertCircle className="h-5 w-5 text-indigo-600" />
          </div>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Gargalo estrutural
          </CardTitle>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Etapa com maior tempo médio e concentração de valor – priorize desbloqueio
        </p>
        {bottleneck && (
          <div className="mt-4 rounded-lg border-2 border-amber-200 bg-amber-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Gargalo dominante
            </p>
            <p className="mt-1 text-lg font-bold text-amber-800">{bottleneck.etapa}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
              <span>
                {bottleneck.pctPipeline.toFixed(1)}% do pipeline
              </span>
              {bottleneck.valorEmRisco > 0 && (
                <span>• {formatCurrency(bottleneck.valorEmRisco)} em risco</span>
              )}
              {bottleneck.tempoMedioDias != null && bottleneck.tempoMedioDias > 0 && (
                <span>• ~{bottleneck.tempoMedioDias} dias médios</span>
              )}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Etapa</TableHead>
                <TableHead className="text-right">Tempo médio</TableHead>
                <TableHead className="text-right">% do pipeline</TableHead>
                <TableHead className="text-right">Valor estimado</TableHead>
                <TableHead className="text-right">Valor em risco</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.map((s) => (
                <TableRow
                  key={s.etapa}
                  className={bottleneck && s.etapa === bottleneck.etapa ? 'bg-amber-50/50' : ''}
                >
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      {s.etapa}
                      {bottleneck && s.etapa === bottleneck.etapa && (
                        <Badge variant="warning">Gargalo</Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.tempoMedioDias != null && s.tempoMedioDias > 0
                      ? `~${s.tempoMedioDias} dias`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.pctPipeline.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(s.valorEstimado)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.valorEmRisco > 0 ? (
                      <span className="text-amber-600 font-medium">
                        {formatCurrency(s.valorEmRisco)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
