// const TermReport = require("../models/TermReport");
// const Enrollment = require("../models/Enrollment");

// // ----------------------------
// // POST /api/term-reports/class-teacher
// // ----------------------------
// exports.saveClassTeacherComments = async (req, res) => {
//   try {
//     const { reports } = req.body;
//     if (!reports || !Array.isArray(reports)) {
//       return res.status(400).json({ message: "Invalid data format." });
//     }

//     const saved = [];

//     for (const r of reports) {
//       const {
//         studentId,
//         classId,
//         armId,
//         sessionId,
//         termId,
//         classTeacherComment,
//       } = r;

//       // Find enrollment record
//       const enrollment = await Enrollment.findOne({ studentId, sessionId });
//       if (!enrollment) {
//         console.warn(`No enrollment found for student ${studentId} in session ${sessionId}`);
//         continue;
//       }

//       // Check for existing report
//       let report = await TermReport.findOne({
//         enrollmentId: enrollment._id,
//         sessionId,
//         termId,
//       });

//       if (report) {
//         report.classTeacherComment = classTeacherComment;
//         await report.save();
//       } else {
//         report = await TermReport.create({
//           enrollmentId: enrollment._id,
//           sessionId,
//           termId,
//           classTeacherComment,
//         });
//       }

//       saved.push(report);
//     }

//     res.json({ message: "Class teacher comments saved successfully.", saved });
//   } catch (err) {
//     console.error("Error saving teacher comments:", err);
//     res.status(500).json({ message: "Server error while saving comments." });
//   }
// };

// // ----------------------------
// // POST /api/term-reports/principal
// // ----------------------------
// exports.savePrincipalComments = async (req, res) => {
//   try {
//     const { reports } = req.body;
//     if (!reports || !Array.isArray(reports)) {
//       return res.status(400).json({ message: "Invalid data format." });
//     }

//     const saved = [];

//     for (const r of reports) {
//       const {
//         studentId,
//         classId,
//         armId,
//         sessionId,
//         termId,
//         principalComment,
//       } = r;

//       // Find enrollment record
//       const enrollment = await Enrollment.findOne({ studentId, sessionId });
//       if (!enrollment) {
//         console.warn(`No enrollment found for student ${studentId} in session ${sessionId}`);
//         continue;
//       }

//       // Check for existing report
//       let report = await TermReport.findOne({
//         enrollmentId: enrollment._id,
//         sessionId,
//         termId,
//       });

//       if (report) {
//         report.principalComment = principalComment;
//         await report.save();
//       } else {
//         report = await TermReport.create({
//           enrollmentId: enrollment._id,
//           sessionId,
//           termId,
//           principalComment,
//         });
//       }

//       saved.push(report);
//     }

//     res.json({ message: "Principal comments saved successfully.", saved });
//   } catch (err) {
//     console.error("Error saving principal comments:", err);
//     res.status(500).json({ message: "Server error while saving comments." });
//   }
// };

// // ----------------------------
// // GET /api/term-reports
// // ----------------------------
// // exports.getTermReports = async (req, res) => {
// //   try {
// //     const { classId, armId, sessionId, termId } = req.query;

// //     const filter = {};
// //     if (classId) filter.classId = classId;
// //     if (armId) filter.armId = armId;
// //     if (sessionId) filter.sessionId = sessionId;
// //     if (termId) filter.termId = termId;

// //     const reports = await TermReport.find(filter)
// //       .populate({
// //         path: "enrollmentId",
// //         populate: { path: "studentId", select: "firstName lastName middleName" },
// //       })
// //       .populate("sessionId", "name")
// //       .populate("termId", "name");

// //     res.json({ reports });
// //   } catch (err) {
// //     console.error("Error fetching term reports:", err);
// //     res.status(500).json({ message: "Server error fetching term reports." });
// //   }
// // };

// exports.getTermReports = async (req, res) => {
//   try {
//     const { classId, armId, sessionId, termId } = req.query;

//     // 🟩 Find enrollments matching this class, arm, session
//     const enrollments = await Enrollment.find({ classId, armId, sessionId }).select("_id studentId");
//     const enrollmentIds = enrollments.map((e) => e._id);

//     // 🟩 Find term reports for those enrollments
//     const reports = await TermReport.find({
//       enrollmentId: { $in: enrollmentIds },
//       sessionId,
//       termId,
//     })
//       .populate({
//         path: "enrollmentId",
//         populate: { path: "studentId", select: "name" },
//       })
//       .populate("sessionId", "name")
//       .populate("termId", "name");

//     res.json({ reports });
//   } catch (err) {
//     console.error("Error fetching term reports:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };


// // ----------------------------
// // GET /api/term-reports/:enrollmentId
// // ----------------------------
// exports.getStudentReport = async (req, res) => {
//   try {
//     const { enrollmentId } = req.params;

//     const report = await TermReport.findOne({ enrollmentId })
//       .populate("sessionId", "name")
//       .populate("termId", "name");

//     if (!report) {
//       return res.status(404).json({ message: "No term report found for this student." });
//     }

//     res.json({ report });
//   } catch (err) {
//     console.error("Error fetching student report:", err);
//     res.status(500).json({ message: "Server error fetching student report." });
//   }
// };



// server/src/controllers/termReportController.js
const { StatusCodes } = require("http-status-codes");
const mongoose = require("mongoose");

const TermReport = require("../models/TermReport");
const Enrollment = require("../models/Enrollment");
const asyncHandler = require("../middleware/asyncHandler");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const validateReportsPayload = (reports) => {
  if (!Array.isArray(reports) || reports.length === 0) {
    return "Reports must be a non-empty array.";
  }

  for (const report of reports) {
    if (!report.studentId || !report.sessionId || !report.termId) {
      return "Each report must include studentId, sessionId, and termId.";
    }

    if (
      !isValidObjectId(report.studentId) ||
      !isValidObjectId(report.sessionId) ||
      !isValidObjectId(report.termId)
    ) {
      return "Invalid studentId, sessionId, or termId.";
    }
  }

  return null;
};

const saveComments = async ({ reports, commentField }) => {
  const saved = [];
  const skipped = [];

  for (const item of reports) {
    const { studentId, sessionId, termId } = item;
    const comment = item[commentField] || "";

    const enrollment = await Enrollment.findOne({
      studentId,
      sessionId,
    }).select("_id");

    if (!enrollment) {
      skipped.push({
        studentId,
        reason: "Enrollment not found for this session.",
      });
      continue;
    }

    const report = await TermReport.findOneAndUpdate(
      {
        enrollmentId: enrollment._id,
        sessionId,
        termId,
      },
      {
        $set: {
          [commentField]: comment.trim(),
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    saved.push(report);
  }

  return { saved, skipped };
};

// POST /api/term-reports/class-teacher
exports.saveClassTeacherComments = asyncHandler(async (req, res) => {
  const { reports } = req.body;

  const validationError = validateReportsPayload(reports);

  if (validationError) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error(validationError);
  }

  const { saved, skipped } = await saveComments({
    reports,
    commentField: "classTeacherComment",
  });

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Class teacher comments saved successfully.",
    count: saved.length,
    skipped,
    data: saved,
  });
});

// POST /api/term-reports/principal
exports.savePrincipalComments = asyncHandler(async (req, res) => {
  const { reports } = req.body;

  const validationError = validateReportsPayload(reports);

  if (validationError) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error(validationError);
  }

  const { saved, skipped } = await saveComments({
    reports,
    commentField: "principalComment",
  });

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Principal comments saved successfully.",
    count: saved.length,
    skipped,
    data: saved,
  });
});

// GET /api/term-reports?classId=&armId=&sessionId=&termId=
exports.getTermReports = asyncHandler(async (req, res) => {
  const { classId, armId, sessionId, termId } = req.query;

  if (!classId || !armId || !sessionId || !termId) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("classId, armId, sessionId, and termId are required.");
  }

  const ids = [classId, armId, sessionId, termId];

  if (!ids.every(isValidObjectId)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid classId, armId, sessionId, or termId.");
  }

  const enrollments = await Enrollment.find({
    classId,
    armId,
    sessionId,
  })
    .select("_id studentId")
    .populate("studentId", "name admissionNumber")
    .lean();

  const validEnrollments = enrollments.filter((enrollment) => enrollment.studentId);

  const enrollmentIds = validEnrollments.map((enrollment) => enrollment._id);

  const reports = await TermReport.find({
    enrollmentId: { $in: enrollmentIds },
    sessionId,
    termId,
  })
    .populate({
      path: "enrollmentId",
      populate: [
        { path: "studentId", select: "name admissionNumber" },
        { path: "classId", select: "name" },
        { path: "armId", select: "name" },
      ],
    })
    .populate("sessionId", "name")
    .populate("termId", "name")
    .lean();

  res.status(StatusCodes.OK).json({
    success: true,
    count: reports.length,
    data: reports,
  });
});

// GET /api/term-reports/:enrollmentId?sessionId=&termId=
exports.getStudentReport = asyncHandler(async (req, res) => {
  const { enrollmentId } = req.params;
  const { sessionId, termId } = req.query;

  if (!isValidObjectId(enrollmentId)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid enrollmentId.");
  }

  const filter = { enrollmentId };

  if (sessionId) {
    if (!isValidObjectId(sessionId)) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid sessionId.");
    }

    filter.sessionId = sessionId;
  }

  if (termId) {
    if (!isValidObjectId(termId)) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid termId.");
    }

    filter.termId = termId;
  }

  const report = await TermReport.findOne(filter)
    .populate({
      path: "enrollmentId",
      populate: [
        { path: "studentId", select: "name admissionNumber" },
        { path: "classId", select: "name" },
        { path: "armId", select: "name" },
      ],
    })
    .populate("sessionId", "name")
    .populate("termId", "name")
    .lean();

  if (!report) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("No term report found for this student.");
  }

  res.status(StatusCodes.OK).json({
    success: true,
    data: report,
  });
});