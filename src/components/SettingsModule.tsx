/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings,
  Key,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Camera,
  Shield,
  Upload,
  Database,
  Building2,
} from 'lucide-react';
import { DEFAULT_PASSWORD } from '../constants/initialData';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
];

export const SettingsModule: React.FC = () => {
  const { currentUser, changePassword, updateAvatar, units } = useApp();
  const [activeTab, setActiveTab] = useState<'password' | 'avatar'>('password');

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdNotification, setPwdNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isPwdSubmitting, setIsPwdSubmitting] = useState(false);

  // Avatar state
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(
    currentUser?.avatarUrl || AVATAR_PRESETS[0]
  );
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string>('');
  const [avatarNotification, setAvatarNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isAvatarSubmitting, setIsAvatarSubmitting] = useState(false);

  const userUnit = units.find((u) => u.id === currentUser?.unitId);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdNotification(null);

    if (newPassword.trim().length < 6) {
      setPwdNotification({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự!', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdNotification({ message: 'Xác nhận mật khẩu mới không khớp!', type: 'error' });
      return;
    }

    setIsPwdSubmitting(true);
    try {
      const res = await changePassword(oldPassword, newPassword);
      if (res.success) {
        setPwdNotification({ message: 'Đổi mật khẩu thành công và đã đồng bộ lên CSDL D1!', type: 'success' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwdNotification({ message: res.message, type: 'error' });
      }
    } catch {
      setPwdNotification({ message: 'Lỗi khi cập nhật mật khẩu', type: 'error' });
    } finally {
      setIsPwdSubmitting(false);
    }
  };

  const handleAvatarSave = async () => {
    if (!currentUser) return;
    setIsAvatarSubmitting(true);
    try {
      await updateAvatar(selectedAvatarUrl);
      setAvatarNotification({ message: 'Đã cập nhật ảnh đại diện trên CSDL D1!', type: 'success' });
    } catch {
      setAvatarNotification({ message: 'Lỗi khi cập nhật avatar', type: 'error' });
    } finally {
      setIsAvatarSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setSelectedAvatarUrl(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#005baa]" />
            Cài Đặt Cá Nhân & Tài Khoản
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Đổi mật khẩu tài khoản và thay đổi ảnh đại diện cá nhân trên hệ thống VNPT
          </p>
        </div>

        {/* User preview pill */}
        <div className="flex items-center gap-3 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
          <img
            src={currentUser?.avatarUrl || AVATAR_PRESETS[0]}
            alt=""
            className="w-8 h-8 rounded-full object-cover border border-slate-300"
          />
          <div className="text-xs">
            <p className="font-semibold text-slate-800">{currentUser?.fullName}</p>
            <p className="text-slate-500 text-[11px]">{userUnit?.name}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('password')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'password'
              ? 'border-[#005baa] text-[#005baa]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Đổi Mật Khẩu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('avatar')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'avatar'
              ? 'border-[#005baa] text-[#005baa]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Thay Đổi Avatar</span>
        </button>
      </div>

      {/* TAB 1: ĐỔI MẬT KHẨU */}
      {activeTab === 'password' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs max-w-xl p-6">
          <h3 className="font-bold text-sm text-slate-900 mb-1">Thiết Lập Mật Khẩu Mới</h3>
          <p className="text-xs text-slate-500 mb-5">
            Mật khẩu mới phải có tối thiểu 6 ký tự để đảm bảo an toàn thông tin
          </p>

          {pwdNotification && (
            <div
              className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
                pwdNotification.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {pwdNotification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{pwdNotification.message}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mật Khẩu Hiện Tại *
              </label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Nhập mật khẩu hiện tại"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mật Khẩu Mới *
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Xác Nhận Mật Khẩu Mới *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa]"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={isPwdSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#005baa] hover:bg-[#004b8d] text-white font-semibold transition-colors disabled:opacity-50 shadow-xs"
              >
                <Database className="w-4 h-4" />
                <span>{isPwdSubmitting ? 'Đang lưu lên D1...' : 'Lưu Mật Khẩu Lên D1'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: THAY ĐỔI AVATAR */}
      {activeTab === 'avatar' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs max-w-2xl p-6">
          <h3 className="font-bold text-sm text-slate-900 mb-1">Thay Đổi Ảnh Đại Diện</h3>
          <p className="text-xs text-slate-500 mb-5">
            Chọn từ danh sách avatar tiêu chuẩn hoặc tải ảnh từ máy tính của đồng chí
          </p>

          {avatarNotification && (
            <div
              className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
                avatarNotification.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {avatarNotification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{avatarNotification.message}</span>
            </div>
          )}

          {/* Current Avatar Preview */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6">
            <img
              src={selectedAvatarUrl}
              alt=""
              className="w-20 h-20 rounded-full object-cover border-2 border-[#005baa] shadow-sm"
            />
            <div>
              <p className="font-bold text-sm text-slate-900">{currentUser?.fullName}</p>
              <p className="text-xs text-slate-500 mt-0.5">Mã HRM: {currentUser?.hrmCode}</p>
              <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer shadow-xs transition-colors">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Tải ảnh từ máy tính</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>

          {/* Avatar Presets Grid */}
          <div className="space-y-2 mb-6">
            <label className="block text-xs font-semibold text-slate-700">
              Hoặc chọn nhanh từ bộ sưu tập ảnh đại diện tiêu chuẩn:
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {AVATAR_PRESETS.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedAvatarUrl(url)}
                  className={`p-1 rounded-full border-2 transition-all ${
                    selectedAvatarUrl === url
                      ? 'border-[#005baa] ring-2 ring-blue-200 scale-105'
                      : 'border-transparent hover:border-slate-300'
                  }`}
                >
                  <img
                    src={url}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              type="button"
              disabled={isAvatarSubmitting}
              onClick={handleAvatarSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#005baa] hover:bg-[#004b8d] text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-xs"
            >
              <Database className="w-4 h-4" />
              <span>{isAvatarSubmitting ? 'Đang cập nhật D1...' : 'Lưu Ảnh Đại Diện Lên D1'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
