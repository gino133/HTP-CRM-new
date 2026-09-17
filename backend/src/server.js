import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import businessRoutes from "./routes/businesses.js";
import inviteRoutes from "./routes/invites.js";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
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
