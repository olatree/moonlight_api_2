// controllers/cbt/examSession.controller.js
const ExamSession = require("../../models/ExamSession");
const Exam = require("../../models/Exam");
const Question = require("../../models/Question");

// ── helpers ──────────────────────────────────────────────────────────────────
const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const computeScore = (questions, answers) => {
  let score = 0;
  let total = 0;
  questions.forEach((q) => {
    total += q.marks;
    const ans = answers.find((a) => a.question.equals(q._id));
    if (ans?.selected === q.correctOption) score += q.marks;
  });
  return { score, total, percentage: Math.round((score / total) * 100) };
};

// ── START SESSION ─────────────────────────────────────────────────────────────
// POST /api/cbt/sessions/start/:examId
exports.startSession = async (req, res) => {
  try {
    const { exam, enrollment } = req; // injected by checkExamEligibility middleware

    // If session already exists, return it (handles page refresh)
    const existing = await ExamSession.findOne({
      exam: exam._id,
      student: req.student._id,
    });

    if (existing) {
      if (existing.status !== "ongoing") {
        return res.status(403).json({ message: "You have already submitted this exam" });
      }

      // Check if timer has actually expired server-side
      const elapsed = (Date.now() - existing.startedAt.getTime()) / 1000 / 60; // minutes
      if (elapsed >= exam.duration) {
        return res.status(403).json({ message: "Your exam time has expired" });
      }

      // Resume — return session with time remaining
      const timeRemaining = Math.round(exam.duration * 60 - elapsed * 60); // seconds
      return res.json({ session: existing, timeRemaining, resumed: true });
    }

    // Determine question order
    let questionOrder = [...exam.questions]; // array of ObjectIds
    if (exam.shuffleQuestions) questionOrder = shuffleArray(questionOrder);

    const session = await ExamSession.create({
      exam: exam._id,
      student: req.student._id,
      enrollmentId: enrollment._id,
      questionOrder,
      answers: [],
      status: "ongoing",
    });

    const timeRemaining = exam.duration * 60; // full duration in seconds
    res.status(201).json({ session, timeRemaining, resumed: false });
  } catch (err) {
    // Catch duplicate key — race condition where student hits start twice
    if (err.code === 11000) {
      return res.status(409).json({ message: "Session already exists, please refresh" });
    }
    res.status(500).json({ message: err.message });
  }
};

// ── GET SESSION (resume) ──────────────────────────────────────────────────────
// GET /api/cbt/sessions/:sessionId
exports.getSession = async (req, res) => {
  try {
    const session = await ExamSession.findById(req.params.sessionId);

    if (!session) return res.status(404).json({ message: "Session not found" });

    // Students can only access their own session
    if (!session.student.equals(req.student._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const exam = await Exam.findById(session.exam);

    // Compute remaining time
    const elapsed = (Date.now() - session.startedAt.getTime()) / 1000; // seconds
    const timeRemaining = Math.max(0, exam.duration * 60 - elapsed);

    // Fetch questions in the stored order — strip correct answers before sending
    const questions = await Question.find(
      { _id: { $in: session.questionOrder } },
      { correctOption: 0 } // never send correct answer to client
    );

    // Re-sort by questionOrder to preserve shuffle
    const ordered = session.questionOrder.map((id) =>
      questions.find((q) => q._id.equals(id))
    );

    res.json({ session, questions: ordered, timeRemaining, exam });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── SAVE ANSWER (auto-save on each selection) ─────────────────────────────────
// PATCH /api/cbt/sessions/:sessionId/answer
exports.saveAnswer = async (req, res) => {
  try {
    const { questionId, selected, flagged } = req.body;

    if (!["A", "B", "C", "D"].includes(selected)) {
      return res.status(400).json({ message: "Invalid option" });
    }

    const session = await ExamSession.findById(req.params.sessionId);

    if (!session) return res.status(404).json({ message: "Session not found" });
    if (!session.student.equals(req.student._id)) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (session.status !== "ongoing") {
      return res.status(400).json({ message: "Session is no longer active" });
    }

    // Server-side timer check — reject answers after time expires
    const exam = await Exam.findById(session.exam);
    const elapsed = (Date.now() - session.startedAt.getTime()) / 1000 / 60;
    if (elapsed > exam.duration) {
      // Auto-submit instead of just rejecting
      return exports.submitSession(req, res);
    }

    // Upsert answer
    const idx = session.answers.findIndex((a) => a.question.equals(questionId));
    if (idx > -1) {
      session.answers[idx].selected = selected;
      session.answers[idx].answeredAt = new Date();
      if (flagged !== undefined) session.answers[idx].flagged = flagged;
    } else {
      session.answers.push({
        question: questionId,
        selected,
        answeredAt: new Date(),
        flagged: flagged ?? false,
      });
    }

    await session.save();
    res.json({ saved: true, answeredCount: session.answers.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── TOGGLE FLAG (mark question for review without changing answer) ─────────────
// PATCH /api/cbt/sessions/:sessionId/flag
exports.toggleFlag = async (req, res) => {
  try {
    const { questionId } = req.body;
    const session = await ExamSession.findById(req.params.sessionId);

    if (!session?.student.equals(req.student._id)) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (session.status !== "ongoing") {
      return res.status(400).json({ message: "Session is no longer active" });
    }

    const ans = session.answers.find((a) => a.question.equals(questionId));
    if (ans) {
      ans.flagged = !ans.flagged;
    } else {
      // Flag without answering
      session.answers.push({ question: questionId, selected: null, flagged: true });
    }

    await session.save();
    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── SUBMIT SESSION ────────────────────────────────────────────────────────────
// POST /api/cbt/sessions/:sessionId/submit
exports.submitSession = async (req, res) => {
  try {
    const session = await ExamSession.findById(req.params.sessionId);

    if (!session) return res.status(404).json({ message: "Session not found" });
    if (!session.student.equals(req.student._id)) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (session.status !== "ongoing") {
      return res.status(400).json({ message: "Exam already submitted" });
    }

    const exam = await Exam.findById(session.exam);

    // Fetch questions with correct answers (server-side only)
    const questions = await Question.find({ _id: { $in: session.questionOrder } });

    const { score, total, percentage } = computeScore(questions, session.answers);
    const passed = percentage >= exam.passMark;
    const timeSpent = Math.round((Date.now() - session.startedAt.getTime()) / 1000);
    const autoSubmitted = req.body?.autoSubmitted ?? false;

    session.status = autoSubmitted ? "timed_out" : "submitted";
    session.submittedAt = new Date();
    session.autoSubmitted = autoSubmitted;
    session.score = score;
    session.total = total;
    session.percentage = percentage;
    session.passed = passed;
    session.timeSpent = timeSpent;

    await session.save();

    // Only return result details if exam is configured to show immediately
    if (exam.showResultAfter || exam.releaseResult) {
      return res.json({ submitted: true, score, total, percentage, passed });
    }

    res.json({ submitted: true, message: "Your exam has been submitted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};