# Executive Dashboard Architecture — Revenue Engine

## Missão

Garantir que o **Revenue Engine** seja **orientado à decisão**, não apenas visualização de dados. Cada elemento do dashboard deve responder: *O que devo fazer agora? Com que impacto financeiro?*

---

## Princípios de UX para SaaS B2B

### 1. Pilares da decisão (ordem de prioridade)

| Prioridade | Bloco | Pergunta que responde | Impacto financeiro |
|------------|--------|------------------------|---------------------|
| 1 | **Forecast ajustado** | Quanto podemos esperar fechar (realista)? | Valor único que orienta meta e alocação |
| 2 | **Receita em risco** | Quanto estamos prestes a perder se não agirmos? | Valor em R$ a proteger/recuperar |
| 3 | **Intervenções prioritárias** | Em quais deals agir primeiro? | Valor por ação, ordenado por impacto |
| 4 | **Comparação com benchmark** | Estamos acima ou abaixo do mercado? | Gap % vs mediana (ciclo, win rate, estagnação) |

Qualquer outro bloco é **suporte** ou **detalhe**: só aparece se reforçar uma dessas decisões ou for solicitado.

### 2. Redução de ruído visual

- **Uma faixa de resumo executivo** no topo: Forecast | Em risco | Próxima ação | Benchmark (uma linha).
- **Máximo 4 KPIs** no painel principal; forecast sempre em destaque (tamanho/contraste).
- **Gráficos e tabelas secundárias** (cruzamentos, saúde do pipeline, oportunidades por etapa) em seção **colapsável** ou "Análise detalhada".
- Evitar múltiplos cards com a mesma informação (ex.: forecast no painel e de novo no gráfico sem decisão nova).

### 3. Destaque de impacto financeiro

- Todo KPI crítico deve ter **valor em moeda** quando fizer sentido (forecast, receita em risco, receita antecipável).
- Intervenções: **valor do deal + impacto (valor × dias)** e/ou "Se agir: +R$ X estimado".
- Benchmark: além de %, indicar **interpretação** ("Abaixo da mediana → oportunidade de ganho").
- Evitar números sem contexto (ex.: "82% confiança" sem dizer o que fazer com isso).

### 4. Anti-padrões a evitar

- Dashboard que exige scroll longo antes de ver "o que fazer".
- Muitos gráficos decorativos sem ação associada.
- Métricas iguais repetidas em vários lugares.
- Jargão técnico (P(win), cluster_median) sem tradução para decisão ("Expectativa realista de fechamento").

---

## Checklist de implementação

- [x] **Resumo executivo** no topo: forecast, receita em risco, primeira intervenção, uma linha de benchmark (`ExecutiveDecisionStrip`).
- [x] **Ordem do painel**: Forecast → Receita em risco → Receita antecipável → Revenue Health Score.
- [x] **Benchmark** logo após o painel (comparativo obrigatório antes de detalhes).
- [x] **Intervenções prioritárias** em seguida, com valor e impacto financeiro por card.
- [x] **Forecast vs pipeline** (comparação) como detalhe do forecast, logo após intervenções.
- [x] **Cruzamentos, saúde do pipeline, oportunidades por etapa** em seção colapsável "Análise detalhada".
- [x] **Texto de ajuda**: subtítulos orientados à decisão (ex.: "Valor a proteger com ação imediata").
- [x] **Sem duplicação**: forecast em destaque no painel; comparação bruto vs ajustado em um único bloco.

---

## Estrutura recomendada do layout

```
1. Meta (atualização, período) + alerta IA se indisponível
2. Faixa de decisão (resumo em uma linha: Forecast | Risco | Ação #1 | Benchmark)
3. Executive Panel (4 cards: Forecast, Risco, Antecipável, Health)
4. Posicionamento no Mercado (benchmark)
5. Intervenções prioritárias
6. Comparação Forecast (bruto vs ajustado) + detalhe
7. AI Intelligence / Gargalo (se relevante para ação)
8. Unit Economics & ICP
9. Deal Intelligence (tabela de deals em risco)
10. [Colapsável] Análise detalhada: Cruzamentos, Saúde pipeline, Oportunidades por etapa, Vendedor
```

---

## Referência

- Alinhado a: Revenue Engine orientado à decisão; prioridade em forecast ajustado, receita em risco, intervenções e benchmark.
- Documentos relacionados: `AI-REVENUE-ENGINE-STRATEGIC.md`, `AI-BENCHMARK-SETUP.md`.
