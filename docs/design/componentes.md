# Componentes RFY

## Card
Quando usar:
- Agrupar contexto e metricas relacionadas.
- Delimitar secoes com leitura independente.

Boas praticas:
- Um card = um objetivo claro.
- Evitar duplicar a mesma metrica em cards diferentes.

## Button
Quando usar:
- Acao de usuario.

Variantes:
- `default`: acao primaria da tela.
- `secondary`: acao secundaria com destaque medio.
- `outline`: acao secundaria de baixo risco.
- `ghost`: acao contextual discreta.

## Badge
Quando usar:
- Status rapido, severidade ou categoria.

Variantes:
- `default`, `outline`, `primary`, `processing`, `success`, `warning`, `danger`.

## Table
Quando usar:
- Listas comparativas e priorizacao de oportunidades.

Boas praticas:
- Cabecalho com labels curtas e consistentes.
- Linhas com hover discreto e alta legibilidade.
- Numeros monetarios com alinhamento consistente.

## Dialog (Modal)
Quando usar:
- Confirmacao de acao relevante ou exibicao de erro detalhado.

Boas praticas:
- Titulo claro, descricao curta e CTA objetivo.
- Sempre oferecer fechamento explicito (botao ou icone).

## Label
Quando usar:
- Rotular campos de formulario em login, signup e configuracoes.

Boas praticas:
- Um label por campo.
- Texto curto e direto.

## Separator
Quando usar:
- Separar blocos de conteudo sem aumentar ruido visual.

## PageHeader
Quando usar:
- Topo de pagina com titulo/subtitulo/acoes.
- Breadcrumb quando houver profundidade de navegacao.

## SectionHeader
Quando usar:
- Titulo de secao interna com action slot opcional (ex.: \"expandir\", \"ver tudo\").

## Estrutura recomendada para dashboard
- Hero/KPI strip
- Mesa de decisao
- Alertas
- Blocos analiticos (intervencoes, comparativos, tabelas)
- Analises avancadas (colapsadas)
