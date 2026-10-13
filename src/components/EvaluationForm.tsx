/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { EvaluationRecord, CriterionScore } from '../types';
import { getCampaignEvaluationState } from '../utils/campaignSchedule';
import {
  CheckSquare,
  Lock,
  Unlock,
  Building2,
  AlertCircle,
  CheckCircle2,
  Save,
  HelpCircle,
  FileText,
  Clock,
  Sparkles,
  Database,
  ArrowRight,
} from 'lucide-react';

export const EvaluationForm: React.FC = () => {
  const {
    currentUser,
    campaigns,
    units,
    criteria,
    campaignCriteria,
    targetUnits,
    evaluatingUnits,
    evaluators,
    evaluations,
    saveEvaluation,
  } = useApp();

  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    campaigns[0]?.id || ''
  );

  const currentCampaign = campaigns.find((c) => c.id === selectedCampaignId) || campaigns[0];
  const evalState = useMemo(
    () => getCampaignEvaluationState(currentCampaign),
    [currentCampaign]
  );

  // Selected criteria for this campaign (memoized để không re-render làm mất điểm đang chấm)
  const selectedCritIds = useMemo(() => {
    return campaignCriteria
      .filter((cc) => cc.campaignId === currentCampaign?.id)
      .map((cc) => cc.criterionId);
  }, [campaignCriteria, currentCampaign?.id]);

  const activeCriteria = useMemo(() => {
    return selectedCritIds.length > 0
      ? criteria.filter((c) => selectedCritIds.includes(c.id))
      : criteria;
  }, [selectedCritIds, criteria]);

  // Target units assigned for this campaign
  const campaignTargetUnitIds = useMemo(() => {
    return targetUnits
      .filter((t) => t.campaignId === currentCampaign?.id)
      .map((t) => t.unitId);
  }, [targetUnits, currentCampaign?.id]);

  // Units that user should evaluate: exclude own unit if desired, or all designated target units
  const targetUnitsToEvaluate = useMemo(() => {
    const list = units.filter(
      (u) => campaignTargetUnitIds.includes(u.id) && u.id !== currentUser?.unitId
    );
    return list.length > 0 ? list : units.filter((u) => campaignTargetUnitIds.includes(u.id));
  }, [units, campaignTargetUnitIds, currentUser?.unitId]);

  const [activeTargetUnitId, setActiveTargetUnitId] = useState<string>('');

  // Form scores state: key: criterionId -> { score: number, lowScoreReason?: string }
  const [currentScores, setCurrentScores] = useState<Record<string, CriterionScore>>({});
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Sync active target unit initially or when campaign changes
  useEffect(() => {
    if (targetUnitsToEvaluate.length > 0) {
      if (!activeTargetUnitId || !targetUnitsToEvaluate.some((u) => u.id === activeTargetUnitId)) {
        setActiveTargetUnitId(targetUnitsToEvaluate[0].id);
      }
    }
  }, [targetUnitsToEvaluate, activeTargetUnitId]);

  // Load existing evaluation for this campaign and target unit
  useEffect(() => {
    if (!currentUser || !currentCampaign || !activeTargetUnitId) return;

    const existing = evaluations.find(
      (e) =>
        e.campaignId === currentCampaign.id &&
        e.evaluatorId === currentUser.id &&
        e.targetUnitId === activeTargetUnitId
    );

    if (existing && existing.scores && Object.keys(existing.scores).length > 0) {
      setCurrentScores(existing.scores);
    } else {
      // Khởi tạo điểm mặc định 8 điểm
      const initial: Record<string, CriterionScore> = {};
      activeCriteria.forEach((c) => {
        initial[c.id] = { score: 8, lowScoreReason: '' };
      });
      setCurrentScores(initial);
    }
    setValidationErrors([]);
  }, [selectedCampaignId, activeTargetUnitId, currentUser?.id]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleScoreChange = (criterionId: string, score: number) => {
    if (!evalState.isOpen) return;
    setCurrentScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        score,
        // keep lowScoreReason if exists
        lowScoreReason: prev[criterionId]?.lowScoreReason || '',
      },
    }));
  };

  const handleReasonChange = (criterionId: string, text: string) => {
    if (!evalState.isOpen) return;
    setCurrentScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        lowScoreReason: text,
      },
    }));
  };

  // Compute average score for the active criteria in this campaign
  const activeCriterionIds = activeCriteria.map((c) => c.id);
  const relevantScores = Object.entries(currentScores)
    .filter(([cid]) => activeCriterionIds.includes(cid))
    .map(([, s]) => s.score);

  const averageScore =
    relevantScores.length > 0
      ? Number((relevantScores.reduce((a, b) => a + b, 0) / relevantScores.length).toFixed(2))
      : 0;

  // Validation
  const validateForm = (): boolean => {
    const errors: string[] = [];

    activeCriteria.forEach((c) => {
      const item = currentScores[c.id];
      if (!item || !item.score) {
        errors.push(`Chưa chấm điểm cho tiêu chí "${c.code} - ${c.name}"`);
      } else if (item.score <= 6) {
        const reasonLen = (item.lowScoreReason || '').trim().length;
        if (reasonLen < 50) {
          errors.push(
            `Tiêu chí "${c.code}" có điểm ${item.score} (<= 6): Bắt buộc nhập lý do chấm điểm thấp tối thiểu 50 ký tự! (Hiện tại: ${reasonLen}/50)`
          );
        }
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSaveEvaluation = async () => {
    if (!evalState.isOpen) {
      showNotification(evalState.reasonMessage || 'Đợt đánh giá đã bị khóa! Không thể cập nhật kết quả.', 'error');
      return;
    }

    if (!currentUser || !currentCampaign || !activeTargetUnitId) return;

    if (!validateForm()) {
      showNotification('Vui lòng kiểm tra lại các tiêu chí chưa đủ điều kiện lưu!', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const existing = evaluations.find(
        (e) =>
          e.campaignId === currentCampaign.id &&
          e.evaluatorId === currentUser.id &&
          e.targetUnitId === activeTargetUnitId
      );

      const evalId =
        existing?.id ||
        `eval-${currentCampaign.id}-${currentUser.id}-${activeTargetUnitId}`;

      const record: EvaluationRecord = {
        id: evalId,
        campaignId: currentCampaign.id,
        evaluatorId: currentUser.id,
        evaluatorUnitId: currentUser.unitId,
        targetUnitId: activeTargetUnitId,
        scores: currentScores,
        averageScore,
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveEvaluation(record);
      const targetUnitObj = units.find((u) => u.id === activeTargetUnitId);
      showNotification(
        `Đã lưu và đồng bộ đánh giá cho đơn vị "${targetUnitObj?.name}" lên CSDL D1 thành công!`
      );
    } catch {
      showNotification('Lỗi khi lưu đánh giá lên máy chủ D1', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const isAssignedEvaluator = evaluators.some(
    (ev) => ev.campaignId === currentCampaign?.id && ev.userId === currentUser?.id
  );

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#005baa]" />
            Đánh Giá Công Tác Phối Hợp Đơn Vị
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Chấm điểm theo thang điểm 1-10 và nhập lý do chấm điểm thấp (&ge; 50 ký tự nếu điểm &le; 6)
          </p>
        </div>

        {/* Campaign Cycle Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Chu kỳ đánh giá:</span>
          <select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            className="text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#005baa]"
          >
            {campaigns.map((c) => {
              const cState = getCampaignEvaluationState(c);
              return (
                <option key={c.id} value={c.id}>
                  {c.name} ({cState.statusLabel})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Lock / Time Schedule Warning Banner */}
      {!evalState.isOpen ? (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
            evalState.isAutoLocked
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : evalState.isManualLocked
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-sky-50 border-sky-200 text-sky-900'
          }`}
        >
          {evalState.isAutoLocked ? (
            <Clock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          ) : evalState.isManualLocked ? (
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <Clock className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          )}
          <div>
            <h4
              className={`font-bold text-sm ${
                evalState.isAutoLocked
                  ? 'text-rose-900'
                  : evalState.isManualLocked
                  ? 'text-amber-800'
                  : 'text-sky-900'
              }`}
            >
              {evalState.isAutoLocked
                ? 'ĐỢT ĐÁNH GIÁ ĐÃ HẾT HẠN - HỆ THỐNG TỰ ĐỘNG KHÓA'
                : evalState.isManualLocked
                ? 'ĐỢT ĐÁNH GIÁ ĐÃ BỊ KHÓA BỞI QUẢN TRỊ VIÊN'
                : 'CHƯA ĐẾN THỜI GIAN MỞ ĐÁNH GIÁ'}
            </h4>
            <p className="mt-1 leading-relaxed">
              {evalState.reasonMessage} Đồng chí chỉ có quyền xem lại kết quả đã đánh giá (nếu có), không được phép thêm hoặc sửa đổi điểm.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Đợt đánh giá <strong>{currentCampaign?.name}</strong> đang mở tiếp nhận.{' '}
              {currentCampaign?.endDate && (
                <span className="text-slate-600">
                  (Hạn chót: <strong>{new Date(currentCampaign.endDate).toLocaleString('vi-VN')}</strong>)
                </span>
              )}
            </span>
          </div>
          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0 text-center">
            {evalState.remainingText ? `Đang Mở · ${evalState.remainingText}` : 'Đang Mở'}
          </span>
        </div>
      )}

      {/* Evaluator Assignment Warning */}
      {!isAssignedEvaluator && currentUser?.role !== 'ADMIN' && (
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-slate-800">Tài khoản chưa được phân quyền trong đợt này</h4>
            <p className="mt-1 text-slate-500">
              Đồng chí chưa được Quản trị viên gán quyền tham gia đánh giá cho đợt {currentCampaign?.name}. Bạn có thể xem thử giao diện nhưng kết quả sẽ không được ghi nhận vào báo cáo chính thức.
            </p>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Target Units Navigation Tabs */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <p className="text-xs font-semibold text-slate-600 mb-2 px-1">
          Chọn Đơn vị cần đánh giá:
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {targetUnitsToEvaluate.map((unit) => {
            const hasSubmitted = evaluations.some(
              (e) =>
                e.campaignId === currentCampaign?.id &&
                e.evaluatorId === currentUser?.id &&
                e.targetUnitId === unit.id &&
                e.status === 'SUBMITTED'
            );
            const isActive = activeTargetUnitId === unit.id;
            return (
              <button
                key={unit.id}
                type="button"
                onClick={() => setActiveTargetUnitId(unit.id)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                  isActive
                    ? 'bg-[#005baa] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Building2 className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{unit.name}</span>
                {hasSubmitted && (
                  <span
                    className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-300' : 'bg-emerald-500'}`}
                    title="Đã lưu đánh giá"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Evaluation Sheet */}
      {activeTargetUnitId && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Header of sheet */}
          <div className="p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#005baa] uppercase tracking-wide">
                  Phiếu Đánh Giá
                </span>
                <span className="text-slate-400">/</span>
                <h3 className="font-bold text-base text-slate-900">
                  {units.find((u) => u.id === activeTargetUnitId)?.name}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Người đánh giá: <strong className="text-slate-700">{currentUser?.fullName}</strong> ({currentUser?.hrmCode}) · Đơn vị: {units.find((u) => u.id === currentUser?.unitId)?.name}
              </p>
            </div>

            {/* Average Score Badge */}
            <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Điểm Trung Bình Cộng:</span>
              <span className="text-2xl font-black text-[#005baa]">{averageScore}</span>
              <span className="text-xs text-slate-400">/ 10.0</span>
            </div>
          </div>

          {/* Validation errors summary */}
          {validationErrors.length > 0 && (
            <div className="p-4 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Vui lòng hoàn thiện các nội dung sau trước khi lưu:
              </p>
              <ul className="list-disc pl-5 space-y-0.5">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* List of Criteria */}
          <div className="p-6 space-y-6">
            {activeCriteria.map((c, index) => {
              const item = currentScores[c.id] || { score: 8, lowScoreReason: '' };
              const currentScore = item.score;
              const reason = item.lowScoreReason || '';
              const reasonLength = reason.trim().length;
              const isLowScore = currentScore <= 6;
              const isReasonValid = !isLowScore || reasonLength >= 50;

              return (
                <div
                  key={c.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isLowScore && !isReasonValid
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#005baa] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {c.code}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">
                          Tiêu chí {index + 1}: {c.name}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{c.description}</p>
                    </div>

                    {/* Score selected indicator */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                      <span className="text-xs text-slate-500">Điểm chọn:</span>
                      <span
                        className={`text-lg font-black px-2.5 py-0.5 rounded-lg border ${
                          isLowScore
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-blue-50 text-[#005baa] border-blue-200'
                        }`}
                      >
                        {currentScore}
                      </span>
                    </div>
                  </div>

                  {/* 1-10 Rating Scale Buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2 text-[11px] text-slate-400">
                      <span>1: Kém nhất / Rất không hài lòng</span>
                      <span>10: Xuất sắc / Rất hài lòng</span>
                    </div>

                    <div className="grid grid-cols-10 gap-1 sm:gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((scoreVal) => {
                        const isSelected = currentScore === scoreVal;
                        const isLowVal = scoreVal <= 6;
                        return (
                          <button
                            key={scoreVal}
                            type="button"
                            disabled={!evalState.isOpen}
                            onClick={() => handleScoreChange(c.id, scoreVal)}
                            className={`py-2 rounded-lg font-bold text-xs sm:text-sm transition-all text-center flex flex-col items-center justify-center ${
                              isSelected
                                ? isLowVal
                                  ? 'bg-amber-600 text-white shadow-md scale-105 ring-2 ring-amber-300'
                                  : 'bg-[#005baa] text-white shadow-md scale-105 ring-2 ring-blue-300'
                                : isLowVal
                                ? 'bg-amber-50/60 hover:bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#005baa] border border-slate-200'
                            } disabled:opacity-70 disabled:cursor-not-allowed`}
                          >
                            <span>{scoreVal}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Compulsory Low Score Reason (<= 6 points) */}
                  {isLowScore && (
                    <div className="mt-4 p-3.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-amber-900 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <span>Lý do chấm điểm thấp (Bắt buộc tối thiểu 50 ký tự) *</span>
                        </label>
                        <span
                          className={`font-mono text-xs font-bold ${
                            reasonLength >= 50 ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {reasonLength} / 50 ký tự {reasonLength >= 50 ? '✓ Đạt yêu cầu' : `(Cần thêm ${50 - reasonLength} ký tự)`}
                        </span>
                      </div>

                      <textarea
                        rows={3}
                        disabled={!evalState.isOpen}
                        value={reason}
                        onChange={(e) => handleReasonChange(c.id, e.target.value)}
                        placeholder="Nêu rõ nội dung, sự việc cụ thể và vướng mắc trong công tác phối hợp khiến đơn vị bị chấm điểm thấp (tối thiểu 50 ký tự)..."
                        className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 ${
                          reasonLength >= 50
                            ? 'border-emerald-300 focus:ring-emerald-500'
                            : 'border-amber-400 focus:ring-amber-500'
                        } disabled:bg-slate-100 disabled:cursor-not-allowed`}
                      />

                      {reasonLength < 50 && (
                        <p className="text-[11px] text-amber-800 mt-1">
                          * Do chấm điểm {currentScore} (&le; 6), đồng chí vui lòng nêu cụ thể lý do từ 50 ký tự trở lên để lãnh đạo xem xét và cải tiến công tác phối hợp.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Optional Notes for High Score (>= 7 points) */}
                  {!isLowScore && (
                    <div className="mt-3">
                      <input
                        type="text"
                        disabled={!evalState.isOpen}
                        value={reason}
                        onChange={(e) => handleReasonChange(c.id, e.target.value)}
                        placeholder="Ý kiến góp ý / Ghi chú bổ sung (Không bắt buộc)..."
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#005baa] text-slate-600 disabled:bg-slate-50"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Bar Footer */}
          <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Lưu ý:</span> Kết quả được đồng bộ trực tiếp lên CSDL Cloudflare D1. Bạn có thể cập nhật lại bất kỳ lúc nào trước khi đợt đánh giá bị khóa hoặc hết hạn.
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={!evalState.isOpen || isSaving}
                onClick={handleSaveEvaluation}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#005baa] hover:bg-[#004b8d] text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>
                  {!evalState.isOpen
                    ? `Đợt Đã Khóa (${evalState.statusLabel})`
                    : isSaving
                    ? 'Đang lưu D1...'
                    : 'Lưu Đánh Giá Lên CSDL D1'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
