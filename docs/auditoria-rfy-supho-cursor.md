# Auditoria RFY + SUPHO — prompt para Cursor

Use este ficheiro como **fonte do prompt** (copiar para o chat ou `@` referenciar). Os PDFs de verdade devem estar em `docs/supho/referencia/` (ou anexados na conversa).

**Regra de ouro:** só conta como **OK** com **execução real + evidência** (resposta HTTP, query, log, UI com passos reproduzíveis). Código ou UI sozinha não provam comportamento.

---

## Documentos (source of truth)

Colocar aqui os três PDFs e atualizar os nomes:

- `docs/supho/referencia/RFY_SUPHO_Setup_Total_Atualizacoes_Implementadas_v2.pdf`
- `docs/supho/referencia/RFY_SUPHO_Governanca_Documentacao_Padrao_Bruno_v1.pdf`
- `docs/supho/referencia/RFY_SUPHO_Documentos_Validacao_Bruno_Unico_v1.pdf`

Se ainda não estiverem no repo, anexa-os no chat do Cursor ou faz `scp` para o servidor e commit (ou mantém só no servidor e anexa por conversa).

---

## Prompt (copiar a partir da próxima linha)

### CONTEXTO

Usa os documentos acima como **fonte única de verdade** para validar o sistema RFY (Revenue Engine) + SUPHO.

Objetivo: verificar aderência **comportamental e estrutural** ao que está definido nos documentos.

### PAPEL DO AGENTE

Atua como auditor **técnico + produto + operação**:

1. Comparar o sistema real com os documentos  
2. Identificar gaps, inconsistências ou desvios  
3. Validar itens críticos com implementação correta  
4. Produzir **evidência objetiva**: endpoints, payloads/respostas, queries, eventos de domínio, trechos de UI reproduzíveis, outputs de relatórios/alerts  

### ESTRUTURA OBRIGATÓRIA POR ITEM

Para **cada** requisito ou afirmação dos documentos:

| Campo | Conteúdo |
|--------|-----------|
| **Status** | OK / PARCIAL / NÃO IMPLEMENTADO / INCORRETO |
| **Evidência** | Como provaste (ex.: `GET /api/...` → corpo; query SQL; passo na UI) |
| **Gap** | O que falta ou está errado |
| **Impacto** | Risco produto / operação / receita |
| **Ação recomendada** | Concreta (prioridade implícita) |

---

### 1) Core do produto

**Base nos documentos:** tese, CORE vs nice-to-have.

Validar se o sistema **de facto**:

- Integra CRM/ERP (ingestão + reprocessamento)  
- Gera insights automáticos  
- Tem base de conhecimento integrada (se exigido no doc)  
- Executa diagnósticos SUPHO / ITSMO (conforme doc)  
- Suporta rituais + decisões + índice de ritmo  
- Gera alertas e relatórios agendados  

Verificar: rotas API, fluxo de dados, jobs/Inngest/cron, outputs persistidos.

**Regra:** UI sem backend funcional → **PARCIAL** ou **INCORRETO** conforme o doc.

---

### 2) Setup e fluxo operacional

**Base:** setup padrão no documento.

Validar suporte real ao fluxo (ex.: Kickoff → Setup → Integrações → Knowledge → Diagnóstico → Insights → Rituais), incluindo:

- Upload + reprocessamento (API funcional)  
- Agendamento de relatórios  
- Alertas multi-canal  
- Diagnóstico com cobertura / sample size / confidence (se exigido)  
- Rituais e decisões persistidas  

Para cada item: **endpoint**, **payload exemplo**, **resposta real** (ou explicar bloqueio: auth, env, dados).

---

### 3) Requisitos de piloto (MVP real)

**Base:** checklist mínimo do piloto no documento.

Validar capacidade de configurar/usar:

- CRM ou upload CSV funcional  
- Pelo menos um relatório semanal ativo (se exigido)  
- Pelo menos um canal de alerta funcional  
- Diagnóstico com pacote válido (Full/Core/Custom) se aplicável  
- Rituais com decisões registadas  
- Billing (incl. estados de teste/piloto se o doc permitir)  

Evidência: simular ou executar fluxo mínimo **ponta a ponta** e registar resultados.

---

### 4) Drivers de cobrança

**Base:** modelo de cobrança no documento.

Validar medição de:

- Utilizadores / assentos  
- Colaboradores (diagnóstico)  
- Unidades  
- Integrações  

Verificar: dados no **PostgreSQL** por `org_id`, eventos de uso, ligação a Stripe se existir.

---

### 5) Governança e execução

**Base:** governança + documentação.

Validar:

- Registo de decisões (decision log)  
- Associação decisão ↔ ritual (se exigido)  
- Plano (ex.: 30 dias / PAIP) e rastreabilidade  

**Regra crítica dos documentos:** se decisão não gera registo persistido, marcar falha face à proposta de valor.

---

### 6) Scorecard e prova de valor

**Base:** pilotos e métricas.

Validar medição de: time-to-value, adoção, taxa de resposta ao diagnóstico, evolução de dados, rituais, redução de fricções — **conforme métricas definidas nos PDFs**.

Verificar: métricas calculadas automaticamente vs manuais; UI/API.

---

### 7) Evidence (prova real)

**Base:** conceito de “evidence” no documento.

Validar geração de:

- Histórico antes/depois  
- Logs de execução (rituais/decisões)  
- Outputs de relatórios  
- Alertas enviados  

**Se não houver rasto auditável → CRÍTICO** (mesmo que a feature “exista” no código).

---

### Critérios de alerta

Marcar **CRÍTICO** se:

- Peça essencial do CORE ausente  
- Sem evidência rastreável  
- Fluxo piloto não executável E2E  
- Dados não rastreáveis por cliente/org  
- Dependência de operação manual **fora** do sistema (quando o doc exige automação/trace)  

---

### Saída final esperada

1. **Diagnóstico geral** — % aderência (estimativa fundamentada), principais riscos  
2. **Gaps críticos**  
3. **Inconsistências de produto**  
4. **Features “fake”** (UI/código sem comportamento comprovado)  
5. **Recomendações priorizadas:** P0 (bloqueia piloto), P1 (escala), P2 (melhoria)  

---

### Anti-padrões (não fazer)

- Dar OK só por existir ficheiro de rota ou botão na UI  
- Ignorar erros 401/402/500 em evidência  
- Assumir Inngest/cron/email sem teste ou config  

---

## Evidência neste repositório (atalhos para o auditor)

- APIs: `src/app/api/**`  
- SUPHO: `src/app/api/supho/**`, `src/lib/supho/**`  
- Uploads CRM: `src/app/api/upload/**`, `src/lib/upload-process.ts`  
- Alertas / relatórios agendados: `src/app/api/alerts/**`, `report_schedules`, `src/lib/billing.ts`  
- Auth/sessão: `src/lib/auth-session.ts`, `src/lib/auth.ts`  
- Migrações/schema: `supabase/sql/migrations/**`  

Comandos úteis (ajustar host e cookie): `curl -sS -b cookies.txt -c cookies.txt https://.../api/...`

---

## Próximos passos (opcional)

- Dividir em prompts menores: `auditoria-infra.md`, `auditoria-dados.md`, `auditoria-billing.md`  
- Smoke HTTP: `npm run audit:smoke` ou `BASE_URL=https://seu-host ./scripts/audit-smoke.sh` (ver cabeçalho do script para `COOKIE_JAR` + `ORG_ID`)  

---

*Documento gerado para uso interno RFY — alinhar com os PDFs oficiais sempre que estes forem atualizados.*
