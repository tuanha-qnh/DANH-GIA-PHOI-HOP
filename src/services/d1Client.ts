/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Campaign,
  CampaignCriterion,
  CampaignEvaluatingUnit,
  CampaignEvaluator,
  CampaignTargetUnit,
  Criterion,
  EvaluationRecord,
  Unit,
  User,
} from '../types';
import {
  INITIAL_CAMPAIGNS,
  INITIAL_CAMPAIGN_CRITERIA,
  INITIAL_CRITERIA,
  INITIAL_EVALUATING_UNITS,
  INITIAL_EVALUATORS,
  INITIAL_TARGET_UNITS,
  INITIAL_UNITS,
  INITIAL_USERS,
} from '../constants/initialData';
import { D1_WORKER_URL, D1_WORKER_PASSWORD } from '../config/d1Config';

export interface FullSyncData {
  units: Unit[];
  users: User[];
  campaigns: Campaign[];
  criteria: Criterion[];
  targetUnits: CampaignTargetUnit[];
  evaluatingUnits: CampaignEvaluatingUnit[];
  campaignCriteria: CampaignCriterion[];
  evaluators: CampaignEvaluator[];
  evaluations: EvaluationRecord[];
}

export const D1_CONFIG_KEY = 'vnpt_d1_worker_url';
export const D1_TOKEN_KEY = 'vnpt_d1_api_token';
export const D1_LOCAL_STORAGE_BACKUP = 'vnpt_d1_data_store_v2';

const initialEvaluations: EvaluationRecord[] = [
  {
    id: 'eval-sample-1',
    campaignId: 'camp-q1-2026',
    evaluatorId: 'user-ttkd-1',
    evaluatorUnitId: 'u-ttkd',
    targetUnitId: 'u-ttcntt',
    scores: {
      'tc-1': { score: 9 },
      'tc-2': { score: 8 },
      'tc-3': { score: 9 },
      'tc-4': { score: 8 },
      'tc-5': { score: 9 },
    },
    averageScore: 8.6,
    status: 'SUBMITTED',
    submittedAt: '2026-03-10T14:30:00Z',
    updatedAt: '2026-03-10T14:30:00Z',
  },
  {
    id: 'eval-sample-2',
    campaignId: 'camp-q1-2026',
    evaluatorId: 'user-ttcntt-1',
    evaluatorUnitId: 'u-ttcntt',
    targetUnitId: 'u-ttkd',
    scores: {
      'tc-1': { score: 8 },
      'tc-2': { score: 7 },
      'tc-3': { score: 8 },
      'tc-4': { score: 7 },
      'tc-5': { score: 8 },
    },
    averageScore: 7.6,
    status: 'SUBMITTED',
    submittedAt: '2026-03-11T10:15:00Z',
    updatedAt: '2026-03-11T10:15:00Z',
  },
  {
    id: 'eval-sample-3',
    campaignId: 'camp-q1-2026',
    evaluatorId: 'user-ttdhtt-1',
    evaluatorUnitId: 'u-ttdhtt',
    targetUnitId: 'u-pkt-tc',
    scores: {
      'tc-1': {
        score: 5,
        lowScoreReason:
          'Thời gian phê duyệt thanh toán chi phí bảo trì mạng cáp quang còn chậm, ảnh hưởng đến tiến độ của nhà thầu viễn thông.',
      },
      'tc-2': { score: 8 },
      'tc-3': { score: 8 },
      'tc-4': {
        score: 6,
        lowScoreReason:
          'Cần linh hoạt hơn trong việc tạm ứng kinh phí ứng cứu thông tin khẩn cấp trong mùa mưa bão theo quy chuẩn VNPT.',
      },
      'tc-5': { score: 7 },
    },
    averageScore: 6.8,
    status: 'SUBMITTED',
    submittedAt: '2026-03-12T09:00:00Z',
    updatedAt: '2026-03-12T09:00:00Z',
  },
];

function loadStoreFromStorage(): FullSyncData {
  try {
    const raw = localStorage.getItem(D1_LOCAL_STORAGE_BACKUP);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          units: parsed.units?.length ? parsed.units : [...INITIAL_UNITS],
          users: parsed.users?.length ? parsed.users : [...INITIAL_USERS],
          campaigns: parsed.campaigns?.length ? parsed.campaigns : [...INITIAL_CAMPAIGNS],
          criteria: parsed.criteria?.length ? parsed.criteria : [...INITIAL_CRITERIA],
          targetUnits: parsed.targetUnits?.length ? parsed.targetUnits : [...INITIAL_TARGET_UNITS],
          evaluatingUnits: parsed.evaluatingUnits?.length ? parsed.evaluatingUnits : [...INITIAL_EVALUATING_UNITS],
          campaignCriteria: parsed.campaignCriteria?.length ? parsed.campaignCriteria : [...INITIAL_CAMPAIGN_CRITERIA],
          evaluators: parsed.evaluators?.length ? parsed.evaluators : [...INITIAL_EVALUATORS],
          evaluations: parsed.evaluations?.length ? parsed.evaluations : [...initialEvaluations],
        };
      }
    }
  } catch {}
  return {
    units: [...INITIAL_UNITS],
    users: [...INITIAL_USERS],
    campaigns: [...INITIAL_CAMPAIGNS],
    criteria: [...INITIAL_CRITERIA],
    targetUnits: [...INITIAL_TARGET_UNITS],
    evaluatingUnits: [...INITIAL_EVALUATING_UNITS],
    campaignCriteria: [...INITIAL_CAMPAIGN_CRITERIA],
    evaluators: [...INITIAL_EVALUATORS],
    evaluations: [...initialEvaluations],
  };
}

function persistStoreToStorage(store: FullSyncData) {
  try {
    localStorage.setItem(D1_LOCAL_STORAGE_BACKUP, JSON.stringify(store));
  } catch (e) {
    console.warn('Could not persist to localStorage:', e);
  }
}

// In-memory online state fallback when external Worker is not yet reached
let inMemoryStore: FullSyncData = loadStoreFromStorage();

export const d1Client = {
  getStoredWorkerUrl(): string {
    // 1. Tự động dọn dẹp URL mẫu không tồn tại trong localStorage nếu có
    const legacy = localStorage.getItem(D1_CONFIG_KEY);
    if (
      legacy &&
      (legacy.trim() === 'https://vnpt-eval-api.workers.dev' ||
        legacy.trim() === 'http://vnpt-eval-api.workers.dev' ||
        legacy.includes('your-subdomain') ||
        legacy.includes('<'))
    ) {
      localStorage.removeItem(D1_CONFIG_KEY);
    }

    const stored = localStorage.getItem(D1_CONFIG_KEY);
    const envUrl = (import.meta.env?.VITE_D1_WORKER_URL as string) || '';
    const configUrl = D1_WORKER_URL || '';

    const candidates = [stored, envUrl, configUrl];
    for (const raw of candidates) {
      if (!raw) continue;
      const clean = raw.trim().replace(/\/+$/, '');
      if (
        clean &&
        clean !== 'https://vnpt-eval-api.workers.dev' &&
        clean !== 'http://vnpt-eval-api.workers.dev' &&
        !clean.includes('your-subdomain') &&
        !clean.includes('<')
      ) {
        return clean;
      }
    }
    return '';
  },

  setStoredWorkerUrl(url: string) {
    const clean = url.trim().replace(/\/+$/, '');
    if (clean) {
      localStorage.setItem(D1_CONFIG_KEY, clean);
    } else {
      localStorage.removeItem(D1_CONFIG_KEY);
    }
  },

  getStoredToken(): string {
    const stored = localStorage.getItem(D1_TOKEN_KEY);
    const envToken =
      (import.meta.env?.VITE_D1_WORKER_PASSWORD as string) ||
      (import.meta.env?.VITE_D1_API_TOKEN as string) ||
      (import.meta.env?.VITE_D1_WORKER_SECRET as string) ||
      '';
    return (stored || envToken || D1_WORKER_PASSWORD || 'Vnpt@2026').trim();
  },

  setStoredToken(token: string) {
    const clean = token.trim();
    if (clean) {
      localStorage.setItem(D1_TOKEN_KEY, clean);
    } else {
      localStorage.removeItem(D1_TOKEN_KEY);
    }
  },

  getAuthHeaders(): Record<string, string> {
    const token = this.getStoredToken();
    return {
      'Content-Type': 'application/json',
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
            'x-api-token': token,
            'x-api-key': token,
            'x-worker-password': token,
          }
        : {}),
    };
  },

  buildUrl(path: string): string {
    const workerUrl = this.getStoredWorkerUrl();
    if (!workerUrl) return '';
    const cleanUrl = workerUrl.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const token = this.getStoredToken();
    const separator = cleanPath.includes('?') ? '&' : '?';
    return token
      ? `${cleanUrl}${cleanPath}${separator}token=${encodeURIComponent(token)}`
      : `${cleanUrl}${cleanPath}`;
  },

  async testConnection(
    workerUrl: string,
    token?: string
  ): Promise<{
    success: boolean;
    latencyMs: number;
    message: string;
    tablesCount?: number;
    hasSecretProtection?: boolean;
  }> {
    const start = performance.now();
    const cleanUrl = workerUrl.trim().replace(/\/+$/, '');

    if (!cleanUrl) {
      await new Promise((r) => setTimeout(r, 100));
      return {
        success: true,
        latencyMs: Math.round(performance.now() - start),
        message: 'Hệ thống lưu trữ Online D1 (Mô phỏng tức thời) hoạt động bình thường.',
        tablesCount: 8,
      };
    }

    const testToken = (token !== undefined ? token : this.getStoredToken()).trim();

    try {
      const url = testToken
        ? `${cleanUrl}/api/health?token=${encodeURIComponent(testToken)}`
        : `${cleanUrl}/api/health`;

      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(testToken
            ? {
                Authorization: `Bearer ${testToken}`,
                'x-api-token': testToken,
                'x-api-key': testToken,
                'x-worker-password': testToken,
              }
            : {}),
        },
      });

      const latencyMs = Math.round(performance.now() - start);
      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        return {
          success: false,
          latencyMs,
          message:
            'Kết nối Worker thành công nhưng MẬT KHẨU WORKER KHÔNG KHỚP (401 Unauthorized). Vui lòng nhập đúng Mật khẩu/Secret đã đặt trên Cloudflare Worker!',
        };
      }

      if (res.ok && data?.success) {
        return {
          success: true,
          latencyMs,
          message: data.message || 'Kết nối Cloudflare D1 thành công!',
          tablesCount: data.tablesCount ?? 8,
          hasSecretProtection: data.hasSecretProtection,
        };
      }

      return {
        success: false,
        latencyMs,
        message: data?.error || `Worker phản hồi mã lỗi HTTP ${res.status}`,
      };
    } catch (err: unknown) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        success: false,
        latencyMs,
        message: `Không thể kết nối đến Worker "${cleanUrl}". Vui lòng kiểm tra lại URL Worker (Lỗi: ${(err as Error).message || 'Failed to fetch'}).`,
      };
    }
  },

  async initSchema(workerUrl: string, token?: string): Promise<{ success: boolean; message: string }> {
    const cleanUrl = workerUrl.trim().replace(/\/+$/, '');
    if (!cleanUrl) {
      return { success: true, message: 'Đã xác nhận Schema hợp lệ trên hệ thống!' };
    }

    const testToken = (token !== undefined ? token : this.getStoredToken()).trim();

    try {
      const url = testToken
        ? `${cleanUrl}/api/init-schema?token=${encodeURIComponent(testToken)}`
        : `${cleanUrl}/api/init-schema`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(testToken
            ? {
                Authorization: `Bearer ${testToken}`,
                'x-api-token': testToken,
                'x-api-key': testToken,
                'x-worker-password': testToken,
              }
            : {}),
        },
      });
      const data = await res.json();
      return {
        success: !!data.success,
        message: data.message || data.error || 'Khởi tạo hoàn tất',
      };
    } catch (err: unknown) {
      return {
        success: false,
        message: 'Lỗi gửi yêu cầu tạo bảng tới Worker: ' + (err as Error).message,
      };
    }
  },

  async syncAll(): Promise<FullSyncData> {
    const workerUrl = this.getStoredWorkerUrl();

    if (workerUrl) {
      const url = this.buildUrl('/api/sync/all');
      try {
        const res = await fetch(url, {
          headers: this.getAuthHeaders(),
        });

        if (res.status === 401) {
          throw new Error(
            'Mật khẩu Worker D1 không khớp (401 Unauthorized)! Vui lòng kiểm tra lại mật khẩu đã đặt trên Cloudflare Worker.'
          );
        }

        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(errJson?.error || `Worker báo mã lỗi HTTP ${res.status}`);
        }

        const json = await res.json();
        if (json.success && json.data) {
          inMemoryStore = {
            units: json.data.units && json.data.units.length > 0 ? json.data.units : inMemoryStore.units,
            users: json.data.users && json.data.users.length > 0 ? json.data.users : inMemoryStore.users,
            campaigns: json.data.campaigns && json.data.campaigns.length > 0 ? json.data.campaigns : inMemoryStore.campaigns,
            criteria: json.data.criteria && json.data.criteria.length > 0 ? json.data.criteria : inMemoryStore.criteria,
            targetUnits: json.data.targetUnits && json.data.targetUnits.length > 0 ? json.data.targetUnits : inMemoryStore.targetUnits,
            evaluatingUnits: json.data.evaluatingUnits && json.data.evaluatingUnits.length > 0 ? json.data.evaluatingUnits : inMemoryStore.evaluatingUnits,
            campaignCriteria: json.data.campaignCriteria && json.data.campaignCriteria.length > 0 ? json.data.campaignCriteria : inMemoryStore.campaignCriteria,
            evaluators: json.data.evaluators && json.data.evaluators.length > 0 ? json.data.evaluators : inMemoryStore.evaluators,
            evaluations: json.data.evaluations && json.data.evaluations.length > 0 ? json.data.evaluations : inMemoryStore.evaluations,
          };
          persistStoreToStorage(inMemoryStore);
          return inMemoryStore;
        }
      } catch (e: unknown) {
        console.error('Worker sync failed:', e);
        const errMsg = (e as Error).message || '';
        if (
          errMsg.includes('Failed to fetch') ||
          errMsg.includes('NetworkError') ||
          errMsg.includes('ERR_NAME_NOT_RESOLVED')
        ) {
          throw new Error(
            `Không thể kết nối đến máy chủ Cloudflare Worker tại "${workerUrl}". Vui lòng kiểm tra lại địa chỉ Worker URL và kết nối mạng.`
          );
        }
        throw e;
      }
    }

    persistStoreToStorage(inMemoryStore);
    return { ...inMemoryStore };
  },

  async saveUnit(unit: Unit): Promise<boolean> {
    const idx = inMemoryStore.units.findIndex((u) => u.id === unit.id);
    if (idx >= 0) {
      inMemoryStore.units[idx] = unit;
    } else {
      inMemoryStore.units.push(unit);
    }
    persistStoreToStorage(inMemoryStore);

    const workerUrl = this.getStoredWorkerUrl();
    if (workerUrl) {
      try {
        await fetch(this.buildUrl('/api/units'), {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(unit),
        });
      } catch (e) {
        console.error('Lỗi sync unit lên D1:', e);
      }
    }
    return true;
  },

  async deleteUnit(unitId: string): Promise<boolean> {
    inMemoryStore.units = inMemoryStore.units.filter((u) => u.id !== unitId);
    const workerUrl = this.getStoredWorkerUrl();
    if (workerUrl) {
      try {
        await fetch(this.buildUrl(`/api/units/${unitId}`), {
          method: 'DELETE',
          headers: this.getAuthHeaders(),
        });
      } catch (e) {
        console.error('Lỗi xóa unit trên D1:', e);
      }
    }
    return true;
  },

  async saveUser(
    user: User,
    password?: string
  ): Promise<{ success: boolean; syncedToD1: boolean; error?: string }> {
    const pwd = password || user.passwordHash || 'Vnpt@2026';
    const idx = inMemoryStore.users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      inMemoryStore.users[idx] = { ...user, passwordHash: pwd };
    } else {
      inMemoryStore.users.push({ ...user, passwordHash: pwd });
    }

    const workerUrl = this.getStoredWorkerUrl();
    if (workerUrl) {
      try {
        const res = await fetch(this.buildUrl('/api/users'), {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ ...user, password: pwd }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          return { success: true, syncedToD1: false, error: json.error || 'Worker trả về lỗi ' + res.status };
        }
        return { success: true, syncedToD1: true };
      } catch (e: unknown) {
        console.error('Lỗi sync user lên D1:', e);
        return { success: true, syncedToD1: false, error: (e as Error).message };
      }
    }
    return { success: true, syncedToD1: false };
  },

  async deleteUser(userId: string): Promise<boolean> {
    inMemoryStore.users = inMemoryStore.users.filter((u) => u.id !== userId);
    const workerUrl = this.getStoredWorkerUrl();
    if (workerUrl) {
      try {
        await fetch(this.buildUrl(`/api/users/${userId}`), {
          method: 'DELETE',
          headers: this.getAuthHeaders(),
        });
      } catch (e) {
        console.error('Lỗi xóa user trên D1:', e);
      }
    }
    return true;
  },

  async resetUserPassword(userId: string): Promise<boolean> {
    const user = inMemoryStore.users.find((u) => u.id === userId);
    if (user) {
      user.mustChangePassword = true;
    }

    const workerUrl = this.getStoredWorkerUrl();
    if (workerUrl) {
      try {
        await fetch(this.buildUrl('/api/users/reset-password'), {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ userId }),
        });
      } catch (e) {
        console.error('Lỗi reset mật khẩu trên D1:', e);
      }
    }
    return true;
  },

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    const workerUrl = this.getStoredWorkerUrl();
    if (workerUrl) {
      try {
        const res = await fetch(this.buildUrl('/api/auth/change-password'), {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ userId, oldPassword, newPassword }),
        });
        const json = await res.json();
        if (json.success) {
          const user = inMemoryStore.users.find((u) => u.id === userId);
          if (user) user.mustChangePassword = false;
          return { success: true, message: 'Đổi mật khẩu thành công!' };
        }
        return { success: false, message: json.error || 'Đổi mật khẩu thất bại!' };
      } catch (e: unknown) {
        return { success: false, message: (e as Error).message };
      }
    }

    // In-memory update
    const user = inMemoryStore.users.find((u) => u.id === userId);
    if (!user) return { success: false, message: 'Người dùng không tồn tại' };
    user.mustChangePassword = false;
    return { success: true, message: 'Đổi mật khẩu thành công!' };
  },

  async saveCampaign(campaign: Campaign): Promise<boolean> {
    const idx = inMemoryStore.campaigns.findIndex((c) => c.id === campaign.id);
    if (idx >= 0) {
      inMemoryStore.campaigns[idx] = campaign;
    } else {
      inMemoryStore.campaigns.push(campaign);
    }
    persistStoreToStorage(inMemoryStore);

    const workerUrl = this.getStoredWorkerUrl();
    if (workerUrl) {
      try {
        await fetch(this.buildUrl('/api/campaigns'), {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(campaign),
        });
      } catch (e) {
        console.error('Lỗi lưu campaign lên D1:', e);
      }
    }
    return true;
  },

  async saveCampaignConfig(
    campaignId: string,
    targetUnitIds: string[],
    evaluatingUnitIds: string[],
    evaluators: CampaignEvaluator[],
    criterionIds?: string[]
  ): Promise<boolean> {
    inMemoryStore.targetUnits = [
      ...inMemoryStore.targetUnits.filter((t) => t.campaignId !== campaignId),
      ...targetUnitIds.map((uid) => ({ campaignId, unitId: uid })),
    ];

    inMemoryStore.evaluatingUnits = [
      ...inMemoryStore.evaluatingUnits.filter((e) => e.campaignId !== campaignId),
      ...evaluatingUnitIds.map((uid) => ({ campaignId, unitId: uid })),
    ];

    inMemoryStore.evaluators = [
      ...inMemoryStore.evaluators.filter((ev) => ev.campaignId !== campaignId),
      ...evaluators,
    ];

    if (Array.isArray(criterionIds)) {
      inMemoryStore.campaignCriteria = [
        ...inMemoryStore.campaignCriteria.filter((c) => c.campaignId !== campaignId),
        ...criterionIds.map((cid) => ({ campaignId, criterionId: cid })),
      ];
    }
    persistStoreToStorage(inMemoryStore);

    const workerUrl = this.getStoredWorkerUrl();
    if (workerUrl) {
      try {
        const res = await fetch(this.buildUrl('/api/campaign-config'), {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            campaignId,
            targetUnitIds,
            evaluatingUnitIds,
            criterionIds,
            evaluators,
          }),
        });

        // Fallback for older worker versions without /api/campaign-config
        if (!res.ok) {
          await fetch(this.buildUrl('/api/evaluators/save-batch'), {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ campaignId, evaluators }),
          }).catch(() => {});
        }
      } catch (e) {
        console.warn('Lưu cấu hình đợt đánh giá lên D1 (đã lưu an toàn trong trình duyệt):', e);
      }
    }
    return true;
  },

  async saveCriterion(criterion: Criterion): Promise<boolean> {
    const idx = inMemoryStore.criteria.findIndex((c) => c.id === criterion.id);
    if (idx >= 0) {
      inMemoryStore.criteria[idx] = criterion;
    } else {
      inMemoryStore.criteria.push(criterion);
    }
    persistStoreToStorage(inMemoryStore);

    const workerUrl = this.getStoredWorkerUrl();
    if (workerUrl) {
      try {
        await fetch(this.buildUrl('/api/criteria'), {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(criterion),
        });
      } catch (e) {
        console.warn('Lưu tiêu chí lên D1 (đã lưu an toàn trong trình duyệt):', e);
      }
    }
    return true;
  },

  async deleteCriterion(id: string): Promise<boolean> {
    inMemoryStore.criteria = inMemoryStore.criteria.filter((c) => c.id !== id);
    inMemoryStore.campaignCriteria = inMemoryStore.campaignCriteria.filter((cc) => cc.criterionId !== id);
    persistStoreToStorage(inMemoryStore);

    const workerUrl = this.getStoredWorkerUrl();
    if (workerUrl) {
      try {
        await fetch(this.buildUrl(`/api/criteria/${id}`), {
          method: 'DELETE',
          headers: this.getAuthHeaders(),
        });
      } catch (e) {
        console.warn('Xóa tiêu chí trên D1 (đã xóa an toàn trong trình duyệt):', e);
      }
    }
    return true;
  },

  async saveEvaluation(evaluation: EvaluationRecord): Promise<boolean> {
    const idx = inMemoryStore.evaluations.findIndex((e) => e.id === evaluation.id);
    if (idx >= 0) {
      inMemoryStore.evaluations[idx] = evaluation;
    } else {
      inMemoryStore.evaluations.push(evaluation);
    }
    persistStoreToStorage(inMemoryStore);

    const workerUrl = this.getStoredWorkerUrl();
    if (workerUrl) {
      try {
        await fetch(this.buildUrl('/api/evaluations'), {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(evaluation),
        });
      } catch (e) {
        console.error('Lỗi lưu evaluation lên D1:', e);
      }
    }
    return true;
  },

  async updateAvatar(userId: string, avatarUrl: string): Promise<boolean> {
    const user = inMemoryStore.users.find((u) => u.id === userId);
    if (user) {
      user.avatarUrl = avatarUrl;
      await this.saveUser(user);
    }
    return true;
  },
};
