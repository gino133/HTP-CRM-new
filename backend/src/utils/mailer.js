// Gửi email qua HTTP API của Resend (https://resend.com) thay vì kết nối SMTP thô.
// Lý do: nhiều nền tảng hosting miễn phí (bao gồm Render) chặn/giới hạn kết nối ra ngoài
// qua các cổng SMTP (25, 465, 587) để chống spam, gây lỗi ETIMEDOUT dù tài khoản SMTP đúng.
// HTTP API dùng cổng 443 (cổng web bình thường) nên không bị chặn.

export async function sendVerificationEmail({ to, name, verifyUrl }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Thiếu RESEND_API_KEY trong biến môi trường");
  }
  // "HTP CRM <onboarding@resend.dev>" là địa chỉ gửi test có sẵn của Resend, dùng được ngay
  // không cần xác minh domain riêng. Khi có domain thật, đổi MAIL_FROM thành vd:
  // "HTP CRM <noreply@tenmiencuaban.com>" (phải verify domain đó trong Resend trước).
  const from = process.env.MAIL_FROM || "HTP CRM <onboarding@resend.dev>";

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

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Xác nhận email - HTP CRM",
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gửi email thất bại (${res.status}): ${errText}`);
  }
}
