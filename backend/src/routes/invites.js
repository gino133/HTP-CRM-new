import { Router } from "express";
import Business from "../models/Business.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /invites - các lời mời đang chờ tôi xác nhận
router.get("/", async (req, res) => {
  const list = await Business.find({
    members: { $elemMatch: { userId: req.user._id, status: "pending" } },
  }).select("-data");
  return res.json({
    invites: list.map((b) => ({ businessId: b._id.toString(), businessName: b.name })),
  });
});

// POST /invites/:businessId/accept
router.post("/:businessId/accept", async (req, res) => {
  const business = await Business.findById(req.params.businessId);
  if (!business) return res.status(404).json({ message: "Không tìm thấy" });
  const member = business.members.find((m) => m.userId.toString() === req.user._id.toString());
  if (!member) return res.status(404).json({ message: "Bạn không có lời mời nào cho công việc này" });
  member.status = "accepted";
  await business.save();
  return res.json({ business: business.toSummaryJSON(req.user._id) });
});

// POST /invites/:businessId/decline
router.post("/:businessId/decline", async (req, res) => {
  const business = await Business.findById(req.params.businessId);
  if (!business) return res.status(404).json({ message: "Không tìm thấy" });
  business.members = business.members.filter((m) => m.userId.toString() !== req.user._id.toString());
  await business.save();
  return res.json({ ok: true });
});

export default router;
