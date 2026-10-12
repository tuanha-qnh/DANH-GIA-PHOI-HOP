/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Download,
  ExternalLink,
  RefreshCw,
  Zap,
  Terminal,
  Code2,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  CLOUDFLARE_7_STEPS,
  CLOUDFLARE_WORKER_CODE,
  D1_SQL_SCHEMA,
} from '../services/d1Constants';
import { d1Client } from '../services/d1Client';

export const D1ConfigModule: React.FC = () => {
  const { d1Status, setD1WorkerUrl, testD1Connection, initD1Schema, refreshData } = useApp();

  const [workerUrl, setWorkerUrlInput] = useState(d1Status.workerUrl || '');
  const [apiToken, setApiTokenInput] = useState(d1Client.getStoredToken() || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
    tablesCount?: number;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'config' | 'guide7steps' | 'schema' | 'worker' | 'github'>('config');

  // Copy feedback states
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedWorker, setCopiedWorker] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testD1Connection(workerUrl, apiToken);
      setTestResult(res);
      if (res.success) {
        setD1WorkerUrl(workerUrl);
        d1Client.setStoredToken(apiToken);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = () => {
    setD1WorkerUrl(workerUrl);
    d1Client.setStoredToken(apiToken);
    handleTestConnection();
  };

  const handleInitSchema = async () => {
    setIsTesting(true);
    try {
      const res = await initD1Schema(workerUrl, apiToken);
      alert(res.message);
      await refreshData();
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string, type: 'schema' | 'worker') => {
    navigator.clipboard.writeText(text);
    if (type === 'schema') {
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 2500);
    } else {
      setCopiedWorker(true);
      setTimeout(() => setCopiedWorker(false), 2500);
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-[#005baa]" />
            Cấu Hình CSDL Cloudflare D1 & Hướng Dẫn Kết Nối
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản trị kết nối CSDL Cloudflare D1 thời gian thực, lộ trình 7 bước cầm tay chỉ việc, mã SQL và Worker API
          </p>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs">
          <span className={`w-2.5 h-2.5 rounded-full ${d1Status.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="font-semibold text-slate-800">
            {d1Status.workerUrl ? 'Cloudflare Worker Live' : 'D1 Online Sync Active'}
          </span>
          <span className="text-slate-400 font-mono text-[11px]">({d1Status.latencyMs}ms)</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'config'
              ? 'border-[#005baa] text-[#005baa]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Cấu Hình & Test Kết Nối</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guide7steps')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'guide7steps'
              ? 'border-[#005baa] text-[#005baa]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Lộ Trình 7 Bước Cầm Tay Chỉ Việc</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('schema')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'schema'
              ? 'border-[#005baa] text-[#005baa]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Mã SQL Schema (8 Bảng D1)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('worker')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'worker'
              ? 'border-[#005baa] text-[#005baa]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Mã Nguồn Worker API (worker.js)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('github')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'github'
              ? 'border-[#005baa] text-[#005baa]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ExternalLink className="w-4 h-4" />
          <span>Hướng Dẫn GitHub & Vercel</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CẤU HÌNH & TEST KẾT NỐI                                            */}
      {/* ========================================================================= */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900">Thông Số Kết Nối Cloudflare Worker & D1</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Nhập địa chỉ URL của Worker API mà đồng chí đã tạo trên <strong>dash.cloudflare.com</strong>. Hệ thống sẽ tự động gửi và nhận dữ liệu qua Worker này trực tiếp tới CSDL D1.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cloudflare Worker API Endpoint URL *
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={workerUrl}
                    onChange={(e) => setWorkerUrlInput(e.target.value)}
                    placeholder="https://<tên-worker>.<tên-subdomain>.workers.dev"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa] font-mono text-xs"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Định dạng chuẩn: <code className="text-[#005baa]">https://danh-gia-phoi-hop.tuanha-qnh.workers.dev</code> (Lưu ý: Không dùng URL mẫu không tồn tại).
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mật khẩu bảo mật Worker / Secret Key (Nêu đồng chí có đặt mật khẩu trên Worker)
                </label>
                <input
                  type="text"
                  value={apiToken}
                  onChange={(e) => setApiTokenInput(e.target.value)}
                  placeholder="Nhập mật khẩu/secret đã đặt trong Worker Settings -> Variables (VD: Vnpt@2026)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005baa] font-mono text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Khớp với biến <code className="text-amber-700 font-mono">PASSWORD</code> hoặc <code className="text-amber-700 font-mono">API_TOKEN</code> / <code className="text-amber-700 font-mono">SECRET</code> đã cấu hình trên Cloudflare Worker.
                </p>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isTesting}
                  onClick={handleTestConnection}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#005baa] hover:bg-[#004b8d] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Đang kiểm thử...' : 'Kiểm Tra Kết Nối D1'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold transition-colors shadow-xs"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Lưu Cấu Hình D1</span>
                </button>

                {workerUrl && (
                  <button
                    type="button"
                    onClick={handleInitSchema}
                    className="flex items-center gap-1.5 px-3 py-2 border border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-[#005baa] rounded-lg font-semibold transition-colors"
                  >
                    <span>Khởi Tạo Bảng Schema Vào D1</span>
                  </button>
                )}
              </div>
            </div>

            {/* Test result display */}
            {testResult && (
              <div
                className={`p-4 rounded-xl border text-xs flex items-start gap-3 mt-4 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold">
                    {testResult.success ? 'KẾT NỐI THÀNH CÔNG!' : 'KẾT NỐI THẤT BẠI!'}
                  </p>
                  <p className="text-[11px] leading-relaxed">{testResult.message}</p>
                  <div className="flex items-center gap-4 text-[11px] pt-1">
                    <span>Độ trễ phản hồi (Latency): <strong>{testResult.latencyMs} ms</strong></span>
                    {testResult.tablesCount !== undefined && (
                      <span>Số bảng CSDL hiện hữu: <strong>{testResult.tablesCount}</strong></span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Info Box */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-blue-50/80 p-5 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-3">
              <h4 className="font-bold text-sm text-[#005baa] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Cấu Hình CSDL D1 Trong Mã Nguồn
              </h4>
              <p className="leading-relaxed">
                URL Cloudflare D1 được cấu hình trực tiếp tại file: <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-bold text-[#005baa]">src/config/d1Config.ts</code>.
              </p>
              <p className="leading-relaxed">
                Khi đồng chí đưa lên GitHub và Vercel, <strong>100% người dùng trên mọi máy tính, điện thoại, trình duyệt</strong> khi truy cập website đều tự động kết nối trực tiếp vào CSDL Cloudflare D1 mà không cần phải thực hiện bất kỳ thao tác cấu hình nào.
              </p>
              <div className="p-3 bg-white rounded-lg border border-blue-200 space-y-1.5 font-mono text-[11px] text-slate-700">
                <p>✓ Cấu hình mã nguồn: src/config/d1Config.ts</p>
                <p>✓ CSDL: Cloudflare D1 (SQLite Edge)</p>
                <p>✓ Đồng bộ: Tự động 100% trên mọi thiết bị</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LỘ TRÌNH 7 BƯỚC CẦM TAY CHỈ VIỆC                                    */}
      {/* ========================================================================= */}
      {activeTab === 'guide7steps' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-base text-slate-900 mb-1">
              Lộ Trình 7 Bước Cầm Tay Chỉ Việc Trên Website Cloudflare (dash.cloudflare.com)
            </h3>
            <p className="text-xs text-slate-500">
              Đồng chí chỉ cần thao tác 100% trên giao diện web của Cloudflare theo 7 bước chi tiết dưới đây:
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {CLOUDFLARE_7_STEPS.map((step) => (
              <div
                key={step.step}
                className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-all shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#005baa] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                    {step.step}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{step.title}</h4>
                      <span className="text-[10px] font-semibold text-[#005baa] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                        {step.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">
                      {step.desc}
                    </p>
                  </div>
                </div>

                {step.step === 1 && (
                  <a
                    href="https://dash.cloudflare.com"
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 flex items-center gap-1 text-xs font-semibold text-[#005baa] hover:underline"
                  >
                    <span>Mở Cloudflare</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MÃ SQL SCHEMA (CÁC BẢNG D1 HOÀN CHỈNH)                              */}
      {/* ========================================================================= */}
      {activeTab === 'schema' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#005baa]" />
                Mã SQL Schema Cloudflare D1 (8 Bảng & Ràng Buộc Toàn Vẹn)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Chạy mã này trong tab Console của D1 Database trên dash.cloudflare.com
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(D1_SQL_SCHEMA, 'schema')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#005baa] text-white text-xs font-semibold hover:bg-[#004b8d] transition-colors shadow-xs"
              >
                {copiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSchema ? 'Đã Sao Chép!' : 'Sao Chép Mã SQL'}</span>
              </button>

              <button
                type="button"
                onClick={() => downloadFile(D1_SQL_SCHEMA, 'vnpt_d1_schema.sql', 'text/sql')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải .sql</span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-900 overflow-x-auto max-h-[500px]">
            <pre className="font-mono text-xs text-emerald-400 leading-relaxed">
              <code>{D1_SQL_SCHEMA}</code>
            </pre>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MÃ NGUỒN WORKER API (worker.js)                                    */}
      {/* ========================================================================= */}
      {activeTab === 'worker' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#005baa]" />
                Mã Nguồn Cloudflare Worker API (Dán vào Web Editor của Worker)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Vào Worker &gt; Edit Code &gt; Dán toàn bộ mã này &gt; Bấm "Save and Deploy"
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(CLOUDFLARE_WORKER_CODE, 'worker')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#005baa] text-white text-xs font-semibold hover:bg-[#004b8d] transition-colors shadow-xs"
              >
                {copiedWorker ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWorker ? 'Đã Sao Chép!' : 'Sao Chép Worker Code'}</span>
              </button>

              <button
                type="button"
                onClick={() => downloadFile(CLOUDFLARE_WORKER_CODE, 'worker.js', 'text/javascript')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải worker.js</span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-900 overflow-x-auto max-h-[500px]">
            <pre className="font-mono text-xs text-cyan-300 leading-relaxed">
              <code>{CLOUDFLARE_WORKER_CODE}</code>
            </pre>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: HƯỚNG DẪN GITHUB & VERCEL                                          */}
      {/* ========================================================================= */}
      {activeTab === 'github' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900">
            Hướng Dẫn Đẩy Lên GitHub & Triển Khai Lên Vercel App
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Dự án được xây dựng chuẩn TypeScript, Vite, Tailwind CSS thuần túy, hoàn toàn tương thích để triển khai lên Vercel hoặc Cloudflare Pages chỉ với 3 lệnh Git đơn giản:
          </p>

          <div className="space-y-3 font-mono text-xs bg-slate-900 text-slate-200 p-4 rounded-xl">
            <p className="text-slate-400"># 1. Khởi tạo Git và thêm files</p>
            <p className="text-emerald-400">git init</p>
            <p className="text-emerald-400">git add .</p>
            <p className="text-emerald-400">git commit -m "feat: VNPT Coordination Evaluation System"</p>
            <p className="text-slate-400 mt-2"># 2. Đẩy lên GitHub repository của bạn</p>
            <p className="text-emerald-400">git branch -M main</p>
            <p className="text-emerald-400">git remote add origin https://github.com/&lt;user&gt;/&lt;repo&gt;.git</p>
            <p className="text-emerald-400">git push -u origin main</p>
            <p className="text-slate-400 mt-2"># 3. Triển khai trên Vercel (vercel.com)</p>
            <p className="text-cyan-300"># Đăng nhập vercel.com -&gt; Add New Project -&gt; Import GitHub Repo</p>
            <p className="text-cyan-300"># Framework Preset: Vite (Tự động nhận diện)</p>
            <p className="text-cyan-300"># Bấm Deploy -&gt; Hoàn tất trong 30 giây!</p>
          </div>
        </div>
      )}
    </div>
  );
};
