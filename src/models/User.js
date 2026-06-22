// // server/models/User.js
// const mongoose = require("mongoose");
// const bcrypt = require("bcryptjs");

// const roles = [
//   "student",
//   "teacher",
//   "class_teacher",
//   "principal",
//   "admin",
//   "super_admin",
//   "master_admin"
// ];

// const userSchema = new mongoose.Schema(
//   {
//     // Common fields for all users
//     name: { type: String, required: true },
//     email: { type: String, required: true, unique: true },
//     password: { type: String, required: true, minlength: 3 },
//     role: { type: String, enum: roles, default: "student" },
//     picture: { type: String }, // Stores path or URL of the teacher's picture
//     signature: { type: String }, // Stores path or URL of the teacher's signature

//     // Unique 6-digit ID for login
//     userId: { type: String, unique: true },

//     // Student-specific
//     class: { type: String }, // e.g., JSS1A

//     // Teacher-specific
//     phone: { type: String },
//     subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subject" }], // multiple subjects
//     classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }], // multiple classes
//     isClassTeacher: { type: Boolean, default: false },
//     classTeacherOf: { type: mongoose.Schema.Types.ObjectId, ref: "Class", default: null },
//     hireDate: { type: Date }, // only set for teachers

//     // Admin/super admin controls
//     isBlocked: { type: Boolean, default: false },
//   },
//   { timestamps: true }
// );

// // Generate unique 6-digit userId before save
// userSchema.pre("save", async function (next) {
//   if (!this.isNew) return next();

//   let unique = false;
//   while (!unique) {
//     const id = Math.floor(100000 + Math.random() * 900000).toString();
//     const existing = await this.constructor.findOne({ userId: id });
//     if (!existing) {
//       this.userId = id;
//       unique = true;
//     }
//   }

//   // If teacher, set hireDate if not already set
//   if (["teacher", "class_teacher"].includes(this.role) && !this.hireDate) {
//     this.hireDate = new Date();
//   }

//   next();
// });

// // Hash password before save
// userSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

// // Method to check password
// userSchema.methods.matchPassword = async function (enteredPassword) {
//   return await bcrypt.compare(enteredPassword, this.password);
// };

// module.exports = mongoose.model("User", userSchema);


const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const roles = [
  "student",
  "teacher",
  "class_teacher",
  "principal",
  "admin",
  "super_admin",
  "master_admin",
];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [3, "Password must be at least 6 characters"],
      select: false,
    },

    role: {
      type: String,
      enum: roles,
      default: "student",
      index: true,
    },

    picture: { type: String },
    signature: { type: String },

    userId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    class: { type: String },

    phone: { type: String, trim: true },

    subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subject" }],
    classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],

    isClassTeacher: { type: Boolean, default: false },

    classTeacherOf: {
      // type: mongoose.Schema.Types.ObjectId,
      // ref: "Class",
      // default: null,
      classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
        default: null,
      },
      armId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Arm",
        default: null,
      },
    },

    hireDate: { type: Date },

    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isNew || this.userId) return next();

  for (let attempts = 0; attempts < 5; attempts++) {
    const id = Math.floor(100000 + Math.random() * 900000).toString();
    const existing = await this.constructor.exists({ userId: id });

    if (!existing) {
      this.userId = id;
      break;
    }
  }

  if (!this.userId) {
    return next(new Error("Failed to generate unique user ID"));
  }

  next();
});

userSchema.pre("save", function (next) {
  if (["teacher", "class_teacher"].includes(this.role) && !this.hireDate) {
    this.hireDate = new Date();
  }

  next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

module.exports = mongoose.model("User", userSchema);