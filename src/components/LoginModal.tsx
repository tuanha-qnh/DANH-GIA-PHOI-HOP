/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Lock, User as UserIcon, AlertCircle, ArrowRight, Database } from 'lucide-react';
import { DEFAULT_PASSWORD } from '../constants/initialData';

export const LoginModal: React.FC = () => {
  const { login, d1Status } = useApp();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
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
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
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
                * Mật khẩu khởi tạo mặc định: <span className="font-mono font-bold text-slate-700">Vnpt@2026</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#005baa] hover:bg-[#004b8d] text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
            >
              {isSubmitting ? (
                <span>Đang đồng bộ xác thực...</span>
              ) : (
                <>
                  <span>Đăng Nhập Vào Hệ Thống</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="mt-5 pt-4 border-t border-slate-100">
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
              CSDL: Cloudflare D1
            </span>
            <span>Phiên bản 2026.1</span>
          </div>
        </div>
      </div>
    </div>
  );
};
