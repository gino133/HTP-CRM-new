# htp-crm-backend

Backend xác thực (đăng ký / đăng nhập / đăng nhập Google) cho app htp-crm.
Chỉ xử lý tài khoản người dùng — chưa đụng tới dữ liệu CRM (khách hàng, báo giá...), phần đó vẫn ở localStorage trong app như hiện tại.

## API

| Method | Endpoint | Body | Mô tả |
|---|---|---|---|
| POST | `/auth/register` | `{ name, email, password, username }` | Đăng ký tài khoản mới (username dùng để người khác mời cộng tác) |
| POST | `/auth/login` | `{ email, password }` | Đăng nhập bằng email/mật khẩu |
| POST | `/auth/google` | `{ idToken }` | Đăng nhập/đăng ký bằng Google (nếu chưa có username, frontend sẽ hỏi thêm) |
| GET | `/auth/me` | header `Authorization: Bearer <token>` | Lấy thông tin user hiện tại |
| PATCH | `/auth/username` | `{ username }` | Đặt/đổi username (dùng cho user đăng ký qua Google) |
| GET | `/businesses` | — | Danh sách công việc tôi sở hữu hoặc đã tham gia |
| POST | `/businesses` | `{ name, customers?, products?, quotes?, tasks? }` | Tạo công việc mới (có thể kèm dữ liệu di trú) |
| PATCH | `/businesses/:id` | `{ name }` | Đổi tên (chỉ chủ sở hữu) |
| DELETE | `/businesses/:id` | — | Xoá (chỉ chủ sở hữu) |
| GET | `/businesses/:id/data` | — | Lấy khách hàng/sản phẩm/báo giá/công việc của business này |
| PUT | `/businesses/:id/data` | `{ customers, products, quotes, tasks }` | Ghi đè toàn bộ lát dữ liệu (app tự gọi khi có thay đổi) |
| POST | `/businesses/:id/invite` | `{ username }` | Chủ sở hữu mời 1 user khác bằng username |
| DELETE | `/businesses/:id/members/:userId` | — | Chủ sở hữu gỡ 1 thành viên |
| GET | `/invites` | — | Lời mời đang chờ tôi xác nhận |
| POST | `/invites/:businessId/accept` | — | Chấp nhận lời mời |
| POST | `/invites/:businessId/decline` | — | Từ chối lời mời |

Mọi response thành công đều trả `{ token, user }` (trừ `/auth/me` chỉ trả `{ user }`). `token` là JWT, frontend lưu lại và gắn vào header `Authorization: Bearer <token>` cho các lần gọi sau.

### Cách đồng bộ dữ liệu hoạt động

Mỗi "công việc" (`Business`) lưu nguyên 1 lát dữ liệu `{ customers, products, quotes, tasks }`. Khi app có thay đổi gì (thêm khách hàng, sửa báo giá...), toàn bộ lát dữ liệu của công việc đang mở được ghi đè lên qua `PUT /businesses/:id/data` (debounce 350ms). Đây là cách đơn giản, dễ triển khai, nhưng có đánh đổi: nếu 2 người cùng sửa dữ liệu của cùng 1 công việc gần như cùng lúc, người lưu sau sẽ ghi đè người lưu trước (không merge). Với quy mô vài người dùng chung 1 công việc thì rủi ro này thấp; nếu sau này cần chỉnh sửa đồng thời thời gian thực, sẽ cần nâng cấp lên API theo từng bản ghi (CRUD riêng cho từng khách hàng/báo giá...) thay vì ghi đè cả lát dữ liệu.

## Cài đặt local

```bash
cp .env.example .env
# điền MONGODB_URI, JWT_SECRET, GOOGLE_CLIENT_ID vào .env
npm install
npm run dev
```

## 1. Tạo MongoDB Atlas (nếu chưa có)

1. Vào https://cloud.mongodb.com → tạo cluster free (M0)
2. Database Access → tạo user + password
3. Network Access → Add IP Address → cho phép `0.0.0.0/0` (hoặc IP của Render sau khi deploy)
4. Connect → Drivers → copy connection string, điền vào `MONGODB_URI` trong `.env` (nhớ thay `<password>` bằng mật khẩu thật, và thêm tên database vào cuối, ví dụ `/htp-crm`)

## 2. Tạo Google OAuth Client ID (để có nút "Đăng nhập với Google")

1. Vào https://console.cloud.google.com/ → tạo project mới (hoặc chọn project có sẵn)
2. Vào **APIs & Services → OAuth consent screen**:
   - Chọn **External**, điền tên app (vd: "HTP CRM"), email liên hệ → Save
   - Ở bước Scopes: để mặc định (email, profile) → Save and Continue tới cuối
3. Vào **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Tên: `htp-crm-web`
   - **Authorized JavaScript origins**: thêm domain sẽ chạy frontend, ví dụ:
     - `http://localhost:5173` (dev)
     - domain thật khi deploy web (nếu có)
   - Bấm Create → copy **Client ID** (dạng `xxxx.apps.googleusercontent.com`)
4. Điền Client ID này vào:
   - Backend: biến `GOOGLE_CLIENT_ID` trong `.env`
   - Frontend: biến `VITE_GOOGLE_CLIENT_ID` (xem README của frontend)

> Lưu ý về app di động (Android/iOS qua Capacitor): nút "Đăng nhập với Google" trong bản hướng dẫn này dùng thư viện web (Google Identity Services), chạy tốt trên trình duyệt và thường chạy được trong WebView của Capacitor. Tuy nhiên Google có thể chặn đăng nhập trong một số WebView nhúng (lỗi `disallowed_useragent`) vì lý do bảo mật. Nếu gặp lỗi này trên bản Android/iOS đóng gói thật, bước tiếp theo sẽ là thêm plugin Capacitor riêng cho Google Sign-In native (`@codetrix-studio/capacitor-google-auth`) — mình có thể làm tiếp phần này sau khi bạn test bản web trước.

## 3. Deploy lên Render

1. Push thư mục `htp-crm-backend` này lên 1 repo GitHub riêng
2. Vào Render → New → Web Service → chọn repo đó
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Thêm Environment Variables giống hệt file `.env` (MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN, GOOGLE_CLIENT_ID, CORS_ORIGIN)
6. Deploy xong, copy URL Render cấp (vd `https://htp-crm-backend.onrender.com`) → điền vào `VITE_API_URL` ở frontend

## Việc sẽ làm sau (chưa nằm trong scope lần này)

- Đồng bộ theo từng bản ghi (thay vì ghi đè cả lát dữ liệu) để hỗ trợ nhiều người sửa đồng thời tốt hơn
- Quên mật khẩu / đổi mật khẩu / xác thực email
- Thông báo đẩy khi có lời mời mới hoặc khi có ai đó thay đổi dữ liệu công việc chung
