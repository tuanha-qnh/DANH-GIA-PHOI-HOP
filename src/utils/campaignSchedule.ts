/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Campaign } from '../types';

export interface CampaignEvaluationState {
  isOpen: boolean;
  isAutoLocked: boolean;
  isManualLocked: boolean;
  isNotStarted: boolean;
  statusLabel: string;
  statusColor: 'green' | 'amber' | 'red' | 'slate';
  remainingText?: string;
  reasonMessage?: string;
}

/**
 * Kiểm tra trạng thái mở/khóa tự động của đợt đánh giá dựa trên thời gian bắt đầu và hạn chót
 */
export function getCampaignEvaluationState(campaign?: Campaign | null): CampaignEvaluationState {
  if (!campaign) {
    return {
      isOpen: false,
      isAutoLocked: false,
      isManualLocked: false,
      isNotStarted: false,
      statusLabel: 'Chưa chọn đợt',
      statusColor: 'slate',
      reasonMessage: 'Chưa chọn đợt đánh giá.',
    };
  }

  if (campaign.isLocked) {
    return {
      isOpen: false,
      isAutoLocked: false,
      isManualLocked: true,
      isNotStarted: false,
      statusLabel: 'Đã khóa thủ công',
      statusColor: 'red',
      reasonMessage: 'Đợt đánh giá đã bị Quản trị viên đóng/khóa thủ công.',
    };
  }

  const now = new Date();

  // Kiểm tra thời gian bắt đầu mở đánh giá
  if (campaign.startDate) {
    const startIso = campaign.startDate.includes('T')
      ? campaign.startDate
      : `${campaign.startDate}T00:00:00`;
    const startDate = new Date(startIso);
    if (!isNaN(startDate.getTime()) && now < startDate) {
      return {
        isOpen: false,
        isAutoLocked: false,
        isManualLocked: false,
        isNotStarted: true,
        statusLabel: 'Chưa đến giờ mở',
        statusColor: 'amber',
        reasonMessage: `Đợt đánh giá chưa đến thời gian mở (Thời gian mở: ${startDate.toLocaleString('vi-VN')}).`,
      };
    }
  }

  // Kiểm tra hạn chót kết thúc đánh giá (Tự động khóa khi đến hạn)
  if (campaign.endDate) {
    const endIso = campaign.endDate.includes('T')
      ? campaign.endDate
      : `${campaign.endDate}T23:59:59`;
    const endDate = new Date(endIso);
    if (!isNaN(endDate.getTime())) {
      if (now > endDate) {
        return {
          isOpen: false,
          isAutoLocked: true,
          isManualLocked: false,
          isNotStarted: false,
          statusLabel: 'Hết hạn - Tự động khóa',
          statusColor: 'red',
          reasonMessage: `Đợt đánh giá đã hết hạn lúc ${endDate.toLocaleString('vi-VN')}. Hệ thống tự động khóa không cho đánh giá nữa!`,
        };
      } else {
        const diffMs = endDate.getTime() - now.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        const remHours = diffHours % 24;
        let remaining = '';
        if (diffDays > 0) {
          remaining = `Còn ${diffDays} ngày ${remHours > 0 ? `${remHours} giờ` : ''}`;
        } else {
          const diffMins = Math.floor(diffMs / (1000 * 60));
          remaining = diffMins > 60 ? `Còn ${Math.floor(diffMins / 60)} giờ ${diffMins % 60} phút` : `Còn ${diffMins} phút`;
        }
        return {
          isOpen: true,
          isAutoLocked: false,
          isManualLocked: false,
          isNotStarted: false,
          statusLabel: 'Đang mở đánh giá',
          statusColor: 'green',
          remainingText: remaining,
          reasonMessage: `Đang mở cho phép đánh giá (Hạn chót: ${endDate.toLocaleString('vi-VN')} - ${remaining}).`,
        };
      }
    }
  }

  return {
    isOpen: true,
    isAutoLocked: false,
    isManualLocked: false,
    isNotStarted: false,
    statusLabel: 'Đang mở đánh giá',
    statusColor: 'green',
    reasonMessage: 'Đang mở cho phép đánh giá.',
  };
}

/**
 * Lựa chọn mặc định kỳ đánh giá hiện tại:
 * Theo quy chuẩn nghiệp vụ định kỳ (VD: Tháng 10/2026 thì mặc định kỳ đánh giá phối hợp là Tháng 09/2026).
 * Quy tắc ưu tiên:
 * 1. Đợt đánh giá ứng với tháng liền kề trước đó (tháng N-1 của năm hiện tại, hoặc tháng 12 của năm trước).
 *    Nếu có đợt khớp đang mở tiếp nhận (isOpen), ưu tiên chọn đợt đó.
 * 2. Đợt đánh giá ứng với quý liền kề trước đó (VD: đang ở tháng 10 thuộc Q4, quý liền kề trước là Q3).
 * 3. Đợt đánh giá đang có hiệu lực mở đánh giá (isOpen: true) có thời gian mở mới nhất.
 * 4. Đợt đánh giá có ngày tạo / ngày bắt đầu mới nhất (hoặc đợt đầu tiên).
 */
export function getDefaultEvaluationCampaign(
  campaigns: Campaign[],
  referenceDate: Date = new Date()
): Campaign | undefined {
  if (!campaigns || campaigns.length === 0) return undefined;

  const nowYear = referenceDate.getFullYear();
  const nowMonth = referenceDate.getMonth() + 1; // 1 - 12 (VD: tháng 10)

  // Tháng liền kề trước đó (VD: nếu hiện tại là tháng 10 thì tháng liền kề là 9)
  const prevMonth = nowMonth === 1 ? 12 : nowMonth - 1;
  const prevMonthYear = nowMonth === 1 ? nowYear - 1 : nowYear;
  const prevMonthStr = String(prevMonth);
  const prevMonthPadded = prevMonthStr.padStart(2, '0');

  // Quý liền kề trước đó (VD: tháng 10 thuộc Q4, quý liền kề là Q3)
  const currentQuarter = Math.ceil(nowMonth / 3);
  const prevQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
  const prevQuarterYear = currentQuarter === 1 ? nowYear - 1 : nowYear;

  // Hàm kiểm tra khớp tháng liền kề trước đó
  const isMatchMonth = (c: Campaign): boolean => {
    const pv = (c.periodValue || '').trim().toLowerCase();
    const code = (c.code || '').trim().toLowerCase();
    const name = (c.name || '').trim().toLowerCase();

    // Khớp giá trị chu kỳ periodValue
    if (
      pv === `${prevMonthYear}-${prevMonthPadded}` ||
      pv === `${prevMonthYear}-${prevMonthStr}` ||
      pv === `${prevMonthPadded}/${prevMonthYear}` ||
      pv === `${prevMonthStr}/${prevMonthYear}` ||
      pv === `t${prevMonthPadded}-${prevMonthYear}` ||
      pv === `t${prevMonthStr}-${prevMonthYear}` ||
      pv === `t${prevMonthPadded}/${prevMonthYear}` ||
      pv === `t${prevMonthStr}/${prevMonthYear}` ||
      pv === `t${prevMonthPadded}` ||
      pv === `t${prevMonthStr}`
    ) {
      return true;
    }

    // Khớp biểu thức chính quy trong tên hoặc mã đợt (VD: "Tháng 09/2026", "Tháng 9/2026", "T09-2026", "2026-09")
    const monthPatterns = [
      new RegExp(`(?:tháng|thang|t)[\\s_\\-]*0?${prevMonth}[\\s_/\\-]*${prevMonthYear}`, 'i'),
      new RegExp(`${prevMonthYear}[\\s_/\\-]*0?${prevMonth}(?:[^0-9]|$)`, 'i'),
      new RegExp(`0?${prevMonth}[\\s_/\\-]${prevMonthYear}`, 'i'),
    ];

    return monthPatterns.some((p) => p.test(name) || p.test(code) || p.test(pv));
  };

  // 1. Tìm các đợt đánh giá khớp tháng liền kề trước đó
  const monthMatched = campaigns.filter(isMatchMonth);
  if (monthMatched.length > 0) {
    // Nếu có đợt đang mở tiếp nhận đánh giá, ưu tiên đợt này
    const openMatch = monthMatched.find((c) => getCampaignEvaluationState(c).isOpen);
    if (openMatch) return openMatch;
    return monthMatched[0];
  }

  // 2. Tìm các đợt đánh giá khớp quý liền kề trước đó
  const isMatchQuarter = (c: Campaign): boolean => {
    const pv = (c.periodValue || '').trim().toLowerCase();
    const code = (c.code || '').trim().toLowerCase();
    const name = (c.name || '').trim().toLowerCase();

    if (
      pv === `q${prevQuarter}-${prevQuarterYear}` ||
      pv === `quy${prevQuarter}-${prevQuarterYear}` ||
      pv === `q${prevQuarter}/${prevQuarterYear}`
    ) {
      return true;
    }

    const quarterPatterns = [
      new RegExp(`(?:quý|quy|q)[\\s_\\-]*0?${prevQuarter}[\\s_/\\-]*${prevQuarterYear}`, 'i'),
    ];
    return quarterPatterns.some((p) => p.test(name) || p.test(code) || p.test(pv));
  };

  const quarterMatched = campaigns.filter(isMatchQuarter);
  if (quarterMatched.length > 0) {
    const openQuarterMatch = quarterMatched.find((c) => getCampaignEvaluationState(c).isOpen);
    if (openQuarterMatch) return openQuarterMatch;
    return quarterMatched[0];
  }

  // 3. Nếu không có đợt khớp tháng/quý liền kề, lấy đợt đang mở đánh giá
  const openCampaigns = campaigns.filter((c) => getCampaignEvaluationState(c).isOpen);
  if (openCampaigns.length > 0) {
    return openCampaigns[0];
  }

  // 4. Mặc định lấy đợt đầu tiên
  return campaigns[0];
}

