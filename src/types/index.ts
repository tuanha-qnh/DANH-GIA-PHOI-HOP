/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'ADMIN' | 'USER';

export interface Unit {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  level: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface User {
  id: string;
  hrmCode: string;
  fullName: string;
  unitId: string;
  username: string;
  passwordHash?: string;
  role: UserRole;
  mustChangePassword: boolean;
  canViewReports: boolean;
  avatarUrl?: string;
  status: 'ACTIVE' | 'LOCKED';
  createdAt: string;
  lastLoginAt?: string;
}

export type PeriodType = 'MONTH' | 'QUARTER' | 'YEAR';

export interface Campaign {
  id: string;
  code: string;
  name: string;
  periodType: PeriodType;
  periodValue: string; // e.g. "2026-03" or "Q1-2026"
  startDate: string;
  endDate: string;
  isLocked: boolean; // Admin can lock/unlock anytime
  description?: string;
  createdAt: string;
}

export interface Criterion {
  id: string;
  code: string;
  name: string;
  description: string;
  weight: number;
  minScore: number;
  maxScore: number;
  orderIndex: number;
}

export interface CampaignTargetUnit {
  campaignId: string;
  unitId: string;
}

export interface CampaignEvaluatingUnit {
  campaignId: string;
  unitId: string;
}

export interface CampaignCriterion {
  campaignId: string;
  criterionId: string;
}

export interface CampaignEvaluator {
  campaignId: string;
  userId: string;
  unitId: string;
  assignedAt: string;
}

export interface CriterionScore {
  score: number;
  lowScoreReason?: string; // Bắt buộc >= 50 ký tự nếu score <= 6
}

export interface EvaluationRecord {
  id: string;
  campaignId: string;
  evaluatorId: string;
  evaluatorUnitId: string;
  targetUnitId: string;
  scores: Record<string, CriterionScore>; // key: criterionId
  averageScore: number;
  status: 'DRAFT' | 'SUBMITTED';
  submittedAt?: string;
  updatedAt: string;
}

export interface D1Config {
  workerUrl: string;
  apiToken?: string;
  isConnected: boolean;
  lastSyncTime?: string;
  storageMode: 'D1_LIVE' | 'STANDALONE_ONLINE';
}

export interface EvaluationProgress {
  totalAssignedUsers: number;
  completedUsers: number;
  inProgressUsers: number;
  notStartedUsers: number;
  completionRate: number;
  unitProgress: Array<{
    unitId: string;
    unitName: string;
    totalUsers: number;
    completedUsers: number;
    completionRate: number;
    targetUnitsCount: number;
  }>;
}
