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
  Settings,
  X,
  KeyRound,
  Globe,
  Zap,
} from 'lucide-react';
import { DEFAULT_PASSWORD } from '../constants/initialData';
import { d1Client } from '../services/d1Client';

export const LoginModal: React.FC = () => {
  const { login, refreshData, setD1WorkerUrl, testD1Connection } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modal hỗ trợ cấu hình nhanh URL và Mật khẩu Worker khi có sự cố
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configUrl, setConfigUrl] = useState(d1Client.getStoredWorkerUrl() || '');
  const [configToken, setConfigToken] = useState(d1Client.getStoredToken() || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
    tablesCount?: number;
    hasSecretProtection?: boolean;
  } | null>(null);

  const handleSyncData = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    setError(null);
    try {
      const data = await refreshData();
      setSyncStatus({
        message: `Đã kết nối và đồng bộ thành công ${data.users.length} tài khoản từ CSDL Cloudflare D1!`,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Không thể kết nối máy chủ';
      setSyncStatus({
        message: `Lỗi kết nối CSDL D1: ${msg}`,
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestInModal = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testD1Connection(configUrl, configToken);
      setTestResult(res);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfigInModal = async () => {
    setD1WorkerUrl(configUrl);
    d1Client.setStoredToken(configToken);
    setShowConfigModal(false);
    // Tự động đồng bộ ngay sau khi lưu
    handleSyncData();
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
              <div className="flex-1">
                <p>{syncStatus.message}</p>
                {syncStatus.type === 'error' && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfigUrl(d1Client.getStoredWorkerUrl() || '');
                      setConfigToken(d1Client.getStoredToken() || '');
                      setShowConfigModal(true);
                    }}
                    className="mt-2 inline-flex items-center gap-1 font-semibold text-[#005baa] hover:underline"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Kiểm tra & Cập nhật URL / Mật khẩu Worker</span>
                  </button>
                )}
              </div>
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
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#005baa] hover:bg-[#004b8d] text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
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
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-all shadow-xs cursor-pointer"
                title="Bấm nút này khi không đăng nhập được để đồng bộ lại dữ liệu từ CSDL D1"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#005baa] ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ CSDL D1'}</span>
              </button>
            </div>

          </form>

          {/* Footer note & subtle setting button */}
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3 text-[#005baa]" />
              CSDL: Cloudflare D1
            </span>
            <div className="flex items-center gap-2">
              <span>VNPT 2026</span>
              <button
                type="button"
                onClick={() => {
                  setConfigUrl(d1Client.getStoredWorkerUrl() || '');
                  setConfigToken(d1Client.getStoredToken() || '');
                  setTestResult(null);
                  setShowConfigModal(true);
                }}
                className="text-slate-400 hover:text-[#005baa] p-1 rounded hover:bg-slate-100 transition-colors"
                title="Cài đặt kết nối & Mật khẩu Worker D1"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL CẤU HÌNH NHANH URL & MẬT KHẨU WORKER D1 */}
      {showConfigModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#003875] px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-300" />
                <h3 className="font-bold text-sm">Cấu Hình Kết Nối Cloudflare D1 & Mật Khẩu Worker</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#005baa]" />
                  <span>Địa chỉ Cloudflare Worker API URL:</span>
                </label>
                <input
                  type="text"
                  value={configUrl}
                  onChange={(e) => setConfigUrl(e.target.value)}
                  placeholder="https://<tên-worker>.<subdomain>.workers.dev"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa] font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Định dạng chuẩn: <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded">https://tên-worker.subdomain.workers.dev</code>
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span>Mật khẩu / Secret cấu hình trên Worker:</span>
                </label>
                <input
                  type="text"
                  value={configToken}
                  onChange={(e) => setConfigToken(e.target.value)}
                  placeholder="Mật khẩu đặt trong Settings -> Variables của Worker (VD: Vnpt@2026)"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa] font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Nhập chính xác mật khẩu/secret bạn đã đặt trong phần <strong>Settings &gt; Variables and Secrets</strong> trên Cloudflare Worker.
                </p>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  )}
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold">{testResult.message}</p>
                    <p className="text-[11px] opacity-80">
                      Thời gian phản hồi: {testResult.latencyMs}ms
                      {testResult.tablesCount !== undefined && ` | Số bảng: ${testResult.tablesCount}`}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isTesting}
                  onClick={handleTestInModal}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Zap className={`w-3.5 h-3.5 text-amber-500 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveConfigInModal}
                    className="px-4 py-2 rounded-lg bg-[#005baa] hover:bg-[#004b8d] text-white font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Lưu & Đồng bộ ngay</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
