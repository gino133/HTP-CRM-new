import mongoose from "mongoose";

// Mỗi user là 1 tài khoản độc lập (không có role công ty).
// Sau này khi làm tính năng "công việc" (mời cộng tác), sẽ có model Business/Workspace
// riêng tham chiếu tới _id của user này (ownerId, members: [{userId, status}]).
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: {
      type: String,
      unique: true,
      sparse: true, // user đăng ký qua Google có thể chưa có username ngay
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Không bắt buộc: user đăng ký qua Google sẽ không có password
    password: { type: String, select: false },
    googleId: { type: String, unique: true, sparse: true, index: true },
    avatar: { type: String },

    // Xác thực email: user đăng ký bằng email/mật khẩu phải bấm link trong email mới đăng nhập được.
    // User đăng ký qua Google coi như đã xác thực sẵn (Google đã xác thực email đó).
    emailVerified: { type: Boolean, default: false },
    verificationToken: { type: String, select: false },
    verificationTokenExpires: { type: Date, select: false },

    // Quên mật khẩu
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    // Thông tin bổ sung, chỉnh sửa trong phần Cài đặt tài khoản
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
  },
  { timestamps: true }
);

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    username: this.username || null,
    email: this.email,
    avatar: this.avatar || null,
    hasPassword: !!this.password,
    emailVerified: this.emailVerified,
    phone: this.phone || null,
    address: this.address || null,
    createdAt: this.createdAt,
  };
};

export default mongoose.model("User", userSchema);
