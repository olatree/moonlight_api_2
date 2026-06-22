// controllers/cbt/questionBank.controller.js
const QuestionBank = require("../../models/QuestionsBank");
const Question = require("../../models//Question");

// POST /api/cbt/banks — create a bank
exports.createBank = async (req, res) => {
  try {
    const { title, subject, classId, description } = req.body;

    const bank = await QuestionBank.create({
      title,
      subject,
      classId,
      description,
      createdBy: req.user._id, // from your existing verifyUser/admin middleware
    });

    res.status(201).json(bank);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "A bank with this title already exists for this subject and class" });
    }
    res.status(500).json({ message: err.message });
  }
};

// GET /api/cbt/banks — list all banks (admin sees all, teacher sees own)
exports.getBanks = async (req, res) => {
  try {
    const filter = {};

    // Teachers only see banks they created
    if (req.user.role === "teacher") filter.createdBy = req.user._id;

    // Optional query filters
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.classId) filter.classId = req.query.classId;

    const banks = await QuestionBank.find(filter)
      .populate("subject", "name")
      .populate("classId", "name")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    res.json(banks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/cbt/banks/:bankId — single bank with question count
exports.getBank = async (req, res) => {
  try {
    const bank = await QuestionBank.findById(req.params.bankId)
      .populate("subject", "name")
      .populate("classId", "name")
      .populate("createdBy", "name");

    if (!bank) return res.status(404).json({ message: "Bank not found" });

    const questionCount = await Question.countDocuments({ bank: bank._id });

    res.json({ ...bank.toObject(), questionCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/cbt/banks/:bankId — update bank
exports.updateBank = async (req, res) => {
  try {
    const bank = await QuestionBank.findById(req.params.bankId);
    if (!bank) return res.status(404).json({ message: "Bank not found" });

    // Teachers can only edit their own banks
    if (req.user.role === "teacher" && !bank.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { title, description } = req.body;
    if (title) bank.title = title;
    if (description) bank.description = description;

    await bank.save();
    res.json(bank);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/cbt/banks/:bankId — delete bank and all its questions
exports.deleteBank = async (req, res) => {
  try {
    const bank = await QuestionBank.findById(req.params.bankId);
    if (!bank) return res.status(404).json({ message: "Bank not found" });

    if (req.user.role === "teacher" && !bank.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Delete all questions in this bank first
    await Question.deleteMany({ bank: bank._id });
    await bank.deleteOne();

    res.json({ message: "Bank and all its questions deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};