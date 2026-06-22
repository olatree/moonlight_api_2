// // src/controllers/fees/feeAccountController.js

// const FeeStructure = require("../../models/fees/FeeStructure");
// const FeeAccount = require("../../models/fees/FeeAccount");
// const Enrollment = require("../../models/Enrollment");
// const Term = require("../../models/Term");

// const { recalculateFeeAccount } = require("../../utils/feeUtils");

// // ===============================
// // HELPER: FIND PREVIOUS TERM
// // ===============================
// const getPreviousTerm = async (currentTerm) => {
//   const termOrder = ["First Term", "Second Term", "Third Term"];

//   const currentIndex = termOrder.indexOf(currentTerm.name);

//   if (currentIndex <= 0) return null;

//   const previousTermName = termOrder[currentIndex - 1];

//   return await Term.findOne({
//     session: currentTerm.session,
//     name: previousTermName,
//   });
// };

// // ===============================
// // GENERATE FEE ACCOUNTS
// // ===============================
// exports.generateFeeAccounts = async (req, res) => {
//   try {
//     const { feeStructureId } = req.body;

//     if (!feeStructureId) {
//       return res.status(400).json({
//         success: false,
//         message: "Fee structure ID is required",
//       });
//     }

//     const feeStructure = await FeeStructure.findById(feeStructureId);

//     if (!feeStructure) {
//       return res.status(404).json({
//         success: false,
//         message: "Fee structure not found",
//       });
//     }

//     if (!feeStructure.isActive) {
//       return res.status(400).json({
//         success: false,
//         message: "Cannot generate accounts from an inactive fee structure",
//       });
//     }

//     const enrollQuery = {
//       sessionId: feeStructure.sessionId,
//       classId: feeStructure.classId,
//     };

//     if (feeStructure.armId) {
//       enrollQuery.armId = feeStructure.armId;
//     }

//     const enrollments = await Enrollment.find(enrollQuery).populate("studentId");

//     if (!enrollments.length) {
//       return res.status(404).json({
//         success: false,
//         message: "No students found for this class/arm and session",
//       });
//     }

//     const currentTerm = await Term.findById(feeStructure.termId);

//     const previousTerm = currentTerm ? await getPreviousTerm(currentTerm) : null;

//     let created = 0;
//     let skipped = 0;

//     for (const enrollment of enrollments) {
//       const existingAccount = await FeeAccount.findOne({
//         studentId: enrollment.studentId._id,
//         sessionId: feeStructure.sessionId,
//         termId: feeStructure.termId,
//       });

//       if (existingAccount) {
//         skipped++;
//         continue;
//       }

//       let previousBalance = 0;
//       let previousFeeAccountId = null;

//       if (previousTerm) {
//         const previousAccount = await FeeAccount.findOne({
//           studentId: enrollment.studentId._id,
//           sessionId: feeStructure.sessionId,
//           termId: previousTerm._id,
//         });

//         if (previousAccount && previousAccount.totalDue > 0) {
//           previousBalance = previousAccount.totalDue;
//           previousFeeAccountId = previousAccount._id;
//         }
//       }

//       const fees = feeStructure.fees.map((fee) => ({
//         feeTypeId: fee.feeTypeId,
//         feeTypeName: fee.feeTypeName,
//         amount: fee.amount,
//         discount: 0,
//         netAmount: fee.amount,
//         paid: 0,
//         due: fee.amount,
//       }));

//       const feeAccount = new FeeAccount({
//         studentId: enrollment.studentId._id,
//         enrollmentId: enrollment._id,
//         sessionId: feeStructure.sessionId,
//         termId: feeStructure.termId,
//         classId: feeStructure.classId,
//         armId: enrollment.armId,
//         feeStructureId: feeStructure._id,

//         previousBalance,
//         previousFeeAccountId,

//         fees,
//       });

//       recalculateFeeAccount(feeAccount);

//       await feeAccount.save();

//       created++;
//     }

//     res.status(201).json({
//       success: true,
//       message: "Fee accounts generated successfully",
//       created,
//       skipped,
//       totalStudents: enrollments.length,
//     });
//   } catch (error) {
//     console.error("Generate fee accounts error:", error);

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // ===============================
// // GET FEE ACCOUNTS
// // ===============================
// // exports.getFeeAccounts = async (req, res) => {
// //   try {
// //     const { sessionId, termId, classId, armId, studentId, status } = req.query;

// //     const query = {};

// //     if (sessionId) query.sessionId = sessionId;
// //     if (termId) query.termId = termId;
// //     if (classId) query.classId = classId;
// //     if (armId) query.armId = armId;
// //     if (studentId) query.studentId = studentId;
// //     if (status) query.status = status;

// //     const accounts = await FeeAccount.find(query)
// //       .populate("studentId", "name admissionNumber image")
// //       .populate("enrollmentId")
// //       .populate("sessionId", "name")
// //       .populate("termId", "name")
// //       .populate("classId", "name")
// //       .populate("armId", "name")
// //       .populate("feeStructureId")
// //       .sort({ createdAt: -1 });

// //     res.status(200).json({
// //       success: true,
// //       count: accounts.length,
// //       data: accounts,
// //     });
// //   } catch (error) {
// //     console.error("Get fee accounts error:", error);

// //     res.status(500).json({
// //       success: false,
// //       message: error.message,
// //     });
// //   }
// // };

// exports.getFeeAccounts = async (req, res) => {
//   try {
//     const {
//       sessionId,
//       termId,
//       classId,
//       armId,
//       studentId,
//       status,
//       page = 1,
//       limit = 25,
//     } = req.query;

//     const query = {};

//     if (sessionId) query.sessionId = sessionId;
//     if (termId) query.termId = termId;
//     if (classId) query.classId = classId;
//     if (armId) query.armId = armId;
//     if (studentId) query.studentId = studentId;
//     if (status) query.status = status;

//     const currentPage = Number(page);
//     const pageLimit = Number(limit);
//     const skip = (currentPage - 1) * pageLimit;

//     const totalRecords = await FeeAccount.countDocuments(query);

//     const accounts = await FeeAccount.find(query)
//       .populate("studentId", "name admissionNumber image")
//       .populate("enrollmentId")
//       .populate("sessionId", "name")
//       .populate("termId", "name")
//       .populate("classId", "name")
//       .populate("armId", "name")
//       .populate("feeStructureId")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(pageLimit);

//     res.status(200).json({
//       success: true,
//       count: accounts.length,
//       totalRecords,
//       currentPage,
//       totalPages: Math.ceil(totalRecords / pageLimit),
//       data: accounts,
//     });
//   } catch (error) {
//     console.error("Get fee accounts error:", error);

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // ===============================
// // GET SINGLE FEE ACCOUNT
// // ===============================
// exports.getFeeAccount = async (req, res) => {
//   try {
//     const account = await FeeAccount.findById(req.params.id)
//       .populate("studentId", "name admissionNumber image gender parentContact")
//       .populate("sessionId", "name")
//       .populate("termId", "name")
//       .populate("classId", "name")
//       .populate("armId", "name")
//       .populate("feeStructureId")
//       .populate("previousFeeAccountId");

//     if (!account) {
//       return res.status(404).json({
//         success: false,
//         message: "Fee account not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: account,
//     });
//   } catch (error) {
//     console.error("Get fee account error:", error);

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // ===============================
// // GET STUDENT FEE ACCOUNT
// // ===============================
// exports.getStudentFeeAccount = async (req, res) => {
//   try {
//     const { studentId, sessionId, termId } = req.query;

//     if (!studentId || !sessionId || !termId) {
//       return res.status(400).json({
//         success: false,
//         message: "studentId, sessionId and termId are required",
//       });
//     }

//     const account = await FeeAccount.findOne({
//       studentId,
//       sessionId,
//       termId,
//     })
//       .populate("studentId", "name admissionNumber image gender parentContact")
//       .populate("sessionId", "name")
//       .populate("termId", "name")
//       .populate("classId", "name")
//       .populate("armId", "name")
//       .populate("feeStructureId")
//       .populate("previousFeeAccountId");

//     if (!account) {
//       return res.status(404).json({
//         success: false,
//         message: "Fee account not found for this student",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: account,
//     });
//   } catch (error) {
//     console.error("Get student fee account error:", error);

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// src/controllers/fees/feeAccountController.js

const FeeStructure = require("../../models/fees/FeeStructure");
const FeeAccount = require("../../models/fees/FeeAccount");
const Enrollment = require("../../models/Enrollment");
const Term = require("../../models/Term");
const Session = require("../../models/Session");

const { recalculateFeeAccount } = require("../../utils/feeUtils");

// ===============================
// HELPER: FIND PREVIOUS TERM/SESSION
// ===============================
const getPreviousTermAndSession = async (currentTerm) => {
  if (!currentTerm) return null;

  // 2nd Term carries 1st Term debt in same session
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

  // 3rd Term carries 2nd Term debt in same session
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

  // 1st Term carries 3rd Term debt from previous session
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
// GENERATE FEE ACCOUNTS
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

    const feeStructure = await FeeStructure.findById(feeStructureId);

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

      const fees = feeStructure.fees.map((fee) => ({
        feeTypeId: fee.feeTypeId,
        feeTypeName: fee.feeTypeName,
        amount: Number(fee.amount || 0),
        discount: 0,
        netAmount: Number(fee.amount || 0),
        paid: 0,
        due: Number(fee.amount || 0),
      }));

      const feeAccount = new FeeAccount({
        studentId: enrollment.studentId._id,
        enrollmentId: enrollment._id,
        sessionId: feeStructure.sessionId,
        termId: feeStructure.termId,
        classId: feeStructure.classId,
        armId: enrollment.armId,
        feeStructureId: feeStructure._id,
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
        $or: [
          { armId: armId || null },
          { armId: null },
        ],
        isActive: true,
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