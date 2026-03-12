# Revisão de Arquitetura — Revenue Engine (SaaS AI-first)

**Papel:** Arquiteto de software para SaaS AI-first  
**Escopo:** Revenue Friction Engine (RFY) — modularidade, separação de responsabilidades, escalabilidade  
**Data:** Fevereiro 2025

---

## 1. Visão geral da arquitetura atual

- **Frontend:** Next.js App Router; dashboard consome `reports` (snapshot, frictions, pillar_scores) e chama APIs de IA (forecast, benchmark, interventions).
- **Backend de métricas:** Cálculo de snapshot/frictions/pillar scores em `src/lib/metrics/compute.ts`; executado em job Inngest `compute-report` após ingestão.
- **Cálculos de “revenue” na UI:** `src/app/app/dashboard/components/revenue-engine.ts` — pipeline ajustado, receita antecipável, impact score, etc.
- **IA:** Microserviço FastAPI (`ai-service/`) expõe predict, forecast, benchmark, interventions; Next faz proxy via `/api/ai/*` com auth e timeout.

Pontos fortes já presentes: métricas centralizadas e testadas em `compute.ts`, proxy de IA com auth, separação entre geração de relatório (Inngest) e exibição (dashboard).

---

## 2. Modularidade e separação de responsabilidades

### 2.1 Duplicação de tipos e domínio “deal”

- **Problema:** Dois conceitos paralelos:
  - `DealRow` em `revenue-engine.ts` (dentro de `components/`) — usado em todo o dashboard.
  - `OpportunityWithActivity` e estruturas de `Snapshot` em `compute.ts` — usados no Inngest e para persistir em `reports`.

O snapshot já produz `topDealsPropostaRisco` e `topDealsAbandoned` com shape compatível com `DealRow`. Ter dois nomes e dois lugares para “deal na tela” aumenta risco de divergência e acoplamento desnecessário.

- **Recomendação:**
  - Definir um tipo de domínio único para “deal exibível/calculável”, por exemplo `DealView`, em `src/types/deal.ts` (ou `src/lib/domain/deal.ts`).
  - Fazer `compute.ts` retornar arrays que satisfaçam `DealView`; `revenue-engine` e componentes importam `DealView` do mesmo módulo.
  - Mover `revenue-engine.ts` para **fora** de `components/`: por exemplo `src/lib/revenue-engine/index.ts` (ou `src/lib/metrics/revenue-engine.ts`). Esse módulo deve conter apenas funções puras e tipos; sem JSX.

### 2.2 Regras de negócio em `components/`

- **Problema:** `revenue-engine.ts` é lógica de domínio (probabilidade por dias, pipeline ajustado, receita antecipável, valor em risco por etapa/vendedor) dentro de `app/.../components/`, e é importado por vários componentes e pelo `DashboardClient`.

- **Recomendação:** Tratar como camada de domínio/application:
  - Manter em `src/lib/revenue-engine/` (ou `src/lib/metrics/revenue-engine.ts`) e exportar de `src/lib/` ou `src/types/`.
  - Componentes e páginas importam de `@/lib/revenue-engine` (e tipos de `@/types/deal`), não de `./revenue-engine` dentro de components.

### 2.3 Mapeamento fricção → ação

- **Problema:** `src/lib/actions.ts` concentra `FRICTION_ACTIONS`, `getActionForFriction` e `computeValueAtRisk`. É domínio (fricções e impacto), mas o nome “actions” é genérico.

- **Recomendação:** Renomear ou mover para deixar o domínio explícito, por exemplo:
  - `src/lib/domain/frictions.ts` ou `src/lib/frictions/actions.ts`, exportando as mesmas funções e constantes.
  - Manter `actions.ts` apenas como re-export se quiser compatibilidade com imports atuais, e migrar gradualmente para o novo path.

### 2.4 DashboardClient como “god component”

- **Problema:** `DashboardClient.tsx` concentra:
  - Data fetching de IA (useEffect com forecast, benchmark, interventions).
  - Dezenas de `useMemo` para derivar estado (filtros, deals mesclados, pipeline ajustado, frictions priorizadas, intervenções, tabelas de vendedor, gargalo, etc.).
  - Helpers locais: `getDateRange`, `getInitials`, `dealInRange`, `formatCurrency`.
  - Renderização de todas as seções do dashboard (empty state, alerta IA, KPIs, gráficos, tabelas, cards).

Isso dificulta testes, reuso e evolução (qualquer mudança em filtro ou nova seção mexe no mesmo arquivo grande).

- **Recomendação (refatoração em fases):**
  1. **Extrair utilitários de formato e datas**
     - Criar `src/lib/format.ts` (ou `src/lib/format/currency.ts`, `dates.ts`) com `formatCurrency`, `getInitials`, `getDateRange`, e opcionalmente `dealInRange` se for genérico.
     - Remover duplicatas de `formatCurrency` / `getInitials` em `DashboardClient`, `PremiumTable`, `PremiumDataTable`, `SellerIntelligenceTable`, `AppShell`, `reports/page.tsx`, etc.
  2. **Extrair hooks de dados do dashboard**
     - `useDashboardDerivedState(snapshot, frictions, pillarScores, filters)` — encapsula os useMemos que derivam deals mesclados, pipeline ajustado, receita antecipável, value at risk, frictions priorizadas, intervenções, seller rows, bottleneck, etc. Retorna um objeto estável com todos os valores derivados.
     - `useAiData(orgId)` — encapsula o useEffect que chama forecast, benchmark, interventions; retorna `{ forecast, benchmark, interventions, loading, error }`. Assim o componente não precisa saber URLs nem fazer Promise.all.
  3. **Quebrar a UI em seções**
     - Componentes por bloco lógico: por exemplo `DashboardSummary`, `DashboardFrictions`, `DashboardPipeline`, `DashboardBottleneck`, `DashboardSellers`, `DashboardInterventions`, etc., cada um recebendo apenas as props necessárias (dados + formatCurrency quando preciso).
     - `DashboardClient` fica como orquestrador: chama os hooks, passa dados para as seções e trata empty state / alerta de IA no topo.

### 2.5 Camada de dados da página

- **Situação:** `dashboard/page.tsx` faz várias queries (reports, org_unit_economics, org_icp_studies), obtém org e repassa tudo para `DashboardClient`. Responsabilidade de “buscar dados do report e contexto” está na página; o client só recebe props. Isso está alinhado com App Router (server component carrega, client renderiza).

- **Recomendação:** Manter esse desenho. Se no futuro houver muitas fontes ou cache, considerar um “report loader” em server action ou route handler que devolva um único DTO para a página.

---

## 3. Escalabilidade

### 3.1 Job Inngest `compute-report`

- **Situação:** Uma única função que, por evento: lê opportunities + activities, enriquece com last_activity e days_without_activity, chama `computeSnapshot`, `computeFrictions`, `computePillarScores`, persiste report, depois calcula unit economics e faz upsert em `org_unit_economics`. Tudo em sequência.

- **Riscos:** Para orgs com muitos opportunities/activities, o job pode ficar pesado e próximo do limite de tempo do Inngest; falha em qualquer etapa invalida todo o trabalho.

- **Recomendações:**
  - **Curto prazo:** Manter um único job, mas garantir que as queries sejam paginadas ou limitadas se o contrato permitir (ex.: top N oportunidades por org). Documentar limites recomendados (ex.: até X mil oportunidades por org).
  - **Médio prazo:** Quebrar em steps Inngest (ex.: step 1 enriquecer e persistir cache de opportunities enriquecidas; step 2 snapshot + frictions + pillar_scores + insert report; step 3 unit economics + upsert). Assim retries são granulares e, no futuro, steps podem ser paralelizados ou escalonados por org.

### 3.2 Chamadas de IA no dashboard

- **Situação:** O client dispara em paralelo `predictForecast`, `getBenchmark`, `getInterventions`. Se uma falha, o catch único marca “IA indisponível” e zera forecast, benchmark e interventions.

- **Recomendação:** Tornar resiliente por endpoint:
  - Fazer três chamadas em paralelo mas tratar resultado por tipo: se forecast falhar, manter benchmark e interventions; exibir aviso apenas para “Forecast indisponível” e usar fallback (ex.: pipeline ajustado) onde já existir.
  - Opcional: cache no client (ou em API route) por org_id com TTL curto (ex.: 5 min) para benchmark/forecast, reduzindo carga no ai-service em refreshes seguidos.

### 3.3 APIs de IA (Next → ai-service)

- **Situação:** Rotas em `src/app/api/ai/forecast`, `benchmark`, `interventions` fazem proxy com auth (`requireAuthAndOrgAccess`), timeout 30s e tratamento de erro genérico. Padrão repetido (AI_BASE, timeout, abort controller).

- **Recomendação:**
  - Extrair um helper `proxyToAiService(path, body, auth.orgId)` em `src/lib/aiProxy.ts` (ou similar) para evitar duplicação de AI_BASE, timeout e fetch. As route handlers ficam apenas com parse do body, auth e chamada ao helper.
  - Manter timeout único (ex.: 30s) configurável por env se no futuro precisar de valores diferentes por endpoint.

### 3.4 AI Service (Python)

- **Situação:** Um único serviço FastAPI com predict, forecast, benchmark, interventions e treino. Uso de `load_org_data` e conexão raw para carregar opportunities/activities.

- **Recomendação (visão de produto SaaS):** Manter um só serviço é aceitável para escala inicial. Para crescimento:
  - Considerar separar “inferência em tempo real” (predict, forecast, interventions) de “batch/treino” (train), por exemplo com workers ou filas, para que picos de treino não afetem latência das APIs.
  - Manter interfaces estáveis (request/response) para que o Next continue consumindo via proxy sem depender de detalhes internos do Python.

---

## 4. Resumo das refatorações sugeridas

| Prioridade | Refatoração | Benefício |
|------------|-------------|-----------|
| Alta | Mover `revenue-engine.ts` para `src/lib/revenue-engine/` e unificar tipo “deal” em `src/types/deal.ts` (DealView) | Domínio fora da UI; uma única fonte de verdade para “deal” na tela. |
| Alta | Extrair `formatCurrency`, `getInitials`, `getDateRange` para `src/lib/format.ts` e usar em todo o app | Elimina duplicação; formatação consistente. |
| Alta | Quebrar `DashboardClient`: hooks `useDashboardDerivedState`, `useAiData` + componentes de seção + orquestrador | Componente menor, testável e evoluível. |
| Média | Renomear/mover `actions.ts` para `src/lib/domain/frictions.ts` (ou equivalente) | Domínio de fricções explícito e localizado. |
| Média | Helper `proxyToAiService` para rotas `/api/ai/*` | Menos duplicação e timeout/auth centralizados. |
| Média | Tratar falhas de IA por endpoint no dashboard (fallback por tipo) | Melhor UX quando só um serviço de IA falha. |
| Baixa | Inngest: dividir `compute-report` em steps (enrich → snapshot/frictions/pillar → persist → unit economics) | Retries granulares e base para escalar por org. |
| Baixa | Cache (client ou server) para benchmark/forecast por org_id com TTL | Menos chamadas repetidas ao ai-service. |

---

## 5. Checklist de validação pós-refatoração

- [ ] Testes existentes de `compute.ts` e `revenue-engine` continuam passando após mover tipos e módulos.
- [ ] Nenhum import de `revenue-engine` a partir de `components/`; imports vêm de `@/lib/revenue-engine` ou `@/types/deal`.
- [ ] `formatCurrency` / `getInitials` / `getDateRange` usados a partir de `@/lib/format` (ou equivalente) em dashboard e reports.
- [ ] DashboardClient reduzido a orquestração + hooks + seções; sem centenas de linhas de useMemo no mesmo arquivo.
- [ ] Rotas `/api/ai/*` usam helper de proxy com timeout e auth.
- [ ] Documentação (README ou ARCHITECTURE.md) atualizada com a nova estrutura de pastas e responsabilidades.

---

*Documento gerado pelo agente SaaS Architecture Guardian. Refatorações devem ser aplicadas incrementalmente, com testes e deploy em ambiente de staging antes de produção.*
