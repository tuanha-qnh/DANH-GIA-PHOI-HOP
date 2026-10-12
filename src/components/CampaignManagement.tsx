/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Campaign, CampaignEvaluator, PeriodType } from '../types';
import {
  CalendarCheck,
  Building2,
  Users,
  Lock,
  Unlock,
  Plus,
  ArrowRight,
  ArrowLeft,
  ChevronsRight,
  ChevronsLeft,
  CheckCircle2,
  Clock,
  HelpCircle,
  BarChart3,
  Database,
  FileCheck2,
  Layers,
  Search,
} from 'lucide-react';

export const CampaignManagement: React.FC = () => {
  const {
    campaigns,
    units,
    users,
    criteria,
    targetUnits,
    evaluatingUnits,
    evaluators,
    evaluations,
    saveCampaign,
    toggleCampaignLock,
    saveCampaignConfig,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'campaigns' | 'assignment' | 'criteria' | 'dashboard'>('assignment');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    campaigns[0]?.id || ''
  );

  // Assignment tab state
  const [sourceUnitFilter, setSourceUnitFilter] = useState<string>(units[1]?.id || units[0]?.id || '');
  const [selectedLeftUserIds, setSelectedLeftUserIds] = useState<string[]>([]);
  const [selectedRightUserIds, setSelectedRightUserIds] = useState<string[]>([]);
  const [isDraggingOverRight, setIsDraggingOverRight] = useState(false);
  const [isDraggingOverLeft, setIsDraggingOverLeft] = useState(false);

  // Notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Create Campaign Modal
  const [isCreateCampModalOpen, setIsCreateCampModalOpen] = useState(false);
  const [campForm, setCampForm] = useState({
    code: '',
    name: '',
    periodType: 'QUARTER' as PeriodType,
    periodValue: 'Q2-2026',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    description: '',
  });

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const currentCampaign = campaigns.find((c) => c.id === selectedCampaignId) || campaigns[0];

  // Current campaign configurations
  const campaignTargetUnitIds = targetUnits
    .filter((t) => t.campaignId === currentCampaign?.id)
    .map((t) => t.unitId);

  const campaignEvaluatingUnitIds = evaluatingUnits
    .filter((e) => e.campaignId === currentCampaign?.id)
    .map((e) => e.unitId);

  const campaignEvaluatorList = evaluators.filter(
    (ev) => ev.campaignId === currentCampaign?.id
  );
  const assignedUserIds = new Set(campaignEvaluatorList.map((ev) => ev.userId));

  // Users for Left Window (from source unit, excluding already assigned to this campaign)
  const leftWindowUsers = users.filter((u) => {
    const matchUnit = sourceUnitFilter === 'ALL' || u.unitId === sourceUnitFilter;
    const notAssigned = !assignedUserIds.has(u.id);
    return matchUnit && notAssigned;
  });

  // Users for Right Window (assigned to this campaign)
  const rightWindowUsers = users.filter((u) => assignedUserIds.has(u.id));

  // Handlers for Target / Evaluating Units toggling
  const handleToggleTargetUnit = async (unitId: string) => {
    if (!currentCampaign) return;
    const newTargets = campaignTargetUnitIds.includes(unitId)
      ? campaignTargetUnitIds.filter((id) => id !== unitId)
      : [...campaignTargetUnitIds, unitId];

    await saveCampaignConfig(
      currentCampaign.id,
      newTargets,
      campaignEvaluatingUnitIds,
      campaignEvaluatorList
    );
    showNotification('Đã cập nhật danh sách đơn vị bị đánh giá trên D1!');
  };

  const handleToggleEvaluatingUnit = async (unitId: string) => {
    if (!currentCampaign) return;
    const newEvaluating = campaignEvaluatingUnitIds.includes(unitId)
      ? campaignEvaluatingUnitIds.filter((id) => id !== unitId)
      : [...campaignEvaluatingUnitIds, unitId];

    await saveCampaignConfig(
      currentCampaign.id,
      campaignTargetUnitIds,
      newEvaluating,
      campaignEvaluatorList
    );
    showNotification('Đã cập nhật danh sách đơn vị tham gia đánh giá trên D1!');
  };

  // Drag and Drop handlers
  const handleDragStartLeft = (e: React.DragEvent, userId: string) => {
    const idsToDrag = selectedLeftUserIds.includes(userId)
      ? selectedLeftUserIds
      : [userId];
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'ASSIGN_USERS', userIds: idsToDrag }));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragStartRight = (e: React.DragEvent, userId: string) => {
    const idsToDrag = selectedRightUserIds.includes(userId)
      ? selectedRightUserIds
      : [userId];
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'UNASSIGN_USERS', userIds: idsToDrag }));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDropOnRight = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverRight(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.type === 'ASSIGN_USERS' && Array.isArray(data.userIds)) {
        await assignUsers(data.userIds);
      }
    } catch {}
  };

  const handleDropOnLeft = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverLeft(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.type === 'UNASSIGN_USERS' && Array.isArray(data.userIds)) {
        await unassignUsers(data.userIds);
      }
    } catch {}
  };

  // Assignment actions
  const assignUsers = async (userIds: string[]) => {
    if (!currentCampaign || userIds.length === 0) return;
    const newEvaluators: CampaignEvaluator[] = [...campaignEvaluatorList];

    for (const uid of userIds) {
      if (!newEvaluators.some((ev) => ev.userId === uid)) {
        const u = users.find((usr) => usr.id === uid);
        if (u) {
          newEvaluators.push({
            campaignId: currentCampaign.id,
            userId: uid,
            unitId: u.unitId,
            assignedAt: new Date().toISOString(),
          });
        }
      }
    }

    await saveCampaignConfig(
      currentCampaign.id,
      campaignTargetUnitIds,
      campaignEvaluatingUnitIds,
      newEvaluators
    );

    setSelectedLeftUserIds([]);
    showNotification(`Đã gán quyền đánh giá cho ${userIds.length} cán bộ và đồng bộ lên D1!`);
  };

  const unassignUsers = async (userIds: string[]) => {
    if (!currentCampaign || userIds.length === 0) return;
    const remaining = campaignEvaluatorList.filter((ev) => !userIds.includes(ev.userId));

    await saveCampaignConfig(
      currentCampaign.id,
      campaignTargetUnitIds,
      campaignEvaluatingUnitIds,
      remaining
    );

    setSelectedRightUserIds([]);
    showNotification(`Đã hủy gán quyền cho ${userIds.length} cán bộ và đồng bộ lên D1!`);
  };

  // Button transfer handlers
  const handleAssignSelected = () => assignUsers(selectedLeftUserIds);
  const handleAssignAllFromSource = () => assignUsers(leftWindowUsers.map((u) => u.id));
  const handleUnassignSelected = () => unassignUsers(selectedRightUserIds);
  const handleUnassignAll = () => unassignUsers(rightWindowUsers.map((u) => u.id));

  // Toggle selection
  const toggleSelectLeft = (id: string) => {
    setSelectedLeftUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectRight = (id: string) => {
    setSelectedRightUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Create Campaign
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campForm.code.trim() || !campForm.name.trim()) {
      showNotification('Vui lòng nhập Mã và Tên đợt đánh giá!', 'error');
      return;
    }

    const newCamp: Campaign = {
      id: `camp-${Date.now()}`,
      code: campForm.code.trim().toUpperCase(),
      name: campForm.name.trim(),
      periodType: campForm.periodType,
      periodValue: campForm.periodValue.trim(),
      startDate: new Date(campForm.startDate).toISOString(),
      endDate: new Date(campForm.endDate).toISOString(),
      isLocked: false,
      description: campForm.description,
      createdAt: new Date().toISOString(),
    };

    await saveCampaign(newCamp);
    // Auto initialize all units as target and evaluating by default for convenience
    await saveCampaignConfig(
      newCamp.id,
      units.filter((u) => u.level <= 2).map((u) => u.id),
      units.filter((u) => u.level <= 2).map((u) => u.id),
      []
    );

    setSelectedCampaignId(newCamp.id);
    setIsCreateCampModalOpen(false);
    showNotification(`Đã tạo đợt đánh giá "${newCamp.name}" và đồng bộ lên D1!`);
  };

  // Real-time Dashboard computations
  const totalAssignedUsers = rightWindowUsers.length;
  const campaignEvaluations = evaluations.filter((e) => e.campaignId === currentCampaign?.id);

  // Group evaluations by user
  const completedUserIds = new Set(
    campaignEvaluations.filter((e) => e.status === 'SUBMITTED').map((e) => e.evaluatorId)
  );

  const completedCount = completedUserIds.size;
  const completionPercent = totalAssignedUsers > 0 ? Math.round((completedCount / totalAssignedUsers) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Campaign Selector */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              Quản Lý Đợt Đánh Giá & Phân Quyền Tham Gia
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Chỉ định đơn vị bị đánh giá, đơn vị tham gia, kéo thả gán cán bộ đánh giá và kiểm soát tiến độ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Active campaign selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Đợt đánh giá:</span>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#005baa]"
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.isLocked ? '(Đã Khóa)' : '(Đang Mở)'}
                </option>
              ))}
            </select>
          </div>

          {/* Lock / Unlock button */}
          {currentCampaign && (
            <button
              type="button"
              onClick={async () => {
                await toggleCampaignLock(currentCampaign.id);
                showNotification(
                  currentCampaign.isLocked
                    ? `Đã mở khóa đợt đánh giá "${currentCampaign.name}" cho cán bộ sửa đổi!`
                    : `Đã khóa đợt đánh giá "${currentCampaign.name}". Cán bộ không thể sửa đổi!`
                );
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors shadow-xs ${
                currentCampaign.isLocked
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {currentCampaign.isLocked ? (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Mở Khóa Đợt Này</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Khóa Dữ Liệu Đợt Này</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCreateCampModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#005baa] hover:bg-[#004b8d] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Đợt Mới</span>
          </button>
        </div>
      </div>

      {/* Notification banner */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('assignment')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'assignment'
              ? 'border-[#005baa] text-[#005baa]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Gán Cán Bộ Đánh Giá (Kéo Thả 2 Cửa Sổ)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('campaigns')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'campaigns'
              ? 'border-[#005baa] text-[#005baa]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Cấu Hình Đơn Vị Đánh Giá & Bị Đánh Giá</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('criteria')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'criteria'
              ? 'border-[#005baa] text-[#005baa]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Bộ Câu Hỏi & Thang Điểm (1-10)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'dashboard'
              ? 'border-[#005baa] text-[#005baa]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Bảng Điều Khiển Tiến Độ Thời Gian Thực</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 2 CỬA SỔ KÉO THẢ PHÂN QUYỀN GÁN CÁN BỘ ĐÁNH GIÁ                     */}
      {/* ========================================================================= */}
      {activeTab === 'assignment' && (
        <div className="space-y-4">
          <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-lg text-xs text-blue-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold">Hướng dẫn thao tác:</span>
              <span>
                Chọn đơn vị bên trái để lọc danh sách cán bộ. Chọn 1 hoặc nhiều người và <strong>kéo thả sang cửa sổ bên phải</strong> (hoặc bấm nút &gt;) để gán quyền tham gia đánh giá đợt này.
              </span>
            </div>
            <span className="font-bold text-[#005baa] whitespace-nowrap">
              Đã gán: {rightWindowUsers.length} cán bộ
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* CỬA SỔ BÊN TRÁI: DANH SÁCH CÁN BỘ CỦA ĐƠN VỊ */}
            <div
              className={`lg:col-span-5 bg-white rounded-xl border transition-all flex flex-col overflow-hidden shadow-xs ${
                isDraggingOverLeft ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOverLeft(true);
              }}
              onDragLeave={() => setIsDraggingOverLeft(false)}
              onDrop={handleDropOnLeft}
            >
              <div className="p-3.5 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    Cán Bộ Chưa Gán ({leftWindowUsers.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">Cửa sổ nguồn</span>
                </div>
                {/* Unit filter */}
                <select
                  value={sourceUnitFilter}
                  onChange={(e) => setSourceUnitFilter(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#005baa]"
                >
                  <option value="ALL">-- Tất cả các đơn vị --</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Users list */}
              <div className="flex-1 p-2 space-y-1.5 overflow-y-auto max-h-[460px] min-h-[300px]">
                {leftWindowUsers.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Tất cả cán bộ trong đơn vị này đã được gán quyền
                  </div>
                ) : (
                  leftWindowUsers.map((u) => {
                    const isSelected = selectedLeftUserIds.includes(u.id);
                    const unit = units.find((unt) => unt.id === u.unitId);
                    return (
                      <div
                        key={u.id}
                        draggable
                        onDragStart={(e) => handleDragStartLeft(e, u.id)}
                        onClick={() => toggleSelectLeft(u.id)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer select-none transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-50 border-blue-400 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectLeft(u.id)}
                            className="rounded border-slate-300 text-[#005baa] focus:ring-[#005baa]"
                          />
                          <img
                            src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200"
                          />
                          <div className="truncate">
                            <p className="font-semibold text-slate-800 leading-tight truncate">
                              {u.fullName}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                              <span className="font-mono text-slate-600">{u.hrmCode}</span>
                              <span>·</span>
                              <span className="truncate">{unit?.code}</span>
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] text-slate-400 px-1.5 py-0.5 bg-slate-100 rounded shrink-0">
                          Kéo thả
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer selection count */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Đã chọn: {selectedLeftUserIds.length}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedLeftUserIds.length === leftWindowUsers.length) {
                      setSelectedLeftUserIds([]);
                    } else {
                      setSelectedLeftUserIds(leftWindowUsers.map((u) => u.id));
                    }
                  }}
                  className="text-[#005baa] hover:underline font-semibold"
                >
                  {selectedLeftUserIds.length === leftWindowUsers.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
              </div>
            </div>

            {/* CỘT NÚT ĐIỀU KHIỂN CHUYỂN ĐỔI (TRANSFER CONTROLS) */}
            <div className="lg:col-span-2 flex flex-row lg:flex-col items-center justify-center gap-2 py-2">
              <button
                type="button"
                onClick={handleAssignSelected}
                disabled={selectedLeftUserIds.length === 0}
                className="flex items-center justify-center gap-1 w-full max-w-[140px] py-2 px-3 rounded-lg text-xs font-semibold bg-[#005baa] text-white hover:bg-[#004b8d] disabled:opacity-40 shadow-xs transition-colors"
                title="Gán các cán bộ đã chọn sang bên phải"
              >
                <span>Gán</span>
                <ArrowRight className="w-3.5 h-3.5 hidden lg:inline" />
              </button>

              <button
                type="button"
                onClick={handleAssignAllFromSource}
                disabled={leftWindowUsers.length === 0}
                className="flex items-center justify-center gap-1 w-full max-w-[140px] py-1.5 px-3 rounded-lg text-[11px] font-semibold border border-blue-200 text-[#005baa] bg-blue-50/50 hover:bg-blue-100 disabled:opacity-40 transition-colors"
                title="Gán tất cả cán bộ trong đơn vị này"
              >
                <span>Gán Tất Cả</span>
                <ChevronsRight className="w-3.5 h-3.5 hidden lg:inline" />
              </button>

              <div className="h-px w-16 bg-slate-200 my-1 hidden lg:block" />

              <button
                type="button"
                onClick={handleUnassignSelected}
                disabled={selectedRightUserIds.length === 0}
                className="flex items-center justify-center gap-1 w-full max-w-[140px] py-2 px-3 rounded-lg text-xs font-semibold bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-40 shadow-xs transition-colors"
                title="Hủy gán các cán bộ đã chọn"
              >
                <ArrowLeft className="w-3.5 h-3.5 hidden lg:inline" />
                <span>Hủy Gán</span>
              </button>

              <button
                type="button"
                onClick={handleUnassignAll}
                disabled={rightWindowUsers.length === 0}
                className="flex items-center justify-center gap-1 w-full max-w-[140px] py-1.5 px-3 rounded-lg text-[11px] font-semibold border border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100 disabled:opacity-40 transition-colors"
                title="Hủy gán toàn bộ đợt này"
              >
                <ChevronsLeft className="w-3.5 h-3.5 hidden lg:inline" />
                <span>Hủy Hết</span>
              </button>
            </div>

            {/* CỬA SỔ BÊN PHẢI: MỤC GÁN USER ĐƯỢC PHÉP THAM GIA ĐÁNH GIÁ */}
            <div
              className={`lg:col-span-5 bg-white rounded-xl border transition-all flex flex-col overflow-hidden shadow-xs ${
                isDraggingOverRight ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/20' : 'border-slate-200'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOverRight(true);
              }}
              onDragLeave={() => setIsDraggingOverRight(false)}
              onDrop={handleDropOnRight}
            >
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Cán Bộ Được Phép Đánh Giá ({rightWindowUsers.length})
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Đợt: <strong className="text-slate-700">{currentCampaign?.name}</strong>
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  Đã Gán Quyền
                </span>
              </div>

              {/* Drop target users list */}
              <div className="flex-1 p-2 space-y-1.5 overflow-y-auto max-h-[460px] min-h-[300px]">
                {rightWindowUsers.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-lg m-2">
                    <p className="font-semibold text-slate-500">Chưa có cán bộ nào được gán quyền</p>
                    <p className="text-[11px] mt-1 text-slate-400">
                      Kéo thả cán bộ từ cửa sổ bên trái vào đây để hoàn tất việc gán quyền
                    </p>
                  </div>
                ) : (
                  rightWindowUsers.map((u) => {
                    const isSelected = selectedRightUserIds.includes(u.id);
                    const unit = units.find((unt) => unt.id === u.unitId);
                    const hasEvaluated = completedUserIds.has(u.id);
                    return (
                      <div
                        key={u.id}
                        draggable
                        onDragStart={(e) => handleDragStartRight(e, u.id)}
                        onClick={() => toggleSelectRight(u.id)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer select-none transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-400 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRight(u.id)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <img
                            src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200"
                          />
                          <div className="truncate">
                            <p className="font-semibold text-slate-800 leading-tight truncate">
                              {u.fullName}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                              <span className="font-mono text-slate-600">{u.hrmCode}</span>
                              <span>·</span>
                              <span className="truncate">{unit?.code}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {hasEvaluated ? (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Đã gửi bài
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 px-1.5 py-0.5 bg-slate-100 rounded">
                              Chưa gửi
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer selection count */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Đã chọn: {selectedRightUserIds.length}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedRightUserIds.length === rightWindowUsers.length) {
                      setSelectedRightUserIds([]);
                    } else {
                      setSelectedRightUserIds(rightWindowUsers.map((u) => u.id));
                    }
                  }}
                  className="text-emerald-700 hover:underline font-semibold"
                >
                  {selectedRightUserIds.length === rightWindowUsers.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CẤU HÌNH ĐƠN VỊ ĐƯỢC ĐƯA VÀO ĐÁNH GIÁ & ĐƠN VỊ THAM GIA ĐÁNH GIÁ     */}
      {/* ========================================================================= */}
      {activeTab === 'campaigns' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Đơn vị BỊ đưa vào đánh giá (Target Units) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-rose-600" />
                  Đơn Vị Bị Đưa Vào Đánh Giá
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Các đơn vị sẽ được các đơn vị khác chấm điểm phối hợp
                </p>
              </div>
              <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                {campaignTargetUnitIds.length} đơn vị
              </span>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {units.map((u) => {
                const isChecked = campaignTargetUnitIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                      isChecked
                        ? 'border-rose-300 bg-rose-50/40 text-slate-900'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleTargetUnit(u.id)}
                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                      />
                      <div>
                        <p className="font-semibold">{u.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{u.code}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400">Cấp {u.level}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Đơn vị THAM GIA đánh giá (Evaluating Units) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#005baa]" />
                  Đơn Vị Tham Gia Đánh Giá
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Các đơn vị có cán bộ được quyền thực hiện chấm điểm
                </p>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {campaignEvaluatingUnitIds.length} đơn vị
              </span>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {units.map((u) => {
                const isChecked = campaignEvaluatingUnitIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                      isChecked
                        ? 'border-blue-300 bg-blue-50/40 text-slate-900'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleEvaluatingUnit(u.id)}
                        className="rounded border-slate-300 text-[#005baa] focus:ring-[#005baa]"
                      />
                      <div>
                        <p className="font-semibold">{u.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{u.code}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400">Cấp {u.level}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BỘ CÂU HỎI ĐÁNH GIÁ & THANG ĐIỂM (1 - 10)                           */}
      {/* ========================================================================= */}
      {activeTab === 'criteria' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 mb-1">
              Quy Chuẩn Thang Điểm & Công Thức Đánh Giá VNPT
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Hệ thống áp dụng thang điểm từ <strong>1 đến 10</strong> theo quy định. Điểm đánh giá chung của một đơn vị là <strong>điểm trung bình cộng</strong> của tất cả các tiêu chí đánh giá.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs">
                <span className="font-bold text-amber-800 block mb-1">
                  1. Quy định Chấm Điểm Thấp (Từ 6 điểm trở xuống):
                </span>
                <p className="text-amber-900 leading-relaxed">
                  Nếu điểm đánh giá từ <strong>6 điểm trở xuống (&le; 6)</strong>: Cán bộ đánh giá <strong>BẮT BUỘC</strong> phải nhập nội dung <em>"Lý do chấm điểm thấp"</em> với độ dài tối thiểu từ <strong>50 ký tự trở lên</strong> thì hệ thống mới cho phép lưu kết quả.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs">
                <span className="font-bold text-emerald-800 block mb-1">
                  2. Quy định Chấm Điểm Cao (Từ 7 điểm trở lên):
                </span>
                <p className="text-emerald-900 leading-relaxed">
                  Nếu điểm đánh giá từ <strong>7 điểm trở lên (&ge; 7)</strong>: Không bắt buộc phải nhập lý do, cán bộ có thể nhập thêm góp ý hoặc để trống theo ý muốn.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <h4 className="font-bold text-xs text-slate-800">
                Danh Sách {criteria.length} Tiêu Chí Đánh Giá Phối Hợp Hiện Hành
              </h4>
            </div>
            <div className="divide-y divide-slate-100">
              {criteria.map((c, index) => (
                <div key={c.id} className="p-4 hover:bg-slate-50/60 transition-colors text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#005baa] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[11px]">
                        {c.code}
                      </span>
                      <h5 className="font-bold text-slate-900 text-sm">
                        {index + 1}. {c.name}
                      </h5>
                    </div>
                    <p className="text-slate-500 pl-1">{c.description}</p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-slate-600">
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400">Thang điểm</p>
                      <p className="font-bold text-[#005baa]">1 - 10 điểm</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400">Trọng số</p>
                      <p className="font-bold text-slate-700">{c.weight}x</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BẢNG ĐIỀU KHIỂN TIẾN ĐỘ THỜI GIAN THỰC (REALTIME DASHBOARD)          */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top 3 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Tỷ Lệ Hoàn Thành</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-[#005baa]">{completionPercent}%</span>
                <span className="text-xs text-slate-500">tiến độ toàn tỉnh</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                <div
                  className="bg-[#005baa] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Cán Bộ Đã Gửi Đánh Giá</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-emerald-600">{completedCount}</span>
                <span className="text-xs text-slate-500">/ {totalAssignedUsers} cán bộ được gán</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Còn lại {Math.max(0, totalAssignedUsers - completedCount)} cán bộ chưa hoàn thành
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Trạng Thái Đợt Đánh Giá</span>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-2xl font-bold text-slate-800">
                  {currentCampaign?.isLocked ? 'Đã Khóa Dữ Liệu' : 'Đang Mở Tiếp Nhận'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Chu kỳ: {currentCampaign?.periodValue} ({currentCampaign?.periodType})
              </p>
            </div>
          </div>

          {/* Progress per unit */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <h3 className="font-bold text-sm text-slate-900 mb-4">
              Tiến Độ Chi Tiết Theo Từng Đơn Vị Tham Gia Đánh Giá
            </h3>
            <div className="space-y-4">
              {units
                .filter((u) => campaignEvaluatingUnitIds.includes(u.id))
                .map((unit) => {
                  const unitEvaluators = rightWindowUsers.filter((u) => u.unitId === unit.id);
                  const unitCompleted = unitEvaluators.filter((u) => completedUserIds.has(u.id)).length;
                  const unitRate = unitEvaluators.length > 0 ? Math.round((unitCompleted / unitEvaluators.length) * 100) : 0;

                  return (
                    <div key={unit.id} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/60 text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[#005baa]" />
                          <span className="font-bold text-slate-800">{unit.name} ({unit.code})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-600 font-medium">
                            {unitCompleted}/{unitEvaluators.length} cán bộ
                          </span>
                          <span className="font-bold text-[#005baa]">{unitRate}%</span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${unitRate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL TẠO MỚI ĐỢT ĐÁNH GIÁ */}
      {isCreateCampModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="bg-[#005baa] px-5 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <CalendarCheck className="w-4 h-4" />
                Khởi Tạo Đợt Đánh Giá Mới
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateCampModalOpen(false)}
                className="text-white/80 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mã Đợt Đánh Giá *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: DG-Q2-2026, DG-T04-2026"
                  value={campForm.code}
                  onChange={(e) => setCampForm({ ...campForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa] font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên Đợt Đánh Giá *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Đánh giá công tác phối hợp Quý 2/2026"
                  value={campForm.name}
                  onChange={(e) => setCampForm({ ...campForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Loại Chu Kỳ
                  </label>
                  <select
                    value={campForm.periodType}
                    onChange={(e) => setCampForm({ ...campForm, periodType: e.target.value as PeriodType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa] bg-white"
                  >
                    <option value="QUARTER">Theo Quý</option>
                    <option value="MONTH">Theo Tháng</option>
                    <option value="YEAR">Theo Năm</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ký Hiệu Chu Kỳ
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Q2-2026 hoặc 2026-04"
                    value={campForm.periodValue}
                    onChange={(e) => setCampForm({ ...campForm, periodValue: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ngày Bắt Đầu
                  </label>
                  <input
                    type="date"
                    required
                    value={campForm.startDate}
                    onChange={(e) => setCampForm({ ...campForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ngày Kết Thúc
                  </label>
                  <input
                    type="date"
                    required
                    value={campForm.endDate}
                    onChange={(e) => setCampForm({ ...campForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateCampModalOpen(false)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#005baa] hover:bg-[#004b8d] text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Tạo Đợt & Đồng Bộ D1</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
