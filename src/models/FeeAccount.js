// // models/FeeAccount.js
// const mongoose = require("mongoose");

// const feeAccountSchema = new mongoose.Schema(
//   {
//     studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
//     enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Enrollment", required: true },
//     sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
//     termId: { type: mongoose.Schema.Types.ObjectId, ref: "Term", required: true },
    
//     // Fee breakdown
//     fees: [
//       {
//         feeStructureId: { type: mongoose.Schema.Types.ObjectId, ref: "FeeStructure" },
//         feeType: { type: String },
//         amount: { type: Number, required: true },
//         paid: { type: Number, default: 0 },
//         due: { type: Number, required: true },
//       }
//     ],
    
//     // Summary
//     totalAmount: { type: Number, required: true, default: 0 },
//     totalPaid: { type: Number, default: 0 },
//     totalDue: { type: Number, default: 0 },
    
//     // Status
//     isFullyPaid: { type: Boolean, default: false },
//     isCarryover: { type: Boolean, default: false }, // Marks if this is carried over from previous term
//     carriedFromTermId: { type: mongoose.Schema.Types.ObjectId, ref: "Term" }, // Which term it came from
    
//     // Payment deadline
//     dueDate: { type: Date },
//     lateFeeApplied: { type: Boolean, default: false },
//   },
//   { timestamps: true }
// );

// // Index for efficient queries
// feeAccountSchema.index({ studentId: 1, sessionId: 1, termId: 1 });
// feeAccountSchema.index({ enrollmentId: 1, termId: 1 });
// feeAccountSchema.index({ totalDue: 1, dueDate: 1 });

// module.exports = mongoose.model("FeeAccount", feeAccountSchema);

// models/FeeAccount.js
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

    fees: [
      {
        feeStructureId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "FeeStructure",
        },

        feeType: {
          type: String,
        },

        description: {
          type: String,
          default: "",
        },

        amount: {
          type: Number,
          required: true,
        },

        paid: {
          type: Number,
          default: 0,
        },

        due: {
          type: Number,
          required: true,
        },

        isCarryoverFee: {
          type: Boolean,
          default: false,
        },

        carriedFromTermId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Term",
        },
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
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

    isFullyPaid: {
      type: Boolean,
      default: false,
    },

    isCarryover: {
      type: Boolean,
      default: false,
    },

    carriedFromTermId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Term",
    },

    carryoverDetails: [
      {
        fromTermId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Term",
        },

        amount: {
          type: Number,
          default: 0,
        },

        carriedOverOn: {
          type: Date,
        },

        carriedOverBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],

    carryoverProcessed: {
      type: Boolean,
      default: false,
    },

    carryoverProcessedOn: {
      type: Date,
    },

    carryoverProcessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    dueDate: {
      type: Date,
    },

    lateFeeApplied: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

feeAccountSchema.index({ studentId: 1, sessionId: 1, termId: 1 });
feeAccountSchema.index({ enrollmentId: 1, termId: 1 });
feeAccountSchema.index({ totalDue: 1, dueDate: 1 });
feeAccountSchema.index({ carryoverProcessed: 1 });
feeAccountSchema.index({ isCarryover: 1 });

module.exports = mongoose.model("FeeAccount", feeAccountSchema);