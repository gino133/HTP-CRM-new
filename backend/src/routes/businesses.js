import { Router } from "express";
import Business from "../models/Business.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

function isAcceptedMember(business, userId) {
  const uid = userId.toString();
  if (business.ownerId.toString() === uid) return true;
  return business.members.some((m) => m.userId.toString() === uid && m.status === "accepted");
}

// GET /businesses - danh sách công việc tôi sở hữu hoặc đã được nhận vào
router.get("/", async (req, res) => {
  const list = await Business.find({
    $or: [{ ownerId: req.user._id }, { members: { $elemMatch: { userId: req.user._id, status: "accepted" } } }],
  }).select("-data");
  return res.json({ businesses: list.map((b) => b.toSummaryJSON(req.user._id)) });
});

// POST /businesses - tạo công việc mới, có thể kèm dữ liệu để di trú từ localStorage
router.post("/", async (req, res) => {
  const { name, customers, products, quotes, tasks } = req.body || {};
  if (!name) return res.status(400).json({ message: "Thiếu tên công việc" });
  const business = await Business.create({
    name,
    ownerId: req.user._id,
    members: [{ userId: req.user._id, username: req.user.username || req.user.email, status: "accepted" }],
    data: {
      customers: Array.isArray(customers) ? customers : [],
      products: Array.isArray(products) ? products : [],
      quotes: Array.isArray(quotes) ? quotes : [],
      tasks: Array.isArray(tasks) ? tasks : [],
    },
  });
  return res.status(201).json({ business: business.toSummaryJSON(req.user._id) });
});

// PATCH /businesses/:id - đổi tên (chỉ chủ sở hữu)
router.patch("/:id", async (req, res) => {
  const business = await Business.findById(req.params.id);
  if (!business) return res.status(404).json({ message: "Không tìm thấy" });
  if (business.ownerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Chỉ chủ sở hữu mới được đổi tên" });
  }
  if (req.body?.name) business.name = req.body.name;
  await business.save();
  return res.json({ business: business.toSummaryJSON(req.user._id) });
});

// DELETE /businesses/:id - xoá (chỉ chủ sở hữu)
router.delete("/:id", async (req, res) => {
  const business = await Business.findById(req.params.id);
  if (!business) return res.status(404).json({ message: "Không tìm thấy" });
  if (business.ownerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Chỉ chủ sở hữu mới được xoá" });
  }
  await business.deleteOne();
  return res.json({ ok: true });
});

// GET /businesses/:id/data
router.get("/:id/data", async (req, res) => {
  const business = await Business.findById(req.params.id);
  if (!business) return res.status(404).json({ message: "Không tìm thấy" });
  if (!isAcceptedMember(business, req.user._id)) {
    return res.status(403).json({ message: "Bạn không có quyền truy cập công việc này" });
  }
  return res.json({ data: business.data });
});

// PUT /businesses/:id/data - ghi đè toàn bộ lát dữ liệu của công việc này
router.put("/:id/data", async (req, res) => {
  const business = await Business.findById(req.params.id);
  if (!business) return res.status(404).json({ message: "Không tìm thấy" });
  if (!isAcceptedMember(business, req.user._id)) {
    return res.status(403).json({ message: "Bạn không có quyền truy cập công việc này" });
  }
  const { customers, products, quotes, tasks } = req.body || {};
  business.data = {
    customers: Array.isArray(customers) ? customers : business.data.customers,
    products: Array.isArray(products) ? products : business.data.products,
    quotes: Array.isArray(quotes) ? quotes : business.data.quotes,
    tasks: Array.isArray(tasks) ? tasks : business.data.tasks,
  };
  await business.save();
  return res.json({ ok: true });
});

// POST /businesses/:id/invite { username }
router.post("/:id/invite", async (req, res) => {
  const business = await Business.findById(req.params.id);
  if (!business) return res.status(404).json({ message: "Không tìm thấy" });
  if (business.ownerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Chỉ chủ sở hữu mới được mời thành viên" });
  }
  const username = String(req.body?.username || "").toLowerCase().trim();
  if (!username) return res.status(400).json({ message: "Thiếu username cần mời" });
  const target = await User.findOne({ username });
  if (!target) return res.status(404).json({ message: "Không tìm thấy user với username này" });
  if (target._id.toString() === req.user._id.toString()) {
    return res.status(400).json({ message: "Không thể tự mời chính mình" });
  }
  const already = business.members.find((m) => m.userId.toString() === target._id.toString());
  if (already) {
    return res.status(409).json({ message: already.status === "accepted" ? "Người này đã ở trong công việc" : "Đã gửi lời mời trước đó" });
  }
  business.members.push({ userId: target._id, username: target.username, status: "pending" });
  await business.save();
  return res.json({ business: business.toSummaryJSON(req.user._id) });
});

// DELETE /businesses/:id/members/:userId - chủ sở hữu gỡ 1 thành viên
router.delete("/:id/members/:userId", async (req, res) => {
  const business = await Business.findById(req.params.id);
  if (!business) return res.status(404).json({ message: "Không tìm thấy" });
  if (business.ownerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Chỉ chủ sở hữu mới được gỡ thành viên" });
  }
  business.members = business.members.filter((m) => m.userId.toString() !== req.params.userId);
  await business.save();
  return res.json({ business: business.toSummaryJSON(req.user._id) });
});

export default router;
