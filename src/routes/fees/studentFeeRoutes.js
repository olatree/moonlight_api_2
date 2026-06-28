// routes/studentFeeRoutes.js
const express = require("express");
const router = express.Router();

const { verifyStudent } = require("../../middleware/studentAuth");
const feeAccountController = require("../../controllers/fees/feeAccountController");

router.get("/my-fees", verifyStudent, feeAccountController.getMyFeeAccounts);

module.exports = router;