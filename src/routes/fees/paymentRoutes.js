// src/routes/fees/paymentRoutes.js

const express = require("express");
const router = express.Router();

const {
  recordPayment,
  getPayments,
  getPayment,
  voidPayment,
} = require("../../controllers/fees/paymentController");

const {
  protect,
  restrictToRoles,
} = require("../../middleware/authMiddleware");

const ADMIN_ROLES = [
  "admin",
  "super_admin",
  "master_admin",
];

router.get("/", protect, getPayments);

router.get("/:id", protect, getPayment);

router.post(
  "/",
  protect,
  restrictToRoles(...ADMIN_ROLES),
  recordPayment
);

router.patch(
  "/:id/void",
  protect,
  restrictToRoles(...ADMIN_ROLES),
  voidPayment
);

module.exports = router;