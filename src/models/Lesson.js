// src/models/Lesson.js
const mongoose = require("mongoose");

const lessonResourceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["document", "video_link", "text"],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    content: {
      type: String,
      default: "",
    },

    fileUrl: {
      type: String,
      default: "",
    },

    filePublicId: {
      type: String,
      default: "",
    },

    fileName: {
      type: String,
      default: "",
    },

    fileMimeType: {
      type: String,
      default: "",
    },

    fileResourceType: {
      type: String,
      enum: ["image", "raw", "video"],
      default: "raw",
    },

    videoUrl: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    week: {
      type: Number,
      default: 1,
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

    termName: {
      type: String,
      trim: true,
      default: "",
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

    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    resources: [lessonResourceSchema],

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Lesson || mongoose.model("Lesson", lessonSchema);