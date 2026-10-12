/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Unit } from '../types';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle,
  FolderTree,
  ChevronRight,
  Database,
} from 'lucide-react';

export const UnitManagement: React.FC = () => {
  const { units, users, saveUnit, deleteUnit } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string>('ALL');
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    parentId: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const openCreateModal = () => {
    setEditingUnit(null);
    setFormData({
      code: '',
      name: '',
      parentId: '',
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (unit: Unit) => {
    setEditingUnit(unit);
    setFormData({
      code: unit.code,
      name: unit.name,
      parentId: unit.parentId || '',
      status: unit.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      showNotification('Vui lòng nhập đầy đủ Mã đơn vị và Tên đơn vị!', 'error');
      return;
    }

    // Check duplicate code
    const duplicate = units.find(
      (u) => u.code.toUpperCase() === formData.code.trim().toUpperCase() && u.id !== editingUnit?.id
    );
    if (duplicate) {
      showNotification(`Mã đơn vị "${formData.code}" đã tồn tại trên hệ thống D1!`, 'error');
      return;
    }

    try {
      await saveUnit({
        id: editingUnit?.id,
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        parentId: formData.parentId ? formData.parentId : null,
        status: formData.status,
      });
      setIsModalOpen(false);
      showNotification(
        editingUnit
          ? `Đã cập nhật đơn vị "${formData.name}" và đồng bộ lên D1!`
          : `Đã thêm mới đơn vị "${formData.name}" và đồng bộ lên D1!`
      );
    } catch {
      showNotification('Lỗi khi lưu đơn vị vào CSDL', 'error');
    }
  };

  const handleDelete = async (unit: Unit) => {
    const hasUsers = users.some((u) => u.unitId === unit.id);
    if (hasUsers) {
      showNotification(`Không thể xóa đơn vị "${unit.name}" vì đang có người dùng thuộc đơn vị này!`, 'error');
      return;
    }
    const hasChildren = units.some((u) => u.parentId === unit.id);
    if (hasChildren) {
      showNotification(`Không thể xóa đơn vị "${unit.name}" vì đang có đơn vị cấp con trực thuộc!`, 'error');
      return;
    }

    if (window.confirm(`Đồng chí có chắc chắn muốn xóa đơn vị "${unit.name}" khỏi CSDL D1?`)) {
      await deleteUnit(unit.id);
      showNotification(`Đã xóa đơn vị "${unit.name}" trên CSDL D1.`);
    }
  };

  const filteredUnits = units.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchParent =
      selectedParentId === 'ALL'
        ? true
        : selectedParentId === 'ROOT'
        ? !u.parentId
        : u.parentId === selectedParentId;
    return matchSearch && matchParent;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#005baa]" />
            Khai Báo & Quản Lý Đơn Vị VNPT
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Khai báo cơ cấu tổ chức phân cấp cha - con và đồng bộ trực tuyến lên CSDL Cloudflare D1
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#005baa] hover:bg-[#004b8d] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Mới Đơn Vị</span>
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
            placeholder="Tìm theo Mã đơn vị, Tên đơn vị..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-500 whitespace-nowrap">Đơn vị cấp cha:</span>
          <select
            value={selectedParentId}
            onChange={(e) => setSelectedParentId(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#005baa] w-full md:w-48"
          >
            <option value="ALL">Tất cả cấp đơn vị</option>
            <option value="ROOT">Đơn vị cấp cao nhất</option>
            {units
              .filter((u) => u.level <= 2)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Units Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Mã Đơn Vị</th>
                <th className="py-3 px-4">Tên Đơn Vị</th>
                <th className="py-3 px-4">Đơn Vị Cấp Cha</th>
                <th className="py-3 px-4">Cấp</th>
                <th className="py-3 px-4">Số Cán Bộ</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Không tìm thấy đơn vị nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredUnits.map((u) => {
                  const parentUnit = units.find((p) => p.id === u.parentId);
                  const userCount = users.filter((usr) => usr.unitId === u.id).length;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#005baa]">
                        {u.code}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-1.5" style={{ paddingLeft: `${(u.level - 1) * 16}px` }}>
                          {u.level > 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                          <span>{u.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {parentUnit ? parentUnit.name : <span className="text-slate-400 italic">Cấp cao nhất</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-600">Cấp {u.level}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700">{userCount} cán bộ</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Hoạt động
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="p-1.5 text-slate-500 hover:text-[#005baa] hover:bg-blue-50 rounded transition-colors"
                          title="Chỉnh sửa đơn vị"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(u)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Xóa đơn vị"
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

      {/* Modal Add / Edit Unit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="bg-[#005baa] px-5 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {editingUnit ? 'Chỉnh Sửa Đơn Vị' : 'Thêm Mới Đơn Vị VNPT'}
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
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mã Đơn Vị (Viết tắt, in hoa) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: TTKD, TTCNTT, PBH-HL"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa] font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên Đơn Vị *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Trung tâm Kinh doanh VNPT"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Đơn Vị Cấp Cha Trực Thuộc
                </label>
                <select
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa] bg-white"
                >
                  <option value="">-- Không có (Đơn vị cấp cao nhất) --</option>
                  {units
                    .filter((u) => !editingUnit || u.id !== editingUnit.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.code})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Đơn vị con sẽ tự động nhận cấp độ phân nhánh phụ thuộc vào đơn vị cha.
                </p>
              </div>

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
                  <span>{editingUnit ? 'Lưu Thay Đổi (D1)' : 'Thêm & Đồng Bộ D1'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
