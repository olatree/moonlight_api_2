// utils/cbt/excelImport.js
const xlsx = require("xlsx");

const REQUIRED_COLS = ["question", "option_a", "option_b", "option_c", "option_d", "correct"];
const VALID_OPTIONS = ["A", "B", "C", "D"];

/**
 * Parse an Excel buffer into an array of question objects
 * @param {Buffer} buffer - file buffer from multer memoryStorage
 * @returns {{ questions: Array, errors: Array }}
 */
exports.parseQuestionExcel = (buffer) => {
  // Read workbook from buffer
  const workbook = xlsx.read(buffer, { type: "buffer" });

  // Always use the first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Excel file has no sheets");

  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, {
    defval: "",       // empty cells become "" instead of undefined
    raw: false,       // all values as strings (prevents number/date weirdness)
  });

  if (!rows.length) throw new Error("Excel sheet is empty");

  // ── Validate headers ───────────────────────────────────────────────────────
  const headers = Object.keys(rows[0]).map((h) => h.trim().toLowerCase());
  const missingCols = REQUIRED_COLS.filter((col) => !headers.includes(col));
  if (missingCols.length) {
    throw new Error(`Missing required column(s): ${missingCols.join(", ")}`);
  }

  const questions = [];
  const errors = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2; // Excel row number (row 1 = header, data starts at row 2)

    // Normalize values
    const questionText = row["question"]?.trim();
    const optionA      = row["option_a"]?.trim();
    const optionB      = row["option_b"]?.trim();
    const optionC      = row["option_c"]?.trim();
    const optionD      = row["option_d"]?.trim();
    const correct      = row["correct"]?.trim().toUpperCase();
    const topic        = row["topic"]?.trim() || "General";
    const marks        = Number(row["marks"]) || 1;

    // ── Row-level validation ─────────────────────────────────────────────────
    if (!questionText) {
      errors.push(`Row ${rowNum}: question text is empty — skipped`);
      return;
    }
    if (!optionA || !optionB || !optionC || !optionD) {
      errors.push(`Row ${rowNum}: one or more options (A, B, C, D) are empty — skipped`);
      return;
    }
    if (!VALID_OPTIONS.includes(correct)) {
      errors.push(`Row ${rowNum}: "correct" must be A, B, C, or D (got "${row["correct"]}") — skipped`);
      return;
    }
    if (marks < 1) {
      errors.push(`Row ${rowNum}: marks must be at least 1 — skipped`);
      return;
    }

    questions.push({
      body: questionText,
      options: [
        { id: "A", text: optionA },
        { id: "B", text: optionB },
        { id: "C", text: optionC },
        { id: "D", text: optionD },
      ],
      correctOption: correct,
      topic,
      marks,
    });
  });

  return { questions, errors };
};