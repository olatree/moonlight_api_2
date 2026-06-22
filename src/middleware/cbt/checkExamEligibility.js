// middleware/cbt/checkExamEligibility.js
const Enrollment = require("../../models/Enrollment");
const Exam = require("../../models/Exam");

module.exports = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const now = new Date();

    // 1. Exam must be active and within its time window
    if (exam.status !== "active") {
      return res.status(403).json({ message: "This exam is not currently active" });
    }
    if (now < exam.startTime) {
      return res.status(403).json({ message: "This exam has not started yet" });
    }
    if (now > exam.endTime) {
      return res.status(403).json({ message: "This exam has ended" });
    }

    // 2. Student must be enrolled in the exam's class + session
    //    If armId is set on exam, must also match arm
    const enrollmentQuery = {
      studentId: req.student._id,   // set by your student auth middleware
      classId: exam.classId,
      sessionId: exam.sessionId,
    };
    if (exam.armId) enrollmentQuery.armId = exam.armId;

    const enrollment = await Enrollment.findOne(enrollmentQuery);
    if (!enrollment) {
      return res.status(403).json({ message: "You are not enrolled in this exam's class" });
    }

    // Attach for use in controller
    req.exam = exam;
    req.enrollment = enrollment;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};