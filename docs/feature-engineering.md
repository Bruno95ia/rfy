# Feature Engineering para Previsão de Vendas B2B

Documento de análise e sugestão de features para aumentar a capacidade preditiva dos modelos de P(win), risk_delay e expected_close_days, com base nos dados disponíveis no CRM (opportunities + activities).

---

## 1. Dados disponíveis hoje

| Fonte | Campos |
|-------|--------|
| **opportunities** | id, org_id, crm_hash, pipeline_name, stage_name, stage_timing_days, owner_email, owner_name, company_name, title, value, created_date, closed_date, status, tags |
| **activities** | linked_opportunity_hash, type, title, owner, start_at, due_at, done_at, created_at_crm, status, link_confidence |

## 2. Features já utilizadas (feature_builder.py)

- **stage_name** (one-hot)
- **days_without_activity**, **age_days**, **value**, **stage_timing_days**
- **activity_count_last_7**, **activity_count_last_14**, **activity_count_last_30**
- **seller_win_rate**, **seller_avg_cycle**
- **org_median_cycle**, **org_win_rate**, **org_proposal_stagnation_rate**
- **deviation_vs_org_cycle**, **deviation_vs_cluster_cycle**
- **stage_position_percentage**

---

## 3. Novas features sugeridas

Para cada feature: **por que ajuda**, **como calcular** e **onde armazenar**.

---

### 3.1 Engajamento e velocidade

| Feature | Descrição |
|--------|-----------|
| **activity_velocity_7** | Número de atividades nos últimos 7 dias (ou taxa por dia). |
| **activity_velocity_14** | Idem, janela 14 dias. |
| **days_since_last_activity_bucket** | Categoria: 0–3, 4–7, 8–14, 15–30, 31+. |

**Por que ajuda:** Em B2B, deal “quente” tem atividade recente e frequente; estagnação indica risco de perda. Velocidade captura momentum melhor que só contagem.

**Como calcular:**
- `activity_velocity_7 = activity_count_last_7 / 7` (ou só activity_count_last_7 já existe; velocity = count/7).
- `days_since_last_activity_bucket`: discretizar `days_without_activity` em bins (0–3 → 0, 4–7 → 1, …) ou one-hot.

**Onde armazenar:** Calculada em tempo no **feature_builder**; não persistir em tabela (evita duplicar `days_without_activity`). Se quiser auditoria: **feature_snapshots** (jsonb por org/date).

---

### 3.2 Tipo de atividade (activities.type)

| Feature | Descrição |
|--------|-----------|
| **count_meetings_last_30** | Quantidade de atividades com type contendo "reunião", "meeting", "call". |
| **count_emails_last_30** | Idem para "email", "e-mail". |
| **count_tasks_done_last_30** | Tarefas concluídas (done_at preenchido) nos últimos 30 dias. |
| **ratio_meetings_to_total_30** | count_meetings / total_activities_last_30. |

**Por que ajuda:** Em B2B, reuniões e calls indicam engajamento qualificado; apenas emails pode indicar deal mais frio. Proporção meeting/total é sinal de “qualidade” do touch.

**Como calcular:** No carregamento de activities, além de `done_at/start_at/created_at_crm`, trazer `type`. Por hash, filtrar atividades em janela 30d e:
- Contar por tipo (normalizar type para minúsculas e buscar substrings ou mapear para categorias meeting/email/task).
- ratio_meetings_to_total_30 = count_meetings / max(1, activity_count_last_30).

**Onde armazenar:** Calculada no **feature_builder** a partir de **activities** (já existe link por `linked_opportunity_hash`). Persistência: só em **feature_snapshots** se desejar histórico; o dado bruto continua em **activities**.

---

### 3.3 Valor e ticket (B2B)

| Feature | Descrição |
|--------|-----------|
| **value_log** | log1p(value). |
| **value_vs_org_median_ticket** | value / median(value) por org (deals fechados ou abertos). |
| **value_percentile_org** | Percentil do value dentro da org (0–100). |

**Por que ajuda:** Ticket alto em B2B tem dinâmica diferente (mais stakeholders, ciclo longo). log(value) suaviza outliers; comparação com mediana/percentil da org evita que “tamanho da empresa” domine e captura deal grande vs pequeno dentro do mesmo contexto.

**Como calcular:**
- value_log = np.log1p(value).
- Por org: median_ticket_org = opportunities[org].value.median(); value_vs_org_median_ticket = value / max(1e-6, median_ticket_org).
- value_percentile_org: scipy.stats.percentileofscore(org_values, value).

**Onde armazenar:** **org_profiles** já tem `ticket_median`; pode adicionar `ticket_p25`, `ticket_p75` na mesma tabela. Features por deal calculadas no **feature_builder**; não criar coluna em opportunities (value já existe).

---

### 3.4 Tempo na etapa e pipeline

| Feature | Descrição |
|--------|-----------|
| **stage_timing_vs_org_median** | stage_timing_days / mediana de stage_timing_days na mesma stage (por org). |
| **is_stage_stuck** | 1 se stage_timing_days > percentil 75 da etapa na org. |
| **pipeline_name_encoded** | Label encoding ou one-hot de pipeline_name (quando houver múltiplos funis). |

**Por que ajuda:** Deal parado na mesma etapa por tempo anormal indica bloqueio ou perda de interesse. Comparar com a mesma etapa na org reduz viés de “etapas naturalmente longas”.

**Como calcular:**
- Por org e stage_name: median_stage_timing = groupby(org, stage).stage_timing_days.median(); stage_timing_vs_org_median = stage_timing_days / max(1, median_stage_timing).
- is_stage_stuck = 1 se stage_timing_days >= np.percentile(org_stage_values, 75) else 0.
- pipeline_name: get_dummies ou LabelEncoder (ou hash para muitas categorias).

**Onde armazenar:** Mediana/percentis por (org, stage) podem ficar em cache no **feature_builder** (derivados de opportunities) ou em tabela **org_stage_baselines** (nova, opcional). Features por deal no **feature_builder**; pipeline_name já existe em **opportunities**.

---

### 3.5 Histórico e concentração do vendedor

| Feature | Descrição |
|--------|-----------|
| **seller_open_load** | Número de deals open do mesmo owner no momento (ou na data de referência). |
| **seller_pipeline_value** | Soma do value dos deals open do owner. |
| **seller_win_rate_rolling_90d** | Win rate do vendedor nos últimos 90 dias (por data de fechamento). |

**Por que ajuda:** Vendedor sobrecarregado tende a negligenciar deals; pipeline concentrado em poucos vendedores afeta previsão. Win rate recente é mais representativo que histórico total.

**Como calcular:**
- Na data de referência (ou “hoje”): por owner, contar e somar opportunities com status=open; seller_open_load = count, seller_pipeline_value = sum(value). Exige snapshot por data ou cálculo no momento do treino/inferência.
- seller_win_rate_rolling_90d: filtrar won/lost com closed_date em [ref-90d, ref], por owner, win_rate = won / (won+lost).

**Onde armazenar:** **seller_stats** hoje é por owner (hash); pode estender em memória (feature_builder) com open_load e pipeline_value calculados na hora. Para rolling 90d: ou calcular no feature_builder a partir de opportunities com closed_date, ou criar tabela **seller_daily_stats** (org_id, owner_hash, date, open_count, pipeline_value, win_rate_90d) atualizada por job. Preferência: calcular no **feature_builder** a partir de opportunities para evitar nova tabela no primeiro momento.

---

### 3.6 Empresa e título (B2B)

| Feature | Descrição |
|--------|-----------|
| **company_repeat** | 1 se company_name já apareceu em outra opportunity (won/lost) na mesma org. |
| **title_has_decision_maker** | 1 se title contém termos como "diretor", "gerente", "ceo", "c-level", "comprador". |

**Por que ajuda:** Empresa recorrente pode ter maior probabilidade de fechamento; contato com decisor tende a acelerar e aumentar P(win).

**Como calcular:**
- company_repeat: set(company_name) de opportunities (org) com status in ('won','lost'); company_repeat = 1 se company_name in set else 0. Para “open” usar apenas histórico até a data do deal (evitar data leakage).
- title_has_decision_maker: lista de termos; normalizar title (lower, strip); 1 se qualquer termo in title else 0.

**Onde armazenar:** company_repeat e title_has_decision_maker no **feature_builder** (opportunities já tem company_name, title). Não precisa nova tabela; para company_repeat usar apenas deals fechados antes da data de referência do deal.

---

### 3.7 Tags e estágio

| Feature | Descrição |
|--------|-----------|
| **tags_count** | Número de tags (split por vírgula ou “;”). |
| **has_priority_tag** | 1 se tags contém “prioridade”, “hot”, “urgente”, etc. |
| **stage_progression_speed** | stage_position_percentage / max(1, age_days) (progresso percentual por dia). |

**Por que ajuda:** Tags podem sinalizar priorização comercial; progressão rápida no funil indica deal saudável.

**Como calcular:**
- tags: str ou null; tags_count = len([x for x in (tags or "").split(",") if x.strip()]); has_priority_tag = 1 if any(kw in (tags or "").lower() for kw in ["prioridade","hot","urgente"]) else 0.
- stage_progression_speed = stage_position_percentage / max(1, age_days).

**Onde armazenar:** **opportunities** já tem **tags**; features derivadas no **feature_builder**. Nada a persistir além do que já existe.

---

### 3.8 Atividades atrasadas e qualidade do link

| Feature | Descrição |
|--------|-----------|
| **overdue_activities_count** | Quantidade de atividades com due_at no passado e done_at nulo (ou status não “concluído”). |
| **pct_activities_high_confidence** | % de atividades do deal com link_confidence = 'high'. |

**Por que ajuda:** Tarefas atrasadas podem indicar desorganização ou desengajamento; muitos links “low” podem indicar que as atividades não são do mesmo deal (ruído).

**Como calcular:**
- Carregar activities com due_at, done_at, link_confidence. Por hash: overdue_activities_count = count where due_at < ref and (done_at is null or status != concluído); pct_activities_high_confidence = count(link_confidence=='high') / max(1, len(activities)).

**Onde armazenar:** Calculado no **feature_builder** a partir de **activities**. Incluir no ETL de activities (já existe) os campos due_at e link_confidence no SELECT usado pelo ai-service.

---

### 3.9 Resumo de origem dos dados e persistência

| Feature | Fonte | Onde armazenar |
|--------|--------|----------------|
| activity_velocity_7/14, days_since_last_activity_bucket | opportunities + activities | feature_builder; opcional feature_snapshots |
| count_meetings_last_30, ratio_meetings_to_total_30, etc. | activities (type) | feature_builder; activities já existe |
| value_log, value_vs_org_median_ticket, value_percentile_org | opportunities + org | feature_builder; org_profiles (ticket_median) |
| stage_timing_vs_org_median, is_stage_stuck, pipeline_name_encoded | opportunities | feature_builder; opcional org_stage_baselines |
| seller_open_load, seller_pipeline_value, seller_win_rate_rolling_90d | opportunities | feature_builder (ou seller_daily_stats no futuro) |
| company_repeat, title_has_decision_maker | opportunities | feature_builder |
| tags_count, has_priority_tag, stage_progression_speed | opportunities | feature_builder |
| overdue_activities_count, pct_activities_high_confidence | activities | feature_builder; garantir SELECT com due_at, link_confidence |

---

## 4. Ordem sugerida de implementação

1. **Fase 1 (rápido, dados já disponíveis):** value_log, tags_count, has_priority_tag, stage_progression_speed, company_repeat, title_has_decision_maker.  
   - Queries: incluir `company_name`, `title`, `tags` no SELECT de opportunities no trainer e no endpoint de predição.

2. **Fase 2 (activities):** Incluir `type`, `due_at`, `link_confidence` no carregamento de activities; implementar count_meetings_last_30, ratio_meetings_to_total_30, overdue_activities_count, pct_activities_high_confidence.

3. **Fase 3 (agregações por org/seller):** value_vs_org_median_ticket, value_percentile_org, stage_timing_vs_org_median, is_stage_stuck, seller_open_load, seller_pipeline_value, seller_win_rate_rolling_90d.  
   - Considerar **org_stage_baselines** ou ampliar **org_profiles** se quiser persistir baselines.

4. **Fase 4 (opcional):** activity_velocity_7/14, days_since_last_activity_bucket, pipeline_name_encoded (útil se houver múltiplos funis).

---

## 5. Cuidados (B2B e data leakage)

- **Data de referência:** Para treino, usar como “hoje” a data de fechamento (closed_date) ou a data da última atividade relevante, para não usar informação futura.
- **company_repeat:** Usar apenas oportunidades com closed_date < ref (ou status won/lost com closed_date) para definir “já apareceu”.
- **seller_win_rate_rolling_90d:** Calcular com closed_date no passado em relação ao deal.
- **Split temporal:** Manter split temporal no trainer (últimos N% por created_date como validação) para não inflar métricas.

Este documento pode ser usado como spec para evoluir o `feature_builder.py` e as queries de carga em `trainer.py` e no endpoint de predição do ai-service.
