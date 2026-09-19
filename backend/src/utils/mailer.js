// Gửi email qua HTTP API của Brevo (https://brevo.com, trước đây là Sendinblue).
// Lý do dùng Brevo thay vì SMTP thô: nhiều nền tảng hosting miễn phí (kể cả Render) chặn/giới
// hạn kết nối SMTP ra ngoài, gây lỗi ETIMEDOUT. HTTP API dùng cổng 443 nên không bị chặn.
// Lý do dùng Brevo thay vì Resend: Brevo cho phép xác minh 1 ĐỊA CHỈ EMAIL đơn lẻ (không cần
// sở hữu cả domain + cấu hình DNS) để gửi được tới bất kỳ người nhận nào - phù hợp khi
// chưa có domain riêng.

export async function sendVerificationEmail({ to, name, verifyUrl }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("Thiếu BREVO_API_KEY trong biến môi trường");
  }
  const senderEmail = process.env.MAIL_FROM_EMAIL;
  const senderName = process.env.MAIL_FROM_NAME || "HTP CRM";
  if (!senderEmail) {
    throw new Error("Thiếu MAIL_FROM_EMAIL (phải là email đã xác minh 'Sender' trong Brevo)");
  }

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

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: to, name: name || undefined }],
      subject: "Xác nhận email - HTP CRM",
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gửi email thất bại (${res.status}): ${errText}`);
  }
}

export async function sendResetPasswordEmail({ to, name, resetUrl }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("Thiếu BREVO_API_KEY trong biến môi trường");
  }
  const senderEmail = process.env.MAIL_FROM_EMAIL;
  const senderName = process.env.MAIL_FROM_NAME || "HTP CRM";
  if (!senderEmail) {
    throw new Error("Thiếu MAIL_FROM_EMAIL (phải là email đã xác minh 'Sender' trong Brevo)");
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color:#1e293b;">Đặt lại mật khẩu</h2>
      <p>Chào ${name || ""},</p>
      <p>Có yêu cầu đặt lại mật khẩu cho tài khoản HTP CRM của bạn. Bấm vào nút bên dưới để đặt mật khẩu mới:</p>
      <p style="text-align:center; margin: 32px 0;">
        <a href="${resetUrl}"
           style="background:#1e293b; color:#fff; text-decoration:none; padding:12px 28px; border-radius:9999px; font-weight:bold; display:inline-block;">
          Đặt lại mật khẩu
        </a>
      </p>
      <p>Nếu nút không bấm được, copy đường link sau vào trình duyệt:</p>
      <p style="word-break: break-all; color:#475569;">${resetUrl}</p>
      <p style="color:#94a3b8; font-size:12px; margin-top:32px;">Link có hiệu lực trong 1 giờ. Nếu bạn không yêu cầu đổi mật khẩu, hãy bỏ qua email này — mật khẩu hiện tại của bạn vẫn an toàn.</p>
    </div>
  `;

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: to, name: name || undefined }],
      subject: "Đặt lại mật khẩu - HTP CRM",
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gửi email thất bại (${res.status}): ${errText}`);
  }
}
