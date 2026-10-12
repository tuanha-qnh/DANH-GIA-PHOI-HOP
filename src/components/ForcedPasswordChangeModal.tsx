/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldAlert, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { DEFAULT_PASSWORD } from '../constants/initialData';

export const ForcedPasswordChangeModal: React.FC = () => {
  const { currentUser, changePassword, logout } = useApp();
  const [oldPassword, setOldPassword] = useState(DEFAULT_PASSWORD);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!currentUser || !currentUser.mustChangePassword) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.trim().length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự!');
      return;
    }

    if (newPassword === DEFAULT_PASSWORD) {
      setError('Mật khẩu mới không được trùng với mật khẩu mặc định (Vnpt@2026)!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu mới không khớp!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changePassword(oldPassword, newPassword);
      if (!res.success) {
        setError(res.message);
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Lỗi khi cập nhật mật khẩu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-amber-200 overflow-hidden animate-in zoom-in-95">
        {/* Warning Banner */}
        <div className="bg-amber-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base">BẮT BUỘC ĐỔI MẬT KHẨU</h2>
              <p className="text-xs text-amber-100">
                Chính sách an toàn thông tin VNPT cho lần đăng nhập đầu tiên
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Chào đồng chí <strong className="text-slate-800">{currentUser.fullName}</strong>. Hệ thống ghi nhận tài khoản của đồng chí đang sử dụng mật khẩu mặc định hoặc vừa được quản trị viên reset. Vui lòng thiết lập mật khẩu riêng để tiếp tục sử dụng hệ thống.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mật khẩu hiện tại
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Mật khẩu hiện tại"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mật khẩu mới
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự, khác Vnpt@2026"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={logout}
                className="w-1/3 py-2 px-3 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Đăng Xuất
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-2/3 py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <span>Đang lưu lên D1...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Lưu Mật Khẩu Mới</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
