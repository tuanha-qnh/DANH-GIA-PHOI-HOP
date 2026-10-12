/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  Users,
  CheckSquare,
  BarChart3,
  TrendingUp,
  Database,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  Layers,
  Sparkles,
  Lock,
  Unlock,
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface DashboardOverviewProps {
  onNavigateTab: (tab: NavTab) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigateTab }) => {
  const {
    units,
    users,
    campaigns,
    evaluators,
    evaluations,
    d1Status,
  } = useApp();

  const activeCampaign = campaigns[0];
  const campaignEvaluations = evaluations.filter(
    (e) => e.campaignId === activeCampaign?.id && e.status === 'SUBMITTED'
  );

  const completedUserIds = new Set(campaignEvaluations.map((e) => e.evaluatorId));
  const assignedEvaluators = evaluators.filter((e) => e.campaignId === activeCampaign?.id);
  const totalAssigned = assignedEvaluators.length;
  const completedCount = completedUserIds.size;
  const completionRate = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;

  // Average province-wide score
  const avgScores = campaignEvaluations.map((e) => e.averageScore);
  const provinceAvg =
    avgScores.length > 0
      ? Number((avgScores.reduce((a, b) => a + b, 0) / avgScores.length).toFixed(2))
      : 8.2;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#005baa] to-[#0072ce] text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-white/5 skew-x-12 pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 text-blue-100 text-[11px] font-semibold mb-3 border border-white/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Hệ Thống Đánh Giá Công Tác Phối Hợp VNPT 2026</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Trung Tâm Điều Hành & Giám Sát Đánh Giá Phối Hợp
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-2 leading-relaxed">
            Theo dõi tiến độ chấm điểm liên đơn vị thời gian thực, quản lý phân quyền kéo thả, đồng bộ 100% CSDL Cloudflare D1.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-4 pt-2">
            <button
              type="button"
              onClick={() => onNavigateTab('campaigns')}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-[#005baa] rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors shadow-sm"
            >
              <span>Gán Quyền Cán Bộ (Kéo Thả)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('reports')}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors border border-white/20"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Tra Cứu Báo Cáo Thống Kê</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Tổng Đơn Vị VNPT</span>
            <div className="p-2 rounded-lg bg-blue-50 text-[#005baa]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{units.length}</span>
            <span className="text-xs text-slate-400 ml-1.5">đơn vị & phòng</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Cơ cấu cha - con 3 cấp</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Cán Bộ Hệ Thống</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{users.length}</span>
            <span className="text-xs text-slate-400 ml-1.5">cán bộ</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Đã gán {totalAssigned} người đánh giá
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Tiến Độ Toàn Tỉnh</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-purple-700">{completionRate}%</span>
            <span className="text-xs text-slate-400 ml-1.5">hoàn thành</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-purple-600 h-1.5 rounded-full"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Điểm Phối Hợp TB</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-700">{provinceAvg}</span>
            <span className="text-xs text-slate-400 ml-1.5">/ 10 điểm</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">Đạt loại Tốt toàn tỉnh</p>
        </div>
      </div>

      {/* Grid: Quick Modules Access & Active Campaign Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Campaign Status Box */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Đợt Đánh Giá Trọng Tâm
              </span>
              <h3 className="font-bold text-base text-slate-900 mt-0.5">
                {activeCampaign?.name}
              </h3>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                activeCampaign?.isLocked
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {activeCampaign?.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              <span>{activeCampaign?.isLocked ? 'Đã Khóa Dữ Liệu' : 'Đang Mở Tiếp Nhận'}</span>
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {activeCampaign?.description}
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-400 block">Chu kỳ:</span>
              <span className="font-bold text-slate-800">{activeCampaign?.periodValue}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-400 block">Số phiếu đã thu:</span>
              <span className="font-bold text-[#005baa]">{campaignEvaluations.length} phiếu</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-400 block">Cán bộ đã nộp:</span>
              <span className="font-bold text-emerald-600">{completedCount} / {totalAssigned}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigateTab('evaluate')}
              className="w-full py-2.5 px-4 bg-[#005baa] hover:bg-[#004b8d] text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Thực Hiện Đánh Giá Đợt Này</span>
            </button>
          </div>
        </div>

        {/* Right: Quick Shortcuts */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">
              Lối Tắt Thao Tác Nghiệp Vụ
            </h3>
            <div className="space-y-2 text-xs">
              <button
                type="button"
                onClick={() => onNavigateTab('campaigns')}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-slate-800 font-semibold transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <CalendarCheck className="w-4 h-4 text-[#005baa]" />
                  <span>Kéo thả cán bộ tham gia đánh giá</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('units')}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-slate-800 font-semibold transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-[#005baa]" />
                  <span>Khai báo đơn vị cấp cha - con</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('users')}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-slate-800 font-semibold transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-[#005baa]" />
                  <span>Khai báo người dùng & Reset mật khẩu</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('d1-config')}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-slate-800 font-semibold transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-[#005baa]" />
                  <span>Kiểm tra kết nối Cloudflare D1</span>
                </div>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-bold">
                  {d1Status.latencyMs}ms
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
