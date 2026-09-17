# HTP CRM — Quản lý khách hàng, báo giá, doanh thu & lợi nhuận

App quản lý công việc cá nhân cho Lucent Decal — viết bằng React + Vite, đóng gói thành app thật cho iOS/Android bằng Capacitor.

## 1. Chạy thử trên máy tính
```bash
npm install
npm run dev
```

## 2. Đưa code lên GitHub
```bash
git init
git add .
git commit -m "HTP CRM - initial commit"
git branch -M main
git remote add origin https://github.com/<tên-github-của-bạn>/htp-crm.git
git push -u origin main
```
> Tạo repo trống trên GitHub trước (KHÔNG tick "Add README") rồi copy đúng link `origin` ở trên vào.

## 3. Build ra app Android (cần Android Studio)
Cài Android Studio: https://developer.android.com/studio

```bash
npm install
npm run android
```
Lệnh này tự build web + đồng bộ vào project Android + mở Android Studio. Trong Android Studio:
- Đợi Gradle sync xong (lần đầu hơi lâu)
- Bấm nút ▶ Run để cài lên điện thoại/máy ảo test thử
- Muốn xuất file cài đặt: **Build → Generate Signed Bundle / APK** để có file `.apk` (cài trực tiếp) hoặc `.aab` (nộp lên Google Play)

## 4. Build ra app iOS (bắt buộc cần máy Mac + Xcode)
Cài Xcode từ App Store (chỉ có trên macOS).

```bash
npm install
npm run ios
```
Lệnh này tự build web + đồng bộ vào project iOS + mở Xcode. Trong Xcode:
- Chọn Team ở mục Signing & Capabilities (cần tài khoản Apple Developer — miễn phí để test trên máy cá nhân qua cáp, **trả phí 99 USD/năm nếu muốn đưa lên App Store**)
- Bấm ▶ Run để cài lên iPhone test qua cáp
- Muốn nộp App Store: **Product → Archive** rồi làm theo hướng dẫn của Xcode

## 5. Sau này mỗi khi sửa code (App.jsx)
Chỉ cần chạy lại:
```bash
npm run android   # hoặc
npm run ios
```
Lệnh này tự build lại bản web mới nhất và đồng bộ vào 2 project native — không cần làm lại từ đầu.

## Icon & Splash screen
Đã tạo sẵn theo đúng logo/màu thương hiệu, nằm trong thư mục `resources/`. Muốn đổi icon:
1. Thay file `resources/icon.png` (1024×1024) và `resources/splash.png` (2732×2732)
2. Chạy: `npx capacitor-assets generate`
3. Chạy lại `npm run android` / `npm run ios`

## Lưu ý quan trọng về dữ liệu
- App hiện lưu dữ liệu bằng **localStorage trên chính thiết bị** — không tự đồng bộ giữa điện thoại và máy tính, không có backup trên mây.
- Nếu gỡ app hoặc xoá dữ liệu app, toàn bộ khách hàng/báo giá sẽ mất.
- Muốn dùng nhiều thiết bị + có backup, cần nối app vào 1 backend thật (ví dụ ghép chung với server Node/Express + MongoDB đang có của Lucent Decal) — báo lại nếu cần làm phần này.

## Cấu trúc project
```
src/App.jsx         → toàn bộ logic + giao diện app
android/             → project native Android (mở bằng Android Studio)
ios/                  → project native iOS (mở bằng Xcode, cần Mac)
resources/            → ảnh gốc để sinh icon/splash
capacitor.config.ts   → cấu hình tên app, App ID
```


## Thông báo nhắc việc (mới)
App đã tích hợp thông báo đẩy thật (kèm âm thanh mặc định của điện thoại) cho mục **Công việc** — khi đặt "Giờ nhắc" cho 1 việc, đến đúng giờ điện thoại sẽ báo dù app đang tắt/khoá màn hình.

**Lưu ý quan trọng:**
- Chỉ hoạt động trên **app đã cài thật** (qua `npm run android` / `npm run ios`) — **không hoạt động** khi xem trong bản preview của Claude, vì đó chỉ là trang web thường.
- Lần đầu mở app, điện thoại sẽ hỏi xin quyền gửi thông báo — cần bấm **Cho phép/Allow**, nếu không thông báo sẽ không gửi được.
- Android 13 trở lên: nếu lỡ từ chối quyền, vào **Cài đặt điện thoại → Ứng dụng → HTP CRM → Thông báo** để bật lại thủ công.
- iOS: tương tự, vào **Cài đặt → HTP CRM → Thông báo** để bật/tắt.
