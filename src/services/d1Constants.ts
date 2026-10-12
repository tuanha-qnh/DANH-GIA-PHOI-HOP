/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const D1_SQL_SCHEMA = `-- =========================================================================
-- HỆ THỐNG ĐÁNH GIÁ CÔNG TÁC PHỐI HỢP ĐƠN VỊ - VNPT
-- Cloudflare D1 SQL Schema (Đầy đủ 8 Bảng & Ràng buộc toàn vẹn)
-- =========================================================================

-- 1. Bảng Khai Báo Đơn Vị (Hierarchical Units)
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

-- 2. Bảng Người Dùng & Phân Quyền (Users & Authentication)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  hrm_code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER', -- 'ADMIN' | 'USER'
  must_change_password INTEGER DEFAULT 1, -- 1: bắt buộc đổi mật khẩu lần đầu
  can_view_reports INTEGER DEFAULT 0, -- 1: được quyền xem báo cáo thống kê
  avatar_url TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  last_login_at TEXT,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT
);

-- 3. Bảng Chu Kỳ / Đợt Đánh Giá (Evaluation Campaigns)
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  period_type TEXT NOT NULL, -- 'MONTH' | 'QUARTER' | 'YEAR'
  period_value TEXT NOT NULL, -- '2026-03' | 'Q1-2026'
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_locked INTEGER DEFAULT 0, -- 0: Mở đánh giá, 1: Khóa (chỉ Admin mở lại được)
  description TEXT,
  created_at TEXT NOT NULL
);

-- 4. Bảng Bộ Tiêu Chí Đánh Giá (Coordination Criteria)
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

-- 5. Bảng Đơn Vị Được Đưa Vào Đánh Giá (Target Units)
CREATE TABLE IF NOT EXISTS campaign_target_units (
  campaign_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  PRIMARY KEY (campaign_id, unit_id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
);

-- 6. Bảng Đơn Vị Tham Gia Đánh Giá (Evaluating Units)
CREATE TABLE IF NOT EXISTS campaign_evaluating_units (
  campaign_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  PRIMARY KEY (campaign_id, unit_id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
);

-- 7. Bảng User Được Phép Tham Gia Đánh Giá (Assigned Evaluators - Kéo Thả Phân Quyền)
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

-- 8. Bảng Dữ Liệu Kết Quả Đánh Giá (Evaluation Submissions)
CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  evaluator_id TEXT NOT NULL,
  evaluator_unit_id TEXT NOT NULL,
  target_unit_id TEXT NOT NULL,
  scores_json TEXT NOT NULL, -- Chứa điểm từ 1-10 và lý do (>= 50 ký tự nếu điểm <= 6)
  average_score REAL NOT NULL, -- Điểm trung bình cộng các tiêu chí
  status TEXT DEFAULT 'SUBMITTED', -- 'DRAFT' | 'SUBMITTED'
  submitted_at TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_unit_id) REFERENCES units(id) ON DELETE CASCADE
);

-- 9. Bảng Cấu Hình Hệ Thống Chung
CREATE TABLE IF NOT EXISTS app_config (
  config_key TEXT PRIMARY KEY,
  config_value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- =========================================================================
-- DỮ LIỆU KHỞI TẠO BAN ĐẦU (SEED DATA MẪU VNPT)
-- =========================================================================

-- Seed Đơn Vị
INSERT OR IGNORE INTO units (id, code, name, parent_id, level, status, created_at) VALUES 
('u-root', 'VNPT-QNH', 'VNPT Tỉnh / Thành phố', NULL, 1, 'ACTIVE', '2026-01-01T00:00:00Z'),
('u-ttkd', 'TTKD', 'Trung tâm Kinh doanh VNPT', 'u-root', 2, 'ACTIVE', '2026-01-01T00:00:00Z'),
('u-ttcntt', 'TTCNTT', 'Trung tâm Công nghệ Thông tin', 'u-root', 2, 'ACTIVE', '2026-01-01T00:00:00Z'),
('u-ttdhtt', 'TTĐHTT', 'Trung tâm Điều hành Thông tin', 'u-root', 2, 'ACTIVE', '2026-01-01T00:00:00Z'),
('u-pkt-tc', 'PKT-TC', 'Phòng Kế toán - Tài chính', 'u-root', 2, 'ACTIVE', '2026-01-01T00:00:00Z'),
('u-pns-th', 'PNS-TH', 'Phòng Nhân sự - Tổng hợp', 'u-root', 2, 'ACTIVE', '2026-01-01T00:00:00Z');

-- Seed Tài Khoản Admin (Mật khẩu mặc định: Vnpt@2026)
INSERT OR IGNORE INTO users (id, hrm_code, full_name, unit_id, username, password_hash, role, must_change_password, can_view_reports, avatar_url, status, created_at) VALUES 
('user-admin', 'HRM-0001', 'Quản trị viên Hệ thống VNPT', 'u-root', 'admin', 'Vnpt@2026', 'ADMIN', 0, 1, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 'ACTIVE', '2026-01-01T00:00:00Z'),
('user-ttkd-1', 'HRM-10201', 'Nguyễn Văn An - Giám đốc TTKD', 'u-ttkd', 'nguyenvanan', 'Vnpt@2026', 'USER', 1, 1, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'ACTIVE', '2026-01-02T00:00:00Z'),
('user-ttcntt-1', 'HRM-10301', 'Trần Thị Bích - Giám đốc TTCNTT', 'u-ttcntt', 'tranthibich', 'Vnpt@2026', 'USER', 1, 1, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', 'ACTIVE', '2026-01-03T00:00:00Z');

-- Seed Tiêu Chí Đánh Giá Chuẩn VNPT
INSERT OR IGNORE INTO criteria (id, code, name, description, weight, min_score, max_score, order_index) VALUES
('tc-1', 'TC01', 'Tốc độ phản hồi và thời gian xử lý yêu cầu phối hợp', 'Đánh giá tính kịp thời, đúng hạn khi tiếp nhận và giải quyết văn bản, phiếu yêu cầu phối hợp giữa các đơn vị.', 1.0, 1, 10, 1),
('tc-2', 'TC02', 'Chất lượng tài liệu, hồ sơ và dữ liệu bàn giao kỹ thuật / nghiệp vụ', 'Đánh giá tính chính xác, đầy đủ, chuẩn hóa của biên bản bàn giao, tài liệu kỹ thuật, số liệu báo cáo.', 1.0, 1, 10, 2),
('tc-3', 'TC03', 'Tinh thần hợp tác, trách nhiệm và thái độ phối hợp giải quyết vướng mắc', 'Sự thiện chí, chủ động lắng nghe, không đùn đẩy trách nhiệm khi phát sinh sự cố liên đơn vị.', 1.0, 1, 10, 3),
('tc-4', 'TC04', 'Tính chủ động đề xuất giải pháp tháo gỡ khó khăn chung', 'Đưa ra các sáng kiến, giải pháp linh hoạt nhằm tối ưu hóa tiến độ công việc.', 1.0, 1, 10, 4),
('tc-5', 'TC05', 'Tuân thủ quy trình nghiệp vụ và cam kết SLA nội bộ', 'Thực hiện đúng quy chuẩn mạng lưới, quy trình bán hàng và quy định nội bộ VNPT.', 1.0, 1, 10, 5);
`;

export const CLOUDFLARE_WORKER_CODE = `/**
 * =========================================================================
 * VNPT COORDINATION EVALUATION SYSTEM - CLOUDFLARE WORKER D1 API
 * Dán toàn bộ mã này vào Cloudflare Worker Web Editor (dash.cloudflare.com)
 * =========================================================================
 * Yêu cầu: Binding D1 Database tên là 'DB' trong Settings -> Variables -> D1 Bindings
 */

export default {
  async fetch(request, env, ctx) {
    // 1. Cấu hình CORS cho mọi Domain (Vercel, Github Pages, Localhost)
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-token',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;
    const db = env.DB; // D1 Database Binding

    if (!db) {
      return new Response(JSON.stringify({
        success: false,
        error: "Chưa cấu hình D1 Database Binding với biến tên 'DB' trong Settings Worker!"
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      // -------------------------------------------------------------
      // 1. Health Check & Test Kết Nối
      // -------------------------------------------------------------
      if (pathname === '/api/health' || pathname === '/') {
        let tablesCount = 0;
        try {
          const res = await db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table'").first();
          tablesCount = res ? res.count : 0;
        } catch (e) {}

        return new Response(JSON.stringify({
          success: true,
          status: 'ONLINE',
          message: 'Kết nối Cloudflare D1 thành công!',
          timestamp: new Date().toISOString(),
          tablesCount: tablesCount
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // -------------------------------------------------------------
      // 2. Tự Động Khởi Tạo Schema Nếu Bảng Chưa Tồn Tại (/api/init-schema)
      // -------------------------------------------------------------
      if (pathname === '/api/init-schema' && request.method === 'POST') {
        const statements = [
          \`CREATE TABLE IF NOT EXISTS units (id TEXT PRIMARY KEY, code TEXT UNIQUE, name TEXT, parent_id TEXT, level INTEGER, status TEXT, created_at TEXT)\`,
          \`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, hrm_code TEXT, full_name TEXT, unit_id TEXT, username TEXT UNIQUE, password_hash TEXT, role TEXT, must_change_password INTEGER, can_view_reports INTEGER, avatar_url TEXT, status TEXT, created_at TEXT, last_login_at TEXT)\`,
          \`CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, code TEXT UNIQUE, name TEXT, period_type TEXT, period_value TEXT, start_date TEXT, end_date TEXT, is_locked INTEGER, description TEXT, created_at TEXT)\`,
          \`CREATE TABLE IF NOT EXISTS criteria (id TEXT PRIMARY KEY, code TEXT UNIQUE, name TEXT, description TEXT, weight REAL, min_score INTEGER, max_score INTEGER, order_index INTEGER)\`,
          \`CREATE TABLE IF NOT EXISTS campaign_target_units (campaign_id TEXT, unit_id TEXT, PRIMARY KEY (campaign_id, unit_id))\`,
          \`CREATE TABLE IF NOT EXISTS campaign_evaluating_units (campaign_id TEXT, unit_id TEXT, PRIMARY KEY (campaign_id, unit_id))\`,
          \`CREATE TABLE IF NOT EXISTS campaign_evaluators (campaign_id TEXT, user_id TEXT, unit_id TEXT, assigned_at TEXT, PRIMARY KEY (campaign_id, user_id))\`,
          \`CREATE TABLE IF NOT EXISTS evaluations (id TEXT PRIMARY KEY, campaign_id TEXT, evaluator_id TEXT, evaluator_unit_id TEXT, target_unit_id TEXT, scores_json TEXT, average_score REAL, status TEXT, submitted_at TEXT, updated_at TEXT)\`,
          \`CREATE TABLE IF NOT EXISTS app_config (config_key TEXT PRIMARY KEY, config_value TEXT, updated_at TEXT)\`
        ];

        for (const sql of statements) {
          await db.prepare(sql).run();
        }

        // Tạo tài khoản admin mặc định nếu chưa có
        await db.prepare(\`
          INSERT OR IGNORE INTO users (id, hrm_code, full_name, unit_id, username, password_hash, role, must_change_password, can_view_reports, status, created_at)
          VALUES ('user-admin', 'HRM-0001', 'Quản trị viên Hệ thống VNPT', 'u-root', 'admin', 'Vnpt@2026', 'ADMIN', 0, 1, 'ACTIVE', datetime('now'))
        \`).run();

        return new Response(JSON.stringify({ success: true, message: 'Khởi tạo D1 Schema thành công!' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // -------------------------------------------------------------
      // 3. Toàn Bộ Trạng Thái Đồng Bộ (Sync All Data)
      // -------------------------------------------------------------
      if (pathname === '/api/sync/all' && request.method === 'GET') {
        const units = (await db.prepare("SELECT * FROM units ORDER BY level ASC, code ASC").all()).results || [];
        const users = (await db.prepare("SELECT id, hrm_code as hrmCode, full_name as fullName, unit_id as unitId, username, role, must_change_password as mustChangePassword, can_view_reports as canViewReports, avatar_url as avatarUrl, status, created_at as createdAt, last_login_at as lastLoginAt FROM users").all()).results || [];
        const campaigns = (await db.prepare("SELECT id, code, name, period_type as periodType, period_value as periodValue, start_date as startDate, end_date as endDate, is_locked as isLocked, description, created_at as createdAt FROM campaigns ORDER BY created_at DESC").all()).results || [];
        const criteria = (await db.prepare("SELECT id, code, name, description, weight, min_score as minScore, max_score as maxScore, order_index as orderIndex FROM criteria ORDER BY order_index ASC").all()).results || [];
        const targetUnits = (await db.prepare("SELECT campaign_id as campaignId, unit_id as unitId FROM campaign_target_units").all()).results || [];
        const evaluatingUnits = (await db.prepare("SELECT campaign_id as campaignId, unit_id as unitId FROM campaign_evaluating_units").all()).results || [];
        const evaluators = (await db.prepare("SELECT campaign_id as campaignId, user_id as userId, unit_id as unitId, assigned_at as assignedAt FROM campaign_evaluators").all()).results || [];
        const rawEvals = (await db.prepare("SELECT * FROM evaluations").all()).results || [];

        const evaluations = rawEvals.map(e => ({
          id: e.id,
          campaignId: e.campaign_id,
          evaluatorId: e.evaluator_id,
          evaluatorUnitId: e.evaluator_unit_id,
          targetUnitId: e.target_unit_id,
          scores: JSON.parse(e.scores_json || '{}'),
          averageScore: e.average_score,
          status: e.status,
          submittedAt: e.submitted_at,
          updatedAt: e.updated_at
        }));

        return new Response(JSON.stringify({
          success: true,
          data: {
            units,
            users: users.map(u => ({ ...u, mustChangePassword: !!u.mustChangePassword, canViewReports: !!u.canViewReports })),
            campaigns: campaigns.map(c => ({ ...c, isLocked: !!c.isLocked })),
            criteria,
            targetUnits,
            evaluatingUnits,
            evaluators,
            evaluations
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // -------------------------------------------------------------
      // 4. Xác Thực Đăng Nhập (/api/auth/login)
      // -------------------------------------------------------------
      if (pathname === '/api/auth/login' && request.method === 'POST') {
        const body = await request.json();
        const { username, password } = body;

        const user = await db.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();
        if (!user) {
          return new Response(JSON.stringify({ success: false, error: 'Tên đăng nhập không tồn tại trong hệ thống!' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (user.status === 'LOCKED') {
          return new Response(JSON.stringify({ success: false, error: 'Tài khoản này hiện đang bị khóa!' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (user.password_hash !== password) {
          return new Response(JSON.stringify({ success: false, error: 'Mật khẩu không chính xác!' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        await db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").bind(new Date().toISOString(), user.id).run();

        const safeUser = {
          id: user.id,
          hrmCode: user.hrm_code,
          fullName: user.full_name,
          unitId: user.unit_id,
          username: user.username,
          role: user.role,
          mustChangePassword: !!user.must_change_password,
          canViewReports: !!user.can_view_reports,
          avatarUrl: user.avatar_url,
          status: user.status
        };

        return new Response(JSON.stringify({ success: true, user: safeUser }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // -------------------------------------------------------------
      // 5. Đổi Mật Khẩu (/api/auth/change-password)
      // -------------------------------------------------------------
      if (pathname === '/api/auth/change-password' && request.method === 'POST') {
        const body = await request.json();
        const { userId, oldPassword, newPassword } = body;

        const user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
        if (!user) {
          return new Response(JSON.stringify({ success: false, error: 'Không tìm thấy người dùng!' }), {
            status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (oldPassword && user.password_hash !== oldPassword) {
          return new Response(JSON.stringify({ success: false, error: 'Mật khẩu cũ không chính xác!' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        await db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?").bind(newPassword, userId).run();

        return new Response(JSON.stringify({ success: true, message: 'Đổi mật khẩu thành công!' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // -------------------------------------------------------------
      // 6. Xử lý các thao tác CRUD Lưu Trữ Đồng Bộ
      // -------------------------------------------------------------
      if (pathname === '/api/units' && request.method === 'POST') {
        const u = await request.json();
        await db.prepare(\`
          INSERT INTO units (id, code, name, parent_id, level, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET code=excluded.code, name=excluded.name, parent_id=excluded.parent_id, level=excluded.level, status=excluded.status
        \`).bind(u.id, u.code, u.name, u.parentId || null, u.level || 1, u.status || 'ACTIVE', u.createdAt || new Date().toISOString()).run();
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (pathname.startsWith('/api/units/') && request.method === 'DELETE') {
        const id = pathname.split('/').pop();
        await db.prepare("DELETE FROM units WHERE id = ?").bind(id).run();
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (pathname === '/api/users' && request.method === 'POST') {
        const u = await request.json();
        const pwd = u.password || 'Vnpt@2026';
        await db.prepare(\`
          INSERT INTO users (id, hrm_code, full_name, unit_id, username, password_hash, role, must_change_password, can_view_reports, avatar_url, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET hrm_code=excluded.hrm_code, full_name=excluded.full_name, unit_id=excluded.unit_id, username=excluded.username, role=excluded.role, must_change_password=excluded.must_change_password, can_view_reports=excluded.can_view_reports, avatar_url=excluded.avatar_url, status=excluded.status
        \`).bind(u.id, u.hrmCode, u.fullName, u.unitId, u.username, pwd, u.role || 'USER', u.mustChangePassword ? 1 : 0, u.canViewReports ? 1 : 0, u.avatarUrl || null, u.status || 'ACTIVE', u.createdAt || new Date().toISOString()).run();
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (pathname.startsWith('/api/users/reset-password') && request.method === 'POST') {
        const { userId } = await request.json();
        await db.prepare("UPDATE users SET password_hash = 'Vnpt@2026', must_change_password = 1 WHERE id = ?").bind(userId).run();
        return new Response(JSON.stringify({ success: true, message: 'Đã reset mật khẩu về Vnpt@2026!' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (pathname.startsWith('/api/users/') && request.method === 'DELETE') {
        const id = pathname.split('/').pop();
        await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Chiến dịch & Khóa/Mở khóa
      if (pathname === '/api/campaigns' && request.method === 'POST') {
        const c = await request.json();
        await db.prepare(\`
          INSERT INTO campaigns (id, code, name, period_type, period_value, start_date, end_date, is_locked, description, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET code=excluded.code, name=excluded.name, period_type=excluded.period_type, period_value=excluded.period_value, start_date=excluded.start_date, end_date=excluded.end_date, is_locked=excluded.is_locked, description=excluded.description
        \`).bind(c.id, c.code, c.name, c.periodType, c.periodValue, c.startDate, c.endDate, c.isLocked ? 1 : 0, c.description || '', c.createdAt || new Date().toISOString()).run();
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Lưu kết quả đánh giá (Evaluations)
      if (pathname === '/api/evaluations' && request.method === 'POST') {
        const ev = await request.json();
        await db.prepare(\`
          INSERT INTO evaluations (id, campaign_id, evaluator_id, evaluator_unit_id, target_unit_id, scores_json, average_score, status, submitted_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET scores_json=excluded.scores_json, average_score=excluded.average_score, status=excluded.status, submitted_at=excluded.submitted_at, updated_at=excluded.updated_at
        \`).bind(ev.id, ev.campaignId, ev.evaluatorId, ev.evaluatorUnitId, ev.targetUnitId, JSON.stringify(ev.scores), ev.averageScore, ev.status || 'SUBMITTED', ev.submittedAt || new Date().toISOString(), new Date().toISOString()).run();
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Gán người dùng đánh giá theo đợt
      if (pathname === '/api/evaluators/save-batch' && request.method === 'POST') {
        const { campaignId, evaluators } = await request.json();
        await db.prepare("DELETE FROM campaign_evaluators WHERE campaign_id = ?").bind(campaignId).run();
        for (const ev of evaluators) {
          await db.prepare(\`INSERT INTO campaign_evaluators (campaign_id, user_id, unit_id, assigned_at) VALUES (?, ?, ?, ?)\`)
            .bind(campaignId, ev.userId, ev.unitId, ev.assignedAt || new Date().toISOString()).run();
        }
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Endpoint mặc định không khớp
      return new Response(JSON.stringify({ error: 'Endpoint không tồn tại' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message || 'Lỗi xử lý Cloudflare D1' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
`;

export const CLOUDFLARE_7_STEPS = [
  {
    step: 1,
    title: 'Tạo D1 SQL Database trên Cloudflare',
    desc: 'Truy cập dash.cloudflare.com -> Chọn menu Workers & Pages bên trái -> Chọn tab D1 SQL Database -> Bấm nút "Create Database". Đặt tên Database là "vnpt_d1_db" -> Bấm Create.',
    tag: 'dash.cloudflare.com / Workers & Pages / D1',
  },
  {
    step: 2,
    title: 'Tạo Worker API tiếp nhận kết nối',
    desc: 'Tại menu Workers & Pages -> Bấm "Create Application" -> Chọn "Create Worker" -> Đặt tên Worker là "vnpt-eval-api" -> Bấm "Deploy".',
    tag: 'Create Worker',
  },
  {
    step: 3,
    title: 'Liên kết (Bind) D1 Database vào Worker',
    desc: 'Vào trang quản lý Worker vừa tạo -> Chọn tab "Settings" -> Chọn "Variables and Secrets" -> Kéo xuống mục "D1 Database Bindings" -> Bấm "Add binding". Đặt Variable name chính xác là "DB", chọn Database là "vnpt_d1_db" -> Bấm "Save".',
    tag: 'Worker Settings -> Bindings -> DB',
  },
  {
    step: 4,
    title: 'Chạy Mã SQL Schema tạo cấu trúc bảng',
    desc: 'Vào lại D1 Database "vnpt_d1_db" -> Chọn tab "Console" -> Copy toàn bộ mã SQL Schema ở mục bên dưới, dán vào ô SQL và bấm "Execute" (Hoặc bấm nút Khởi tạo bảng ngay trên giao diện web này sau khi kết nối).',
    tag: 'D1 Console -> Execute SQL',
  },
  {
    step: 5,
    title: 'Dán Mã Nguồn Worker API vào Web Editor',
    desc: 'Quay lại Worker "vnpt-eval-api" -> Bấm nút "Edit Code" ở góc trên -> Xóa hết code mẫu hiện tại, copy toàn bộ Mã Nguồn Worker API ở mục bên dưới và dán vào -> Bấm "Save and Deploy".',
    tag: 'Worker Web Editor -> Save & Deploy',
  },
  {
    step: 6,
    title: 'Sao chép URL Worker API Cloudflare',
    desc: 'Sau khi Deploy thành công, sao chép địa chỉ URL của Worker (có định dạng ví dụ: https://vnpt-eval-api.<tên-subdomain>.workers.dev).',
    tag: 'Copy Worker URL',
  },
  {
    step: 7,
    title: 'Dán URL vào Hệ thống & Kiểm tra Kết nối',
    desc: 'Dán URL Worker vào ô "Cloudflare Worker URL" ở bảng điều khiển bên trên, bấm nút "Kiểm tra kết nối". Hệ thống sẽ báo trạng thái ONLINE màu xanh và tự động đồng bộ dữ liệu người dùng, phân quyền lên D1.',
    tag: 'Kiểm tra & Hoàn tất',
  },
];
