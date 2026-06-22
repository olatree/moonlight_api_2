// src/controllers/fees/discountController.js

const FeeDiscount = require("../../models/fees/FeeDiscount");
const FeeAccount = require("../../models/fees/FeeAccount");

const {
  calculateDiscountAmount,
  recalculateFeeAccount,
} = require("../../utils/feeUtils");

// ===============================
// APPLY DISCOUNT
// ===============================
exports.applyDiscount = async (req, res) => {
  try {
    const {
      feeAccountId,
      feeItemId,
      discountType,
      value,
      reason,
    } = req.body;

    if (!feeAccountId || !feeItemId || !discountType || !value || !reason) {
      return res.status(400).json({
        success: false,
        message:
          "feeAccountId, feeItemId, discountType, value and reason are required",
      });
    }

    const feeAccount = await FeeAccount.findById(feeAccountId);

    if (!feeAccount) {
      return res.status(404).json({
        success: false,
        message: "Fee account not found",
      });
    }

    const feeItem = feeAccount.fees.id(feeItemId);

    if (!feeItem) {
      return res.status(404).json({
        success: false,
        message: "Fee item not found",
      });
    }

    let discountAmount;

    try {
      discountAmount = calculateDiscountAmount({
        feeAmount: feeItem.amount,
        discountType,
        value,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    const currentDiscount = Number(feeItem.discount || 0);
    const newTotalDiscount = currentDiscount + discountAmount;

    if (newTotalDiscount > Number(feeItem.amount || 0)) {
      return res.status(400).json({
        success: false,
        message: "Total discount cannot be greater than fee amount",
      });
    }

    feeItem.discount = newTotalDiscount;

    recalculateFeeAccount(feeAccount);

    await feeAccount.save();

    const discount = await FeeDiscount.create({
      studentId: feeAccount.studentId,
      enrollmentId: feeAccount.enrollmentId,
      feeAccountId: feeAccount._id,
      sessionId: feeAccount.sessionId,
      termId: feeAccount.termId,
      feeItemId: feeItem._id,
      feeTypeName: feeItem.feeTypeName,
      discountType,
      value: Number(value),
      discountAmount,
      reason,
      approvedBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Discount applied successfully",
      data: {
        discount,
        feeAccount,
      },
    });
  } catch (error) {
    console.error("Apply discount error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// GET DISCOUNTS
// ===============================
exports.getDiscounts = async (req, res) => {
  try {
    const { studentId, feeAccountId, sessionId, termId, status } = req.query;

    const query = {};

    if (studentId) query.studentId = studentId;
    if (feeAccountId) query.feeAccountId = feeAccountId;
    if (sessionId) query.sessionId = sessionId;
    if (termId) query.termId = termId;
    if (status) query.status = status;

    const discounts = await FeeDiscount.find(query)
      .populate("studentId", "name admissionNumber")
      .populate("sessionId", "name")
      .populate("termId", "name")
      .populate("approvedBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: discounts.length,
      data: discounts,
    });
  } catch (error) {
    console.error("Get discounts error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// CANCEL DISCOUNT
// ===============================
exports.cancelDiscount = async (req, res) => {
  try {
    const discount = await FeeDiscount.findById(req.params.id);

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "Discount not found",
      });
    }

    if (discount.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Discount already cancelled",
      });
    }

    const feeAccount = await FeeAccount.findById(discount.feeAccountId);

    if (!feeAccount) {
      return res.status(404).json({
        success: false,
        message: "Fee account not found",
      });
    }

    const feeItem = feeAccount.fees.id(discount.feeItemId);

    if (!feeItem) {
      return res.status(404).json({
        success: false,
        message: "Fee item not found",
      });
    }

    feeItem.discount = Math.max(
      0,
      Number(feeItem.discount || 0) - Number(discount.discountAmount || 0)
    );

    recalculateFeeAccount(feeAccount);

    discount.status = "cancelled";

    await feeAccount.save();
    await discount.save();

    res.status(200).json({
      success: true,
      message: "Discount cancelled successfully",
      data: {
        discount,
        feeAccount,
      },
    });
  } catch (error) {
    console.error("Cancel discount error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};