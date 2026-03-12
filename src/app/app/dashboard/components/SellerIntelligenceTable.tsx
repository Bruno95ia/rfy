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
import { Users } from 'lucide-react';

interface SellerRow {
  vendedor: string;
  dealsCriticos: number;
  valorEmRisco: number;
  tempoMedioDias: number | null;
  scoreHigiene: number;
  rank: number;
}

interface SellerIntelligenceTableProps {
  title: string;
  rows: SellerRow[];
  formatCurrency: (n: number) => string;
}

function getInitials(name: string): string {
  if (!name || name === 'Sem dono') return '—';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function SellerIntelligenceTable({
  title,
  rows,
  formatCurrency,
}: SellerIntelligenceTableProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <CardTitle className="text-lg font-semibold text-slate-900">{title}</CardTitle>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Priorize intervenção com vendedores que concentram valor em risco
        </p>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
            Nenhum dado de vendedor disponível
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Oportunidades críticas</TableHead>
                  <TableHead className="text-right">Valor em risco</TableHead>
                  <TableHead className="text-right">Tempo médio</TableHead>
                  <TableHead className="text-right">Score de higiene</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.vendedor}>
                    <TableCell className="font-semibold text-slate-400">
                      {r.rank}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                          {getInitials(r.vendedor)}
                        </span>
                        <span className="font-medium text-slate-900">{r.vendedor}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={r.dealsCriticos > 5 ? 'danger' : 'warning'}>
                        {r.dealsCriticos}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-amber-600">
                      {formatCurrency(r.valorEmRisco)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-600">
                      {r.tempoMedioDias != null && r.tempoMedioDias > 0
                        ? `~${Math.round(r.tempoMedioDias)} dias`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <div className="h-2 w-16 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{
                              width: `${Math.min(100, Math.max(0, r.scoreHigiene))}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600 tabular-nums">
                          {Math.round(r.scoreHigiene)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
