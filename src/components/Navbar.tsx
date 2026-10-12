/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Shield,
  User as UserIcon,
  LogOut,
  Key,
  Database,
  Menu,
  X,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onNavigateToSettings: () => void;
  onNavigateToD1: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  isSidebarOpen,
  onNavigateToSettings,
  onNavigateToD1,
}) => {
  const { currentUser, logout, d1Status, units } = useApp();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const userUnit = units.find((u) => u.id === currentUser?.unitId);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Mobile hamburger & VNPT Branding */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Toggle Navigation"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* VNPT Logo & Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#005baa] flex items-center justify-center shadow-xs text-white font-black tracking-wider text-sm select-none">
                VNPT
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm sm:text-base text-[#005baa] tracking-tight">
                    TẬP ĐOÀN BƯU CHÍNH VIỄN THÔNG VIỆT NAM
                  </span>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                    VNPT
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Hệ thống Đánh giá Công tác Phối hợp Đơn vị
                </p>
              </div>
              <div className="sm:hidden">
                <span className="font-bold text-sm text-[#005baa]">VNPT Đánh Giá</span>
              </div>
            </div>
          </div>

          {/* Right: Cloudflare D1 Connection status & User dropdown */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* D1 Connection Status Button/Indicator */}
            <button
              type="button"
              onClick={onNavigateToD1}
              title={`Trạng thái CSDL D1: ${d1Status.isConnected ? 'Kết nối tốt' : 'Mất kết nối'} (${d1Status.latencyMs}ms)`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Cloudflare D1:</span>
              <span className="inline-flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${d1Status.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="font-semibold text-slate-800">
                  {d1Status.workerUrl ? 'Worker Live' : 'Online D1'}
                </span>
                <span className="text-[10px] text-slate-400">({d1Status.latencyMs}ms)</span>
              </span>
            </button>

            {/* User Profile */}
            {currentUser && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <img
                    src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={currentUser.fullName}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                  <div className="hidden lg:block text-left text-xs">
                    <p className="font-semibold text-slate-800 leading-tight truncate max-w-[140px]">
                      {currentUser.fullName}
                    </p>
                    <p className="text-slate-500 text-[11px] truncate max-w-[140px]">
                      {userUnit?.name || currentUser.username}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
                </button>

                {/* Profile dropdown menu */}
                {isDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                      <p className="text-xs font-semibold text-slate-900">{currentUser.fullName}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span className="font-mono text-[11px] bg-slate-200/80 px-1.5 py-0.2 rounded text-slate-700">
                          {currentUser.hrmCode}
                        </span>
                        <span>·</span>
                        <span>{currentUser.role === 'ADMIN' ? 'Quản trị viên' : 'Người đánh giá'}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 truncate">
                        <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{userUnit?.name || 'Đơn vị VNPT'}</span>
                      </p>
                    </div>

                    <div className="py-1 text-xs">
                      <button
                        type="button"
                        onClick={onNavigateToSettings}
                        className="w-full flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100"
                      >
                        <UserIcon className="w-4 h-4 text-slate-500" />
                        Hồ sơ & Đổi Avatar
                      </button>
                      <button
                        type="button"
                        onClick={onNavigateToSettings}
                        className="w-full flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100"
                      >
                        <Key className="w-4 h-4 text-slate-500" />
                        Đổi mật khẩu
                      </button>
                      {currentUser.role === 'ADMIN' && (
                        <button
                          type="button"
                          onClick={onNavigateToD1}
                          className="w-full flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100"
                        >
                          <Database className="w-4 h-4 text-[#005baa]" />
                          Cấu hình CSDL Cloudflare D1
                        </button>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        type="button"
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất hệ thống
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
