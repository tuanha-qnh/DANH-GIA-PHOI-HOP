/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, UserRole } from '../types';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  KeyRound,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Shield,
  Eye,
  Database,
  RefreshCw,
} from 'lucide-react';
import { DEFAULT_PASSWORD } from '../constants/initialData';

export const UserManagement: React.FC = () => {
  const { users, units, saveUser, deleteUser, resetPassword, currentUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    hrmCode: '',
    fullName: '',
    unitId: units[0]?.id || '',
    username: '',
    role: 'USER' as UserRole,
    canViewReports: false,
    status: 'ACTIVE' as 'ACTIVE' | 'LOCKED',
  });

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      hrmCode: `HRM-${Math.floor(10000 + Math.random() * 90000)}`,
      fullName: '',
      unitId: units[0]?.id || '',
      username: '',
      role: 'USER',
      canViewReports: false,
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      hrmCode: user.hrmCode,
      fullName: user.fullName,
      unitId: user.unitId,
      username: user.username,
      role: user.role,
      canViewReports: user.canViewReports,
      status: user.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hrmCode.trim() || !formData.fullName.trim() || !formData.username.trim()) {
      showNotification('Vui lòng điền đủ Mã HRM, Tên người dùng và Tên đăng nhập!', 'error');
      return;
    }

    // Check duplicate username
    const dupUsername = users.find(
      (u) => u.username.toLowerCase() === formData.username.trim().toLowerCase() && u.id !== editingUser?.id
    );
    if (dupUsername) {
      showNotification(`Tên đăng nhập "${formData.username}" đã tồn tại trên CSDL D1!`, 'error');
      return;
    }

    try {
      await saveUser({
        id: editingUser?.id,
        hrmCode: formData.hrmCode.trim(),
        fullName: formData.fullName.trim(),
        unitId: formData.unitId,
        username: formData.username.trim().toLowerCase(),
        role: formData.role,
        canViewReports: formData.canViewReports,
        status: formData.status,
      });

      setIsModalOpen(false);
      showNotification(
        editingUser
          ? `Đã cập nhật tài khoản "${formData.fullName}" trên CSDL D1!`
          : `Đã khởi tạo tài khoản "${formData.fullName}" với mật khẩu mặc định "${DEFAULT_PASSWORD}" trên CSDL D1!`
      );
    } catch {
      showNotification('Lỗi khi lưu tài khoản vào CSDL D1', 'error');
    }
  };

  const handleResetPassword = async (user: User) => {
    if (
      window.confirm(
        `Đồng chí có chắc chắn muốn Reset mật khẩu cho "${user.fullName}" về mật khẩu mặc định (${DEFAULT_PASSWORD}) và yêu cầu đổi mật khẩu ở lần đăng nhập tới?`
      )
    ) {
      await resetPassword(user.id);
      showNotification(
        `Đã reset mật khẩu của "${user.fullName}" về ${DEFAULT_PASSWORD} và đồng bộ lên D1!`
      );
    }
  };

  const handleDelete = async (user: User) => {
    if (user.id === currentUser?.id) {
      showNotification('Không thể xóa tài khoản của chính đồng chí đang đăng nhập!', 'error');
      return;
    }

    if (window.confirm(`Đồng chí có chắc chắn muốn xóa tài khoản "${user.fullName}" khỏi hệ thống D1?`)) {
      await deleteUser(user.id);
      showNotification(`Đã xóa tài khoản "${user.fullName}" trên CSDL D1.`);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.hrmCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchUnit = selectedUnitId === 'ALL' || u.unitId === selectedUnitId;
    return matchSearch && matchUnit;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#005baa]" />
            Quản Lý Tài Khoản & Phân Quyền Người Dùng
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Khai báo mã HRM, tài khoản đăng nhập, mật khẩu mặc định ({DEFAULT_PASSWORD}) và phân quyền xem báo cáo thống kê
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#005baa] hover:bg-[#004b8d] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Mới Người Dùng</span>
          </button>
        </div>
      </div>

      {/* Notification banner */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo Mã HRM, Họ tên, Tên đăng nhập..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-500 whitespace-nowrap">Đơn vị:</span>
          <select
            value={selectedUnitId}
            onChange={(e) => setSelectedUnitId(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#005baa] w-full md:w-56"
          >
            <option value="ALL">Tất cả đơn vị ({users.length})</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Mã HRM</th>
                <th className="py-3 px-4">Tên Người Dùng</th>
                <th className="py-3 px-4">Đơn Vị Trực Thuộc</th>
                <th className="py-3 px-4">User Đăng Nhập</th>
                <th className="py-3 px-4">Vai Trò</th>
                <th className="py-3 px-4">Quyền Xem Báo Cáo</th>
                <th className="py-3 px-4">Đổi MK Lần Đầu</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Không tìm thấy người dùng nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const unit = units.find((unt) => unt.id === u.unitId);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {u.hrmCode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <img
                            src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <p className="font-semibold text-slate-800 leading-tight">{u.fullName}</p>
                            <p className="text-[11px] text-slate-400">{u.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm khóa'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="font-medium">{unit?.name || 'Chưa gán đơn vị'}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#005baa]">
                        {u.username}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                            u.role === 'ADMIN' ? 'text-purple-700' : 'text-slate-600'
                          }`}
                        >
                          {u.role === 'ADMIN' && <Shield className="w-3.5 h-3.5" />}
                          {u.role === 'ADMIN' ? 'Quản Trị Viên' : 'Người Dùng'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.canViewReports || u.role === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Được Xem
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Không</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {u.mustChangePassword ? (
                          <span className="text-amber-600 font-medium text-[11px]">Bắt buộc</span>
                        ) : (
                          <span className="text-emerald-600 text-[11px]">Đã đổi mật khẩu</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => handleResetPassword(u)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title="Reset mật khẩu về Vnpt@2026"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="p-1.5 text-slate-500 hover:text-[#005baa] hover:bg-blue-50 rounded transition-colors"
                          title="Sửa thông tin"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(u)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Xóa người dùng"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="bg-[#005baa] px-5 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                {editingUser ? 'Chỉnh Sửa Cán Bộ VNPT' : 'Khai Báo Cán Bộ Người Dùng Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mã HRM *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="HRM-10201"
                    value={formData.hrmCode}
                    onChange={(e) => setFormData({ ...formData, hrmCode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa] font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    User Đăng Nhập *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="nguyenvanan"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Họ và Tên Cán Bộ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Đơn Vị Trực Thuộc *
                </label>
                <select
                  required
                  value={formData.unitId}
                  onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa] bg-white"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Vai Trò Hệ Thống
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa] bg-white"
                  >
                    <option value="USER">Cán bộ đánh giá (User thường)</option>
                    <option value="ADMIN">Quản trị viên (Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Trạng Thái Tài Khoản
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'LOCKED' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa] bg-white"
                  >
                    <option value="ACTIVE">Hoạt động bình thường</option>
                    <option value="LOCKED">Khóa tài khoản</option>
                  </select>
                </div>
              </div>

              {/* Phân quyền xem báo cáo */}
              <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="canViewReports"
                  checked={formData.canViewReports || formData.role === 'ADMIN'}
                  disabled={formData.role === 'ADMIN'}
                  onChange={(e) => setFormData({ ...formData, canViewReports: e.target.checked })}
                  className="mt-0.5 rounded border-slate-300 text-[#005baa] focus:ring-[#005baa]"
                />
                <label htmlFor="canViewReports" className="text-xs cursor-pointer select-none">
                  <span className="font-semibold text-slate-800">
                    Được quyền xem module Báo cáo Thống kê
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Cho phép tài khoản này tra cứu các bảng tổng hợp và chi tiết điểm phối hợp của các đơn vị toàn tỉnh.
                  </p>
                </label>
              </div>

              {!editingUser && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Mật khẩu khởi tạo sẽ là <strong>{DEFAULT_PASSWORD}</strong>. Cán bộ bắt buộc phải đổi mật khẩu khi đăng nhập lần đầu tiên.
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#005baa] hover:bg-[#004b8d] text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{editingUser ? 'Lưu Thông Tin (D1)' : 'Tạo Tài Khoản & Lưu D1'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
