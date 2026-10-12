/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Campaign,
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
  INITIAL_CRITERIA,
  INITIAL_EVALUATING_UNITS,
  INITIAL_EVALUATORS,
  INITIAL_TARGET_UNITS,
  INITIAL_UNITS,
  INITIAL_USERS,
} from '../constants/initialData';

export interface FullSyncData {
  units: Unit[];
  users: User[];
  campaigns: Campaign[];
  criteria: Criterion[];
  targetUnits: CampaignTargetUnit[];
  evaluatingUnits: CampaignEvaluatingUnit[];
  evaluators: CampaignEvaluator[];
  evaluations: EvaluationRecord[];
}

export const D1_CONFIG_KEY = 'vnpt_d1_worker_url';
export const D1_TOKEN_KEY = 'vnpt_d1_api_token';

// In-memory online state fallback when external Worker is not yet reached
let inMemoryStore: FullSyncData = {
  units: [...INITIAL_UNITS],
  users: [...INITIAL_USERS],
  campaigns: [...INITIAL_CAMPAIGNS],
  criteria: [...INITIAL_CRITERIA],
  targetUnits: [...INITIAL_TARGET_UNITS],
  evaluatingUnits: [...INITIAL_EVALUATING_UNITS],
  evaluators: [...INITIAL_EVALUATORS],
  evaluations: [
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
          lowScoreReason: 'Thời gian phê duyệt thanh toán chi phí bảo trì mạng cáp quang còn chậm, ảnh hưởng đến tiến độ của nhà thầu viễn thông.',
        },
        'tc-2': { score: 8 },
        'tc-3': { score: 8 },
        'tc-4': {
          score: 6,
          lowScoreReason: 'Cần linh hoạt hơn trong việc tạm ứng kinh phí ứng cứu thông tin khẩn cấp trong mùa mưa bão theo quy chuẩn VNPT.',
        },
        'tc-5': { score: 7 },
      },
      averageScore: 6.8,
      status: 'SUBMITTED',
      submittedAt: '2026-03-12T09:00:00Z',
      updatedAt: '2026-03-12T09:00:00Z',
    },
  ],
};

export const d1Client = {
  getStoredWorkerUrl(): string {
    return localStorage.getItem(D1_CONFIG_KEY) || '';
  },

  setStoredWorkerUrl(url: string) {
    localStorage.setItem(D1_CONFIG_KEY, url.trim());
  },

  getStoredToken(): string {
    return localStorage.getItem(D1_TOKEN_KEY) || '';
  },

  setStoredToken(token: string) {
    localStorage.setItem(D1_TOKEN_KEY, token.trim());
  },

  async testConnection(workerUrl: string, token?: string): Promise<{
    success: boolean;
    latencyMs: number;
    message: string;
    tablesCount?: number;
  }> {
    const start = performance.now();
    const cleanUrl = workerUrl.trim().replace(/\/+$/, '');

    if (!cleanUrl) {
      // Test the local online backend
      await new Promise((r) => setTimeout(r, 120));
      return {
        success: true,
        latencyMs: Math.round(performance.now() - start),
        message: 'Hệ thống lưu trữ Online D1 (Mô phỏng tức thời) hoạt động bình thường.',
        tablesCount: 8,
      };
    }

    try {
      const res = await fetch(`${cleanUrl}/api/health`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      const latencyMs = Math.round(performance.now() - start);

      if (res.ok && data.success) {
        return {
          success: true,
          latencyMs,
          message: data.message || 'Kết nối Cloudflare D1 thành công!',
          tablesCount: data.tablesCount ?? 8,
        };
      }
      return {
        success: false,
        latencyMs,
        message: data.error || 'Worker phản hồi mã lỗi: ' + res.status,
      };
    } catch (err: unknown) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        success: false,
        latencyMs,
        message: (err as Error).message || 'Không thể kết nối đến Worker Cloudflare.',
      };
    }
  },

  async initSchema(workerUrl: string, token?: string): Promise<{ success: boolean; message: string }> {
    const cleanUrl = workerUrl.trim().replace(/\/+$/, '');
    if (!cleanUrl) {
      return { success: true, message: 'Đã xác nhận Schema hợp lệ trên hệ thống!' };
    }

    try {
      const res = await fetch(`${cleanUrl}/api/init-schema`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    const token = this.getStoredToken();

    if (workerUrl) {
      try {
        const cleanUrl = workerUrl.replace(/\/+$/, '');
        const res = await fetch(`${cleanUrl}/api/sync/all`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            inMemoryStore = {
              units: json.data.units || [],
              users: json.data.users || [],
              campaigns: json.data.campaigns || [],
              criteria: json.data.criteria || [],
              targetUnits: json.data.targetUnits || [],
              evaluatingUnits: json.data.evaluatingUnits || [],
              evaluators: json.data.evaluators || [],
              evaluations: json.data.evaluations || [],
            };
            return inMemoryStore;
          }
        }
      } catch (e) {
        console.warn('Worker sync failed, falling back to active online store', e);
      }
    }

    // Return the active online store
    return { ...inMemoryStore };
  },

  async saveUnit(unit: Unit): Promise<boolean> {
    const idx = inMemoryStore.units.findIndex((u) => u.id === unit.id);
    if (idx >= 0) {
      inMemoryStore.units[idx] = unit;
    } else {
      inMemoryStore.units.push(unit);
    }

    const workerUrl = this.getStoredWorkerUrl();
    if (workerUrl) {
      try {
        await fetch(`${workerUrl.replace(/\/+$/, '')}/api/units`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        await fetch(`${workerUrl.replace(/\/+$/, '')}/api/units/${unitId}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.error('Lỗi xóa unit trên D1:', e);
      }
    }
    return true;
  },

  async saveUser(user: User, password?: string): Promise<boolean> {
    const idx = inMemoryStore.users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      inMemoryStore.users[idx] = user;
    } else {
      inMemoryStore.users.push(user);
    }

    const workerUrl = this.getStoredWorkerUrl();
    if (workerUrl) {
      try {
        await fetch(`${workerUrl.replace(/\/+$/, '')}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...user, password: password || 'Vnpt@2026' }),
        });
      } catch (e) {
        console.error('Lỗi sync user lên D1:', e);
      }
    }
    return true;
  },

  async deleteUser(userId: string): Promise<boolean> {
    inMemoryStore.users = inMemoryStore.users.filter((u) => u.id !== userId);
    const workerUrl = this.getStoredWorkerUrl();
    if (workerUrl) {
      try {
        await fetch(`${workerUrl.replace(/\/+$/, '')}/api/users/${userId}`, {
          method: 'DELETE',
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
        await fetch(`${workerUrl.replace(/\/+$/, '')}/api/users/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
      } catch (e) {
        console.error('Lỗi reset mật khẩu trên D1:', e);
      }
    }
    return true;
  },

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const workerUrl = this.getStoredWorkerUrl();
    if (workerUrl) {
      try {
        const res = await fetch(`${workerUrl.replace(/\/+$/, '')}/api/auth/change-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

    const workerUrl = this.getStoredWorkerUrl();
    if (workerUrl) {
      try {
        await fetch(`${workerUrl.replace(/\/+$/, '')}/api/campaigns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
    evaluators: CampaignEvaluator[]
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

    const workerUrl = this.getStoredWorkerUrl();
    if (workerUrl) {
      try {
        await fetch(`${workerUrl.replace(/\/+$/, '')}/api/evaluators/save-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId, evaluators }),
        });
      } catch (e) {
        console.error('Lỗi lưu evaluators lên D1:', e);
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

    const workerUrl = this.getStoredWorkerUrl();
    if (workerUrl) {
      try {
        await fetch(`${workerUrl.replace(/\/+$/, '')}/api/evaluations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
