/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================================
 * CẤU HÌNH KẾT NỐI CƠ SỞ DỮ LIỆU CLOUDFLARE D1 & WORKER API
 * ============================================================================
 *
 * 1. D1_WORKER_URL:
 *    Địa chỉ URL Cloudflare Worker thực tế của bạn được cấp khi Deploy Worker.
 *    Định dạng chuẩn của Cloudflare Worker luôn là:
 *    https://<tên-worker>.<subdomain-cloudflare-của-bạn>.workers.dev
 *
 *    Ví dụ: 'https://danh-gia-phoi-hop.tuanha-qnh.workers.dev'
 *           hoặc 'https://vnpt-eval-api.tuanha-qnh.workers.dev'
 *
 * 2. D1_WORKER_PASSWORD:
 *    Mật khẩu / Secret bạn đã đặt trong phần Settings của Worker:
 *    (Cloudflare Dashboard -> Workers & Pages -> Worker của bạn -> Settings -> Variables and Secrets)
 *    Mặc định: 'Vnpt@2026' (hoặc mật khẩu bất kỳ bạn đã đặt trong biến môi trường của Worker).
 */

// 1. Địa chỉ URL Cloudflare Worker API
export const D1_WORKER_URL = (
  (import.meta.env?.VITE_D1_WORKER_URL as string) ||
  'https://danh-gia-phoi-hop.tuanha-qnh.workers.dev'
).trim();

// 2. Mật khẩu / Secret bảo mật Worker
export const D1_WORKER_PASSWORD = (
  (import.meta.env?.VITE_D1_WORKER_PASSWORD as string) ||
  (import.meta.env?.VITE_D1_API_TOKEN as string) ||
  (import.meta.env?.VITE_D1_WORKER_SECRET as string) ||
  'Vnpt@2026'
).trim();
