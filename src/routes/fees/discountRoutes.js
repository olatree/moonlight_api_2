// src/routes/fees/discountRoutes.js

const express = require("express");
const router = express.Router();

const {
  applyDiscount,
  getDiscounts,
  cancelDiscount,
} = require("../../controllers/fees/discountController");

const {
  protect,
  restrictToRoles,
} = require("../../middleware/authMiddleware");

const ADMIN_ROLES = [
  "admin",
  "super_admin",
  "master_admin",
];

router.get("/", protect, getDiscounts);

router.post(
  "/",
  protect,
  restrictToRoles(...ADMIN_ROLES),
  applyDiscount
);

router.patch(
  "/:id/cancel",
  protect,
  restrictToRoles(...ADMIN_ROLES),
  cancelDiscount
);

module.exports = router;