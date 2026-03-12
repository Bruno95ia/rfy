# RFY — Apresentação do SaaS e funcionalidades

## O que é o RFY

O **RFY** é uma plataforma de **Governança de Receita** que ajuda empresas a ter clareza sobre a receita que podem realmente contar nos próximos 30 dias. O centro da oferta é o **RFY Index**: um único número (em %) que representa a parcela do pipeline considerada **Receita Confiável**, calculada com base em dados do CRM e em previsão (IA ou regra de negócio), sem depender apenas da data de fechamento declarada.

**Problema que resolve:** substituir o "feeling" e planos baseados em datas otimistas por um número oficial de receita realizável, decisões priorizadas e diagnóstico organizacional para sustentar a melhoria.

---

## Principais funcionalidades

### 1. Torre de Controle (Dashboard)

- **RFY Index:** número oficial em destaque — percentual de Receita Confiável nos próximos 30 dias.
- **Receita Confiável e Receita Inflada:** valores em R$ (o que tende a fechar vs. o que está em risco ou distorcido).
- **Top 3 decisões:** ações priorizadas por impacto para aumentar a confiabilidade da receita.
- **Alertas:** resumo de riscos (ex.: pipeline estagnado, proposta parada) com link para detalhes.
- **Deal Intelligence:** tabela de oportunidades em risco e intervenções sugeridas.
- **Painel executivo:** visão consolidada de receita, saúde do pipeline e próximos passos.
- **Indicador de origem:** quando a IA está indisponível, o sistema indica que está usando estimativa heurística (fallback).

Ideal para: CEO, conselho e gestores que precisam de um "número da verdade" e de priorização clara.

---

### 2. Diagnóstico organizacional (SUPHO)

O **SUPHO** é o módulo de diagnóstico que explica **por que** o RFY está no nível atual e como evoluir.

- **Diagnóstico:** campanhas de pesquisa, respondentes, questões e cálculo dos índices (Cultura, Humano, Performance e índice geral ITSMO).
- **Painel de Maturidade:** visão em radar dos três pilares, nível organizacional (Reativo → Evolutivo) e leitura executiva.
- **Simulador de impacto:** simulação do efeito de subir maturidade no RFY Index e na Receita Confiável.
- **PAIP (Plano de Ação):** planos 90–180 dias com objetivos, KRs e ações ligadas aos gaps do diagnóstico.
- **Rituais:** cadência de check-in, performance, feedback e governança.
- **Certificação:** níveis Bronze, Prata e Ouro com critérios e evidências.

Ideal para: liderança e equipes que querem evoluir a organização de forma estruturada.

---

### 3. Relatórios e evidências

- **Visão executiva de Receita Inflada:** distorções (nome, impacto em R$, severidade), ações recomendadas e evidências (deals associados).
- **Plano de ação:** priorização das principais distorções para ataque.
- **Export:** relatório executivo em CSV e PDF.

Ideal para: gestores comerciais e reuniões de board.

---

### 4. Dados e integrações

- **Upload de CSV:** envio de planilhas de oportunidades e atividades no formato PipeRun (um arquivo por vez ou pacote completo).
- **Templates:** download de modelos de CSV para preenchimento.
- **Pacote demo:** upload das duas planilhas de uma vez para demonstração rápida.
- **Integrações:** centro de integrações com PipeRun ativo e outros CRMs (Pipedrive, HubSpot, Salesforce) em roadmap.
- **Webhook:** recebimento de dados do CRM via n8n, Zapier ou Make.

Ideal para: operação e TI que precisam alimentar e conectar o sistema ao CRM.

---

### 5. Configurações e governança

- **Organização:** nome da org, plano, limites (assentos, uploads, deals) e uso atual.
- **Convites:** convite de membros por e-mail; aceite via link com token.
- **Alertas:** canais (e-mail, Slack, etc.) e regras (tipo, severidade, limiar).
- **Relatórios agendados:** envio automático por e-mail com frequência configurável.
- **Demonstração:** opção (para admin) de zerar a base demo e recarregar cenário de testes.

Ideal para: administradores e gestores que configuram limites, pessoas e notificações.

---

### 6. Autenticação e acesso

- Login e cadastro por e-mail e senha.
- Suporte a convite por link (parâmetro `invite` no login/signup e página de aceite).
- Conta demo (credenciais pré-preenchidas na tela de login) para experimentação.
- Múltiplas organizações e papéis (owner, admin, manager, viewer).

---

### 7. Páginas públicas e jurídicas

- **Preços:** página de planos (Starter, Pro, Business) e chamadas para ação.
- **Termos de Uso** e **Política de Privacidade (LGPD):** páginas estáticas linkadas no login, cadastro e rodapé.

---

## Para quem é o RFY

| Perfil            | Principais benefícios |
|-------------------|------------------------|
| **CEO / Conselho** | Número oficial de receita (RFY Index), decisões priorizadas, visão de risco (Receita Inflada). |
| **Gestor comercial** | Intervenções por impacto, Deal Intelligence, relatórios e evidências por distorção. |
| **Liderança**      | Diagnóstico SUPHO, maturidade, PAIP, rituais e certificação. |
| **Operação / TI**  | Uploads, templates, integrações e configurações centralizadas. |

---

## Resumo

O RFY entrega:

1. **Um número oficial** — RFY Index (Receita Confiável em 30 dias).
2. **Clareza de risco** — Receita Inflada e evidências por distorção.
3. **Decisões priorizadas** — Top 3 ações e Deal Intelligence.
4. **Diagnóstico e evolução** — SUPHO, PAIP, rituais e certificação.
5. **Dados e integração** — CSV, webhook e centro de integrações.
6. **Governança** — Configurações, convites, alertas e relatórios agendados.

Tudo em uma única plataforma, com foco em simplicidade na superfície e profundidade quando o usuário precisar.
