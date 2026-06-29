

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
    },

    admissionNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    dateOfBirth: Date,

    gender: {
      type: String,
      enum: ["Male", "Female"],
    },

    parentContact: {
      type: String,
      trim: true,
    },

    image: {
      type: String,
      default: null,
    },

    blocked: {
      type: Boolean,
      default: false,
      index: true,
    },

    archived: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
  type: String,
  enum: ["active", "graduated", "archived"],
  default: "active",
  index: true,
},

graduatedAt: {
  type: Date,
  default: null,
},

graduatedSessionId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Session",
  default: null,
},

    password: {
      type: String,
      select: false,
    },
  },
  { timestamps: true }
);

studentSchema.pre("save", async function (next) {
  if (this.name) {
    this.name = this.name
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  if (!this.password && this.name) {
    const firstName = this.name.trim().split(" ")[0].toLowerCase();
    this.password = firstName;
  }

  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }

  next();
});

studentSchema.pre("save", async function (next) {
  if (this.admissionNumber) return next();

  for (let attempts = 0; attempts < 10; attempts++) {
    const admission = Math.floor(100000 + Math.random() * 900000).toString();
    const exists = await this.constructor.exists({ admissionNumber: admission });

    if (!exists) {
      this.admissionNumber = admission;
      return next();
    }
  }

  next(new Error("Failed to generate unique admission number"));
});

studentSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

studentSchema.methods.toJSON = function () {
  const student = this.toObject();
  delete student.password;
  delete student.__v;
  return student;
};

module.exports = mongoose.model("Student", studentSchema);