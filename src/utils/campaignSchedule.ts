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
