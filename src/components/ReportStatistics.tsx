/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart3,
  Building2,
  Printer,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Users,
  X,
  FileSpreadsheet,
  Check,
  Clock,
} from 'lucide-react';

export const ReportStatistics: React.FC = () => {
  const {
    campaigns,
    units,
    users,
    criteria,
    evaluations,
    targetUnits,
    evaluatingUnits,
    evaluators,
    deleteEvaluation,
  } = useApp();

  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    campaigns[0]?.id || ''
  );
  const [reportType, setReportType] = useState<'summary' | 'evaluating_summary' | 'detail'>('summary');
  const [filterTargetUnitId, setFilterTargetUnitId] = useState<string>('ALL');
  const [filterCriterionId, setFilterCriterionId] = useState<string>('ALL');

  // Modal xác nhận xóa phiếu đánh giá
  const [evalToDelete, setEvalToDelete] = useState<{
    evalId: string;
    evaluatorName: string;
    evaluatorUnitName: string;
    targetUnitName: string;
    criterionName: string;
    score: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ message, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const currentCampaign = campaigns.find((c) => c.id === selectedCampaignId) || campaigns[0];

  // Danh sách phiếu đánh giá đã nộp trong đợt này
  const campaignEvals = evaluations.filter(
    (e) => e.campaignId === currentCampaign?.id && e.status === 'SUBMITTED'
  );

  // =========================================================================
  // 1. ĐƠN VỊ ĐƯỢC THAM GIA ĐÁNH GIÁ (TARGET UNITS)
  // =========================================================================
  const campaignTargetUnitIds = targetUnits
    .filter((t) => t.campaignId === currentCampaign?.id)
    .map((t) => t.unitId);

  const participatingTargetUnits = units.filter((u) => {
    if (campaignTargetUnitIds.length > 0) {
      return campaignTargetUnitIds.includes(u.id);
    }
    return campaignEvals.some((e) => e.targetUnitId === u.id);
  });

  const summaryByTargetUnit = participatingTargetUnits
    .map((unit) => {
      const receivedEvals = campaignEvals.filter((e) => e.targetUnitId === unit.id);
      const evalCount = receivedEvals.length;

      if (evalCount === 0) {
        return {
          unit,
          evalCount: 0,
          avgScore: 0,
          maxScore: 0,
          minScore: 0,
        };
      }

      const scores = receivedEvals.map((e) => e.averageScore);
      const avgScore = Number((scores.reduce((a, b) => a + b, 0) / evalCount).toFixed(2));
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);

      return {
        unit,
        evalCount,
        avgScore,
        maxScore,
        minScore,
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);

  // =========================================================================
  // 2. ĐƠN VỊ THỰC HIỆN ĐÁNH GIÁ (EVALUATING UNITS SUMMARY)
  // =========================================================================
  const campaignEvaluatingUnitIds = evaluatingUnits
    .filter((e) => e.campaignId === currentCampaign?.id)
    .map((e) => e.unitId);

  const participatingEvaluatingUnits = units.filter((u) => {
    if (campaignEvaluatingUnitIds.length > 0) {
      return campaignEvaluatingUnitIds.includes(u.id);
    }
    return campaignEvals.some((e) => e.evaluatorUnitId === u.id);
  });

  const totalTargetsExpected = participatingTargetUnits.length;

  const summaryByEvaluatingUnit = participatingEvaluatingUnits
    .map((unit) => {
      const sentEvals = campaignEvals.filter((e) => e.evaluatorUnitId === unit.id);
      const evalCount = sentEvals.length;

      const unitEvaluators = evaluators.filter(
        (ev) => ev.campaignId === currentCampaign?.id && ev.unitId === unit.id
      );
      const assignedCount = unitEvaluators.length;

      const uniqueTargets = new Set(sentEvals.map((e) => e.targetUnitId)).size;

      if (evalCount === 0) {
        return {
          unit,
          assignedCount,
          evalCount: 0,
          uniqueTargets: 0,
          completionRate: 0,
          avgGivenScore: 0,
          maxGivenScore: 0,
          minGivenScore: 0,
        };
      }

      const scores = sentEvals.map((e) => e.averageScore);
      const avgGivenScore = Number((scores.reduce((a, b) => a + b, 0) / evalCount).toFixed(2));
      const maxGivenScore = Math.max(...scores);
      const minGivenScore = Math.min(...scores);
      const completionRate = totalTargetsExpected > 0
        ? Math.min(100, Math.round((uniqueTargets / totalTargetsExpected) * 100))
        : 100;

      return {
        unit,
        assignedCount,
        evalCount,
        uniqueTargets,
        completionRate,
        avgGivenScore,
        maxGivenScore,
        minGivenScore,
      };
    })
    .sort((a, b) => b.completionRate - a.completionRate || b.evalCount - a.evalCount);

  // =========================================================================
  // 3. CHI TIẾT TỪNG CHỈ TIÊU (DETAILED CALCULATIONS)
  // =========================================================================
  interface DetailRow {
    evalId: string;
    targetUnitName: string;
    evaluatorName: string;
    evaluatorUnitName: string;
    criterionCode: string;
    criterionName: string;
    score: number;
    reason?: string;
    submittedAt?: string;
  }

  const detailedRows: DetailRow[] = [];

  campaignEvals.forEach((ev) => {
    const targetUnit = units.find((u) => u.id === ev.targetUnitId);
    const evaluator = users.find((u) => u.id === ev.evaluatorId);
    const evalUnit = units.find((u) => u.id === ev.evaluatorUnitId);

    if (filterTargetUnitId !== 'ALL' && ev.targetUnitId !== filterTargetUnitId) {
      return;
    }

    criteria.forEach((crit) => {
      if (filterCriterionId !== 'ALL' && crit.id !== filterCriterionId) {
        return;
      }

      const scoreItem = ev.scores[crit.id];
      if (scoreItem) {
        detailedRows.push({
          evalId: ev.id,
          targetUnitName: targetUnit?.name || 'Đơn vị',
          evaluatorName: evaluator?.fullName || 'Cán bộ',
          evaluatorUnitName: evalUnit?.name || 'Đơn vị đánh giá',
          criterionCode: crit.code,
          criterionName: crit.name,
          score: scoreItem.score,
          reason: scoreItem.lowScoreReason,
          submittedAt: ev.submittedAt,
        });
      }
    });
  });

  // Xóa đánh giá chi tiết
  const handleConfirmDeleteEvaluation = async () => {
    if (!evalToDelete) return;
    setIsDeleting(true);
    try {
      await deleteEvaluation(evalToDelete.evalId);
      showToast(
        `Đã xóa thành công phiếu đánh giá của "${evalToDelete.evaluatorName}" cho "${evalToDelete.targetUnitName}"!`
      );
      setEvalToDelete(null);
    } catch {
      showToast('Lỗi khi xóa phiếu đánh giá trên hệ thống', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';

    if (reportType === 'summary') {
      csvContent += 'STT,Đơn vị được đánh giá,Mã đơn vị,Số lượt đánh giá,Điểm trung bình,Điểm cao nhất,Điểm thấp nhất,Xếp loại\n';
      summaryByTargetUnit.forEach((item, idx) => {
        const rank = item.avgScore >= 8.5 ? 'Xuất sắc' : item.avgScore >= 7.0 ? 'Tốt' : 'Trung bình';
        csvContent += `${idx + 1},"${item.unit.name}",${item.unit.code},${item.evalCount},${item.avgScore},${item.maxScore},${item.minScore},${rank}\n`;
      });
    } else if (reportType === 'evaluating_summary') {
      csvContent += 'STT,Đơn vị thực hiện đánh giá,Mã đơn vị,Số cán bộ phân công,Số phiếu đã gửi,Số đơn vị đã đánh giá,Tổng đơn vị cần đánh giá,Tiến độ hoàn thành (%),Điểm TB đã chấm,Điểm cao nhất,Điểm thấp nhất,Trạng thái\n';
      summaryByEvaluatingUnit.forEach((item, idx) => {
        const status =
          item.completionRate === 100
            ? 'Đã hoàn thành'
            : item.evalCount > 0
            ? 'Đang thực hiện'
            : 'Chưa đánh giá';
        csvContent += `${idx + 1},"${item.unit.name}",${item.unit.code},${item.assignedCount},${item.evalCount},${item.uniqueTargets},${totalTargetsExpected},${item.completionRate}%,${item.avgGivenScore},${item.maxGivenScore},${item.minGivenScore},"${status}"\n`;
      });
    } else {
      csvContent += 'STT,Đơn vị được đánh giá,Đơn vị đánh giá,Cán bộ đánh giá,Mã tiêu chí,Tiêu chí,Điểm,Ý kiến / Lý do chấm điểm thấp,Thời gian gửi\n';
      detailedRows.forEach((row, idx) => {
        csvContent += `${idx + 1},"${row.targetUnitName}","${row.evaluatorUnitName}","${row.evaluatorName}",${row.criterionCode},"${row.criterionName}",${row.score},"${(row.reason || '').replace(/"/g, '""')}","${row.submittedAt || ''}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `BaoCao_DanhGia_VNPT_${reportType}_${currentCampaign?.periodValue || '2026'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-lg border text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toastMsg.message}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#005baa]" />
            Báo Cáo Thống Kê Điểm Phối Hợp Đơn Vị
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tra cứu kết quả tổng hợp xếp hạng theo đơn vị được đánh giá, đơn vị thực hiện đánh giá và chi tiết từng chỉ tiêu
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Campaign Selector */}
          <select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            className="text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#005baa]"
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel / CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In Báo Cáo</span>
          </button>
        </div>
      </div>

      {/* Official VNPT Print Header (Visible in print mode) */}
      <div className="hidden print:block text-center border-b border-slate-300 pb-4 mb-6">
        <p className="text-xs font-semibold uppercase text-slate-600">TẬP ĐOÀN BƯU CHÍNH VIỄN THÔNG VIỆT NAM</p>
        <p className="text-xs font-bold uppercase text-[#005baa]">VNPT TỈNH / THÀNH PHỐ</p>
        <h2 className="text-lg font-bold text-slate-900 mt-4">
          BÁO CÁO KẾT QUẢ ĐÁNH GIÁ CÔNG TÁC PHỐI HỢP ĐƠN VỊ
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Đợt đánh giá: {currentCampaign?.name} ({currentCampaign?.periodValue})
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          Ngày xuất báo cáo: {new Date().toLocaleDateString('vi-VN')}
        </p>
      </div>

      {/* 3 Tab Selectors */}
      <div className="flex border-b border-slate-200 gap-2 print:hidden overflow-x-auto">
        <button
          type="button"
          onClick={() => setReportType('summary')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            reportType === 'summary'
              ? 'border-[#005baa] text-[#005baa]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          1. Báo Cáo Tổng Hợp Theo Đơn Vị Được Đánh Giá
        </button>
        <button
          type="button"
          onClick={() => setReportType('evaluating_summary')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            reportType === 'evaluating_summary'
              ? 'border-[#005baa] text-[#005baa]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          2. Báo Cáo Tổng Hợp Theo Đơn Vị Thực Hiện Đánh Giá
        </button>
        <button
          type="button"
          onClick={() => setReportType('detail')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            reportType === 'detail'
              ? 'border-[#005baa] text-[#005baa]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          3. Báo Cáo Chi Tiết Từng Chỉ Tiêu & Ý Kiến Chấm Điểm Thấp
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BÁO CÁO TỔNG HỢP THEO ĐƠN VỊ ĐƯỢC ĐÁNH GIÁ (SUMMARY)                */}
      {/* ========================================================================= */}
      {reportType === 'summary' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                Bảng Tổng Hợp & Xếp Hạng Điểm Nhận Được ({currentCampaign?.name})
              </h3>
              <span className="text-xs text-slate-500">
                Tổng số phiếu đã gửi: <strong>{campaignEvals.length}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 text-center w-14">Hạng</th>
                    <th className="py-3 px-4">Đơn Vị Được Đánh Giá</th>
                    <th className="py-3 px-4">Mã Đơn Vị</th>
                    <th className="py-3 px-4 text-center">Số Lượt Đánh Giá</th>
                    <th className="py-3 px-4 text-center">Điểm Trung Bình</th>
                    <th className="py-3 px-4 text-center">Cao Nhất</th>
                    <th className="py-3 px-4 text-center">Thấp Nhất</th>
                    <th className="py-3 px-4">Xếp Loại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaryByTargetUnit.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Chưa có đơn vị nào được chọn tham gia đánh giá trong đợt này
                      </td>
                    </tr>
                  ) : (
                    summaryByTargetUnit.map((item, index) => {
                      const rank =
                        item.avgScore >= 8.5
                          ? { label: 'Xuất sắc', color: 'text-emerald-700 font-bold' }
                          : item.avgScore >= 7.0
                          ? { label: 'Tốt', color: 'text-blue-700 font-bold' }
                          : item.avgScore > 0
                          ? { label: 'Cần cải tiến', color: 'text-amber-700 font-bold' }
                          : { label: 'Chưa có điểm', color: 'text-slate-400' };

                      return (
                        <tr key={item.unit.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-center font-bold">
                            {index === 0 && item.avgScore > 0 ? (
                              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 inline-flex items-center justify-center font-extrabold text-[11px]">
                                1
                              </span>
                            ) : (
                              <span className="text-slate-500">{index + 1}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {item.unit.name}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-[#005baa]">
                            {item.unit.code}
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-slate-600">
                            {item.evalCount} lượt
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-sm font-extrabold text-[#005baa]">
                              {item.avgScore > 0 ? item.avgScore : '--'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-emerald-600">
                            {item.maxScore > 0 ? item.maxScore : '--'}
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-amber-600">
                            {item.minScore > 0 ? item.minScore : '--'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={rank.color}>{rank.label}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BÁO CÁO TỔNG HỢP THEO ĐƠN VỊ THỰC HIỆN ĐÁNH GIÁ                     */}
      {/* ========================================================================= */}
      {reportType === 'evaluating_summary' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Đơn Vị Thực Hiện ĐG</span>
              <p className="text-xl font-black text-slate-900 mt-1">{summaryByEvaluatingUnit.length}</p>
              <span className="text-[11px] text-slate-400">Tham gia đánh giá phối hợp</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Tổng Phiếu Đã Nộp</span>
              <p className="text-xl font-black text-[#005baa] mt-1">{campaignEvals.length}</p>
              <span className="text-[11px] text-blue-600">Phiếu đánh giá đã hoàn thành</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Tổng Đơn Vị Cần Chấm</span>
              <p className="text-xl font-black text-purple-700 mt-1">{totalTargetsExpected}</p>
              <span className="text-[11px] text-slate-400">Mục tiêu mỗi đơn vị</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Hoàn Thành 100%</span>
              <p className="text-xl font-black text-emerald-600 mt-1">
                {summaryByEvaluatingUnit.filter((u) => u.completionRate >= 100).length} / {summaryByEvaluatingUnit.length}
              </p>
              <span className="text-[11px] text-emerald-700">Đơn vị đã chấm đủ</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                Bảng Tổng Hợp Tình Hình & Mức Điểm Do Từng Đơn Vị Chấm ({currentCampaign?.name})
              </h3>
              <span className="text-xs text-slate-500">
                Hiển thị {summaryByEvaluatingUnit.length} đơn vị thực hiện đánh giá
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 text-center w-12">STT</th>
                    <th className="py-3 px-4">Đơn Vị Thực Hiện Đánh Giá</th>
                    <th className="py-3 px-4">Mã Đơn Vị</th>
                    <th className="py-3 px-4 text-center">Cán Bộ Phân Công</th>
                    <th className="py-3 px-4 text-center">Phiếu Đã Nộp</th>
                    <th className="py-3 px-4 text-center">Đã Đánh Giá</th>
                    <th className="py-3 px-4 text-center w-36">Tiến Độ</th>
                    <th className="py-3 px-4 text-center">Điểm TB Đã Chấm</th>
                    <th className="py-3 px-4 text-center">Cao Nhất</th>
                    <th className="py-3 px-4 text-center">Thấp Nhất</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaryByEvaluatingUnit.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        Chưa có đơn vị nào được cấu hình thực hiện đánh giá trong đợt này
                      </td>
                    </tr>
                  ) : (
                    summaryByEvaluatingUnit.map((item, index) => {
                      const isComplete = item.completionRate >= 100;
                      const hasStarted = item.evalCount > 0;

                      return (
                        <tr key={item.unit.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-center font-bold text-slate-500">
                            {index + 1}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {item.unit.name}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-[#005baa]">
                            {item.unit.code}
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-slate-600">
                            {item.assignedCount} cán bộ
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-700">
                            {item.evalCount} phiếu
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-slate-600">
                            {item.uniqueTargets} / {totalTargetsExpected} đ/vị
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="w-full bg-slate-200 rounded-full h-2 mb-1 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  isComplete
                                    ? 'bg-emerald-500'
                                    : hasStarted
                                    ? 'bg-[#005baa]'
                                    : 'bg-slate-300'
                                }`}
                                style={{ width: `${item.completionRate}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-600">
                              {item.completionRate}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-sm font-extrabold text-[#005baa]">
                              {item.avgGivenScore > 0 ? item.avgGivenScore : '--'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-emerald-600">
                            {item.maxGivenScore > 0 ? item.maxGivenScore : '--'}
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-amber-600">
                            {item.minGivenScore > 0 ? item.minGivenScore : '--'}
                          </td>
                          <td className="py-3 px-4">
                            {isComplete ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                <Check className="w-3 h-3 text-emerald-600" /> Đã hoàn thành
                              </span>
                            ) : hasStarted ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                <Clock className="w-3 h-3 text-blue-600" /> Đang đánh giá
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                                Chưa đánh giá
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BÁO CÁO CHI TIẾT TỪNG CHỈ TIÊU (DETAIL)                            */}
      {/* ========================================================================= */}
      {reportType === 'detail' && (
        <div className="space-y-4">
          {/* Filters for detail */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Đơn vị được đánh giá:</span>
              <select
                value={filterTargetUnitId}
                onChange={(e) => setFilterTargetUnitId(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#005baa]"
              >
                <option value="ALL">Tất cả {participatingTargetUnits.length} đơn vị tham gia</option>
                {participatingTargetUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Tiêu chí đánh giá:</span>
              <select
                value={filterCriterionId}
                onChange={(e) => setFilterCriterionId(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#005baa]"
              >
                <option value="ALL">Tất cả {criteria.length} tiêu chí</option>
                {criteria.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                Chi Tiết Từng Chỉ Tiêu & Ý Kiến Phản Hồi ({detailedRows.length} mục)
              </h3>
              <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-semibold">
                Điểm &le; 6 kèm lý do bắt buộc &ge; 50 ký tự
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Đơn Vị Được Đánh Giá</th>
                    <th className="py-3 px-4">Đơn Vị Đánh Giá</th>
                    <th className="py-3 px-4">Cán Bộ</th>
                    <th className="py-3 px-4">Tiêu Chí</th>
                    <th className="py-3 px-4 text-center">Điểm</th>
                    <th className="py-3 px-4">Ý Kiến / Lý Do Chấm Điểm Thấp</th>
                    <th className="py-3 px-4 text-center print:hidden">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detailedRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Chưa có dữ liệu chi tiết nào phù hợp với bộ lọc
                      </td>
                    </tr>
                  ) : (
                    detailedRows.map((row, idx) => {
                      const isLow = row.score <= 6;
                      return (
                        <tr key={`${row.evalId}-${row.criterionCode}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {row.targetUnitName}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {row.evaluatorUnitName}
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {row.evaluatorName}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-[#005baa] bg-blue-50 px-1 py-0.5 rounded border border-blue-200 mr-1.5 text-[11px]">
                              {row.criterionCode}
                            </span>
                            <span className="text-slate-600">{row.criterionName}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`font-black text-sm px-2 py-0.5 rounded ${
                                isLow
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-blue-50 text-[#005baa] border border-blue-200'
                              }`}
                            >
                              {row.score}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-md">
                            {row.reason ? (
                              <div
                                className={`p-2 rounded text-xs ${
                                  isLow
                                    ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                    : 'bg-slate-50 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {isLow && (
                                  <span className="font-bold block text-amber-800 text-[10px] uppercase mb-0.5">
                                    [Lý do điểm thấp &le; 6]:
                                  </span>
                                )}
                                <p className="leading-relaxed">{row.reason}</p>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Không có ghi chú</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center print:hidden">
                            <button
                              type="button"
                              onClick={() =>
                                setEvalToDelete({
                                  evalId: row.evalId,
                                  evaluatorName: row.evaluatorName,
                                  evaluatorUnitName: row.evaluatorUnitName,
                                  targetUnitName: row.targetUnitName,
                                  criterionName: `${row.criterionCode} - ${row.criterionName}`,
                                  score: row.score,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
                              title="Xóa phiếu đánh giá này khỏi hệ thống & CSDL D1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Xóa</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {evalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="bg-rose-600 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Xác Nhận Xóa Chi Tiết Đánh Giá
              </h3>
              <button
                type="button"
                onClick={() => setEvalToDelete(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Đồng chí có chắc chắn muốn xóa toàn bộ kết quả của phiếu đánh giá này? Dữ liệu sẽ được đồng bộ xóa ngay lập tức trên <strong>CSDL Cloudflare D1</strong>.
                </p>
              </div>

              <div className="space-y-2 text-xs text-slate-600 border border-slate-100 rounded-xl p-3 bg-slate-50">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cán bộ đánh giá:</span>
                  <span className="font-bold text-slate-800">{evalToDelete.evaluatorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Đơn vị đánh giá:</span>
                  <span className="font-semibold text-slate-700">{evalToDelete.evaluatorUnitName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Đơn vị được đánh giá:</span>
                  <span className="font-bold text-[#005baa]">{evalToDelete.targetUnitName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Đợt đánh giá:</span>
                  <span className="font-semibold text-slate-700">{currentCampaign?.name}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setEvalToDelete(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDeleteEvaluation}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Đang xóa D1...' : 'Xác Nhận Xóa'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Signature Section for Printing */}
      <div className="hidden print:grid grid-cols-2 text-center text-xs pt-12 mt-8">
        <div>
          <p className="font-bold text-slate-800">NGƯỜI LẬP BIỂU</p>
          <p className="text-[11px] text-slate-500 italic mt-1">(Ký, ghi rõ họ tên)</p>
          <div className="h-20" />
        </div>
        <div>
          <p className="font-bold text-slate-800">GIÁM ĐỐC VNPT TỈNH / THÀNH PHỐ</p>
          <p className="text-[11px] text-slate-500 italic mt-1">(Ký tên, đóng dấu)</p>
          <div className="h-20" />
        </div>
      </div>
    </div>
  );
};
