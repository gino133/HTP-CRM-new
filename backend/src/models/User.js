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
    createdAt: this.createdAt,
  };
};

export default mongoose.model("User", userSchema);
