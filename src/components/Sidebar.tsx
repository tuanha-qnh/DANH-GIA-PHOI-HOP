/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  CheckSquare,
  BarChart3,
  Settings,
  Database,
  CalendarCheck,
  ShieldAlert,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'units'
  | 'users'
  | 'campaigns'
  | 'campaign-units'
  | 'campaign-criteria'
  | 'evaluate'
  | 'reports'
  | 'd1-config'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const { currentUser } = useApp();
  const isAdmin = currentUser?.role === 'ADMIN';
  const isReportViewer = currentUser?.role === 'REPORT_VIEWER';
  const canViewReports = isAdmin || isReportViewer || currentUser?.canViewReports;

  const adminNavItems: Array<{ id: NavTab; label: string; icon: React.ElementType; badge?: string }> = [
    { id: 'dashboard', label: 'Bảng Điều Khiển & Tiến Độ', icon: LayoutDashboard },
    { id: 'campaigns', label: '1. Tạo Đợt Đánh Giá', icon: CalendarCheck },
    { id: 'campaign-units', label: '2. Đơn Vị ĐG & Bị ĐG', icon: Building2 },
    { id: 'campaign-criteria', label: '3. Bộ Câu Hỏi & Thang Điểm', icon: CheckSquare },
    { id: 'evaluate', label: 'Thực Hiện Đánh Giá', icon: CheckSquare },
    { id: 'reports', label: 'Báo Cáo Thống Kê', icon: BarChart3 },
    { id: 'units', label: 'Khai Báo Cây Đơn Vị', icon: Building2 },
    { id: 'users', label: 'Người Dùng & Phân Quyền', icon: Users },
    { id: 'd1-config', label: 'Cấu Hình CSDL D1', icon: Database, badge: 'Online' },
    { id: 'settings', label: 'Cài Đặt Cá Nhân', icon: Settings },
  ];

  const reportViewerNavItems: Array<{ id: NavTab; label: string; icon: React.ElementType; badge?: string }> = [
    { id: 'dashboard', label: 'Bảng Điều Khiển & Tiến Độ', icon: LayoutDashboard },
    { id: 'reports', label: 'Báo Cáo Thống Kê', icon: BarChart3 },
    { id: 'settings', label: 'Cài Đặt Cá Nhân', icon: Settings },
  ];

  const userNavItems: Array<{ id: NavTab; label: string; icon: React.ElementType; badge?: string }> = [
    { id: 'evaluate', label: 'Đánh Giá Công Tác Phối Hợp', icon: CheckSquare },
    ...(canViewReports
      ? [
          { id: 'dashboard' as NavTab, label: 'Bảng Điều Khiển & Tiến Độ', icon: LayoutDashboard },
          { id: 'reports' as NavTab, label: 'Báo Cáo Thống Kê', icon: BarChart3 },
        ]
      : []),
    { id: 'settings', label: 'Cài Đặt Cá Nhân', icon: Settings },
  ];

  const items = isAdmin
    ? adminNavItems
    : isReportViewer
    ? reportViewerNavItems
    : userNavItems;

  const handleSelect = (tab: NavTab) => {
    onSelectTab(tab);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar sidebar element */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Navigation Category Label */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {isAdmin
              ? 'Quản Trị VNPT'
              : isReportViewer
              ? 'Người Xem Báo Cáo'
              : 'Cán Bộ Đánh Giá'}
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#005baa] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tight shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-blue-50 text-[#005baa] border border-blue-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom VNPT Info Box */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60 m-3 rounded-lg text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-semibold">D1 Online Sync Active</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Đồng bộ dữ liệu thời gian thực lên Cloudflare D1.
          </p>
        </div>
      </aside>
    </>
  );
};
