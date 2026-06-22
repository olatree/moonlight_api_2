// routes/fees/feeStructureRoutes.js

const express = require("express");
const router = express.Router();

const {
  createFeeStructure,
  getFeeStructures,
  getFeeStructure,
  updateFeeStructure,
  deactivateFeeStructure,
} = require("../../controllers/fees/feeStructureController");

const {
  protect,
  restrictToRoles,
} = require("../../middleware/authMiddleware");

const ADMIN_ROLES = [
  "admin",
  "super_admin",
  "master_admin",
  "principal",
];

router.get("/", protect, getFeeStructures);

router.get("/:id", protect, getFeeStructure);

router.post(
  "/",
  protect,
  restrictToRoles(...ADMIN_ROLES),
  createFeeStructure
);

router.put(
  "/:id",
  protect,
  restrictToRoles(...ADMIN_ROLES),
  updateFeeStructure
);

router.patch(
  "/:id/deactivate",
  protect,
  restrictToRoles(...ADMIN_ROLES),
  deactivateFeeStructure
);

module.exports = router;