

const FeeStructure = require("../../models/fees/FeeStructure");
const FeeAccount = require("../../models/fees/FeeAccount");
const Enrollment = require("../../models/Enrollment");
const Term = require("../../models/Term");
const Session = require("../../models/Session");

const { recalculateFeeAccount } = require("../../utils/feeUtils");

// const getEffectiveStudentCategory = (enrollment, feeStructure) => {
//   const category = enrollment.studentCategory || "returning";

//   if (category !== "new_intake" && category !== "transfer") {
//     return "returning";
//   }

//   const enrollmentTermId = enrollment.termId?.toString();
//   const feeStructureTermId = feeStructure.termId?.toString();

//   if (enrollmentTermId && enrollmentTermId === feeStructureTermId) {
//     return category;
//   }

//   return "returning";
// };


const getId = (value) => {
  if (!value) return null;
  if (value._id) return value._id.toString();
  return value.toString();
};


const getEffectiveStudentCategory = (enrollment, feeStructure) => {
  const category = enrollment.studentCategory || "returning";

  // Returning students are always returning
  if (!["new_intake", "transfer"].includes(category)) {
    return "returning";
  }

  const enrollmentTermId = getId(enrollment.termId);
  const feeStructureTermId = getId(feeStructure.termId);

  // Only treat as new intake/transfer during the joining term
  if (
    enrollmentTermId &&
    feeStructureTermId &&
    enrollmentTermId === feeStructureTermId
  ) {
    return category;
  }
console.log({
  student: enrollment.studentId?.name,
  enrollmentCategory: enrollment.studentCategory,
  enrollmentTermId: enrollment.termId?.toString(),
  feeStructureTermId: feeStructure.termId?.toString(),
});

  return "returning";
};


const allowedCategories = ["all", "returning", "new_intake", "transfer"];

const shouldApplyFeeToStudent = (fee, studentCategory = "returning") => {
  const appliesTo = allowedCategories.includes(fee.feeTypeId?.appliesTo)
    ? fee.feeTypeId.appliesTo
    : "all";

  return appliesTo === "all" || appliesTo === studentCategory;
};

// ===============================
// HELPER: FIND PREVIOUS TERM/SESSION
// ===============================
const getPreviousTermAndSession = async (currentTerm) => {
  if (!currentTerm) return null;

  if (currentTerm.name === "2nd Term") {
    const prevTerm = await Term.findOne({
      session: currentTerm.session,
      name: "1st Term",
    });

    if (!prevTerm) return null;

    return {
      sessionId: currentTerm.session,
      termId: prevTerm._id,
    };
  }

  if (currentTerm.name === "3rd Term") {
    const prevTerm = await Term.findOne({
      session: currentTerm.session,
      name: "2nd Term",
    });

    if (!prevTerm) return null;

    return {
      sessionId: currentTerm.session,
      termId: prevTerm._id,
    };
  }

  if (currentTerm.name === "1st Term") {
    const currentSession = await Session.findById(currentTerm.session);

    if (!currentSession) return null;

    const previousSession = await Session.findOne({
      createdAt: { $lt: currentSession.createdAt },
    }).sort({ createdAt: -1 });

    if (!previousSession) return null;

    const prevThirdTerm = await Term.findOne({
      session: previousSession._id,
      name: "3rd Term",
    });

    if (!prevThirdTerm) return null;

    return {
      sessionId: previousSession._id,
      termId: prevThirdTerm._id,
    };
  }

  return null;
};

// ===============================
// GENERATE BULK FEE ACCOUNTS
// ===============================
exports.generateFeeAccounts = async (req, res) => {
  try {
    const { feeStructureId } = req.body;

    if (!feeStructureId) {
      return res.status(400).json({
        success: false,
        message: "Fee structure ID is required",
      });
    }

    const feeStructure = await FeeStructure.findById(feeStructureId).populate(
      "fees.feeTypeId"
    );

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found",
      });
    }

    if (!feeStructure.isActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot generate accounts from an inactive fee structure",
      });
    }

    const enrollQuery = {
      sessionId: feeStructure.sessionId,
      classId: feeStructure.classId,
    };

    if (feeStructure.armId) {
      enrollQuery.armId = feeStructure.armId;
    }

    const enrollments = await Enrollment.find(enrollQuery).populate("studentId");

    if (!enrollments.length) {
      return res.status(404).json({
        success: false,
        message: "No students found for this class/arm and session",
      });
    }

    const currentTerm = await Term.findById(feeStructure.termId);

    const previousContext = currentTerm
      ? await getPreviousTermAndSession(currentTerm)
      : null;

    let created = 0;
    let skipped = 0;
    let carriedOver = 0;

    for (const enrollment of enrollments) {
      if (!enrollment.studentId) {
        skipped++;
        continue;
      }

      const existingAccount = await FeeAccount.findOne({
        studentId: enrollment.studentId._id,
        sessionId: feeStructure.sessionId,
        termId: feeStructure.termId,
      });

      if (existingAccount) {
        skipped++;
        continue;
      }

      let previousBalance = 0;
      let previousFeeAccountId = null;

      if (previousContext) {
        const previousAccount = await FeeAccount.findOne({
          studentId: enrollment.studentId._id,
          sessionId: previousContext.sessionId,
          termId: previousContext.termId,
        });

        if (previousAccount && Number(previousAccount.totalDue || 0) > 0) {
          previousBalance = Number(previousAccount.totalDue || 0);
          previousFeeAccountId = previousAccount._id;
          carriedOver++;
        }
      }

      // const studentCategory = enrollment.studentCategory || "returning";
      // const studentCategory = getEffectiveStudentCategory(enrollment, feeStructure);
      const studentCategory = getEffectiveStudentCategory(
        enrollment,
        feeStructure
      );

      const applicableFees = feeStructure.fees.filter((fee) =>
        shouldApplyFeeToStudent(fee, studentCategory)
      );

      const fees = applicableFees.map((fee) => ({
        feeTypeId: fee.feeTypeId?._id || fee.feeTypeId,
        feeTypeName: fee.feeTypeName,
        amount: Number(fee.amount || 0),
        discount: 0,
        netAmount: Number(fee.amount || 0),
        paid: 0,
        due: Number(fee.amount || 0),
        appliesTo: fee.feeTypeId?.appliesTo || "all",
      }));

      const feeAccount = new FeeAccount({
        studentId: enrollment.studentId._id,
        enrollmentId: enrollment._id,
        sessionId: feeStructure.sessionId,
        termId: feeStructure.termId,
        classId: feeStructure.classId,
        armId: enrollment.armId,
        feeStructureId: feeStructure._id,
        billingCategory: studentCategory,
        previousBalance,
        previousFeeAccountId,
        fees,
      });

      recalculateFeeAccount(feeAccount);
      await feeAccount.save();

      created++;
    }

    res.status(201).json({
      success: true,
      message: "Fee accounts generated successfully",
      created,
      skipped,
      carriedOver,
      totalStudents: enrollments.length,
    });
  } catch (error) {
    console.error("Generate fee accounts error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// GENERATE SINGLE STUDENT FEE ACCOUNT
// ===============================
exports.generateSingleStudentFeeAccount = async (req, res) => {
  try {
    const { studentId, feeStructureId } = req.body;

    if (!studentId || !feeStructureId) {
      return res.status(400).json({
        success: false,
        message: "studentId and feeStructureId are required",
      });
    }

    const feeStructure = await FeeStructure.findById(feeStructureId).populate(
      "fees.feeTypeId"
    );

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found",
      });
    }

    if (!feeStructure.isActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot generate from inactive fee structure",
      });
    }

    const enrollment = await Enrollment.findOne({
      studentId,
      sessionId: feeStructure.sessionId,
      classId: feeStructure.classId,
      ...(feeStructure.armId ? { armId: feeStructure.armId } : {}),
    }).populate("studentId");

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found for this student/class/session",
      });
    }

    const existingAccount = await FeeAccount.findOne({
      studentId,
      sessionId: feeStructure.sessionId,
      termId: feeStructure.termId,
    });

    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: "Fee account already exists for this student and term",
      });
    }

    const currentTerm = await Term.findById(feeStructure.termId);

    const previousContext = currentTerm
      ? await getPreviousTermAndSession(currentTerm)
      : null;

    let previousBalance = 0;
    let previousFeeAccountId = null;

    if (previousContext) {
      const previousAccount = await FeeAccount.findOne({
        studentId,
        sessionId: previousContext.sessionId,
        termId: previousContext.termId,
      });

      if (previousAccount && Number(previousAccount.totalDue || 0) > 0) {
        previousBalance = Number(previousAccount.totalDue || 0);
        previousFeeAccountId = previousAccount._id;
      }
    }

    // const studentCategory = enrollment.studentCategory || "returning";
    // const studentCategory = getEffectiveStudentCategory(enrollment, feeStructure);
    const studentCategory = getEffectiveStudentCategory(
      enrollment,
      feeStructure
    );

    const applicableFees = feeStructure.fees.filter((fee) =>
      shouldApplyFeeToStudent(fee, studentCategory)
    );

    const fees = applicableFees.map((fee) => ({
      feeTypeId: fee.feeTypeId?._id || fee.feeTypeId,
      feeTypeName: fee.feeTypeName,
      amount: Number(fee.amount || 0),
      discount: 0,
      netAmount: Number(fee.amount || 0),
      paid: 0,
      due: Number(fee.amount || 0),
      appliesTo: fee.feeTypeId?.appliesTo || "all",
    }));

    const feeAccount = new FeeAccount({
      studentId,
      enrollmentId: enrollment._id,
      sessionId: feeStructure.sessionId,
      termId: feeStructure.termId,
      classId: feeStructure.classId,
      armId: enrollment.armId,
      feeStructureId: feeStructure._id,
      billingCategory: studentCategory,
      previousBalance,
      previousFeeAccountId,
      fees,
    });

    recalculateFeeAccount(feeAccount);
    await feeAccount.save();

    res.status(201).json({
      success: true,
      message: "Student fee account generated successfully",
      data: feeAccount,
    });
  } catch (error) {
    console.error("Generate single student fee account error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// GET FEE ACCOUNTS
// ===============================
exports.getFeeAccounts = async (req, res) => {
  try {
    const {
      sessionId,
      termId,
      classId,
      armId,
      studentId,
      status,
      page = 1,
      limit = 25,
    } = req.query;

    const query = {};

    if (sessionId) query.sessionId = sessionId;
    if (termId) query.termId = termId;
    if (classId) query.classId = classId;
    if (armId) query.armId = armId;
    if (studentId) query.studentId = studentId;
    if (status) query.status = status;

    const currentPage = Math.max(Number(page), 1);
    const pageLimit = Math.max(Number(limit), 1);
    const skip = (currentPage - 1) * pageLimit;

    const totalRecords = await FeeAccount.countDocuments(query);

    const accounts = await FeeAccount.find(query)
      .populate("studentId", "name admissionNumber image")
      .populate("enrollmentId")
      .populate("sessionId", "name")
      .populate("termId", "name")
      .populate("classId", "name")
      .populate("armId", "name")
      .populate("feeStructureId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    res.status(200).json({
      success: true,
      count: accounts.length,
      totalRecords,
      currentPage,
      totalPages: Math.ceil(totalRecords / pageLimit),
      data: accounts,
    });
  } catch (error) {
    console.error("Get fee accounts error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// GET SINGLE FEE ACCOUNT
// ===============================
exports.getFeeAccount = async (req, res) => {
  try {
    const account = await FeeAccount.findById(req.params.id)
      .populate("studentId", "name admissionNumber image gender parentContact")
      .populate("sessionId", "name")
      .populate("termId", "name")
      .populate("classId", "name")
      .populate("armId", "name")
      .populate("feeStructureId")
      .populate("previousFeeAccountId");

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Fee account not found",
      });
    }

    res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error) {
    console.error("Get fee account error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// GET STUDENT FEE ACCOUNT
// ===============================
exports.getStudentFeeAccount = async (req, res) => {
  try {
    const { studentId, sessionId, termId } = req.query;

    if (!studentId || !sessionId || !termId) {
      return res.status(400).json({
        success: false,
        message: "studentId, sessionId and termId are required",
      });
    }

    const account = await FeeAccount.findOne({
      studentId,
      sessionId,
      termId,
    })
      .populate("studentId", "name admissionNumber image gender parentContact")
      .populate("sessionId", "name")
      .populate("termId", "name")
      .populate("classId", "name")
      .populate("armId", "name")
      .populate("feeStructureId")
      .populate("previousFeeAccountId");

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Fee account not found for this student",
      });
    }

    res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error) {
    console.error("Get student fee account error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// GET STUDENT REPORT FEE INFO
// ===============================
exports.getStudentReportFeeInfo = async (req, res) => {
  try {
    const {
      studentId,
      sessionId,
      termId,
      classId,
      armId,
      nextSessionId,
      nextTermId,
    } = req.query;

    if (!studentId || !sessionId || !termId || !classId) {
      return res.status(400).json({
        success: false,
        message: "studentId, sessionId, termId and classId are required",
      });
    }

    let currentBalance = 0;
    let nextTermFee = 0;

    const currentAccount = await FeeAccount.findOne({
      studentId,
      sessionId,
      termId,
    });

    if (currentAccount) {
      currentBalance = Number(currentAccount.totalDue || 0);
    }

    if (nextSessionId && nextTermId) {
      const nextStructure = await FeeStructure.findOne({
        sessionId: nextSessionId,
        termId: nextTermId,
        classId,
        isActive: true,
        $or: [{ armId: armId || null }, { armId: null }],
      }).sort({ armId: -1 });

      if (nextStructure) {
        nextTermFee = Number(nextStructure.totalAmount || 0);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        currentBalance,
        nextTermFee,
      },
    });
  } catch (error) {
    console.error("Get student report fee info error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getMyFeeAccounts = async (req, res) => {
  try {
    const { sessionId, termId } = req.query;

    const query = {
      studentId: req.student._id,
    };

    if (sessionId) query.sessionId = sessionId;
    if (termId) query.termId = termId;

    const accounts = await FeeAccount.find(query)
      .populate("sessionId", "name")
      .populate("termId", "name")
      .populate("classId", "name")
      .populate("armId", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts,
    });
  } catch (error) {
    console.error("Get my fee accounts error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};