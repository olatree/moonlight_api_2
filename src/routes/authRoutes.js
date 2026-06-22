// const express = require("express");
// const { register, login, logout, me } = require("../controllers/authController");
// const { protect } = require("../middleware/authMiddleware");

// const router = express.Router();

// router.post("/register", register);
// router.post("/login", login);
// router.post("/logout", logout);
// router.get("/me", protect, me);
// router.get("/users", protect, me);

// module.exports = router;


const express = require("express");

const {
  register,
  login,
  logout,
  logoutAll,
  refresh,
  me,
  getUsers,
} = require("../controllers/authController");

const {
  protect,
  restrictToRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refresh);

// Protected routes
router.get("/me", protect, me);

// Admin-only routes
router.get(
  "/users",
  protect,
  restrictToRoles("master_admin", "super_admin"),
  getUsers
);

router.post(
  "/logout-all",
  protect,
  logoutAll
);

module.exports = router;