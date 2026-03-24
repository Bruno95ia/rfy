# Context Pack RFY — v1 (atualização)

Documento de alinhamento produto, pricing, diagnóstico SUPHO/ITSMO e roadmap. Última revisão conceitual: março/2026. Taxa de referência para conversão USD→BRL: **1 USD = 5,275 BRL** (ajustar quando política comercial mudar).

---

## 1. Perguntas do diagnóstico (SUPHO / ITSMO)

### 1.1 Pacote Core (congelado para comparações 90/90)

- **Objetivo:** permitir comparações **90/90** (evolução entre duas janelas de 90 dias) com base estável.
- **Definição:** pacote **Core** de **15–20** itens Likert (escala 1–5), distribuídos pelos **blocos A / B / C** do ITSMO:
  - **A** — Cultura organizacional (IC)
  - **B** — Humano e liderança (IH)
  - **C** — Comercial e performance (IP)
- **Estado no produto:** o seed inicial em `008_supho_default_questions.sql` materializa um conjunto **Core** de **15 perguntas** globais (`org_id` nulo), com `item_code` para subíndices (ISE, IPT, ICL). Campanhas devem **priorizar este Core** quando a comparação 90/90 for requisito; evoluções do texto das perguntas devem ser versionadas (nova migração), não editadas ad hoc em produção.

### 1.2 Regras de `confidence_level` (qualidade da leitura)

| Nível | Critérios (cumulativos sugeridos) |
|--------|-----------------------------------|
| **Alto** | Taxa de resposta **≥ 70%** dos convidados **e** **≥ 80%** de cobertura **em cada bloco** A, B e C (pelo menos uma resposta válida por item Core do bloco). |
| **Médio** | Resposta entre **50% e &lt; 70%** **ou** cobertura **parcial** em algum bloco (ex.: um bloco abaixo do limiar Alto). |
| **Baixo** | Resposta **&lt; 50%** **ou** blocos **incompletos** de forma a impedir IC/IH/IP equilibrados no Core. |

> **Nota de implementação:** o campo `confidence_level` deve ser calculado no fechamento da campanha ou no cálculo do diagnóstico, com base em respondentes, itens respondidos por bloco e, se aplicável, pesos `internal_weight`.

### 1.3 Lembrete de reavaliação (90 dias)

- **Regra de negócio:** após o encerramento de cada **campanha** de diagnóstico, agendar **lembrete automático** para **reavaliação aos 90 dias** (nova campanha ou reabertura alinhada ao Core).
- **Objetivo:** fechar o ciclo **90/90** e manter cadência de maturidade.

---

## 2. ICP e pricing (BRL)

### 2.1 Critérios de ICP (resumo)

| Perfil | Critérios orientadores |
|--------|-------------------------|
| **Indústria** | Processos rígidos; **ERP/CRM integrados**; **≥ 200 colaboradores**; ciclo de vendas longo. |
| **Tech / Serviços** | Vendas consultivas B2B; **CRM ativo**; **≥ 10 usuários** no time comercial/CS; **≥ 100 registros** (atividades/deals) **por semana** no CRM ou equivalente. |

### 2.2 Faixas de preço (mensal, BRL)

Fórmula genérica: **preço = base + (preço por usuário × usuários)**.

| Plano | Base (R$/mês) | Por usuário (R$/mês) |
|-------|----------------|------------------------|
| **Starter** | 786 | 158 |
| **Growth** | 1.577 | 132 |
| **Enterprise** | 5.270 | 211 |

*(Valores derivados da política comercial com taxa 1 USD = 5,275 BRL.)*

### 2.3 Custos marginais estimados (ordem de grandeza)

| Item | Faixa indicativa |
|------|------------------|
| +1 usuário | R$ 132–211 / mês (conforme plano) |
| +100 colaboradores (escopo / volume) | ≈ R$ 264 / mês |
| +1 integração | ≈ R$ 2.638 setup **+** R$ 264 / mês |
| +1 unidade (filial / org filha) | ≈ R$ 528 / mês |

### 2.4 Metas econômicas

- **Margem bruta:** objetivar **≥ 70%**.
- **Payback do fee de onboarding** (faixa **R$ 10.550 – 26.375**): **até 3 meses**.

---

## 3. Estado dos módulos e roadmap

| Prioridade | Fase | Escopo (marcar como acordado) |
|------------|------|--------------------------------|
| **P0** | Piloto | Integração **CRM/ERP** + **upload CSV** (com **reprocessamento**); diagnósticos **SUPHO/ITSMO**; **alertas** e **relatórios agendados**; **reprocessamento de uploads**. |
| **P1** | Pós-piloto | **Billing Stripe** (tiers a definir); **rituais + decisões** integrados ao **PAIP**; **base de conhecimento com IA**. |
| **P2** | Futuro | Painel de **previsões avançadas**; **SSO** / permissões finas; **certificação** / marketplace. |

---

## 4. Custos e métricas (unit economics)

### 4.1 Custos médios mensais por organização (referência)

| Categoria | Ordem de grandeza |
|-----------|-------------------|
| Infraestrutura | ~**R$ 95** / org / mês |
| Mensageria | ~**R$ 4,75** por mil e-mails |
| IA | ~**R$ 2,11** por milhão de tokens |
| Suporte | Alocar conforme modelo (não fixado aqui) |

### 4.2 Métricas a instrumentar

- Tempo de **onboarding** (time-to-first-value).
- **Tickets de suporte** / mês por org.
- **Custo mensal de infra** por org.
- **Custo por envio** e **armazenamento**.
- **Usuários ativos** / semana.
- **Taxa de resposta** das campanhas SUPHO.

---

## 5. Rituais e PAIP

- **Regra operacional:** cada **decisão** registrada em **rituais** deve gerar **ação** no plano **30 / 60 / 90** (PAIP ou equivalente), com **responsável** e **data de conclusão** explícitos.
- Evitar decisões órfãs: decisão sem ação vinculada é exceção a justificar (ex.: apenas informativa).

---

## 6. Outras observações

### 6.1 Core do produto (confirmado)

Inclui, entre outros: integrações **CRM/ERP**, **reprocessamento** de dados, **alertas**, **relatórios agendados**, **base de conhecimento**, **diagnósticos SUPHO**, **reavaliação 90/90**, **rituais e decisões**. Itens como **SSO**, **modelos preditivos avançados** e **certificação** são tratados como **nice-to-have** para fases posteriores.

### 6.2 Métricas já coletadas vs. a instrumentar

- **Já coletadas automaticamente (direção):** métricas de **time-to-value**, **adoção**, **taxa de resposta** de campanhas, **deals com próximo passo**, **rituais executados** (conforme módulos ativos).
- **A reforçar:** **baseline** inicial, **redução de fricções** ao longo do tempo e **execução das decisões** (fechamento do loop decisão → ação).

---

## Referências no repositório

- **Na aplicação (RFY):** rota autenticada `/app/settings/context-pack` (UI com o mesmo conteúdo resumido).
- Perguntas Core SUPHO: `supabase/sql/migrations/008_supho_default_questions.sql`
- Templates de contexto por cliente: `docs/contexto-organizacao/`
- Política de dados: `docs/DATA_AND_MODEL_POLICY.md`
- Métricas RFY: `docs/METRICAS_RFY_DEFINICOES.md`
