# Data & Model Policy — Revenue Engine

Documento que define a política de dados e modelos para o produto multi-tenant. Deve ser revisado antes de posicionar o produto como pronto para clientes pagantes.

---

## Estado atual (v1)

- **Modelo:** único modelo global (um classifier e um regressor por deploy).
- **Treino:** usa **todas** as oportunidades de **todas** as orgs no banco (`trainer.py` sem filtro por `org_id`). Requisitos mínimos: 20 oportunidades totais e 10 won/lost para o classifier.
- **Inferência:** mesmo modelo para toda org; isolamento apenas nos **dados** (filtro por `org_id`), não no artefato.
- **Artefatos:** um diretório global (`AI_ARTIFACTS_PATH`); inferência usa sempre o artefato mais recente por data de modificação (sem parâmetro de versão na API).
- **Versionamento:** tabelas `model_versions` e `training_logs` existem; a API de inferência **não** aceita `model_version` — rollback é manual (troca de arquivos no volume).

### Implicações

- Padrões de uma org podem influenciar previsões de outra (modelo compartilhado).
- Novos clientes com pouco histórico recebem previsões do mesmo modelo treinado com dados de outros.
- Para benchmark, k-anonymity ≥ 5: com poucas orgs, o benchmark retorna `insufficient_peers` ou `no_data`.

---

## Opções de evolução

### A) Modelo global (atual) com consentimento e critérios

- Documentar em contrato/termos que o treino pode usar dados agregados/anônimos de outras organizações.
- Manter um único modelo; garantir critérios mínimos de qualidade antes de treinar (ex.: janela temporal, balanceamento) e expor no produto quando o forecast está em “baixa confiança” (ex.: poucos deals para a org ou modelo não treinado).

### B) Modelo por tenant (org)

- Treino isolado por `org_id`: apenas oportunidades da própria org.
- Artefatos por org (ex.: `artifacts/{org_id}/classifier_*.joblib`) ou identificação por `model_versions` (ex.: `org_id` + `version`).
- API de inferência passa a aceitar `model_version` opcional; default = última versão daquela org.
- Exige volume mínimo por org para treino (ex.: 20 opps, 10 won/lost); abaixo disso, fallback (0.5) ou “dados insuficientes”.

### C) Híbrido

- Org com dados suficientes → modelo próprio (B).
- Org com dados insuficientes → modelo global (A) com aviso de “previsão baseada em padrões agregados”.

---

## Requisitos mínimos de qualidade (implementados / a implementar)

| Requisito              | Trainer (treino)      | Inferência (forecast)     |
|------------------------|------------------------|----------------------------|
| Mín. oportunidades     | 20 (global)           | —                          |
| Mín. won/lost          | 10 (classifier)       | —                          |
| Mín. para regressor    | 5 com closed_date     | —                          |
| Aviso baixa confiança  | —                     | n_deals &lt; 20 ou fallback |

A resposta do forecast passa a incluir:

- `forecast_confidence`: `"high"` | `"low"` (ou equivalente).
- `data_quality_warning`: mensagem opcional quando confiança baixa (ex.: “Poucos deals para esta base; previsão com baixa confiança”).

---

## Próximos passos recomendados

1. **Decisão de produto:** escolher A, B ou C e documentar no contrato/UI.
2. **Qualidade na inferência:** já previsto: indicador de confiança no forecast e uso no dashboard.
3. **Versionamento na API:** adicionar parâmetro opcional `model_version` (ou `model_id`) em `/predict/forecast` e `/predict/deal` quando houver modelo por tenant.
4. **Treino por org (se B ou C):** alterar `trainer.py` para aceitar `org_id` opcional; salvar/carregar artefatos por org; garantir que apenas dados da org entrem no treino quando `org_id` for informado.

---

*Documento alinhado ao Relatório do Conselho de Validação (Revenue Engine).*
