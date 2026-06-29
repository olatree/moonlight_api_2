// server/src/models/ResultPublication.js
const mongoose = require("mongoose");

const resultPublicationSchema = new mongoose.Schema(
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

    isPublished: {
      type: Boolean,
      default: false,
    },

    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

resultPublicationSchema.index(
  { sessionId: 1, termId: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.ResultPublication ||
  mongoose.model("ResultPublication", resultPublicationSchema);