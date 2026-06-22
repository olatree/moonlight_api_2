// src/utils/feeUtils.js

exports.recalculateFeeAccount = (feeAccount) => {
  feeAccount.totalAmount = feeAccount.fees.reduce(
    (sum, fee) => sum + Number(fee.amount || 0),
    0
  );

  feeAccount.totalDiscount = feeAccount.fees.reduce(
    (sum, fee) => sum + Number(fee.discount || 0),
    0
  );

  feeAccount.fees.forEach((fee) => {
    fee.netAmount = Number(fee.amount || 0) - Number(fee.discount || 0);
    fee.due = Number(fee.netAmount || 0) - Number(fee.paid || 0);
  });

  const currentTermNetAmount = feeAccount.fees.reduce(
    (sum, fee) => sum + Number(fee.netAmount || 0),
    0
  );

  feeAccount.netPayable =
    currentTermNetAmount + Number(feeAccount.previousBalance || 0);

  feeAccount.totalPaid = feeAccount.fees.reduce(
    (sum, fee) => sum + Number(fee.paid || 0),
    0
  );

  feeAccount.totalDue =
    Number(feeAccount.netPayable || 0) - Number(feeAccount.totalPaid || 0);

  if (feeAccount.totalPaid <= 0) {
    feeAccount.status = "unpaid";
  } else if (feeAccount.totalDue <= 0) {
    feeAccount.status = feeAccount.totalDue < 0 ? "overpaid" : "paid";
  } else {
    feeAccount.status = "part_payment";
  }

  return feeAccount;
};

exports.applyPaymentToFees = (fees, amount) => {
  let remaining = Number(amount);

  for (const fee of fees) {
    if (remaining <= 0) break;

    const due = Number(fee.due || 0);

    if (due <= 0) continue;

    const amountToApply = Math.min(due, remaining);

    fee.paid = Number(fee.paid || 0) + amountToApply;
    fee.due = Number(fee.due || 0) - amountToApply;

    remaining -= amountToApply;
  }

  return {
    fees,
    overpayment: remaining,
  };
};

exports.reversePaymentFromFees = (fees, amount) => {
  let remaining = Number(amount);

  for (let i = fees.length - 1; i >= 0; i--) {
    if (remaining <= 0) break;

    const fee = fees[i];
    const paid = Number(fee.paid || 0);

    if (paid <= 0) continue;

    const amountToReverse = Math.min(paid, remaining);

    fee.paid = paid - amountToReverse;
    fee.due = Number(fee.due || 0) + amountToReverse;

    remaining -= amountToReverse;
  }

  return fees;
};

exports.calculateDiscountAmount = ({ feeAmount, discountType, value }) => {
  const numericValue = Number(value);

  if (numericValue <= 0) {
    throw new Error("Discount value must be greater than zero");
  }

  if (discountType === "percentage") {
    if (numericValue > 100) {
      throw new Error("Percentage discount cannot be more than 100");
    }

    return (Number(feeAmount || 0) * numericValue) / 100;
  }

  if (discountType === "fixed") {
    return numericValue;
  }

  throw new Error("Invalid discount type");
};

exports.generateReceiptRef = () => {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);

  return `RCPT-${year}-${timestamp}${random}`;
};