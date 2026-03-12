'use client';

import { useState, useMemo, ReactNode } from 'react';
import { Search, ChevronUp, ChevronDown, FileX2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/cn';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  render?: (item: T) => ReactNode;
  sortKey?: (item: T) => string | number;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  searchKeys?: (keyof T)[];
  searchPlaceholder?: string;
  filterChips?: { key: string; label: string; value: string }[];
  activeFilter?: string;
  onFilterChange?: (key: string) => void;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  pageSize?: number;
  maxHeight?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  searchKeys = [],
  searchPlaceholder = 'Buscar...',
  filterChips = [],
  activeFilter,
  onFilterChange,
  emptyMessage = 'Nenhum registro encontrado',
  emptyIcon,
  pageSize = 10,
  maxHeight,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: string; asc: boolean } | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let result = [...data];

    if (search.trim() && searchKeys.length > 0) {
      const q = search.toLowerCase().trim();
      result = result.filter((item) =>
        searchKeys.some((k) => {
          const v = item[k];
          return typeof v === 'string' && v.toLowerCase().includes(q);
        })
      );
    }

    const sortCol = columns.find((c) => c.key === sort?.key);
    if (sort && sortCol?.sortable && sortCol.sortKey) {
      result.sort((a, b) => {
        const va = sortCol.sortKey!(a);
        const vb = sortCol.sortKey!(b);
        const cmp =
          typeof va === 'string'
            ? va.localeCompare(vb as string)
            : (va as number) - (vb as number);
        return sort.asc ? cmp : -cmp;
      });
    }

    return result;
  }, [data, search, searchKeys, sort, columns]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize]
  );

  const toggleSort = (key: string) => {
    const col = columns.find((c) => c.key === key);
    if (!col?.sortable || !col.sortKey) return;
    setSort((s) =>
      s?.key === key ? { key, asc: !s.asc } : { key, asc: true }
    );
  };

  const isEmpty = filtered.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {(searchKeys.length > 0 || filterChips.length > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {searchKeys.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <Input
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  className="pl-9"
                />
              </div>
            )}
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => onFilterChange?.(chip.key)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
                  activeFilter === chip.key
                    ? 'border-[var(--color-primary-soft)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]'
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className={cn(
          'overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]',
          maxHeight && 'max-h-[400px]'
        )}
        style={maxHeight ? { maxHeight } : undefined}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {emptyIcon ?? (
              <FileX2 className="h-12 w-12 text-[var(--color-text-muted)]/60" aria-hidden />
            )}
            <p className="mt-4 text-sm font-medium text-[var(--color-text-muted)]">
              {emptyMessage}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.sortable &&
                        'cursor-pointer select-none hover:text-[var(--color-text)]'
                    )}
                    onClick={() => col.sortable && toggleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable && sort?.key === col.key && (
                        sort.asc ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )
                      )}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((item, i) => (
                <TableRow key={(item.id as string) ?? i}>
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center'
                      )}
                    >
                      {col.render
                        ? col.render(item)
                        : String(item[col.key as keyof T] ?? '-')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {!isEmpty && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)]">
          <span>
            Página {page + 1} de {totalPages} ({filtered.length} registros)
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 transition hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 transition hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
