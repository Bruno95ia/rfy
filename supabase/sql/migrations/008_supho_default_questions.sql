-- Perguntas padrão SUPHO (template global: org_id NULL)
-- Bloco A = Cultura, B = Humano, C = Performance
-- item_code usado para subíndices: ISE (A11,A12,B6), IPT (A2,A5,B8), ICL (A3,A6,B5)

INSERT INTO supho_questions (id, org_id, block, internal_weight, question_text, item_code, sort_order)
VALUES
  ('a1000001-0000-4000-8000-000000000001'::uuid, NULL, 'A', 2, 'Os valores da empresa guiam as decisões do dia a dia.', 'A1', 1),
  ('a1000001-0000-4000-8000-000000000002'::uuid, NULL, 'A', 2, 'Sinto orgulho de fazer parte desta organização.', 'A2', 2),
  ('a1000001-0000-4000-8000-000000000003'::uuid, NULL, 'A', 3, 'A liderança demonstra coerência entre o que fala e o que faz.', 'A3', 3),
  ('a1000001-0000-4000-8000-000000000004'::uuid, NULL, 'A', 1, 'A comunicação interna é clara e frequente.', 'A4', 4),
  ('a1000001-0000-4000-8000-000000000005'::uuid, NULL, 'A', 2, 'Meu trabalho está alinhado ao propósito da empresa.', 'A5', 5),
  ('a1000001-0000-4000-8000-000000000006'::uuid, NULL, 'A', 3, 'Os líderes reconhecem e valorizam o esforço da equipe.', 'A6', 6),
  ('a1000001-0000-4000-8000-000000000011'::uuid, NULL, 'A', 3, 'Posso expressar ideias e opiniões sem medo de retaliação.', 'A11', 7),
  ('a1000001-0000-4000-8000-000000000012'::uuid, NULL, 'A', 3, 'Erros são tratados como oportunidade de aprendizado.', 'A12', 8),
  ('b1000001-0000-4000-8000-000000000001'::uuid, NULL, 'B', 2, 'Há equilíbrio entre demanda de trabalho e bem-estar.', 'B1', 9),
  ('b1000001-0000-4000-8000-000000000005'::uuid, NULL, 'B', 2, 'Meu gestor me dá feedback que ajuda a evoluir.', 'B5', 10),
  ('b1000001-0000-4000-8000-000000000006'::uuid, NULL, 'B', 3, 'Sinto segurança psicológica para assumir riscos no trabalho.', 'B6', 11),
  ('b1000001-0000-4000-8000-000000000008'::uuid, NULL, 'B', 2, 'Há espaço para colaboração entre áreas.', 'B8', 12),
  ('c1000001-0000-4000-8000-000000000001'::uuid, NULL, 'C', 3, 'As metas e indicadores são claros e acompanhados.', 'C1', 13),
  ('c1000001-0000-4000-8000-000000000002'::uuid, NULL, 'C', 2, 'Recebo feedback regular sobre minha performance.', 'C2', 14),
  ('c1000001-0000-4000-8000-000000000003'::uuid, NULL, 'C', 2, 'Os resultados são usados para melhorar processos.', 'C3', 15)
ON CONFLICT (id) DO NOTHING;

-- Garantir que tabela permita ON CONFLICT: supho_questions tem id PK, então inserts acima usam IDs fixos.
-- Se a tabela foi criada sem esses IDs, o ON CONFLICT DO NOTHING evita duplicar.
-- Como id é gen_random_uuid() por default, os primeiros inserts não terão conflito; para re-runs usamos DO NOTHING por (org_id, block, item_code).
-- Não há UNIQUE em (org_id, item_code). Para idempotência, deletar perguntas globais antes de re-inserir (opcional).
-- Por simplicidade: ON CONFLICT (id) DO NOTHING. Os UUIDs fixos acima devem ser únicos.
