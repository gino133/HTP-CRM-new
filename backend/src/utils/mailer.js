import nodemailer from "nodemailer";

let transporter = null;

// Dùng chung 1 transporter cho cả app, tạo lười (lazy) để không lỗi lúc server khởi động
// nếu env chưa kịp cấu hình đầy đủ (chỉ lỗi khi thật sự gửi email).
function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "Thiếu cấu hình SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) trong biến môi trường"
    );
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465, // 465 dùng SSL, 587 dùng STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export async function sendVerificationEmail({ to, name, verifyUrl }) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color:#1e293b;">Xác nhận email của bạn</h2>
      <p>Chào ${name || ""},</p>
      <p>Bấm vào nút bên dưới để xác nhận email và kích hoạt tài khoản HTP CRM của bạn:</p>
      <p style="text-align:center; margin: 32px 0;">
        <a href="${verifyUrl}"
           style="background:#1e293b; color:#fff; text-decoration:none; padding:12px 28px; border-radius:9999px; font-weight:bold; display:inline-block;">
          Xác nhận email
        </a>
      </p>
      <p>Nếu nút không bấm được, copy đường link sau vào trình duyệt:</p>
      <p style="word-break: break-all; color:#475569;">${verifyUrl}</p>
      <p style="color:#94a3b8; font-size:12px; margin-top:32px;">Link có hiệu lực trong 24 giờ. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    </div>
  `;
  await getTransporter().sendMail({
    from,
    to,
    subject: "Xác nhận email - HTP CRM",
    html,
  });
}
