// const mongoose = require("mongoose");

// const examSchema = new mongoose.Schema(
//   {
//     title: { type: String, required: true, trim: true },
//     subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
//     classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
//     armId: { type: mongoose.Schema.Types.ObjectId, ref: "Arm" }, // null = all arms in class
//     sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

//     questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
//     duration: { type: Number, required: true }, // minutes
//     startTime: { type: Date, required: true },
//     endTime: { type: Date, required: true },
//     passMark: { type: Number, default: 50 }, // percentage

//     instructions: { type: String, default: "" },
//     shuffleQuestions: { type: Boolean, default: true },
//     shuffleOptions: { type: Boolean, default: false },
//     showResultAfter: { type: Boolean, default: false }, // if false, teacher releases manually
//     releaseResult: { type: Boolean, default: false },   // admin/teacher flips this

//     status: {
//       type: String,
//       enum: ["draft", "active", "closed"],
//       default: "draft",
//     },
//   },
//   { timestamps: true }
// );

// // Validate endTime is after startTime
// examSchema.pre("save", function (next) {
//   if (this.endTime <= this.startTime) {
//     return next(new Error("endTime must be after startTime"));
//   }
//   next();
// });

// module.exports = mongoose.model("Exam", examSchema);

// models/Exam.js
const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    armId: { type: mongoose.Schema.Types.ObjectId, ref: "Arm" },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
    termId: { type: mongoose.Schema.Types.ObjectId, ref: "Term", required: true }, // ← new
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    duration: { type: Number, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    passMark: { type: Number, default: 50 },

    instructions: { type: String, default: "" },
    shuffleQuestions: { type: Boolean, default: true },
    shuffleOptions: { type: Boolean, default: false },
    showResultAfter: { type: Boolean, default: false },
    releaseResult: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["draft", "active", "closed"],
      default: "draft",
    },
  },
  { timestamps: true }
);

examSchema.pre("save", function (next) {
  if (this.endTime <= this.startTime) {
    return next(new Error("endTime must be after startTime"));
  }
  next();
});

module.exports = mongoose.model("Exam", examSchema);