

const express = require("express");
const multer = require("multer");

const studentController = require("../controllers/studentController");
const { verifyStudent } = require("../middleware/studentAuth");

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"));
    }
  },
});

// Auth routes
router.post("/login", studentController.loginStudent);
router.get("/me", verifyStudent, studentController.getMe);
router.post("/logout", studentController.logoutStudent);
router.get("/me/profile", verifyStudent, studentController.getStudentProfile);

// Query/special routes
router.get("/class-count", studentController.getCount);

// CRUD routes
router.post("/", upload.single("picture"), studentController.registerStudent);
router.get("/", studentController.getStudents);
router.patch("/:studentId/block", studentController.blockStudent);
router.patch("/:studentId/unblock", studentController.unblockStudent);
router.put("/:studentId", upload.single("picture"), studentController.updateStudent);
router.delete("/:studentId", studentController.deleteStudent);

module.exports = router;