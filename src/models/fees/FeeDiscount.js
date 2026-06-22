// models/fees/FeeDiscount.js
const mongoose = require("mongoose");

const feeDiscountSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enrollment",
      required: true,
    },

    feeAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeAccount",
      required: true,
    },

    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },

    termId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Term",
      required: true,
    },

    feeItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    feeTypeName: {
      type: String,
      required: true,
    },

    discountType: {
      type: String,
      enum: ["fixed", "percentage"],
      required: true,
    },

    value: {
      type: Number,
      required: true,
      min: 0,
    },

    discountAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    reason: {
      type: String,
      required: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "cancelled"],
      default: "active",
    },
  },
  { timestamps: true }
);

// module.exports = mongoose.model("FeeDiscount", feeDiscountSchema);
module.exports =
  mongoose.models.FeeDiscount ||
  mongoose.model("FeeDiscount", feeDiscountSchema);