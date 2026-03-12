# Segmentação do dashboard RFY por perfil

Documento de análise e especificação da segmentação do dashboard conforme o perfil do usuário (CEO/Diretoria primeiro), mantendo um único layout base com ajustes de ordem, ênfase e narrativa.

---

## 1. Mapeamento do dashboard atual

### 1.1 Fontes

- **Página servidor:** [src/app/app/dashboard/page.tsx](src/app/app/dashboard/page.tsx) — carrega `orgId`, `report` (snapshot, frictions, pillar_scores), `suphoResult`, `unitEconomics`, `icpCached`; renderiza `PageHeader` e `DashboardClient`.
- **Cliente:** [src/app/app/dashboard/DashboardClient.tsx](src/app/app/dashboard/DashboardClient.tsx) — orquestra estado, métricas (RFY Index, Receita Confiável/Inflada, alertas, intervenções) e todas as seções visuais.

### 1.2 Seções na ordem atual (top → bottom)

| Ordem | Bloco | Componente / Área | Descrição breve |
|-------|--------|-------------------|------------------|
| 0 | Aviso AI | Card condicional | Mensagem quando IA indisponível ou erro de conexão. |
| 1 | TopNav | DashboardTopNav | Links âncora: Visão geral, Decisões, Alertas, Avançado. |
| 2 | Hero | DashboardHero | RFY Index %, variação %, última atualização, SUPHO (ITSMO + nível + foco), benchmark, seletor de período, próxima decisão em destaque. |
| 3 | KPIs | DashboardKpiGrid | 4 cards: Receita Confiável (30d), Receita Inflada, Evolução RFY, Alertas ativos. |
| 4 | Decisões + Alertas | DashboardDecisionsSection + DashboardAlertsSection | Top 3 decisões prioritárias; lista de alertas abertos com ação "Resolver". |
| 5 | Aviso qualidade | Card condicional | Quando forecastConfidence === 'low' e dataQualityWarning. |
| 6 | Avançado | DashboardAdvancedSection (colapsável) | Conteúdo expandível com sub-nav e múltiplas subseções (ver abaixo). |
| 7 | Footer | Texto fixo | "RFY © 2026 · Dashboard executivo…". |

### 1.3 Conteúdo da seção "Avançado" (expandida)

| Subseção | Componente | Conteúdo |
|----------|------------|----------|
| Posicionamento | RevenuePositioning | Benchmark vs cluster, win rate, ciclo, resumo ICP. |
| Intervenções | IntervencoesPrioritarias | Lista de intervenções prioritárias com valor e ação. |
| Receita declarada vs confiável | ForecastComparison | Gráfico/comparativo pipeline bruto vs forecast ajustado. |
| Deal intelligence | PremiumDataTable | Tabela de oportunidades em risco (mergedRiskyDeals). |
| SUPHO | SuphoOverviewCard | Resumo do último diagnóstico SUPHO (IC, IH, IP, ITSMO, nível). |
| Painel executivo detalhado | ExecutivePanel | Saúde da receita, forecast, delta, receita em risco, receita antecipável. |
| Bottleneck + Vendedores | BottleneckPanel + SellerIntelligenceTable | Etapas com valor em risco; tabela por vendedor (deals críticos, valor em risco, score). |
| Unit Economics / ICP | UnitEconomicsICPCard | LTV, churn, win rate, CAC, ICP study. |
| Status da IA | AIStatusCard | Status do modelo, treinamento. |
| Inteligência IA | AIIntelligencePanel | Gargalo, impacto, simulação de otimização, confiança. |

### 1.4 Objetivos de produto (referência)

- **Visão executiva:** RFY Index, Receita Confiável 30d, Receita Inflada e decisões prioritárias para governança de receita (docs/AVALIACAO_PRONTO_PARA_VENDA.md).
- **Operações:** pipeline, fricções, intervenções, alertas, deal intelligence e inteligência por vendedor para gestores.
- **Diagnóstico e saúde:** SUPHO, Unit Economics, ICP e painéis de IA para profundidade analítica.

### 1.5 Pontos de sobrecarga para um perfil CEO/Diretoria

- **Técnicos ou muito operacionais:** PremiumDataTable (muitas linhas de deals), SellerIntelligenceTable (detalhe por vendedor), BottleneckPanel (detalhe por etapa), AIStatusCard (status de treinamento), AIIntelligencePanel (simulações e jargão).
- **Já adequados ao CEO:** DashboardHero (RFY Index + próxima decisão), DashboardKpiGrid (Receita Confiável, Inflada, Alertas), DashboardDecisionsSection (top 3 decisões), DashboardAlertsSection (resumo de riscos), SuphoOverviewCard e ExecutivePanel (resumo de saúde e forecast).
- **Secundários mas úteis:** RevenuePositioning (benchmark), ForecastComparison (declarado vs confiável), IntervencoesPrioritarias (se resumido); Unit Economics/ICP pode ser "expandir se quiser" para CEO.

---

## 2. Matriz de relevância por perfil

Uso dos papéis existentes em [src/lib/auth.ts](src/lib/auth.ts): `owner | admin | manager | viewer`. Proxy inicial: **owner/admin ≈ CEO/Diretoria** (visão executiva forte); **manager** = visão executiva + operacional; **viewer** = leitura consolidada.

### 2.1 Classificação das seções

| Seção / Bloco | Crítico CEO | Útil CEO | Operacional |
|---------------|-------------|----------|-------------|
| Aviso AI | x | | |
| TopNav | x | | |
| Hero (RFY Index, SUPHO resumo, próxima decisão) | x | | |
| KPI Grid (Receita Confiável, Inflada, Evolução, Alertas) | x | | |
| Decisões (top 3) | x | | |
| Alertas ativos | x | | |
| Aviso qualidade dados | x | | |
| RevenuePositioning / Benchmark | | x | |
| IntervencoesPrioritarias | | x | |
| ForecastComparison | | x | |
| SuphoOverviewCard | | x | |
| ExecutivePanel | | x | |
| PremiumDataTable (deal intelligence) | | | x |
| BottleneckPanel | | | x |
| SellerIntelligenceTable | | | x |
| UnitEconomicsICPCard | | x | |
| AIStatusCard | | | x |
| AIIntelligencePanel | | x | |

### 2.2 Matriz perfil → ênfase (resumo)

- **owner / admin (CEO/Diretoria):** Primeira dobra = Hero + KPI Grid + Decisões + Alertas. Avançado: priorizar Posicionamento, SUPHO, Painel executivo, Receita declarada vs confiável; manter Intervenções e Unit Economics acessíveis; Deal intelligence, Bottleneck, Seller e AI Status em blocos abaixo ou colapsados por padrão.
- **manager:** Mesmo layout; manter todas as seções visíveis; pode destacar Intervenções e Deal intelligence mais acima no Avançado.
- **viewer:** Sem alteração de ordem por enquanto; foco em leitura (ações de "Resolver" alerta podem permanecer conforme RBAC nas APIs).

---

## 3. Proposta detalhada: CEO/Diretoria (owner/admin)

### 3.1 PageHeader (page.tsx)

- **Título:** Manter "Control Deck RFY".
- **Subtítulo (owner/admin):** Texto mais executivo, por exemplo:  
  *"\[Greeting]. Visão de governança: Receita Confiável, distorção (Receita Inflada) e as 3 decisões prioritárias para reduzir risco."*
- **Ações:** Inalteradas (relatório executivo, central de relatórios, ou primeiro upload/config).

### 3.2 Primeira dobra (sem mudança de ordem)

- Hero, KPI Grid, Decisões e Alertas permanecem no topo.
- Objetivo: CEO enxerga em poucos segundos RFY Index, Receita Confiável 30d, Receita Inflada, número de alertas e as 3 próximas decisões.

### 3.3 Narrativa e microcópias (CEO)

- **Hero:** Manter; opcional tooltip no RFY Index: "Percentual do pipeline que a análise considera realizável em 30 dias; acima de 70% indica menor distorção."
- **KPI Receita Confiável:** Subtitle já é "Projeção com maior probabilidade de realização"; pode reforçar: "Valor que pode contar para planejamento."
- **KPI Receita Inflada:** Manter "Distorção monitorada"; tooltip opcional: "Parte do pipeline declarado com maior risco de não se realizar."
- **Decisões:** Título pode ganhar linha executiva: "Próximas 3 decisões com maior impacto em receita."

### 3.4 Seção Avançado (owner/admin)

- **Ordem sugerida das subseções para CEO (dentro do Avançado):**
  1. Posicionamento (RevenuePositioning)
  2. Receita declarada vs confiável (ForecastComparison)
  3. SUPHO (SuphoOverviewCard)
  4. Painel executivo detalhado (ExecutivePanel)
  5. Intervenções prioritárias (IntervencoesPrioritarias)
  6. Unit Economics / ICP (UnitEconomicsICPCard)
  7. Inteligência IA (AIIntelligencePanel) — resumo de gargalo e impacto
  8. Deal intelligence (PremiumDataTable)
  9. Bottleneck + Inteligência por vendedor (BottleneckPanel + SellerIntelligenceTable)
  10. Status da IA (AIStatusCard)

- **Comportamento:** Manter tudo acessível; para owner/admin o sub-nav do Avançado pode seguir essa ordem e, opcionalmente, AIStatusCard no final (mais técnico).
- **Texto do botão "Avançado":** Para CEO: "Ver análises detalhadas (posicionamento, SUPHO, intervenções)".

### 3.5 Visibilidade opcional (fase 1)

- Não esconder nenhum bloco; apenas ordenar e ajustar textos.
- Em uma fase 2, considerar "Modo executivo" que colapsa por padrão: Deal intelligence, Seller intelligence e AI Status.

---

## 4. Métricas de sucesso da segmentação

### 4.1 Sinais a observar

1. **Tempo até "entender o que está acontecendo"** — em entrevistas ou pesquisas com 5–10 usuários CEO/direção: "Em quanto tempo você conseguiu entender a situação da receita?" (meta: < 1 minuto na primeira dobra).
2. **Uso do dashboard por CEO/direção** — em pilotos: frequência de acesso ao dashboard (ex.: 1x/semana ou mais) e cliques em "Baixar relatório executivo".
3. **Redução de dúvidas em demos** — "Onde olhar primeiro?" e "O que é Receita Inflada?" devem diminuir após subtítulos e tooltips executivos.
4. **Engajamento com seção Avançado** — % de usuários owner/admin que expandem "Avançado" e clicam em subseções (Posicionamento, SUPHO, Painel executivo); se muito baixo, considerar trazer um bloco (ex.: SUPHO resumo) para cima.

### 4.2 Coleta qualitativa

- Planejar 5–10 sessões (entrevistas ou testes de usabilidade) com perfis de direção/CEO em pilotos para validar ordem das seções, clareza dos textos e necessidade de "Modo executivo" (menos blocos visíveis por padrão).

---

## 5. Implementação técnica (resumo)

- **Dashboard page:** Obter `role` do usuário (getOrgMemberRole) e repassar para `DashboardClient` como prop `userRole`.
- **DashboardClient:** Receber `userRole?: OrgRole`; usar para:
  - Condicionar subtítulo do PageHeader (no page.tsx) ou passar prop de "persona" para um possível componente de header dentro do client.
  - Ajustar ordem dos itens no sub-nav da seção Avançado quando `userRole === 'owner' || userRole === 'admin'`.
  - Opcional: passar `persona="executive"` para componentes que possam variar microcópias (fase 1 pode ser só no header + ordem do Avançado).
- **Extensibilidade:** Mais adiante, campo `persona` em `org_members` (ex.: `executive | manager | seller`) permitiria segmentação independente do role de permissão.
- **Visão do vendedor:** Copiloto de Receita para Executivo de Contas — próximos passos, mensagens (LinkedIn/e-mail), discovery e oportunidades de expansão por conta. Especificação em [COPILOTO-RECEITA-VISAO-VENDEDOR.md](COPILOTO-RECEITA-VISAO-VENDEDOR.md).
