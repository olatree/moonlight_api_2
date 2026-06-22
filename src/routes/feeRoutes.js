// routes/feeRoutes.js
const express = require("express");
const router = express.Router();
const feeController = require("../controllers/feeController");

// ========== FEE STRUCTURE ROUTES ==========
router.post("/fee-structures", feeController.createFeeStructure);
router.put("/fee-structures/:id", feeController.updateFeeStructure);
router.delete("/fee-structures/:id", feeController.deleteFeeStructure);
router.get("/fee-structures", feeController.getFeeStructures);

// ========== FEE ACCOUNT ROUTES ==========
router.get("/fee-accounts/by-class-arm", feeController.getFeeAccountsByClassAndArm);
router.get("/student-fee-account/:studentId", feeController.getStudentFeeAccount);

// ========== PAYMENT ROUTES ==========
router.post("/process-payment", feeController.processPayment);

// ========== CARRYOVER ROUTES ==========
router.post("/carry-over", feeController.carryOverOutstandingFees);
router.get("/preview-outstanding", feeController.previewOutstandingFees);

module.exports = router;