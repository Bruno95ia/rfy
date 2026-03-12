# Integração SUPHO — Visão Sistêmica

Sistema de gestão contínua SUPHO integrado ao Revenue Engine. Ciclo em 6 etapas encadeadas e retroalimentadas.

**Metodologia e pilares:** ver [SUPHO-METODOLOGIA.md](./SUPHO-METODOLOGIA.md) para alinhamento com Kit Diagnóstico, Playbooks e Pilares (Cultura, Humano e Liderança, Comercial e Performance).

---

## 1. Fluxo operacional SUPHO

| Etapa | Nome | Função no sistema |
|-------|------|-------------------|
| 1 | **Diagnóstico** | Captura dados (pesquisas) → calcula índices (IC, IH, IP, ITSMO) → define nível (1–5) |
| 2 | **PAIP** | Prioriza gaps → define OKRs/KPIs e plano 90–180 dias → vincula KRs ao CRM |
| 3 | **Treinamentos** | Por pilar: Cultura → Comercial → Liderança (trilhas e conteúdo) |
| 4 | **Execução e rituais** | Cadência (check-in semanal, performance quinzenal, feedback mensal, governança trimestral) + registro de decisões e ações |
| 5 | **Performance** | Dados do CRM (Revenue Engine): MQL, SQL, conversão, CAC, taxa de ganho, ciclo, ticket, NPS — valida IP e PAIP |
| 6 | **Certificação** | Auditoria + evidências → nível Bronze/Prata/Ouro + validade e plano de manutenção |

O sistema “entrega tudo” quando: dados são coletados → transformados em índices (ITSMO) → convertidos em plano (PAIP) → executados via rituais → medidos no dashboard e no CRM — fechando o ciclo.

---

## 2. Módulos e entidades no sistema

### Módulo 1 — Diagnóstico (pesquisas)

| Entidade | Campos principais | Outputs |
|----------|-------------------|---------|
| Campanha diagnóstica | org_id, nome, data abertura/fechamento, status | — |
| Respondente | campanha_id, time/área, unidade, cargo, data | — |
| Perguntas | id, bloco (A/B/C), peso interno (1/2/3), texto | — |
| Respostas | respondente_id, pergunta_id, valor (1–5) | — |
| Resultado diagnóstico | campanha_id, IC, IH, IP, ITSMO, nível, gaps, subíndices | IC, IH, IP, ITSMO (0–100), Nível (1–5), ΔC-H, ΔC-P, ISE, IPT, ICL |

### Módulo 2 — Painel de Maturidade

| View | Fonte | Implementação |
|------|--------|----------------|
| Radar IC/IH/IP | Resultado diagnóstico | Gráfico radar (0–100) |
| Mapa por área | Resultado por time/área | Heatmap |
| Ranking itens críticos | Respostas médias &lt; 3,5 | Tabela ordenada |
| Textos executivos | Tabela de interpretação (ITSMO, IC, IH, IP, gaps, ISE, IPT, ICL) | Labels + texto para relatório |

### Módulo 3 — PAIP (plano)

| Entidade | Campos | Regras |
|----------|--------|--------|
| Plano PAIP | org_id, resultado_id, período (90–180 dias), status | Vinculado a um diagnóstico |
| Gap | plan_id, tipo, descrição, prioridade (ICE/RICE) | Priorizar por impacto/esforço |
| Objetivo | gap_id, texto | |
| KR | objetivo_id, texto, fonte (CRM/Forms/RH), indicador, meta, owner | Vincular KR a indicador no CRM |
| Ação 5W2H | kr_id, descrição, owner, prazo, evidência, status | Kanban/SLA |

### Módulo 4 — Execução (rituais)

| Entidade | Campos | Output |
|----------|--------|--------|
| Template de ritual | org_id, tipo (check-in semanal, performance quinzenal, feedback mensal, governança trimestral), cadência, pauta padrão | — |
| Ritual | template_id, data prevista, data realizada, presença, notas | — |
| Decisão/Ação | ritual_id, decisão, ação, responsável, prazo, status | Índice de Ritmo SUPHO (assiduidade, qualidade, execução) |

### Módulo 5 — Performance (CRM / Revenue Engine)

Mapeamento mínimo para conectar SUPHO aos números reais (já existentes no Revenue Engine):

| Área | Métricas (CRM) | Uso no SUPHO |
|-----|----------------|--------------|
| Marketing | MQL, SQL, conversão por etapa, CAC, origem | PAIP pode definir KRs sobre conversão/CAC |
| Vendas | Taxa de ganho, ciclo, ticket, forecast, pipeline coverage | IP validado por tendência; KRs puxam metas do CRM |
| Atendimento/CS | NPS/CSAT, tempo de resposta, churn/renovação | Relatório de Impacto antes/depois |

Tabelas existentes: `reports`, `opportunities`, `activities`, `org_unit_economics`. O Módulo 5 consome esses dados e opcionalmente `supho_kpi_mapping` (org_id, kpi_key, fonte, métrica).

**Conexão com o Revenue Engine (sistema do Bruno):**
- **Dashboard** (`/app/dashboard`): pipeline, fricções, forecast, benchmark — podem alimentar KRs do PAIP (ex.: “conversão +15%”, “ciclo -10%”).
- **Relatórios** (`/app/reports`): snapshot, pillar_scores, impact — base para Relatório de Impacto SUPHO (antes/depois).
- **Unit Economics** (`org_unit_economics`): CAC, LTV, win_rate — validação do IP e metas de performance.
- Para “PAIP com KRs vinculados ao CRM”, os KRs podem referenciar métricas já calculadas (ex.: `reports.snapshot_json`, `org_unit_economics.win_rate`).

### Módulo 6 — Certificação

| Entidade | Campos | Output |
|----------|--------|--------|
| Critério | dimensão (Humano/Cultura/Performance), texto, pontuação máx (0–3) | — |
| Evidência | run_id, critério_id, pontuação, anexo (ata, print, relatório) | — |
| Run de certificação | org_id, data, nível (Bronze/Prata/Ouro), validade, plano de manutenção | Dossiê de Certificação |

---

## 3. Fluxo funcional no app

- **Diagnóstico** (`/app/supho/diagnostico`): listar/criar campanhas, selecionar campanha, preencher respostas (1–5) por pergunta (perguntas padrão da migração 008), adicionar respondentes, clicar em **Calcular resultado** → chama `POST /api/supho/diagnostic/compute` e redireciona para o Painel de Maturidade.
- **Painel de Maturidade** (`/app/supho/maturidade`): exibe último resultado (radar IC/IH/IP, ITSMO, nível, textos executivos).
- **PAIP** (`/app/supho/paip`): listar e criar planos 90–180 dias (gaps, objetivos e KRs podem ser expandidos depois).
- **Rituais** e **Certificação**: páginas descritivas da metodologia; dados em `supho_ritual_*` e `supho_certification_*`.

Para o Diagnóstico ter perguntas disponíveis, aplique a migração **008_supho_default_questions.sql** (ou `npm run db:migrate`).

---

## 4. Fórmulas implementadas (código)

- **Escala:** Likert 1–5 → normalização 0–100: `(média - 1) / 4 * 100`.
- **Pesos ITSMO:** Cultura 0,40; Humano 0,35; Performance 0,25.
- **Blocos:** A = Cultura, B = Humano, C = Performance. Itens críticos com peso interno 3/2/1.
- **ITSMO** = IC×0,40 + IH×0,35 + IP×0,25.
- **Nível:** 0–39 Reativo; 40–59 Consciente; 60–74 Estruturado; 75–89 Integrado; 90–100 Evolutivo.
- **Subíndices:** ISE = média(A11, A12, B6); IPT = média(A2, A5, B8); ICL = média(A3, A6, B5).
- **Gaps:** ΔC-H = |IC − IH|; ΔC-P = |IC − IP|.

---

## 5. Entregáveis automáticos

1. **Resumo Executivo do Diagnóstico** — texto por faixa/nível (tabela de leitura executiva).
2. **Painel de Maturidade** — radar + heatmap + top gaps.
3. **PAIP** — plano 90–180 dias com KRs vinculados ao CRM.
4. **Registro de rituais** — atas + decisões + ações + SLAs.
5. **Relatório de Impacto** — antes/depois: ITSMO + KPIs do CRM.
6. **Dossiê de Certificação** — critérios + evidências + score + nível.

---

## 6. Requisitos mínimos de implantação

- Amostra diagnóstica válida: por área/sênioridade (mín. recomendado: 30% por área ou n≥8).
- Cadência de rituais registrada.
- Donos de indicador: cada KPI/OKR com owner, fonte e periodicidade.
- Base única: CRM + Formulários + RH (quando houver).
- Trilha por pilar: Cultura primeiro, depois Comercial e Liderança.

---

## 7. Tabela de leitura executiva (implementada em código)

Os textos por faixa/valor estão em `src/lib/supho/executive-text.ts` e são usados no Painel de Maturidade.

| Indicador   | Faixa/Valor | Interpretação SUPHO        | Uso no relatório        |
|------------|-------------|----------------------------|--------------------------|
| ITSMO_final| 0–39        | Nível 1 – Reativo          | Texto executivo por nível|
|            | 40–59       | Nível 2 – Consciente       |                         |
|            | 60–74       | Nível 3 – Estruturado     |                         |
|            | 75–89       | Nível 4 – Integrado       |                         |
|            | 90–100      | Nível 5 – Evolutivo       |                         |
| IC         | ≥85 / 70–84 / 50–69 / &lt;50 | Cultura sólida → frágil   | getExecutiveTextIC      |
| IH         | (idem)      | Alto engajamento → desconexão | getExecutiveTextIH  |
| IP         | (idem)      | Alta performance → reativa | getExecutiveTextIP   |
| Gap C-H / C-P | 0–5 / 6–10 / &gt;10 | Alinhado → Desconexão   | getExecutiveTextGapCH/CP |
| ISE, IPT, ICL | ≥4 / 3–3,9 / &lt;3 (escala 1–5) | Textos por subíndice  | getExecutiveTextISE/IPT/ICL |

Matriz visual (perfil predominante): Cultura&gt;Humano&gt;Performance → “Inspiradora, porém inconsistente”; Humano&gt;Cultura&gt;Performance → “Cuidada, mas sem direção clara”; etc. Implementado em `getPerfilPredominante` e `getExecutiveTextPerfil`.

---

## 8. Referências de mercado (discurso)

- Engajamento prediz performance (Gallup Q12).
- Clima/confiança com dimensões claras (GPTW Trust Model).
- Saúde organizacional como indicador de performance sustentada (McKinsey OHI).
- Segurança psicológica como condição para aprendizado (Edmondson).

*“O ITSMO integra essas linhas em um índice único, aplicável e acionável, amarrado a plano e execução.”*
