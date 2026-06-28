const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    studentCategory: {
      type: String,
      enum: ["returning", "new_intake", "transfer"],
      default: "returning",
    },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    armId: { type: mongoose.Schema.Types.ObjectId, ref: "Arm", required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
    termId: { type: mongoose.Schema.Types.ObjectId, ref: "Term", default: null },
    // isBlocked: { type: Boolean, default: false },
    isRepeating: { type: Boolean, default: false }, // repeating class
    previousEnrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enrollment",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Enrollment", enrollmentSchema);
