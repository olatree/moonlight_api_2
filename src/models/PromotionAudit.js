const mongoose = require("mongoose");

const promotionAuditSchema = new mongoose.Schema(
  {
    batchId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    action: { type: String, enum: ["promote", "repeat", "graduate"], required: true },

    fromSessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
    fromClassId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    fromArmId: { type: mongoose.Schema.Types.ObjectId, ref: "Arm", required: true },
    fromEnrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Enrollment", required: true },

    // promote/repeat only
    toSessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
    toClassId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
    toArmId: { type: mongoose.Schema.Types.ObjectId, ref: "Arm" },
    newEnrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Enrollment" },

    // graduate only — snapshot so rollback can restore exactly
    previousStudentStatus: { type: String, default: null },
    previousGraduatedAt: { type: Date, default: null },
    previousGraduatedSessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", default: null },

    performedBy: { type: mongoose.Schema.Types.ObjectId, required: true },

    rolledBack: { type: Boolean, default: false },
    rolledBackAt: { type: Date, default: null },
    rolledBackBy: { type: mongoose.Schema.Types.ObjectId, default: null },

    editHistory: [
      {
        editedAt: { type: Date, default: Date.now },
        editedBy: mongoose.Schema.Types.ObjectId,
        previousToClassId: mongoose.Schema.Types.ObjectId,
        previousToArmId: mongoose.Schema.Types.ObjectId,
        previousAction: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("PromotionAudit", promotionAuditSchema);