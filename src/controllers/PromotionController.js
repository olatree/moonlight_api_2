// server/src/controllers/promotionController.js
const { StatusCodes } = require("http-status-codes");
const mongoose = require("mongoose");

const Enrollment = require("../models/Enrollment");
const asyncHandler = require("../middleware/asyncHandler");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.promoteOrRepeatStudents = asyncHandler(async (req, res) => {
  const {
    fromSessionId,
    toSessionId,
    fromClassId,
    fromArmId,
    students,
  } = req.body;

  if (
    !fromSessionId ||
    !toSessionId ||
    !fromClassId ||
    !fromArmId ||
    !Array.isArray(students) ||
    students.length === 0
  ) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("fromSessionId, toSessionId, fromClassId, fromArmId, and students are required.");
  }

  if (fromSessionId === toSessionId) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Target session must be different from current session.");
  }

  const idsToValidate = [fromSessionId, toSessionId, fromClassId, fromArmId];

  for (const item of students) {
    idsToValidate.push(item.studentId, item.toClassId, item.toArmId);
  }

  if (!idsToValidate.every(isValidObjectId)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("One or more IDs are invalid.");
  }

  const promoted = [];
  const repeated = [];
  const skipped = [];

  for (const item of students) {
    const { studentId, toClassId, toArmId, action } = item;

    if (!["promote", "repeat"].includes(action)) {
      skipped.push({
        studentId,
        reason: "Invalid action. Use promote or repeat.",
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
      isRepeating: action === "repeat",
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
      skippedCount: skipped.length,
      promoted,
      repeated,
      skipped,
    },
  });
});