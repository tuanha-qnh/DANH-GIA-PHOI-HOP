/**
 * =========================================================================
 * VNPT COORDINATION EVALUATION SYSTEM - CLOUDFLARE WORKER D1 API
 * Dán toàn bộ mã này vào Cloudflare Worker Web Editor (dash.cloudflare.com)
 * =========================================================================
 * Yêu cầu:
 * 1. Binding D1 Database tên là 'DB' trong Settings -> Variables -> D1 Bindings
 * 2. (Tùy chọn) Đặt mật khẩu / Secret trong Settings -> Variables and Secrets:
 *    Biến có thể đặt tên là PASSWORD, API_TOKEN, API_KEY, SECRET, AUTH_TOKEN, v.v.
 */

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-token, x-api-key, x-worker-password',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;
    const db = env.DB;

    if (!db) {
      return new Response(JSON.stringify({
        success: false,
        error: "Chưa cấu hình D1 Database Binding với biến tên 'DB' trong Settings Worker!"
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Kiểm tra Mật khẩu / Secret bảo mật Worker (nếu người dùng có cấu hình trong Settings -> Variables)
    const configuredSecret = 
      env.PASSWORD ||
      env.API_TOKEN ||
      env.API_KEY ||
      env.API_SECRET ||
      env.SECRET ||
      env.AUTH_TOKEN ||
      env.TOKEN ||
      env.WORKER_PASSWORD ||
      env.ADMIN_PASSWORD ||
      env.SECRET_KEY ||
      env.MAT_KHAU;

    // Lấy token / mật khẩu do client gửi lên
    const authHeader = request.headers.get('Authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
    const headerToken = request.headers.get('x-api-token') || 
                        request.headers.get('x-api-key') || 
                        request.headers.get('x-worker-password') || '';
    const queryToken = url.searchParams.get('token') || 
                       url.searchParams.get('key') || 
                       url.searchParams.get('secret') || 
                       url.searchParams.get('password') || '';

    const clientToken = (bearerToken || headerToken || queryToken).trim();

    // Nếu Worker có đặt mật khẩu bảo vệ, kiểm tra xác thực đối với các endpoint (trừ OPTIONS đã xử lý ở trên)
    if (configuredSecret && pathname !== '/api/health' && pathname !== '/') {
      if (clientToken !== configuredSecret) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Mật khẩu bảo mật Worker không chính xác (401 Unauthorized). Vui lòng cấu hình đúng Mật khẩu/Secret trong giao diện web!'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    try {
      if (pathname === '/api/health' || pathname === '/') {
        let tablesCount = 0;
        try {
          const res = await db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table'").first();
          tablesCount = res ? res.count : 0;
        } catch (e) {}

        const hasSecret = !!configuredSecret;
        const isSecretValid = !configuredSecret || (clientToken === configuredSecret);

        if (hasSecret && !isSecretValid) {
          return new Response(JSON.stringify({
            success: false,
            status: 'AUTH_FAILED',
            error: 'Mật khẩu truy cập Worker không khớp với mật khẩu đặt trên Cloudflare Worker (401 Unauthorized)',
            hasSecretProtection: true,
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({
          success: true,
          status: 'ONLINE',
          message: 'Kết nối Cloudflare D1 thành công!',
          timestamp: new Date().toISOString(),
          tablesCount,
          hasSecretProtection: hasSecret
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (pathname === '/api/init-schema' && request.method === 'POST') {
        const statements = [
          `CREATE TABLE IF NOT EXISTS units (id TEXT PRIMARY KEY, code TEXT UNIQUE, name TEXT, parent_id TEXT, level INTEGER, status TEXT, created_at TEXT)`,
          `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, hrm_code TEXT, full_name TEXT, unit_id TEXT, username TEXT UNIQUE, password_hash TEXT, role TEXT, must_change_password INTEGER, can_view_reports INTEGER, avatar_url TEXT, status TEXT, created_at TEXT, last_login_at TEXT)`,
          `CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, code TEXT UNIQUE, name TEXT, period_type TEXT, period_value TEXT, start_date TEXT, end_date TEXT, is_locked INTEGER, description TEXT, created_at TEXT)`,
          `CREATE TABLE IF NOT EXISTS criteria (id TEXT PRIMARY KEY, code TEXT UNIQUE, name TEXT, description TEXT, weight REAL, min_score INTEGER, max_score INTEGER, order_index INTEGER)`,
          `CREATE TABLE IF NOT EXISTS campaign_target_units (campaign_id TEXT, unit_id TEXT, PRIMARY KEY (campaign_id, unit_id))`,
          `CREATE TABLE IF NOT EXISTS campaign_evaluating_units (campaign_id TEXT, unit_id TEXT, PRIMARY KEY (campaign_id, unit_id))`,
          `CREATE TABLE IF NOT EXISTS campaign_criteria (campaign_id TEXT, criterion_id TEXT, PRIMARY KEY (campaign_id, criterion_id))`,
          `CREATE TABLE IF NOT EXISTS campaign_evaluators (campaign_id TEXT, user_id TEXT, unit_id TEXT, assigned_at TEXT, PRIMARY KEY (campaign_id, user_id))`,
          `CREATE TABLE IF NOT EXISTS evaluations (id TEXT PRIMARY KEY, campaign_id TEXT, evaluator_id TEXT, evaluator_unit_id TEXT, target_unit_id TEXT, scores_json TEXT, average_score REAL, status TEXT, submitted_at TEXT, updated_at TEXT)`,
          `CREATE TABLE IF NOT EXISTS app_config (config_key TEXT PRIMARY KEY, config_value TEXT, updated_at TEXT)`
        ];

        for (const sql of statements) {
          await db.prepare(sql).run();
        }

        // 1. Seed Admin & initial Users
        await db.prepare(`
          INSERT OR IGNORE INTO users (id, hrm_code, full_name, unit_id, username, password_hash, role, must_change_password, can_view_reports, status, created_at)
          VALUES ('user-admin', 'HRM-0001', 'Quản trị viên Hệ thống VNPT', 'u-root', 'admin', 'Vnpt@2026', 'ADMIN', 0, 1, 'ACTIVE', datetime('now'))
        `).run();
        await db.prepare(`
          INSERT OR IGNORE INTO users (id, hrm_code, full_name, unit_id, username, password_hash, role, must_change_password, can_view_reports, status, created_at)
          VALUES ('user-ttkd-1', 'HRM-0101', 'Nguyễn Văn An (TT Kinh Doanh)', 'u-ttkd', 'user_ttkd1', 'Vnpt@123', 'USER', 0, 1, 'ACTIVE', datetime('now'))
        `).run();

        // 2. Seed initial Units
        const seedUnits = [
          ['u-root', 'VNPT-TINH', 'Viễn thông Tỉnh / VNPT Địa bàn', null, 0],
          ['u-ttkd', 'TTKD', 'Trung tâm Kinh doanh VNPT', 'u-root', 1],
          ['u-ttcntt', 'TTCNTT', 'Trung tâm Công nghệ Thông tin', 'u-root', 1],
          ['u-ttdhtt', 'TTDHTT', 'Trung tâm Điều hành Thông tin', 'u-root', 1],
          ['u-pkt-tc', 'PKTTC', 'Phòng Kế toán - Tài chính', 'u-root', 1],
          ['u-p-ns', 'PNS', 'Phòng Nhân sự - Tổng hợp', 'u-root', 1],
          ['u-p-kh', 'PKH', 'Phòng Kế hoạch - Đầu tư', 'u-root', 1],
        ];
        for (const [uid, ucode, uname, uparent, ulevel] of seedUnits) {
          await db.prepare("INSERT OR IGNORE INTO units (id, code, name, parent_id, level, status, created_at) VALUES (?, ?, ?, ?, ?, 'ACTIVE', datetime('now'))")
            .bind(uid, ucode, uname, uparent, ulevel).run();
        }

        // 3. Seed initial Criteria (Thang điểm 1-10)
        const seedCriteria = [
          ['tc-1', 'TC01', 'Tốc độ phản hồi và thời gian xử lý yêu cầu phối hợp', 'Đánh giá tính kịp thời, đúng hạn khi tiếp nhận và giải quyết văn bản, phiếu yêu cầu phối hợp giữa các đơn vị.', 1.0, 1, 10, 1],
          ['tc-2', 'TC02', 'Chất lượng tài liệu, hồ sơ và dữ liệu bàn giao kỹ thuật / nghiệp vụ', 'Đánh giá tính chính xác, đầy đủ, chuẩn hóa của biên bản bàn giao, tài liệu kỹ thuật, số liệu báo cáo.', 1.0, 1, 10, 2],
          ['tc-3', 'TC03', 'Tinh thần hợp tác, trách nhiệm và thái độ phối hợp giải quyết vướng mắc', 'Sự thiện chí, chủ động lắng nghe, không đùn đẩy trách nhiệm khi phát sinh sự cố liên đơn vị.', 1.0, 1, 10, 3],
          ['tc-4', 'TC04', 'Tính chủ động đề xuất giải pháp tháo gỡ khó khăn chung', 'Đưa ra các sáng kiến, giải pháp linh hoạt nhằm tối ưu hóa tiến độ công việc chung.', 1.0, 1, 10, 4],
          ['tc-5', 'TC05', 'Tuân thủ quy trình nghiệp vụ và cam kết SLA nội bộ', 'Thực hiện đúng quy chuẩn mạng lưới, quy trình bán hàng và quy định nội bộ VNPT.', 1.0, 1, 10, 5],
        ];
        for (const [cid, ccode, cname, cdesc, cweight, cmin, cmax, corder] of seedCriteria) {
          await db.prepare("INSERT OR IGNORE INTO criteria (id, code, name, description, weight, min_score, max_score, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(cid, ccode, cname, cdesc, cweight, cmin, cmax, corder).run();
        }

        // 4. Seed initial Campaign
        await db.prepare(`
          INSERT OR IGNORE INTO campaigns (id, code, name, period_type, period_value, start_date, end_date, is_locked, description, created_at)
          VALUES ('camp-q1-2026', 'DG-Q1-2026', 'Đánh giá phối hợp công tác Quý 1/2026', 'QUARTER', 'Q1-2026', '2026-01-01T00:00:00Z', '2026-03-31T23:59:59Z', 0, 'Đợt đánh giá phối hợp liên phòng ban định kỳ Quý 1/2026 toàn địa bàn VNPT.', datetime('now'))
        `).run();

        // 5. Seed initial target units & evaluating units for camp-q1-2026
        const initialUnitIds = ['u-ttkd', 'u-ttcntt', 'u-ttdhtt', 'u-pkt-tc', 'u-p-ns', 'u-p-kh'];
        for (const uid of initialUnitIds) {
          await db.prepare("INSERT OR IGNORE INTO campaign_target_units (campaign_id, unit_id) VALUES ('camp-q1-2026', ?)").bind(uid).run();
          await db.prepare("INSERT OR IGNORE INTO campaign_evaluating_units (campaign_id, unit_id) VALUES ('camp-q1-2026', ?)").bind(uid).run();
        }

        // 6. Seed initial criteria for camp-q1-2026
        for (const [cid] of seedCriteria) {
          await db.prepare("INSERT OR IGNORE INTO campaign_criteria (campaign_id, criterion_id) VALUES ('camp-q1-2026', ?)").bind(cid).run();
        }

        return new Response(JSON.stringify({ success: true, message: 'Khởi tạo D1 Schema & dữ liệu mẫu VNPT thành công!' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (pathname === '/api/sync/all' && request.method === 'GET') {
        // Auto-seed criteria if table is empty
        try {
          const critCountRes = await db.prepare("SELECT count(*) as c FROM criteria").first();
          if (!critCountRes || critCountRes.c === 0) {
            const seedCriteria = [
              ['tc-1', 'TC01', 'Tốc độ phản hồi và thời gian xử lý yêu cầu phối hợp', 'Đánh giá tính kịp thời, đúng hạn khi tiếp nhận và giải quyết văn bản, phiếu yêu cầu phối hợp giữa các đơn vị.', 1.0, 1, 10, 1],
              ['tc-2', 'TC02', 'Chất lượng tài liệu, hồ sơ và dữ liệu bàn giao kỹ thuật / nghiệp vụ', 'Đánh giá tính chính xác, đầy đủ, chuẩn hóa của biên bản bàn giao, tài liệu kỹ thuật, số liệu báo cáo.', 1.0, 1, 10, 2],
              ['tc-3', 'TC03', 'Tinh thần hợp tác, trách nhiệm và thái độ phối hợp giải quyết vướng mắc', 'Sự thiện chí, chủ động lắng nghe, không đùn đẩy trách nhiệm khi phát sinh sự cố liên đơn vị.', 1.0, 1, 10, 3],
              ['tc-4', 'TC04', 'Tính chủ động đề xuất giải pháp tháo gỡ khó khăn chung', 'Đưa ra các sáng kiến, giải pháp linh hoạt nhằm tối ưu hóa tiến độ công việc chung.', 1.0, 1, 10, 4],
              ['tc-5', 'TC05', 'Tuân thủ quy trình nghiệp vụ và cam kết SLA nội bộ', 'Thực hiện đúng quy chuẩn mạng lưới, quy trình bán hàng và quy định nội bộ VNPT.', 1.0, 1, 10, 5],
            ];
            for (const [cid, ccode, cname, cdesc, cweight, cmin, cmax, corder] of seedCriteria) {
              await db.prepare("INSERT OR IGNORE INTO criteria (id, code, name, description, weight, min_score, max_score, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
                .bind(cid, ccode, cname, cdesc, cweight, cmin, cmax, corder).run();
              await db.prepare("INSERT OR IGNORE INTO campaign_criteria (campaign_id, criterion_id) VALUES ('camp-q1-2026', ?)").bind(cid).run();
            }
          }
        } catch (e) {}

        const units = (await db.prepare("SELECT * FROM units ORDER BY level ASC, code ASC").all()).results || [];
        const users = (await db.prepare("SELECT id, hrm_code as hrmCode, full_name as fullName, unit_id as unitId, username, role, must_change_password as mustChangePassword, can_view_reports as canViewReports, avatar_url as avatarUrl, status, created_at as createdAt, last_login_at as lastLoginAt FROM users").all()).results || [];
        const campaigns = (await db.prepare("SELECT id, code, name, period_type as periodType, period_value as periodValue, start_date as startDate, end_date as endDate, is_locked as isLocked, description, created_at as createdAt FROM campaigns ORDER BY created_at DESC").all()).results || [];
        const criteria = (await db.prepare("SELECT id, code, name, description, weight, min_score as minScore, max_score as maxScore, order_index as orderIndex FROM criteria ORDER BY order_index ASC").all()).results || [];
        const targetUnits = (await db.prepare("SELECT campaign_id as campaignId, unit_id as unitId FROM campaign_target_units").all()).results || [];
        const evaluatingUnits = (await db.prepare("SELECT campaign_id as campaignId, unit_id as unitId FROM campaign_evaluating_units").all()).results || [];
        const campaignCriteria = (await db.prepare("SELECT campaign_id as campaignId, criterion_id as criterionId FROM campaign_criteria").all()).results || [];
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
            campaignCriteria,
            evaluators,
            evaluations
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (pathname === '/api/auth/login' && request.method === 'POST') {
        const body = await request.json();
        const { username, password } = body;

        const user = await db.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();
        if (!user) {
          return new Response(JSON.stringify({ success: false, error: 'Tên đăng nhập không tồn tại!' }), {
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

      if (pathname === '/api/units' && request.method === 'POST') {
        const u = await request.json();
        await db.prepare(`
          INSERT INTO units (id, code, name, parent_id, level, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET code=excluded.code, name=excluded.name, parent_id=excluded.parent_id, level=excluded.level, status=excluded.status
        `).bind(u.id, u.code, u.name, u.parentId || null, u.level || 1, u.status || 'ACTIVE', u.createdAt || new Date().toISOString()).run();
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
        await db.prepare(`
          INSERT INTO users (id, hrm_code, full_name, unit_id, username, password_hash, role, must_change_password, can_view_reports, avatar_url, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET hrm_code=excluded.hrm_code, full_name=excluded.full_name, unit_id=excluded.unit_id, username=excluded.username, role=excluded.role, must_change_password=excluded.must_change_password, can_view_reports=excluded.can_view_reports, avatar_url=excluded.avatar_url, status=excluded.status
        `).bind(u.id, u.hrmCode, u.fullName, u.unitId, u.username, pwd, u.role || 'USER', u.mustChangePassword ? 1 : 0, u.canViewReports ? 1 : 0, u.avatarUrl || null, u.status || 'ACTIVE', u.createdAt || new Date().toISOString()).run();
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

      if (pathname === '/api/campaigns' && request.method === 'POST') {
        const c = await request.json();
        await db.prepare(`
          INSERT INTO campaigns (id, code, name, period_type, period_value, start_date, end_date, is_locked, description, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET code=excluded.code, name=excluded.name, period_type=excluded.period_type, period_value=excluded.period_value, start_date=excluded.start_date, end_date=excluded.end_date, is_locked=excluded.is_locked, description=excluded.description
        `).bind(c.id, c.code, c.name, c.periodType, c.periodValue, c.startDate, c.endDate, c.isLocked ? 1 : 0, c.description || '', c.createdAt || new Date().toISOString()).run();
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (pathname.startsWith('/api/campaigns/') && request.method === 'DELETE') {
        const id = pathname.split('/').pop();
        await db.prepare("DELETE FROM campaigns WHERE id = ?").bind(id).run();
        await db.prepare("DELETE FROM campaign_target_units WHERE campaign_id = ?").bind(id).run();
        await db.prepare("DELETE FROM campaign_evaluating_units WHERE campaign_id = ?").bind(id).run();
        await db.prepare("DELETE FROM campaign_criteria WHERE campaign_id = ?").bind(id).run();
        await db.prepare("DELETE FROM campaign_evaluators WHERE campaign_id = ?").bind(id).run();
        await db.prepare("DELETE FROM evaluations WHERE campaign_id = ?").bind(id).run();
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (pathname === '/api/evaluations' && request.method === 'POST') {
        const ev = await request.json();
        await db.prepare(`
          INSERT INTO evaluations (id, campaign_id, evaluator_id, evaluator_unit_id, target_unit_id, scores_json, average_score, status, submitted_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET scores_json=excluded.scores_json, average_score=excluded.average_score, status=excluded.status, submitted_at=excluded.submitted_at, updated_at=excluded.updated_at
        `).bind(ev.id, ev.campaignId, ev.evaluatorId, ev.evaluatorUnitId, ev.targetUnitId, JSON.stringify(ev.scores), ev.averageScore, ev.status || 'SUBMITTED', ev.submittedAt || new Date().toISOString(), new Date().toISOString()).run();
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (pathname === '/api/evaluators/save-batch' && request.method === 'POST') {
        const { campaignId, evaluators } = await request.json();
        await db.prepare("DELETE FROM campaign_evaluators WHERE campaign_id = ?").bind(campaignId).run();
        for (const ev of evaluators) {
          await db.prepare(`INSERT INTO campaign_evaluators (campaign_id, user_id, unit_id, assigned_at) VALUES (?, ?, ?, ?)`)
            .bind(campaignId, ev.userId, ev.unitId, ev.assignedAt || new Date().toISOString()).run();
        }
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (pathname === '/api/campaign-config' && request.method === 'POST') {
        const { campaignId, targetUnitIds, evaluatingUnitIds, criterionIds, evaluators } = await request.json();

        if (Array.isArray(targetUnitIds)) {
          await db.prepare("DELETE FROM campaign_target_units WHERE campaign_id = ?").bind(campaignId).run();
          for (const uid of targetUnitIds) {
            await db.prepare("INSERT INTO campaign_target_units (campaign_id, unit_id) VALUES (?, ?)").bind(campaignId, uid).run();
          }
        }

        if (Array.isArray(evaluatingUnitIds)) {
          await db.prepare("DELETE FROM campaign_evaluating_units WHERE campaign_id = ?").bind(campaignId).run();
          for (const uid of evaluatingUnitIds) {
            await db.prepare("INSERT INTO campaign_evaluating_units (campaign_id, unit_id) VALUES (?, ?)").bind(campaignId, uid).run();
          }
        }

        if (Array.isArray(criterionIds)) {
          await db.prepare("DELETE FROM campaign_criteria WHERE campaign_id = ?").bind(campaignId).run();
          for (const cid of criterionIds) {
            await db.prepare("INSERT INTO campaign_criteria (campaign_id, criterion_id) VALUES (?, ?)").bind(campaignId, cid).run();
          }
        }

        if (Array.isArray(evaluators)) {
          await db.prepare("DELETE FROM campaign_evaluators WHERE campaign_id = ?").bind(campaignId).run();
          for (const ev of evaluators) {
            await db.prepare("INSERT INTO campaign_evaluators (campaign_id, user_id, unit_id, assigned_at) VALUES (?, ?, ?, ?)").bind(campaignId, ev.userId, ev.unitId, ev.assignedAt || new Date().toISOString()).run();
          }
        }

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (pathname === '/api/criteria' && request.method === 'POST') {
        const c = await request.json();
        await db.prepare(`
          INSERT INTO criteria (id, code, name, description, weight, min_score, max_score, order_index)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET code=excluded.code, name=excluded.name, description=excluded.description, weight=excluded.weight, min_score=excluded.min_score, max_score=excluded.max_score, order_index=excluded.order_index
        `).bind(c.id, c.code, c.name, c.description || '', c.weight || 1, c.minScore || 1, c.maxScore || 10, c.orderIndex || 1).run();
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (pathname.startsWith('/api/criteria/') && request.method === 'DELETE') {
        const id = pathname.split('/').pop();
        await db.prepare("DELETE FROM criteria WHERE id = ?").bind(id).run();
        await db.prepare("DELETE FROM campaign_criteria WHERE criterion_id = ?").bind(id).run();
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

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
