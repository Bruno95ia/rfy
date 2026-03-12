# Benchmark Intelligence Agent — Recomendações

Documento de referência para melhorar a **clusterização** e a **comparação entre empresas do mesmo segmento e porte** em vendas B2B. Inclui métricas comparativas, percentis e formas de visualizar diferenças estruturais de performance.

---

## 1. Métricas comparativas sugeridas

### Já existentes no sistema
- `cycle_median` — Ciclo de venda (dias)
- `win_rate` — Taxa de vitória
- `proposal_stagnation_rate` — Estagnação em proposta
- `abandoned_rate` — Pipeline abandonado
- `pipeline_value_open` — Valor em pipeline aberto

### Métricas adicionais recomendadas (B2B)

| Métrica | Descrição | Uso no benchmark | Direção “melhor” |
|--------|-----------|-------------------|-------------------|
| **ticket_median** | Ticket médio por deal | Comparar porte de negócio no cluster | Contexto (não “melhor/ pior”) |
| **deals_per_seller** | Oportunidades ativas / vendedor | Produtividade vs pares | Maior |
| **avg_stage_duration** | Tempo médio por etapa (dias) | Onde o ciclo “trava” vs cluster | Menor (em etapas críticas) |
| **conversion_by_stage** | % avanço entre etapas consecutivas | Funil vs cluster | Maior |
| **time_to_proposal** | Dias da abertura até primeira proposta | Velocidade de qualificação | Menor |
| **pipeline_cover_ratio** | Pipeline aberto / meta (ou média ganha) | Saúde do pipeline vs pares | Dentro de banda (nem alto nem baixo) |
| **loss_reason_concentration** | Entropia/ diversidade de motivos de perda | Se perde sempre pelo mesmo motivo vs cluster | Menor concentração = mais diagnóstico |
| **forecast_accuracy** | Erro do forecast vs realizado (quando houver) | Previsibilidade vs cluster | Menor erro |

**Prioridade de implementação (curto prazo):**
1. `deals_per_seller` — fácil de derivar de `sellers_count` e contagem de deals.
2. `time_to_proposal` — exige datas de etapa “proposta” e “criação”.
3. `conversion_by_stage` — exige estágios consistentes no CRM.

---

## 2. Percentis e bandas

### Estado atual
- **P25, mediana, P75** por métrica por cluster.
- **Percentil contínuo** apenas para `cycle_median` (`percentile_cycle` 0–100).
- Classificação **below / at / above** (vs P25/P75) para todas as métricas.

### Expansões recomendadas

#### 2.1 Percentis numéricos por métrica
Para cada métrica no `diffs`, expor além de P25/P75:
- **P10 e P90** — para ver “cauda” do cluster e outliers suaves.
- **Percentil contínuo (0–100)** — como já existe para ciclo, para **todas** as métricas (ex.: `percentile_win_rate`, `percentile_stagnation`), permitindo ranking fino (“você está melhor que 73% do cluster em win rate”).

#### 2.2 Bandas de desempenho (quartis)
- **Quartil 1 (Q1):** abaixo de P25 — “Abaixo do cluster”.
- **Quartil 2 (Q2):** entre P25 e P50 — “Abaixo da mediana”.
- **Quartil 3 (Q3):** entre P50 e P75 — “Acima da mediana”.
- **Quartil 4 (Q4):** acima de P75 — “Acima do cluster”.

Retornar `quartile` (1–4) por métrica além de `percentile` (below/at/above), para rótulos e cores consistentes na UI.

#### 2.3 Score composto de benchmark (opcional)
- Índice 0–100 agregando posição em várias métricas (ex.: média dos percentis, ou média ponderada por importância).
- Peso por métrica configurável (ex.: ciclo e win rate com peso maior).
- Sempre com k-anonymity: só exibir se n_orgs ≥ 5.

---

## 3. Clusterização

### Melhorar definição de “mesmo segmento e porte”
- **Segmento:** usar `segment` (ou equivalente) quando existir; senão inferir por setor/ indústria se disponível.
- **Porte:** além de `ticket_median` e `sellers_count`, considerar:
  - **revenue_band** (faixa de receita) quando disponível.
  - **Faixas de ciclo** (ex.: ciclo curto &lt; 30d, médio 30–90d, longo &gt; 90d) como feature de cluster.
- **Features de clustering atuais:** `ticket_median`, `cycle_median`, `sellers_count`, `revenue_band_encoded`, `segment_encoded`. Manter e, quando houver dados, preencher `revenue_band` e `segment` reais em vez de 0.

### Tamanho e estabilidade do cluster
- **Mínimo por cluster:** manter k-anonymity (ex.: 5 orgs). Não exibir benchmark se cluster &lt; 5.
- **Descrição do cluster (anonimizada):** ex.: “B2B, ticket R$ 50k–200k, 2–5 vendedores, ciclo 30–60 dias” para o usuário entender com quem está sendo comparado.

---

## 4. Visualizações para diferenças estruturais

### 4.1 Barras de distribuição (já existente — evoluir)
- Manter barra P25 → P75 com marcador “Você”.
- **Melhoria:** usar **percentil contínuo** (0–100) para posicionar o marcador em vez de apenas 25/50/75.
- Mostrar **valor absoluto** (ex.: “45 dias”) + **% vs mediana** + **“Melhor que X% do cluster”**.

### 4.2 Radar (spider chart)
- Eixos: 5–6 métricas principais (ciclo, win rate, estagnação, pipeline, etc.).
- Valores **normalizados** (ex.: percentil 0–100 por métrica, ou Z-score no cluster).
- **Sua org** vs **mediana do cluster** (duas formas sobrepostas).
- Deixa claro padrão “estrutural”: ex.: “bom em ciclo, fraco em estagnação”.

### 4.3 Heatmap “Você vs cluster”
- Linhas: métricas.
- Colunas: “Sua org”, “P25”, “Mediana”, “P75”.
- Células coloridas por quartil (verde = Q4, amarelo = Q2–Q3, vermelho = Q1) ou por % vs mediana.
- Útil para visão executiva rápida.

### 4.4 Tabela de quartis por métrica
- Para cada métrica: valor da org, P25, P50, P75, **quartil** (1–4), **percentil** (0–100).
- Ordenação por “gap vs mediana” ou por “pior quartil” para priorizar melhorias.

### 4.5 Card “Posição no cluster”
- Resumo: “Você está no **top 25%** em ciclo e win rate, e no **bottom 25%** em estagnação em proposta.”
- Lista de 2–3 **forças** e 2–3 **oportunidades** (métricas onde está abaixo da mediana), com link para detalhe.

### 4.6 Distribuição “onde você está” (histograma anonimizado)
- Por métrica: histograma da distribuição do cluster (bins anonimizados, sem valores individuais).
- Marcação da posição da org (ex.: seta ou linha) em “sua posição”.
- Reforça que a comparação é com pares e mantém privacidade.

### 4.7 Comparativo “Top vs Bottom do cluster”
- Para cada métrica, texto: “No seu cluster, o **top 25%** tem mediana de X; o **bottom 25%** tem Y. Você está em Z.”
- Ajuda a traduzir percentil em metas concretas (ex.: “subir win rate para nível do top 25%”).

---

## 5. Resumo de ações sugeridas

| Área | Ação |
|------|------|
| **Métricas** | Adicionar `deals_per_seller`, `time_to_proposal`, depois `conversion_by_stage` e `pipeline_cover_ratio`. |
| **Percentis** | Expor P10/P90; percentil contínuo (0–100) para todas as métricas; quartil (1–4) por métrica. |
| **API** | Estender `diffs[metric]` com `percentile_rank` (0–100), `quartile` (1–4), opcionalmente `p10`/`p90`. |
| **Cluster** | Preencher `segment` e `revenue_band` quando existir; descrever cluster de forma anônima na UI. |
| **UI** | Radar chart; heatmap Você vs P25/P50/P75; card “Top 25% / Bottom 25%”; frase “Melhor que X% do cluster” por métrica. |

Este documento serve como referência para o **Benchmark Intelligence Agent** e para evolução do módulo de benchmark no RFY (ai-service + frontend).
