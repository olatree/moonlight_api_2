// src/controllers/fees/feeReportController.js

const FeeAccount = require("../../models/fees/FeeAccount");
const Payment = require("../../models/fees/Payment");

// ===============================
// DEBTORS LIST
// ===============================
exports.getDebtorsList = async (req, res) => {
  try {
    const { sessionId, termId, classId, armId, status } = req.query;

    const query = {
      totalDue: { $gt: 0 },
    };

    if (sessionId) query.sessionId = sessionId;
    if (termId) query.termId = termId;
    if (classId) query.classId = classId;
    if (armId) query.armId = armId;
    if (status) query.status = status;

    const debtors = await FeeAccount.find(query)
      .populate("studentId", "name admissionNumber parentContact image")
      .populate("sessionId", "name")
      .populate("termId", "name")
      .populate("classId", "name")
      .populate("armId", "name")
      .sort({ totalDue: -1 });

    const totalOutstanding = debtors.reduce(
      (sum, account) => sum + Number(account.totalDue || 0),
      0
    );

    res.status(200).json({
      success: true,
      count: debtors.length,
      totalOutstanding,
      data: debtors,
    });
  } catch (error) {
    console.error("Get debtors list error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// COLLECTION SUMMARY
// ===============================
// exports.getCollectionSummary = async (req, res) => {
//   try {
//     const { sessionId, termId, classId, armId } = req.query;

//     const query = {};

//     if (sessionId) query.sessionId = sessionId;
//     if (termId) query.termId = termId;
//     if (classId) query.classId = classId;
//     if (armId) query.armId = armId;

//     const accounts = await FeeAccount.find(query);

//     const totalExpected = accounts.reduce(
//       (sum, account) => sum + Number(account.netPayable || 0),
//       0
//     );

//     const totalOriginalFees = accounts.reduce(
//       (sum, account) => sum + Number(account.totalAmount || 0),
//       0
//     );

//     const totalDiscounts = accounts.reduce(
//       (sum, account) => sum + Number(account.totalDiscount || 0),
//       0
//     );

//     const totalPreviousBalance = accounts.reduce(
//       (sum, account) => sum + Number(account.previousBalance || 0),
//       0
//     );

//     const totalCollected = accounts.reduce(
//       (sum, account) => sum + Number(account.totalPaid || 0),
//       0
//     );

//     const totalOutstanding = accounts.reduce(
//       (sum, account) => sum + Number(account.totalDue || 0),
//       0
//     );

//     const paidCount = accounts.filter((account) => account.status === "paid").length;
//     const partPaymentCount = accounts.filter(
//       (account) => account.status === "part_payment"
//     ).length;
//     const unpaidCount = accounts.filter(
//       (account) => account.status === "unpaid"
//     ).length;
//     const overpaidCount = accounts.filter(
//       (account) => account.status === "overpaid"
//     ).length;

//     const collectionRate =
//       totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

//     res.status(200).json({
//       success: true,
//       data: {
//         totalAccounts: accounts.length,

//         totalOriginalFees,
//         totalDiscounts,
//         totalPreviousBalance,

//         totalExpected,
//         totalCollected,
//         totalOutstanding,

//         collectionRate: Number(collectionRate.toFixed(2)),

//         statusSummary: {
//           paid: paidCount,
//           partPayment: partPaymentCount,
//           unpaid: unpaidCount,
//           overpaid: overpaidCount,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Get collection summary error:", error);

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// ===============================
// STUDENT BALANCE REPORT
// ===============================
exports.getStudentBalanceReport = async (req, res) => {
  try {
    const { studentId } = req.params;

    const accounts = await FeeAccount.find({ studentId })
      .populate("studentId", "name admissionNumber parentContact image")
      .populate("sessionId", "name")
      .populate("termId", "name")
      .populate("classId", "name")
      .populate("armId", "name")
      .sort({ createdAt: -1 });

    const payments = await Payment.find({
      studentId,
      status: "successful",
    })
      .populate("sessionId", "name")
      .populate("termId", "name")
      .populate("receivedBy", "name role")
      .sort({ createdAt: -1 });

    const totalExpected = accounts.reduce(
      (sum, account) => sum + Number(account.netPayable || 0),
      0
    );

    const totalPaid = accounts.reduce(
      (sum, account) => sum + Number(account.totalPaid || 0),
      0
    );

    const totalDue = accounts.reduce(
      (sum, account) => sum + Number(account.totalDue || 0),
      0
    );

    res.status(200).json({
      success: true,
      data: {
        student: accounts[0]?.studentId || null,
        summary: {
          totalExpected,
          totalPaid,
          totalDue,
        },
        accounts,
        payments,
      },
    });
  } catch (error) {
    console.error("Get student balance report error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// PAYMENT SUMMARY
// ===============================
exports.getPaymentSummary = async (req, res) => {
  try {
    const { sessionId, termId, startDate, endDate, paymentMethod } = req.query;

    const query = {
      status: "successful",
    };

    if (sessionId) query.sessionId = sessionId;
    if (termId) query.termId = termId;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    if (startDate || endDate) {
      query.createdAt = {};

      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const payments = await Payment.find(query)
      .populate("studentId", "name admissionNumber")
      .populate("sessionId", "name")
      .populate("termId", "name")
      .populate("receivedBy", "name role")
      .sort({ createdAt: -1 });

    const totalCollected = payments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );

    const methodSummary = payments.reduce((summary, payment) => {
      const method = payment.paymentMethod || "unknown";

      summary[method] = (summary[method] || 0) + Number(payment.amount || 0);

      return summary;
    }, {});

    res.status(200).json({
      success: true,
      count: payments.length,
      totalCollected,
      methodSummary,
      data: payments,
    });
  } catch (error) {
    console.error("Get payment summary error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getCollectionSummary = async (req, res) => {
  try {
    const { sessionId, termId, classId, armId, status } = req.query;

    const query = {};

    if (sessionId) query.sessionId = sessionId;
    if (termId) query.termId = termId;
    if (classId) query.classId = classId;
    if (armId) query.armId = armId;
    if (status) query.status = status;

    const accounts = await FeeAccount.find(query);

    const totalExpected = accounts.reduce(
      (sum, account) => sum + Number(account.netPayable || 0),
      0
    );

    const totalOriginalFees = accounts.reduce(
      (sum, account) => sum + Number(account.totalAmount || 0),
      0
    );

    const totalDiscounts = accounts.reduce(
      (sum, account) => sum + Number(account.totalDiscount || 0),
      0
    );

    const totalPreviousBalance = accounts.reduce(
      (sum, account) => sum + Number(account.previousBalance || 0),
      0
    );

    const totalCollected = accounts.reduce(
      (sum, account) => sum + Number(account.totalPaid || 0),
      0
    );

    const totalOutstanding = accounts.reduce(
      (sum, account) => sum + Number(account.totalDue || 0),
      0
    );

    const collectionRate =
      totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        totalAccounts: accounts.length,
        totalOriginalFees,
        totalDiscounts,
        totalPreviousBalance,
        totalExpected,
        totalCollected,
        totalOutstanding,
        collectionRate: Number(collectionRate.toFixed(2)),
        statusSummary: {
          paid: accounts.filter((a) => a.status === "paid").length,
          partPayment: accounts.filter((a) => a.status === "part_payment").length,
          unpaid: accounts.filter((a) => a.status === "unpaid").length,
          overpaid: accounts.filter((a) => a.status === "overpaid").length,
        },
      },
    });
  } catch (error) {
    console.error("Get collection summary error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};