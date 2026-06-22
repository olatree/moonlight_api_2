// src/routes/fees/feeReportRoutes.js

const express = require("express");
const router = express.Router();

const {
  getDebtorsList,
  getCollectionSummary,
  getStudentBalanceReport,
  getPaymentSummary,
} = require("../../controllers/fees/feeReportController");

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

router.get(
  "/debtors",
  protect,
  restrictToRoles(...ADMIN_ROLES),
  getDebtorsList
);

router.get(
  "/collection-summary",
  protect,
  restrictToRoles(...ADMIN_ROLES),
  getCollectionSummary
);

router.get(
  "/payments-summary",
  protect,
  restrictToRoles(...ADMIN_ROLES),
  getPaymentSummary
);

router.get(
  "/student/:studentId",
  protect,
  restrictToRoles(...ADMIN_ROLES),
  getStudentBalanceReport
);

module.exports = router;