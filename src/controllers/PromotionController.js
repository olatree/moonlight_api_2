// // server/src/controllers/promotionController.js
// const { StatusCodes } = require("http-status-codes");
// const mongoose = require("mongoose");

// const Enrollment = require("../models/Enrollment");
// const asyncHandler = require("../middleware/asyncHandler");

// const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// exports.promoteOrRepeatStudents = asyncHandler(async (req, res) => {
//   const {
//     fromSessionId,
//     toSessionId,
//     fromClassId,
//     fromArmId,
//     students,
//   } = req.body;

//   if (
//     !fromSessionId ||
//     !toSessionId ||
//     !fromClassId ||
//     !fromArmId ||
//     !Array.isArray(students) ||
//     students.length === 0
//   ) {
//     res.status(StatusCodes.BAD_REQUEST);
//     throw new Error(
//       "fromSessionId, toSessionId, fromClassId, fromArmId, and students are required."
//     );
//   }

//   if (fromSessionId === toSessionId) {
//     res.status(StatusCodes.BAD_REQUEST);
//     throw new Error("Target session must be different from current session.");
//   }

//   const idsToValidate = [fromSessionId, toSessionId, fromClassId, fromArmId];

//   for (const item of students) {
//     idsToValidate.push(item.studentId, item.toClassId, item.toArmId);
//   }

//   if (!idsToValidate.every(isValidObjectId)) {
//     res.status(StatusCodes.BAD_REQUEST);
//     throw new Error("One or more IDs are invalid.");
//   }

//   const promoted = [];
//   const repeated = [];
//   const skipped = [];

//   for (const item of students) {
//     const { studentId, toClassId, toArmId, action } = item;

//     if (!["promote", "repeat"].includes(action)) {
//       skipped.push({
//         studentId,
//         reason: "Invalid action. Use promote or repeat.",
//       });
//       continue;
//     }

//     const oldEnrollment = await Enrollment.findOne({
//       studentId,
//       sessionId: fromSessionId,
//       classId: fromClassId,
//       armId: fromArmId,
//     }).populate("studentId", "name admissionNumber");

//     if (!oldEnrollment) {
//       skipped.push({
//         studentId,
//         reason: "Student is not enrolled in the source class/session.",
//       });
//       continue;
//     }

//     const alreadyEnrolled = await Enrollment.findOne({
//       studentId,
//       sessionId: toSessionId,
//     });

//     if (alreadyEnrolled) {
//       skipped.push({
//         studentId,
//         name: oldEnrollment.studentId?.name,
//         reason: "Student already has an enrollment in the target session.",
//       });
//       continue;
//     }

//     const newEnrollment = await Enrollment.create({
//       studentId,
//       classId: toClassId,
//       armId: toArmId,
//       sessionId: toSessionId,

//       // Very important for fee management:
//       // A promoted/repeated student is no longer a new intake.
//       studentCategory: "returning",

//       isRepeating: action === "repeat",
//       previousEnrollmentId: oldEnrollment._id,
//     });

//     const responseItem = {
//       studentId,
//       name: oldEnrollment.studentId?.name,
//       admissionNumber: oldEnrollment.studentId?.admissionNumber,
//       fromEnrollmentId: oldEnrollment._id,
//       newEnrollmentId: newEnrollment._id,
//       toClassId,
//       toArmId,
//       toSessionId,
//       studentCategory: newEnrollment.studentCategory,
//       isRepeating: newEnrollment.isRepeating,
//     };

//     if (action === "repeat") {
//       repeated.push(responseItem);
//     } else {
//       promoted.push(responseItem);
//     }
//   }

//   res.status(StatusCodes.OK).json({
//     success: true,
//     message: "Promotion process completed.",
//     data: {
//       promotedCount: promoted.length,
//       repeatedCount: repeated.length,
//       skippedCount: skipped.length,
//       promoted,
//       repeated,
//       skipped,
//     },
//   });
// });

// server/src/controllers/promotionController.js
const { StatusCodes } = require("http-status-codes");
const mongoose = require("mongoose");

const Student = require("../models/Student");
const Enrollment = require("../models/Enrollment");
const asyncHandler = require("../middleware/asyncHandler");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.promoteOrRepeatStudents = asyncHandler(async (req, res) => {
  const { fromSessionId, toSessionId, fromClassId, fromArmId, students } =
    req.body;

  if (
    !fromSessionId ||
    !fromClassId ||
    !fromArmId ||
    !Array.isArray(students) ||
    students.length === 0
  ) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error(
      "fromSessionId, fromClassId, fromArmId, and students are required."
    );
  }

  const idsToValidate = [fromSessionId, fromClassId, fromArmId];

  if (toSessionId) idsToValidate.push(toSessionId);

  for (const item of students) {
    idsToValidate.push(item.studentId);

    if (item.action !== "graduate") {
      idsToValidate.push(item.toClassId, item.toArmId);
    }
  }

  if (!idsToValidate.every(isValidObjectId)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("One or more IDs are invalid.");
  }

  const promoted = [];
  const repeated = [];
  const graduated = [];
  const skipped = [];

  for (const item of students) {
    const { studentId, toClassId, toArmId, action } = item;

    if (!["promote", "repeat", "graduate"].includes(action)) {
      skipped.push({
        studentId,
        reason: "Invalid action. Use promote, repeat, or graduate.",
      });
      continue;
    }

    if (action !== "graduate" && !toSessionId) {
      skipped.push({
        studentId,
        reason: "Target session is required for promote/repeat.",
      });
      continue;
    }

    if (action !== "graduate" && fromSessionId === toSessionId) {
      skipped.push({
        studentId,
        reason: "Target session must be different from current session.",
      });
      continue;
    }

    const oldEnrollment = await Enrollment.findOne({
      studentId,
      sessionId: fromSessionId,
      classId: fromClassId,
      armId: fromArmId,
    }).populate("studentId", "name admissionNumber");

    if (!oldEnrollment) {
      skipped.push({
        studentId,
        reason: "Student is not enrolled in the source class/session.",
      });
      continue;
    }

    if (action === "graduate") {
      await Student.findByIdAndUpdate(
        studentId,
        {
          status: "graduated",
          graduatedAt: new Date(),
          graduatedSessionId: fromSessionId,
        },
        { runValidators: true }
      );

      graduated.push({
        studentId,
        name: oldEnrollment.studentId?.name,
        admissionNumber: oldEnrollment.studentId?.admissionNumber,
        fromEnrollmentId: oldEnrollment._id,
        graduatedSessionId: fromSessionId,
      });

      continue;
    }

    if (!toClassId || !toArmId) {
      skipped.push({
        studentId,
        name: oldEnrollment.studentId?.name,
        reason: "Target class and arm are required.",
      });
      continue;
    }

    const alreadyEnrolled = await Enrollment.findOne({
      studentId,
      sessionId: toSessionId,
    });

    if (alreadyEnrolled) {
      skipped.push({
        studentId,
        name: oldEnrollment.studentId?.name,
        reason: "Student already has an enrollment in the target session.",
      });
      continue;
    }

    const newEnrollment = await Enrollment.create({
      studentId,
      classId: toClassId,
      armId: toArmId,
      sessionId: toSessionId,
      studentCategory: "returning",
      isRepeating: action === "repeat",
      previousEnrollmentId: oldEnrollment._id,
    });

    const responseItem = {
      studentId,
      name: oldEnrollment.studentId?.name,
      admissionNumber: oldEnrollment.studentId?.admissionNumber,
      fromEnrollmentId: oldEnrollment._id,
      newEnrollmentId: newEnrollment._id,
      toClassId,
      toArmId,
      toSessionId,
      studentCategory: newEnrollment.studentCategory,
      isRepeating: newEnrollment.isRepeating,
    };

    if (action === "repeat") {
      repeated.push(responseItem);
    } else {
      promoted.push(responseItem);
    }
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Promotion process completed.",
    data: {
      promotedCount: promoted.length,
      repeatedCount: repeated.length,
      graduatedCount: graduated.length,
      skippedCount: skipped.length,
      promoted,
      repeated,
      graduated,
      skipped,
    },
  });
});