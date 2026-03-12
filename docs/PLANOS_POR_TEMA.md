# Planos por tema — RFY

Definição de planos de implementação por tema, com base em [O_QUE_FALTA_RFY.md](O_QUE_FALTA_RFY.md). Cada tema pode ser executado como um plano independente (e opcionalmente virar um arquivo em `.cursor/plans/` ou um epic no backlog).

---

## Tema 1 — Billing e venda (P0)

**Objetivo:** Permitir cobrança recorrente real (cartão/PIX/boleto), gestão de assinatura e bloqueio/aviso quando não houver pagamento.

**Escopo:**
- Integração com provedor de pagamento (Stripe ou Pagar.me): checkout, webhooks de evento, sincronização de status com `org_subscriptions`.
- Ciclo de vida: trialing, active, past_due, canceled; upgrade/downgrade de plano; cancelamento e renovação.
- Falha de pagamento: retry (provedor), notificação ao usuário, restrição de uso (ex.: somente leitura) até regularização.
- Página pública de preços e planos; fluxo de upgrade/downgrade dentro da app (Configurações ou área “Plano”).
- Termos de uso e política de privacidade (LGPD) publicados e linkados no signup/checkout.

**Principais tarefas:**
1. Escolher e configurar Stripe ou Pagar.me (produtos, preços, webhooks).
2. Criar rotas/serverless para checkout e webhooks; atualizar `org_subscriptions` (status, plan_id, current_period_end, etc.).
3. Middleware ou checagem em app: ao carregar sessão, verificar status da assinatura; se past_due/canceled, redirecionar ou exibir banner e restringir ações.
4. Implementar página de preços (pública) e fluxo de upgrade/downgrade na app.
5. Redigir e publicar termos de uso e política de privacidade; incluir links no signup e no rodapé.

**Arquivos principais:** Novo módulo `src/lib/billing/` ou `src/app/api/billing/`; páginas `src/app/(marketing)/precos/`, `src/app/app/plano/` ou seção em Configurações; `org_subscriptions`, `plans`; componentes de banner de aviso/restrição.

**Dependências:** Nenhuma obrigatória; convites e RBAC já existem.

---

## Tema 2 — Observabilidade e operação (P0)

**Objetivo:** Visibilidade de uso, saúde do sistema e capacidade de operar e restaurar dados.

**Escopo:**
- Eventos de uso por tela (ou por feature): registro em tabela/analytics para funil de ativação e retenção por coorte; painel admin (ou relatório) para visualizar métricas.
- Backups: rotina automatizada de backup do Postgres (cron ou job); documento de procedimento e teste de restauração (ex.: mensal).
- Logs e rastreio: padronizar logs de erro (estrutura, nível); middleware ou helper para request ID em APIs críticas.
- Alertas operacionais: retries com backoff para webhooks e notificações; canal de falha em tempo real (ex.: Slack ou email para admin).

**Principais tarefas:**
1. Definir schema de eventos de uso (ex.: `usage_events` ou uso de `org_audit_logs` com action específica); instrumentar telas principais (dashboard, upload, SUPHO, settings) com chamada a API ou lib de tracking.
2. Implementar job de backup (script + cron ou worker) e documentar restore; agendar teste de restauração.
3. Introduzir request ID (header ou middleware Next.js); padronizar formato de log (JSON ou texto estruturado) em rotas de API e em catch de erro.
4. Implementar retry com backoff para envio de webhooks e notificações; configurar alerta de falha (email/Slack) para operação.

**Arquivos principais:** `src/lib/analytics/` ou extensão de `org_audit_logs`; `src/app/api/usage/` ou similar; `scripts/backup-db.sh` (ou equivalente); middleware em `src/middleware.ts` ou em rotas; jobs Inngest ou cron para backup e retries.

**Dependências:** Nenhuma obrigatória.

---

## Tema 3 — Experiência e robustez (alto impacto)

**Objetivo:** Erros visíveis para o usuário, app que não quebra por env faltando e indicação clara quando o RFY usa fallback de AI.

**Escopo:**
- Tratamento de erro na UI: em todos os fetches críticos (settings, SUPHO diagnóstico/PAIP, upload, login/signup), em caso de `!res.ok` ou exceção: setar estado de erro, exibir toast ou mensagem inline e opção “Tentar novamente”; remover `.catch(()=>{})` vazios.
- Variáveis de ambiente: validação no carregamento dos clientes Supabase (e opcionalmente de RESEND, AI) com mensagem clara; `.env.example` completo com RESEND, ALERT_*, GOOGLE_AI_API_KEY, etc.
- Indicação de fallback de AI: quando o RFY Index for calculado com fallback (ex.: 70% do pipeline), exibir no dashboard (Hero ou KPI) um aviso discreto tipo “Usando estimativa heurística — AI temporariamente indisponível”.

**Principais tarefas:**
1. Auditar SettingsClient, PAIPClient, DiagnosticoClient, UploadDropzone, login e signup: em cada `fetch`, em falha setar estado de erro e exibir mensagem + “Tentar novamente” onde fizer sentido.
2. Em `src/lib/supabase/client.ts`, `server.ts` e `admin.ts`: checar presença de URL e keys; lançar erro com texto claro se faltar.
3. Criar ou atualizar `.env.example` com todas as variáveis usadas (Supabase, RESEND, ALERT_*, GOOGLE_AI_API_KEY, etc.) e comentário opcional.
4. No fluxo que calcula RFY Index (summary, executive-data, dashboard): passar flag ou retornar `source: 'ai' | 'fallback'`; no DashboardClient/Hero, se fallback, exibir aviso próximo ao RFY Index.

**Arquivos principais:** `src/app/app/settings/SettingsClient.tsx`, `src/app/app/supho/diagnostico/DiagnosticoClient.tsx`, `src/app/app/supho/paip/PAIPClient.tsx`, componentes de upload, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`; `src/lib/supabase/client.ts`, `server.ts`, `admin.ts`; `.env.example`; `src/app/api/metrics/summary/route.ts`, `src/lib/reports/executive-data.ts`, `src/app/app/dashboard/DashboardClient.tsx` (ou Hero/KPI).

**Dependências:** Nenhuma obrigatória.

---

## Tema 4 — Validação e qualidade (médio)

**Objetivo:** Entrada validada nas APIs, loading consistente e teste E2E mínimo do fluxo crítico.

**Escopo:**
- Validação com Zod: nas rotas que ainda não usam (alerts, settings, upload, ai), introduzir schemas para body/query; retornar 400 com `{ error, details }` em falha de validação.
- Loading: garantir `loading.tsx` em todas as rotas que carregam dados (ex.: settings se ainda não tiver).
- Testes E2E: um fluxo mínimo (ex.: Playwright) — login (conta demo) → dashboard carrega → navegação para SUPHO (diagnóstico e/ou maturidade).

**Principais tarefas:**
1. Listar rotas POST/PATCH de alerts, settings, upload, ai; criar schemas Zod e substituir validação manual por `safeParse`; padronizar resposta 400.
2. Verificar presença de `loading.tsx` em `src/app/app/settings/`; se faltar, criar no padrão das outras rotas.
3. Configurar Playwright (ou Cypress) no projeto; implementar um teste E2E: login → dashboard (presença de RFY Index ou cards) → clique em SUPHO → Diagnóstico ou Maturidade (presença de conteúdo ou estado vazio).

**Arquivos principais:** `src/app/api/alerts/`, `src/app/api/settings/route.ts`, `src/app/api/upload/route.ts`, `src/app/api/ai/`; `src/app/app/settings/loading.tsx`; `e2e/` ou `tests/e2e/`, `playwright.config.ts` (ou equivalente).

**Dependências:** Nenhuma obrigatória.

---

## Tema 5 — Produto e roadmap (P1/P2)

**Objetivo:** Itens de produto e evolução listados no roadmap (onboarding, integrações, relatórios, multi-tenant, compliance), executados em fases.

**Escopo (resumido):**
- **P1:** Onboarding guiado in-app (checklist progressivo, milestones, score de ativação). Centro de integrações (conectores HubSpot, Pipedrive, Salesforce com health/status). Relatórios por perfil (templates CEO, Revenue Ops, Sales Manager). Multi-tenant hardening (rate limit por org, quotas por feature).
- **P2:** Forecast versionado, benchmarks setoriais, API pública versionada, compliance LGPD/SOC2.
- **Evolução RFY 90d:** Concluir ou documentar como “em breve” e não prometer em contrato até estar pronto.

**Principais tarefas (por sub-item):**
1. **Onboarding:** Definir milestones (ex.: primeiro upload, primeiro relatório, primeira campanha SUPHO); tabela ou flags de progresso; componente de checklist na dashboard ou em página dedicada.
2. **Centro de integrações:** Página que lista conectores (HubSpot, Pipedrive, Salesforce); status de conexão e health; links para configuração (OAuth ou API key).
3. **Relatórios por perfil:** Estender relatórios existentes com templates ou variantes por perfil (CEO, Revenue Ops, Sales Manager).
4. **Multi-tenant:** Rate limit por `org_id` (ex.: Upstash por org); documentar quotas por feature; aplicar limites nas rotas críticas.
5. **Evolução RFY 90d:** Implementar ou adicionar aviso “em breve” na UI onde a métrica for referenciada.

**Arquivos principais:** Novos módulos/páginas por feature (onboarding, integrações, relatórios); `src/lib/rate-limit.ts` ou equivalente; docs de compliance e API.

**Dependências:** Billing (Tema 1) e Observabilidade (Tema 2) ajudam a operar e cobrar; não obrigatórios para começar P1.

---

## Ordem sugerida para implementação

| Ordem | Tema | Motivo |
|-------|------|--------|
| 1 | Experiência e robustez (Tema 3) | Alto impacto, baixa dependência; melhora confiança em pilotos e demos. |
| 2 | Validação e qualidade (Tema 4) | Reduz bugs e facilita evolução; E2E protege o fluxo crítico. |
| 3 | Observabilidade e operação (Tema 2) | Necessário para operar em produção e vender com segurança. |
| 4 | Billing e venda (Tema 1) | Habilitador para cobrança automática. |
| 5 | Produto e roadmap (Tema 5) | P1/P2 conforme prioridade de negócio. |

Cada tema pode ser detalhado em um plano executável (com todos os passos e arquivos) quando for priorizado.
