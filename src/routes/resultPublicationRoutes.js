// server/src/routes/resultPublicationRoutes.js
const express = require("express");
const router = express.Router();

const { protect, restrictToRoles } = require("../middleware/authMiddleware");

const {
  publishResult,
  unpublishResult,
  getPublicationStatus,
} = require("../controllers/resultPublicationController");

router.use(protect);

router.get(
  "/status",
  restrictToRoles("admin", "super_admin", "master_admin", "principal"),
  getPublicationStatus
);

router.post(
  "/publish",
  restrictToRoles("admin", "super_admin", "master_admin", "principal"),
  publishResult
);

router.post(
  "/unpublish",
  restrictToRoles("admin", "super_admin", "master_admin", "principal"),
  unpublishResult
);

module.exports = router;