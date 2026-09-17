import mongoose from "mongoose";

// Mỗi "công việc" (business/workspace) lưu 1 lát dữ liệu CRM riêng (customers/products/quotes/tasks)
// Dùng Mixed để khớp nguyên trạng cấu trúc dữ liệu mà app frontend đang tạo ra (id tự sinh riêng, không phải _id của Mongo)
const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
    status: { type: String, enum: ["pending", "accepted"], default: "pending" },
  },
  { _id: false }
);

const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    members: { type: [memberSchema], default: [] },
    data: {
      customers: { type: [mongoose.Schema.Types.Mixed], default: [] },
      products: { type: [mongoose.Schema.Types.Mixed], default: [] },
      quotes: { type: [mongoose.Schema.Types.Mixed], default: [] },
      tasks: { type: [mongoose.Schema.Types.Mixed], default: [] },
    },
  },
  { timestamps: true }
);

businessSchema.methods.toSummaryJSON = function toSummaryJSON(userId) {
  return {
    id: this._id.toString(),
    name: this.name,
    isOwner: this.ownerId.toString() === userId.toString(),
    members: this.members.map((m) => ({ username: m.username, status: m.status })),
  };
};

export default mongoose.model("Business", businessSchema);
