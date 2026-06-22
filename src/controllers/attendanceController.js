// // controllers/attendanceController.js
// const Attendance = require("../models/Attendance");
// const Student = require("../models/Student");
// const Enrollment = require("../models/Enrollment");


// exports.getAttendanceSummary = async (req, res) => {
//   try {
//     const { classId, armId, sessionId, termId } = req.query;

//     // Find attendance record for this class-arm-session-term
//     const attendance = await Attendance.findOne({
//       classId,
//       armId,
//       sessionId,
//       termId,
//     }).populate("records.studentId", "name admissionNumber image");

//     if (!attendance) {
//       // If no attendance record exists, fetch students from ENROLLMENT
//       const enrollments = await Enrollment.find({
//         classId,
//         armId,
//         sessionId,
//       }).populate("studentId", "name admissionNumber image");

//       if (!enrollments.length)
//         return res.json({
//           timesOpened: "N/A",
//           records: [],
//         });

//       // Build initial attendance records
//       const records = enrollments.map((en) => ({
//         studentId: en.studentId._id,
//         name: en.studentId.name,
//         admissionNumber: en.studentId.admissionNumber,
//         image: en.studentId.image || null,
//         timesPresent: 0,
//       }));

//       return res.json({
//         timesOpened: "N/A",
//         records,
//       });
//     }

//     // If attendance already exists, format it
//     const data = attendance.records.map((r) => ({
//       studentId: r.studentId._id,
//       name: r.studentId.name,
//       admissionNumber: r.studentId.admissionNumber,
//       image: r.studentId.image || null,
//       timesPresent: r.timesPresent,
//     }));

//     res.json({
//       timesOpened: attendance.timesOpened,
//       records: data,
//     });
//   } catch (err) {
//     console.error("Error fetching attendance summary:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// };

// exports.saveAttendanceSummary = async (req, res) => {
//   try {
//     const { classId, armId, sessionId, termId, timesOpened, records } = req.body;

//     let attendance = await Attendance.findOne({
//       classId,
//       armId,
//       sessionId,
//       termId,
//     });

//     if (attendance) {
//       // Update existing summary
//       attendance.timesOpened = timesOpened;
//       attendance.records = records;
//       await attendance.save();
//     } else {
//       // Create new
//       attendance = new Attendance({
//         classId,
//         armId,
//         sessionId,
//         termId,
//         timesOpened,
//         records,
//       });
//       await attendance.save();
//     }

//     res.json({ message: "Attendance summary saved successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Error saving attendance" });
//   }
// };

// exports.getStudentAttendance = async (req, res) => {
//   try {
//     const { studentId, sessionId, termId } = req.query;

//     if (!studentId) {
//       return res.status(400).json({ error: "studentId is required" });
//     }

//     // Build filter
//     const filter = {
//       "records.studentId": studentId,
//     };
//     if (sessionId) filter.sessionId = sessionId;
//     if (termId) filter.termId = termId;

//     // Fetch attendance records that include this student
//     const attendanceDocs = await Attendance.find(filter)
//       .populate("classId", "name")
//       .populate("armId", "name")
//       .populate("sessionId", "name")
//       .populate("termId", "name");

//     if (!attendanceDocs.length) {
//       return res.json({ message: "No attendance records found for this student." });
//     }

//     // Map data neatly
//     const records = attendanceDocs.map((att) => {
//       const studentRecord = att.records.find(
//         (r) => r.studentId.toString() === studentId
//       );

//       const timesPresent = studentRecord ? studentRecord.timesPresent : 0;
//       const totalTimes = att.timesOpened || 0;
//       const percentage =
//         totalTimes > 0 ? ((timesPresent / totalTimes) * 100).toFixed(1) : "0";

//       return {
//         class: att.classId?.name,
//         arm: att.armId?.name,
//         session: att.sessionId?.name,
//         term: att.termId?.name,
//         timesOpened: totalTimes,
//         timesPresent,
//         percentage: `${percentage}%`,
//       };
//     });

//     res.json({
//       totalRecords: records.length,
//       records,
//     });
//   } catch (err) {
//     console.error("Error fetching student attendance:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// };

// server/src/controllers/attendanceController.js
const { StatusCodes } = require("http-status-codes");
const mongoose = require("mongoose");

const Attendance = require("../models/Attendance");
const Enrollment = require("../models/Enrollment");
const asyncHandler = require("../middleware/asyncHandler");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const validateRequiredIds = (ids) => {
  for (const [key, value] of Object.entries(ids)) {
    if (!value) return `${key} is required.`;
    if (!isValidObjectId(value)) return `Invalid ${key}.`;
  }

  return null;
};

// exports.getAttendanceSummary = asyncHandler(async (req, res) => {
//   const { classId, armId, sessionId, termId } = req.query;

//   const validationError = validateRequiredIds({
//     classId,
//     armId,
//     sessionId,
//     termId,
//   });

//   if (validationError) {
//     res.status(StatusCodes.BAD_REQUEST);
//     throw new Error(validationError);
//   }

//   const attendance = await Attendance.findOne({
//     classId,
//     armId,
//     sessionId,
//     termId,
//   }).populate("records.studentId", "name admissionNumber image");

//   if (!attendance) {
//     const enrollments = await Enrollment.find({
//       classId,
//       armId,
//       sessionId,
//     })
//       .populate("studentId", "name admissionNumber image")
//       .lean();

//     const validEnrollments = enrollments.filter((enrollment) => enrollment.studentId);

//     const records = validEnrollments.map((enrollment) => ({
//       studentId: enrollment.studentId._id,
//       name: enrollment.studentId.name,
//       admissionNumber: enrollment.studentId.admissionNumber,
//       image: enrollment.studentId.image || null,
//       timesPresent: 0,
//     }));

//     console.log("No attendance record found. Returning enrolled students:", {
//       classId,
//       armId,
//       sessionId,
//       termId,
//       records,
//     });

//     return res.status(StatusCodes.OK).json({
//       success: true,
//       message: "No attendance record found. Returning enrolled students.",
//       data: {
//         timesOpened: 0,
//         records,
//       },
//     });
//   }

//   const records = attendance.records
//     .filter((record) => record.studentId)
//     .map((record) => ({
//       studentId: record.studentId._id,
//       name: record.studentId.name,
//       admissionNumber: record.studentId.admissionNumber,
//       image: record.studentId.image || null,
//       timesPresent: record.timesPresent || 0,
//     }));

//     // console.log("Fetched attendance summary:", {
//     //   classId,
//     //   armId,
//     //   sessionId,
//     //   termId,
//     //   timesOpened: attendance.timesOpened,
//     //   records,
//     // });

//   res.status(StatusCodes.OK).json({
//     success: true,
//     data: {
//       timesOpened: attendance.timesOpened || 0,
//       records,
//     },
//   });
// });

exports.getAttendanceSummary = asyncHandler(async (req, res) => {
  const { classId, armId, sessionId, termId } = req.query;

  const validationError = validateRequiredIds({ classId, armId, sessionId, termId });

  if (validationError) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error(validationError);
  }

  // Always fetch current enrollments — source of truth for who's in the class
  const enrollments = await Enrollment.find({ classId, armId, sessionId })
    .populate("studentId", "name admissionNumber image")
    .lean();

  const validEnrollments = enrollments.filter((e) => e.studentId);

  // Fetch existing attendance doc (may or may not exist)
  const attendance = await Attendance.findOne({ classId, armId, sessionId, termId }).lean();

  // Build a lookup of existing records by studentId string
  const existingRecords = {};
  if (attendance) {
    for (const record of attendance.records) {
      if (record.studentId) {
        existingRecords[record.studentId.toString()] = record.timesPresent || 0;
      }
    }
  }

  // Merge: every enrolled student gets a record; fall back to 0 if not yet in attendance doc
  const records = validEnrollments.map((enrollment) => {
    const sid = enrollment.studentId._id.toString();
    return {
      studentId: enrollment.studentId._id,
      name: enrollment.studentId.name,
      admissionNumber: enrollment.studentId.admissionNumber,
      image: enrollment.studentId.image || null,
      timesPresent: existingRecords[sid] ?? 0,
    };
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      timesOpened: attendance?.timesOpened || 0,
      records,
    },
  });
});

exports.saveAttendanceSummary = asyncHandler(async (req, res) => {
  const { classId, armId, sessionId, termId, timesOpened, records } = req.body;

  const validationError = validateRequiredIds({
    classId,
    armId,
    sessionId,
    termId,
  });

  if (validationError) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error(validationError);
  }

  if (timesOpened === undefined || timesOpened === null || Number(timesOpened) < 0) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("timesOpened must be a valid number.");
  }

  if (!Array.isArray(records)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("records must be an array.");
  }

  const sanitizedRecords = records
    .filter((record) => record.studentId && isValidObjectId(record.studentId))
    .map((record) => ({
      studentId: record.studentId,
      timesPresent: Math.max(0, Number(record.timesPresent) || 0),
    }));

  const attendance = await Attendance.findOneAndUpdate(
    {
      classId,
      armId,
      sessionId,
      termId,
    },
    {
      $set: {
        timesOpened: Number(timesOpened),
        records: sanitizedRecords,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Attendance summary saved successfully.",
    data: attendance,
  });
});

// exports.getStudentAttendance = asyncHandler(async (req, res) => {
//   // const { studentId, sessionId, termId } = req.query;
//   const studentId = req.student?._id || req.query.studentId;
// const { sessionId, termId } = req.query;

//   if (!studentId || !isValidObjectId(studentId)) {
//     res.status(StatusCodes.BAD_REQUEST);
//     throw new Error("Valid studentId is required.");
//   }

//   const filter = {
//     "records.studentId": studentId,
//   };

//   if (sessionId) {
//     if (!isValidObjectId(sessionId)) {
//       res.status(StatusCodes.BAD_REQUEST);
//       throw new Error("Invalid sessionId.");
//     }

//     filter.sessionId = sessionId;
//   }

//   if (termId) {
//     if (!isValidObjectId(termId)) {
//       res.status(StatusCodes.BAD_REQUEST);
//       throw new Error("Invalid termId.");
//     }

//     filter.termId = termId;
//   }

//   const attendanceDocs = await Attendance.find(filter)
//     .populate("classId", "name")
//     .populate("armId", "name")
//     .populate("sessionId", "name")
//     .populate("termId", "name")
//     .lean();

//   const records = attendanceDocs.map((attendance) => {
//     const studentRecord = attendance.records.find(
//       (record) => record.studentId.toString() === studentId
//     );
//     console.log("Student Record:", attendanceDocs);

//     const timesPresent = studentRecord?.timesPresent || 0;
//     const timesOpened = attendance.timesOpened || 0;

//     const percentage =
//       timesOpened > 0
//         ? Number(((timesPresent / timesOpened) * 100).toFixed(1))
//         : 0;

//     return {
//       class: attendance.classId?.name || "N/A",
//       arm: attendance.armId?.name || "N/A",
//       session: attendance.sessionId?.name || "N/A",
//       term: attendance.termId?.name || "N/A",
//       timesOpened,
//       timesPresent,
//       timesAbsent: Math.max(timesOpened - timesPresent, 0),
//       percentage,
//     };
//   });

//   res.status(StatusCodes.OK).json({
//     success: true,
//     totalRecords: records.length,
//     data: {
//       records,
//     },
//   });
// });


exports.getStudentAttendance = asyncHandler(async (req, res) => {
  const studentId = (req.student?._id || req.query.studentId)?.toString();
  const { sessionId, termId } = req.query;

  if (!studentId || !isValidObjectId(studentId)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Valid studentId is required.");
  }

  const filter = {
    "records.studentId": studentId,
  };

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

  const attendanceDocs = await Attendance.find(filter)
    .populate("classId", "name")
    .populate("armId", "name")
    .populate("sessionId", "name")
    .populate("termId", "name")
    .lean();

  const records = attendanceDocs.map((attendance) => {
    const studentRecord = attendance.records.find(
      (record) => record.studentId?.toString() === studentId
    );
    console.log("Matched studentRecord:", studentRecord);


    const timesPresent = Number(studentRecord?.timesPresent || 0);
    const timesOpened = Number(attendance.timesOpened || 0);

    const percentage =
      timesOpened > 0
        ? Number(((timesPresent / timesOpened) * 100).toFixed(1))
        : 0;

    return {
      class: attendance.classId?.name || "N/A",
      arm: attendance.armId?.name || "N/A",
      session: attendance.sessionId?.name || "N/A",
      term: attendance.termId?.name || "N/A",
      timesOpened,
      timesPresent,
      timesAbsent: Math.max(timesOpened - timesPresent, 0),
      percentage,
    };
  });

  res.status(StatusCodes.OK).json({
    success: true,
    totalRecords: records.length,
    data: {
      records,
    },
  });
});