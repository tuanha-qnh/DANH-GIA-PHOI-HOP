/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getCampaignEvaluationState, getDefaultEvaluationCampaign } from '../utils/campaignSchedule';
import {
  Building2,
  Users,
  CheckSquare,
  BarChart3,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  Lock,
  Unlock,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface DashboardOverviewProps {
  onNavigateTab: (tab: NavTab) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigateTab }) => {
  const {
    currentUser,
    units,
    users,
    campaigns,
    evaluators,
    evaluations,
    evaluatingUnits,
  } = useApp();

  const isAdmin = currentUser?.role === 'ADMIN';
  const isReportViewer = currentUser?.role === 'REPORT_VIEWER';

  // Xác định đợt đánh giá đang có hiệu lực (ưu tiên kỳ hiện tại theo nghiệp vụ, đợt đang mở)
  const defaultActiveCamp =
    getDefaultEvaluationCampaign(campaigns) || campaigns[0];

  const [focusedCampaignId, setFocusedCampaignId] = useState<string>(
    defaultActiveCamp?.id || ''
  );

  const activeCampaign =
    campaigns.find((c) => c.id === focusedCampaignId) || defaultActiveCamp;

  const activeState = getCampaignEvaluationState(activeCampaign);

  // Thống kê nhân sự của đợt đánh giá đang có hiệu lực / được chọn
  const activeAssignedEvaluators = evaluators.filter(
    (e) => e.campaignId === activeCampaign?.id
  );
  const totalAssignedPersonnel = activeAssignedEvaluators.length;

  const activeSubmittedEvaluations = evaluations.filter(
    (e) => e.campaignId === activeCampaign?.id && e.status === 'SUBMITTED'
  );

  const completedUserIds = new Set(
    activeSubmittedEvaluations.map((e) => e.evaluatorId)
  );
  const completedPersonnelCount = completedUserIds.size;
  const pendingPersonnelCount = Math.max(
    0,
    totalAssignedPersonnel - completedPersonnelCount
  );
  const completionRate =
    totalAssignedPersonnel > 0
      ? Math.round((completedPersonnelCount / totalAssignedPersonnel) * 100)
      : 0;

  // Điểm đánh giá trung bình của đợt
  const avgScores = activeSubmittedEvaluations.map((e) => e.averageScore);
  const campaignAvgScore =
    avgScores.length > 0
      ? Number(
          (avgScores.reduce((a, b) => a + b, 0) / avgScores.length).toFixed(2)
        )
      : 0;

  // Điểm tin tiến độ theo từng đơn vị thực hiện đánh giá trong đợt
  const activeEvalUnitIds = evaluatingUnits
    .filter((eu) => eu.campaignId === activeCampaign?.id)
    .map((eu) => eu.unitId);

  const unitProgressList = units
    .filter((u) => activeEvalUnitIds.includes(u.id))
    .map((unit) => {
      const unitAssignedEvaluators = activeAssignedEvaluators.filter(
        (ev) => ev.unitId === unit.id
      );
      const unitAssignedCount = unitAssignedEvaluators.length;
      const unitCompletedCount = unitAssignedEvaluators.filter((ev) =>
        completedUserIds.has(ev.userId)
      ).length;
      const unitSubmittedEvals = activeSubmittedEvaluations.filter(
        (e) => e.evaluatorUnitId === unit.id
      );
      const rate =
        unitAssignedCount > 0
          ? Math.round((unitCompletedCount / unitAssignedCount) * 100)
          : 0;

      return {
        unit,
        assignedCount: unitAssignedCount,
        completedCount: unitCompletedCount,
        evalCount: unitSubmittedEvals.length,
        rate,
      };
    })
    .sort((a, b) => b.rate - a.rate || a.unit.name.localeCompare(b.unit.name));

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#005baa] to-[#0072ce] text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-white/5 skew-x-12 pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 text-blue-100 text-[11px] font-semibold mb-3 border border-white/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Hệ Thống Đánh Giá Công Tác Phối Hợp VNPT 2026</span>
            <span className="text-white/60">|</span>
            <span className="font-mono text-amber-300">
              {isAdmin
                ? 'Vai trò: Quản Trị Viên (Admin)'
                : isReportViewer
                ? 'Vai trò: Người Xem Báo Cáo'
                : 'Cán Bộ Đánh Giá'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Bảng Điều Khiển & Theo Dõi Tiến Độ Đánh Giá
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-2 leading-relaxed">
            Giám sát thời gian thực tiến độ chấm điểm liên đơn vị VNPT, trạng thái đợt đánh giá đang có hiệu lực và điểm tin nhân sự tham gia.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-4 pt-2">
            <button
              type="button"
              onClick={() => onNavigateTab('reports')}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-[#005baa] rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors shadow-sm cursor-pointer"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Xem Báo Cáo Thống Kê Chi Tiết</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => onNavigateTab('campaigns')}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold transition-colors border border-white/25 cursor-pointer"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Quản Lý Đợt Đánh Giá & Phân Quyền</span>
              </button>
            )}

            {!isReportViewer && activeState.isOpen && (
              <button
                type="button"
                onClick={() => onNavigateTab('evaluate')}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Thực Hiện Đánh Giá Ngay</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PHẦN 1: ĐỢT ĐÁNH GIÁ ĐANG CÓ HIỆU LỰC & ĐIỂM TIN TIẾN ĐỘ NHÂN SỰ        */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header đợt đang có hiệu lực */}
        <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded bg-blue-100 text-[#005baa]">
                Đợt Đánh Giá Trọng Tâm
              </span>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                {activeCampaign?.code || 'N/A'}
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                Chu kỳ: {activeCampaign?.periodValue || 'N/A'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              {activeCampaign?.name || 'Chưa cấu hình đợt đánh giá'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              {activeCampaign?.description ||
                'Đợt đánh giá phối hợp công tác liên phòng ban đơn vị toàn địa bàn VNPT.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            {/* Badge Trạng thái đánh giá */}
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-xs ${
                activeState.isOpen
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : activeState.isAutoLocked
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : activeState.isManualLocked
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-sky-50 border-sky-200 text-sky-800'
              }`}
            >
              {activeState.isOpen ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <Unlock className="w-4 h-4 text-emerald-600" />
                  <span>ĐANG CÓ HIỆU LỰC - TIẾP NHẬN PHIẾU</span>
                  {activeState.remainingText && (
                    <span className="font-normal text-[11px] bg-emerald-100/70 px-1.5 py-0.5 rounded">
                      ({activeState.remainingText})
                    </span>
                  )}
                </>
              ) : activeState.isAutoLocked ? (
                <>
                  <Clock className="w-4 h-4 text-rose-600" />
                  <span>HẾT HẠN - TỰ ĐỘNG KHÓA</span>
                </>
              ) : activeState.isManualLocked ? (
                <>
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>ĐÃ KHÓA THỦ CÔNG</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-sky-600" />
                  <span>CHƯA ĐẾN THỜI GIAN MỞ</span>
                </>
              )}
            </div>

            {/* Bộ chọn đợt xem nhanh */}
            {campaigns.length > 1 && (
              <select
                value={activeCampaign?.id}
                onChange={(e) => setFocusedCampaignId(e.target.value)}
                className="text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#005baa] cursor-pointer"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    Xem: {c.code} - {c.periodValue}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* 4 Thẻ Điểm Tin Nhân Sự & Tiến Độ */}
        <div className="p-5 sm:p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#005baa]" />
                Điểm Tin Về Nhân Sự Tham Gia & Thực Hiện Đánh Giá
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dữ liệu ghi nhận theo danh sách cán bộ được phân công và số phiếu đã nộp trong đợt này
              </p>
            </div>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              Thời hạn:{' '}
              {activeCampaign?.startDate
                ? new Date(activeCampaign.startDate).toLocaleDateString('vi-VN')
                : '---'}{' '}
              &rarr;{' '}
              {activeCampaign?.endDate
                ? new Date(activeCampaign.endDate).toLocaleDateString('vi-VN')
                : '---'}
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Nhân sự tham gia */}
            <div className="p-4 bg-gradient-to-br from-blue-50/80 to-blue-50/30 rounded-xl border border-blue-100 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-semibold">
                  Nhân Sự Thuộc Diện ĐG
                </span>
                <div className="p-2 rounded-lg bg-blue-100/80 text-[#005baa]">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {totalAssignedPersonnel}
                </span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">cán bộ</span>
              </div>
              <p className="text-[11px] text-[#005baa] font-semibold mt-1">
                Phân công từ {unitProgressList.length} đơn vị
              </p>
            </div>

            {/* KPI 2: Nhân sự đã thực hiện */}
            <div className="p-4 bg-gradient-to-br from-emerald-50/80 to-emerald-50/30 rounded-xl border border-emerald-100 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-semibold">
                  Đã Thực Hiện Đánh Giá
                </span>
                <div className="p-2 rounded-lg bg-emerald-100/80 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-black text-emerald-700">
                  {completedPersonnelCount}
                </span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">
                  / {totalAssignedPersonnel} cán bộ
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                Đã gửi {activeSubmittedEvaluations.length} phiếu đánh giá
              </p>
            </div>

            {/* KPI 3: Nhân sự chưa thực hiện */}
            <div className="p-4 bg-gradient-to-br from-amber-50/80 to-amber-50/30 rounded-xl border border-amber-100 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-semibold">
                  Chưa Thực Hiện Đánh Giá
                </span>
                <div className="p-2 rounded-lg bg-amber-100/80 text-amber-700">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-black text-amber-700">
                  {pendingPersonnelCount}
                </span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">cán bộ</span>
              </div>
              <p className="text-[11px] text-amber-700 font-semibold mt-1">
                {pendingPersonnelCount === 0
                  ? 'Toàn bộ cán bộ đã nộp đủ'
                  : 'Cần đôn đốc gửi phiếu'}
              </p>
            </div>

            {/* KPI 4: Tỷ lệ hoàn thành & Điểm TB */}
            <div className="p-4 bg-gradient-to-br from-indigo-50/80 to-indigo-50/30 rounded-xl border border-indigo-100 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-semibold">
                  Tiến Độ Hoàn Thành
                </span>
                <div className="p-2 rounded-lg bg-indigo-100/80 text-indigo-700">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-indigo-700">
                    {completionRate}%
                  </span>
                </div>
                {campaignAvgScore > 0 && (
                  <span className="text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-indigo-100">
                    Điểm TB: {campaignAvgScore}/10
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Bảng Điểm tin Tiến độ theo từng đơn vị */}
          {unitProgressList.length > 0 && (
            <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Tiến Độ Đánh Giá Của Từng Đơn Vị Trong Đợt ({unitProgressList.length} đơn vị)
                </span>
                <span className="text-[11px] text-slate-500">
                  Tỷ lệ cán bộ đã hoàn thành theo đơn vị
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">STT</th>
                      <th className="py-2.5 px-3">Đơn Vị Thực Hiện</th>
                      <th className="py-2.5 px-3 w-28 text-center">Cán Bộ Phân Công</th>
                      <th className="py-2.5 px-3 w-28 text-center">Đã Nộp Phiếu</th>
                      <th className="py-2.5 px-3 w-24 text-center">Số Phiếu</th>
                      <th className="py-2.5 px-3 w-40 text-center">Tiến Độ (%)</th>
                      <th className="py-2.5 px-3 w-32 text-center">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unitProgressList.map((item, idx) => {
                      const isDone = item.rate === 100 && item.assignedCount > 0;
                      const isInProgress = item.rate > 0 && item.rate < 100;
                      return (
                        <tr key={item.unit.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 block">
                              {item.unit.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {item.unit.code}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                            {item.assignedCount}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                            {item.completedCount}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                            {item.evalCount}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    isDone
                                      ? 'bg-emerald-500'
                                      : isInProgress
                                      ? 'bg-amber-500'
                                      : 'bg-slate-300'
                                  }`}
                                  style={{ width: `${item.rate}%` }}
                                />
                              </div>
                              <span className="font-mono font-bold text-[11px] text-slate-700 w-8 text-right">
                                {item.rate}%
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isDone ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Hoàn Thành
                              </span>
                            ) : isInProgress ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3" /> Đang Chấm
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                Chưa Nộp
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PHẦN 2: DANH SÁCH TẤT CẢ CÁC ĐỢT ĐÁNH GIÁ VÀ TRẠNG THÁI ĐÁNH GIÁ          */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-[#005baa]" />
              Danh Sách Các Đợt Đánh Giá & Trạng Thái Hệ Thống
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tổng hợp {campaigns.length} đợt đánh giá đã khai báo trên hệ thống cùng thời hạn và tiến độ
            </p>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-2xs self-start sm:self-auto">
            Tổng số: <strong className="text-[#005baa]">{campaigns.length}</strong> đợt
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4 w-32">Mã Đợt</th>
                <th className="py-3 px-4">Tên Đợt Đánh Giá</th>
                <th className="py-3 px-4 w-28 text-center">Chu Kỳ</th>
                <th className="py-3 px-4 w-52">Thời Hạn Mở & Đóng</th>
                <th className="py-3 px-4 w-48 text-center">Trạng Thái Đánh Giá</th>
                <th className="py-3 px-4 w-36 text-center">Tiến Độ Nhân Sự</th>
                <th className="py-3 px-4 w-36 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((camp, idx) => {
                const cState = getCampaignEvaluationState(camp);
                const isSelected = camp.id === activeCampaign?.id;

                const cAssigned = evaluators.filter((e) => e.campaignId === camp.id);
                const cTotalAssigned = cAssigned.length;
                const cSubmittedEvals = evaluations.filter(
                  (e) => e.campaignId === camp.id && e.status === 'SUBMITTED'
                );
                const cDoneUsers = new Set(cSubmittedEvals.map((e) => e.evaluatorId)).size;
                const cRate =
                  cTotalAssigned > 0
                    ? Math.round((cDoneUsers / cTotalAssigned) * 100)
                    : 0;

                return (
                  <tr
                    key={camp.id}
                    className={`hover:bg-slate-50/90 transition-colors ${
                      isSelected ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 text-[11px]">
                      {camp.code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{camp.name}</span>
                        {isSelected && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-[#005baa]">
                            Đang xem
                          </span>
                        )}
                      </div>
                      {camp.description && (
                        <p className="text-[11px] text-slate-500 truncate max-w-md mt-0.5">
                          {camp.description}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {camp.periodValue || camp.periodType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      <div className="font-mono">
                        Từ:{' '}
                        {camp.startDate
                          ? new Date(camp.startDate).toLocaleDateString('vi-VN')
                          : '---'}
                      </div>
                      <div className="font-mono text-slate-500">
                        Đến:{' '}
                        {camp.endDate
                          ? new Date(camp.endDate).toLocaleDateString('vi-VN')
                          : '---'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {cState.isOpen ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Đang Có Hiệu Lực
                        </span>
                      ) : cState.isAutoLocked ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <Clock className="w-3 h-3" /> Hết Hạn (Tự Khóa)
                        </span>
                      ) : cState.isManualLocked ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Lock className="w-3 h-3" /> Đã Khóa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                          <Clock className="w-3 h-3" /> Chưa Mở
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-slate-800">
                        {cDoneUsers}/{cTotalAssigned}
                      </span>
                      <span className="text-[11px] text-slate-500 ml-1">({cRate}%)</span>
                      <div className="w-20 mx-auto bg-slate-200 rounded-full h-1 mt-1 overflow-hidden">
                        <div
                          className="bg-[#005baa] h-1 rounded-full"
                          style={{ width: `${cRate}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFocusedCampaignId(camp.id)}
                          className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                          title="Xem chi tiết điểm tin đợt này"
                        >
                          Điểm tin
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigateTab('reports')}
                          className="px-2 py-1 text-[11px] font-semibold text-[#005baa] bg-blue-50 hover:bg-blue-100 rounded transition-colors flex items-center gap-1 cursor-pointer"
                          title="Chuyển sang module Báo cáo"
                        >
                          <BarChart3 className="w-3 h-3" />
                          <span>Báo cáo</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
