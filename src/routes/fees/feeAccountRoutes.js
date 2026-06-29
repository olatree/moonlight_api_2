// src/routes/fees/feeAccountRoutes.js

const express = require("express");
const router = express.Router();

const {
  generateFeeAccounts,
  getFeeAccounts,
  getFeeAccount,
  getStudentFeeAccount,
  getStudentReportFeeInfo,
  generateSingleStudentFeeAccount,
} = require("../../controllers/fees/feeAccountController");

const {
  protect,
  restrictToRoles,
} = require("../../middleware/authMiddleware");

const { verifyStudent } = require("../../middleware/studentAuth");

const ADMIN_ROLES = [
  "admin",
  "super_admin",
  "master_admin",
];

router.get("/", protect, getFeeAccounts);

router.get("/student", protect, getStudentFeeAccount);

router.get("/report-fee-info", verifyStudent, getStudentReportFeeInfo);
router.get("/:id", protect, getFeeAccount);
// router.get("/report-fee-info", protect, getStudentReportFeeInfo);

router.post(
  "/generate",
  protect,
  restrictToRoles(...ADMIN_ROLES),
  generateFeeAccounts
);

router.post("/generate-single", protect, restrictToRoles(...ADMIN_ROLES), generateSingleStudentFeeAccount);

module.exports = router;