# 02 — Configuração operacional e alertas

> **Organização:** _preencher_  
> **Versão:** _1.0_  
> **Última atualização:** _AAAA-MM-DD_

Este documento espelha os campos de **`org_config`** no RFY. Preencha valores numéricos e booleanos de forma explícita; a implementação copiará para o produto.

## 1. Identidade no produto

| Campo | Valor | Notas |
|-------|--------|--------|
| Nome de exibição na aplicação (`org_display_name`) | | Opcional; sobrescreve exibição padrão. |

## 2. Limiares de fricção (dias)

| Métrica / alerta | Valor (dias) | Significado acordado com o cliente |
|------------------|--------------|-------------------------------------|
| Proposta em risco (`dias_proposta_risco`) | | |
| Pipeline abandonado (`dias_pipeline_abandonado`) | | |
| Aging inflado (`dias_aging_inflado`) | | |
| Aprovação travada (`dias_aprovacao_travada`) | | |

## 3. Notificações e relatórios

| Campo | Valor |
|-------|--------|
| Notificar por e-mail (`notificar_email`) | Sim / Não |
| Destinatários (lista separada por vírgula) | |
| Incluir convite de calendário em comunicações (`incluir_convite_calendario`) | Sim / Não |
| Timezone IANA (`timezone`, ex.: `America/Sao_Paulo`) | |
| Top deals por fricção (`top_deals_por_friccao`) | número |
| Top evidências por fricção (`top_evidencias_por_friccao`) | número |

## 4. Regras de negócio complementares

_Descrever aqui qualquer regra que ainda não exista como campo no produto mas que afeta interpretação dos alertas (ex.: “proposta” só conta após envio formal ao cliente)._
