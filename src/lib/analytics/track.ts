/**
 * Cliente de tracking de uso (telas) para funil de ativação e retenção.
 * Chamadas são fire-and-forget; falhas não afetam a UX.
 */

export type TrackScreen =
  | 'dashboard'
  | 'uploads'
  | 'supho_diagnostico'
  | 'supho_maturidade'
  | 'supho_paip'
  | 'settings'
  | 'settings_contexto_organizacao'
  | 'settings_context_pack'
  | 'settings_conhecimento';

export function trackScreen(screen: TrackScreen): void {
  if (typeof window === 'undefined') return;
  fetch('/api/usage/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ screen }),
    credentials: 'include',
  }).catch(() => {
    // ignorar falhas de tracking
  });
}
