const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema(
  {
    id: { type: String, enum: ["A", "B", "C", "D"], required: true },
    text: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    bank: { type: mongoose.Schema.Types.ObjectId, ref: "QuestionBank", required: true },
    body: { type: String, required: true, trim: true },
    image: { type: String, default: null }, // Cloudinary URL, matches your pattern
    options: {
      type: [optionSchema],
      validate: {
        validator: v => v.length === 4,
        message: "A question must have exactly 4 options",
      },
    },
    correctOption: { type: String, enum: ["A", "B", "C", "D"], required: true },
    topic: { type: String, trim: true, default: "General" },
    marks: { type: Number, default: 1, min: 1 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Question", questionSchema);