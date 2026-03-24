import { Loader2 } from 'lucide-react';

export default function ConhecimentoLoading() {
  return (
    <div className="flex items-center justify-center py-24" aria-busy="true" aria-label="Carregando">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-muted)]" aria-hidden />
    </div>
  );
}
