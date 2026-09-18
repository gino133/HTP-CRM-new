import type { CapacitorConfig } from '@capacitor/cli';
// Nạp file .env local (khi chạy `npm run android` trên máy) - trên GitHub Actions,
// biến VITE_GOOGLE_CLIENT_ID đã được truyền sẵn vào step "cap sync" nên dòng này không có tác dụng gì thêm.
import 'dotenv/config';

const config: CapacitorConfig = {
  appId: 'com.htp.crm',
  appName: 'HTP CRM',
  webDir: 'dist',
  plugins: {
    // Đăng nhập Google kiểu NATIVE (dùng Google Sign-In SDK thật của Android/iOS) thay vì mở popup
    // trình duyệt như trên web - popup trình duyệt không "quay lại" được app đóng gói nên không dùng được.
    // serverClientId PHẢI là Web Client ID (cùng giá trị với VITE_GOOGLE_CLIENT_ID) để backend
    // xác thực được idToken trả về - không phải Android Client ID.
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: process.env.VITE_GOOGLE_CLIENT_ID || '',
    },
  },
};

export default config;
