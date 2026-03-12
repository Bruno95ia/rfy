O que o SaaS RFY oferece

RFY é uma Plataforma de Governança Empresarial com porta de entrada em Receita Confiável, baseada no RFY Index — o percentual de Receita Confiável nos próximos 30 dias, calculado independentemente da data de fechamento declarada no CRM.

Regra de ouro do produto: na superfície, o RFY é simples (número oficial + decisão). Em profundidade, ele é robusto (execução + diagnóstico + governança).

Este documento descreve as funcionalidades disponíveis na plataforma.

⸻

0. Arquitetura do produto (como as camadas se conectam)

O RFY mantém todas as camadas desde o início, porém com hierarquia clara:

Camada 1 — Verdade da Receita (categoria / entrada)
	•	RFY Index (30 dias) como número oficial de Receita Confiável.
	•	Receita Confiável (R$) e Receita Inflada (R$) como visão financeira executiva.
	•	Evolução histórica do índice e comparação com benchmark (quando disponível).

Camada 2 — Execução (mecanismo)
	•	Intervenções priorizadas por impacto para reduzir Receita Inflada e aumentar RFY.
	•	Deal Intelligence e saúde do pipeline para orientar ação.

Camada 3 — Diagnóstico Organizacional (SUPHO — ativado após diagnóstico inicial)
	•	SUPHO é uma ferramenta de diagnóstico organizacional que explica por que o RFY está no nível atual.
	•	Entra após o cliente entender o RFY (Camada 1) e precisar sustentar melhoria (Camadas 1 e 2).
	•	Simulador de impacto (estrutural): “se maturidade subir X, o RFY tende a subir Y”.

Camada 4 — Governança (escala e institucionalização)
	•	Rituais, PAIP e certificação como mecanismos de sustentação e padronização.

⸻

1. Visão geral
	•	Propósito: oferecer o RFY Index como número oficial de Receita Confiável (30 dias), evidenciar Receita Inflada (diferença entre declarado e confiável) e orientar decisões executivas priorizadas para elevar a confiabilidade de receita. Substituir o “feeling” do CEO por decisão baseada em evidência.
	•	Stack: Next.js (App Router), TypeScript, Tailwind, Postgres (Docker/Supabase), Supabase Auth, Inngest (jobs assíncronos), Recharts.
	•	Dados de entrada: CSVs no formato PipeRun (oportunidades e atividades), ou integração via webhook/n8n.

⸻

2. Autenticação e acesso

| Recurso | Descrição |
|--------|-----------|
| Login | Email e senha via Supabase Auth. Redirecionamento para o dashboard após sucesso. |
| Cadastro (Signup) | Criação de conta com email e senha. No primeiro login é criada automaticamente uma organização "Default". |
| Conta demo | Usuário admin@demo.rfy.local / senha Adminrv para testar com dados de demonstração. Botão "Demo" na tela de login preenche credenciais. |
| Setup | Página de configuração pós-cadastro (quando aplicável). |


⸻

3. Dashboard

O dashboard é a Torre de Controle de Receita: começa pelo RFY Index e pela linha de decisão executiva. As demais camadas aparecem sob demanda.

3.1 Blocos principais (topo — obrigatório)
	1.	RFY Index (30 dias) — número único em destaque (%). Percentual de Receita Confiável nos próximos 30 dias, calculado com base em histórico e comportamento do pipeline, sem depender da data de fechamento no CRM.
	2.	Receita Confiável (30 dias) — valor em R$ da previsão estatística realizável nos próximos 30 dias.
	3.	Receita Inflada — diferença em R$ entre o declarado/esperado e a Receita Confiável (expectativa que pode não se materializar).
	4.	Evolução do RFY (últimos 90 dias) — gráfico de evolução do índice (em implementação).
	5.	Top 3 decisões para aumentar o RFY — ações prioritárias com responsável e impacto (foco em reduzir Receita Inflada).

3.2 Linha de decisão executiva
	•	Receita Confiável — valor em R$ (previsão realizável 30d).
	•	Receita Inflada — valor em risco / distorção.
	•	Próxima ação — primeira intervenção sugerida (cliente, valor, ação).
	•	Benchmark — comparativo com mercado (quando disponível).

3.3 Foco recomendado
	•	Card único quando existe distorção prioritária: nome da distorção, ação recomendada e Receita Inflada concentrada naquele foco.

3.4 Painel executivo (detalhe)
	•	Detalhe: Receita Confiável (30d), Receita Inflada, Receita Recuperável, Saúde do pipeline.

3.5 Indicadores secundários (faixa única)
	•	Pipeline aberto — valor total em BRL e quantidade de deals abertos.
	•	Deals abertos — número de oportunidades ativas.
	•	Receita inflada — montante associado a distorções (ex.: proposta parada, pipeline abandonado).
	•	Receita recuperável — estimativa de receita recuperável (~30% atraso).
	•	Saúde do pipeline — score (0–100%) combinando higiene e pós-proposta.
	•	Deals em atenção — quantidade de deals que precisam de intervenção + número de intervenções sugeridas.
	•	SUPHO ITSMO — índice de maturidade (0–100) e nível (Reativo, Consciente, Estruturado, Integrado, Evolutivo) exibido como diagnóstico, não como KPI principal.
	•	SUPHO Pilares — IC (Cultura), IH (Humano), IP (Performance) em valores resumidos.

3.6 Top 3 decisões / Intervenções prioritárias
	•	Lista de intervenções ordenadas por impacto financeiro (maior primeiro), com valor e ação sugerida.

3.7 Deal Intelligence
	•	Tabela de deals em risco: receita potencialmente comprometida (Receita Inflada) por oportunidade para priorizar ação.

3.8 SUPHO (resumo no dashboard)
	•	Card com último resultado de diagnóstico: ITSMO, nível, pilares IC/IH/IP, gaps (C–H, C–P), links para Diagnóstico e Painel de Maturidade.
	•	Importante: SUPHO é ativado após diagnóstico inicial e serve para explicar e sustentar a evolução do RFY.

3.9 Posicionamento no mercado
	•	Comparativo com benchmark e análise de ICP (Ideal Customer Profile) quando disponível.
	•	Métricas de win rate e ticket médio.

3.10 Receita Declarada vs Receita Confiável
	•	Comparação: receita declarada no CRM vs receita confiável (30d). Diferença percentual (Receita Inflada).

3.11 Unit Economics e ICP
	•	LTV, churn, win rate, ticket médio, CAC, relação LTV/CAC.
	•	Geração de estudo de ICP (resumo e análise).

3.12 Status da IA
	•	Estado do modelo (treinado, disponível), opção de (re)treinar.

3.13 Painel de Inteligência IA
	•	Gargalo principal (etapa com mais valor parado), impacto em valor, sugestão de otimização (ex.: reduzir tempo em Proposta).
	•	Nível de confiança do forecast quando aplicável.

3.14 Análise detalhada (colapsável)
	•	Gráficos e tabelas: valor em risco por etapa, inteligência por vendedor, cruzamentos (valor por etapa, por vendedor, distribuição por estagnação, concentração Top 10).
	•	Saúde do pipeline (higiene, pós-proposta).
	•	Oportunidades por etapa (gráfico).

3.15 Navegação rápida
	•	Links âncora para: Painel executivo, Intervenções, Deals em risco, SUPHO, Análise detalhada.

⸻

4. Uploads
	•	Central de ingestão de dados: envio de CSVs (oportunidades e atividades no formato PipeRun).
	•	Upload individual: um arquivo por vez (oportunidades ou atividades). Processamento assíncrono (Inngest) ou síncrono (fallback).
	•	Pacote demo: envio das duas planilhas (oportunidades + atividades) de uma vez; o sistema processa, vincula e gera o relatório. Ideal para demonstração.
	•	Templates: download de modelos de CSVs (oportunidades e atividades) para preenchimento.
	•	Listagem: histórico de uploads com status (concluído, processando, erro) e mensagem de erro quando houver.
	•	Formatos suportados: delimitador ;, aspas, datas DD/MM/YYYY, moeda em R$ (ex.: R$ 10.423,80). Campos conforme modelo PipeRun.

Após o processamento, o dashboard e o relatório são atualizados; no pacote demo também é criada campanha SUPHO de diagnóstico pós-upload.

⸻

5. Relatórios
	•	Visão executiva de Receita Inflada: lista de distorções com nome, descrição, quantidade de ocorrências, impacto em valor, participação no impacto total e severidade (Crítico, Alto, Moderado).
	•	Ação por distorção: texto de ação recomendada para cada tipo de distorção.
	•	Evidências: deals/oportunidades associadas a cada distorção (empresa, título, valor, dias sem atividade).
	•	Plano de ação: top 3 distorções para priorizar.
	•	Pilares e impacto: scores de pilares (ex.: higiene de pipeline, pós-proposta), impacto anual, redução de ciclo, receita recuperável.
	•	Link para Uploads quando ainda não há relatório gerado.

⸻

6. SUPHO (diagnóstico organizacional)

SUPHO avalia maturidade em três pilares: Cultura (IC), Humano (IH), Performance (IP) e entrega o ITSMO (índice geral) e nível de 1 a 5.

Papel do SUPHO no RFY: explicar causas estruturais e apoiar a evolução do RFY (não competir com o RFY Index como métrica principal).

6.1 Diagnóstico
	•	Campanhas de pesquisa: criação e listagem de campanhas de diagnóstico.
	•	Respondentes e questões: coleta de respostas que alimentam o cálculo dos índices.
	•	Cálculo: IC, IH, IP, ITSMO, nível, gaps (C–H, C–P), subíndices (ISE, IPT, ICL), tamanho da amostra.
	•	Após fechar uma campanha, o resultado aparece no Painel de Maturidade e no card SUPHO do dashboard.

6.2 Painel de Maturidade
	•	Radar IC/IH/IP e nível organizacional (Reativo → Evolutivo).
	•	Leitura executiva: textos por pilar e por gap (C–H, C–P).
	•	Perfil predominante e pilar em foco (o mais baixo).
	•	Subíndices e links para Diagnóstico e Playbooks.

6.3 Simulador de impacto no RFY (estrutural)
	•	Simulação: “se o ITSMO subir X (ou 1 nível), qual impacto estimado no RFY Index e na Receita Confiável?”.
	•	Exibição sugerida: RFY atual vs RFY potencial + impacto em R$ (receita confiável adicional).

6.4 PAIP (Plano de Ação)
	•	Planos 90–180 dias: criação e listagem de planos vinculados ao diagnóstico e ao CRM.
	•	Objetivos, KRs e ações associados aos gaps e ao contexto comercial.

6.5 Rituais e cadência
	•	Check-in semanal, Performance quinzenal, Feedback mensal, Governança trimestral.
	•	Estrutura preparada para templates de ritual e decisões (tabelas no banco).

6.6 Certificação
	•	Níveis: Bronze, Prata, Ouro (critérios mínimos até maturidade plena com evidências e governança).
	•	Dossiê com critérios por dimensão (Humano, Cultura, Performance), pontuação 0–3 por critério e evidências anexadas.
	•	Estrutura preparada para runs de certificação e evidências (tabelas no banco).

⸻

7. Configurações

Configurações são organizadas em abas/filtros: Visão geral, SaaS, Organização, Integrações.

7.1 Visão geral
	•	Organização: nome da org e identificador (org_id).
	•	Plano e uso: plano atual (ex.: Starter), limites (assentos, uploads/30 dias, deals ativos) e uso atual (uploads, processados, deals ativos, usuários).
	•	Integração CRM: status da integração ativa (ex.: n8n/Webhook), última sincronização.

7.2 SaaS (Torre de Controle)
	•	Planos: lista de planos (nome, preço, limites de assentos, uploads, deals).
	•	Assinatura: plano vinculado à organização.
	•	Onboarding: passos de onboarding e conclusão.
	•	API Keys: criação, listagem, prefixo, escopos, última utilização, revogação.
	•	Webhooks outbound: URLs, eventos, status de envio, última chamada.
	•	Canais de alerta: email, Slack, etc., e destino.
	•	Regras de alerta: tipo (ex.: pipeline_estagnado), severidade, limiar, ativo/inativo.
	•	Relatórios agendados: nome, frequência, ativo, destinatários, próxima execução.
	•	Cenários de forecast: nome, predefinido, suposições (JSON).
	•	Metas trimestrais: ano, trimestre, meta de receita, win rate, dias de ciclo.
	•	Qualidade de dados: último run de qualidade (score, origem, issues).
	•	Cohorts de retenção: mês, segmento, clientes iniciais, retidos, taxa de retenção.

7.3 Organização
	•	Nome da organização.
	•	Limiares de distorção: dias para proposta em risco, pipeline abandonado, aging inflado, aprovação travada.
	•	Notificações: email ativo, endereços, timezone.
	•	Convite no calendário: incluir ou não link de reunião.
	•	Top deals/evidências por distorção: quantidade exibida em relatórios e dashboard.
	•	CAC manual e gasto mensal de marketing (para unit economics).

7.4 Integrações CRM
	•	Provedores: PipeRun (CSV), Pipedrive, HubSpot, n8n/Webhook, API genérica.
	•	Webhook: URL base, org_id, secret opcional para validação.
	•	Exemplo de payload para envio de oportunidades e atividades via POST.
	•	Instruções para configurar n8n/Zapier/Make para enviar dados ao webhook.

7.5 Demonstração
	•	Zerar base de demonstração: botão (para owner/admin) que chama a API de reset, reaplica o seed e recria cenário demo (relatórios, SUPHO, etc.).

⸻

8. Integrações
	•	CRM via n8n/Webhook: POST para /api/crm/webhook com org_id, opportunities e activities. Opcional: header X-Webhook-Secret.
	•	Payload: JSON no formato esperado (ex.: campos conforme PipeRun). O sistema processa, persiste e recalcula o relatório; no fluxo demo também cria campanha e resultado SUPHO.

⸻

9. APIs

| Endpoint | Descrição |
|----------|-----------|
| POST /api/upload | Upload de CSV (oportunidades ou atividades). |
| POST /api/demo/upload-pack | Envio do pacote demo (dois CSVs). |
| GET /api/demo/template/oportunidades | Download do template CSV de oportunidades. |
| GET /api/demo/template/atividades | Download do template CSV de atividades. |
| POST /api/admin/reset-demo | Zerar e recarregar base de demonstração (admin). |
| POST /api/crm/webhook | Receber dados do CRM (n8n, Zapier, Make). |
| GET /api/settings | Ler configurações da organização. |
| POST /api/settings | Salvar configurações (por seção). |
| POST /api/inngest | Handler do Inngest (jobs de processamento). |
| POST /api/ai/train | Disparar treinamento do modelo de IA. |
| GET /api/ai/status | Status do modelo de IA. |
| GET /api/ai/forecast | Forecast de pipeline (IA). |
| GET /api/ai/benchmark | Benchmark de mercado. |
| GET /api/ai/interventions | Lista de intervenções sugeridas. |
| GET /api/ai/icp-analysis | Análise de ICP. |
| GET/POST /api/ai/deal | Dados e análise por deal. |
| SUPHO | campaigns, respondents, questions, answers, diagnostic/compute, paip/plans. |


⸻

10. Infraestrutura e operação
	•	Banco: Postgres (Docker local ou Supabase). Migrations (schema + 002 … 008) incluem SUPHO, PAIP, Rituais, Certificação.
	•	Auth e Storage: Supabase (opcional para storage; upload pode ser local).
	•	Jobs: Inngest para processamento assíncrono de CSV; fallback síncrono quando Inngest não está disponível.
	•	Docker: Compose com app (Next.js), ai-service (Python), Postgres, Redis, MLflow. Ver docs/DOCKER.md.
	•	Deploy: Vercel com variáveis de ambiente; Inngest em produção com INNGEST_SIGNING_KEY e INNGEST_EVENT_KEY.

⸻

11. Resumo por persona

| Persona | Principais recursos |
|---------|---------------------|
| CEO / Conselho | RFY Index (número oficial), Receita Confiável, Receita Inflada, evolução, Top 3 decisões, benchmark. |
| Gestor comercial | Intervenções, Deal Intelligence, saúde do pipeline, relatórios, análise detalhada. |
| Liderança | SUPHO (diagnóstico), simulador de impacto, PAIP, rituais, certificação. |
| Operação | Uploads, templates, integração CRM/webhook, configurações (limiares, notificações). |
| Admin/IT | Configurações (org, plano, API keys, webhooks, alertas, cenários, metas), reset demo. |


⸻

Documento atualizado com base no alinhamento estratégico: RFY Index (Receita Confiável 30 dias) como porta de entrada; SUPHO como diagnóstico ativado após diagnóstico inicial e com simulador de impacto estrutural. Data: fevereiro/2026.