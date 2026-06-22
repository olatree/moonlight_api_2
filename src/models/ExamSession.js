const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    selected: { type: String, enum: ["A", "B", "C", "D"], default: null },
    answeredAt: { type: Date },
    flagged: { type: Boolean, default: false }, // student marked for review
  },
  { _id: false }
);

const examSessionSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },

    // NOTE: references Student, NOT User — matches your architecture
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },

    // Snapshot of enrollment at time of exam — avoids issues if student moves class
    enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Enrollment" },

    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
    timeSpent: { type: Number }, // seconds, computed on submit

    status: {
      type: String,
      enum: ["ongoing", "submitted", "timed_out"],
      default: "ongoing",
    },
    autoSubmitted: { type: Boolean, default: false },

    // Stores the question order as presented to THIS student
    // Critical: if shuffled, we must score against this order
    questionOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],

    answers: [answerSchema],

    // Populated on submit
    score: { type: Number },
    total: { type: Number },
    percentage: { type: Number },
    passed: { type: Boolean },
  },
  { timestamps: true }
);

// One student can only have one session per exam
examSessionSchema.index({ exam: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("ExamSession", examSessionSchema);