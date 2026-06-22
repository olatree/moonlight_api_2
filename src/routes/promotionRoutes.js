// server/src/routes/promotionRoutes.js
const express = require("express");
const router = express.Router();

const { promoteOrRepeatStudents } = require("../controllers/PromotionController");
const { protect, restrictToRoles } = require("../middleware/authMiddleware");

router.post(
  "/",
  protect,
  restrictToRoles("admin", "super_admin", "master_admin", "principal"),
  promoteOrRepeatStudents
);

module.exports = router;