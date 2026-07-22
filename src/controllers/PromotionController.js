
// server/src/controllers/promotionController.js
const { StatusCodes } = require("http-status-codes");
const mongoose = require("mongoose");

const Student = require("../models/Student");
const Enrollment = require("../models/Enrollment");
const Class = require("../models/Class");
const PromotionAudit = require("../models/PromotionAudit");
const asyncHandler = require("../middleware/asyncHandler");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// exports.promoteOrRepeatStudents = asyncHandler(async (req, res) => {
//   const { fromSessionId, toSessionId, fromClassId, fromArmId, students } =
//     req.body;

//   if (
//     !fromSessionId ||
//     !fromClassId ||
//     !fromArmId ||
//     !Array.isArray(students) ||
//     students.length === 0
//   ) {
//     res.status(StatusCodes.BAD_REQUEST);
//     throw new Error(
//       "fromSessionId, fromClassId, fromArmId, and students are required."
//     );
//   }

//   const idsToValidate = [fromSessionId, fromClassId, fromArmId];

//   if (toSessionId) idsToValidate.push(toSessionId);

//   for (const item of students) {
//     idsToValidate.push(item.studentId);

//     if (item.action !== "graduate") {
//       idsToValidate.push(item.toClassId, item.toArmId);
//     }
//   }

//   if (!idsToValidate.every(isValidObjectId)) {
//     res.status(StatusCodes.BAD_REQUEST);
//     throw new Error("One or more IDs are invalid.");
//   }

//   const promoted = [];
//   const repeated = [];
//   const graduated = [];
//   const skipped = [];

//   for (const item of students) {
//     const { studentId, toClassId, toArmId, action } = item;

//     if (!["promote", "repeat", "graduate"].includes(action)) {
//       skipped.push({
//         studentId,
//         reason: "Invalid action. Use promote, repeat, or graduate.",
//       });
//       continue;
//     }

//     if (action !== "graduate" && !toSessionId) {
//       skipped.push({
//         studentId,
//         reason: "Target session is required for promote/repeat.",
//       });
//       continue;
//     }

//     if (action !== "graduate" && fromSessionId === toSessionId) {
//       skipped.push({
//         studentId,
//         reason: "Target session must be different from current session.",
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

//     if (action === "graduate") {
//       await Student.findByIdAndUpdate(
//         studentId,
//         {
//           status: "graduated",
//           graduatedAt: new Date(),
//           graduatedSessionId: fromSessionId,
//         },
//         { runValidators: true }
//       );

//       graduated.push({
//         studentId,
//         name: oldEnrollment.studentId?.name,
//         admissionNumber: oldEnrollment.studentId?.admissionNumber,
//         fromEnrollmentId: oldEnrollment._id,
//         graduatedSessionId: fromSessionId,
//       });

//       continue;
//     }

//     if (!toClassId || !toArmId) {
//       skipped.push({
//         studentId,
//         name: oldEnrollment.studentId?.name,
//         reason: "Target class and arm are required.",
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
//       graduatedCount: graduated.length,
//       skippedCount: skipped.length,
//       promoted,
//       repeated,
//       graduated,
//       skipped,
//     },
//   });
// });

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

  const batchId = new mongoose.Types.ObjectId();
  const performedBy = req.user?.id || req.admin?.id; // adjust to however `protect` attaches the actor

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

    // if (action === "graduate") {
    //   await Student.findByIdAndUpdate(
    //     studentId,
    //     {
    //       status: "graduated",
    //       graduatedAt: new Date(),
    //       graduatedSessionId: fromSessionId,
    //     },
    //     { runValidators: true }
    //   );

    //   graduated.push({
    //     studentId,
    //     name: oldEnrollment.studentId?.name,
    //     admissionNumber: oldEnrollment.studentId?.admissionNumber,
    //     fromEnrollmentId: oldEnrollment._id,
    //     graduatedSessionId: fromSessionId,
    //   });

    //   continue;
    // }

    if (action === "graduate") {
      const studentBefore = await Student.findById(studentId).select(
        "status graduatedAt graduatedSessionId"
      );

      await Student.findByIdAndUpdate(
        studentId,
        { status: "graduated", graduatedAt: new Date(), graduatedSessionId: fromSessionId },
        { runValidators: true }
      );

      await PromotionAudit.create({
        batchId,
        studentId,
        action: "graduate",
        fromSessionId,
        fromClassId,
        fromArmId,
        fromEnrollmentId: oldEnrollment._id,
        previousStudentStatus: studentBefore?.status ?? null,
        previousGraduatedAt: studentBefore?.graduatedAt ?? null,
        previousGraduatedSessionId: studentBefore?.graduatedSessionId ?? null,
        performedBy,
      });

      graduated.push({
        studentId,
        name: oldEnrollment.studentId?.name,
        admissionNumber: oldEnrollment.studentId?.admissionNumber,
        fromEnrollmentId: oldEnrollment._id,
        graduatedSessionId: fromSessionId,
      });

      continue;
    }

    // if (!toClassId || !toArmId) {
    //   skipped.push({
    //     studentId,
    //     name: oldEnrollment.studentId?.name,
    //     reason: "Target class and arm are required.",
    //   });
    //   continue;
    // }

    // const alreadyEnrolled = await Enrollment.findOne({
    //   studentId,
    //   sessionId: toSessionId,
    // });

       if (!toClassId || !toArmId) {
      skipped.push({ studentId, name: oldEnrollment.studentId?.name, reason: "Target class and arm are required." });
      continue;
    }

    const alreadyEnrolled = await Enrollment.findOne({ studentId, sessionId: toSessionId });
    if (alreadyEnrolled) {
      skipped.push({ studentId, name: oldEnrollment.studentId?.name, reason: "Student already has an enrollment in the target session." });
      continue;
    }

  //   const newEnrollment = await Enrollment.create({
  //     studentId,
  //     classId: toClassId,
  //     armId: toArmId,
  //     sessionId: toSessionId,
  //     studentCategory: "returning",
  //     isRepeating: action === "repeat",
  //     previousEnrollmentId: oldEnrollment._id,
  //   });

  //   const responseItem = {
  //     studentId,
  //     name: oldEnrollment.studentId?.name,
  //     admissionNumber: oldEnrollment.studentId?.admissionNumber,
  //     fromEnrollmentId: oldEnrollment._id,
  //     newEnrollmentId: newEnrollment._id,
  //     toClassId,
  //     toArmId,
  //     toSessionId,
  //     studentCategory: newEnrollment.studentCategory,
  //     isRepeating: newEnrollment.isRepeating,
  //   };

  //   if (action === "repeat") {
  //     repeated.push(responseItem);
  //   } else {
  //     promoted.push(responseItem);
  //   }
  // }

  // res.status(StatusCodes.OK).json({
  //   success: true,
  //   message: "Promotion process completed.",
  //   data: {
  //     promotedCount: promoted.length,
  //     repeatedCount: repeated.length,
  //     graduatedCount: graduated.length,
  //     skippedCount: skipped.length,
  //     promoted,
  //     repeated,
  //     graduated,
  //     skipped,
  //   },
  // });

  const newEnrollment = await Enrollment.create({
      studentId,
      classId: toClassId,
      armId: toArmId,
      sessionId: toSessionId,
      studentCategory: "returning",
      isRepeating: action === "repeat",
      previousEnrollmentId: oldEnrollment._id,
    });

    await PromotionAudit.create({
      batchId,
      studentId,
      action,
      fromSessionId,
      fromClassId,
      fromArmId,
      fromEnrollmentId: oldEnrollment._id,
      toSessionId,
      toClassId,
      toArmId,
      newEnrollmentId: newEnrollment._id,
      performedBy,
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
      auditId: undefined, // filled below if you want it in the response
    };

    (action === "repeat" ? repeated : promoted).push(responseItem);
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Promotion process completed.",
    data: { batchId, promotedCount: promoted.length, repeatedCount: repeated.length, graduatedCount: graduated.length, skippedCount: skipped.length, promoted, repeated, graduated, skipped },
  });
});

// Returns { ok: true } or { ok: false, reason }
const rollbackSingleAudit = async (audit, actorId) => {
  if (audit.rolledBack) {
    return { ok: false, reason: "Already rolled back." };
  }

  if (audit.action === "graduate") {
    const student = await Student.findById(audit.studentId).select("status");
    if (student?.status !== "graduated") {
      return { ok: false, reason: "Student's status has changed since graduation; cannot roll back safely." };
    }

    await Student.findByIdAndUpdate(audit.studentId, {
      status: audit.previousStudentStatus,
      graduatedAt: audit.previousGraduatedAt,
      graduatedSessionId: audit.previousGraduatedSessionId,
    });
  } else {
    // promote or repeat — guard against a later action built on top of this enrollment
    const supersededBy = await Enrollment.findOne({ previousEnrollmentId: audit.newEnrollmentId });
    if (supersededBy) {
      return { ok: false, reason: "This enrollment has already been promoted/repeated again; roll that action back first." };
    }

    const enrollment = await Enrollment.findById(audit.newEnrollmentId);
    if (!enrollment) {
      return { ok: false, reason: "Target enrollment no longer exists." };
    }

    await Enrollment.findByIdAndDelete(audit.newEnrollmentId);
  }

  audit.rolledBack = true;
  audit.rolledBackAt = new Date();
  audit.rolledBackBy = actorId;
  await audit.save();

  return { ok: true };
};

// Roll back one student's action
exports.rollbackPromotionAudit = asyncHandler(async (req, res) => {
  const { auditId } = req.params;

  if (!isValidObjectId(auditId)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid audit ID.");
  }

  const audit = await PromotionAudit.findById(auditId);
  if (!audit) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Promotion record not found.");
  }

  const result = await rollbackSingleAudit(audit, req.user?.id);

  if (!result.ok) {
    res.status(StatusCodes.CONFLICT);
    throw new Error(result.reason);
  }

  res.status(StatusCodes.OK).json({ success: true, message: "Action rolled back." });
});

// Roll back every non-rolled-back action in a batch
exports.rollbackPromotionBatch = asyncHandler(async (req, res) => {
  const { batchId } = req.params;

  if (!isValidObjectId(batchId)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid batch ID.");
  }

  const audits = await PromotionAudit.find({ batchId, rolledBack: false });

  const rolledBack = [];
  const skipped = [];

  for (const audit of audits) {
    const result = await rollbackSingleAudit(audit, req.user?.id);
    if (result.ok) {
      rolledBack.push({ auditId: audit._id, studentId: audit.studentId });
    } else {
      skipped.push({ auditId: audit._id, studentId: audit.studentId, reason: result.reason });
    }
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Batch rollback completed.",
    data: { rolledBackCount: rolledBack.length, skippedCount: skipped.length, rolledBack, skipped },
  });
});

// Edit a promote/repeat action's target class/arm, or flip promote<->repeat
exports.editPromotionAudit = asyncHandler(async (req, res) => {
  const { auditId } = req.params;
  const { toClassId, toArmId, action } = req.body;

  if (!isValidObjectId(auditId)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid audit ID.");
  }

  const audit = await PromotionAudit.findById(auditId);
  if (!audit) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Promotion record not found.");
  }

  if (audit.rolledBack) {
    res.status(StatusCodes.CONFLICT);
    throw new Error("Cannot edit a rolled-back action.");
  }

  if (audit.action === "graduate") {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Graduation actions can't be edited directly — roll it back and resubmit.");
  }

  if (action && !["promote", "repeat"].includes(action)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Action must be 'promote' or 'repeat'.");
  }

  const supersededBy = await Enrollment.findOne({ previousEnrollmentId: audit.newEnrollmentId });
  if (supersededBy) {
    res.status(StatusCodes.CONFLICT);
    throw new Error("This enrollment has already been promoted/repeated again; edit that action instead.");
  }

  const enrollment = await Enrollment.findById(audit.newEnrollmentId);
  if (!enrollment) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Target enrollment no longer exists.");
  }

  audit.editHistory.push({
    editedBy: req.user?.id,
    previousToClassId: audit.toClassId,
    previousToArmId: audit.toArmId,
    previousAction: audit.action,
  });

  if (toClassId) {
    if (!isValidObjectId(toClassId)) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid toClassId.");
    }
    enrollment.classId = toClassId;
    audit.toClassId = toClassId;
  }

  if (toArmId) {
    if (!isValidObjectId(toArmId)) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid toArmId.");
    }
    enrollment.armId = toArmId;
    audit.toArmId = toArmId;
  }

  if (action) {
    enrollment.isRepeating = action === "repeat";
    audit.action = action;
  }

  await enrollment.save();
  await audit.save();

  res.status(StatusCodes.OK).json({ success: true, message: "Action updated.", data: { audit, enrollment } });
});

// List batches / individual history — needed for the frontend to render what's rollback-able
exports.getPromotionBatches = asyncHandler(async (req, res) => {
  const batches = await PromotionAudit.aggregate([
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$batchId",
        createdAt: { $first: "$createdAt" },
        fromSessionId: { $first: "$fromSessionId" },
        fromClassId: { $first: "$fromClassId" },
        fromArmId: { $first: "$fromArmId" },
        toSessionId: { $first: "$toSessionId" },
        total: { $sum: 1 },
        rolledBackCount: { $sum: { $cond: ["$rolledBack", 1, 0] } },
      },
    },
    { $sort: { createdAt: -1 } },
    { $limit: 50 },
  ]);

  res.status(StatusCodes.OK).json({ success: true, data: batches });
});

exports.getPromotionBatchDetail = asyncHandler(async (req, res) => {
  const { batchId } = req.params;

  if (!isValidObjectId(batchId)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid batch ID.");
  }

  const audits = await PromotionAudit.find({ batchId })
    .populate("studentId", "name admissionNumber")
    .populate("toClassId", "name")
    .populate("toArmId", "name")
    .sort({ createdAt: 1 });

  res.status(StatusCodes.OK).json({ success: true, data: audits });
});
