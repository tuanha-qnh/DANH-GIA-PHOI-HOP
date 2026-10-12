/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Lock,
  User as UserIcon,
  AlertCircle,
  ArrowRight,
  Database,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { DEFAULT_PASSWORD } from '../constants/initialData';

export const LoginModal: React.FC = () => {
  const { login, refreshData } = useApp();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncData = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    setError(null);
    try {
      await refreshData();
      setSyncStatus({
        message: 'Đã đồng bộ CSDL D1 thành công!',
        type: 'success',
      });
    } catch (err: unknown) {
      setSyncStatus({
        message: `Lỗi kết nối CSDL D1: ${(err as Error).message || 'Không thể kết nối máy chủ'}`,
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSyncStatus(null);
    setIsSubmitting(true);
    try {
      const res = await login(username, password);
      if (!res.success) {
        setError(res.error || 'Đăng nhập không thành công');
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* VNPT Banner Header */}
        <div className="bg-[#005baa] px-6 py-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-36 h-36 bg-blue-400/20 rounded-full blur-2xl" />
          <div className="w-12 h-12 mx-auto rounded-xl bg-white/10 flex items-center justify-center border border-white/20 mb-3 shadow-inner">
            <span className="font-black text-xl tracking-wider text-white">VNPT</span>
          </div>
          <h2 className="text-lg font-bold">HỆ THỐNG ĐÁNH GIÁ PHỐI HỢP</h2>
          <p className="text-xs text-blue-100 mt-1">
            Xác thực tài khoản cán bộ công nhân viên VNPT
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="space-y-1">
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Sync Success / Status Banner */}
          {syncStatus && (
            <div
              className={`mb-4 p-3 rounded-lg text-xs flex items-start gap-2 animate-in fade-in ${
                syncStatus.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {syncStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              )}
              <span>{syncStatus.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên đăng nhập / Mã HRM
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập hoặc mã HRM"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa] focus:border-transparent"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                * Mật khẩu khởi tạo mặc định: <span className="font-mono font-bold text-slate-700">{DEFAULT_PASSWORD}</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isSyncing}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#005baa] hover:bg-[#004b8d] text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
            >
              {isSubmitting ? (
                <span>Đang xác thực...</span>
              ) : (
                <>
                  <span>Đăng Nhập Vào Hệ Thống</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Nút Đồng Bộ CSDL D1 theo yêu cầu */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isSyncing || isSubmitting}
                onClick={handleSyncData}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-all shadow-xs"
                title="Bấm nút này khi không đăng nhập được để đồng bộ lại dữ liệu từ CSDL D1"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#005baa] ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ CSDL D1'}</span>
              </button>
            </div>
          </form>

          {/* Footer note */}
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3 text-[#005baa]" />
              CSDL: Cloudflare D1
            </span>
            <span>VNPT 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
};
