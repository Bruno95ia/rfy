# 03 — Integração CRM

> **Organização:** _preencher_  
> **Versão:** _1.0_  
> **Última atualização:** _AAAA-MM-DD_

**Não armazene segredos neste arquivo em repositórios compartilhados.** Use referências (“credencial no cofre X”) ou anexos fora do Git.

## 1. Provedor e ambiente

| Campo | Valor |
|-------|--------|
| Provedor (`provider`: piperun, pipedrive, hubspot, generic, n8n_webhook) | |
| Ambiente (produção / sandbox) | |
| URL base da API (se aplicável) | |
| Identificador de instância / portal | |

## 2. Autenticação (sem segredos em texto claro)

| Item | Onde está guardado / como obter |
|------|----------------------------------|
| API key / token | |
| Segredo de webhook | |
| Quem renova credenciais e com que periodicidade | |

## 3. Mapeamento de campos (`field_mapping_json`)

Documente a correspondência entre **campos do CRM** e **expectativas do RFY** (oportunidade, empresa, contato, estágio, valores, datas).

| Conceito RFY / pipeline | Campo ou ID no CRM | Observações |
|-------------------------|--------------------|-------------|
| Identificador único do negócio | | |
| Nome da empresa / conta | | |
| Valor / moeda | | |
| Estágio / fase | | |
| Data de criação / fechamento | | |
| Proprietário / vendedor | | |
| Campos customizados relevantes | | |

## 4. Sincronização

| Pergunta | Resposta |
|----------|----------|
| Direção (CRM → RFY, bidirecional, etc.) | |
| Frequência desejada | |
| Filtros (pipeline, time, região) | |
| Tratamento de duplicatas | |

## 5. Webhooks (se `n8n_webhook` ou similar)

| Campo | Valor |
|-------|--------|
| URL esperada pelo RFY | |
| Validação de assinatura | |
| Formato do payload (referência doc ou exemplo anonimizado) | |
