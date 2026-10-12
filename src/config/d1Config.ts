/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CẤU HÌNH KẾT NỐI CƠ SỞ DỮ LIỆU CLOUDFLARE D1
 *
 * Đồng chí dán địa chỉ Cloudflare Worker API của đơn vị vào biến D1_WORKER_URL bên dưới.
 * Khi trang web được tải trên bất kỳ máy tính, trình duyệt hay điện thoại nào,
 * hệ thống sẽ tự động kết nối trực tiếp đến CSDL D1 này mà người dùng không cần phải cài đặt gì thêm.
 *
 * Ví dụ: 'https://vnpt-eval-api.<tên-subdomain>.workers.dev'
 */
export const D1_WORKER_URL = (
  (import.meta.env?.VITE_D1_WORKER_URL as string) ||
  'https://vnpt-eval-api.workers.dev'
).trim();
