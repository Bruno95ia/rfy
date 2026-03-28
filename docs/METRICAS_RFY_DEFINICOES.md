## Métricas RFY — Definições e fórmulas

Documento de referência única para as principais métricas do RFY ligadas à governança de receita. Deve estar sempre alinhado a `docs/O_QUE_O_SAAS_OFERECE.md`, `docs/REESTRUTURACAO_ESTRATEGICA_RFY_INDEX.md` e ao código em `src/app/api/metrics/summary/route.ts` e `src/lib/reports/executive-data.ts`.

---

### 1. Conceitos centrais

- **RFY Index (30 dias)**: percentual de **Receita Confiável** em relação à **Receita Declarada** nos próximos 30 dias para a organização.
- **Receita Confiável (30 dias)**: montante em R$ que o modelo considera realizável nos próximos 30 dias.
- **Receita Declarada (30 dias)**: valor em R$ que o CRM/projeção considera como “pipeline esperado” para os próximos 30 dias (ex.: `pipeline_bruto` retornado pelo serviço de AI ou, na ausência disso, o valor aberto no pipeline).
- **Receita Inflada (30 dias)**: diferença entre o que é declarado/esperado e o que é considerado confiável pelo modelo para 30 dias.

Essas definições são consistentes com:

- `docs/O_QUE_O_SAAS_OFERECE.md` — seções de Visão geral, Dashboard e Receita Declarada vs Receita Confiável.
- `docs/REESTRUTURACAO_ESTRATEGICA_RFY_INDEX.md` — seções 1.2, 3.1 e 5 (modelo do RFY Index).

#### 1.1 Versão das definições (semver)

Cada relatório persistido em `reports` inclui **`metrics_definition_version`**: o número semântico das regras usadas ao calcular `snapshot_json`, `frictions_json` e `pillar_scores_json` (não confundir com o contador interno de `GET /api/metrics/status` usado para invalidar cache).

- **Fonte no código**: constante `METRICS_DEFINITION_VERSION` em [`src/lib/metrics/definitions.ts`](../src/lib/metrics/definitions.ts) — deve coincidir com o valor gravado em novos relatórios e com o default da migration `020_reports_metrics_definition_version.sql`.
- **Quando incrementar**
  - **Patch** (ex. 1.0.0 → 1.0.1): correções que não alteram a semântica percebida pelo cliente (bugs, copy técnico).
  - **Minor** (ex. 1.0.x → 1.1.0): novo campo no snapshot, novo tipo de fricção, alteração de thresholds default que muda resultados de forma compatível com o passado.
  - **Major** (ex. 1.x → 2.0.0): mudança na definição de RFY Index, Receita Confiável/Inflada ou regras de fricção que exige comunicação ao cliente e possível reprocessamento histórico.
- **Superfície no produto**: o dashboard mostra um badge **“Definições RFY v…”** quando há relatório; `GET /api/metrics/summary` devolve `metrics_definition_version` (ou `null` se ainda não existe relatório).

---

### 2. Fórmulas implementadas hoje (API de resumo)

Implementação base em:

- `src/app/api/metrics/summary/route.ts`
- `src/lib/reports/executive-data.ts`

#### 2.1 Entradas principais

- `pipeline_value_open` (snapshot): soma dos valores de oportunidades abertas (`status = 'open'`) — vem de `computeSnapshot` em `src/lib/metrics/compute.ts` e é armazenado em `reports.snapshot_json.pipeline_value_open`.
- `forecast_adjusted` (AI): previsão de receita realizável para os próximos 30 dias, retornada pelo serviço de AI em `POST /predict/forecast`.
- `pipeline_bruto` (AI): valor bruto de pipeline considerado pelo modelo de AI (quando disponível).

#### 2.2 Cálculo consolidado

Em alto nível, a API hoje faz:

- **Receita declarada (30 dias)**  
  ```ts
  const declarado = pipelineBruto ?? pipelineValueOpen;
  ```

- **Receita confiável (30 dias)**  
  Quando há forecast do AI:
  ```ts
  const confiavel = forecastAdjusted;
  ```
  Quando o AI está indisponível ou não retorna valor:
  ```ts
  const FALLBACK_FACTOR = 0.7; // ver seção 3
  const confiavel = declarado * FALLBACK_FACTOR;
  ```

- **Receita inflada (30 dias)**  
  ```ts
  const inflada = Math.max(0, declarado - confiavel);
  ```

- **RFY Index (30 dias)**  
  ```ts
  const rfyIndexPct =
    declarado > 0 && forecastAdjusted != null
      ? (forecastAdjusted / declarado) * 100
      : null;
  ```

Resumo:

- Quando **há forecast ajustado**, o RFY Index é a razão entre Receita Confiável (forecast_adjusted) e Receita Declarada (declarado).
- Quando **não há forecast ajustado**:
  - A Receita Confiável é aproximada como fração fixa da Receita Declarada (`FALLBACK_FACTOR`).
  - O RFY Index é retornado como `null` (sem percentual), mas ainda expomos Receita Confiável, Receita Inflada e Receita Declarada.

---

### 3. Fallback de Receita Confiável (quando AI está indisponível)

Quando o serviço de AI não está disponível ou não retorna `forecast_adjusted`, o sistema usa um fator de fallback constante:

- `Receita Confiável (30d)` = `Receita Declarada (30d)` × `FALLBACK_FACTOR`
- Valor atual no código: `FALLBACK_FACTOR = 0.7` (70% do pipeline declarado).

**Regras:**

- Este fator é um **approx** e deve ser tratado como comportamento padrão em ambientes sem AI.
- Em ambientes com AI estabilizado, a expectativa é que `forecast_adjusted` esteja quase sempre presente e o fallback seja exceção.
- Em futuras evoluções, o fator pode virar configuração por organização (ex.: em `org_config`).

---

### 4. Relação com o modelo teórico do RFY Index

O documento `docs/REESTRUTURACAO_ESTRATEGICA_RFY_INDEX.md` descreve um modelo mais completo:

- **Receita Confiável (30d)** = soma de valores esperados por deal, considerando probabilidade de ganho e probabilidade de fechamento em 30 dias.
- **RFY Index** = razão entre Receita Confiável (30d) e um baseline (Receita Declarada ou outro denominador neutro).

O cálculo implementado hoje é uma **aproximação prática** desse modelo:

- O serviço de AI encapsula a lógica de probabilidade (P(win), janela de 30 dias etc.) e devolve diretamente `forecast_adjusted` e `pipeline_bruto`.
- A API de métricas resume isso em:  
  `RFY Index = forecast_adjusted / pipeline_declarado` quando o AI está disponível.

Qualquer alteração futura no modelo interno de AI (ex.: inclusão explícita de P(close in 30d), novos sinais de estagnação etc.) deve manter a semântica das variáveis expostas (`forecast_adjusted`, `pipeline_bruto`) para preservar esta API.

---

### 5. Pontos de atenção para desenvolvimento

1. **Fonte única de cálculo**  
   - Sempre que precisar de RFY Index, Receita Confiável, Receita Inflada e Receita Declarada no código, reutilizar um helper comum (planejado em `src/lib/metrics/rfy-summary.ts`) em vez de duplicar a fórmula.

2. **Transparência no frontend**  
   - Quando o RFY Index estiver `null` por ausência de forecast, a UI deve deixar claro que está usando apenas Receita Confiável estimada (fallback) sem percentual oficial.

3. **Logs de fallback**  
   - Em caso de falha de chamada ao AI Service, registrar log indicando que o fallback foi usado, para facilitar diagnóstico de indisponibilidade.

4. **Alinhamento com docs de produto**  
   - Qualquer alteração nas fórmulas deve ser refletida neste documento e nos docs de produto (`O_QUE_O_SAAS_OFERECE` e `REESTRUTURACAO_ESTRATEGICA_RFY_INDEX`).

