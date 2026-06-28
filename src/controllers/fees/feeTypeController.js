// controllers/fees/feeTypeController.js

const FeeType = require("../../models/fees/FeeType");


// =========================
// CREATE
// =========================
exports.createFeeType = async (req, res) => {
  try {
    const { name, description, isCompulsory, appliesTo } = req.body;

    const existing = await FeeType.findOne({
      name: name.trim(),
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Fee type already exists",
      });
    }

    const feeType = await FeeType.create({
      name: name.trim(),
      description,
      isCompulsory,
      appliesTo: appliesTo || "all",
    });

    res.status(201).json({
      success: true,
      data: feeType,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// GET ALL
// =========================
exports.getFeeTypes = async (req, res) => {
  try {
    const feeTypes = await FeeType.find()
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: feeTypes.length,
      data: feeTypes,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// GET ACTIVE
// =========================
exports.getActiveFeeTypes = async (req, res) => {
  try {
    const feeTypes = await FeeType.find({
      isActive: true,
    }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: feeTypes.length,
      data: feeTypes,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// UPDATE
// =========================
exports.updateFeeType = async (req, res) => {
  try {
    const feeType = await FeeType.findById(req.params.id);

    if (!feeType) {
      return res.status(404).json({
        success: false,
        message: "Fee type not found",
      });
    }

    feeType.name =
      req.body.name ?? feeType.name;

    feeType.description =
      req.body.description ?? feeType.description;

    feeType.isCompulsory =
      req.body.isCompulsory ?? feeType.isCompulsory;

    feeType.appliesTo =
      req.body.appliesTo ?? feeType.appliesTo;

    await feeType.save();

    res.status(200).json({
      success: true,
      data: feeType,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// ARCHIVE
// =========================
exports.archiveFeeType = async (req, res) => {
  try {
    const feeType = await FeeType.findById(req.params.id);

    if (!feeType) {
      return res.status(404).json({
        success: false,
        message: "Fee type not found",
      });
    }

    feeType.isActive = false;
    feeType.archivedAt = new Date();

    await feeType.save();

    res.status(200).json({
      success: true,
      message: "Fee type archived successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// RESTORE
// =========================
exports.restoreFeeType = async (req, res) => {
  try {
    const feeType = await FeeType.findById(req.params.id);

    if (!feeType) {
      return res.status(404).json({
        success: false,
        message: "Fee type not found",
      });
    }

    feeType.isActive = true;
    feeType.archivedAt = null;

    await feeType.save();

    res.status(200).json({
      success: true,
      message: "Fee type restored successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};