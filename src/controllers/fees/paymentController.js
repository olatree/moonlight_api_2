// src/controllers/fees/paymentController.js

const Payment = require("../../models/fees/Payment");
const FeeAccount = require("../../models/fees/FeeAccount");

const {
  generateReceiptRef,
  applyPaymentToFees,
  reversePaymentFromFees,
  recalculateFeeAccount,
} = require("../../utils/feeUtils");

// ===============================
// RECORD PAYMENT
// ===============================
exports.recordPayment = async (req, res) => {
  try {
    const { feeAccountId, amount, paymentMethod, note } = req.body;

    if (!feeAccountId || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Fee account and valid amount are required",
      });
    }

    const feeAccount = await FeeAccount.findById(feeAccountId);

    if (!feeAccount) {
      return res.status(404).json({
        success: false,
        message: "Fee account not found",
      });
    }

    const paymentAmount = Number(amount);

    const result = applyPaymentToFees(feeAccount.fees, paymentAmount);

    feeAccount.fees = result.fees;

    recalculateFeeAccount(feeAccount);

    await feeAccount.save();

    const payment = await Payment.create({
      studentId: feeAccount.studentId,
      enrollmentId: feeAccount.enrollmentId,
      feeAccountId: feeAccount._id,
      sessionId: feeAccount.sessionId,
      termId: feeAccount.termId,
      amount: paymentAmount,
      paymentMethod: paymentMethod || "cash",
      reference: generateReceiptRef(),
      note: note || "",
      receivedBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        payment,
        feeAccount,
        overpayment: result.overpayment,
      },
    });
  } catch (error) {
    console.error("Record payment error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// GET PAYMENTS
// ===============================
exports.getPayments = async (req, res) => {
  try {
    const { studentId, feeAccountId, sessionId, termId, paymentMethod } =
      req.query;

    const query = {};

    if (studentId) query.studentId = studentId;
    if (feeAccountId) query.feeAccountId = feeAccountId;
    if (sessionId) query.sessionId = sessionId;
    if (termId) query.termId = termId;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    const payments = await Payment.find(query)
      .populate("studentId", "name admissionNumber")
      .populate("sessionId", "name")
      .populate("termId", "name")
      .populate("receivedBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error("Get payments error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// GET SINGLE PAYMENT / RECEIPT
// ===============================
exports.getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("studentId", "name admissionNumber gender parentContact")
      .populate({
        path: "feeAccountId",
        populate: [
          { path: "classId", select: "name" },
          { path: "armId", select: "name" },
        ],
      })
      .populate("sessionId", "name")
      .populate("termId", "name")
      .populate("receivedBy", "name email role");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Get payment error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// VOID PAYMENT
// ===============================
exports.voidPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (payment.status === "voided") {
      return res.status(400).json({
        success: false,
        message: "Payment has already been voided",
      });
    }

    const feeAccount = await FeeAccount.findById(payment.feeAccountId);

    if (!feeAccount) {
      return res.status(404).json({
        success: false,
        message: "Fee account not found",
      });
    }

    feeAccount.fees = reversePaymentFromFees(
      feeAccount.fees,
      payment.amount
    );

    recalculateFeeAccount(feeAccount);

    payment.status = "voided";

    await feeAccount.save();
    await payment.save();

    res.status(200).json({
      success: true,
      message: "Payment voided successfully",
      data: {
        payment,
        feeAccount,
      },
    });
  } catch (error) {
    console.error("Void payment error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};