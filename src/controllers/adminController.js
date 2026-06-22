// // server/controllers/adminController.js
// const User = require("../models/User");

// // Create Admin
// const createAdmin = async (req, res) => {
//   try {
//     const { name, email, password, role } = req.body;

//     if (!["admin", "super_admin", "master_admin"].includes(role)) {
//       return res.status(400).json({ message: "Invalid admin role" });
//     }

//     const exists = await User.findOne({ email });
//     if (exists) return res.status(400).json({ message: "Email already exists" });

//     const admin = await User.create({
//       name,
//       email,
//       password,
//       role,
//     });

//     res.status(201).json({ message: "Admin created", admin });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get all Admins
// const getAdmins = async (req, res) => {
//   try {
//     const admins = await User.find({ role: { $in: ["admin", "super_admin"] } }).select(
//       "-password"
//     );
//     res.json(admins);
//   } catch (err) {
//     console.error("Error fetching admins:", err);
//     res.status(500).json({ message: err.message });
//   }
// };

// // Update Admin
// const updateAdmin = async (req, res) => {
//   try {
//     const { name, email, password, role, isBlocked } = req.body;

//     const admin = await User.findById(req.params.id);
//     if (!admin) return res.status(404).json({ message: "Admin not found" });

//     admin.name = name || admin.name;
//     admin.email = email || admin.email;
//     admin.password = password || admin.password;
//     if (role && ["admin", "super_admin"].includes(role)) {
//       admin.role = role;
//     }
//     if (typeof isBlocked !== "undefined") {
//       admin.isBlocked = isBlocked;
//     }

//     await admin.save();
//     res.json({ message: "Admin updated", admin });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Delete Admin
// const deleteAdmin = async (req, res) => {
//   try {
//     const admin = await User.findById(req.params.id);
//     if (!admin) return res.status(404).json({ message: "Admin not found" });

//     await User.findByIdAndDelete(req.params.id);
//     res.json({ message: "Admin deleted" });
//   } catch (err) {
//     console.error("Error deleting admin:", err);
//     res.status(500).json({ message: err.message });
//   }
// };

// module.exports = { createAdmin, getAdmins, updateAdmin, deleteAdmin };


const { StatusCodes } = require("http-status-codes");
const asyncHandler = require("../middleware/asyncHandler");
const User = require("../models/User");

const allowedAdminRoles = ["admin", "super_admin"];

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  userId: user.userId,
  isBlocked: user.isBlocked,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// Create Admin
const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Name, email, password and role are required");
  }

  if (!allowedAdminRoles.includes(role)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid admin role");
  }

  const normalizedEmail = email.toLowerCase().trim();

  const exists = await User.findOne({ email: normalizedEmail });

  if (exists) {
    res.status(StatusCodes.CONFLICT);
    throw new Error("Email already exists");
  }

  const admin = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role,
  });

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Admin created successfully",
    data: sanitizeUser(admin),
  });
});

// Get all Admins
const getAdmins = asyncHandler(async (req, res) => {
  const admins = await User.find({
    role: { $in: allowedAdminRoles },
  }).sort({ createdAt: -1 });

  res.status(StatusCodes.OK).json({
    success: true,
    count: admins.length,
    data: admins,
  });
  console.log("fetched Admins:", admins);
  ;
});

// Update Admin
const updateAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, role, isBlocked } = req.body;

  const admin = await User.findOne({
    _id: req.params.id,
    role: { $in: allowedAdminRoles },
  }).select("+password");

  if (!admin) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Admin not found");
  }

  if (email) {
    const normalizedEmail = email.toLowerCase().trim();

    if (normalizedEmail !== admin.email) {
      const exists = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: admin._id },
      });

      if (exists) {
        res.status(StatusCodes.CONFLICT);
        throw new Error("Email already exists");
      }

      admin.email = normalizedEmail;
    }
  }

  if (name) admin.name = name.trim();
  if (password) admin.password = password;

  if (role) {
    if (!allowedAdminRoles.includes(role)) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid admin role");
    }

    admin.role = role;
  }

  if (typeof isBlocked === "boolean") {
    admin.isBlocked = isBlocked;
  }

  await admin.save();

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Admin updated successfully",
    data: sanitizeUser(admin),
  });
});

// Delete Admin
const deleteAdmin = asyncHandler(async (req, res) => {
  const admin = await User.findOne({
    _id: req.params.id,
    role: { $in: allowedAdminRoles },
  });

  if (!admin) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Admin not found");
  }

  await admin.deleteOne();

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Admin deleted successfully",
  });
});

module.exports = {
  createAdmin,
  getAdmins,
  updateAdmin,
  deleteAdmin,
};