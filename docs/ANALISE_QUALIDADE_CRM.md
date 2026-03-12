# Análise de Qualidade dos Dados do CRM (RFY)

**Agente:** Data Quality Agent  
**Escopo:** Dados de oportunidades e atividades (PipeRun, webhook, CSV) usados pelo motor de receita e modelos de ML.  
**Regra:** Não alterar dados automaticamente; apenas analisar e recomendar.

---

## 1. Resumo Executivo

| Aspecto | Situação | Prioridade |
|--------|----------|------------|
| **Campos obrigatórios** | Apenas `crm_hash` (e `org_id`) garantidos; demais opcionais | ALTA |
| **Inconsistências de tipo** | `value` e datas podem vir como string no webhook; parsing tolerante | MÉDIA |
| **Campos faltantes** | `title`, `company_name`, `stage_name`, `created_date` frequentemente vazios em imports | ALTA |
| **Outliers** | `value` sem validação (negativo, zero, valores extremos); `stage_timing_days` pode ser NaN ou negativo | MÉDIA |
| **Estrutura** | Atividades sem `linked_opportunity_hash` ou `opportunity_id_crm` são descartadas no webhook | ALTA |
| **Duplicatas** | Unicidade por `(org_id, crm_hash)`; hash vazio descarta linha no CSV | OK |

**Recomendações principais:**  
1) Validar e normalizar payload do webhook (tipos, ranges).  
2) Enriquecer normalização do CSV para tratar campos vazios e variantes de coluna.  
3) Adicionar validações no banco (CHECK para `value >= 0`, datas coerentes).  
4) Registrar e opcionalmente reprocessar atividades rejeitadas por falta de link.

---

## 2. Estrutura dos Dados e Pontos de Ingestão

- **Tabelas:** `opportunities`, `activities`, `crm_integrations`.
- **Fontes:**  
  - CSV PipeRun (upload → `process-upload-opportunities` / `process-upload-activities`).  
  - Webhook (`POST /api/crm/webhook` → body `opportunities[]`, `activities[]`).
- **Campos críticos para ML (feature_builder):**  
  `crm_hash`, `stage_name`, `status`, `value`, `created_date`, `closed_date`, `owner_email`, `owner_name`, `stage_timing_days`; atividades: `done_at`, `start_at`, `created_at_crm`, `linked_opportunity_hash`.

---

## 3. Inconsistências Identificadas

### 3.1 🔴 Webhook: tipo e range de `value`

**Descrição:** No webhook, `value` é aceito como número ou string (`parseFloat(String(o.value))`). Não há checagem de sinal nem de valor máximo.

**Evidência (trecho do webhook):**
```ts
value: typeof o.value === 'number' ? o.value : parseFloat(String(o.value)) || null,
```

**Problemas:**  
- Valores negativos são persistidos (ex.: reembolsos ou erros de integração).  
- `NaN` vira `null` (ok), mas `Infinity` ou números enormes não são filtrados.  
- Modelo e métricas assumem `value` como valor de negócio ≥ 0.

**Recomendação:**  
- Normalizar: `value = number` → se `value < 0 || !Number.isFinite(value)` usar `null`.  
- Opcional: limitar a um teto (ex.: 1e12) e logar outliers.

---

### 3.2 🔴 Webhook: status fora do enum

**Descrição:** Status é mapeado para `'open' | 'won' | 'lost'`. Qualquer outro valor cai em `'open'`.

**Evidência:**
```ts
status: ['open', 'won', 'lost'].includes(String(o.status ?? '')) ? o.status : 'open',
```

**Problema:** Status inválidos (ex.: "aberta", "em andamento") viram "open" silenciosamente; análise por status real fica incorreta.

**Recomendação:**  
- Mapear variantes comuns (pt-BR: "aberta" → open, "ganha" → won, "perdida" → lost).  
- Logar valores desconhecidos e, se desejado, retornar aviso no response (ex.: `warnings: ['status desconhecido em N oportunidades']`).

---

### 3.3 🔴 Webhook: atividades sem link são descartadas

**Descrição:** Só entram atividades que tenham `linked_opportunity_hash` ou `opportunity_id_crm`. As demais são ignoradas.

**Evidência:**
```ts
.filter((a) => a?.linked_opportunity_hash || a?.opportunity_id_crm)
```

**Problema:** Atividades órfãs (úteis para linking posterior ou métricas de atividade bruta) são perdidas sem log.

**Recomendação:**  
- Inserir com `linked_opportunity_hash` e `opportunity_id_crm` nulos e `link_confidence: 'none'`; rodar `link-activities` depois.  
- Ou manter filtro mas retornar no response: `activities_skipped: N` e opcionalmente lista de `crm_activity_id` rejeitados.

---

### 3.4 🟡 CSV PipeRun: coluna "Titulo" vs "Título da oportunidade"

**Descrição:** O normalizador usa `get('Titulo') ?? get('Título da oportunidade')`. Exportações podem usar nome diferente (acento, nome alternativo).

**Recomendação:** Incluir aliases na normalização (ex.: "Título", "Titulo da oportunidade") e documentar colunas suportadas no README.

---

### 3.5 🟡 CSV: "Lead-Timing da etapa" vazio ou não numérico

**Descrição:** `stage_timing_days` vem de "Lead-Timing da etapa" com `parseFloat` após substituir `.` e `,`. Células vazias ou texto geram `NaN` → null (ok). Porém, números com formato diferente (ex.: "1.234,56" já normalizado) podem quebrar.

**Evidência (normalize.ts):**
```ts
const stageTiming = stageTimingRaw
  ? parseFloat(stageTimingRaw.replace(/\./g, '').replace(',', '.'))
  : null;
```

**Recomendação:** Tratar apenas formato esperado (ex.: inteiro ou decimal BR); caso contrário manter `null` e logar em modo debug.

---

## 4. Campos Faltantes e Impacto

| Campo | Obrigatório DB? | Uso em ML / relatórios | Quando falta |
|-------|------------------|-------------------------|--------------|
| `crm_hash` | Sim | Chave de join, dedup | Linha descartada (CSV/webhook) |
| `stage_name` | Não | Feature (stage_position_percentage, one-hot) | Fallback "unknown"; perde poder preditivo |
| `value` | Não | Feature e métricas de receita | 0 ou null no modelo; distorce médias |
| `created_date` | Não | Idade do deal, ciclos | Idade e ciclos incorretos |
| `closed_date` | Não | Ciclo, won/lost | Só relevante para fechadas |
| `company_name` | Não | Exibição, agrupamento | Dificulta análise por conta |
| `title` | Não | Exibição, contexto | Oportunidade "sem nome" |
| `owner_email` / `owner_name` | Não | seller_win_rate, seller_avg_cycle | Estatísticas por vendedor incompletas |

**Recomendação:**  
- Definir “mínimo viável” por fonte (ex.: webhook exige `crm_hash` + `stage_name` ou `title`).  
- No dashboard ou relatório, sinalizar oportunidades com campos críticos nulos (ex.: sem `created_date` ou sem `value`).

---

## 5. Outliers e Valores Limite

### 5.1 🔴 `value` negativo ou zero em massa

- **Risco:** Métricas de receita e modelo assumem valor de negócio; negativos podem ser erro; muitos zeros podem ser “não preenchido”.
- **Sugestão:**  
  - CHECK no DB: `value IS NULL OR value >= 0`.  
  - Na ingestão: rejeitar ou anular `value < 0`; para zero, aceitar mas permitir relatório “oportunidades com valor zero”.

### 5.2 🟡 `value` extremamente alto

- Ex.: "R$ 27.832.981,00" no CSV é válido; valores na ordem de trilhões podem ser digitação errada.
- **Sugestão:** Limite superior opcional (ex.: 1e12); acima disso gravar como null e logar.

### 5.3 🟡 `created_date` > `closed_date`

- Indica inconsistência; pode quebrar cálculo de ciclo.
- **Sugestão:** Validação na aplicação: se `closed_date` < `created_date`, usar `closed_date = null` ou `created_date` e logar.

### 5.4 🟡 `stage_timing_days` negativo ou muito alto

- Pipeline típico em centenas de dias; valores > 2000 ou negativos são suspeitos.
- **Sugestão:** Clamp ou null para fora de [0, 2000] e log em modo validação.

---

## 6. Problemas Estruturais

### 6.1 Duplicatas

- **Unicidade:** `(org_id, crm_hash)` na tabela `opportunities` (índice único). Upsert no webhook evita duplicata.
- **CSV:** Linhas com mesmo hash na mesma org sobrescrevem (process-upload faz delete por `upload_id` e insert). Sem `upload_id` em versões antigas, pode haver duplicata entre upload e webhook se o mesmo hash vier das duas fontes (upsert resolve).

### 6.2 Encoding e formato do CSV

- Delimitador `;`, aspas `"`, datas DD/MM/YYYY e valor "R$ X.XXX,XX" estão documentados e tratados em `parsePiperunCsv` e `parseBRLMoney`/`parseBRDate`.
- **Risco:** CSV em UTF-8 com BOM ou outro delimitador quebra o parse.  
- **Recomendação:** Detectar BOM e remover; validar que a primeira coluna parece "Hash" (ou lista conhecida de headers).

### 6.3 Atividades: link com oportunidade

- Atividades dependem de `linked_opportunity_hash` (preenchido pelo `link-activities`) ou `opportunity_id_crm`.  
- Se o CRM envia só `opportunity_id_crm` e o sistema espera hash, o link pode falhar.  
- **Recomendação:** Documentar formato esperado (hash vs ID) e, no link-activities, considerar matching por `opportunity_id_crm` quando hash não estiver disponível.

---

## 7. Validações Automáticas Sugeridas

### 7.1 No ingest (webhook)

- `org_id`: obrigatório, UUID válido, org existe.  
- `opportunities[]`: cada item com `crm_hash` (string não vazia após trim).  
- `value`: se presente, `number` finito e `>= 0`; senão `null`.  
- `status`: enum `open` | `won` | `lost` ou mapear variantes; senão `open` + warning.  
- `created_date`, `closed_date`: formato ISO ou YYYY-MM-DD; se ambos presentes, `closed_date >= created_date` (senão ajustar ou logar).  
- `activities[]`: não descartar por falta de link; inserir com `link_confidence: 'none'` e rodar linking depois; ou devolver `activities_skipped` com motivo.

### 7.2 No ingest (CSV PipeRun)

- Primeira linha com headers esperados (ex.: "Hash", "Funil", "Etapa").  
- Por linha: Hash não vazio; "Data de cadastro" e "Data de fechamento" no formato DD/MM/YYYY quando preenchidas.  
- "Valor de P&S": após parse, se numérico e < 0, gravar null e logar.  
- "Lead-Timing da etapa": só considerar número no formato esperado; senão null.

### 7.3 No banco (opcional)

- `opportunities.value` CHECK: `value IS NULL OR value >= 0`.  
- Trigger ou constraint: `closed_date IS NULL OR created_date IS NULL OR closed_date >= created_date`.

**Implementação:** O módulo `src/lib/crm/validate.ts` expõe `validateWebhookPayload`, `validateOpportunities`, `validateActivities`, `normalizeValue`, `normalizeStatus` e `parseDate`. O webhook já usa essas funções para normalizar `value` e `status` e devolve `warnings` no JSON quando há avisos de qualidade.

### 7.4 Pós-ingest (job ou painel)

- Relatório de qualidade: contagem de oportunidades por “campos nulos” (sem `created_date`, sem `value`, sem `stage_name`).  
- Listar atividades com `link_confidence = 'none'` e `created_at` recente para revisão.  
- Alertar se % de oportunidades com `value = 0` ou null subir acima de um limiar.

---

## 8. Plano de Ação Resumido

| Fase | Ação | Responsável |
|------|------|-------------|
| Curto | Implementar validação de `value` (>= 0, finito) e de status no webhook; retornar warnings para status desconhecido | Backend |
| Curto | Decidir política para atividades sem link (inserir com confidence 'none' vs rejeitar + contar) e expor no response | Backend |
| Curto | Documentar colunas CSV suportadas e aliases (Titulo/Título) no README ou em docs/ | Docs |
| Médio | Adicionar CHECK no DB para `value >= 0` e para `closed_date >= created_date` (migração) | DB |
| Médio | Relatório ou painel de “qualidade do CRM”: nulos, órfãs, valor zero | Produto |
| Contínuo | Logar e monitorar rejeições/ajustes (valor negativo, status desconhecido, datas invertidas) | Ops |

---

*Documento gerado pelo Data Quality Agent. Não altera dados; apenas analisa e recomenda.*
