// // controllers/fees/feeStructureController.js

// const FeeStructure = require("../../models/fees/FeeStructure");
// const FeeType = require("../../models/fees/FeeType")

// // =========================
// // CREATE FEE STRUCTURE
// // =========================
// exports.createFeeStructure = async (req, res) => {
//   try {
//     const { sessionId, termId, classId, armId, fees } = req.body;

//     if (!sessionId || !termId || !classId || !fees || !fees.length) {
//       return res.status(400).json({
//         success: false,
//         message: "Session, term, class, and fees are required",
//       });
//     }

//     const existing = await FeeStructure.findOne({
//       sessionId,
//       termId,
//       classId,
//       armId: armId || null,
//     });

//     if (existing) {
//       return res.status(400).json({
//         success: false,
//         message: "Fee structure already exists for this class/arm, session, and term",
//       });
//     }

//     const preparedFees = [];

//     for (const fee of fees) {
//       const feeType = await FeeType.findById(fee.feeTypeId);

//       if (!feeType) {
//         return res.status(404).json({
//           success: false,
//           message: "One of the selected fee types was not found",
//         });
//       }

//       if (!feeType.isActive) {
//         return res.status(400).json({
//           success: false,
//           message: `${feeType.name} is archived and cannot be used`,
//         });
//       }

//       preparedFees.push({
//         feeTypeId: feeType._id,
//         feeTypeName: feeType.name,
//         amount: Number(fee.amount || 0),
//       });
//     }

//     const totalAmount = preparedFees.reduce(
//       (sum, fee) => sum + Number(fee.amount || 0),
//       0
//     );

//     const feeStructure = await FeeStructure.create({
//       sessionId,
//       termId,
//       classId,
//       armId: armId || null,
//       fees: preparedFees,
//       totalAmount,
//       createdBy: req.user?._id,
//     });

//     res.status(201).json({
//       success: true,
//       message: "Fee structure created successfully",
//       data: feeStructure,
//     });
//   } catch (error) {
//     console.error("Create fee structure error:", error);

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // =========================
// // GET ALL FEE STRUCTURES
// // =========================
// exports.getFeeStructures = async (req, res) => {
//   try {
//     const { sessionId, termId, classId, armId } = req.query;

//     const query = {};

//     if (sessionId) query.sessionId = sessionId;
//     if (termId) query.termId = termId;
//     if (classId) query.classId = classId;
//     if (armId) query.armId = armId;

//     const feeStructures = await FeeStructure.find(query)
//       .populate("sessionId", "name")
//       .populate("termId", "name")
//       .populate("classId", "name")
//       .populate("armId", "name")
//       .populate("createdBy", "name email role")
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       count: feeStructures.length,
//       data: feeStructures,
//     });
//   } catch (error) {
//     console.error("Get fee structures error:", error);

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // =========================
// // GET SINGLE FEE STRUCTURE
// // =========================
// exports.getFeeStructure = async (req, res) => {
//   try {
//     const feeStructure = await FeeStructure.findById(req.params.id)
//       .populate("sessionId", "name")
//       .populate("termId", "name")
//       .populate("classId", "name")
//       .populate("armId", "name")
//       .populate("fees.feeTypeId", "name isCompulsory isActive")
//       .populate("createdBy", "name email role");

//     if (!feeStructure) {
//       return res.status(404).json({
//         success: false,
//         message: "Fee structure not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: feeStructure,
//     });
//   } catch (error) {
//     console.error("Get fee structure error:", error);

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // =========================
// // UPDATE FEE STRUCTURE
// // =========================
// exports.updateFeeStructure = async (req, res) => {
//   try {
//     const { fees, isActive } = req.body;

//     const feeStructure = await FeeStructure.findById(req.params.id);

//     if (!feeStructure) {
//       return res.status(404).json({
//         success: false,
//         message: "Fee structure not found",
//       });
//     }

//     if (fees && fees.length > 0) {
//       const preparedFees = [];

//       for (const fee of fees) {
//         const feeType = await FeeType.findById(fee.feeTypeId);

//         if (!feeType) {
//           return res.status(404).json({
//             success: false,
//             message: "One of the selected fee types was not found",
//           });
//         }

//         if (!feeType.isActive) {
//           return res.status(400).json({
//             success: false,
//             message: `${feeType.name} is archived and cannot be used`,
//           });
//         }

//         preparedFees.push({
//           feeTypeId: feeType._id,
//           feeTypeName: feeType.name,
//           amount: Number(fee.amount || 0),
//         });
//       }

//       feeStructure.fees = preparedFees;
//       feeStructure.totalAmount = preparedFees.reduce(
//         (sum, fee) => sum + Number(fee.amount || 0),
//         0
//       );
//     }

//     if (typeof isActive === "boolean") {
//       feeStructure.isActive = isActive;
//     }

//     await feeStructure.save();

//     res.status(200).json({
//       success: true,
//       message: "Fee structure updated successfully",
//       data: feeStructure,
//     });
//   } catch (error) {
//     console.error("Update fee structure error:", error);

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // =========================
// // DELETE / DEACTIVATE
// // =========================
// exports.deactivateFeeStructure = async (req, res) => {
//   try {
//     const feeStructure = await FeeStructure.findById(req.params.id);

//     if (!feeStructure) {
//       return res.status(404).json({
//         success: false,
//         message: "Fee structure not found",
//       });
//     }

//     feeStructure.isActive = false;
//     await feeStructure.save();

//     res.status(200).json({
//       success: true,
//       message: "Fee structure deactivated successfully",
//     });
//   } catch (error) {
//     console.error("Deactivate fee structure error:", error);

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// controllers/fees/feeStructureController.js

const FeeStructure = require("../../models/fees/FeeStructure");
const FeeType = require("../../models/fees/FeeType");
const FeeAccount = require("../../models/fees/FeeAccount");

const { recalculateFeeAccount } = require("../../utils/feeUtils");

// =========================
// HELPER: PREPARE FEES
// =========================
const prepareFees = async (fees) => {
  const preparedFees = [];

  for (const fee of fees) {
    const feeType = await FeeType.findById(fee.feeTypeId);

    if (!feeType) {
      throw new Error("One of the selected fee types was not found");
    }

    if (!feeType.isActive) {
      throw new Error(`${feeType.name} is archived and cannot be used`);
    }

    preparedFees.push({
      feeTypeId: feeType._id,
      feeTypeName: feeType.name,
      amount: Number(fee.amount || 0),
    });
  }

  return preparedFees;
};

// =========================
// HELPER: SYNC ACCOUNTS
// =========================
const syncFeeAccountsWithStructure = async (feeStructure) => {
  const accounts = await FeeAccount.find({
    feeStructureId: feeStructure._id,
  });

  let updatedAccounts = 0;

  for (const account of accounts) {
    for (const structureFee of feeStructure.fees) {
      const existingFee = account.fees.find(
        (fee) =>
          fee.feeTypeId?.toString() === structureFee.feeTypeId.toString()
      );

      // New fee added to structure, add it to existing student account
      if (!existingFee) {
        account.fees.push({
          feeTypeId: structureFee.feeTypeId,
          feeTypeName: structureFee.feeTypeName,
          amount: structureFee.amount,
          discount: 0,
          netAmount: structureFee.amount,
          paid: 0,
          due: structureFee.amount,
        });

        continue;
      }

      // Existing fee: update only if no payment has been made on that item
      const hasPayment = Number(existingFee.paid || 0) > 0;

      if (!hasPayment) {
        existingFee.amount = structureFee.amount;
        existingFee.feeTypeName = structureFee.feeTypeName;
      }
    }

    // Remove fee items that were removed from structure,
    // but only if no payment has been made on that fee item.
    account.fees = account.fees.filter((accountFee) => {
      const stillExistsInStructure = feeStructure.fees.some(
        (structureFee) =>
          structureFee.feeTypeId.toString() === accountFee.feeTypeId?.toString()
      );

      const hasPayment = Number(accountFee.paid || 0) > 0;

      return stillExistsInStructure || hasPayment;
    });

    recalculateFeeAccount(account);

    await account.save();

    updatedAccounts++;
  }

  return updatedAccounts;
};

// =========================
// CREATE FEE STRUCTURE
// =========================
exports.createFeeStructure = async (req, res) => {
  try {
    const { sessionId, termId, classId, armId, fees } = req.body;

    if (!sessionId || !termId || !classId || !fees || !fees.length) {
      return res.status(400).json({
        success: false,
        message: "Session, term, class, and fees are required",
      });
    }

    const existing = await FeeStructure.findOne({
      sessionId,
      termId,
      classId,
      armId: armId || null,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message:
          "Fee structure already exists for this class/arm, session, and term",
      });
    }

    let preparedFees;

    try {
      preparedFees = await prepareFees(fees);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    const totalAmount = preparedFees.reduce(
      (sum, fee) => sum + Number(fee.amount || 0),
      0
    );

    const feeStructure = await FeeStructure.create({
      sessionId,
      termId,
      classId,
      armId: armId || null,
      fees: preparedFees,
      totalAmount,
      createdBy: req.user?._id,
    });

    res.status(201).json({
      success: true,
      message: "Fee structure created successfully",
      data: feeStructure,
    });
  } catch (error) {
    console.error("Create fee structure error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// GET ALL FEE STRUCTURES
// =========================
exports.getFeeStructures = async (req, res) => {
  try {
    const { sessionId, termId, classId, armId } = req.query;

    const query = {};

    if (sessionId) query.sessionId = sessionId;
    if (termId) query.termId = termId;
    if (classId) query.classId = classId;
    if (armId) query.armId = armId;

    const feeStructures = await FeeStructure.find(query)
      .populate("sessionId", "name")
      .populate("termId", "name")
      .populate("classId", "name")
      .populate("armId", "name")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: feeStructures.length,
      data: feeStructures,
    });
  } catch (error) {
    console.error("Get fee structures error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// GET SINGLE FEE STRUCTURE
// =========================
exports.getFeeStructure = async (req, res) => {
  try {
    const feeStructure = await FeeStructure.findById(req.params.id)
      .populate("sessionId", "name")
      .populate("termId", "name")
      .populate("classId", "name")
      .populate("armId", "name")
      .populate("fees.feeTypeId", "name isCompulsory isActive")
      .populate("createdBy", "name email role");

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found",
      });
    }

    res.status(200).json({
      success: true,
      data: feeStructure,
    });
  } catch (error) {
    console.error("Get fee structure error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// UPDATE FEE STRUCTURE + SYNC ACCOUNTS
// =========================
exports.updateFeeStructure = async (req, res) => {
  try {
    const { fees, isActive } = req.body;

    const feeStructure = await FeeStructure.findById(req.params.id);

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found",
      });
    }

    let accountsUpdated = 0;

    if (fees && fees.length > 0) {
      let preparedFees;

      try {
        preparedFees = await prepareFees(fees);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      feeStructure.fees = preparedFees;
      feeStructure.totalAmount = preparedFees.reduce(
        (sum, fee) => sum + Number(fee.amount || 0),
        0
      );
    }

    if (typeof isActive === "boolean") {
      feeStructure.isActive = isActive;
    }

    await feeStructure.save();

    if (fees && fees.length > 0) {
      accountsUpdated = await syncFeeAccountsWithStructure(feeStructure);
    }

    res.status(200).json({
      success: true,
      message: "Fee structure updated successfully",
      accountsUpdated,
      data: feeStructure,
    });
  } catch (error) {
    console.error("Update fee structure error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// DELETE / DEACTIVATE
// =========================
exports.deactivateFeeStructure = async (req, res) => {
  try {
    const feeStructure = await FeeStructure.findById(req.params.id);

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found",
      });
    }

    feeStructure.isActive = false;
    await feeStructure.save();

    res.status(200).json({
      success: true,
      message: "Fee structure deactivated successfully",
    });
  } catch (error) {
    console.error("Deactivate fee structure error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};