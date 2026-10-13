-- =========================================================================
-- HỆ THỐNG ĐÁNH GIÁ CÔNG TÁC PHỐI HỢP ĐƠN VỊ - VNPT
-- Cloudflare D1 SQL Schema (Đầy đủ 8 Bảng & Ràng buộc toàn vẹn)
-- =========================================================================

CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_id TEXT,
  level INTEGER DEFAULT 1,
  status TEXT DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES units(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  hrm_code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER',
  must_change_password INTEGER DEFAULT 1,
  can_view_reports INTEGER DEFAULT 0,
  avatar_url TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  last_login_at TEXT,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  period_type TEXT NOT NULL,
  period_value TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_locked INTEGER DEFAULT 0,
  description TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS criteria (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  weight REAL DEFAULT 1.0,
  min_score INTEGER DEFAULT 1,
  max_score INTEGER DEFAULT 10,
  order_index INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS campaign_target_units (
  campaign_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  PRIMARY KEY (campaign_id, unit_id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS campaign_evaluating_units (
  campaign_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  PRIMARY KEY (campaign_id, unit_id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS campaign_criteria (
  campaign_id TEXT NOT NULL,
  criterion_id TEXT NOT NULL,
  PRIMARY KEY (campaign_id, criterion_id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (criterion_id) REFERENCES criteria(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS campaign_evaluators (
  campaign_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  assigned_at TEXT NOT NULL,
  PRIMARY KEY (campaign_id, user_id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  evaluator_id TEXT NOT NULL,
  evaluator_unit_id TEXT NOT NULL,
  target_unit_id TEXT NOT NULL,
  scores_json TEXT NOT NULL,
  average_score REAL NOT NULL,
  status TEXT DEFAULT 'SUBMITTED',
  submitted_at TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_unit_id) REFERENCES units(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_config (
  config_key TEXT PRIMARY KEY,
  config_value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
