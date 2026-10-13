/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Campaign, CampaignEvaluator, Criterion, PeriodType } from '../types';
import {
  CalendarCheck,
  Building2,
  Users,
  Lock,
  Unlock,
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  HelpCircle,
  BarChart3,
  FileCheck2,
  Layers,
  Search,
  CheckSquare,
  Square,
  Edit3,
  Trash2,
  ShieldCheck,
  Sparkles,
  Info,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface CampaignManagementProps {
  initialStep?: 'step1_campaigns' | 'step2_units' | 'step3_criteria' | 'step4_assignment';
}

export const CampaignManagement: React.FC<CampaignManagementProps> = ({ initialStep }) => {
  const {
    campaigns,
    units,
    users,
    criteria,
    campaignCriteria,
    targetUnits,
    evaluatingUnits,
    evaluators,
    evaluations,
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
  } = useApp();

  // Workflow steps:
  // Bước 1: Tạo đợt đánh giá
  // Bước 2: Lựa chọn đơn vị bị đánh giá và đơn vị thực hiện đánh giá
  // Bước 3: Lựa chọn câu hỏi đánh giá (có thể chọn nhiều câu hỏi trong 1 lần) & Thêm, sửa, xóa bộ câu hỏi
  // Bước 4: Gán cán bộ đánh giá & Bảng điều khiển tiến độ
  const [activeTab, setActiveTab] = useState<
    'step1_campaigns' | 'step2_units' | 'step3_criteria' | 'step4_assignment'
  >(initialStep || 'step1_campaigns');

  React.useEffect(() => {
    if (initialStep) {
      setActiveTab(initialStep);
    }
  }, [initialStep]);

  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    campaigns[0]?.id || ''
  );

  // Search & filter states
  const [targetSearch, setTargetSearch] = useState('');
  const [evaluatingSearch, setEvaluatingSearch] = useState('');
  const [criteriaSearch, setCriteriaSearch] = useState('');

  // Assignment tab state (Bước 4)
  const [sourceUnitFilter, setSourceUnitFilter] = useState<string>(
    units[1]?.id || units[0]?.id || ''
  );
  const [selectedLeftUserIds, setSelectedLeftUserIds] = useState<string[]>([]);
  const [selectedRightUserIds, setSelectedRightUserIds] = useState<string[]>([]);
  const [isDraggingOverRight, setIsDraggingOverRight] = useState(false);
  const [isDraggingOverLeft, setIsDraggingOverLeft] = useState(false);

  // Notification
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Create / Edit Campaign Modal
  const [isCreateCampModalOpen, setIsCreateCampModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [campForm, setCampForm] = useState({
    code: '',
    name: '',
    periodType: 'QUARTER' as PeriodType,
    periodValue: 'Q2-2026',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    description: '',
  });

  // Criterion Modal (Thêm / Sửa câu hỏi)
  const [isCriterionModalOpen, setIsCriterionModalOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null);
  const [criterionForm, setCriterionForm] = useState<{
    code: string;
    name: string;
    description: string;
    weight: number;
    minScore: number;
    maxScore: number;
  }>({
    code: '',
    name: '',
    description: '',
    weight: 1.0,
    minScore: 1,
    maxScore: 10,
  });

  // Delete Criterion Confirmation Modal
  const [criterionToDelete, setCriterionToDelete] = useState<Criterion | null>(null);

  const showNotification = (
    message: string,
    type: 'success' | 'error' = 'success'
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const currentCampaign =
    campaigns.find((c) => c.id === selectedCampaignId) || campaigns[0];

  // Current campaign configurations
  const campaignTargetUnitIds = targetUnits
    .filter((t) => t.campaignId === currentCampaign?.id)
    .map((t) => t.unitId);

  const campaignEvaluatingUnitIds = evaluatingUnits
    .filter((e) => e.campaignId === currentCampaign?.id)
    .map((e) => e.unitId);

  const currentCampaignCriterionIds = campaignCriteria
    .filter((c) => c.campaignId === currentCampaign?.id)
    .map((c) => c.criterionId);

  // If campaign has no criteria configured yet, fallback to all criteria IDs
  const activeSelectedCriterionIds =
    currentCampaignCriterionIds.length > 0
      ? currentCampaignCriterionIds
      : criteria.map((c) => c.id);

  const campaignEvaluatorList = evaluators.filter(
    (ev) => ev.campaignId === currentCampaign?.id
  );
  const assignedUserIds = new Set(
    campaignEvaluatorList.map((ev) => ev.userId)
  );

  // Users for Left Window (from source unit, excluding already assigned to this campaign)
  const leftWindowUsers = users.filter((u) => {
    const matchUnit =
      sourceUnitFilter === 'ALL' || u.unitId === sourceUnitFilter;
    const notAssigned = !assignedUserIds.has(u.id);
    return matchUnit && notAssigned;
  });

  // Users for Right Window (assigned to this campaign)
  const rightWindowUsers = users.filter((u) => assignedUserIds.has(u.id));

  // =========================================================================
  // BƯỚC 2: TOGGLE VÀ CHỌN ĐƠN VỊ ĐÁNH GIÁ & BỊ ĐÁNH GIÁ
  // =========================================================================
  const handleToggleTargetUnit = async (unitId: string) => {
    if (!currentCampaign) return;
    await toggleTargetUnit(currentCampaign.id, unitId);
    showNotification('Đã cập nhật đơn vị bị đánh giá!');
  };

  const handleSelectAllTargetUnits = async (selectAll: boolean) => {
    if (!currentCampaign) return;
    await selectAllTargetUnits(currentCampaign.id, selectAll);
    showNotification(
      selectAll
        ? `Đã chọn tất cả ${units.length} đơn vị bị đánh giá!`
        : 'Đã bỏ chọn tất cả đơn vị bị đánh giá!'
    );
  };

  const handleToggleEvaluatingUnit = async (unitId: string) => {
    if (!currentCampaign) return;
    await toggleEvaluatingUnit(currentCampaign.id, unitId);
    showNotification('Đã cập nhật đơn vị tham gia đánh giá!');
  };

  const handleSelectAllEvaluatingUnits = async (selectAll: boolean) => {
    if (!currentCampaign) return;
    await selectAllEvaluatingUnits(currentCampaign.id, selectAll);
    showNotification(
      selectAll
        ? `Đã chọn tất cả ${units.length} đơn vị tham gia đánh giá!`
        : 'Đã bỏ chọn tất cả đơn vị tham gia đánh giá!'
    );
  };

  // =========================================================================
  // BƯỚC 3: LỰA CHỌN CÂU HỎI ÁP DỤNG CHO ĐỢT ĐÁNH GIÁ NÀY
  // =========================================================================
  const handleToggleCriterionForCampaign = async (criterionId: string) => {
    if (!currentCampaign) return;
    await toggleCampaignCriterion(currentCampaign.id, criterionId);
    showNotification('Đã cập nhật câu hỏi áp dụng cho đợt này!');
  };

  const handleSelectAllCriteriaForCampaign = async (selectAll: boolean) => {
    if (!currentCampaign) return;
    await selectAllCampaignCriteria(currentCampaign.id, selectAll);
    showNotification(
      selectAll
        ? `Đã chọn tất cả ${criteria.length} câu hỏi cho đợt này!`
        : 'Đã bỏ chọn tất cả câu hỏi của đợt này!'
    );
  };

  // =========================================================================
  // BƯỚC 3: THÊM / SỬA / XÓA TIÊU CHÍ & CÂU HỎI TRONG NGÂN HÀNG CÂU HỎI
  // =========================================================================
  const openCreateCriterionModal = () => {
    setEditingCriterion(null);
    setCriterionForm({
      code: `TC0${criteria.length + 1}`,
      name: '',
      description: '',
      weight: 1.0,
      minScore: 1,
      maxScore: 10,
    });
    setIsCriterionModalOpen(true);
  };

  const openEditCriterionModal = (crit: Criterion) => {
    setEditingCriterion(crit);
    setCriterionForm({
      code: crit.code,
      name: crit.name,
      description: crit.description || '',
      weight: crit.weight || 1.0,
      minScore: crit.minScore || 1,
      maxScore: crit.maxScore || 10,
    });
    setIsCriterionModalOpen(true);
  };

  const handleSaveCriterionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!criterionForm.code.trim() || !criterionForm.name.trim()) {
      showNotification('Vui lòng nhập Mã và Tên câu hỏi / tiêu chí!', 'error');
      return;
    }

    const item: Criterion = {
      id: editingCriterion?.id || `tc-${Date.now()}`,
      code: criterionForm.code.trim().toUpperCase(),
      name: criterionForm.name.trim(),
      description: criterionForm.description.trim(),
      weight: Number(criterionForm.weight) || 1.0,
      minScore: Number(criterionForm.minScore) || 1,
      maxScore: Number(criterionForm.maxScore) || 10,
      orderIndex: editingCriterion?.orderIndex || criteria.length + 1,
    };

    await saveCriterion(item);

    // If new item, also auto-add to active campaign criteria
    if (!editingCriterion && currentCampaign) {
      const nextCriteria = [...activeSelectedCriterionIds, item.id];
      await saveCampaignConfig(
        currentCampaign.id,
        campaignTargetUnitIds,
        campaignEvaluatingUnitIds,
        campaignEvaluatorList,
        nextCriteria
      );
    }

    setIsCriterionModalOpen(false);
    showNotification(
      editingCriterion
        ? `Đã cập nhật câu hỏi "${item.code}" và đồng bộ lên CSDL D1!`
        : `Đã thêm mới câu hỏi "${item.code}" vào hệ thống CSDL D1!`
    );
  };

  const confirmDeleteCriterion = async () => {
    if (!criterionToDelete) return;
    await deleteCriterion(criterionToDelete.id);
    setCriterionToDelete(null);
    showNotification(`Đã xóa câu hỏi "${criterionToDelete.code}" khỏi CSDL D1!`);
  };

  // =========================================================================
  // BƯỚC 4: GÁN CÁN BỘ ĐÁNH GIÁ (KÉO THẢ)
  // =========================================================================
  const handleDragStartLeft = (e: React.DragEvent, userId: string) => {
    const idsToDrag = selectedLeftUserIds.includes(userId)
      ? selectedLeftUserIds
      : [userId];
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({ type: 'ASSIGN_USERS', userIds: idsToDrag })
    );
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragStartRight = (e: React.DragEvent, userId: string) => {
    const idsToDrag = selectedRightUserIds.includes(userId)
      ? selectedRightUserIds
      : [userId];
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({ type: 'UNASSIGN_USERS', userIds: idsToDrag })
    );
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
      newEvaluators,
      activeSelectedCriterionIds
    );

    setSelectedLeftUserIds([]);
    showNotification(
      `Đã gán quyền đánh giá cho ${userIds.length} cán bộ và đồng bộ lên D1!`
    );
  };

  const unassignUsers = async (userIds: string[]) => {
    if (!currentCampaign || userIds.length === 0) return;
    const remaining = campaignEvaluatorList.filter(
      (ev) => !userIds.includes(ev.userId)
    );

    await saveCampaignConfig(
      currentCampaign.id,
      campaignTargetUnitIds,
      campaignEvaluatingUnitIds,
      remaining,
      activeSelectedCriterionIds
    );

    setSelectedRightUserIds([]);
    showNotification(
      `Đã hủy gán quyền cho ${userIds.length} cán bộ và đồng bộ lên D1!`
    );
  };

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

  // =========================================================================
  // =========================================================================
  // THÊM / SỬA / XÓA ĐỢT ĐÁNH GIÁ (BƯỚC 1)
  // =========================================================================
  const openCreateCampModal = () => {
    setEditingCampaign(null);
    setCampForm({
      code: `DG-Q${Math.floor(Math.random() * 4) + 1}-2026`,
      name: '',
      periodType: 'QUARTER',
      periodValue: 'Q2-2026',
      startDate: '2026-04-01',
      endDate: '2026-06-30',
      description: '',
    });
    setIsCreateCampModalOpen(true);
  };

  const openEditCampModal = (camp: Campaign) => {
    setEditingCampaign(camp);
    setCampForm({
      code: camp.code,
      name: camp.name,
      periodType: camp.periodType,
      periodValue: camp.periodValue,
      startDate: camp.startDate ? camp.startDate.split('T')[0] : '2026-04-01',
      endDate: camp.endDate ? camp.endDate.split('T')[0] : '2026-06-30',
      description: camp.description || '',
    });
    setIsCreateCampModalOpen(true);
  };

  const handleDeleteCamp = (camp: Campaign) => {
    setCampaignToDelete(camp);
  };

  const confirmDeleteCamp = async () => {
    if (!campaignToDelete) return;
    const name = campaignToDelete.name;
    const deletedId = campaignToDelete.id;
    await deleteCampaign(deletedId);
    if (selectedCampaignId === deletedId) {
      const remaining = campaigns.filter((c) => c.id !== deletedId);
      if (remaining.length > 0) {
        setSelectedCampaignId(remaining[0].id);
      }
    }
    setCampaignToDelete(null);
    showNotification(`Đã xóa đợt đánh giá "${name}" và toàn bộ cấu hình liên quan thành công!`);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campForm.code.trim() || !campForm.name.trim()) {
      showNotification('Vui lòng nhập Mã và Tên đợt đánh giá!', 'error');
      return;
    }

    if (editingCampaign) {
      // Sửa đợt đánh giá hiện có
      const updatedCamp: Campaign = {
        ...editingCampaign,
        code: campForm.code.trim().toUpperCase(),
        name: campForm.name.trim(),
        periodType: campForm.periodType,
        periodValue: campForm.periodValue.trim(),
        startDate: new Date(campForm.startDate).toISOString(),
        endDate: new Date(campForm.endDate).toISOString(),
        description: campForm.description,
      };

      await saveCampaign(updatedCamp);
      setIsCreateCampModalOpen(false);
      showNotification(`Đã cập nhật thông tin đợt đánh giá "${updatedCamp.name}" thành công!`);
    } else {
      // Tạo mới đợt đánh giá
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

      // Mặc định chọn tất cả đơn vị cấp 1 & cấp 2, cùng tất cả tiêu chí cho đợt mới
      const defaultUnits = units.filter((u) => u.level <= 2).map((u) => u.id);
      const defaultCriteria = criteria.map((c) => c.id);

      await saveCampaignConfig(
        newCamp.id,
        defaultUnits,
        defaultUnits,
        [],
        defaultCriteria
      );

      setSelectedCampaignId(newCamp.id);
      setIsCreateCampModalOpen(false);
      showNotification(`Đã tạo đợt đánh giá "${newCamp.name}" thành công!`);
      // Tự động chuyển người dùng sang Bước 2 để chọn đơn vị
      setActiveTab('step2_units');
    }
  };

  // Thống kê tiến độ thời gian thực
  const totalAssignedUsers = rightWindowUsers.length;
  const campaignEvaluations = evaluations.filter(
    (e) => e.campaignId === currentCampaign?.id
  );
  const completedUserIds = new Set(
    campaignEvaluations
      .filter((e) => e.status === 'SUBMITTED')
      .map((e) => e.evaluatorId)
  );
  const completedCount = completedUserIds.size;
  const completionPercent =
    totalAssignedUsers > 0
      ? Math.round((completedCount / totalAssignedUsers) * 100)
      : 0;

  // Lọc danh sách theo tìm kiếm
  const filteredTargetUnits = units.filter(
    (u) =>
      u.name.toLowerCase().includes(targetSearch.toLowerCase()) ||
      u.code.toLowerCase().includes(targetSearch.toLowerCase())
  );

  const filteredEvaluatingUnits = units.filter(
    (u) =>
      u.name.toLowerCase().includes(evaluatingSearch.toLowerCase()) ||
      u.code.toLowerCase().includes(evaluatingSearch.toLowerCase())
  );

  const filteredCriteria = criteria.filter(
    (c) =>
      c.name.toLowerCase().includes(criteriaSearch.toLowerCase()) ||
      c.code.toLowerCase().includes(criteriaSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Campaign Selector */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              Quy Trình Quản Lý & Khởi Tạo Đợt Đánh Giá Phối Hợp
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quy trình chuẩn 3 bước: 1. Tạo đợt &rarr; 2. Chọn đơn vị bị đánh giá & tham gia &rarr; 3. Chọn bộ câu hỏi đánh giá
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Active campaign selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Đợt hiện hành:</span>
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
                    ? `Đã mở khóa đợt "${currentCampaign.name}" cho cán bộ sửa đổi!`
                    : `Đã khóa đợt "${currentCampaign.name}". Cán bộ không thể sửa đổi!`
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
                  <span>Mở Khóa</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Khóa Đợt</span>
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
            <span>Tạo Đợt Mới (Bước 1)</span>
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

      {/* Workflow Navigation Steps */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('step1_campaigns')}
          className={`p-3 rounded-lg text-left transition-all border ${
            activeTab === 'step1_campaigns'
              ? 'border-[#005baa] bg-blue-50/70 text-[#005baa] shadow-xs ring-1 ring-[#005baa]'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-[#005baa]">
              Bước 1
            </span>
            <CalendarCheck className="w-4 h-4 text-slate-400" />
          </div>
          <p className="font-bold text-xs mt-1.5 text-slate-900">Tạo Đợt Đánh Giá</p>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            {campaigns.length} đợt đã khởi tạo
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('step2_units')}
          className={`p-3 rounded-lg text-left transition-all border ${
            activeTab === 'step2_units'
              ? 'border-[#005baa] bg-blue-50/70 text-[#005baa] shadow-xs ring-1 ring-[#005baa]'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
              Bước 2
            </span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <p className="font-bold text-xs mt-1.5 text-slate-900">Cấu Hình Đơn Vị</p>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            Bị ĐG: {campaignTargetUnitIds.length} · Thực hiện: {campaignEvaluatingUnitIds.length}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('step3_criteria')}
          className={`p-3 rounded-lg text-left transition-all border ${
            activeTab === 'step3_criteria'
              ? 'border-[#005baa] bg-blue-50/70 text-[#005baa] shadow-xs ring-1 ring-[#005baa]'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
              Bước 3
            </span>
            <FileCheck2 className="w-4 h-4 text-slate-400" />
          </div>
          <p className="font-bold text-xs mt-1.5 text-slate-900">Chọn Bộ Câu Hỏi (1-10)</p>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            Đã chọn: {activeSelectedCriterionIds.length}/{criteria.length} câu hỏi
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('step4_assignment')}
          className={`p-3 rounded-lg text-left transition-all border ${
            activeTab === 'step4_assignment'
              ? 'border-[#005baa] bg-blue-50/70 text-[#005baa] shadow-xs ring-1 ring-[#005baa]'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Bước 4
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="font-bold text-xs mt-1.5 text-slate-900">Gán Cán Bộ & Tiến Độ</p>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            {rightWindowUsers.length} cán bộ · Tiến độ {completionPercent}%
          </p>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* BƯỚC 1: QUẢN LÝ & KHỞI TẠO ĐỢT ĐÁNH GIÁ                                    */}
      {/* ========================================================================= */}
      {activeTab === 'step1_campaigns' && (
        <div className="space-y-5">
          <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl text-xs text-blue-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="font-bold text-sm text-[#005baa] flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4" />
                Bước 1: Khởi Tạo Và Quản Lý Đợt Đánh Giá
              </p>
              <p className="text-slate-600">
                Tạo đợt đánh giá mới theo Quý, Tháng hoặc Năm. Sau khi tạo, hãy chọn đợt và bấm nút <strong>"Tiếp Tục Sang Bước 2"</strong> để lựa chọn các đơn vị tham gia.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateCampModal}
              className="px-4 py-2 bg-[#005baa] hover:bg-[#004b8d] text-white font-semibold rounded-lg shrink-0 shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Khởi Tạo Đợt Đánh Giá Mới</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Danh Sách {campaigns.length} Đợt Đánh Giá Đang Có
              </h3>
              <span className="text-[11px] text-slate-500">
                Click vào một đợt để chọn làm đợt hiện hành
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {campaigns.map((camp) => {
                const isSelected = camp.id === currentCampaign?.id;
                const targetsCount = targetUnits.filter((t) => t.campaignId === camp.id).length;
                const evaluatingCount = evaluatingUnits.filter((e) => e.campaignId === camp.id).length;
                const evaluatorsCount = evaluators.filter((ev) => ev.campaignId === camp.id).length;
                const criteriaCount = campaignCriteria.filter((cc) => cc.campaignId === camp.id).length || criteria.length;

                return (
                  <div
                    key={camp.id}
                    className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {camp.code}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">{camp.name}</h4>
                        {isSelected && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#005baa] text-white">
                            Đang Chọn
                          </span>
                        )}
                        {camp.isLocked ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Đã Khóa
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <Unlock className="w-3 h-3" /> Đang Mở
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500">{camp.description || 'Không có mô tả chi tiết'}</p>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                        <span>
                          Chu kỳ: <strong>{camp.periodValue}</strong> ({camp.periodType})
                        </span>
                        <span>·</span>
                        <span>
                          Thời gian: {new Date(camp.startDate).toLocaleDateString('vi-VN')} &ndash;{' '}
                          {new Date(camp.endDate).toLocaleDateString('vi-VN')}
                        </span>
                        <span>·</span>
                        <span className="text-slate-700 font-semibold">
                          {targetsCount} đơn vị bị ĐG · {evaluatingCount} đơn vị ĐG · {criteriaCount} câu hỏi · {evaluatorsCount} cán bộ
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => toggleCampaignLock(camp.id)}
                        className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                          camp.isLocked
                            ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                        title={camp.isLocked ? 'Bấm để Mở khóa đợt này' : 'Bấm để Khóa đợt này'}
                      >
                        {camp.isLocked ? (
                          <Lock className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <span className="hidden sm:inline">{camp.isLocked ? 'Mở Khóa' : 'Khóa'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditCampModal(camp)}
                        className="p-2 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-[#005baa] rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                        title="Chỉnh sửa thông tin đợt đánh giá"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Sửa</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCamp(camp)}
                        className="p-2 border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                        title="Xóa đợt đánh giá này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Xóa</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCampaignId(camp.id);
                          setActiveTab('step2_units');
                        }}
                        className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                          isSelected
                            ? 'bg-[#005baa] hover:bg-[#004b8d] text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <span>Cấu Hình Bước 2</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BƯỚC 2: CẤU HÌNH ĐƠN VỊ ĐÁNH GIÁ & BỊ ĐÁNH GIÁ                             */}
      {/* ========================================================================= */}
      {activeTab === 'step2_units' && (
        <div className="space-y-5">
          {/* Header step 2 */}
          <div className="bg-indigo-50/70 border border-indigo-200 p-4 rounded-xl text-xs text-indigo-950 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-sm text-indigo-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-700" />
                Bước 2: Lựa Chọn Đơn Vị Bị Đánh Giá & Đơn Vị Thực Hiện Đánh Giá
              </p>
              <p className="text-indigo-800 mt-1">
                Đang cấu hình cho đợt: <strong className="text-indigo-950">{currentCampaign?.name} ({currentCampaign?.code})</strong>. Tích chọn vào từng đơn vị để cập nhật ngay lập tức lên CSDL D1.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('step1_campaigns')}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold rounded-lg flex items-center gap-1 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay Lại Bước 1</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('step3_criteria')}
                className="px-3 py-2 bg-[#005baa] hover:bg-[#004b8d] text-white font-semibold rounded-lg flex items-center gap-1 text-xs shadow-xs"
              >
                <span>Sang Bước 3: Chọn Câu Hỏi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CỘT 1: ĐƠN VỊ BỊ ĐƯA VÀO ĐÁNH GIÁ (TARGET UNITS) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
              <div className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-rose-600" />
                    Đơn Vị Bị Đưa Vào Đánh Giá
                  </h3>
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    Đã chọn: {campaignTargetUnitIds.length} / {units.length}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Các đơn vị sẽ được các đơn vị khác chấm điểm phối hợp công tác
                </p>

                {/* Toolbar: Search and Select All */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm đơn vị bị đánh giá..."
                      value={targetSearch}
                      onChange={(e) => setTargetSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 bg-slate-50/60"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectAllTargetUnits(true)}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 rounded border border-rose-200 shrink-0"
                  >
                    Chọn Tất Cả
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAllTargetUnits(false)}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded border border-slate-200 shrink-0"
                  >
                    Bỏ Chọn
                  </button>
                </div>
              </div>

              {/* Unit list with prominent checkboxes */}
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1 mt-3 flex-1">
                {filteredTargetUnits.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Không tìm thấy đơn vị nào phù hợp
                  </div>
                ) : (
                  filteredTargetUnits.map((u) => {
                    const isChecked = campaignTargetUnitIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => handleToggleTargetUnit(u.id)}
                        className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                          isChecked
                            ? 'border-rose-400 bg-rose-50/70 text-slate-900 shadow-2xs font-semibold ring-1 ring-rose-300'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleTargetUnit(u.id);
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                          />
                          <div>
                            <p className="font-bold text-slate-800 leading-tight">
                              {u.name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {u.code}
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          Cấp {u.level}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* CỘT 2: ĐƠN VỊ THỰC HIỆN ĐÁNH GIÁ (EVALUATING UNITS) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
              <div className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#005baa]" />
                    Đơn Vị Thực Hiện Đánh Giá
                  </h3>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Đã chọn: {campaignEvaluatingUnitIds.length} / {units.length}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Các đơn vị có cán bộ được quyền tham gia thực hiện chấm điểm
                </p>

                {/* Toolbar: Search and Select All */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm đơn vị tham gia đánh giá..."
                      value={evaluatingSearch}
                      onChange={(e) => setEvaluatingSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#005baa] bg-slate-50/60"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectAllEvaluatingUnits(true)}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 rounded border border-blue-200 shrink-0"
                  >
                    Chọn Tất Cả
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAllEvaluatingUnits(false)}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded border border-slate-200 shrink-0"
                  >
                    Bỏ Chọn
                  </button>
                </div>
              </div>

              {/* Unit list with prominent checkboxes */}
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1 mt-3 flex-1">
                {filteredEvaluatingUnits.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Không tìm thấy đơn vị nào phù hợp
                  </div>
                ) : (
                  filteredEvaluatingUnits.map((u) => {
                    const isChecked = campaignEvaluatingUnitIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => handleToggleEvaluatingUnit(u.id)}
                        className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                          isChecked
                            ? 'border-blue-400 bg-blue-50/70 text-slate-900 shadow-2xs font-semibold ring-1 ring-blue-300'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleEvaluatingUnit(u.id);
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-[#005baa] focus:ring-[#005baa] cursor-pointer"
                          />
                          <div>
                            <p className="font-bold text-slate-800 leading-tight">
                              {u.name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {u.code}
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          Cấp {u.level}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BƯỚC 3: LỰA CHỌN CÂU HỎI ĐÁNH GIÁ & BỘ TIÊU CHÍ (THÊM / SỬA / XÓA)          */}
      {/* ========================================================================= */}
      {activeTab === 'step3_criteria' && (
        <div className="space-y-6">
          {/* Header step 3 */}
          <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl text-xs text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-sm text-amber-900 flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-amber-700" />
                Bước 3: Lựa Chọn Câu Hỏi Đánh Giá Cho Đợt Này & Quản Lý Bộ Câu Hỏi
              </p>
              <p className="text-amber-800 mt-1">
                Đang cấu hình câu hỏi cho đợt: <strong className="text-amber-950">{currentCampaign?.name}</strong>. Bạn có thể chọn nhiều câu hỏi áp dụng cho đợt đánh giá này, hoặc thêm, sửa, xóa tiêu chí trong ngân hàng câu hỏi.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('step2_units')}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold rounded-lg flex items-center gap-1 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay Lại Bước 2</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('step4_assignment')}
                className="px-3 py-2 bg-[#005baa] hover:bg-[#004b8d] text-white font-semibold rounded-lg flex items-center gap-1 text-xs shadow-xs"
              >
                <span>Sang Bước 4: Gán Cán Bộ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quy chuẩn thang điểm & công thức */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 mb-1">
              Quy Chuẩn Thang Điểm & Công Thức Đánh Giá Phối Hợp VNPT (Thang Điểm 1 - 10)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Hệ thống áp dụng thang điểm từ <strong>1 đến 10</strong> theo quy định VNPT. Điểm đánh giá phối hợp là <strong>điểm trung bình cộng</strong> của các câu hỏi được lựa chọn trong đợt này.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="p-3.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs">
                <span className="font-bold text-amber-900 block mb-1">
                  1. Chấm Điểm Thấp (Từ 6 điểm trở xuống &le; 6):
                </span>
                <p className="text-amber-800 leading-relaxed">
                  Cán bộ đánh giá <strong>bắt buộc phải nhập lý do</strong> chấm điểm thấp với độ dài tối thiểu từ <strong>50 ký tự trở lên</strong> thì hệ thống mới cho phép lưu kết quả.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-xs">
                <span className="font-bold text-emerald-900 block mb-1">
                  2. Chấm Điểm Cao (Từ 7 điểm trở lên &ge; 7):
                </span>
                <p className="text-emerald-800 leading-relaxed">
                  Không bắt buộc nhập lý do; cán bộ có thể đóng góp ý kiến xây dựng thêm hoặc để trống theo ý muốn.
                </p>
              </div>
            </div>
          </div>

          {/* Toolbar: Thêm câu hỏi mới & chọn câu hỏi cho đợt */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[#005baa]" />
                  Danh Sách Câu Hỏi Đánh Giá ({criteria.length} Câu Hỏi Trong Ngân Hàng)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đã tích chọn <strong className="text-[#005baa]">{activeSelectedCriterionIds.length}</strong> / {criteria.length} câu hỏi áp dụng cho đợt "{currentCampaign?.name}"
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAllCriteriaForCampaign(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#005baa] bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200"
                >
                  Chọn Tất Cả Cho Đợt Này
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAllCriteriaForCampaign(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 rounded-lg border border-slate-200"
                >
                  Bỏ Chọn Hết
                </button>
                <button
                  type="button"
                  onClick={openCreateCriterionModal}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#005baa] hover:bg-[#004b8d] rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Câu Hỏi Mới</span>
                </button>
              </div>
            </div>

            {/* Criteria List */}
            <div className="divide-y divide-slate-100">
              {filteredCriteria.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Chưa có câu hỏi nào trong hệ thống. Bấm "+ Thêm Câu Hỏi Mới" ở trên để tạo câu hỏi!
                </div>
              ) : (
                filteredCriteria.map((c, index) => {
                  const isCheckedForCampaign = activeSelectedCriterionIds.includes(c.id);

                  return (
                    <div
                      key={c.id}
                      className={`p-4 transition-colors text-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isCheckedForCampaign ? 'bg-blue-50/30' : 'bg-white hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        {/* Checkbox áp dụng cho đợt hiện hành */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCriterionForCampaign(c.id);
                          }}
                          className="pt-0.5 cursor-pointer"
                          title={
                            isCheckedForCampaign
                              ? 'Bỏ chọn câu hỏi này khỏi đợt đánh giá'
                              : 'Chọn câu hỏi này áp dụng cho đợt đánh giá'
                          }
                        >
                          <input
                            type="checkbox"
                            checked={isCheckedForCampaign}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleCriterionForCampaign(c.id);
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-[#005baa] focus:ring-[#005baa] cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-[#005baa] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                              {c.code}
                            </span>
                            <h5 className="font-bold text-slate-900 text-sm">
                              {index + 1}. {c.name}
                            </h5>
                            {isCheckedForCampaign ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Áp dụng cho đợt này
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                                Chưa áp dụng
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 leading-relaxed">{c.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                        <div className="text-right">
                          <p className="text-[11px] text-slate-400">Thang điểm</p>
                          <p className="font-bold text-[#005baa]">
                            {c.minScore || 1} &ndash; {c.maxScore || 10} điểm
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-slate-400">Trọng số</p>
                          <p className="font-bold text-slate-700">{c.weight || 1}x</p>
                        </div>

                        {/* Actions: Sửa, Xóa */}
                        <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                          <button
                            type="button"
                            onClick={() => openEditCriterionModal(c)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Sửa câu hỏi này"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCriterionToDelete(c)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Xóa câu hỏi này khỏi ngân hàng"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BƯỚC 4: GÁN CÁN BỘ ĐÁNH GIÁ (KÉO THẢ) & BẢNG ĐIỀU KHIỂN TIẾN ĐỘ            */}
      {/* ========================================================================= */}
      {activeTab === 'step4_assignment' && (
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
                Còn lại {Math.max(0, totalAssignedUsers - completedCount)} cán bộ chưa gửi đánh giá
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

          {/* Kéo thả 2 cửa sổ phân quyền cán bộ */}
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
              <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-600" />
                    Danh Sách Cán Bộ Khả Dụng ({leftWindowUsers.length})
                  </h3>
                  <span className="text-[11px] text-slate-500">Chưa được gán</span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={sourceUnitFilter}
                    onChange={(e) => setSourceUnitFilter(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#005baa]"
                  >
                    <option value="ALL">-- Tất cả đơn vị ({users.length} cán bộ) --</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({users.filter((usr) => usr.unitId === u.id).length} người)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Users list */}
              <div className="p-2 space-y-1.5 overflow-y-auto max-h-[460px] min-h-[300px] flex-1">
                {leftWindowUsers.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-400 stroke-1" />
                    <p className="font-medium text-slate-600">Đã gán hết cán bộ của đơn vị này</p>
                    <p className="text-[11px] mt-0.5">Hoặc đơn vị chưa có cán bộ khai báo</p>
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
                            src={
                              u.avatarUrl ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                            }
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

                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono shrink-0">
                          {u.username}
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
                  {selectedLeftUserIds.length === leftWindowUsers.length
                    ? 'Bỏ chọn tất cả'
                    : 'Chọn tất cả'}
                </button>
              </div>
            </div>

            {/* CỘT GIỮA: NÚT ĐIỀU HƯỚNG GÁN / HỦY GÁN */}
            <div className="lg:col-span-2 flex flex-row lg:flex-col items-center justify-center gap-2 p-2">
              <button
                type="button"
                onClick={() => assignUsers(selectedLeftUserIds)}
                disabled={selectedLeftUserIds.length === 0}
                className="flex-1 lg:flex-initial w-full px-3 py-2 bg-[#005baa] hover:bg-[#004b8d] disabled:opacity-40 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all"
                title="Gán cán bộ đã chọn"
              >
                <span>Gán</span>
                <ArrowRight className="w-4 h-4 hidden lg:inline" />
              </button>

              <button
                type="button"
                onClick={() => unassignUsers(selectedRightUserIds)}
                disabled={selectedRightUserIds.length === 0}
                className="flex-1 lg:flex-initial w-full px-3 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-40 text-slate-700 text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all"
                title="Hủy gán cán bộ đã chọn"
              >
                <ArrowLeft className="w-4 h-4 hidden lg:inline" />
                <span>Hủy</span>
              </button>
            </div>

            {/* CỬA SỔ BÊN PHẢI: CÁN BỘ ĐÃ GÁN CHO ĐỢT ĐÁNH GIÁ NÀY */}
            <div
              className={`lg:col-span-5 bg-white rounded-xl border transition-all flex flex-col overflow-hidden shadow-xs ${
                isDraggingOverRight ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOverRight(true);
              }}
              onDragLeave={() => setIsDraggingOverRight(false)}
              onDrop={handleDropOnRight}
            >
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Cán Bộ Được Gán Cho Đợt Này ({rightWindowUsers.length})
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Được quyền chấm điểm phối hợp
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {rightWindowUsers.length} người
                </span>
              </div>

              {/* Users list */}
              <div className="p-2 space-y-1.5 overflow-y-auto max-h-[460px] min-h-[300px] flex-1">
                {rightWindowUsers.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 text-xs">
                    <Users className="w-8 h-8 mb-2 text-slate-300 stroke-1" />
                    <p className="font-medium text-slate-600">Chưa có cán bộ nào được gán</p>
                    <p className="text-[11px] mt-0.5">Kéo thả cán bộ từ bên trái sang đây</p>
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
                            src={
                              u.avatarUrl ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                            }
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
                  {selectedRightUserIds.length === rightWindowUsers.length
                    ? 'Bỏ chọn tất cả'
                    : 'Chọn tất cả'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TẠO MỚI / CHỈNH SỬA ĐỢT ĐÁNH GIÁ (BƯỚC 1)                        */}
      {/* ========================================================================= */}
      {isCreateCampModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="bg-[#005baa] px-5 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <CalendarCheck className="w-4 h-4" />
                {editingCampaign
                  ? `Chỉnh Sửa Đợt Đánh Giá: ${editingCampaign.code}`
                  : 'Khởi Tạo Đợt Đánh Giá Mới (Bước 1)'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateCampModalOpen(false)}
                className="text-white/80 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mã Đợt Đánh Giá *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: DG-Q2-2026, DG-T05-2026"
                  value={campForm.code}
                  onChange={(e) =>
                    setCampForm({ ...campForm, code: e.target.value.toUpperCase() })
                  }
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
                  onChange={(e) =>
                    setCampForm({ ...campForm, name: e.target.value })
                  }
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
                    onChange={(e) =>
                      setCampForm({
                        ...campForm,
                        periodType: e.target.value as PeriodType,
                      })
                    }
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
                    placeholder="Q2-2026 hoặc 2026-05"
                    value={campForm.periodValue}
                    onChange={(e) =>
                      setCampForm({ ...campForm, periodValue: e.target.value })
                    }
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
                    onChange={(e) =>
                      setCampForm({ ...campForm, startDate: e.target.value })
                    }
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
                    onChange={(e) =>
                      setCampForm({ ...campForm, endDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mô Tả & Hướng Dẫn
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú về đợt đánh giá, mục đích, yêu cầu..."
                  value={campForm.description}
                  onChange={(e) =>
                    setCampForm({ ...campForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateCampModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#005baa] hover:bg-[#004b8d] text-white rounded-lg font-semibold shadow-xs"
                >
                  {editingCampaign ? 'Lưu Thông Tin (D1)' : 'Tạo Đợt & Tiếp Tục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: THÊM / SỬA CÂU HỎI & TIÊU CHÍ (BƯỚC 3)                           */}
      {/* ========================================================================= */}
      {isCriterionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="bg-[#005baa] px-5 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <FileCheck2 className="w-4 h-4" />
                {editingCriterion
                  ? `Sửa Câu Hỏi Đánh Giá: ${editingCriterion.code}`
                  : 'Thêm Mới Câu Hỏi / Tiêu Chí Đánh Giá'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCriterionModalOpen(false)}
                className="text-white/80 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCriterionSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mã Tiêu Chí *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="TC01"
                    value={criterionForm.code}
                    onChange={(e) =>
                      setCriterionForm({
                        ...criterionForm,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa] font-mono"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Trọng Số (Weight)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5.0"
                    required
                    value={criterionForm.weight}
                    onChange={(e) =>
                      setCriterionForm({
                        ...criterionForm,
                        weight: parseFloat(e.target.value) || 1.0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên Câu Hỏi / Nội Dung Tiêu Chí Đánh Giá *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tốc độ phản hồi và thời gian xử lý yêu cầu phối hợp"
                  value={criterionForm.name}
                  onChange={(e) =>
                    setCriterionForm({ ...criterionForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mô Tả & Hướng Dẫn Chấm Điểm
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả cụ thể căn cứ để chấm điểm, cách tính điểm, yêu cầu tài liệu minh chứng..."
                  value={criterionForm.description}
                  onChange={(e) =>
                    setCriterionForm({
                      ...criterionForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Thang Điểm Tối Thiểu
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={criterionForm.minScore}
                    onChange={(e) =>
                      setCriterionForm({
                        ...criterionForm,
                        minScore: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Thang Điểm Tối Đa
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={criterionForm.maxScore}
                    onChange={(e) =>
                      setCriterionForm({
                        ...criterionForm,
                        maxScore: parseInt(e.target.value) || 10,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCriterionModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#005baa] hover:bg-[#004b8d] text-white rounded-lg font-semibold shadow-xs"
                >
                  {editingCriterion ? 'Cập Nhật Câu Hỏi' : 'Thêm Vào Ngân Hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: XÁC NHẬN XÓA CÂU HỎI (BƯỚC 3)                                    */}
      {/* ========================================================================= */}
      {criterionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 p-5 text-xs space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Xóa Câu Hỏi Này?</h4>
                <p className="text-slate-500 text-[11px]">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa câu hỏi{' '}
              <strong className="text-slate-900">
                "{criterionToDelete.code} - {criterionToDelete.name}"
              </strong>{' '}
              khỏi CSDL D1? Câu hỏi sẽ bị loại bỏ khỏi tất cả các đợt đánh giá chưa nộp.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCriterionToDelete(null)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDeleteCriterion}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: XÁC NHẬN XÓA ĐỢT ĐÁNH GIÁ (BƯỚC 1)                               */}
      {/* ========================================================================= */}
      {campaignToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 p-5 text-xs space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Xóa Đợt Đánh Giá Này?</h4>
                <p className="text-slate-500 text-[11px]">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa đợt đánh giá{' '}
              <strong className="text-slate-900">
                "{campaignToDelete.code} - {campaignToDelete.name}"
              </strong>{' '}
              khỏi CSDL D1? Tất cả cấu hình đơn vị, câu hỏi và kết quả đánh giá thuộc đợt này sẽ bị xóa bỏ.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCampaignToDelete(null)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDeleteCamp}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
