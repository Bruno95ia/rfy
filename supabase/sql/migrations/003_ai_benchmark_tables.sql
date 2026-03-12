-- AI Service & Benchmark tables for Revenue Engine
-- Run after schema base

-- org_profiles: perfil agregado por organização para clustering
CREATE TABLE IF NOT EXISTS org_profiles (
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  segment text,
  revenue_band text,
  ticket_band text,
  cycle_band text,
  sellers_count int NOT NULL DEFAULT 1,
  ticket_median numeric,
  cycle_median numeric,
  win_rate numeric,
  proposal_stagnation_rate numeric,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (org_id)
);

CREATE INDEX idx_org_profiles_updated ON org_profiles(updated_at);

-- org_cluster: atribuição de org a cluster
CREATE TABLE IF NOT EXISTS org_cluster (
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  cluster_id int NOT NULL,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (org_id)
);

CREATE INDEX idx_org_cluster_cluster ON org_cluster(cluster_id);

-- benchmark_cluster_stats: estatísticas agregadas por cluster (p25, median, p75)
CREATE TABLE IF NOT EXISTS benchmark_cluster_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id int NOT NULL,
  metric_name text NOT NULL,
  p25 numeric NOT NULL,
  median numeric NOT NULL,
  p75 numeric NOT NULL,
  n_orgs int NOT NULL,
  computed_at timestamptz DEFAULT now(),
  UNIQUE (cluster_id, metric_name)
);

CREATE INDEX idx_benchmark_cluster ON benchmark_cluster_stats(cluster_id);

-- model_versions: registro de modelos treinados
CREATE TABLE IF NOT EXISTS model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  version text NOT NULL,
  trained_at timestamptz NOT NULL,
  metrics_json jsonb DEFAULT '{}',
  artifact_path text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_model_versions_name ON model_versions(model_name);
CREATE INDEX idx_model_versions_trained ON model_versions(trained_at DESC);

-- feature_snapshots (opcional): snapshot de features por org para auditoria
CREATE TABLE IF NOT EXISTS feature_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  as_of_date date NOT NULL,
  features_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_feature_snapshots_org_date ON feature_snapshots(org_id, as_of_date);
