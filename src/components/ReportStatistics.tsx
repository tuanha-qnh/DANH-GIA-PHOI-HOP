/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart3,
  Building2,
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  TrendingUp,
  Download,
} from 'lucide-react';

export const ReportStatistics: React.FC = () => {
  const { campaigns, units, users, criteria, evaluations, targetUnits } = useApp();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    campaigns[0]?.id || ''
  );
  const [reportType, setReportType] = useState<'summary' | 'detail'>('summary');
  const [filterTargetUnitId, setFilterTargetUnitId] = useState<string>('ALL');
  const [filterCriterionId, setFilterCriterionId] = useState<string>('ALL');

  const currentCampaign = campaigns.find((c) => c.id === selectedCampaignId) || campaigns[0];

  // Filter evaluations for current campaign
  const campaignEvals = evaluations.filter(
    (e) => e.campaignId === currentCampaign?.id && e.status === 'SUBMITTED'
  );

  // Chỉ lấy các đơn vị được tham gia đánh giá trong đợt này
  const campaignTargetUnitIds = targetUnits
    .filter((t) => t.campaignId === currentCampaign?.id)
    .map((t) => t.unitId);

  const participatingTargetUnits = units.filter((u) => {
    if (campaignTargetUnitIds.length > 0) {
      return campaignTargetUnitIds.includes(u.id);
    }
    // Nếu đợt chưa cấu hình danh sách đơn vị, chỉ hiển thị đơn vị đã có phiếu đánh giá thực tế
    return campaignEvals.some((e) => e.targetUnitId === u.id);
  });

  // =========================================================================
  // SUMMARY CALCULATIONS (Báo cáo tổng hợp theo từng đơn vị được tham gia)
  // =========================================================================
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
          evaluatorsByUnit: {},
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
  // DETAILED CALCULATIONS (Báo cáo chi tiết theo từng chỉ tiêu)
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

  // Export to CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';

    if (reportType === 'summary') {
      csvContent += 'STT,Đơn vị được đánh giá,Mã đơn vị,Số lượt đánh giá,Điểm trung bình,Điểm cao nhất,Điểm thấp nhất,Xếp loại\n';
      summaryByTargetUnit.forEach((item, idx) => {
        const rank = item.avgScore >= 8.5 ? 'Xuất sắc' : item.avgScore >= 7.0 ? 'Tốt' : 'Trung bình';
        csvContent += `${idx + 1},"${item.unit.name}",${item.unit.code},${item.evalCount},${item.avgScore},${item.maxScore},${item.minScore},${rank}\n`;
      });
    } else {
      csvContent += 'STT,Đơn vị được đánh giá,Đơn vị đánh giá,Cán bộ đánh giá,Mã tiêu chí,Tiêu chí,Điểm,Ý kiến / Lý do chấm điểm thấp\n';
      detailedRows.forEach((row, idx) => {
        csvContent += `${idx + 1},"${row.targetUnitName}","${row.evaluatorUnitName}","${row.evaluatorName}",${row.criterionCode},"${row.criterionName}",${row.score},"${(row.reason || '').replace(/"/g, '""')}"\n`;
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
      {/* Header bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#005baa]" />
            Báo Cáo Thống Kê Điểm Phối Hợp Đơn Vị
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tra cứu kết quả tổng hợp xếp hạng và chi tiết từng chỉ tiêu phối hợp giữa các đơn vị VNPT
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
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel / CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-colors"
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

      {/* Tab Selectors (Tổng hợp vs Chi tiết) */}
      <div className="flex border-b border-slate-200 gap-2 print:hidden">
        <button
          type="button"
          onClick={() => setReportType('summary')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 ${
            reportType === 'summary'
              ? 'border-[#005baa] text-[#005baa]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Báo Cáo Tổng Hợp Điểm Theo Từng Đơn Vị
        </button>
        <button
          type="button"
          onClick={() => setReportType('detail')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 ${
            reportType === 'detail'
              ? 'border-[#005baa] text-[#005baa]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Báo Cáo Chi Tiết Từng Chỉ Tiêu & Ý Kiến Chấm Điểm Thấp
        </button>
      </div>

      {/* ========================================================================= */}
      {/* REPORT TYPE 1: BÁO CÁO TỔNG HỢP (SUMMARY)                                 */}
      {/* ========================================================================= */}
      {reportType === 'summary' && (
        <div className="space-y-6">
          {/* Summary Ranking Cards */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                Bảng Tổng Hợp & Xếp Hạng Điểm Phối Hợp ({currentCampaign?.name})
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
      {/* REPORT TYPE 2: BÁO CÁO CHI TIẾT TỪNG CHỈ TIÊU (DETAIL)                    */}
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detailedRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Chưa có dữ liệu chi tiết nào phù hợp với bộ lọc
                      </td>
                    </tr>
                  ) : (
                    detailedRows.map((row, idx) => {
                      const isLow = row.score <= 6;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {row.targetUnitName}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {row.evaluatorUnitName}
                          </td>
                          <td className="py-3 px-4 text-slate-700">
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
