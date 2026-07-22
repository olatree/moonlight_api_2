// server/src/routes/promotionRoutes.js
const express = require("express");
const router = express.Router();

// const { promoteOrRepeatStudents } = require("../controllers/PromotionController");
const {
  promoteOrRepeatStudents,
  rollbackPromotionAudit,
  rollbackPromotionBatch,
  editPromotionAudit,
  getPromotionBatches,
  getPromotionBatchDetail,
} = require("../controllers/promotionController");
const { protect, restrictToRoles } = require("../middleware/authMiddleware");

router.post(
  "/",
  protect,
  restrictToRoles("admin", "super_admin", "master_admin", "principal", "head_teacher"),
  promoteOrRepeatStudents
);
router.get("/batches", protect, restrictToRoles("admin", "super_admin", "master_admin", "principal", "head_teacher"), getPromotionBatches);
router.get("/batches/:batchId", protect, restrictToRoles("admin", "super_admin", "master_admin", "principal", "head_teacher"), getPromotionBatchDetail);
router.post("/batches/:batchId/rollback", protect, restrictToRoles("admin", "super_admin", "master_admin", "principal", "head_teacher"), rollbackPromotionBatch);
router.post("/:auditId/rollback", protect, restrictToRoles("admin", "super_admin", "master_admin", "principal", "head_teacher"), rollbackPromotionAudit);
router.patch("/:auditId", protect, restrictToRoles("admin", "super_admin", "master_admin", "principal", "head_teacher"), editPromotionAudit);

module.exports = router;