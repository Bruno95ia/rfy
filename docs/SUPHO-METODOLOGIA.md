# Metodologia SUPHO — Indicadores e Pilares

Documento de referência para alinhar o SaaS aos materiais oficiais: **KIT_DIAGNOSTICO_SUPHO_Consolidado**, **Kit_Execucao_SUPHO_Templates**, **Playbooks** e **Pilares** (Cultura, Humano/Liderança, Comercial/Marketing).

---

## 1. Pilares e blocos do diagnóstico

| Bloco | Pilar | Sigla | Playbook de referência | Descrição resumida |
|-------|--------|-------|------------------------|--------------------|
| **A** | Cultura Organizacional | IC | Playbook Cultura & Performance | Valores, propósito, coerência da liderança, comunicação |
| **B** | Humano e Liderança | IH | Playbook Humano & Liderança | Engajamento, segurança psicológica, feedback, bem-estar |
| **C** | Comercial e Performance | IP | Playbook Comercial & Marketing | Metas, indicadores, feedback de performance, melhoria contínua |

- **Ordem recomendada de trabalho:** 1) Cultura → 2) Humano e Liderança → 3) Comercial e Performance.
- No SaaS, os blocos A/B/C das perguntas do diagnóstico mapeiam para IC, IH e IP; os textos executivos e o painel de maturidade usam a nomenclatura dos pilares acima.

---

## 2. Fórmulas (implementadas no código)

- **Escala:** Likert 1–5 → normalização 0–100: `(média - 1) / 4 * 100`.
- **Pesos ITSMO:** Cultura (IC) 40%, Humano (IH) 35%, Performance (IP) 25%.
- **ITSMO** = IC×0,40 + IH×0,35 + IP×0,25.
- **Nível (1–5):** 0–39 Reativo | 40–59 Consciente | 60–74 Estruturado | 75–89 Integrado | 90–100 Evolutivo.
- **Gaps:** ΔC-H = |IC − IH|, ΔC-P = |IC − IP|. Faixas: 0–5 Alinhado, 6–10 Leve, >10 Desconexão.
- **Subíndices (escala 1–5):** ISE (A11, A12, B6), IPT (A2, A5, B8), ICL (A3, A6, B5).

---

## 3. Leitura executiva e resumo do diagnóstico

- Os textos por faixa (ITSMO, IC, IH, IP, gaps, ISE, IPT, ICL) estão em `src/lib/supho/executive-text.ts`.
- São usados no **Painel de Maturidade** e no **bloco SUPHO do Dashboard**.
- A linguagem foi afinada para ser **acionável**: referência a pilares, PAIP, rituais e playbooks quando relevante.

---

## 4. Referências aos documentos

Para refinar ainda mais os indicadores e textos no SaaS, use como base:

- **KIT_DIAGNOSTICO_SUPHO_Consolidado_v1** — definição do diagnóstico e perguntas.
- **Kit_Execucao_SUPHO_Templates_v1** — templates de execução e rituais.
- **Pilar_1_Cultura_Organizacional_Consolidado_v1** — IC e itens do bloco A.
- **Pilar_Humano_Liderança_Consolidado_v1** — IH e itens do bloco B.
- **Pilar_2_Comercial_Marketing_Consolidado_v1** — IP e itens do bloco C.
- **Playbook_Cultura_Performance_SUPHO_v1** — ações para Cultura e Performance.
- **Playbook_Humano_Lideranca_SUPHO_v1** — ações para Humano e Liderança.
- **Playbook_Comercial_Marketing_SUPHO_v1** — ações para Comercial e Marketing.
- **Resumo executivo diagnóstico** — tom e estrutura do resumo entregue ao cliente.

Sugestão: ao atualizar faixas, rótulos ou textos no código, conferir com os trechos equivalentes desses documentos e manter este `.md` atualizado.

---

## 5. Onde está no código

| O quê | Onde |
|-------|------|
| Pilares (nome, sigla, playbook) | `src/lib/supho/constants.ts` → `SUPHO_PILARES` |
| Faixas de nível e gaps | `src/lib/supho/constants.ts` → `ITSMO_LEVEL_BANDS`, `GAP_BANDS` |
| Textos executivos | `src/lib/supho/executive-text.ts` |
| Cálculo IC/IH/IP, ITSMO, gaps, subíndices | `src/lib/supho/calculations.ts` |
| Dashboard (bloco SUPHO) | `src/app/app/dashboard/components/SuphoOverviewCard.tsx` |
| Painel de Maturidade | `src/app/app/supho/maturidade/` |
| Integração geral | `docs/SUPHO-INTEGRATION.md` |
