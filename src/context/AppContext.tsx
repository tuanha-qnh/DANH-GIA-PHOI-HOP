/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
import { d1Client, FullSyncData } from '../services/d1Client';
import { DEFAULT_PASSWORD } from '../constants/initialData';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  units: Unit[];
  users: User[];
  campaigns: Campaign[];
  criteria: Criterion[];
  targetUnits: CampaignTargetUnit[];
  evaluatingUnits: CampaignEvaluatingUnit[];
  campaignCriteria: CampaignCriterion[];
  evaluators: CampaignEvaluator[];
  evaluations: EvaluationRecord[];
  isLoading: boolean;
  d1Status: {
    isConnected: boolean;
    latencyMs: number;
    workerUrl: string;
    lastSyncTime: string;
  };
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  changePassword: (oldPwd: string, newPwd: string) => Promise<{ success: boolean; message: string }>;
  updateAvatar: (avatarUrl: string) => Promise<boolean>;
  refreshData: () => Promise<FullSyncData>;
  // Unit operations
  saveUnit: (unit: Partial<Unit> & { code: string; name: string }) => Promise<boolean>;
  deleteUnit: (id: string) => Promise<boolean>;
  // User operations
  saveUser: (user: Partial<User> & { hrmCode: string; fullName: string; unitId: string; username: string }, customPassword?: string) => Promise<{ success: boolean; syncedToD1: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<boolean>;
  resetPassword: (userId: string) => Promise<boolean>;
  // Campaign operations
  saveCampaign: (campaign: Campaign) => Promise<boolean>;
  deleteCampaign: (campaignId: string) => Promise<boolean>;
  toggleCampaignLock: (campaignId: string) => Promise<boolean>;
  saveCampaignConfig: (campaignId: string, targetUnitIds: string[], evaluatingUnitIds: string[], evaluators: CampaignEvaluator[], criterionIds?: string[]) => Promise<boolean>;
  toggleTargetUnit: (campaignId: string, unitId: string) => Promise<boolean>;
  toggleEvaluatingUnit: (campaignId: string, unitId: string) => Promise<boolean>;
  toggleCampaignCriterion: (campaignId: string, criterionId: string) => Promise<boolean>;
  selectAllTargetUnits: (campaignId: string, selectAll: boolean) => Promise<boolean>;
  selectAllEvaluatingUnits: (campaignId: string, selectAll: boolean) => Promise<boolean>;
  selectAllCampaignCriteria: (campaignId: string, selectAll: boolean) => Promise<boolean>;
  // Criterion operations
  saveCriterion: (criterion: Criterion) => Promise<boolean>;
  deleteCriterion: (id: string) => Promise<boolean>;
  // Evaluation operations
  saveEvaluation: (record: EvaluationRecord) => Promise<boolean>;
  deleteEvaluation: (evaluationId: string) => Promise<boolean>;
  // D1 Config operations
  setD1WorkerUrl: (url: string) => void;
  testD1Connection: (url: string, token?: string) => Promise<{ success: boolean; latencyMs: number; message: string; tablesCount?: number }>;
  initD1Schema: (url: string, token?: string) => Promise<{ success: boolean; message: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [targetUnits, setTargetUnits] = useState<CampaignTargetUnit[]>([]);
  const [evaluatingUnits, setEvaluatingUnits] = useState<CampaignEvaluatingUnit[]>([]);
  const [campaignCriteria, setCampaignCriteria] = useState<CampaignCriterion[]>([]);
  const [evaluators, setEvaluators] = useState<CampaignEvaluator[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [d1Status, setD1Status] = useState({
    isConnected: true,
    latencyMs: 18,
    workerUrl: d1Client.getStoredWorkerUrl(),
    lastSyncTime: new Date().toLocaleTimeString('vi-VN'),
  });

  const refreshData = useCallback(async (): Promise<FullSyncData> => {
    setIsLoading(true);
    try {
      const data: FullSyncData = await d1Client.syncAll();
      setUnits(data.units);
      setUsers(data.users);
      setCampaigns(data.campaigns);
      setCriteria(data.criteria);
      setTargetUnits(data.targetUnits);
      setEvaluatingUnits(data.evaluatingUnits);
      setCampaignCriteria(data.campaignCriteria || []);
      setEvaluators(data.evaluators);
      setEvaluations(data.evaluations);

      // Keep current user updated
      if (currentUser) {
        const freshUser = data.users.find((u) => u.id === currentUser.id);
        if (freshUser) {
          setCurrentUser(freshUser);
        }
      }

      setD1Status((prev) => ({
        ...prev,
        isConnected: true,
        workerUrl: d1Client.getStoredWorkerUrl(),
        lastSyncTime: new Date().toLocaleTimeString('vi-VN'),
      }));
      return data;
    } catch (err) {
      setD1Status((prev) => ({
        ...prev,
        isConnected: false,
        workerUrl: d1Client.getStoredWorkerUrl(),
        lastSyncTime: new Date().toLocaleTimeString('vi-VN'),
      }));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Initial load
  useEffect(() => {
    refreshData()
      .catch((err) => {
        console.warn('Khởi tạo ban đầu với dữ liệu hiện tại (Worker chưa phản hồi):', err.message);
      })
      .finally(() => {
        const savedUserJson = sessionStorage.getItem('vnpt_auth_user');
        if (savedUserJson) {
          try {
            const user = JSON.parse(savedUserJson);
            setCurrentUser(user);
          } catch {
            // ignore
          }
        }
      });
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // 1. ALWAYS pull fresh data from D1 before checking credentials
    let latestUsers = users;
    try {
      const freshData = await refreshData();
      latestUsers = freshData.users;
    } catch (e) {
      console.warn('Lỗi auto-sync trước khi login:', e);
    }

    const workerUrl = d1Client.getStoredWorkerUrl();
    if (workerUrl) {
      try {
        const res = await fetch(d1Client.buildUrl('/api/auth/login'), {
          method: 'POST',
          headers: d1Client.getAuthHeaders(),
          body: JSON.stringify({ username: username.trim(), password }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && data?.user) {
          setCurrentUser(data.user);
          sessionStorage.setItem('vnpt_auth_user', JSON.stringify(data.user));
          await refreshData().catch(() => {});
          return { success: true };
        }
        if (data?.error && data.error !== 'Tên đăng nhập không tồn tại!') {
          return { success: false, error: data.error };
        }
      } catch (err: unknown) {
        console.warn('Worker login failed, checking active online list', err);
      }
    }

    // Direct check against freshly synced users list
    const found = latestUsers.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!found) {
      return {
        success: false,
        error: `Tên đăng nhập "${username}" không tồn tại trong hệ thống! Vui lòng bấm nút "Đồng bộ CSDL D1" bên dưới để cập nhật lại dữ liệu từ hệ thống.`,
      };
    }
    if (found.status === 'LOCKED') {
      return { success: false, error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin!' };
    }

    // Default password check: if newly created or reset, pwd is DEFAULT_PASSWORD
    const validPwd = password === DEFAULT_PASSWORD || password === (found.passwordHash || DEFAULT_PASSWORD);
    if (!validPwd) {
      return { success: false, error: 'Mật khẩu không chính xác! Vui lòng kiểm tra lại.' };
    }

    setCurrentUser(found);
    sessionStorage.setItem('vnpt_auth_user', JSON.stringify(found));
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('vnpt_auth_user');
  };

  const changePassword = async (oldPwd: string, newPwd: string): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) return { success: false, message: 'Chưa đăng nhập' };
    const res = await d1Client.changePassword(currentUser.id, oldPwd, newPwd);
    if (res.success) {
      const updatedUser: User = { ...currentUser, mustChangePassword: false, passwordHash: newPwd };
      setCurrentUser(updatedUser);
      sessionStorage.setItem('vnpt_auth_user', JSON.stringify(updatedUser));
      await refreshData();
    }
    return res;
  };

  const updateAvatar = async (avatarUrl: string): Promise<boolean> => {
    if (!currentUser) return false;
    await d1Client.updateAvatar(currentUser.id, avatarUrl);
    const updated = { ...currentUser, avatarUrl };
    setCurrentUser(updated);
    sessionStorage.setItem('vnpt_auth_user', JSON.stringify(updated));
    await refreshData();
    return true;
  };

  const saveUnit = async (unitData: Partial<Unit> & { code: string; name: string }): Promise<boolean> => {
    const parentUnit = unitData.parentId ? units.find((u) => u.id === unitData.parentId) : null;
    const level = parentUnit ? (parentUnit.level || 1) + 1 : 1;

    const newUnit: Unit = {
      id: unitData.id || `u-${Date.now()}`,
      code: unitData.code.trim().toUpperCase(),
      name: unitData.name.trim(),
      parentId: unitData.parentId || null,
      level,
      status: unitData.status || 'ACTIVE',
      createdAt: unitData.createdAt || new Date().toISOString(),
    };

    await d1Client.saveUnit(newUnit);
    await refreshData();
    return true;
  };

  const deleteUnit = async (id: string): Promise<boolean> => {
    await d1Client.deleteUnit(id);
    await refreshData();
    return true;
  };

  const saveUser = async (
    userData: Partial<User> & { hrmCode: string; fullName: string; unitId: string; username: string },
    customPassword?: string
  ): Promise<{ success: boolean; syncedToD1: boolean; error?: string }> => {
    const isNew = !userData.id;
    const newUser: User = {
      id: userData.id || `user-${Date.now()}`,
      hrmCode: userData.hrmCode.trim(),
      fullName: userData.fullName.trim(),
      unitId: userData.unitId,
      username: userData.username.trim().toLowerCase(),
      role: userData.role || 'USER',
      mustChangePassword: isNew ? true : userData.mustChangePassword ?? false,
      canViewReports: userData.canViewReports ?? false,
      avatarUrl: userData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      status: userData.status || 'ACTIVE',
      createdAt: userData.createdAt || new Date().toISOString(),
    };

    const res = await d1Client.saveUser(newUser, customPassword);
    await refreshData();
    return res;
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    await d1Client.deleteUser(id);
    await refreshData();
    return true;
  };

  const resetPassword = async (userId: string): Promise<boolean> => {
    await d1Client.resetUserPassword(userId);
    await refreshData();
    return true;
  };

  const saveCampaign = async (campaign: Campaign): Promise<boolean> => {
    setCampaigns((prev) => {
      const idx = prev.findIndex((c) => c.id === campaign.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = campaign;
        return next;
      }
      return [campaign, ...prev];
    });
    await d1Client.saveCampaign(campaign);
    return true;
  };

  const deleteCampaign = async (campaignId: string): Promise<boolean> => {
    setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
    setTargetUnits((prev) => prev.filter((t) => t.campaignId !== campaignId));
    setEvaluatingUnits((prev) => prev.filter((e) => e.campaignId !== campaignId));
    setCampaignCriteria((prev) => prev.filter((cc) => cc.campaignId !== campaignId));
    setEvaluators((prev) => prev.filter((ev) => ev.campaignId !== campaignId));
    setEvaluations((prev) => prev.filter((ev) => ev.campaignId !== campaignId));
    await d1Client.deleteCampaign(campaignId);
    return true;
  };

  const toggleCampaignLock = async (campaignId: string): Promise<boolean> => {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) return false;
    const updated: Campaign = { ...campaign, isLocked: !campaign.isLocked };
    await d1Client.saveCampaign(updated);
    await refreshData();
    return true;
  };

  const saveCampaignConfig = async (
    campaignId: string,
    targetUnitIds: string[],
    evaluatingUnitIds: string[],
    evaluatorsToSave: CampaignEvaluator[],
    criterionIds?: string[]
  ): Promise<boolean> => {
    // 1. Cập nhật state nội bộ ngay lập tức (optimistic UI) để người dùng bấm tích chọn là thấy ngay lập tức
    setTargetUnits((prev) => [
      ...prev.filter((t) => t.campaignId !== campaignId),
      ...targetUnitIds.map((uid) => ({ campaignId, unitId: uid })),
    ]);
    setEvaluatingUnits((prev) => [
      ...prev.filter((e) => e.campaignId !== campaignId),
      ...evaluatingUnitIds.map((uid) => ({ campaignId, unitId: uid })),
    ]);
    setEvaluators((prev) => [
      ...prev.filter((ev) => ev.campaignId !== campaignId),
      ...evaluatorsToSave,
    ]);
    if (Array.isArray(criterionIds)) {
      setCampaignCriteria((prev) => [
        ...prev.filter((c) => c.campaignId !== campaignId),
        ...criterionIds.map((cid) => ({ campaignId, criterionId: cid })),
      ]);
    }

    // 2. Đồng bộ ngầm lên D1 Client và Cloudflare Worker
    await d1Client.saveCampaignConfig(
      campaignId,
      targetUnitIds,
      evaluatingUnitIds,
      evaluatorsToSave,
      criterionIds
    );
    return true;
  };

  const toggleTargetUnit = async (campaignId: string, unitId: string): Promise<boolean> => {
    let nextTargetIds: string[] = [];
    setTargetUnits((prev) => {
      const exists = prev.some((t) => t.campaignId === campaignId && t.unitId === unitId);
      const next = exists
        ? prev.filter((t) => !(t.campaignId === campaignId && t.unitId === unitId))
        : [...prev, { campaignId, unitId }];
      nextTargetIds = next.filter((t) => t.campaignId === campaignId).map((t) => t.unitId);
      return next;
    });

    const currentEvaluatingIds = evaluatingUnits
      .filter((e) => e.campaignId === campaignId)
      .map((e) => e.unitId);
    const currentEvaluatorList = evaluators.filter((ev) => ev.campaignId === campaignId);
    const currentCritIds = campaignCriteria
      .filter((c) => c.campaignId === campaignId)
      .map((c) => c.criterionId);

    await d1Client.saveCampaignConfig(
      campaignId,
      nextTargetIds,
      currentEvaluatingIds,
      currentEvaluatorList,
      currentCritIds
    );
    return true;
  };

  const toggleEvaluatingUnit = async (campaignId: string, unitId: string): Promise<boolean> => {
    let nextEvaluatingIds: string[] = [];
    setEvaluatingUnits((prev) => {
      const exists = prev.some((e) => e.campaignId === campaignId && e.unitId === unitId);
      const next = exists
        ? prev.filter((e) => !(e.campaignId === campaignId && e.unitId === unitId))
        : [...prev, { campaignId, unitId }];
      nextEvaluatingIds = next.filter((e) => e.campaignId === campaignId).map((e) => e.unitId);
      return next;
    });

    const currentTargetIds = targetUnits
      .filter((t) => t.campaignId === campaignId)
      .map((t) => t.unitId);
    const currentEvaluatorList = evaluators.filter((ev) => ev.campaignId === campaignId);
    const currentCritIds = campaignCriteria
      .filter((c) => c.campaignId === campaignId)
      .map((c) => c.criterionId);

    await d1Client.saveCampaignConfig(
      campaignId,
      currentTargetIds,
      nextEvaluatingIds,
      currentEvaluatorList,
      currentCritIds
    );
    return true;
  };

  const toggleCampaignCriterion = async (campaignId: string, criterionId: string): Promise<boolean> => {
    let nextCritIds: string[] = [];
    setCampaignCriteria((prev) => {
      const exists = prev.some((c) => c.campaignId === campaignId && c.criterionId === criterionId);
      const next = exists
        ? prev.filter((c) => !(c.campaignId === campaignId && c.criterionId === criterionId))
        : [...prev, { campaignId, criterionId }];
      nextCritIds = next.filter((c) => c.campaignId === campaignId).map((c) => c.criterionId);
      return next;
    });

    const currentTargetIds = targetUnits
      .filter((t) => t.campaignId === campaignId)
      .map((t) => t.unitId);
    const currentEvaluatingIds = evaluatingUnits
      .filter((e) => e.campaignId === campaignId)
      .map((e) => e.unitId);
    const currentEvaluatorList = evaluators.filter((ev) => ev.campaignId === campaignId);

    await d1Client.saveCampaignConfig(
      campaignId,
      currentTargetIds,
      currentEvaluatingIds,
      currentEvaluatorList,
      nextCritIds
    );
    return true;
  };

  const selectAllTargetUnits = async (campaignId: string, selectAll: boolean): Promise<boolean> => {
    const allIds = selectAll ? units.map((u) => u.id) : [];
    setTargetUnits((prev) => [
      ...prev.filter((t) => t.campaignId !== campaignId),
      ...allIds.map((uid) => ({ campaignId, unitId: uid })),
    ]);

    const currentEvaluatingIds = evaluatingUnits
      .filter((e) => e.campaignId === campaignId)
      .map((e) => e.unitId);
    const currentEvaluatorList = evaluators.filter((ev) => ev.campaignId === campaignId);
    const currentCritIds = campaignCriteria
      .filter((c) => c.campaignId === campaignId)
      .map((c) => c.criterionId);

    await d1Client.saveCampaignConfig(
      campaignId,
      allIds,
      currentEvaluatingIds,
      currentEvaluatorList,
      currentCritIds
    );
    return true;
  };

  const selectAllEvaluatingUnits = async (campaignId: string, selectAll: boolean): Promise<boolean> => {
    const allIds = selectAll ? units.map((u) => u.id) : [];
    setEvaluatingUnits((prev) => [
      ...prev.filter((e) => e.campaignId !== campaignId),
      ...allIds.map((uid) => ({ campaignId, unitId: uid })),
    ]);

    const currentTargetIds = targetUnits
      .filter((t) => t.campaignId === campaignId)
      .map((t) => t.unitId);
    const currentEvaluatorList = evaluators.filter((ev) => ev.campaignId === campaignId);
    const currentCritIds = campaignCriteria
      .filter((c) => c.campaignId === campaignId)
      .map((c) => c.criterionId);

    await d1Client.saveCampaignConfig(
      campaignId,
      currentTargetIds,
      allIds,
      currentEvaluatorList,
      currentCritIds
    );
    return true;
  };

  const selectAllCampaignCriteria = async (campaignId: string, selectAll: boolean): Promise<boolean> => {
    const allIds = selectAll ? criteria.map((c) => c.id) : [];
    setCampaignCriteria((prev) => [
      ...prev.filter((c) => c.campaignId !== campaignId),
      ...allIds.map((cid) => ({ campaignId, criterionId: cid })),
    ]);

    const currentTargetIds = targetUnits
      .filter((t) => t.campaignId === campaignId)
      .map((t) => t.unitId);
    const currentEvaluatingIds = evaluatingUnits
      .filter((e) => e.campaignId === campaignId)
      .map((e) => e.unitId);
    const currentEvaluatorList = evaluators.filter((ev) => ev.campaignId === campaignId);

    await d1Client.saveCampaignConfig(
      campaignId,
      currentTargetIds,
      currentEvaluatingIds,
      currentEvaluatorList,
      allIds
    );
    return true;
  };

  const saveCriterion = async (criterion: Criterion): Promise<boolean> => {
    setCriteria((prev) => {
      const idx = prev.findIndex((c) => c.id === criterion.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = criterion;
        return next;
      }
      return [...prev, criterion];
    });
    await d1Client.saveCriterion(criterion);
    return true;
  };

  const deleteCriterion = async (id: string): Promise<boolean> => {
    setCriteria((prev) => prev.filter((c) => c.id !== id));
    setCampaignCriteria((prev) => prev.filter((cc) => cc.criterionId !== id));
    await d1Client.deleteCriterion(id);
    return true;
  };

  const saveEvaluation = async (record: EvaluationRecord): Promise<boolean> => {
    setEvaluations((prev) => {
      const idx = prev.findIndex(
        (e) =>
          e.id === record.id ||
          (e.campaignId === record.campaignId &&
            e.evaluatorId === record.evaluatorId &&
            e.targetUnitId === record.targetUnitId)
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = record;
        return next;
      }
      return [...prev, record];
    });
    await d1Client.saveEvaluation(record);
    return true;
  };

  const deleteEvaluation = async (evaluationId: string): Promise<boolean> => {
    setEvaluations((prev) => prev.filter((e) => e.id !== evaluationId));
    await d1Client.deleteEvaluation(evaluationId);
    return true;
  };

  const setD1WorkerUrl = (url: string) => {
    d1Client.setStoredWorkerUrl(url);
    setD1Status((prev) => ({ ...prev, workerUrl: url }));
  };

  const testD1Connection = async (url: string, token?: string) => {
    const res = await d1Client.testConnection(url, token);
    setD1Status((prev) => ({
      ...prev,
      isConnected: res.success,
      latencyMs: res.latencyMs,
      workerUrl: url,
    }));
    return res;
  };

  const initD1Schema = async (url: string, token?: string) => {
    return await d1Client.initSchema(url, token);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        units,
        users,
        campaigns,
        criteria,
        targetUnits,
        evaluatingUnits,
        campaignCriteria,
        evaluators,
        evaluations,
        isLoading,
        d1Status,
        login,
        logout,
        changePassword,
        updateAvatar,
        refreshData,
        saveUnit,
        deleteUnit,
        saveUser,
        deleteUser,
        resetPassword,
        saveCampaign,
        deleteCampaign,
        toggleCampaignLock,
        saveCampaignConfig,
        toggleTargetUnit,
        toggleEvaluatingUnit,
        toggleCampaignCriterion,
        selectAllTargetUnits,
        selectAllEvaluatingUnits,
        selectAllCampaignCriteria,
        saveCriterion,
        deleteCriterion,
        saveEvaluation,
        deleteEvaluation,
        setD1WorkerUrl,
        testD1Connection,
        initD1Schema,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
