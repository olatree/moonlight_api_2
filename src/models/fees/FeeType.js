// models/fees/FeeType.js

const mongoose = require("mongoose");

const feeTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    description: {
      type: String,
      default: "",
    },

    isCompulsory: {
      type: Boolean,
      default: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    archivedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// module.exports = mongoose.model("FeeType", feeTypeSchema);
module.exports =
  mongoose.models.FeeType ||
  mongoose.model("FeeType", feeTypeSchema);