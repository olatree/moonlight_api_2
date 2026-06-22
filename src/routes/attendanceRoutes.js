// const express = require("express");
// const router = express.Router();
// const {
//   getAttendanceSummary,
//   saveAttendanceSummary,
//   getStudentAttendance,
// } = require("../controllers/attendanceController");

// router.get("/summary", getAttendanceSummary);
// router.post("/summary", saveAttendanceSummary);
// router.get("/student", getStudentAttendance);

// module.exports = router;


// // server/src/routes/attendanceRoutes.js
// const express = require("express");
// const router = express.Router();

// const {
//   getAttendanceSummary,
//   saveAttendanceSummary,
//   getStudentAttendance,
// } = require("../controllers/attendanceController");

// const { protect, restrictToRoles } = require("../middleware/authMiddleware");

// router.get(
//   "/summary",
//   protect,
//   restrictToRoles("teacher", "Student", "class_teacher", "principal", "admin", "super_admin", "master_admin"),
//   getAttendanceSummary
// );

// router.post(
//   "/summary",
//   protect,
//   restrictToRoles("teacher", "class_teacher", "admin", "super_admin", "master_admin"),
//   saveAttendanceSummary
// );

// router.get(
//   "/student",
//   protect,
//   getStudentAttendance
// );

// module.exports = router;

// server/src/routes/attendanceRoutes.js
const express = require("express");
const router = express.Router();

const {
  getAttendanceSummary,
  saveAttendanceSummary,
  getStudentAttendance,
} = require("../controllers/attendanceController");

const { protect, restrictToRoles } = require("../middleware/authMiddleware");
const { verifyStudent } = require("../middleware/studentAuth");

// Staff routes
router.get(
  "/summary",
  protect,
  restrictToRoles(
    "teacher",
    "class_teacher",
    "principal",
    "admin",
    "super_admin",
    "master_admin"
  ),
  getAttendanceSummary
);

router.post(
  "/summary",
  protect,
  restrictToRoles(
    "teacher",
    "class_teacher",
    "admin",
    "super_admin",
    "master_admin"
  ),
  saveAttendanceSummary
);

// Student portal route
router.get("/student/me", verifyStudent, getStudentAttendance);

// Staff lookup route
router.get(
  "/student",
  protect,
  restrictToRoles(
    "teacher",
    "class_teacher",
    "principal",
    "admin",
    "super_admin",
    "master_admin"
  ),
  getStudentAttendance
);

module.exports = router;