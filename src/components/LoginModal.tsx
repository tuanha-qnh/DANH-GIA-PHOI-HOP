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
  Settings2,
  ChevronDown,
  ChevronUp,
  Link,
  ShieldAlert,
} from 'lucide-react';
import { DEFAULT_PASSWORD } from '../constants/initialData';
import { d1Client } from '../services/d1Client';

export const LoginModal: React.FC = () => {
  const { login, d1Status, refreshData, setD1WorkerUrl, users } = useApp();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Config D1 endpoint directly from login screen
  const [showD1Config, setShowD1Config] = useState(false);
  const [workerUrlInput, setWorkerUrlInput] = useState(d1Client.getStoredWorkerUrl());

  const handleSyncData = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    setError(null);
    try {
      const data = await refreshData();
      const currentWorker = d1Client.getStoredWorkerUrl();
      if (currentWorker) {
        setSyncStatus({
          message: `Đã kết nối và đồng bộ thành công ${data.users.length} tài khoản từ CSDL Cloudflare D1!`,
          type: 'success',
        });
      } else {
        setSyncStatus({
          message: `Đã đồng bộ ${data.users.length} tài khoản hệ thống. Lưu ý: Chưa cấu hình URL Cloudflare D1 trên trình duyệt này!`,
          type: 'info',
        });
      }
    } catch (err: unknown) {
      setSyncStatus({
        message: `Lỗi đồng bộ CSDL: ${(err as Error).message}`,
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveWorkerUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = workerUrlInput.trim();
    setD1WorkerUrl(clean);
    setIsSyncing(true);
    try {
      const data = await refreshData();
      setSyncStatus({
        message: `Đã lưu địa chỉ D1 và đồng bộ ${data.users.length} tài khoản từ CSDL Cloudflare D1!`,
        type: 'success',
      });
      setShowD1Config(false);
    } catch {
      setSyncStatus({
        message: 'Đã lưu địa chỉ nhưng không thể tải dữ liệu từ Worker. Vui lòng kiểm tra lại URL.',
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

  const handleQuickLogin = (uname: string) => {
    setUsername(uname);
    setPassword(DEFAULT_PASSWORD);
    setError(null);
    setSyncStatus(null);
  };

  const activeWorkerUrl = d1Client.getStoredWorkerUrl();

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
            Xác thực tài khoản cán bộ công nhân viên VNPT (D1 Cloudflare)
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
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleSyncData}
                    className="text-[#005baa] hover:underline font-bold inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Bấm vào đây để Đồng bộ dữ liệu CSDL ngay</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sync Success / Status Banner */}
          {syncStatus && (
            <div
              className={`mb-4 p-3 rounded-lg text-xs flex items-start gap-2 animate-in fade-in ${
                syncStatus.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : syncStatus.type === 'info'
                  ? 'bg-blue-50 border border-blue-200 text-blue-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {syncStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              ) : syncStatus.type === 'info' ? (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              )}
              <span>{syncStatus.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
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
                  placeholder="admin hoặc mã hrm"
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
                <span>Đang đồng bộ và xác thực...</span>
              ) : (
                <>
                  <span>Đăng Nhập Vào Hệ Thống</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* NÚT ĐỒNG BỘ DỮ LIỆU TỪ CSDL D1 (THEO YÊU CẦU CỦA USER) */}
            <button
              type="button"
              disabled={isSyncing || isSubmitting}
              onClick={handleSyncData}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-[#005baa] text-xs font-bold transition-all shadow-xs"
              title="Đồng bộ lại danh sách tài khoản mới nhất từ Cloudflare D1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>
                {isSyncing ? 'Đang đồng bộ dữ liệu từ D1...' : `Đồng Bộ Dữ Liệu CSDL (${users.length} tài khoản)`}
              </span>
            </button>
          </form>

          {/* D1 Connection Indicator & Quick Config Box */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className={`w-2 h-2 rounded-full ${activeWorkerUrl ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="font-semibold text-[11px]">
                  CSDL: {activeWorkerUrl ? 'Cloudflare D1 Live' : 'D1 Chưa liên kết Worker'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowD1Config(!showD1Config)}
                className="text-[#005baa] hover:underline font-semibold text-[11px] flex items-center gap-1"
              >
                <Settings2 className="w-3 h-3" />
                <span>{showD1Config ? 'Đóng cấu hình' : 'Cấu hình URL D1'}</span>
                {showD1Config ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Inline D1 Worker URL Config Accordion */}
            {showD1Config && (
              <form onSubmit={handleSaveWorkerUrl} className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-in fade-in slide-in-from-top-1">
                <p className="text-[11px] text-slate-600 font-medium">
                  Nhập địa chỉ Cloudflare Worker D1 để các máy tính khác tải chung dữ liệu:
                </p>
                <div className="relative">
                  <Link className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={workerUrlInput}
                    onChange={(e) => setWorkerUrlInput(e.target.value)}
                    placeholder="https://vnpt-eval-api...workers.dev"
                    className="w-full pl-8 pr-2 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#005baa]"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSyncing}
                    className="px-3 py-1.5 bg-[#005baa] hover:bg-[#004b8d] text-white text-[11px] font-bold rounded-lg shadow-xs transition-colors"
                  >
                    Lưu & Đồng Bộ Ngay
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Quick Demo Access Bar */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Chọn nhanh tài khoản thử nghiệm:
            </p>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="py-1.5 px-2 rounded border border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-[#005baa] font-medium text-center truncate"
              >
                Admin (Quản trị)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('nguyenvanan')}
                className="py-1.5 px-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-center truncate"
              >
                TTKD (User 1)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('tranthibich')}
                className="py-1.5 px-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-center truncate"
              >
                TTCNTT (User 2)
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3 text-blue-500" />
              VNPT Coordination D1 Database
            </span>
            <span>Phiên bản 2026.1</span>
          </div>
        </div>
      </div>
    </div>
  );
};
