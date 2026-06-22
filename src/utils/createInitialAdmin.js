// const User = require("../models/User");

// async function createInitialAdmin() {
//   const existingAdmins = await User.countDocuments({ role: "master_admin" });

//   if (existingAdmins === 0) {
//     console.log("No master_admin found. Creating initial master admin...");

//     await User.create({
//       name: "Master Admin",
//       email: "master@school.com",
//       password: "123456", // will be hashed by pre-save hook
//       role: "master_admin",
//       isBlocked: false
//     });

//     console.log("Master Admin created successfully.");
//   }
// }

// module.exports = createInitialAdmin;


const User = require("../models/User");

async function createInitialAdmin() {
  try {
    if (
      !process.env.INITIAL_ADMIN_EMAIL ||
      !process.env.INITIAL_ADMIN_PASSWORD
    ) {
      console.warn("⚠️ Initial admin credentials not provided.");
      return;
    }

    const existingAdmin = await User.findOne({
      role: "master_admin",
    });

    if (existingAdmin) {
      return;
    }

    console.log("Creating initial master admin...");

    await User.create({
      name:
        process.env.INITIAL_ADMIN_NAME || "System Administrator",
      email: process.env.INITIAL_ADMIN_EMAIL,
      password: process.env.INITIAL_ADMIN_PASSWORD,
      role: "master_admin",
      isBlocked: false,
    });

    console.log("✅ Initial master admin created.");
  } catch (error) {
    console.error("❌ Failed to create initial admin:", error.message);
  }
}

module.exports = createInitialAdmin;