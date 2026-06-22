// services/feeManagementService.js
const FeeStructure = require("../models/FeeStructure");
const FeeAccount = require("../models/FeeAccount");
const Payment = require("../models/Payment");
const Enrollment = require("../models/Enrollment");
const mongoose = require("mongoose");

class FeeManagementService {
  
  /**
   * Generate fee account for a student for a specific term
   */
  async generateFeeAccount(studentId, enrollmentId, sessionId, termId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Check if fee account already exists
      const existingAccount = await FeeAccount.findOne({
        studentId,
        sessionId,
        termId
      }).session(session);
      
      if (existingAccount) {
        throw new Error("Fee account already exists for this term");
      }
      
      // Get enrollment details
      const enrollment = await Enrollment.findById(enrollmentId)
        .populate("classId armId")
        .session(session);
      
      if (!enrollment) {
        throw new Error("Enrollment not found");
      }
      
      // Get fee structures for this class/arm/session/term
      const feeStructures = await FeeStructure.find({
        classId: enrollment.classId._id,
        $or: [
          { armId: enrollment.armId._id },
          { armId: null } // Global fees for the class
        ],
        sessionId,
        termId
      }).session(session);
      
      if (feeStructures.length === 0) {
        throw new Error("No fee structure defined for this class and term");
      }
      
      // Calculate total fees
      const fees = feeStructures.map(fs => ({
        feeStructureId: fs._id,
        feeType: fs.feeType,
        amount: fs.amount,
        paid: 0,
        due: fs.amount
      }));
      
      const totalAmount = fees.reduce((sum, fee) => sum + fee.amount, 0);
      
      // Check for outstanding fees from previous term
      const previousTermOutstanding = await this.getOutstandingFeesFromPreviousTerm(
        studentId,
        sessionId,
        termId,
        session
      );
      
      let finalTotalDue = totalAmount;
      let carriedFromTermId = null;
      
      if (previousTermOutstanding > 0) {
        finalTotalDue += previousTermOutstanding;
        carriedFromTermId = await this.getPreviousTermId(termId, session);
      }
      
      // Create fee account
      const feeAccount = new FeeAccount({
        studentId,
        enrollmentId,
        sessionId,
        termId,
        fees,
        totalAmount,
        totalPaid: 0,
        totalDue: finalTotalDue,
        isFullyPaid: false,
        isCarryover: previousTermOutstanding > 0,
        carriedFromTermId,
        dueDate: this.calculateDueDate(termId) // Implement based on your term dates
      });
      
      await feeAccount.save({ session });
      await session.commitTransaction();
      
      return feeAccount;
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Get outstanding fees from previous term
   */
  async getOutstandingFeesFromPreviousTerm(studentId, currentSessionId, currentTermId, session) {
    const previousTerm = await this.getPreviousTerm(currentTermId, session);
    
    if (!previousTerm) {
      return 0;
    }
    
    const previousFeeAccount = await FeeAccount.findOne({
      studentId,
      sessionId: currentSessionId,
      termId: previousTerm._id
    }).session(session);
    
    if (previousFeeAccount && previousFeeAccount.totalDue > 0) {
      return previousFeeAccount.totalDue;
    }
    
    return 0;
  }
  
  /**
   * Process payment and allocate to fees
   */
//   async processPayment(studentId, amount, paymentMethod, allocation = null, receivedBy = null) {
//     const session = await mongoose.startSession();
//     session.startTransaction();
    
//     try {
//       // Get current active fee account (current term with outstanding balance)
//       const feeAccount = await this.getCurrentFeeAccount(studentId);
      
//       if (!feeAccount) {
//         throw new Error("No active fee account found for student");
//       }
      
//       if (feeAccount.totalDue === 0) {
//         throw new Error("No outstanding fees for this student");
//       }
      
//       let remainingAmount = amount;
//       const paymentAllocation = [];
      
//       // If no specific allocation, allocate to oldest fees first (FIFO)
//       if (!allocation) {
//         for (let fee of feeAccount.fees) {
//           if (remainingAmount <= 0) break;
          
//           const feeDue = fee.due;
//           if (feeDue > 0) {
//             const allocatedAmount = Math.min(remainingAmount, feeDue);
//             fee.paid += allocatedAmount;
//             fee.due -= allocatedAmount;
//             remainingAmount -= allocatedAmount;
            
//             paymentAllocation.push({
//               feeType: fee.feeType,
//               amount: allocatedAmount,
//               feeStructureId: fee.feeStructureId
//             });
//           }
//         }
//       } else {
//         // Use provided allocation
//         for (let alloc of allocation) {
//           const fee = feeAccount.fees.find(f => f.feeType === alloc.feeType);
//           if (fee) {
//             const allocatedAmount = Math.min(alloc.amount, fee.due);
//             fee.paid += allocatedAmount;
//             fee.due -= allocatedAmount;
//             remainingAmount -= allocatedAmount;
            
//             paymentAllocation.push({
//               feeType: fee.feeType,
//               amount: allocatedAmount,
//               feeStructureId: fee.feeStructureId
//             });
//           }
//         }
//       }
      
//       // Update fee account totals
//       feeAccount.totalPaid += (amount - remainingAmount);
//       feeAccount.totalDue -= (amount - remainingAmount);
//       feeAccount.isFullyPaid = feeAccount.totalDue === 0;
      
//       await feeAccount.save({ session });
      
//       // Create payment record
//       const payment = new Payment({
//         studentId,
//         feeAccountId: feeAccount._id,
//         enrollmentId: feeAccount.enrollmentId,
//         amount: amount - remainingAmount,
//         paymentMethod,
//         allocation: paymentAllocation,
//         receivedBy,
//         paymentDate: new Date(),
//         transactionId: this.generateTransactionId(),
//         status: "Completed"
//       });
      
//       await payment.save({ session });
      
//       // If there's change/overpayment, handle it
//       if (remainingAmount > 0) {
//         // Create a credit note or return change
//         await this.handleOverpayment(studentId, remainingAmount, session);
//       }
      
//       await session.commitTransaction();
      
//       return {
//         payment,
//         feeAccount,
//         remainingAmount
//       };
      
//     } catch (error) {
//       await session.abortTransaction();
//       throw error;
//     } finally {
//       session.endSession();
//     }
//   }

// In feeManagementService.js, update the processPayment method:

async processPayment(studentId, amount, paymentMethod, allocation = null, receivedBy = null) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Get current active fee account (current term with outstanding balance)
    const feeAccount = await this.getCurrentFeeAccount(studentId);
    
    if (!feeAccount) {
      throw new Error("No active fee account found for student");
    }
    
    if (feeAccount.totalDue === 0) {
      throw new Error("No outstanding fees for this student");
    }
    
    let remainingAmount = amount;
    const paymentAllocation = [];
    
    // If no specific allocation, allocate to oldest fees first (FIFO)
    if (!allocation) {
      for (let fee of feeAccount.fees) {
        if (remainingAmount <= 0) break;
        
        const feeDue = fee.due;
        if (feeDue > 0) {
          const allocatedAmount = Math.min(remainingAmount, feeDue);
          fee.paid += allocatedAmount;
          fee.due -= allocatedAmount;
          remainingAmount -= allocatedAmount;
          
          paymentAllocation.push({
            feeType: fee.feeType,
            amount: allocatedAmount,
            feeStructureId: fee.feeStructureId
          });
        }
      }
    } else {
      // Use provided allocation
      for (let alloc of allocation) {
        const fee = feeAccount.fees.find(f => f.feeType === alloc.feeType);
        if (fee) {
          const allocatedAmount = Math.min(alloc.amount, fee.due);
          fee.paid += allocatedAmount;
          fee.due -= allocatedAmount;
          remainingAmount -= allocatedAmount;
          
          paymentAllocation.push({
            feeType: fee.feeType,
            amount: allocatedAmount,
            feeStructureId: fee.feeStructureId
          });
        }
      }
    }
    
    // Update fee account totals
    feeAccount.totalPaid += (amount - remainingAmount);
    feeAccount.totalDue -= (amount - remainingAmount);
    feeAccount.isFullyPaid = feeAccount.totalDue === 0;
    
    await feeAccount.save({ session });
    
    // Create payment record - handle null receivedBy
    const paymentData = {
      studentId,
      feeAccountId: feeAccount._id,
      enrollmentId: feeAccount.enrollmentId,
      amount: amount - remainingAmount,
      paymentMethod,
      allocation: paymentAllocation,
      paymentDate: new Date(),
      transactionId: this.generateTransactionId(),
      status: "Completed"
    };
    
    // Only add receivedBy if it's provided and valid
    if (receivedBy && receivedBy !== 'admin') {
      paymentData.receivedBy = receivedBy;
    }
    
    const payment = new Payment(paymentData);
    await payment.save({ session });
    
    // If there's change/overpayment, handle it
    if (remainingAmount > 0) {
      // Create a credit note or return change
      await this.handleOverpayment(studentId, remainingAmount, session);
    }
    
    await session.commitTransaction();
    
    return {
      payment,
      feeAccount,
      remainingAmount
    };
    
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// Add to feeManagementService.js

/**
 * Generate fee accounts for all students in a specific class/arm for a term
 */
async generateBulkFeeAccounts(classId, armId, sessionId, termId) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Find all enrollments for this class/arm/session
    const query = { 
      classId, 
      sessionId,
      isActive: true
    };
    if (armId) query.armId = armId;
    
    const enrollments = await Enrollment.find(query)
      .populate("studentId classId armId")
      .session(session);
    
    if (enrollments.length === 0) {
      throw new Error("No students found for this class/arm");
    }
    
    // Get fee structures for this class/arm/session/term
    const feeStructures = await FeeStructure.find({
      classId,
      $or: [
        { armId: armId || null },
        { armId: null } // Global fees for the class
      ],
      sessionId,
      termId
    }).session(session);
    
    if (feeStructures.length === 0) {
      throw new Error("No fee structures found for this class and term");
    }
    
    const results = {
      successful: [],
      failed: [],
      total: enrollments.length,
      feeStructuresCount: feeStructures.length
    };
    
    for (const enrollment of enrollments) {
      try {
        // Check if fee account already exists
        let feeAccount = await FeeAccount.findOne({
          studentId: enrollment.studentId._id,
          sessionId,
          termId
        }).session(session);
        
        if (feeAccount) {
          results.failed.push({
            studentId: enrollment.studentId._id,
            studentName: enrollment.studentId.name,
            reason: "Fee account already exists"
          });
          continue;
        }
        
        // Calculate fees
        const fees = feeStructures.map(fs => ({
          feeStructureId: fs._id,
          feeType: fs.feeType,
          amount: fs.amount,
          paid: 0,
          due: fs.amount
        }));
        
        const totalAmount = fees.reduce((sum, fee) => sum + fee.amount, 0);
        
        // Check for outstanding fees from previous term
        const previousTermOutstanding = await this.getOutstandingFeesFromPreviousTerm(
          enrollment.studentId._id,
          sessionId,
          termId,
          session
        );
        
        let finalTotalDue = totalAmount;
        let carriedFromTermId = null;
        
        if (previousTermOutstanding > 0) {
          finalTotalDue += previousTermOutstanding;
          carriedFromTermId = await this.getPreviousTermId(termId, session);
        }
        
        // Create fee account
        feeAccount = new FeeAccount({
          studentId: enrollment.studentId._id,
          enrollmentId: enrollment._id,
          sessionId,
          termId,
          fees,
          totalAmount,
          totalPaid: 0,
          totalDue: finalTotalDue,
          isFullyPaid: finalTotalDue === 0,
          isCarryover: previousTermOutstanding > 0,
          carriedFromTermId,
          dueDate: this.calculateDueDate(termId)
        });
        
        await feeAccount.save({ session });
        
        results.successful.push({
          studentId: enrollment.studentId._id,
          studentName: enrollment.studentId.name,
          totalAmount: finalTotalDue
        });
        
      } catch (error) {
        results.failed.push({
          studentId: enrollment.studentId?._id,
          studentName: enrollment.studentId?.name || "Unknown",
          reason: error.message
        });
      }
    }
    
    await session.commitTransaction();
    return results;
    
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Generate fee accounts for all students in a specific class
 */
async generateFeeAccountsForClass(classId, sessionId, termId) {
  return await this.generateBulkFeeAccounts(classId, null, sessionId, termId);
}

/**
 * Generate fee accounts for all students in a specific arm
 */
async generateFeeAccountsForArm(classId, armId, sessionId, termId) {
  return await this.generateBulkFeeAccounts(classId, armId, sessionId, termId);
}
  
  /**
   * Auto-carryover outstanding fees to next term
   * Run this at the end of each term
   */
  async carryOverOutstandingFees(sessionId, currentTermId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const nextTerm = await this.getNextTerm(currentTermId, session);
      
      if (!nextTerm) {
        throw new Error("Next term not found");
      }
      
      // Get all students with outstanding fees in current term
      const outstandingAccounts = await FeeAccount.find({
        sessionId,
        termId: currentTermId,
        totalDue: { $gt: 0 },
        isFullyPaid: false
      }).session(session);
      
      const carryoverResults = [];
      
      for (const account of outstandingAccounts) {
        // Check if next term fee account already exists
        const nextTermAccount = await FeeAccount.findOne({
          studentId: account.studentId,
          sessionId,
          termId: nextTerm._id
        }).session(session);
        
        if (nextTermAccount) {
          // Add outstanding amount to next term's fees
          nextTermAccount.totalDue += account.totalDue;
          nextTermAccount.isCarryover = true;
          nextTermAccount.carriedFromTermId = currentTermId;
          await nextTermAccount.save({ session });
          
          carryoverResults.push({
            studentId: account.studentId,
            amountCarried: account.totalDue,
            status: "Added to existing account"
          });
        } else {
          // Create a new fee account for next term with only carryover amount
          const enrollment = await Enrollment.findById(account.enrollmentId).session(session);
          
          if (enrollment) {
            const carryoverAccount = new FeeAccount({
              studentId: account.studentId,
              enrollmentId: account.enrollmentId,
              sessionId,
              termId: nextTerm._id,
              fees: [],
              totalAmount: 0,
              totalPaid: 0,
              totalDue: account.totalDue,
              isFullyPaid: false,
              isCarryover: true,
              carriedFromTermId: currentTermId
            });
            
            await carryoverAccount.save({ session });
            
            carryoverResults.push({
              studentId: account.studentId,
              amountCarried: account.totalDue,
              status: "Created new carryover account"
            });
          }
        }
      }
      
      await session.commitTransaction();
      
      return {
        message: `Carried over fees for ${carryoverResults.length} students`,
        details: carryoverResults
      };
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Get student fee summary
   */
  async getStudentFeeSummary(studentId, sessionId = null) {
    const query = { studentId };
    if (sessionId) {
      query.sessionId = sessionId;
    }
    
    const feeAccounts = await FeeAccount.find(query)
      .populate("termId")
      .sort({ "termId.order": 1 });
    
    const summary = {
      studentId,
      totalAmountOwed: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      terms: feeAccounts.map(account => ({
        term: account.termId.name,
        totalAmount: account.totalAmount,
        totalPaid: account.totalPaid,
        totalDue: account.totalDue,
        isFullyPaid: account.isFullyPaid,
        isCarryover: account.isCarryover
      }))
    };
    
    summary.totalAmountOwed = feeAccounts.reduce((sum, acc) => sum + acc.totalAmount, 0);
    summary.totalPaid = feeAccounts.reduce((sum, acc) => sum + acc.totalPaid, 0);
    summary.totalOutstanding = feeAccounts.reduce((sum, acc) => sum + acc.totalDue, 0);
    
    return summary;
  }
  
  // Helper methods (implement based on your term/session models)
  
  async getCurrentFeeAccount(studentId) {
    // Get the most recent unpaid fee account
    return await FeeAccount.findOne({
      studentId,
      totalDue: { $gt: 0 }
    }).sort({ createdAt: -1 });
  }
  
  async getPreviousTerm(currentTermId, session) {
    // Implement based on your Term model
    // Get term with order less than current term
    const Term = require("../models/Term");
    const currentTerm = await Term.findById(currentTermId).session(session);
    return await Term.findOne({
      sessionId: currentTerm.sessionId,
      order: { $lt: currentTerm.order }
    }).sort({ order: -1 }).session(session);
  }
  
  async getNextTerm(currentTermId, session) {
    const Term = require("../models/Term");
    const currentTerm = await Term.findById(currentTermId).session(session);
    return await Term.findOne({
      sessionId: currentTerm.sessionId,
      order: { $gt: currentTerm.order }
    }).sort({ order: 1 }).session(session);
  }
  
  async getPreviousTermId(termId, session) {
    const previousTerm = await this.getPreviousTerm(termId, session);
    return previousTerm ? previousTerm._id : null;
  }
  
  calculateDueDate(termId) {
    // Implement based on your term's end date
    // For example, due date is 2 weeks after term start
    return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  }
  
  generateTransactionId() {
    return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async handleOverpayment(studentId, amount, session) {
    // Create credit note or store as advance payment
    // Implementation depends on your business rules
    console.log(`Overpayment of ${amount} for student ${studentId} will be credited to next term`);
  }

  // In feeManagementService.js, update the getCurrentFeeAccount method:

async getCurrentFeeAccount(studentId) {
  // First try to find existing fee account with due amount
  let feeAccount = await FeeAccount.findOne({
    studentId,
    totalDue: { $gt: 0 }
  }).sort({ createdAt: -1 });
  
  // If no fee account exists, try to generate one for current session/term
  if (!feeAccount) {
    // Get active session and term
    const activeSession = await this.getActiveSession();
    const activeTerm = await this.getActiveTerm();
    
    if (activeSession && activeTerm) {
      // Find enrollment for this student
      const enrollment = await Enrollment.findOne({
        studentId,
        sessionId: activeSession._id
      }).populate("classId armId");
      
      if (enrollment) {
        // Generate fee account for current term
        feeAccount = await this.generateFeeAccount(
          studentId,
          enrollment._id,
          activeSession._id,
          activeTerm._id
        );
      }
    }
  }
  
  return feeAccount;
}

// Add these helper methods:
async getActiveSession() {
  const Session = require("../models/Session");
  return await Session.findOne({ isActive: true });
}

async getActiveTerm() {
  const Term = require("../models/Term");
  return await Term.findOne({ isActive: true });
}

}

module.exports = new FeeManagementService();