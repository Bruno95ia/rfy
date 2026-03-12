# Design Tokens RFY

## Colors (semantic)
- `--color-background`: fundo da aplicacao
- `--color-surface`: superficie principal (cards, modais)
- `--color-surface-muted`: superficie secundaria
- `--color-text`: texto principal
- `--color-text-muted`: texto de apoio
- `--color-border`: borda padrao
- `--color-border-strong`: borda destacada
- `--color-primary`: acao primaria
- `--color-primary-hover`: hover de acao primaria
- `--color-primary-soft`: fundo suave de destaque primario
- `--color-success` / `--color-success-soft` / `--color-success-foreground`
- `--color-warning` / `--color-warning-soft` / `--color-warning-foreground`
- `--color-danger` / `--color-danger-soft` / `--color-danger-foreground`
- `--color-overlay`: sobreposicao de modais/dialog

## Typography
- Font family: `--font-sans` (Geist Sans)
- Mono/tabular: `--font-mono` + `tabular-nums` para metricas
- Scale recomendada:
  - Hero metric: `text-5xl` ate `text-6xl`
  - KPI metric: `text-xl` a `text-2xl`
  - Section title: `text-xl` a `text-2xl`
  - Label: `text-[10px]` a `text-xs`, uppercase tracking

## Spacing
- `--space-1` 4px
- `--space-2` 8px
- `--space-3` 12px
- `--space-4` 16px
- `--space-5` 20px
- `--space-6` 24px

## Radius
- `--radius-sm` 8px
- `--radius-md` 12px
- `--radius-lg` 16px

## Shadows
- `--shadow-sm`: componentes base
- `--shadow-md`: componentes elevados
- `--shadow-lg`: hero/containers de destaque
- `--shadow-xl`: overlays especiais

## Tailwind theme mapping
Tokens sao expostos via `@theme inline` em `src/app/globals.css` para uso com classes semanticas e/ou variaveis CSS em componentes.
