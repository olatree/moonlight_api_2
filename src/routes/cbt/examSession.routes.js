// routes/cbt/examSession.routes.js
const router = require("express").Router();
const { verifyStudent } = require("../../middleware/studentAuth"); // your existing middleware
const checkEligibility = require("../../middleware/cbt/checkExamEligibility");
const {
  startSession,
  getSession,
  saveAnswer,
  toggleFlag,
  submitSession,
} = require("../../controllers/cbt/examSession.controller");

router.post("/start/:examId", verifyStudent, checkEligibility, startSession);
router.get("/:sessionId",     verifyStudent, getSession);
router.patch("/:sessionId/answer", verifyStudent, saveAnswer);
router.patch("/:sessionId/flag",   verifyStudent, toggleFlag);
router.post("/:sessionId/submit",  verifyStudent, submitSession);

module.exports = router;