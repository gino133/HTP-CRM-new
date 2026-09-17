import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import businessRoutes from "./routes/businesses.js";
import inviteRoutes from "./routes/invites.js";

const app = express();

// Cho phép cấu hình nhiều origin cùng lúc, cách nhau bởi dấu phẩy trong CORS_ORIGIN,
// vd: "https://htp-crm.vercel.app,https://localhost" (https://localhost là origin mặc định
// của WebView Capacitor trên app Android/iOS, khác hẳn domain web nên phải khai báo riêng).
const allowedOrigins = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Không có Origin header (vd gọi trực tiếp bằng curl/Postman) -> luôn cho qua
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`[cors] Chặn origin không được phép: ${origin}`);
      return callback(new Error("Không được phép bởi CORS"));
    },
  })
);
app.use(express.json({ limit: "5mb" })); // dữ liệu CRM (khách hàng/báo giá...) có thể khá lớn khi đồng bộ cả lát dữ liệu

app.get("/", (req, res) => res.json({ ok: true, service: "htp-crm-backend" }));
app.use("/auth", authRoutes);
app.use("/businesses", businessRoutes);
app.use("/invites", inviteRoutes);

// Bắt lỗi chung, tránh server crash im lặng
app.use((err, req, res, next) => {
  console.error("[unhandled]", err);
  res.status(500).json({ message: "Có lỗi máy chủ xảy ra" });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] Đang chạy tại cổng ${PORT}`));
  })
  .catch((err) => {
    console.error("[server] Không kết nối được MongoDB:", err.message);
    process.exit(1);
  });
