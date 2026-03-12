-- training_logs: métricas de cada run de treinamento
-- Para auditoria e evolução dos modelos
CREATE TABLE IF NOT EXISTS training_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text NOT NULL,
  model_name text NOT NULL,
  auc numeric,
  precision_at_k numeric,
  recall numeric,
  mae numeric,
  n_train int,
  n_val int,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_training_logs_created ON training_logs(created_at DESC);
CREATE INDEX idx_training_logs_model ON training_logs(model_name);
