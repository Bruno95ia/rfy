import { NextResponse } from 'next/server';

/**
 * GET /api/demo/template/atividades
 * Retorna CSV modelo para upload de atividades (PipeRun).
 * Delimitador: ; (ponto e vírgula).
 * O Hash da oportunidade (opp-001, etc.) deve bater com o CSV de oportunidades.
 */
export async function GET() {
  const headers =
    'ID;Tipo;Título;Responsável;Concluído em;Início;Prazo;Data de criação;Status;ID (Oportunidade);Funil (Oportunidade);Etapa (Oportunidade);Nome fantasia (Empresa);Titulo (Oportunidade);Nome do dono da oportunidade (Oportunidade)';
  const rows = [
    'act-001;call;Follow-up Proposta Atlas;Ana Silva;15/02/2025 10:00:00;;;14/02/2025 09:00:00;Concluída;opp-001;Enterprise;Proposta;Atlas Energia;Expansao Nacional;Ana Silva',
    'act-002;email;Reengajar Norte Pharma;Ana Silva;10/02/2025 14:30:00;;;09/02/2025 08:00:00;Concluída;opp-002;Enterprise;Proposta;Norte Pharma;Plataforma Comercial;Ana Silva',
    'act-003;meeting;Negociacao Sigma;Bruno Lima;16/02/2025 11:00:00;;;15/02/2025 09:00:00;Concluída;opp-003;Mid-Market;Negociacao;Sigma Log;Rollout Filiais;Bruno Lima',
    'act-004;task;Proposta Delta;Carla Souza;17/02/2025 16:00:00;;;16/02/2025 10:00:00;Concluída;opp-004;Mid-Market;Negociacao;Delta Foods;Otimizacao RevenueOps;Carla Souza',
  ];
  const csv = [headers, ...rows].join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="atividades_modelo.csv"',
    },
  });
}
