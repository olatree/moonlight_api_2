// // controllers/feeController.js
// const feeManagementService = require("../services/feeManagementServices");
// const FeeAccount = require("../models/FeeAccount");
// const FeeStructure = require("../models/FeeStructure");
// const Enrollment = require("../models/Enrollment");
// const Payment = require("../models/Payment");
// const mongoose = require("mongoose");

// class FeeController {
  
//   // ========== HELPER METHOD ==========
  
//   async autoGenerateFeeAccountsForStructure(feeStructure, session) {
//     try {
//       console.log('Auto-generating fee accounts for fee structure:', feeStructure);
      
//       const query = {
//         classId: feeStructure.classId,
//         sessionId: feeStructure.sessionId,
//         isActive: true
//       };
//       if (feeStructure.armId) {
//         query.armId = feeStructure.armId;
//       }
      
//       const enrollments = await Enrollment.find(query)
//         .populate("studentId")
//         .session(session);
      
//       console.log(`Found ${enrollments.length} students for fee structure generation`);
      
//       for (const enrollment of enrollments) {
//         let feeAccount = await FeeAccount.findOne({
//           studentId: enrollment.studentId._id,
//           sessionId: feeStructure.sessionId,
//           termId: feeStructure.termId
//         }).session(session);
        
//         if (!feeAccount) {
//           const allFeeStructures = await FeeStructure.find({
//             classId: feeStructure.classId,
//             $or: [
//               { armId: feeStructure.armId || null },
//               { armId: null }
//             ],
//             sessionId: feeStructure.sessionId,
//             termId: feeStructure.termId
//           }).session(session);
          
//           // const fees = allFeeStructures.map(fs => ({
//           //   feeStructureId: fs._id,
//           //   feeType: fs.feeType,
//           //   amount: fs.amount,
//           //   paid: 0,
//           //   due: fs.amount
//           // }));

//           const fees = allFeeStructures.map(fs => ({
//             feeStructureId: fs._id,
//             feeType: fs.feeType,
//             description: fs.description || "",
//             amount: fs.amount,
//             paid: 0,
//             due: fs.amount
//           }));
          
//           const totalAmount = fees.reduce((sum, fee) => sum + fee.amount, 0);
          
//           feeAccount = new FeeAccount({
//             studentId: enrollment.studentId._id,
//             enrollmentId: enrollment._id,
//             sessionId: feeStructure.sessionId,
//             termId: feeStructure.termId,
//             fees,
//             totalAmount,
//             totalPaid: 0,
//             totalDue: totalAmount,
//             isFullyPaid: totalAmount === 0
//           });
          
//           await feeAccount.save({ session });
//           console.log(`Created fee account for ${enrollment.studentId.name}`);
//         } else {
//           const existingFee = feeAccount.fees.find(f => f.feeType === feeStructure.feeType);
          
//           if (!existingFee) {
//             // feeAccount.fees.push({
//             //   feeStructureId: feeStructure._id,
//             //   feeType: feeStructure.feeType,
//             //   amount: feeStructure.amount,
//             //   paid: 0,
//             //   due: feeStructure.amount
//             // });

//             feeAccount.fees.push({
//               feeStructureId: feeStructure._id,
//               feeType: feeStructure.feeType,
//               description: feeStructure.description || "",
//               amount: feeStructure.amount,
//               paid: 0,
//               due: feeStructure.amount
//             });
                        
//             feeAccount.totalAmount += feeStructure.amount;
//             feeAccount.totalDue += feeStructure.amount;
//             feeAccount.isFullyPaid = false;
            
//             await feeAccount.save({ session });
//             console.log(`Updated fee account for ${enrollment.studentId.name} with new fee type`);
//           }
//         }
//       }
      
//       return { success: true, studentsAffected: enrollments.length };
//     } catch (error) {
//       console.error('Error auto-generating fee accounts:', error);
//       throw error;
//     }
//   }
  
//   async updateFeeAccountsForStructure(feeStructure, oldAmount, newAmount, session) {
//     try {
//       const feeAccounts = await FeeAccount.find({
//         sessionId: feeStructure.sessionId,
//         termId: feeStructure.termId
//       }).session(session);
//       const amountDifference = newAmount - oldAmount;
      
//       for (const feeAccount of feeAccounts) {
//         const feeIndex = feeAccount.fees.findIndex(f => 
//           f.feeStructureId && f.feeStructureId.toString() === feeStructure._id.toString()
//         );
        
//         if (feeIndex !== -1) {
//           feeAccount.fees[feeIndex].amount = newAmount;
//           feeAccount.fees[feeIndex].due += amountDifference;
//           feeAccount.totalAmount += amountDifference;
//           feeAccount.totalDue += amountDifference;
//           feeAccount.isFullyPaid = feeAccount.totalDue === 0;
//           await feeAccount.save({ session });
//         }
//       }
//     } catch (error) {
//       console.error('Error updating fee accounts:', error);
//     }
//   }
  
//   // ========== FEE STRUCTURE CRUD ==========
  
//   async createFeeStructure(req, res) {
//     const session = await mongoose.startSession();
//     session.startTransaction();
    
//     try {
//       const { classId, armId, sessionId, termId, feeType, amount, isMandatory, description } = req.body;
      
//       if (!classId || !sessionId || !termId || !feeType || !amount) {
//         throw new Error("Missing required fields");
//       }
      
//       const existingStructure = await FeeStructure.findOne({
//         classId,
//         armId: armId || null,
//         sessionId,
//         termId,
//         feeType
//       }).session(session);
      
//       if (existingStructure) {
//         throw new Error(`Fee structure for ${feeType} already exists`);
//       }
      
//       const feeStructure = new FeeStructure({
//         classId,
//         armId: armId || null,
//         sessionId,
//         termId,
//         feeType,
//         amount: parseFloat(amount),
//         isMandatory: isMandatory !== false,
//         description: description || ''
//       });
      
//       await feeStructure.save({ session });
      
//       try {
//         await this.autoGenerateFeeAccountsForStructure(feeStructure, session);
//       } catch (autoError) {
//         console.error('Auto-generation error:', autoError);
//       }
      
//       await session.commitTransaction();
      
//       res.status(201).json({
//         success: true,
//         message: "Fee structure created and fee accounts generated successfully",
//         data: feeStructure
//       });
      
//     } catch (error) {
//       await session.abortTransaction();
//       res.status(400).json({ success: false, message: error.message });
//     } finally {
//       session.endSession();
//     }
//   }
  
//   async updateFeeStructure(req, res) {
//     const session = await mongoose.startSession();
//     session.startTransaction();
    
//     try {
//       const { id } = req.params;
//       const { amount, isMandatory, description } = req.body;
      
//       const feeStructure = await FeeStructure.findById(id).session(session);
//       if (!feeStructure) throw new Error("Fee structure not found");
      
//       const oldAmount = feeStructure.amount;
//       if (amount !== undefined) feeStructure.amount = amount;
//       if (isMandatory !== undefined) feeStructure.isMandatory = isMandatory;
//       if (description !== undefined) feeStructure.description = description;
      
//       await feeStructure.save({ session });
      
//       if (amount !== undefined && oldAmount !== amount) {
//         await this.updateFeeAccountsForStructure(feeStructure, oldAmount, amount, session);
//       }
      
//       await session.commitTransaction();
      
//       res.status(200).json({
//         success: true,
//         message: "Fee structure updated successfully",
//         data: feeStructure
//       });
      
//     } catch (error) {
//       await session.abortTransaction();
//       res.status(400).json({ success: false, message: error.message });
//     }
//   }
  
//   async deleteFeeStructure(req, res) {
//     try {
//       const { id } = req.params;
//       const feeStructure = await FeeStructure.findByIdAndDelete(id);
//       if (!feeStructure) throw new Error("Fee structure not found");
//       res.status(200).json({ success: true, message: "Fee structure deleted successfully" });
//     } catch (error) {
//       res.status(400).json({ success: false, message: error.message });
//     }
//   }
  
//   async getFeeStructures(req, res) {
//     try {
//       const { classId, armId, sessionId, termId, feeType } = req.query;
//       const query = {};
//       if (classId) query.classId = classId;
//       if (armId) query.armId = armId;
//       if (sessionId) query.sessionId = sessionId;
//       if (termId) query.termId = termId;
//       if (feeType) query.feeType = feeType;
      
//       const feeStructures = await FeeStructure.find(query)
//         .populate("classId", "name")
//         .populate("armId", "name")
//         .populate("sessionId", "name")
//         .populate("termId", "name")
//         .sort({ createdAt: -1 });
      
//       res.status(200).json({ success: true, count: feeStructures.length, data: feeStructures });
//     } catch (error) {
//       res.status(400).json({ success: false, message: error.message });
//     }
//   }
  
//   // ========== FEE ACCOUNTS BY CLASS/ARM (FOR ACCOUNTS TAB) ==========
// async getFeeAccountsByClassAndArm(req, res) {
//   try {
//     const { classId, armId, sessionId, termId, page = 1, limit = 20 } = req.query;
    
//     console.log('Query params:', { classId, armId, sessionId, termId, page, limit });
    
//     if (!classId || !sessionId || !termId) {
//       throw new Error("Class ID, Session ID, and Term ID are required");
//     }
    
//     // Get enrollments with pagination
//     let query = { 
//       classId: classId, 
//       sessionId: sessionId
//     };
//     if (armId && armId !== '') {
//       query.armId = armId;
//     }
    
//     const totalEnrollments = await Enrollment.countDocuments(query);
//     const enrollments = await Enrollment.find(query)
//       .populate("studentId", "name admissionNumber parentContact email")
//       .populate("classId", "name")
//       .populate("armId", "name")
//       .skip((parseInt(page) - 1) * parseInt(limit))
//       .limit(parseInt(limit));
    
//     if (enrollments.length === 0) {
//       return res.status(200).json({ 
//         success: true, 
//         data: [],
//         pagination: { total: 0, page: parseInt(page), pages: 0 }
//       });
//     }
    
//     // Get ALL student IDs from current page enrollments
//     const studentIds = enrollments.map(e => e.studentId._id);
    
//     // ONE query to get ALL existing fee accounts for these students
//     const existingFeeAccounts = await FeeAccount.find({
//       studentId: { $in: studentIds },
//       sessionId: sessionId,
//       termId: termId
//     }).populate("studentId", "name admissionNumber parentContact email");
    
//     // Create a map for quick lookup
//     const feeAccountMap = new Map();
//     existingFeeAccounts.forEach(account => {
//       feeAccountMap.set(account.studentId._id.toString(), account);
//     });
    
//     // ONE query to get ALL fee structures for this class/term
//     const feeStructures = await FeeStructure.find({
//       classId: classId,
//       $or: [
//         { armId: armId || null },
//         { armId: null }
//       ],
//       sessionId: sessionId,
//       termId: termId
//     });
    
//     // Pre-calculate the fees array from structures (same for all students)
//     // const defaultFees = feeStructures.map(fs => ({
//     //   feeType: fs.feeType,
//     //   amount: fs.amount,
//     //   paid: 0,
//     //   due: fs.amount
//     // }));

//     const defaultFees = feeStructures.map(fs => ({
//       feeStructureId: fs._id,
//       feeType: fs.feeType,
//       description: fs.description || "",
//       amount: fs.amount,
//       paid: 0,
//       due: fs.amount
//     }));
//     const defaultTotalAmount = defaultFees.reduce((sum, fee) => sum + fee.amount, 0);
    
//     // Build results in memory
//     const feeAccounts = [];
    
//     for (const enrollment of enrollments) {
//       const studentId = enrollment.studentId._id.toString();
//       const existingAccount = feeAccountMap.get(studentId);
      
//       if (existingAccount) {
//         feeAccounts.push({
//           ...existingAccount.toObject(),
//           isGenerated: true
//         });
//       } else {
//         feeAccounts.push({
//           _id: null,
//           studentId: {
//             _id: enrollment.studentId._id,
//             name: enrollment.studentId.name,
//             admissionNumber: enrollment.studentId.admissionNumber,
//             parentContact: enrollment.studentId.parentContact
//           },
//           enrollmentId: enrollment._id,
//           classId: enrollment.classId,
//           armId: enrollment.armId,
//           fees: defaultFees,
//           totalAmount: defaultTotalAmount,
//           totalPaid: 0,
//           totalDue: defaultTotalAmount,
//           isFullyPaid: defaultTotalAmount === 0,
//           isGenerated: false
//         });
//       }
//     }
    
//     const totalPages = Math.ceil(totalEnrollments / parseInt(limit));
    
//     console.log(`Returning ${feeAccounts.length} of ${totalEnrollments} fee accounts (page ${page} of ${totalPages})`);
    
//     res.status(200).json({
//       success: true,
//       data: feeAccounts,
//       pagination: {
//         total: totalEnrollments,
//         page: parseInt(page),
//         limit: parseInt(limit),
//         pages: totalPages
//       }
//     });
    
//   } catch (error) {
//     console.error('Error in getFeeAccountsByClassAndArm:', error);
//     res.status(400).json({
//       success: false,
//       message: error.message
//     });
//   }
// }
  
//   // ========== STUDENT FEE ACCOUNT (FOR PAYMENTS TAB) ==========
  
//   async getStudentFeeAccount(req, res) {
//     try {
//       const { studentId } = req.params;
//       const { sessionId, termId } = req.query;
      
//       if (!studentId || !sessionId || !termId) {
//         throw new Error("Student ID, Session ID, and Term ID are required");
//       }
      
//       let feeAccount = await FeeAccount.findOne({ studentId, sessionId, termId })
//         .populate("studentId", "name admissionNumber parentContact")
//         .populate("termId", "name")
//         .populate("sessionId", "name");
      
//       if (!feeAccount) {
//         const enrollment = await Enrollment.findOne({ studentId, sessionId })
//           .populate("classId armId studentId");
        
//         if (!enrollment) {
//           throw new Error("Student not enrolled in this session");
//         }
        
//         const feeStructures = await FeeStructure.find({
//           classId: enrollment.classId._id,
//           $or: [{ armId: enrollment.armId._id }, { armId: null }],
//           sessionId,
//           termId
//         });
        
//         const fees = feeStructures.map(fs => ({
//           feeType: fs.feeType,
//           amount: fs.amount,
//           paid: 0,
//           due: fs.amount
//         }));
        
//         const totalAmount = fees.reduce((sum, fee) => sum + fee.amount, 0);
        
//         feeAccount = {
//           _id: null,
//           studentId: enrollment.studentId,
//           enrollmentId: enrollment._id,
//           termId: { _id: termId, name: "Current Term" },
//           sessionId: { _id: sessionId, name: "Current Session" },
//           fees,
//           totalAmount,
//           totalPaid: 0,
//           totalDue: totalAmount,
//           isFullyPaid: totalAmount === 0,
//           isCarryover: false
//         };
//       }
      
//       res.status(200).json({ success: true, data: feeAccount });
//     } catch (error) {
//       res.status(400).json({ success: false, message: error.message });
//     }
//   }
  
//   // ========== PAYMENT PROCESSING ==========
  
//   async processPayment(req, res) {
//     try {
//       const { studentId, amount, paymentMethod, allocation, receivedBy } = req.body;
      
//       let receivedById = null;
//       if (receivedBy && receivedBy !== 'admin' && mongoose.Types.ObjectId.isValid(receivedBy)) {
//         receivedById = receivedBy;
//       }
      
//       const result = await feeManagementService.processPayment(
//         studentId, amount, paymentMethod, allocation, receivedById
//       );
      
//       res.status(200).json({ success: true, message: "Payment processed successfully", data: result });
//     } catch (error) {
//       res.status(400).json({ success: false, message: error.message });
//     }
//   }
  
//   // ========== CARRYOVER ==========
  
//   async previewOutstandingFees(req, res) {
//     try {
//       const { sessionId, termId } = req.query;
//       if (!sessionId || !termId) throw new Error("Session ID and Term ID are required");
      
//       const outstandingAccounts = await FeeAccount.find({
//         sessionId, termId, totalDue: { $gt: 0 }, isFullyPaid: false
//       }).populate("studentId", "name admissionNumber parentContact");
      
//       const totalOutstanding = outstandingAccounts.reduce((sum, account) => sum + account.totalDue, 0);
      
//       res.status(200).json({
//         success: true,
//         data: {
//           termId, sessionId,
//           totalStudentsWithOutstanding: outstandingAccounts.length,
//           totalAmountOutstanding: totalOutstanding,
//           students: outstandingAccounts.map(account => ({
//             studentId: account.studentId._id,
//             name: account.studentId.name,
//             admissionNumber: account.studentId.admissionNumber,
//             parentContact: account.studentId.parentContact,
//             amountDue: account.totalDue
//           }))
//         }
//       });
//     } catch (error) {
//       res.status(400).json({ success: false, message: error.message });
//     }
//   }
  
//   async carryOverOutstandingFees(req, res) {
//     const session = await mongoose.startSession();
//     session.startTransaction();
    
//     try {
//       const { sessionId, currentTermId } = req.body;
//       const adminId = req.user?._id || req.body.adminId;
      
//       if (!sessionId || !currentTermId) throw new Error("Session ID and Current Term ID are required");
      
//       const Term = require("../models/Term");
//       const currentTerm = await Term.findById(currentTermId).session(session);
//       if (!currentTerm) throw new Error("Current term not found");
      
//       const nextTerm = await Term.findOne({
//         sessionId: currentTerm.sessionId,
//         order: currentTerm.order + 1
//       }).session(session);
//       if (!nextTerm) throw new Error("Next term not found");
      
//       const outstandingAccounts = await FeeAccount.find({
//         sessionId, termId: currentTermId, totalDue: { $gt: 0 }, isFullyPaid: false
//       }).populate("studentId enrollmentId").session(session);
      
//       if (outstandingAccounts.length === 0) {
//         await session.abortTransaction();
//         return res.status(200).json({
//           success: true,
//           message: "No outstanding fees to carry over",
//           data: { studentsAffected: 0, totalAmountCarried: 0 }
//         });
//       }
      
//       const carryoverResults = [];
//       let totalAmountCarried = 0;
      
//       for (const account of outstandingAccounts) {
//         const outstandingAmount = account.totalDue;
//         totalAmountCarried += outstandingAmount;
        
//         let nextTermAccount = await FeeAccount.findOne({
//           studentId: account.studentId, sessionId, termId: nextTerm._id
//         }).session(session);
        
//         if (nextTermAccount) {
//           nextTermAccount.totalDue += outstandingAmount;
//           nextTermAccount.isCarryover = true;
//           nextTermAccount.carryoverDetails = nextTermAccount.carryoverDetails || [];
//           nextTermAccount.carryoverDetails.push({
//             fromTermId: currentTermId,
//             amount: outstandingAmount,
//             carriedOverOn: new Date(),
//             carriedOverBy: adminId
//           });
//           await nextTermAccount.save({ session });
//           carryoverResults.push({ studentId: account.studentId._id, studentName: account.studentId.name, amountCarried: outstandingAmount });
//         } else {
//           const nextTermEnrollment = await Enrollment.findOne({ studentId: account.studentId, sessionId }).session(session);
//           if (nextTermEnrollment) {
//             const carryoverAccount = new FeeAccount({
//               studentId: account.studentId._id,
//               enrollmentId: nextTermEnrollment._id,
//               sessionId,
//               termId: nextTerm._id,
//               fees: [],
//               totalAmount: 0,
//               totalPaid: 0,
//               totalDue: outstandingAmount,
//               isFullyPaid: false,
//               isCarryover: true,
//               carriedFromTermId: currentTermId,
//               carryoverDetails: [{ fromTermId: currentTermId, amount: outstandingAmount, carriedOverOn: new Date(), carriedOverBy: adminId }]
//             });
//             await carryoverAccount.save({ session });
//             carryoverResults.push({ studentId: account.studentId._id, studentName: account.studentId.name, amountCarried: outstandingAmount });
//           }
//         }
        
//         account.carryoverProcessed = true;
//         account.carryoverProcessedOn = new Date();
//         account.carryoverProcessedBy = adminId;
//         await account.save({ session });
//       }
      
//       await session.commitTransaction();
      
//       res.status(200).json({
//         success: true,
//         message: `Successfully carried over fees for ${carryoverResults.length} students`,
//         data: { fromTerm: currentTerm.name, toTerm: nextTerm.name, studentsAffected: carryoverResults.length, totalAmountCarried, details: carryoverResults }
//       });
//     } catch (error) {
//       await session.abortTransaction();
//       res.status(500).json({ success: false, message: error.message });
//     } finally {
//       session.endSession();
//     }
//   }
// }

// module.exports = new FeeController();

// controllers/feeController.js
const feeManagementService = require("../services/feeManagementServices");
const FeeAccount = require("../models/FeeAccount");
const FeeStructure = require("../models/FeeStructure");
const Enrollment = require("../models/Enrollment");
const mongoose = require("mongoose");

// ========== HELPER FUNCTIONS ==========

const normalizeArmId = (armId) => {
  return armId && armId !== "" ? armId : null;
};

const normalizeDescription = (feeType, description) => {
  return feeType === "Other" ? (description || "").trim() : "";
};

const autoGenerateFeeAccountsForStructure = async (feeStructure, session) => {
  try {
    const query = {
      classId: feeStructure.classId,
      sessionId: feeStructure.sessionId,
    };

    if (feeStructure.armId) {
      query.armId = feeStructure.armId;
    }

    const enrollments = await Enrollment.find(query)
      .populate("studentId")
      .session(session);

    for (const enrollment of enrollments) {
      let feeAccount = await FeeAccount.findOne({
        studentId: enrollment.studentId._id,
        sessionId: feeStructure.sessionId,
        termId: feeStructure.termId,
      }).session(session);

      if (!feeAccount) {
        const allFeeStructures = await FeeStructure.find({
          classId: feeStructure.classId,
          $or: [{ armId: feeStructure.armId || null }, { armId: null }],
          sessionId: feeStructure.sessionId,
          termId: feeStructure.termId,
        }).session(session);

        const fees = allFeeStructures.map((fs) => ({
          feeStructureId: fs._id,
          feeType: fs.feeType,
          description: fs.description || "",
          amount: fs.amount,
          paid: 0,
          due: fs.amount,
        }));

        const totalAmount = fees.reduce((sum, fee) => sum + fee.amount, 0);

        feeAccount = new FeeAccount({
          studentId: enrollment.studentId._id,
          enrollmentId: enrollment._id,
          sessionId: feeStructure.sessionId,
          termId: feeStructure.termId,
          fees,
          totalAmount,
          totalPaid: 0,
          totalDue: totalAmount,
          isFullyPaid: totalAmount === 0,
        });

        await feeAccount.save({ session });
      } else {
        const existingFee = feeAccount.fees.find(
          (fee) =>
            fee.feeStructureId &&
            fee.feeStructureId.toString() === feeStructure._id.toString()
        );

        if (!existingFee) {
          feeAccount.fees.push({
            feeStructureId: feeStructure._id,
            feeType: feeStructure.feeType,
            description: feeStructure.description || "",
            amount: feeStructure.amount,
            paid: 0,
            due: feeStructure.amount,
          });

          feeAccount.totalAmount += feeStructure.amount;
          feeAccount.totalDue += feeStructure.amount;
          feeAccount.isFullyPaid = false;

          await feeAccount.save({ session });
        }
      }
    }

    return {
      success: true,
      studentsAffected: enrollments.length,
    };
  } catch (error) {
    console.error("Error auto-generating fee accounts:", error);
    throw error;
  }
};

const updateFeeAccountsForStructure = async (
  feeStructure,
  oldAmount,
  newAmount,
  session
) => {
  const feeAccounts = await FeeAccount.find({
    sessionId: feeStructure.sessionId,
    termId: feeStructure.termId,
  }).session(session);

  const amountDifference = Number(newAmount) - Number(oldAmount);

  for (const feeAccount of feeAccounts) {
    const feeIndex = feeAccount.fees.findIndex(
      (fee) =>
        fee.feeStructureId &&
        fee.feeStructureId.toString() === feeStructure._id.toString()
    );

    if (feeIndex !== -1) {
      const fee = feeAccount.fees[feeIndex];

      fee.feeType = feeStructure.feeType;
      fee.description = feeStructure.description || "";

      if (amountDifference !== 0) {
        fee.amount = Number(newAmount);
        fee.due = Math.max(0, Number(fee.due || 0) + amountDifference);

        feeAccount.totalAmount += amountDifference;
        feeAccount.totalDue = Math.max(
          0,
          Number(feeAccount.totalDue || 0) + amountDifference
        );
      }

      feeAccount.isFullyPaid = feeAccount.totalDue === 0;

      await feeAccount.save({ session });
    }
  }
};

// ========== FEE STRUCTURE CRUD ==========

exports.createFeeStructure = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      classId,
      armId,
      sessionId,
      termId,
      feeType,
      amount,
      isMandatory,
      description,
    } = req.body;

    if (!classId || !sessionId || !termId || !feeType || !amount) {
      throw new Error("Missing required fields");
    }

    const cleanDescription = normalizeDescription(feeType, description);

    if (feeType === "Other" && !cleanDescription) {
      throw new Error("Please specify what the 'Other' fee is for");
    }

    const duplicateQuery = {
      classId,
      armId: normalizeArmId(armId),
      sessionId,
      termId,
      feeType,
    };

    if (feeType === "Other") {
      duplicateQuery.description = cleanDescription;
    }

    const existingStructure = await FeeStructure.findOne(duplicateQuery).session(
      session
    );

    if (existingStructure) {
      throw new Error(
        feeType === "Other"
          ? `Other fee "${cleanDescription}" already exists`
          : `Fee structure for ${feeType} already exists`
      );
    }

    const feeStructure = new FeeStructure({
      classId,
      armId: normalizeArmId(armId),
      sessionId,
      termId,
      feeType,
      amount: Number(amount),
      isMandatory: isMandatory !== false,
      description: cleanDescription,
    });

    await feeStructure.save({ session });

    await autoGenerateFeeAccountsForStructure(feeStructure, session);

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Fee structure created and fee accounts generated successfully",
      data: feeStructure,
    });
  } catch (error) {
    await session.abortTransaction();

    res.status(400).json({
      success: false,
      message: error.message,
    });
  } finally {
    session.endSession();
  }
};

exports.updateFeeStructure = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const {
      feeType,
      amount,
      isMandatory,
      description,
      classId,
      armId,
      sessionId,
      termId,
    } = req.body;

    const feeStructure = await FeeStructure.findById(id).session(session);

    if (!feeStructure) {
      throw new Error("Fee structure not found");
    }

    const oldAmount = Number(feeStructure.amount);

    if (classId !== undefined) feeStructure.classId = classId;
    if (armId !== undefined) feeStructure.armId = normalizeArmId(armId);
    if (sessionId !== undefined) feeStructure.sessionId = sessionId;
    if (termId !== undefined) feeStructure.termId = termId;
    if (feeType !== undefined) feeStructure.feeType = feeType;
    if (amount !== undefined) feeStructure.amount = Number(amount);
    if (isMandatory !== undefined) feeStructure.isMandatory = isMandatory;

    feeStructure.description = normalizeDescription(
      feeStructure.feeType,
      description
    );

    if (feeStructure.feeType === "Other" && !feeStructure.description) {
      throw new Error("Please specify what the 'Other' fee is for");
    }

    await feeStructure.save({ session });

    await updateFeeAccountsForStructure(
      feeStructure,
      oldAmount,
      feeStructure.amount,
      session
    );

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Fee structure updated successfully",
      data: feeStructure,
    });
  } catch (error) {
    await session.abortTransaction();

    res.status(400).json({
      success: false,
      message: error.message,
    });
  } finally {
    session.endSession();
  }
};

exports.deleteFeeStructure = async (req, res) => {
  try {
    const { id } = req.params;

    const feeStructure = await FeeStructure.findByIdAndDelete(id);

    if (!feeStructure) {
      throw new Error("Fee structure not found");
    }

    res.status(200).json({
      success: true,
      message: "Fee structure deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getFeeStructures = async (req, res) => {
  try {
    const { classId, armId, sessionId, termId, feeType } = req.query;

    const query = {};

    if (classId) query.classId = classId;
    if (armId) query.armId = armId;
    if (sessionId) query.sessionId = sessionId;
    if (termId) query.termId = termId;
    if (feeType) query.feeType = feeType;

    const feeStructures = await FeeStructure.find(query)
      .populate("classId", "name")
      .populate("armId", "name")
      .populate("sessionId", "name")
      .populate("termId", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: feeStructures.length,
      data: feeStructures,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ========== FEE ACCOUNTS ==========

exports.getFeeAccountsByClassAndArm = async (req, res) => {
  try {
    const {
      classId,
      armId,
      sessionId,
      termId,
      page = 1,
      limit = 20,
    } = req.query;

    if (!classId || !sessionId || !termId) {
      throw new Error("Class ID, Session ID, and Term ID are required");
    }

    const query = {
      classId,
      sessionId,
    };

    if (armId) {
      query.armId = armId;
    }

    const totalEnrollments = await Enrollment.countDocuments(query);

    const enrollments = await Enrollment.find(query)
      .populate("studentId", "name admissionNumber parentContact email")
      .populate("classId", "name")
      .populate("armId", "name")
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    if (enrollments.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          total: 0,
          page: Number(page),
          pages: 0,
        },
      });
    }

    const studentIds = enrollments.map((enrollment) => enrollment.studentId._id);

    const existingFeeAccounts = await FeeAccount.find({
      studentId: { $in: studentIds },
      sessionId,
      termId,
    }).populate("studentId", "name admissionNumber parentContact email");

    const feeAccountMap = new Map();

    existingFeeAccounts.forEach((account) => {
      feeAccountMap.set(account.studentId._id.toString(), account);
    });

    const feeStructures = await FeeStructure.find({
      classId,
      $or: [{ armId: armId || null }, { armId: null }],
      sessionId,
      termId,
    });

    const defaultFees = feeStructures.map((fs) => ({
      feeStructureId: fs._id,
      feeType: fs.feeType,
      description: fs.description || "",
      amount: fs.amount,
      paid: 0,
      due: fs.amount,
    }));

    const defaultTotalAmount = defaultFees.reduce(
      (sum, fee) => sum + fee.amount,
      0
    );

    const feeAccounts = enrollments.map((enrollment) => {
      const studentId = enrollment.studentId._id.toString();
      const existingAccount = feeAccountMap.get(studentId);

      if (existingAccount) {
        return {
          ...existingAccount.toObject(),
          classId: enrollment.classId,
          armId: enrollment.armId,
          isGenerated: true,
        };
      }

      return {
        _id: null,
        studentId: {
          _id: enrollment.studentId._id,
          name: enrollment.studentId.name,
          admissionNumber: enrollment.studentId.admissionNumber,
          parentContact: enrollment.studentId.parentContact,
        },
        enrollmentId: enrollment._id,
        classId: enrollment.classId,
        armId: enrollment.armId,
        fees: defaultFees,
        totalAmount: defaultTotalAmount,
        totalPaid: 0,
        totalDue: defaultTotalAmount,
        isFullyPaid: defaultTotalAmount === 0,
        isGenerated: false,
      };
    });

    const totalPages = Math.ceil(totalEnrollments / Number(limit));

    res.status(200).json({
      success: true,
      data: feeAccounts,
      pagination: {
        total: totalEnrollments,
        page: Number(page),
        limit: Number(limit),
        pages: totalPages,
      },
    });
  } catch (error) {
    console.error("Error in getFeeAccountsByClassAndArm:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getStudentFeeAccount = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { sessionId, termId } = req.query;

    if (!studentId || !sessionId || !termId) {
      throw new Error("Student ID, Session ID, and Term ID are required");
    }

    let feeAccount = await FeeAccount.findOne({
      studentId,
      sessionId,
      termId,
    })
      .populate("studentId", "name admissionNumber parentContact")
      .populate("termId", "name")
      .populate("sessionId", "name");

    if (!feeAccount) {
      const enrollment = await Enrollment.findOne({
        studentId,
        sessionId,
      }).populate("classId armId studentId");

      if (!enrollment) {
        throw new Error("Student not enrolled in this session");
      }

      const feeStructures = await FeeStructure.find({
        classId: enrollment.classId._id,
        $or: [{ armId: enrollment.armId._id }, { armId: null }],
        sessionId,
        termId,
      });

      const fees = feeStructures.map((fs) => ({
        feeStructureId: fs._id,
        feeType: fs.feeType,
        description: fs.description || "",
        amount: fs.amount,
        paid: 0,
        due: fs.amount,
      }));

      const totalAmount = fees.reduce((sum, fee) => sum + fee.amount, 0);

      feeAccount = {
        _id: null,
        studentId: enrollment.studentId,
        enrollmentId: enrollment._id,
        termId: {
          _id: termId,
          name: "Current Term",
        },
        sessionId: {
          _id: sessionId,
          name: "Current Session",
        },
        fees,
        totalAmount,
        totalPaid: 0,
        totalDue: totalAmount,
        isFullyPaid: totalAmount === 0,
        isCarryover: false,
      };
    }

    res.status(200).json({
      success: true,
      data: feeAccount,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ========== PAYMENT PROCESSING ==========

exports.processPayment = async (req, res) => {
  try {
    const { studentId, amount, paymentMethod, allocation, receivedBy } =
      req.body;

    let receivedById = null;

    if (
      receivedBy &&
      receivedBy !== "admin" &&
      mongoose.Types.ObjectId.isValid(receivedBy)
    ) {
      receivedById = receivedBy;
    }

    const result = await feeManagementService.processPayment(
      studentId,
      amount,
      paymentMethod,
      allocation,
      receivedById
    );

    res.status(200).json({
      success: true,
      message: "Payment processed successfully",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ========== CARRYOVER ==========

exports.previewOutstandingFees = async (req, res) => {
  try {
    const { sessionId, termId } = req.query;

    if (!sessionId || !termId) {
      throw new Error("Session ID and Term ID are required");
    }

    const outstandingAccounts = await FeeAccount.find({
      sessionId,
      termId,
      totalDue: { $gt: 0 },
      isFullyPaid: false,
    }).populate("studentId", "name admissionNumber parentContact");

    const totalOutstanding = outstandingAccounts.reduce(
      (sum, account) => sum + account.totalDue,
      0
    );

    res.status(200).json({
      success: true,
      data: {
        termId,
        sessionId,
        totalStudentsWithOutstanding: outstandingAccounts.length,
        totalAmountOutstanding: totalOutstanding,
        students: outstandingAccounts.map((account) => ({
          studentId: account.studentId._id,
          name: account.studentId.name,
          admissionNumber: account.studentId.admissionNumber,
          parentContact: account.studentId.parentContact,
          amountDue: account.totalDue,
        })),
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// exports.carryOverOutstandingFees = async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const { sessionId, currentTermId } = req.body;
//     const adminId = req.user?._id || req.body.adminId;

//     if (!sessionId || !currentTermId) {
//       throw new Error("Session ID and Current Term ID are required");
//     }

//     const Term = require("../models/Term");

//     const currentTerm = await Term.findById(currentTermId).session(session);

//     if (!currentTerm) {
//       throw new Error("Current term not found");
//     }

//     const nextTerm = await Term.findOne({
//       sessionId: currentTerm.sessionId,
//       order: currentTerm.order + 1,
//     }).session(session);

//     if (!nextTerm) {
//       throw new Error("Next term not found");
//     }

//     const outstandingAccounts = await FeeAccount.find({
//       sessionId,
//       termId: currentTermId,
//       totalDue: { $gt: 0 },
//       isFullyPaid: false,
//     })
//       .populate("studentId enrollmentId")
//       .session(session);

//     if (outstandingAccounts.length === 0) {
//       await session.abortTransaction();

//       return res.status(200).json({
//         success: true,
//         message: "No outstanding fees to carry over",
//         data: {
//           studentsAffected: 0,
//           totalAmountCarried: 0,
//         },
//       });
//     }

//     const carryoverResults = [];
//     let totalAmountCarried = 0;

//     for (const account of outstandingAccounts) {
//       const outstandingAmount = account.totalDue;
//       totalAmountCarried += outstandingAmount;

//       let nextTermAccount = await FeeAccount.findOne({
//         studentId: account.studentId,
//         sessionId,
//         termId: nextTerm._id,
//       }).session(session);

//       if (nextTermAccount) {
//         nextTermAccount.totalDue += outstandingAmount;
//         nextTermAccount.isCarryover = true;
//         nextTermAccount.carryoverDetails =
//           nextTermAccount.carryoverDetails || [];

//         nextTermAccount.carryoverDetails.push({
//           fromTermId: currentTermId,
//           amount: outstandingAmount,
//           carriedOverOn: new Date(),
//           carriedOverBy: adminId,
//         });

//         await nextTermAccount.save({ session });

//         carryoverResults.push({
//           studentId: account.studentId._id,
//           studentName: account.studentId.name,
//           amountCarried: outstandingAmount,
//         });
//       } else {
//         const nextTermEnrollment = await Enrollment.findOne({
//           studentId: account.studentId,
//           sessionId,
//         }).session(session);

//         if (nextTermEnrollment) {
//           const carryoverAccount = new FeeAccount({
//             studentId: account.studentId._id,
//             enrollmentId: nextTermEnrollment._id,
//             sessionId,
//             termId: nextTerm._id,
//             fees: [],
//             totalAmount: 0,
//             totalPaid: 0,
//             totalDue: outstandingAmount,
//             isFullyPaid: false,
//             isCarryover: true,
//             carriedFromTermId: currentTermId,
//             carryoverDetails: [
//               {
//                 fromTermId: currentTermId,
//                 amount: outstandingAmount,
//                 carriedOverOn: new Date(),
//                 carriedOverBy: adminId,
//               },
//             ],
//           });

//           await carryoverAccount.save({ session });

//           carryoverResults.push({
//             studentId: account.studentId._id,
//             studentName: account.studentId.name,
//             amountCarried: outstandingAmount,
//           });
//         }
//       }

//       account.carryoverProcessed = true;
//       account.carryoverProcessedOn = new Date();
//       account.carryoverProcessedBy = adminId;

//       await account.save({ session });
//     }

//     await session.commitTransaction();

//     res.status(200).json({
//       success: true,
//       message: `Successfully carried over fees for ${carryoverResults.length} students`,
//       data: {
//         fromTerm: currentTerm.name,
//         toTerm: nextTerm.name,
//         studentsAffected: carryoverResults.length,
//         totalAmountCarried,
//         details: carryoverResults,
//       },
//     });
//   } catch (error) {
//     await session.abortTransaction();

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   } finally {
//     session.endSession();
//   }
// };


exports.carryOverOutstandingFees = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { sessionId, currentTermId } = req.body;
    const adminId = req.user?._id || req.body.adminId;

    if (!sessionId || !currentTermId) {
      throw new Error("Session ID and Current Term ID are required");
    }

    const Term = require("../models/Term");

    const currentTerm = await Term.findById(currentTermId).session(session);

    if (!currentTerm) {
      throw new Error("Current term not found");
    }

    const nextTerm = await Term.findOne({
      sessionId: currentTerm.sessionId,
      order: currentTerm.order + 1,
    }).session(session);

    if (!nextTerm) {
      throw new Error("Next term not found");
    }

    // Prevent duplicate carryover
    const outstandingAccounts = await FeeAccount.find({
      sessionId,
      termId: currentTermId,
      totalDue: { $gt: 0 },
      isFullyPaid: false,
      carryoverProcessed: { $ne: true },
    })
      .populate("studentId enrollmentId")
      .session(session);

    if (outstandingAccounts.length === 0) {
      await session.abortTransaction();

      return res.status(200).json({
        success: true,
        message: "No outstanding fees to carry over",
        data: {
          studentsAffected: 0,
          totalAmountCarried: 0,
        },
      });
    }

    const carryoverResults = [];
    let totalAmountCarried = 0;

    for (const account of outstandingAccounts) {
      const outstandingAmount = Number(account.totalDue || 0);

      if (outstandingAmount <= 0) continue;

      const carryoverFee = {
        feeType: "Other",
        description: `Outstanding Balance From ${currentTerm.name}`,
        amount: outstandingAmount,
        paid: 0,
        due: outstandingAmount,
        isCarryoverFee: true,
        carriedFromTermId: currentTermId,
      };

      let nextTermAccount = await FeeAccount.findOne({
        studentId: account.studentId._id,
        sessionId,
        termId: nextTerm._id,
      }).session(session);

      if (nextTermAccount) {
        const alreadyAdded = nextTermAccount.fees.some(
          (fee) =>
            fee.isCarryoverFee === true &&
            String(fee.carriedFromTermId) === String(currentTermId)
        );

        if (!alreadyAdded) {
          nextTermAccount.fees.push(carryoverFee);
          nextTermAccount.totalAmount += outstandingAmount;
          nextTermAccount.totalDue += outstandingAmount;
        }

        nextTermAccount.isCarryover = true;
        nextTermAccount.carryoverDetails =
          nextTermAccount.carryoverDetails || [];

        nextTermAccount.carryoverDetails.push({
          fromTermId: currentTermId,
          amount: outstandingAmount,
          carriedOverOn: new Date(),
          carriedOverBy: adminId,
        });

        await nextTermAccount.save({ session });
      } else {
        const nextTermEnrollment = await Enrollment.findOne({
          studentId: account.studentId._id,
          sessionId,
        }).session(session);

        if (!nextTermEnrollment) {
          continue;
        }

        nextTermAccount = new FeeAccount({
          studentId: account.studentId._id,
          enrollmentId: nextTermEnrollment._id,
          sessionId,
          termId: nextTerm._id,
          fees: [carryoverFee],
          totalAmount: outstandingAmount,
          totalPaid: 0,
          totalDue: outstandingAmount,
          isFullyPaid: false,
          isCarryover: true,
          carriedFromTermId: currentTermId,
          carryoverDetails: [
            {
              fromTermId: currentTermId,
              amount: outstandingAmount,
              carriedOverOn: new Date(),
              carriedOverBy: adminId,
            },
          ],
        });

        await nextTermAccount.save({ session });
      }

      account.carryoverProcessed = true;
      account.carryoverProcessedOn = new Date();
      account.carryoverProcessedBy = adminId;

      await account.save({ session });

      totalAmountCarried += outstandingAmount;

      carryoverResults.push({
        studentId: account.studentId._id,
        studentName: account.studentId.name,
        amountCarried: outstandingAmount,
      });
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: `Successfully carried over fees for ${carryoverResults.length} students`,
      data: {
        fromTerm: currentTerm.name,
        toTerm: nextTerm.name,
        studentsAffected: carryoverResults.length,
        totalAmountCarried,
        details: carryoverResults,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    session.endSession();
  }
};