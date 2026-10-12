/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CẤU HÌNH KẾT NỐI CƠ SỞ DỮ LIỆU CLOUDFLARE D1
 *
 * Đồng chí dán địa chỉ Cloudflare Worker API thực tế mà Cloudflare cấp cho đồng chí vào đây.
 * Địa chỉ Cloudflare Worker luôn có dạng:
 * https://<tên-worker>.<tên-subdomain-cloudflare-của-bạn>.workers.dev
 *
 * Ví dụ: 'https://vnpt-eval-api.tuanha-qnh.workers.dev'
 *
 * (LƯU Ý: Không để URL mẫu không tồn tại như 'https://vnpt-eval-api.workers.dev'
 * vì sẽ gây lỗi DNS net::ERR_NAME_NOT_RESOLVED).
 */
export const D1_WORKER_URL = (
  (import.meta.env?.VITE_D1_WORKER_URL as string) ||
  'https://vnpt-eval-api.tuanha-qnh.workers.dev'
).trim();
