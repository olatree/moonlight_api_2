
// const express = require("express");
// const router = express.Router();
// const studentController = require("../controllers/studentController");
// const multer = require("multer");
// const { verifyStudent } = require("../middleware/studentAuth");

// // Important: Use memoryStorage so file is available as buffer
// const storage = multer.memoryStorage();
// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype.startsWith("image/")) {
//       cb(null, true);
//     } else {
//       cb(new Error("Only images are allowed"));
//     }
//   },
// });

// // Register student (with optional image)
// router.post("/", upload.single("picture"), studentController.registerStudent);
// router.post("/login", studentController.loginStudent)
// router.get("/", studentController.getStudents);
// router.get("/class-count", studentController.getCount)
// router.patch("/:studentId/block", studentController.blockStudent);
// router.patch("/:studentId/unblock", studentController.unblockStudent);
// // New routes for edit/delete
// router.put("/:studentId", upload.single("picture"), studentController.updateStudent);
// router.delete("/:studentId", studentController.deleteStudent);
// // Get current logged-in student
// router.get("/me", verifyStudent, studentController.getMe);

// // Logout student
// router.post("/logout", studentController.logoutStudent);



// module.exports = router;


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