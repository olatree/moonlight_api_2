const mongoose = require("mongoose");

const questionBankSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // teacher/admin
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

// A teacher shouldn't have two banks with same title for same subject+class
questionBankSchema.index({ subject: 1, classId: 1, title: 1 }, { unique: true });

module.exports = mongoose.model("QuestionBank", questionBankSchema);