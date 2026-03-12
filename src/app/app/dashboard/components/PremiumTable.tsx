'use client';

import type { DealRow } from './revenue-engine';
import { PremiumDataTable } from './PremiumDataTable';

interface PremiumTableProps {
  deals: DealRow[];
  formatCurrency: (n: number) => string;
  emptyMessage?: string;
  maxRows?: number;
}

/**
 * Compatibilidade: PremiumTable mantém API antiga e delega para PremiumDataTable.
 * PremiumDataTable é a versão principal e única para manter consistência visual.
 */
export function PremiumTable(props: PremiumTableProps) {
  return <PremiumDataTable {...props} />;
}
