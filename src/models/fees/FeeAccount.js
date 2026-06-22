// models/fees/FeeAccount.js
const mongoose = require("mongoose");

const feeAccountSchema = new mongoose.Schema(
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
      required: true,
    },

    feeStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeStructure",
      required: true,
    },

    previousBalance: {
      type: Number,
      default: 0,
    },

    previousFeeAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeAccount",
      default: null,
    },

    fees: [
      {
        feeTypeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "FeeType",
        },

        feeTypeName: {
          type: String,
          required: true,
        },

        amount: {
          type: Number,
          required: true,
          default: 0,
        },

        discount: {
          type: Number,
          default: 0,
        },

        netAmount: {
          type: Number,
          required: true,
          default: 0,
        },

        paid: {
          type: Number,
          default: 0,
        },

        due: {
          type: Number,
          required: true,
          default: 0,
        },
      },
    ],

    totalAmount: {
      type: Number,
      default: 0,
    },

    totalDiscount: {
      type: Number,
      default: 0,
    },

    netPayable: {
      type: Number,
      default: 0,
    },

    totalPaid: {
      type: Number,
      default: 0,
    },

    totalDue: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["unpaid", "part_payment", "paid", "overpaid"],
      default: "unpaid",
    },
  },
  { timestamps: true }
);

feeAccountSchema.index(
  { studentId: 1, sessionId: 1, termId: 1 },
  { unique: true }
);

feeAccountSchema.methods.recalculate = function () {
  this.totalAmount = this.fees.reduce((sum, fee) => sum + Number(fee.amount || 0), 0);

  this.totalDiscount = this.fees.reduce((sum, fee) => sum + Number(fee.discount || 0), 0);

  this.fees = this.fees.map((fee) => {
    fee.netAmount = Number(fee.amount || 0) - Number(fee.discount || 0);
    fee.due = Number(fee.netAmount || 0) - Number(fee.paid || 0);
    return fee;
  });

  const currentTermNetAmount = this.fees.reduce(
    (sum, fee) => sum + Number(fee.netAmount || 0),
    0
  );

  this.netPayable = currentTermNetAmount + Number(this.previousBalance || 0);

  this.totalPaid = this.fees.reduce((sum, fee) => sum + Number(fee.paid || 0), 0);

  this.totalDue = this.netPayable - this.totalPaid;

  if (this.totalPaid <= 0) {
    this.status = "unpaid";
  } else if (this.totalDue <= 0) {
    this.status = this.totalDue < 0 ? "overpaid" : "paid";
  } else {
    this.status = "part_payment";
  }
};

// module.exports = mongoose.model("FeeAccount", feeAccountSchema);
module.exports =
  mongoose.models.FeeAccount ||
  mongoose.model("FeeAccount", feeAccountSchema);