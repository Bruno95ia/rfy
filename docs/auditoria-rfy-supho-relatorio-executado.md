# Relatório de auditoria RFY + SUPHO — execução

**Data:** 2026-03-20  
**Escopo:** código + APIs + jobs no repositório; **não** foi possível confrontar texto dos PDFs (ficheiros ausentes em `docs/supho/referencia/`).  
**Evidência objetiva:** rotas listadas, ficheiros citados, smoke `curl` onde aplicável.

---

## 1. Diagnóstico geral

| Métrica | Valor |
|--------|--------|
| **Aderência aos PDFs** | **N/A** — documentos fonte não estão no repo para diff requisito a requisito. |
| **Aderência ao framework de auditoria (técnico)** | Estimativa **~65–75%** “capacidade implementada”; vários fluxos dependem de **serviços externos** (Inngest, AI service, Resend, Stripe) estarem ativos. |
| **Principais riscos** | (1) Automação assíncrona invisível se Inngest não corre; (2) e-mail/relatórios silenciosos sem `RESEND_API_KEY`; (3) insights/forecast dependentes de `AI_SERVICE_URL`; (4) não há módulo explícito de “base de conhecimento” no código. |

---

## 2. Validação por bloco (estrutura obrigatória)

### 1) Core do produto

| Item | Status | Evidência | Gap | Impacto | Ação |
|------|--------|-----------|-----|---------|------|
| CRM — ingestão CSV | **OK** | `POST /api/upload`, `uploads` + storage; processamento `src/inngest/functions/process-upload-*.ts`, `src/lib/upload-process.ts` | — | — | Manter monitorização Inngest |
| CRM — reprocessamento | **OK** | `POST /api/upload/reprocess` + evento Inngest | — | — | — |
| Integração CRM webhook | **PARCIAL** | `src/app/api/crm/webhook/route.ts`, Piperun `integrations/piperun/*` | Outros ERPs podem não estar cobertos pelo doc | Médio | Alinhar com escopo do PDF |
| Insights automáticos | **PARCIAL** | Várias rotas `/api/ai/*`; relatórios `reports/executive.*`, `compute-report` | Depende do serviço AI e dados; não provado E2E aqui | Alto se piloto exige AI sempre on | Healthcheck + fallback documentado |
| Base de conhecimento integrada | **NÃO IMPLEMENTADO** (no código) | Grep sem matches a “knowledge” em `src/` | Feature ausente ou com outro nome fora do scan | Alto se CORE no PDF exige KB | Implementar ou renomear no doc |
| Diagnóstico SUPHO | **OK** | `POST /api/supho/diagnostic/compute`, `src/lib/supho/calculations.ts`, tabelas `supho_*` | ITSMO como rótulo/métrica: verificar nomenclatura vs PDF | Médio | Cruzar com documento |
| Rituais + decisões + ritmo | **PARCIAL** | Rituais: `src/app/api/supho/rituals/**`, decisões `rituals/[id]/decisions/route.ts`; score `rituals/score/route.ts` | “Índice de ritmo” precisa confirmação semântica com PDF | Médio | Validar métricas com documento |
| Alertas | **PARCIAL** | `src/app/api/alerts/**`, `src/inngest/functions/alerts-evaluate.ts`, `src/lib/alerts/send-channels.ts` | Envio real requer canais + avaliação agendada | Alto | Garantir Inngest + env vars |
| Relatórios agendados | **PARCIAL** | `report_schedules` em settings, `src/inngest/functions/report-schedules-send.ts` | Disparo depende de Inngest cron + e-mail | Alto | Operacionalizar Inngest |

---

### 2) Setup e fluxo operacional

| Item | Status | Evidência | Gap |
|------|--------|-----------|-----|
| Upload + reprocess | **OK** | Rotas acima | — |
| Agendamento relatórios | **PARCIAL** | CRUD via `/api/settings` secções `report_schedule_*` | Execução = Inngest |
| Alertas multi-canal | **PARCIAL** | `alert_channels`, `alert_rules` | E-mail: `src/lib/email/send.ts` → Resend |
| Diagnóstico — sample size / confidence | **PARCIAL** | `supho_diagnostic_results.sample_size`, `compute` | “Confidence” explícita não vista no trecho analisado | 
| Rituais persistidos | **OK** | `supho_rituals`, decisões em `supho_ritual_decisions` | — |

**Smoke (ambiente local/servidor):** `GET /login` → HTTP **200**; `GET /api/ai/status` sem cookie → `{"error":"Não autenticado"}` (prova de API + auth).

---

### 3) Piloto (MVP)

| Item | Status | Notas |
|------|--------|------|
| CRM ou CSV | **OK** | Upload PipeRun-style |
| Relatório semanal ativo | **PARCIAL** | Modelo existe; depende agendamento + job |
| Canal de alerta | **PARCIAL** | CRUD OK; entrega depende config |
| Diagnóstico pacote Full/Core/Custom | **NÃO VERIFICADO** | Não há prova nos ficheiros lidos; campanhas têm `question_ids` |
| Rituais com decisões | **OK** | API POST decisões |
| Billing | **PARCIAL** | `billing/checkout`, `billing/webhook`, `billing/status`; limites `src/lib/billing.ts` | Piloto “501” não auditado sem PDF |

---

### 4) Drivers de cobrança

| Item | Status | Evidência |
|------|--------|-----------|
| Utilizadores / assentos | **OK** | `org_members`, `checkOrgLimit(..., 'seats')` em `billing.ts` |
| Uploads 30d | **OK** | `usage_events` métrica `uploads_30d` |
| Active deals | **OK** | Métrica em planos |
| Integrações | **PARCIAL** | `crm_integrations`, Piperun; rastreio genérico | 
| Stripe | **PARCIAL** | Webhooks/checkout presentes; exige chaves e fluxo real | 

---

### 5) Governança e execução

| Item | Status | Evidência |
|------|--------|-----------|
| Decisões registadas | **OK** | `supho_ritual_decisions` + API |
| Decisão ↔ ritual | **OK** | `ritual_id` nas decisões |
| Plano 30/90 dias | **PARCIAL** | PAIP `supho_paip_plans` + export | 
| Rastreabilidade ampla | **PARCIAL** | `org_audit_logs` em billing/settings | 

**Regra do prompt (“decisão sem registo = falha”):** para rituais SUPHO, o registo existe; outros domínios não foram mapeados nesta execução.

---

### 6) Scorecard / prova de valor

| Item | Status | Evidência |
|------|--------|-----------|
| Métricas RFY / pipeline | **PARCIAL** | `GET /api/metrics/summary`, `reports.snapshot_json` |
| Adoção / time-to-value | **NÃO IMPLEMENTADO** como KPI dedicado | `metrics_status` é versão + `last_updated_at`, não TTV |
| Taxa resposta diagnóstico | **PARCIAL** | Derivável por queries em `supho_respondents`; sem API dedicada vista |
| Evolução / fricções | **PARCIAL** | Dashboard, simulações `simulations/rfy` | 

---

### 7) Evidence (prova rastreável)

| Item | Status | Evidência |
|------|--------|-----------|
| Histórico diagnóstico | **OK** | `supho_diagnostic_results`, `diagnostic/history` |
| Logs rituais/decisões | **OK** | Tabelas + GET decisões |
| Relatórios gerados | **PARCIAL** | `reports`, exports CSV/PDF/XLSX | 
| Alertas enviados | **PARCIAL** | `alerts`, `alert_events`; entrega depende de canais | 
| Audit log org | **PARCIAL** | `org_audit_logs` em ações críticas | 

**CRÍTICO relativo ao prompt:** se **Inngest** ou **Resend** não estiverem em produção, há **feature com código** mas **sem evidência operacional** (relatório/alerta “nunca chega”).

---

## 3. Gaps críticos (consolidado)

1. **PDFs ausentes** — impossível declarar conformidade documental.  
2. **Dependência de fila (Inngest)** para uploads pós-processamento, alertas e relatórios agendados — sem evidência de execução sem ambiente.  
3. **Base de conhecimento** — não encontrada no código sob termos usuais.  
4. **KPIs de piloto (TTV, adoção formal)** — não há módulo claro dedicado; métricas são parciais.

---

## 4. Inconsistências de produto (potenciais)

- UI pode expor fluxos cuja **entrega** depende de integrações não configuradas (e-mail, AI).  
- Conectores na UI (ex.: integrações “em breve”) vs CSV ativo — risco de expectativa desalinhada com documento de produto.

---

## 5. Features “fake” / risco de aparência

| Área | Risco |
|------|--------|
| Relatórios agendados | UI + DB sem Inngest = não dispara |
| Alertas e-mail | Código OK; sem `RESEND_API_KEY` = no-op logado |
| Forecast / AI | Fallback em `metrics/summary`; pode parecer “sempre AI” |
| Knowledge base | Se o PDF promete KB e não há módulo → **gap real** |

---

## 6. Recomendações priorizadas

### P0 — bloqueia piloto ou prova de valor
- Colocar os **3 PDFs** em `docs/supho/referencia/` e **re-executar** auditoria requisito a requisito.  
- Garantir **Inngest** (ou processamento síncrono documentado) + **RESEND** em staging/prod com prova (e-mail de teste).  
- Definir e implementar ou **documentar corte** explícito da **base de conhecimento** vs roadmap.

### P1 — escala
- Dashboard de saúde: AI service, Inngest, Resend, Stripe webhook.  
- APIs ou views para **taxa de resposta SUPHO** e **uso piloto** sem SQL manual.

### P2 — melhoria
- Métricas TTV/adoção se o documento exigir scorecard executivo.  
- Expandir audit log para mais domínios se governança exigir.

---

## 7. Próximo passo obrigatório para “aderência ao documento”

1. `scp` ou copiar os PDFs para `docs/supho/referencia/`.  
2. Pedir nova execução: `@docs/auditoria-rfy-supho-cursor.md` + `@docs/supho/referencia/`.  
3. Opcional: script `scripts/audit-smoke.sh` para healthchecks automatizados.

---

*Gerado por auditoria técnica no repositório; não substitui revisão legal/comercial dos PDFs.*
