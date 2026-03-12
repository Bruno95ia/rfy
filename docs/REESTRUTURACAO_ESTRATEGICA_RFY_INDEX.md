# Reestruturação Estratégica — RFY como Sistema de Governança de Receita

**Documento:** Proposta de reposicionamento e reestruturação estratégica do SaaS RFY  
**Base:** Análise do documento *O que o SaaS RFY oferece* e da artefatura técnica existente  
**Data:** Fevereiro/2026

---

## Resumo executivo

O RFY deixa de ser um **SaaS de análise de fricções** e passa a ser um **Sistema de Governança de Receita** centrado em um único número: o **RFY Index** — percentual de Receita Confiável nos próximos 30 dias, calculado de forma independente da data de fechamento declarada no CRM. O produto gira em torno desse índice como referência oficial para decisão executiva semanal e substituição do “feeling” do CEO.

---

# 1. Novo posicionamento

## 1.1 Proposta de valor

| Antes | Depois |
|-------|--------|
| Revenue Friction Engine — análise de fricções de receita | **Sistema de Governança de Receita baseado no RFY Index** |
| Múltiplos indicadores (valor em risco, saúde, SUPHO, forecast…) | **Um número central:** RFY Index = % de Receita Confiável (30 dias) |
| Orientado a “encontrar problemas no pipeline” | Orientado a **“quanto da receita podemos confiar”** e **decisão executiva** |

## 1.2 Definição oficial

- **RFY Index** = **Percentual de Receita Confiável nos próximos 30 dias**
  - Calculado **independentemente** da data de fechamento declarada no CRM (evita manipulação de datas).
  - Baseado em probabilidade real de conversão (histórico, tempo por etapa, estagnação, concentração de risco, ICP, atividades).
  - Representa a previsão estatística do que de fato tende a fechar nos próximos 30 dias em relação ao que está declarado/esperado.

- **Receita Confiável (30 dias)** = Montante em R$ que o modelo considera realizável nos próximos 30 dias.
- **Receita Inflada** = Diferença entre o valor declarado/esperado no CRM e a Receita Confiável (30 dias).

### 1.3 Posicionamento para venda Premium

Para o **plano premium**, o RFY é posicionado como:

**“Control Tower de Receita + Maturidade Organizacional”**

- **Control Tower de Receita** — RFY Index, Receita Confiável (30d), Receita Inflada, ritual executivo semanal e Top 3 decisões. O “painel de controle” que substitui o feeling e vira o número oficial de receita.
- **Maturidade Organizacional** — SUPHO (ITSMO, pilares Cultura/Humano/Performance), diagnóstico, PAIP, rituais e certificação. Responde “como está a organização para sustentar essa receita e evoluir”.

O premium entrega os dois: governança de receita **e** diagnóstico de maturidade, com ritos e playbooks para evoluir. O plano base pode focar só no Control Tower (RFY Index); o premium agrega Maturidade como diferencial de preço e retenção.

---

# 2. Objetivo estratégico

O RFY deve:

1. **Substituir o feeling do CEO** — O RFY Index é o número que responde “quanto podemos contar de receita” sem depender de intuição ou datas de fechamento declaradas.
2. **Ser o número oficial de receita confiável** — Único indicador de referência para planejamento, board e decisões de alocação.
3. **Servir de base para decisão executiva semanal** — Reunião de governança de receita guiada pelo índice e pelas 3 decisões prioritárias para aumentá-lo.
4. **Criar linguagem própria** — Termos como “RFY Index”, “Receita Confiável”, “Receita Inflada” e “distorção de pipeline” passam a ser o vocabulário padrão da organização.

---

# 3. Estrutura obrigatória do novo dashboard

O dashboard é reorganizado para **começar** com o que importa para governança de receita. Todo o restante é secundário.

## 3.1 Ordem obrigatória (topo da página)

| # | Bloco | Descrição | Destaque |
|---|--------|-----------|----------|
| 1 | **RFY Index** | Um único número em destaque máximo (ex.: **72%**). Percentual de Receita Confiável nos próximos 30 dias. | Hero principal; tamanho e contraste máximos |
| 2 | **Receita Confiável (30 dias)** | Valor em R$ da receita esperada nos próximos 30 dias (previsão estatística). | Card grande, logo abaixo do índice |
| 3 | **Receita Inflada** | Diferença em R$ entre “declarado/esperado” e Receita Confiável. Ex.: “R$ 480 mil declarados vs R$ 345 mil confiáveis → R$ 135 mil inflados”. | Card claro; linguagem executiva |
| 4 | **Evolução do RFY (últimos 90 dias)** | Gráfico de linha: RFY Index ao longo do tempo. Tendência e comparação com meta (se houver). | Gráfico compacto, sempre visível no topo |
| 5 | **Top 3 decisões executivas para aumentar o RFY** | Lista priorizada: decisão, responsável, impacto esperado no índice. Acionável. | Cards com CTA/responsável |

## 3.2 Conteúdo secundário (abaixo ou em abas)

- **Detalhe do pipeline** — Breakdown por etapa, por vendedor, concentração (suporte às decisões).
- **Intervenções prioritárias** — Renomeadas para “Ações para reduzir Receita Inflada” ou “Onde atuar para aumentar o RFY”.
- **Benchmark** — Comparação do RFY Index com benchmark de mercado (quando disponível).
- **Histórico de decisões e ritual** — Últimas reuniões, decisões tomadas, evolução do índice pós-decisão.

## 3.3 O que não aparece no topo

- SUPHO, ITSMO, pilares (IC/IH/IP) — movidos para área de “Maturidade” ou “Diagnóstico”, não no fluxo principal de governança de receita.
- Múltiplos KPIs de “saúde”, “valor em risco”, “receita antecipável” sem ligação direta ao RFY Index — unificados ou simplificados sob o guarda-chuva do índice.
- Unit Economics, ICP, LTV/CAC — mantidos em seção específica (ex.: “Negócio” ou “Métricas”), não no topo.

---

# 4. Ajustes conceituais e linguagem

## 4.1 Substituição de termos

| Evitar (técnico / antigo) | Usar (executivo / novo) |
|---------------------------|--------------------------|
| Fricção | **Receita Inflada** / **Ilusão de Receita** / **Distorção de Pipeline** |
| Valor em risco | Parte da **Receita Inflada** ou “Receita em risco (não confiável)” |
| Receita antecipável | “Receita recuperável” (se mantido) ou incorporado na narrativa do RFY Index |
| Forecast ajustado vs bruto | **Receita Confiável (30d)** vs **Declarado no CRM** |
| P(win), probabilidade de fechamento | “Probabilidade de conversão” ou apenas explicado por “com base no histórico e no comportamento do deal” |
| Pipeline bruto | **Receita declarada** / **Expectativa declarada** |

## 4.2 Princípios de narrativa

- **Foco financeiro:** Tudo que for mostrado deve responder “quanto dinheiro” e “o que fazer para melhorar o índice”.
- **Sem jargão de ML:** Evitar “P(win)”, “cluster”, “modelo treinado” na interface; usar “previsão baseada em dados” ou “índice calculado com base no histórico”.
- **Uma história:** “Seu RFY Index está em 72%. Isso significa que 72% da receita que você espera nos próximos 30 dias é estatisticamente confiável. O restante (Receita Inflada) pode não materializar se nada for feito.”

---

# 5. Modelo do RFY Index (estrutura matemática)

## 5.1 Objetivo do cálculo

- **Input:** Pipeline aberto (por org), com dados de oportunidades e atividades.
- **Output:** 
  - **Receita Confiável (30 dias)** = Σ (por deal) do valor esperado a ser realizado **nos próximos 30 dias**.
  - **RFY Index** = (Receita Confiável 30d / Receita Declarada nos próximos 30d) × 100%, ou equivalente definido abaixo.

A data de fechamento declarada no CRM **não** é usada como verdade; apenas como um sinal opcional (ex.: peso baixo) para evitar que o índice seja manipulável.

## 5.2 Insumos do modelo (probabilidade real)

O modelo deve considerar:

1. **Conversão histórica** — Por etapa, por perfil de vendedor/org (win rate por etapa, tempo médio na etapa).
2. **Tempo médio por etapa** — Deals que já passaram do tempo médio na etapa têm probabilidade de conversão reduzida (ou maior peso de “atraso”).
3. **Estagnação** — Dias sem atividade; quanto maior, menor a probabilidade de fechamento nos próximos 30 dias.
4. **Concentração de risco** — Muitos deals em poucos vendedores ou poucos clientes aumenta a variância; pode ser usado para ajustar confiança do índice (ex.: intervalo de confiança).
5. **Alinhamento ao ICP (Ideal Customer Profile)** — Deals com perfil mais alinhado ao ICP têm maior probabilidade de conversão (quando o modelo de ICP existir).
6. **Comportamento de atividades** — Volume e tipo de atividades recentes (reuniões, calls, tarefas concluídas) como sinal de engagement e probabilidade de fechamento em 30 dias.

## 5.3 Estrutura matemática proposta

### 5.3.1 Notação

- \( i \) = deal (oportunidade aberta)
- \( V_i \) = valor do deal \( i \)
- \( P_i(\text{win}) \) = probabilidade de ganhar o deal (modelo atual, já existente)
- \( P_i(\text{close in 30d} \mid \text{win}) \) = probabilidade de fechamento **nos próximos 30 dias** dado que o deal será ganho (novo componente)

### 5.3.2 Receita esperada nos próximos 30 dias (por deal)

\[
E[R_i^{30d}] = V_i \cdot P_i(\text{win}) \cdot P_i(\text{close in 30d} \mid \text{win})
\]

- **Receita Confiável (30 dias)** da organização:
\[
R_{\text{confiável}}^{30d} = \sum_i E[R_i^{30d}]
\]

- **Receita declarada (30 dias)** = soma dos valores dos deals que o CRM ou o processo declara como “fechamento nos próximos 30 dias”. Se não houver data de fechamento declarada, pode-se usar:
  - **Opção A:** Soma do pipeline total que “deveria” fechar em 30d por algum critério (ex.: etapa final + data prevista).
  - **Opção B:** Usar como denominador a **Receita Confiável** + um “incremental inflado” estimado (ex.: pipeline que está em 30d mas com baixa P(close in 30d)).

Para **evitar dependência de datas manipuláveis**, recomenda-se:

- **RFY Index** = percentual da **expectativa realista** em relação a um **baseline de referência**.
- **Baseline de referência (30d):**  
  \( B^{30d} = \sum_i V_i \cdot \mathbb{1}[\text{deal } i \text{ considerado “em janela de 30d” por regra neutra}] \), onde a regra “em janela de 30d” **não** usa data de fechamento do CRM; usa apenas:
  - etapa do deal (ex.: últimas etapas),
  - tempo na etapa (ex.: dentro do percentil 50–75 da org),
  - e/ou P(win) acima de um limiar.

Então:
\[
\text{RFY Index} = \frac{R_{\text{confiável}}^{30d}}{B^{30d}} \times 100\% \quad \text{(se } B^{30d} > 0)
\]

Ou, alternativamente, definir **RFY Index** como percentual de “receita que podemos confiar” em relação ao total declarado/esperado para 30d:

\[
\text{Receita Declarada}^{30d} = \text{soma dos valores dos deals que a empresa declara para 30d}
\]
\[
\text{RFY Index} = \frac{R_{\text{confiável}}^{30d}}{\max(\text{Receita Declarada}^{30d},\, R_{\text{confiável}}^{30d})} \times 100\%
\]

(Se Receita Declarada for 0 ou indefinida, usar apenas \( R_{\text{confiável}}^{30d} \) e exibir o índice como “N/A” ou como “Receita Confiável = R$ X” sem percentual até ter baseline.)

### 5.3.4 Modelagem de \( P_i(\text{close in 30d} \mid \text{win}) \)

- **Regressão de tempo até fechamento:** Usar modelo de regressão (já existe `expected_close_days` no código) para prever “dias até fechamento”. Então:
  \[
  P_i(\text{close in 30d} \mid \text{win}) = P(\text{dias até fechamento} \leq 30)
  \]
  aproximado por CDF empírica ou distribuição (ex.: log-normal) dos dias até fechamento na base histórica.

- **Alternativa simplificada:**  
  \( P_i(\text{close in 30d} \mid \text{win}) = f(\text{etapa}, \text{dias na etapa}, \text{dias sem atividade}) \) com regras ou modelo leve (ex.: árvore) treinado com histórico de deals fechados (tempo entre “hoje” e fechamento).

- **Estagnação:** Redutor direto: por exemplo \( \exp(-\lambda \cdot \text{dias_sem_atividade}) \) ou degrau (ex.: 0.8 se &lt; 7d, 0.5 se 7–14d, 0.2 se &gt; 14d).

- **Concentração:** Não altera \( E[R_i^{30d}] \), mas pode alterar **intervalo de confiança** do RFY Index (ex.: “72% ± 5%” quando há muita concentração).

### 5.3.5 Implementação em fases

| Fase | Componente | Descrição |
|------|-------------|-----------|
| 1 | **P(win)** | Já existe (classificador). Manter. |
| 2 | **P(close in 30d \| win)** | Regressão de dias até fechamento + CDF em 30d; ou regras por etapa/estagnação. |
| 3 | **Baseline 30d** | Definir regra neutra (sem data de fechamento do CRM) para “pipeline em janela 30d”. |
| 4 | **RFY Index** | \( R_{\text{confiável}}^{30d} \), Receita Inflada, RFY Index % e exibição no dashboard. |

---

# 6. Ritual executivo

## 6.1 Reunião semanal guiada pelo RFY

- **Cadência:** Semanal (fixa na agenda).
- **Duração sugerida:** 30–45 min.
- **Agenda mínima:**
  1. Apresentar **RFY Index** da semana e **evolução nos últimos 90 dias**.
  2. Apresentar **Receita Confiável (30 dias)** e **Receita Inflada**.
  3. Revisar **Top 3 decisões executivas** da semana anterior (status, responsável).
  4. Definir **Top 3 decisões** para a próxima semana (com responsável e impacto esperado no índice).
  5. (Opcional) Comparar com **benchmark de mercado** se disponível.

## 6.2 Responsável por decisão

- Cada decisão executiva deve ter **um responsável** e **prazo** (ex.: “Reativar 5 deals em proposta — João — até sexta”).
- O sistema deve permitir registrar responsável e prazo (campos no banco ou integração com ferramenta de gestão).

## 6.3 Histórico de melhoria do índice

- Manter série temporal do **RFY Index** (ex.: semanal) e, quando possível, vincular decisões tomadas a variações do índice (ex.: “Após decisão X, índice subiu 3 pontos em 2 semanas”).
- Exibir no dashboard: **Evolução do RFY (90 dias)** e link para histórico de reuniões/decisões.

## 6.4 Benchmark de mercado

- Quando houver amostra suficiente (cluster/segmento), exibir: “Seu RFY Index: 72%. Mediana do seu segmento: 68%.” (ou percentil).
- Manter anonimato e k-anonymity (ex.: ≥ 5 empresas no cluster).

---

# 7. Evolução estratégica (fases de produto)

| Fase | Objetivo | Entregas |
|------|----------|----------|
| **Fase 1 (Validação)** | Validar produto e modelo com 5–10 empresas | RFY Index + Receita Confiável (30d) + Receita Inflada no dashboard; Top 3 decisões; ritual semanal; ajustes de linguagem e modelo conforme feedback. |
| **Fase 2 (Benchmark)** | Publicar benchmark de mercado | Agregação anônima por segmento/faixa de receita; exibição de percentil/mediana do RFY Index no dashboard; relatório ou página “Benchmark de Receita Confiável”. |
| **Fase 3 (Certificação)** | Criar selo de governança de receita | **Certificação RFY:** empresas com RFY Index ≥ X% (ex.: 75%) por 6 meses consecutivos recebem certificado; critérios públicos; uso em marketing e confiança B2B. |

---

# 8. Corte de complexidade (o que remover ou adiar)

## 8.1 Remover ou simplificar na versão inicial (foco RFY Index)

| Item no documento atual | Ação sugerida | Motivo |
|-------------------------|---------------|--------|
| **SUPHO (ITSMO, pilares IC/IH/IP)** | Mover para módulo separado “Maturidade” ou “Diagnóstico”; não no fluxo principal do dashboard. | Distrai do número central (RFY Index); pode voltar em fases posteriores como complemento. |
| **Múltiplos indicadores no topo** (Pipeline aberto, Deals abertos, Valor em risco, Receita antecipável, Saúde do pipeline, Deals em atenção, SUPHO, etc.) | Substituir pelo bloco único: RFY Index + Receita Confiável + Receita Inflada + Evolução 90d + Top 3 decisões. | Reduz ruído e reforça uma única história. |
| **Unit Economics e ICP** no topo | Manter em seção “Negócio” ou “Métricas”, não no hero. | Foco inicial é governança de receita (30d), não LTV/CAC. |
| **Certificação SUPHO (Bronze/Prata/Ouro)** | Adiar para fase posterior ou alinhar à Fase 3 (Certificação RFY). | Evitar duas certificações conflitantes; priorizar Certificação RFY. |
| **PAIP (Plano de Ação 90–180 dias)** | Manter como ferramenta de planejamento, mas não no topo do dashboard. | Governança semanal vem primeiro. |
| **Rituais SUPHO (check-in, performance quinzenal, etc.)** | Unificar com o **ritual executivo semanal guiado pelo RFY** ou manter em aba “Rituais” separada. | Um ritual principal (RFY semanal) é mais claro. |

## 8.2 Elementos que distraem da proposta central

- **Forecast bruto vs ajustado** como dupla estrela — Unificar na narrativa “Receita Declarada vs Receita Confiável (30d)” e “Receita Inflada”.
- **Deal Intelligence** como tabela central — Manter como suporte às “Top 3 decisões” e “Ações para reduzir Receita Inflada”, não como primeiro bloco.
- **Status da IA / Painel de Inteligência IA** — Manter técnico (ex.: em Configurações ou rodapé); não no topo. Mensagem simples: “RFY Index calculado com base nos dados do seu pipeline” sem detalhes de modelo.

## 8.3 Recursos que podem ser adiados para fase posterior

- **Catálogo de playbooks de intervenção** (SAAS-FEATURES-ROADMAP) — Fase 2.
- **Forecast versionado (cenários otimista/pessimista)** — Fase 2.
- **Módulo de metas e comissão** — Fase 2 ou 3.
- **Compliance pack (LGPD/SOC2)** — Conforme demanda; não bloqueante para o novo posicionamento.
- **Benchmarks setoriais** — Fase 2 (já previsto na evolução estratégica).

---

# 9. Resultado esperado — entregáveis consolidados

## 9.1 Nova arquitetura do produto

- **Núcleo:** RFY Index + Receita Confiável (30d) + Receita Inflada + Evolução 90d + Top 3 decisões executivas.
- **Suporte:** Detalhe do pipeline, intervenções (renomeadas), benchmark (quando disponível), histórico de decisões.
- **Módulos separados (não no fluxo principal):** SUPHO/Maturidade, Unit Economics/ICP, Configurações, Uploads/Integrações.

## 9.2 Nova narrativa comercial

- **Headline (core):** “O número que substitui o feeling: RFY Index — quanto da sua receita é realmente confiável nos próximos 30 dias.”
- **Headline (premium):** “Control Tower de Receita + Maturidade Organizacional — RFY Index para governança de receita e SUPHO para evoluir a organização que sustenta essa receita.”
- **Problema:** Empresas tomam decisões com base em datas de fechamento e intuição; receita “declarada” não se materializa; falta diagnóstico de por que a organização não entrega de forma estável.
- **Solução:** Sistema de Governança de Receita baseado no RFY Index (um único percentual, calculado sem depender de datas manipuláveis) +, no premium, diagnóstico de maturidade (SUPHO) e planos de ação para evoluir.
- **Benefícios:** Decisão baseada em dados; linguagem comum (RFY Index, Receita Inflada); ritual semanal; benchmark e certificação. **Premium:** além do Control Tower, maturidade organizacional (ITSMO, pilares, PAIP, certificação) para quem quer escalar receita com base em capacidade interna.

## 9.3 Nova estrutura de dashboard

- **Topo (obrigatório):**  
  1) RFY Index (destaque máximo)  
  2) Receita Confiável (30 dias)  
  3) Receita Inflada  
  4) Evolução do RFY (90 dias)  
  5) Top 3 decisões executivas (com responsável)  
- **Abaixo:** Detalhe, intervenções, benchmark, histórico; depois módulos secundários (SUPHO, Unit Economics, etc.).

## 9.4 Modelo conceitual do RFY Index

- **Fórmula:** Receita Confiável (30d) = Σ deal \( V_i \cdot P_i(\text{win}) \cdot P_i(\text{close in 30d} \mid \text{win}) \).
- **RFY Index** = percentual (Receita Confiável 30d / baseline ou receita declarada 30d).
- **Baseline 30d** definido por regra neutra (etapa, tempo na etapa, estagnação), **sem** uso de data de fechamento do CRM.
- **Insumos:** conversão histórica, tempo por etapa, estagnação, concentração de risco, ICP, atividades.

## 9.5 Roadmap estratégico (12 meses)

| Período | Foco | Entregas |
|---------|------|----------|
| **M1–M2** | Reposicionamento e MVP do novo dashboard | Novo posicionamento (RFY Index, Receita Confiável, Receita Inflada); dashboard com os 5 blocos no topo; Top 3 decisões com responsável; linguagem executiva; ritual semanal documentado. |
| **M3** | Modelo 30d robusto | Implementar P(close in 30d \| win); baseline 30d neutro; RFY Index calculado e exibido; validação com 2–3 empresas. |
| **M4–M5** | Validação (Fase 1) | 5–10 empresas usando o produto; coleta de feedback; ajustes no modelo e na UX; histórico de evolução do RFY e de decisões. |
| **M6–M7** | Benchmark (Fase 2) | Agregação anônima por segmento; exibição de benchmark no dashboard; relatório ou página de benchmark. |
| **M8–M10** | Consolidação e escala | Onboarding guiado; relatórios recorrentes; integrações nativas (HubSpot, Pipedrive, etc.); hardening multi-tenant. |
| **M11–M12** | Certificação RFY (Fase 3) | Critérios públicos (ex.: RFY Index ≥ X% por 6 meses); certificação e selo; uso em marketing e vendas. |

---

*Documento gerado com base na análise do SaaS RFY e nas diretrizes de reestruturação estratégica. Recomenda-se revisar com produto e liderança técnica antes de implementação.*
