# Integração automática PipeRun (Webhook)

Este guia cobre a integração automática do PipeRun com o RFY via webhook.

## Endpoint

`POST /api/crm/piperun/webhook`

Exemplo local:

`http://localhost:3000/api/crm/piperun/webhook`

## Autenticação do webhook

Use o header:

`X-Webhook-Secret: <segredo-configurado-na-org>`

O segredo é validado por organização (tabela `crm_integrations`, provider `piperun`).

## Payload aceito

Formato base:

```json
{
  "org_id": "<uuid-da-org>",
  "opportunities": [
    {
      "id_externo": "deal-123",
      "pipeline_name": "Vendas",
      "etapa": "Proposta",
      "valor": 50000,
      "status": "ganha",
      "created_date": "2026-02-01",
      "owner_name": "Maria"
    }
  ],
  "activities": [
    {
      "id_externo": "act-456",
      "opportunity_id_externo": "deal-123",
      "tipo": "call",
      "title": "Follow-up",
      "data": "2026-02-24T10:30:00Z"
    }
  ]
}
```

### Regras de validação

- `org_id` é obrigatório.
- Pelo menos um item válido em `opportunities` ou `activities`.
- `opportunities[*].id_externo` (ou alias: `crm_hash`, `hash`, `id`) é obrigatório.
- `activities[*]` sem `id_externo` recebem id derivado determinístico para deduplicação.

### Deduplicação

A ingestão aplica deduplicação por:

- `org_id + id_externo + tipo_registro`
- `tipo_registro = opportunity` (grava em `opportunities.crm_hash`)
- `tipo_registro = activity` (grava em `activities.crm_activity_id`)

No banco, os upserts usam:

- `opportunities`: conflito em `org_id, crm_hash`
- `activities`: conflito em `org_id, crm_activity_id`

## Pós-ingestão

Ao concluir ingestão:

- Atualiza status de sincronização em `crm_integrations` (`last_sync_at`, `last_sync_status`, `last_sync_error`).
- Atualiza versão de métricas (`metrics_status`) para polling do dashboard.
- Dispara recálculo do dashboard:
  - Preferencialmente via Inngest (`report/compute`)
  - Fallback síncrono se fila indisponível

## Exemplo cURL

```bash
curl -X POST "http://localhost:3000/api/crm/piperun/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: SEU_SEGREDO" \
  -d '{
    "org_id": "00000000-0000-0000-0000-000000000000",
    "opportunities": [
      {
        "id_externo": "deal-1001",
        "pipeline_name": "Vendas",
        "etapa": "Proposta",
        "valor": 120000,
        "status": "aberta"
      }
    ],
    "activities": [
      {
        "id_externo": "act-9001",
        "opportunity_id_externo": "deal-1001",
        "tipo": "meeting",
        "title": "Reunião de alinhamento",
        "data": "2026-02-24T13:00:00Z"
      }
    ]
  }'
```

## Resposta esperada (200)

```json
{
  "ok": true,
  "org_id": "00000000-0000-0000-0000-000000000000",
  "processed": { "opportunities": 1, "activities": 1 },
  "duplicates": { "opportunities": 0, "activities": 0 },
  "recompute": "queued",
  "metrics_status": {
    "org_id": "00000000-0000-0000-0000-000000000000",
    "version": 12,
    "last_updated_at": "2026-02-24T18:00:00.000Z"
  },
  "last_sync_status": "ok",
  "warnings": []
}
```
