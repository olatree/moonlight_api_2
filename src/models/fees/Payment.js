// models/fees/Payment.js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
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

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "pos", "online", "cheque"],
      default: "cash",
    },

    reference: {
      type: String,
      required: true,
      unique: true,
    },

    note: {
      type: String,
      default: "",
    },

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["successful", "voided"],
      default: "successful",
    },
  },
  { timestamps: true }
);

// module.exports = mongoose.model("Payment", paymentSchema);
module.exports =
  mongoose.models.Payment ||
  mongoose.model("Payment", paymentSchema);