// controllers/cbt/question.controller.js
const Question = require("../../models/Question");
const QuestionBank = require("../../models/QuestionsBank");
const { parseQuestionExcel } = require("../../utils/cbt/excelImport");
const { uploadToCloudinary, deleteFromCloudinary } = require("../../utils/uploadToCloudinary")

// POST /api/cbt/questions — add single question to a bank
// exports.createQuestion = async (req, res) => {
//   try {
//     const { bankId, body, options, correctOption, topic, marks, image } = req.body;

//     // Verify bank exists and user has access
//     const bank = await QuestionBank.findById(bankId);
//     if (!bank) return res.status(404).json({ message: "Question bank not found" });

//     if (req.user.role === "teacher" && !bank.createdBy.equals(req.user._id)) {
//       return res.status(403).json({ message: "Access denied" });
//     }

//     // Validate options array
//     if (!Array.isArray(options) || options.length !== 4) {
//       return res.status(400).json({ message: "Exactly 4 options required" });
//     }
//     const ids = options.map((o) => o.id);
//     if (!["A", "B", "C", "D"].every((id) => ids.includes(id))) {
//       return res.status(400).json({ message: "Options must have ids A, B, C, D" });
//     }

//     const question = await Question.create({
//       bank: bankId,
//       body,
//       options,
//       correctOption,
//       topic,
//       marks,
//       image: image || null,
//       createdBy: req.user._id,
//     });

//     res.status(201).json(question);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.createQuestion = async (req, res) => {

//   console.log("BODY:", req.body);
//   console.log("FILE:", req.file);
//   try {
//     const { bankId, body, options, correctOption, topic, marks } = req.body;

//     const bank = await QuestionBank.findById(bankId);
//     if (!bank) return res.status(404).json({ message: "Question bank not found" });

//     if (req.user.role === "teacher" && !bank.createdBy.equals(req.user._id)) {
//       return res.status(403).json({ message: "Access denied" });
//     }

//     if (!Array.isArray(options) || options.length !== 4) {
//       return res.status(400).json({ message: "Exactly 4 options required" });
//     }

//     // Handle optional image upload — same pattern as student controller
//     let imageUrl = null;
//     if (req.file) {
//       const result = await uploadToCloudinary(req.file.buffer, "cbt/questions");
//       imageUrl = result.url;
//     }

//     const question = await Question.create({
//       bank: bankId,
//       body,
//       options,
//       correctOption,
//       topic,
//       marks,
//       image: imageUrl,
//       createdBy: req.user._id,
//     });

//     res.status(201).json(question);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

exports.createQuestion = async (req, res) => {
  console.log("BODY:", req.body);
  console.log("FILE:", req.file);

  try {
    const { bankId, body, correctOption, topic, marks } = req.body;

    let options;
    try {
      options = typeof req.body.options === "string"
        ? JSON.parse(req.body.options)
        : req.body.options;
    } catch {
      return res.status(400).json({ message: "Invalid options format" });
    }

    console.log("Parsed options:", options);
    console.log("bankId:", bankId);
    console.log("correctOption:", correctOption);

    if (!bankId) return res.status(400).json({ message: "bankId is required" });
    if (!body?.trim()) return res.status(400).json({ message: "Question text is required" });
    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ message: "Exactly 4 options required" });
    }

    const optionIds = options.map((o) => o.id);
    console.log("Option IDs found:", optionIds);

    if (!["A", "B", "C", "D"].every((id) => optionIds.includes(id))) {
      return res.status(400).json({ message: "Options must have ids A, B, C and D" });
    }
    if (!["A", "B", "C", "D"].includes(correctOption)) {
      return res.status(400).json({ message: "correctOption must be A, B, C or D" });
    }

    const bank = await QuestionBank.findById(bankId);
    console.log("Bank found:", bank?._id);

    if (!bank) return res.status(404).json({ message: "Question bank not found" });
    if (req.user.role === "teacher" && !bank.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    let imageUrl = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, "cbt/questions");
      imageUrl = result.url;
    }

    const question = await Question.create({
      bank: bankId,
      body: body.trim(),
      options,
      correctOption,
      topic: topic?.trim() || "General",
      marks: Number(marks) || 1,
      image: imageUrl,
      createdBy: req.user._id,
    });

    res.status(201).json(question);
  } catch (err) {
    // This will tell us if it's a mongoose validation error
    console.error("createQuestion error name:", err.name);
    console.error("createQuestion error message:", err.message);
    if (err.name === "ValidationError") {
      console.error("Validation errors:", err.errors);
      return res.status(400).json({ 
        message: Object.values(err.errors).map(e => e.message).join(", ")
      });
    }
    res.status(500).json({ message: err.message });
  }
};

// GET /api/cbt/questions?bankId=xxx&topic=xxx — list questions in a bank
exports.getQuestions = async (req, res) => {
  try {
    const { bankId, topic } = req.query;
    if (!bankId) return res.status(400).json({ message: "bankId is required" });

    const filter = { bank: bankId };
    if (topic) filter.topic = topic;

    const questions = await Question.find(filter).sort({ createdAt: 1 });

    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/cbt/questions/:questionId — edit a question
// exports.updateQuestion = async (req, res) => {
//   try {
//     const question = await Question.findById(req.params.questionId);
//     if (!question) return res.status(404).json({ message: "Question not found" });

//     if (req.user.role === "teacher" && !question.createdBy.equals(req.user._id)) {
//       return res.status(403).json({ message: "Access denied" });
//     }

//     const fields = ["body", "options", "correctOption", "topic", "marks", "image"];
//     fields.forEach((f) => {
//       if (req.body[f] !== undefined) question[f] = req.body[f];
//     });

//     await question.save();
//     res.json(question);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

exports.updateQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    if (req.user.role === "teacher" && !question.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Handle image replacement — delete old, upload new
    if (req.file) {
      if (question.image) {
        // Extract public_id from stored URL — same logic as your updateStudent
        const urlParts = question.image.split("/");
        const filename = urlParts[urlParts.length - 1];          // abc123.jpg
        const name = filename.split(".")[0];                      // abc123
        const folder = urlParts.slice(urlParts.indexOf("school-app")).slice(0, -1).join("/");
        const oldPublicId = `${folder}/${name}`;

        deleteFromCloudinary(oldPublicId); // fire and forget
      }

      const result = await uploadToCloudinary(req.file.buffer, "cbt/questions");
      question.image = result.url;
    }

    const fields = ["body", "options", "correctOption", "topic", "marks"];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) question[f] = req.body[f];
    });

    await question.save();
    res.json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/cbt/questions/:questionId
// exports.deleteQuestion = async (req, res) => {
//   try {
//     const question = await Question.findById(req.params.questionId);
//     if (!question) return res.status(404).json({ message: "Question not found" });

//     if (req.user.role === "teacher" && !question.createdBy.equals(req.user._id)) {
//       return res.status(403).json({ message: "Access denied" });
//     }

//     await question.deleteOne();
//     res.json({ message: "Question deleted" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    if (req.user.role === "teacher" && !question.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Clean up image from Cloudinary if it exists
    if (question.image) {
      const urlParts = question.image.split("/");
      const filename = urlParts[urlParts.length - 1];
      const name = filename.split(".")[0];
      const folder = urlParts.slice(urlParts.indexOf("school-app")).slice(0, -1).join("/");
      deleteFromCloudinary(`${folder}/${name}`);
    }

    await question.deleteOne();
    res.json({ message: "Question deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/cbt/questions/import/:bankId — bulk import from Excel
exports.bulkImport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const bank = await QuestionBank.findById(req.params.bankId);
    if (!bank) return res.status(404).json({ message: "Bank not found" });

    if (req.user.role === "teacher" && !bank.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { questions, errors } = parseQuestionExcel(req.file.buffer);

    if (!questions.length) {
      return res.status(400).json({
        message: "No valid questions found in file",
        errors,
      });
    }

    const docs = questions.map((q) => ({
      ...q,
      bank: req.params.bankId,
      createdBy: req.user._id,
    }));

    await Question.insertMany(docs);

    res.json({
      message: `${docs.length} question(s) imported successfully`,
      imported: docs.length,
      skipped: errors.length,
      errors, // row-level errors so teacher knows what to fix
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};