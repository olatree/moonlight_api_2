const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/User");

dotenv.config();
mongoose.connect(process.env.MONGO_URI);

const seedSuperAdmin = async () => {
  try {
    const existingSuperAdmin = await User.findOne({ role: "super_admin" });

    if (existingSuperAdmin) {
      console.log("Super Admin already exists:", existingSuperAdmin.userId);
      process.exit();
    }

    const superAdmin = new User({
      name: "Super Admin",
      email: "superadmin@school.com", // only for reference, not used for login
      password: "superadmin123", // will be hashed
      role: "super_admin",
    });

    await superAdmin.save();

    console.log("✅ Super Admin seeded successfully");
    console.log("👉 Login ID:", superAdmin.userId);
    console.log("👉 Password: superadmin123");
    process.exit();
  } catch (err) {
    console.error("❌ Error seeding Super Admin:", err);
    process.exit(1);
  }
};

// module.exports = seedSuperAdmin;

// ✅ Run automatically if script is called directly
if (require.main === module) {
  seedSuperAdmin();
}