
// src/routes/lessonRoutes.js
const express = require("express");
const multer = require("multer");

const {
  createLesson,
  getLessons,
  getLesson,
  updateLesson,
  deleteLesson,
  getStudentLessons,
  addLessonResources,
  removeLessonResource,
  updateLessonStatus,
  getStudentLesson,
  downloadLessonResource,
} = require("../controllers/lessonController");


const { protect, restrictToRoles } = require("../middleware/authMiddleware");
const { verifyStudent } = require("../middleware/studentAuth");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

router.get("/student/:id", verifyStudent, getStudentLesson);
router.get("/student", verifyStudent, getStudentLessons);
router.get(
  "/student/:lessonId/resources/:resourceId/download",
  verifyStudent,
  downloadLessonResource
);

router.use(protect);

router.get(
  "/",
  restrictToRoles("admin", "super_admin", "master_admin", "principal", "teacher"),
  getLessons
);

router.post(
  "/",
  restrictToRoles("admin", "super_admin", "master_admin", "principal", "teacher"),
  upload.array("files", 10),
  createLesson
);

router.get(
  "/:id",
  restrictToRoles("admin", "super_admin", "master_admin", "principal", "teacher"),
  getLesson
);

router.put(
  "/:id",
  restrictToRoles("admin", "super_admin", "master_admin", "principal", "teacher"),
  updateLesson
);

router.patch(
  "/:id/status",
  restrictToRoles("admin", "super_admin", "master_admin", "principal", "teacher"),
  updateLessonStatus
);

router.post(
  "/:id/resources",
  restrictToRoles("admin", "super_admin", "master_admin", "principal", "teacher"),
  upload.array("files", 10),
  addLessonResources
);

router.delete(
  "/:lessonId/resources/:resourceId",
  restrictToRoles("admin", "super_admin", "master_admin", "principal", "teacher"),
  removeLessonResource
);

router.delete(
  "/:id",
  restrictToRoles("admin", "super_admin", "master_admin", "principal", "teacher"),
  deleteLesson
);

module.exports = router;