'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { DealRow } from './revenue-engine';
import { cn } from '@/lib/cn';

function getInitials(nameOrEmail: string | null | undefined): string {
  if (!nameOrEmail) return '—';
  const str = String(nameOrEmail).trim();
  if (str.includes(' ')) {
    return str
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return str.slice(0, 2).toUpperCase();
}

function getPWin(days: number): number {
  if (days <= 6) return 0.8;
  if (days <= 13) return 0.6;
  if (days <= 20) return 0.4;
  return 0.2;
}

function getRiskBadgeVariant(days: number): 'success' | 'warning' | 'danger' {
  if (days <= 6) return 'success';
  if (days <= 13) return 'warning';
  return 'danger';
}

interface PremiumDataTableProps {
  deals: DealRow[];
  formatCurrency: (n: number) => string;
  emptyMessage?: string;
  maxRows?: number;
}

export function PremiumDataTable({
  deals,
  formatCurrency,
  emptyMessage = 'Nenhuma oportunidade para exibir',
  maxRows = 15,
}: PremiumDataTableProps) {
  const rows = deals.slice(0, maxRows);

  if (rows.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center shadow-[var(--shadow-sm)]">
        <p className="text-sm text-[var(--color-text-muted)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="h-14 hover:bg-[var(--color-surface-muted)]">
              <TableHead className="px-6 font-semibold text-[var(--color-text-muted)]">
                Empresa
              </TableHead>
              <TableHead className="px-6 text-right font-semibold text-[var(--color-text-muted)]">
                Valor
              </TableHead>
              <TableHead className="px-6 text-right font-semibold text-[var(--color-text-muted)]">
                Probabilidade de ganho
              </TableHead>
              <TableHead className="px-6 text-right font-semibold text-[var(--color-text-muted)]">
                Score de risco
              </TableHead>
              <TableHead className="px-6 font-semibold text-[var(--color-text-muted)]">
                Etapa
              </TableHead>
              <TableHead className="w-16 px-6" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((d, i) => {
              const days = d.days_without_activity ?? d.age_days ?? 0;
              const pWin = getPWin(days);
              const riskScore = (d.value ?? 0) * days;

              return (
                <TableRow
                  key={i}
                  className="h-16 last:border-b-0"
                >
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] text-xs font-medium text-[var(--color-text-muted)]">
                        {getInitials(
                          d.company_name ?? d.owner_name ?? d.owner_email
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--color-text)]">
                          {d.company_name ?? '—'}
                        </p>
                        <p className="max-w-[180px] truncate text-xs text-[var(--color-text-muted)]">
                          {d.owner_name ?? d.owner_email ?? '—'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right font-semibold tabular-nums text-[var(--color-text)]">
                    {formatCurrency(d.value ?? 0)}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <Badge
                      variant={getRiskBadgeVariant(days)}
                      className="tabular-nums font-medium"
                    >
                      {(pWin * 100).toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={cn(
                          'inline-block h-1.5 w-1.5 rounded-full',
                          days <= 6
                            ? 'bg-[var(--color-success)]'
                            : days <= 13
                              ? 'bg-[var(--color-warning)]'
                              : 'bg-[var(--color-danger)]'
                        )}
                      />
                      <span className="tabular-nums font-medium text-[var(--color-warning-foreground)]">
                        {formatCurrency(riskScore)}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge variant="default" className="font-normal">
                      {(d as { stage_name?: string }).stage_name ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <button
                      type="button"
                      className="text-sm font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-hover)]"
                      aria-label="Acessar oportunidade"
                    >
                      →
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
