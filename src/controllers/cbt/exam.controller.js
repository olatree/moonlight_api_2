// controllers/cbt/exam.controller.js
const Exam = require("../../models/Exam");
const ExamSession = require("../../models/ExamSession");
const Question = require("../../models/Question");
const Enrollment = require("../../models/Enrollment");
const Session = require("../../models/Session");
const Term = require("../../models/Term");

// POST /api/cbt/exams — create exam
// exports.createExam = async (req, res) => {
//   try {
//     const {
//       title, subject, classId, armId, sessionId,
//       questionIds, duration, startTime, endTime,
//       passMark, instructions, shuffleQuestions,
//       shuffleOptions, showResultAfter,
//     } = req.body;

//     // Validate all question IDs actually exist
//     const questions = await Question.find({ _id: { $in: questionIds } });
//     if (questions.length !== questionIds.length) {
//       return res.status(400).json({ message: "One or more question IDs are invalid" });
//     }

//     const exam = await Exam.create({
//       title, subject, classId,
//       armId: armId || null,
//       sessionId,
//       createdBy: req.user._id,
//       questions: questionIds,
//       duration,
//       startTime,
//       endTime,
//       passMark: passMark ?? 50,
//       instructions: instructions || "",
//       shuffleQuestions: shuffleQuestions ?? true,
//       shuffleOptions: shuffleOptions ?? false,
//       showResultAfter: showResultAfter ?? false,
//       status: "draft",
//     });

//     res.status(201).json(exam);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

exports.createExam = async (req, res) => {
  try {
    const {
      title, subject, classId, armId, sessionId, termId, // ← add termId
      questionIds, duration, startTime, endTime,
      passMark, instructions, shuffleQuestions,
      shuffleOptions, showResultAfter,
    } = req.body;

    if (!termId) {
      return res.status(400).json({ message: "termId is required" });
    }

    const questions = await Question.find({ _id: { $in: questionIds } });
    if (questions.length !== questionIds.length) {
      return res.status(400).json({ message: "One or more question IDs are invalid" });
    }

    const exam = await Exam.create({
      title, subject, classId,
      armId: armId || null,
      sessionId,
      termId,            // ← add termId
      createdBy: req.user._id,
      questions: questionIds,
      duration,
      startTime,
      endTime,
      passMark: passMark ?? 50,
      instructions: instructions || "",
      shuffleQuestions: shuffleQuestions ?? true,
      shuffleOptions: shuffleOptions ?? false,
      showResultAfter: showResultAfter ?? false,
      status: "draft",
    });

    res.status(201).json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/cbt/exams — list exams (scoped by role)
// exports.getExams = async (req, res) => {
//   try {
//     const filter = {};

//     if (req.user.role === "teacher") filter.createdBy = req.user._id;
//     if (req.query.classId) filter.classId = req.query.classId;
//     if (req.query.subject) filter.subject = req.query.subject;
//     if (req.query.status) filter.status = req.query.status;
//     if (req.query.sessionId) filter.sessionId = req.query.sessionId;

//     const exams = await Exam.find(filter)
//       .populate("subject", "name")
//       .populate("classId", "name")
//       .populate("armId", "name")
//       .populate("createdBy", "name")
//       .select("-questions") // don't send full question list in index
//       .sort({ createdAt: -1 });

//     res.json(exams);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.getExams = async (req, res) => {
//   try {
//     const filter = {};

//     if (req.user.role === "teacher") filter.createdBy = req.user._id;
//     if (req.query.classId)   filter.classId   = req.query.classId;
//     if (req.query.subject)   filter.subject   = req.query.subject;
//     if (req.query.status)    filter.status    = req.query.status;
//     if (req.query.sessionId) filter.sessionId = req.query.sessionId;
//     if (req.query.termId)    filter.termId    = req.query.termId;   // ← add termId filter

//     const exams = await Exam.find(filter)
//       .populate("subject", "name")
//       .populate("classId", "name")
//       .populate("armId", "name")
//       .populate("createdBy", "name")
//       .select("-questions")
//       .sort({ createdAt: -1 });

//     res.json(exams);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

exports.getExams = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === "teacher") {
      filter.createdBy = req.user._id;
    }

    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.sessionId) filter.sessionId = req.query.sessionId;
    if (req.query.termId) filter.termId = req.query.termId;

    if (req.query.armId) {
      filter.$or = [
        { armId: req.query.armId },
        { armId: null },
        { armId: { $exists: false } },
      ];
    }

    const exams = await Exam.find(filter)
      .populate("subject", "name")
      .populate("classId", "name")
      .populate("armId", "name")
      .populate("createdBy", "name")
      .select("-questions")
      .sort({ createdAt: -1 });

    res.json(exams);
    
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/cbt/exams/:examId — single exam with full questions (no correct answers)
exports.getExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId)
      .populate("subject", "name")
      .populate("classId", "name")
      .populate("armId", "name")
      .populate("createdBy", "name")
      .populate({ path: "questions", select: "-correctOption" }); // strip answers

    if (!exam) return res.status(404).json({ message: "Exam not found" });

    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/cbt/exams/:examId — update exam (only if still draft)
exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    if (req.user.role === "teacher" && !exam.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Prevent editing an exam that's already active or closed
    if (exam.status !== "draft") {
      return res.status(400).json({ message: "Only draft exams can be edited" });
    }

    const editableFields = [
      "title", "duration", "startTime", "endTime", "passMark",
      "instructions", "shuffleQuestions", "shuffleOptions",
      "showResultAfter", "questions", "termId",
    ];

    editableFields.forEach((f) => {
      if (req.body[f] !== undefined) exam[f] = req.body[f];
    });

    await exam.save();
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/cbt/exams/:examId/status — activate or close an exam
exports.updateExamStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["draft", "active", "closed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    if (req.user.role === "teacher" && !exam.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Prevent reopening a closed exam
    if (exam.status === "closed" && status !== "closed") {
      return res.status(400).json({ message: "A closed exam cannot be reopened" });
    }

    exam.status = status;
    await exam.save();

    res.json({ message: `Exam status updated to ${status}`, exam });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/cbt/exams/:examId/release — release results to students
exports.releaseResults = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    if (req.user.role === "teacher" && !exam.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    exam.releaseResult = true;
    await exam.save();

    res.json({ message: "Results released to students" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/cbt/exams/:examId — only delete draft exams
exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    if (req.user.role === "teacher" && !exam.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (exam.status !== "draft") {
      return res.status(400).json({ message: "Only draft exams can be deleted" });
    }

    await exam.deleteOne();
    res.json({ message: "Exam deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/cbt/exams/:examId/results — all sessions for an exam (teacher/admin)
exports.getExamResults = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    if (req.user.role === "teacher" && !exam.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const sessions = await ExamSession.find({ exam: exam._id })
      .populate("student", "name admissionNumber")
      .select("student score total percentage passed status timeSpent submittedAt autoSubmitted")
      .sort({ percentage: -1 }); // highest score first

    const summary = {
      totalStudents: sessions.length,
      submitted: sessions.filter((s) => s.status !== "ongoing").length,
      passed: sessions.filter((s) => s.passed).length,
      failed: sessions.filter((s) => s.passed === false).length,
      averageScore: sessions.length
        ? Math.round(sessions.reduce((acc, s) => acc + (s.percentage || 0), 0) / sessions.length)
        : 0,
    };

    res.json({ exam, summary, sessions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/cbt/exams/available — exams a student can see (student-facing)
// exports.getAvailableExams = async (req, res) => {
//   try {
//     // req.student set by verifyStudent middleware
//     const enrollment = await Enrollment.findOne({
//       studentId: req.student._id,
//     }).sort({ createdAt: -1 }); // most recent enrollment

//     if (!enrollment) {
//       return res.status(404).json({ message: "No enrollment found for this student" });
//     }

//     const now = new Date();

//     // Find active exams matching student's class + session
//     const exams = await Exam.find({
//       classId: enrollment.classId,
//       sessionId: enrollment.sessionId,
//       status: "active",
//       startTime: { $lte: now },
//       endTime: { $gte: now },
//       $or: [
//         { armId: enrollment.armId }, // targeted at their arm
//         { armId: null },             // or open to all arms
//       ],
//     })
//       .populate("subject", "name")
//       .select("title subject duration startTime endTime instructions passMark");

//     // For each exam, check if student already has a session
//     const examsWithStatus = await Promise.all(
//       exams.map(async (exam) => {
//         const session = await ExamSession.findOne({
//           exam: exam._id,
//           student: req.student._id,
//         }).select("status score percentage");

//         return {
//           ...exam.toObject(),
//           sessionStatus: session?.status || null,   // null = not started
//           score: session?.score ?? null,
//           percentage: session?.percentage ?? null,
//         };
//       })
//     );

//     res.json(examsWithStatus);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

exports.getAvailableExams = async (req, res) => {
  try {
    const activeSession = await Session.findOne({ isActive: true });

    if (!activeSession) {
      return res.status(400).json({ message: "No active session found" });
    }

    const activeTerm = await Term.findOne({
      session: activeSession._id,
      isActive: true,
    });

    if (!activeTerm) {
      return res.status(400).json({ message: "No active term found" });
    }

    const enrollment = await Enrollment.findOne({
      studentId: req.student._id,
      sessionId: activeSession._id,
    });

    if (!enrollment) {
      return res.status(404).json({
        message: "No enrollment found for this student in the active session",
      });
    }

    const now = new Date();

    const exams = await Exam.find({
      classId: enrollment.classId,
      sessionId: activeSession._id,
      termId: activeTerm._id,
      status: "active",
      startTime: { $lte: now },
      endTime: { $gte: now },
      $or: [
        { armId: enrollment.armId },
        { armId: null },
        { armId: { $exists: false } },
      ],
    })
      .populate("subject", "name")
      .select("title subject duration startTime endTime instructions passMark");

    const examsWithStatus = await Promise.all(
      exams.map(async (exam) => {
        const session = await ExamSession.findOne({
          exam: exam._id,
          student: req.student._id,
        }).select("status score percentage");

        return {
          ...exam.toObject(),
          sessionStatus: session?.status || null,
          score: session?.score ?? null,
          percentage: session?.percentage ?? null,
        };
      })
    );

    res.json(examsWithStatus);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};