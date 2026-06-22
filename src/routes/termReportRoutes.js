// const express = require("express");
// const router = express.Router();
// const {
//   saveClassTeacherComments,
//   savePrincipalComments,
//   getTermReports,
//   getStudentReport,
// } = require("../controllers/termReportController");

// // Comment routes
// router.post("/class-teacher", saveClassTeacherComments);
// router.post("/principal", savePrincipalComments);

// // Fetch routes
// router.get("/", getTermReports);
// router.get("/:enrollmentId", getStudentReport);

// module.exports = router;


// server/src/routes/termReportRoutes.js
const express = require("express");
const router = express.Router();

const {
  saveClassTeacherComments,
  savePrincipalComments,
  getTermReports,
  getStudentReport,
} = require("../controllers/termReportController");

const { protect, restrictToRoles } = require("../middleware/authMiddleware");

// Save class teacher comments
router.post(
  "/class-teacher",
  protect,
  restrictToRoles("class_teacher", "teacher", "admin", "super_admin", "master_admin"),
  saveClassTeacherComments
);

// Save principal comments
router.post(
  "/principal",
  protect,
  restrictToRoles("principal", "admin", "super_admin", "master_admin"),
  savePrincipalComments
);

// Fetch reports by class/arm/session/term
router.get(
  "/",
  protect,
  restrictToRoles("teacher", "class_teacher", "principal", "admin", "super_admin", "master_admin"),
  getTermReports
);

// Fetch single student report
router.get(
  "/:enrollmentId",
  protect,
  restrictToRoles("teacher", "class_teacher", "principal", "admin", "super_admin", "master_admin"),
  getStudentReport
);

module.exports = router;