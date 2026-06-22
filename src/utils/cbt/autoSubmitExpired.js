// utils/cbt/autoSubmitExpired.js
const ExamSession = require("../../models/ExamSession");
const Exam = require("../../models/Exam");
const Question = require("../../models/Question");

const autoSubmitExpired = async () => {
  try {
    // Find all ongoing sessions
    const ongoingSessions = await ExamSession.find({ status: "ongoing" });

    for (const session of ongoingSessions) {
      const exam = await Exam.findById(session.exam);
      if (!exam) continue;

      const elapsed = (Date.now() - session.startedAt.getTime()) / 1000 / 60;
      if (elapsed < exam.duration) continue; // not expired yet

      // Score whatever answers exist
      const questions = await Question.find({ _id: { $in: session.questionOrder } });
      let score = 0, total = 0;
      questions.forEach((q) => {
        total += q.marks;
        const ans = session.answers.find((a) => a.question.equals(q._id));
        if (ans?.selected === q.correctOption) score += q.marks;
      });

      const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

      session.status = "timed_out";
      session.autoSubmitted = true;
      session.submittedAt = new Date();
      session.score = score;
      session.total = total;
      session.percentage = percentage;
      session.passed = percentage >= exam.passMark;
      session.timeSpent = Math.round(exam.duration * 60); // full duration

      await session.save();
      console.log(`Auto-submitted session ${session._id} for student ${session.student}`);
    }
  } catch (err) {
    console.error("Auto-submit cron error:", err.message);
  }
};

module.exports = autoSubmitExpired;