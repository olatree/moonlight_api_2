// routes/fees/feeTypeRoutes.js

const express = require("express");

const router = express.Router();

const {
  createFeeType,
  getFeeTypes,
  getActiveFeeTypes,
  updateFeeType,
  archiveFeeType,
  restoreFeeType,
} = require("../../controllers/fees/feeTypeController");

const {
  protect,
  restrictToRoles,
} = require("../../middleware/authMiddleware");


// View
router.get("/", protect, getFeeTypes);

router.get(
  "/active",
  protect,
  getActiveFeeTypes
);


// Create
router.post(
  "/",
  protect,
  restrictToRoles(
    "admin",
    "super_admin",
    "master_admin",
    "principal"
  ),
  createFeeType
);


// Update
router.put(
  "/:id",
  protect,
  restrictToRoles(
    "admin",
    "super_admin",
    "master_admin",
    "principal"
  ),
  updateFeeType
);


// Archive
router.patch(
  "/:id/archive",
  protect,
  restrictToRoles(
    "admin",
    "super_admin",
    "master_admin",
    "principal"
  ),
  archiveFeeType
);


// Restore
router.patch(
  "/:id/restore",
  protect,
  restrictToRoles(
    "admin",
    "super_admin",
    "master_admin",
    "principal"
  ),
  restoreFeeType
);

module.exports = router;