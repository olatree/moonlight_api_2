// routes/cbt/index.js
const express = require("express");
const router = express.Router();
const multer = require("multer");

const { protect, restrictToRoles } = require("../../middleware/authMiddleware");
const { verifyStudent } = require("../../middleware/studentAuth");
const checkEligibility = require("../../middleware/cbt/checkExamEligibility");

const bankCtrl     = require("../../controllers/cbt/questionBank.controller");
const questionCtrl = require("../../controllers/cbt/question.controller");
const examCtrl     = require("../../controllers/cbt/exam.controller");
const sessionCtrl  = require("../../controllers/cbt/examSession.controller");

// ── Student-facing ───────────────────────────────────────────────────────────
router.get("/student/exams", verifyStudent, examCtrl.getAvailableExams);
router.post(
  "/student/sessions/start/:examId",
  verifyStudent,
  checkEligibility,
  sessionCtrl.startSession
);
router.get("/student/sessions/:sessionId",          verifyStudent, sessionCtrl.getSession);
router.patch("/student/sessions/:sessionId/answer", verifyStudent, sessionCtrl.saveAnswer);
router.patch("/student/sessions/:sessionId/flag",   verifyStudent, sessionCtrl.toggleFlag);
router.post("/student/sessions/:sessionId/submit",  verifyStudent, sessionCtrl.submitSession);

router.use(protect);
router.use(restrictToRoles("admin", "super_admin", "principal", "master_admin"));

// const staff = ["teacher", "class_teacher", "admin", "super_admin", "principal"];

// ── Multer: image upload (question diagrams) ─────────────────────────────────
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// ── Multer: Excel upload (bulk question import) ──────────────────────────────
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel",                                           // .xls
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files (.xlsx, .xls) are allowed"));
    }
  },
});

// ── Question Banks ───────────────────────────────────────────────────────────
router.post("/banks", bankCtrl.createBank);
router.get("/banks", bankCtrl.getBanks);
router.get("/banks/:bankId", bankCtrl.getBank);
router.put("/banks/:bankId", bankCtrl.updateBank);
router.delete("/banks/:bankId", bankCtrl.deleteBank);

// ── Questions ────────────────────────────────────────────────────────────────
// NOTE: /import/:bankId must be registered BEFORE /questions POST
// to prevent Express matching "import" as a question ID
router.post(
  "/questions/import/:bankId",
  excelUpload.single("file"),
  questionCtrl.bulkImport
);
router.post(
  "/questions",
  imageUpload.single("image"),
  questionCtrl.createQuestion
);
router.get("/questions", questionCtrl.getQuestions);
router.put(
  "/questions/:questionId",
  imageUpload.single("image"),
  questionCtrl.updateQuestion
);
router.delete("/questions/:questionId", questionCtrl.deleteQuestion);

// ── Exams (staff) ────────────────────────────────────────────────────────────
router.post("/exams",  examCtrl.createExam);
router.get("/exams",  examCtrl.getExams);

// NOTE: /exams/:examId/results must be before /exams/:examId
// to prevent Express treating "results" as an examId
router.get("/exams/:examId/results",  examCtrl.getExamResults);
router.get("/exams/:examId", examCtrl.getExam);
router.put("/exams/:examId",examCtrl.updateExam);
router.patch(
  "/exams/:examId/status",
  // protect,
  // restrictToRoles("admin", "super_admin", "principal"), // teachers cannot activate/close
  examCtrl.updateExamStatus
);
router.patch(
  "/exams/:examId/release",
  // protect,
  // restrictToRoles("admin", "super_admin", "principal"), // teachers cannot release results
  examCtrl.releaseResults
);
router.delete(
  "/exams/:examId",
  // protect,
  // restrictToRoles("admin", "super_admin", "principal"), // teachers cannot delete exams
  examCtrl.deleteExam
);



module.exports = router;