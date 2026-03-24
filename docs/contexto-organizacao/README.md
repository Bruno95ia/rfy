# Contexto por organização (cliente)

Esta pasta define **documentos-padrão** para capturar informações específicas de cada cliente (organização no RFY) antes e durante o onboarding. O objetivo é ter **uma fonte única** para consultoria, implementação e suporte — e, quando aplicável, **transpor os valores** para as tabelas e telas do produto (`org_config`, integrações CRM, etc.).

**Alinhamento produto / pricing / diagnóstico (Context Pack consolidado):** [../context-pack/CONTEXT-PACK-RFY-v1.md](../context-pack/CONTEXT-PACK-RFY-v1.md).

## Ordem sugerida de preenchimento

| Ordem | Documento | Para que serve |
|------|-----------|----------------|
| 1 | [01-identificacao-e-contatos.md](./01-identificacao-e-contatos.md) | Quem é a organização, responsáveis, canais. |
| 2 | [02-config-operacional-e-alertas.md](./02-config-operacional-e-alertas.md) | Limiares de fricção, timezone, notificações (espelha `org_config`). |
| 3 | [03-integracao-crm.md](./03-integracao-crm.md) | Provedor, credenciais (fora deste repo), mapeamento de campos (`crm_integrations`). |
| 4 | [04-processo-comercial-e-glossario.md](./04-processo-comercial-e-glossario.md) | Linguagem do funil, etapas, definições de “cliente”, “oportunidade”, SLAs internos. |
| 5 | [05-perfil-e-metricas-referencia.md](./05-perfil-e-metricas-referencia.md) | Segmento, faixas de ticket/ciclo, referências para benchmark (`org_profiles` / clustering). |
| 6 | [06-governanca-rbac-e-politicas.md](./06-governanca-rbac-e-politicas.md) | Papéis (owner/admin/manager/viewer), quem aprova o quê, política de dados. |

## Como usar na prática

1. **Duplicar** esta pasta (ou copiar os arquivos numerados) para um diretório por cliente, por exemplo: `contexto-organizacao/clientes/<slug-do-cliente>/`.
2. Preencher os templates; marcar campos **N/A** quando não se aplicarem.
3. Após validação com o cliente, **replicar** no produto: Configurações da organização, integração CRM e demais telas administrativas.
4. Manter **versão e data** no cabeçalho de cada documento ao atualizar.

## Relação com o banco (referência técnica)

| Conceito no documento | Onde vive no sistema |
|----------------------|----------------------|
| Nome e identidade da org | `orgs`, `org_config.org_display_name` |
| Dias de alerta / relatório / timezone / e-mails | `org_config` |
| CRM e mapeamento | `crm_integrations` |
| Segmento e faixas para inteligência/benchmark | `org_profiles` (e processos associados) |

Documentação interna adicional: [../DATA_AND_MODEL_POLICY.md](../DATA_AND_MODEL_POLICY.md), [../METRICAS_RFY_DEFINICOES.md](../METRICAS_RFY_DEFINICOES.md).
