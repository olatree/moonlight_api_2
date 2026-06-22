// models/Payment.js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    feeAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "FeeAccount", required: true },
    enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Enrollment" },
    
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { 
      type: String, 
      enum: ["Cash", "Bank Transfer", "Cheque", "Online", "Other"],
      required: true 
    },
    transactionId: { type: String, unique: true }, // Reference number
    paymentDate: { type: Date, default: Date.now },
    
    // Breakdown of what fees were paid
    allocation: [
      {
        feeType: { type: String },
        amount: { type: Number },
        feeStructureId: { type: mongoose.Schema.Types.ObjectId, ref: "FeeStructure" },
      }
    ],
    
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, default: null }, // Who received the payment (admin/teacher)
    receiptNumber: { type: String, unique: true },
    notes: { type: String },
    
    // Payment status
    status: { 
      type: String, 
      enum: ["Pending", "Completed", "Failed", "Refunded"],
      default: "Completed"
    },
  },
  { timestamps: true }
);

// Auto-generate receipt number
paymentSchema.pre("save", async function(next) {
  if (!this.receiptNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model("Payment").countDocuments();
    this.receiptNumber = `RCP-${year}-${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model("Payment", paymentSchema);