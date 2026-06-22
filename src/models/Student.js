// const mongoose = require("mongoose");
// const bcrypt = require("bcryptjs");

// const studentSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true, trim: true },
//     admissionNumber: { type: String, unique: true },
//     dateOfBirth: { type: Date },
//     gender: { type: String, enum: ["Male", "Female"] },
//     parentContact: { type: String },
//     image: { type: String, default: null }, // Cloudinary URL
//     blocked: { type: Boolean, default: false },
//     archived: { type: Boolean, default: false },
//     password: { type: String}, // Added password field
//   },
//   { timestamps: true }
// );

// // ====== SANITIZE NAME & AUTO-GENERATE PASSWORD ======
// studentSchema.pre("save", async function (next) {
//   // Format name: capitalize each word
//   if (this.name) {
//     this.name = this.name
//       .split(" ")
//       .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
//       .join(" ");
//   }

//   // If password not set, use first name (first word)
//   if (!this.password && this.name) {
//     const parts = this.name.trim().split(" ");
//     const firstName = parts[0].toLowerCase();
//     this.password = firstName;
//   }

//   // Hash password if modified or new
//   if (this.isModified("password")) {
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//   }

//   next();
// });

// // Auto-generate 6-digit admission number if not provided
// studentSchema.pre("save", async function (next) {
//   if (!this.admissionNumber) {
//     let unique = false;
//     let admission;
//     while (!unique) {
//       admission = Math.floor(100000 + Math.random() * 900000).toString();
//       const exists = await mongoose.model("Student").findOne({ admissionNumber: admission });
//       if (!exists) unique = true;
//     }
//     this.admissionNumber = admission;
//   }
//   next();
// });

// module.exports = mongoose.model("Student", studentSchema);


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