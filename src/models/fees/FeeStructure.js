// src/models/fees/FeeStructure.js

const mongoose = require("mongoose");

const feeStructureSchema = new mongoose.Schema(
  {
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

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    armId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Arm",
      default: null,
    },

    fees: [
      {
        feeTypeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "FeeType",
          required: true,
        },

        feeTypeName: {
          type: String,
          required: true,
        },

        amount: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    totalAmount: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

feeStructureSchema.index(
  { sessionId: 1, termId: 1, classId: 1, armId: 1 },
  { unique: true }
);

feeStructureSchema.pre("save", function (next) {
  this.totalAmount = this.fees.reduce(
    (sum, fee) => sum + Number(fee.amount || 0),
    0
  );

  next();
});

module.exports =
  mongoose.models.FeeStructure ||
  mongoose.model("FeeStructure", feeStructureSchema);