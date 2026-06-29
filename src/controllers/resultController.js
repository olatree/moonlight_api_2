// controllers/resultController.js
const Result = require("../models/Result");
const Enrollment = require("../models/Enrollment");
const TermReport = require ("../models/TermReport");
const ResultPublication = require("../models/ResultPublication");
const Term = require("../models/Term");

// // ----------------------------
// ----------------------------
// Add or Update Results (bulk entry by class)

exports.addOrUpdateResults = async (req, res) => {
  const { classId, subjectId, termId, sessionId, results } = req.body;

  try {
    if (!results || !Array.isArray(results)) {
      return res.status(400).json({ error: "Results array is required" });
    }

    const savedResults = [];

    for (const r of results) {
      let existing = await Result.findOne({
        enrollmentId: r.enrollmentId,
        subjectId,
        termId,
        sessionId,
      });

      // Helper to check if a value is a valid number
      const isValidNumber = (val) =>
        val !== undefined &&
        val !== null &&
        val !== "" &&
        !isNaN(Number(val));

      if (existing) {
        // Only update fields that contain valid numbers
        if (isValidNumber(r.ca1)) existing.ca1 = Number(r.ca1);
        if (isValidNumber(r.ca2)) existing.ca2 = Number(r.ca2);
        if (isValidNumber(r.ca3)) existing.ca3 = Number(r.ca3);
        if (isValidNumber(r.ca4)) existing.ca4 = Number(r.ca4);
        if (isValidNumber(r.exam)) existing.exam = Number(r.exam);
      } else {
        // Create new record (use 0 for any missing/invalid fields)
        existing = new Result({
          enrollmentId: r.enrollmentId,
          subjectId,
          termId,
          sessionId,
          ca1: isValidNumber(r.ca1) ? Number(r.ca1) : 0,
          ca2: isValidNumber(r.ca2) ? Number(r.ca2) : 0,
          ca3: isValidNumber(r.ca3) ? Number(r.ca3) : 0,
          ca4: isValidNumber(r.ca4) ? Number(r.ca4) : 0,
          exam: isValidNumber(r.exam) ? Number(r.exam) : 0,
        });
      }

      // Compute total
      existing.total =
        (existing.ca1 || 0) +
        (existing.ca2 || 0) +
        (existing.ca3 || 0) +
        (existing.ca4 || 0) +
        (existing.exam || 0);

      await existing.save();
      savedResults.push(existing);
    }

    res.status(200).json({ message: "Results saved", results: savedResults });
  } catch (error) {
    console.error("addOrUpdateResults error:", error);
    res.status(500).json({ error: error.message });
  }
};



// ----------------------------
// Get Results for a Class (per subject, per term)
// ----------------------------
exports.getClassResults = async (req, res) => {
  const { subjectId, termId, sessionId, classId } = req.query;

  try {
    // 🔹 Find enrollments in the class + session
    const enrollments = await Enrollment.find({ classId, sessionId })
      .populate("studentId", "name admissionNumber");

    const enrollmentIds = enrollments.map(e => e._id);

    const results = await Result.find({
      enrollmentId: { $in: enrollmentIds },
      subjectId,
      sessionId,
      termId,
    })
      .populate("subjectId", "name")
      .populate({
        path: "enrollmentId",
        populate: { path: "studentId", select: "name admissionNumber" },
      });

    res.status(200).json(results);
  } catch (error) {
    console.error("getClassResults error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ----------------------------
// Get ALL Results for a Class (All Subjects in that Term)
// ----------------------------
exports.getAllClassResults = async (req, res) => {
  const { termId, sessionId, classId, armId } = req.query;

  try {
    // 🔹 Find all enrollments in this class + arm + session
    const enrollments = await Enrollment.find({ classId, armId, sessionId })
      .populate("studentId", "name admissionNumber");

    if (enrollments.length === 0) {
      return res.status(200).json([]);
    }

    const enrollmentIds = enrollments.map(e => e._id);

    // 🔹 Fetch all results (no subject filter)
    const results = await Result.find({
      enrollmentId: { $in: enrollmentIds },
      sessionId,
      termId,
    })
      .populate("subjectId", "name")
      .populate({
        path: "enrollmentId",
        populate: { path: "studentId", select: "name admissionNumber" },
      });

    // 🔹 Group results by student
    const groupedResults = {};
    for (const r of results) {
      const studentId = r.enrollmentId.studentId._id.toString();
      if (!groupedResults[studentId]) {
        groupedResults[studentId] = {
          student: r.enrollmentId.studentId,
          subjects: [],
        };
      }
      groupedResults[studentId].subjects.push({
        subject: r.subjectId?.name,
        ca1: r.ca1,
        ca2: r.ca2,
        ca3: r.ca3,
        ca4: r.ca4,
        exam: r.exam,
        total: r.total,
        grade: r.grade,
      });
    }

    res.status(200).json(Object.values(groupedResults));
  } catch (error) {
    console.error("getAllClassResults error:", error);
    res.status(500).json({ error: error.message });
  }
};



// // ----------------------------
// // Get Student Term Results
// // ----------------------------
// exports.getStudentTermResults = async (req, res) => {
//   const { enrollmentId: queryEnrollmentId, userId, sessionId, termId } = req.query;
//   // console.log("📥 Incoming Query:", { userId, sessionId, termId });

//   try {
//     if (!sessionId || !termId) {
//       return res.status(400).json({ message: "Session and Term are required." });
//     }    

//     let enrollmentId = queryEnrollmentId;

//     // 🔹 If no enrollmentId provided, get it from logged-in student
//     if (!enrollmentId) {
//       const studentId = userId; // assumes your auth middleware attaches user
//       // console.log("👨‍🎓 Logged-in Student ID:", studentId);
//       if (!studentId) {
//         return res.status(401).json({ message: "Unauthorized. No student information found." });
//       } 

//       // find enrollment for this student in the selected session
//       const enrollment = await Enrollment.findOne({ studentId, sessionId }).select("_id");
//       // console.log("🔍 Found Enrollment:", enrollment);
//       if (!enrollment) {
//         return res.status(404).json({ message: "Enrollment not found for this student in the selected session." });
//       }
//       enrollmentId = enrollment._id;
//       // console.log("🔍 Resolved Enrollment ID:", enrollmentId); // works to this point
//     }

//     // 🔹 Use your schema's built-in static method
//     const { termResults, termAverage } = await Result.computeTermly(enrollmentId, sessionId, termId);

//     if (!termResults || termResults.length === 0) {
//       return res.status(404).json({ message: "No results found for this term." });
//     } 

//     const report = await TermReport.findOne({ enrollmentId, termId, sessionId });

//     res.status(200).json({
//       success: true,
//       results: termResults,
//       termAverage,
//       comments: {
//         classTeacher: report?.classTeacherComment || "",
//         principal: report?.principalComment || "",
//       },
//     });

//   } catch (error) {
//     console.error("Error fetching student term results:", error);
//     res.status(500).json({
//       success: false,
//       message: "An error occurred while fetching results.",
//       error: error.message,
//     });
//   }
// };

// ----------------------------
// Get Student Term Results
// ----------------------------
exports.getStudentTermResults = async (req, res) => {
  const { enrollmentId: queryEnrollmentId, userId, sessionId, termId } = req.query;

  try {
    if (!sessionId || !termId) {
      return res.status(400).json({
        success: false,
        message: "Session and Term are required.",
      });
    }

    // Block restricted students from viewing results
    if (
      req.student?.blocked ||
      req.student?.archived ||
      req.student?.status === "graduated"
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view results. Contact the school.",
      });
    }

    // Check if result has been published
    const publication = await ResultPublication.findOne({
      sessionId,
      termId,
      isPublished: true,
    });

    if (!publication) {
      return res.status(403).json({
        success: false,
        message: "This term's result has not been published yet.",
      });
    }

    let enrollmentId = queryEnrollmentId;

    if (!enrollmentId) {
      const studentId = req.student?._id || userId;

      if (!studentId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. No student information found.",
        });
      }

      const enrollment = await Enrollment.findOne({
        studentId,
        sessionId,
      }).select("_id");

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: "Enrollment not found for this student in the selected session.",
        });
      }

      enrollmentId = enrollment._id;
    }

    const { termResults, termAverage } = await Result.computeTermly(
      enrollmentId,
      sessionId,
      termId
    );

    if (!termResults || termResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No results found for this term.",
      });
    }

    const report = await TermReport.findOne({
      enrollmentId,
      termId,
      sessionId,
    });

    res.status(200).json({
      success: true,
      results: termResults,
      termAverage,
      comments: {
        classTeacher: report?.classTeacherComment || "",
        principal: report?.principalComment || "",
      },
    });
  } catch (error) {
    console.error("Error fetching student term results:", error);

    res.status(500).json({
      success: false,
      message: "An error occurred while fetching results.",
      error: error.message,
    });
  }
};

// ----------------------------
// Get Student Yearly Results
// ----------------------------
exports.getStudentYearlyResults = async (req, res) => {
  const { enrollmentId, sessionId } = req.query;

  try {
    const yearly = await Result.computeYearly(enrollmentId, sessionId);
    res.status(200).json(yearly);
  } catch (error) {
    console.error("getStudentYearlyResults error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ----------------------------
// Get Student Yearly Results
// ----------------------------
exports.getStudentYearlyResults = async (req, res) => {
  const { enrollmentId, sessionId } = req.query;

  try {
    if (!enrollmentId || !sessionId) {
      return res.status(400).json({
        success: false,
        message: "Enrollment and Session are required.",
      });
    }

    // Student restrictions
    if (
      req.student?.blocked ||
      req.student?.archived ||
      req.student?.status === "graduated"
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view results. Contact the school.",
      });
    }

    // Get all terms for the session
    const terms = await Term.find({ sessionId }).select("_id name");

    if (terms.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No terms found for this session.",
      });
    }

    // Check publication status
    const publications = await ResultPublication.find({
      sessionId,
      isPublished: true,
    }).select("termId");

    const publishedTermIds = publications.map((p) =>
      p.termId.toString()
    );

    const unpublishedTerms = terms.filter(
      (term) => !publishedTermIds.includes(term._id.toString())
    );

    if (unpublishedTerms.length > 0) {
      return res.status(403).json({
        success: false,
        message:
          "Yearly results are not yet available because not all terms have been published.",
        unpublishedTerms: unpublishedTerms.map((t) => t.name),
      });
    }

    // All terms published
    const yearlyResult = await Result.computeYearly(
      enrollmentId,
      sessionId
    );

    res.status(200).json({
      success: true,
      data: yearlyResult,
    });
  } catch (error) {
    console.error("Get yearly results error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ----------------------------
// Get Results By Subject (Class + Arm + Session + Term)
// ----------------------------
// exports.getResultsBySubject = async (req, res) => {
//   const { subjectId, classId, armId, sessionId, termId } = req.query;

//   try {
//     // 1️⃣ Get all enrollments for the class, arm, and session
//     const enrollments = await Enrollment.find({ classId, armId, sessionId })
//       .populate("studentId", "name admissionNumber");

//     if (!enrollments.length) {
//       return res.status(404).json({ message: "No students enrolled" });
//     }

//     const enrollmentIds = enrollments.map(e => e._id);

//     // 2️⃣ Get existing results for those enrollments
//     const results = await Result.find({
//       enrollmentId: { $in: enrollmentIds },
//       subjectId,
//       sessionId,
//       termId,
//     });

//     // 3️⃣ Merge enrollment list with results
//     const formatted = enrollments.map((enroll) => {
//       const existing = results.find(
//         (r) => r.enrollmentId.toString() === enroll._id.toString()
//       );

//       return {
//         enrollmentId: enroll._id,
//         student: {
//           id: enroll.studentId._id,
//           name: enroll.studentId.name,
//           admissionNumber: enroll.studentId.admissionNumber,
//         },
//         subjectId,
//         termId,
//         sessionId,
//         ca1: existing ? existing.ca1 : "",
//         ca2: existing ? existing.ca2 : "",
//         ca3: existing ? existing.ca3 : "",
//         ca4: existing ? existing.ca4 : "",
//         exam: existing ? existing.exam : "",
//         total: existing ? existing.total : "",
//       };
//     });

//     res.status(200).json(formatted);
//   } catch (error) {
//     console.error("getResultsBySubject error:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

exports.getResultsBySubject = async (req, res) => {
  const { subjectId, classId, armId, sessionId, termId } = req.query;

  try {
    // 1️⃣ Get enrollments
    const enrollments = await Enrollment.find({
      classId,
      armId,
      sessionId,
    }).populate("studentId", "name admissionNumber");

    // 2️⃣ Remove orphaned enrollments
    const validEnrollments = enrollments.filter(
      (enroll) => enroll.studentId
    );

    if (!validEnrollments.length) {
      return res.status(404).json({
        success: false,
        message: "No students enrolled",
      });
    }

    const enrollmentIds = validEnrollments.map((e) => e._id);

    // 3️⃣ Get existing results
    const results = await Result.find({
      enrollmentId: { $in: enrollmentIds },
      subjectId,
      sessionId,
      termId,
    });

    // 4️⃣ Merge enrollments with results
    const formatted = validEnrollments.map((enroll) => {
      const existing = results.find(
        (r) => r.enrollmentId.toString() === enroll._id.toString()
      );

      return {
        enrollmentId: enroll._id,

        student: {
          id: enroll.studentId._id,
          name: enroll.studentId.name,
          admissionNumber: enroll.studentId.admissionNumber,
        },

        subjectId,
        termId,
        sessionId,

        ca1: existing?.ca1 ?? "",
        ca2: existing?.ca2 ?? "",
        ca3: existing?.ca3 ?? "",
        ca4: existing?.ca4 ?? "",
        exam: existing?.exam ?? "",
        total: existing?.total ?? "",
        grade: existing?.grade ?? "",
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });

  } catch (error) {
    console.error("getResultsBySubject error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch results",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error.message,
    });
  }
};

exports.getResultsByStudent = async (req, res) => {
  const { studentId, sessionId, termId } = req.query;

  try {
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "studentId is required",
      });
    }

    const enrollmentFilter = { studentId };
    if (sessionId) enrollmentFilter.sessionId = sessionId;

    const enrollments = await Enrollment.find(enrollmentFilter)
      .populate("studentId", "name admissionNumber gender parentContact image")
      .populate("classId", "name")
      .populate("armId", "name")
      .populate("sessionId", "name terms")
      .lean();

    if (!enrollments.length) {
      return res.status(404).json({
        success: false,
        message: "No enrollment found for this student",
      });
    }

    const enrollmentIds = enrollments.map((enrollment) => enrollment._id);

    const resultFilter = {
      enrollmentId: { $in: enrollmentIds },
    };

    if (sessionId) resultFilter.sessionId = sessionId;
    if (termId) resultFilter.termId = termId;

    const results = await Result.find(resultFilter)
      .populate("subjectId", "name")
      .populate("termId", "name")
      .populate("sessionId", "name")
      .lean();

    if (!results.length) {
      return res.status(200).json({
        success: true,
        totalRecords: 0,
        data: {
          student: enrollments[0].studentId,
          results: [],
        },
      });
    }

    const enrollmentMap = new Map(
      enrollments.map((enrollment) => [
        enrollment._id.toString(),
        enrollment,
      ])
    );

    const grouped = {};

    for (const result of results) {
      const enrollment = enrollmentMap.get(result.enrollmentId.toString());
      if (!enrollment) continue;

      const key = `${result.sessionId?._id || result.sessionId}-${result.termId?._id || result.termId}`;

      if (!grouped[key]) {
        grouped[key] = {
          session: result.sessionId?.name || enrollment.sessionId?.name || "N/A",
          term: result.termId?.name || "N/A",
          class: enrollment.classId?.name || "N/A",
          arm: enrollment.armId?.name || "N/A",
          subjects: [],
          average: 0,
        };
      }

      grouped[key].subjects.push({
        subject: result.subjectId?.name || "Unknown Subject",
        ca1: result.ca1,
        ca2: result.ca2,
        ca3: result.ca3,
        ca4: result.ca4,
        exam: result.exam,
        total: result.total,
        grade: result.grade,
      });
    }

    const groupedResults = Object.values(grouped).map((group) => {
      const total = group.subjects.reduce(
        (sum, subject) => sum + (Number(subject.total) || 0),
        0
      );

      return {
        ...group,
        average:
          group.subjects.length > 0
            ? Math.round(total / group.subjects.length)
            : 0,
      };
    });

    res.status(200).json({
      success: true,
      totalRecords: results.length,
      data: {
        student: enrollments[0].studentId,
        totalRecords: results.length,
        results: groupedResults,
      },
    });
  } catch (error) {
    console.error("getResultsByStudent error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student results",
      error:
        process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

exports.getStudentProfile = async (req, res) => {
  const { studentId, sessionId } = req.query;

  try {
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "studentId is required",
      });
    }

    const enrollmentFilter = { studentId };
    if (sessionId) enrollmentFilter.sessionId = sessionId;

    const enrollments = await Enrollment.find(enrollmentFilter)
      .populate("studentId", "name admissionNumber gender parentContact image")
      .populate("classId", "name")
      .populate("armId", "name")
      .populate("sessionId", "name")
      .lean();

    if (!enrollments.length) {
      return res.status(404).json({
        success: false,
        message: "No enrollment found for this student",
      });
    }

    const enrollmentIds = enrollments.map((enrollment) => enrollment._id);

    const results = await Result.find({
      enrollmentId: { $in: enrollmentIds },
    })
      .populate("subjectId", "name")
      .populate("termId", "name")
      .populate("sessionId", "name")
      .lean();

    const enrollmentMap = new Map(
      enrollments.map((enrollment) => [
        enrollment._id.toString(),
        enrollment,
      ])
    );

    const history = {};

    for (const result of results) {
      const enrollment = enrollmentMap.get(result.enrollmentId.toString());
      if (!enrollment) continue;

      const sessionKey = result.sessionId?._id?.toString() || result.sessionId?.toString();
      const termKey = result.termId?._id?.toString() || result.termId?.toString();

      if (!history[sessionKey]) {
        history[sessionKey] = {
          session: result.sessionId?.name || enrollment.sessionId?.name || "N/A",
          class: enrollment.classId?.name || "N/A",
          arm: enrollment.armId?.name || "N/A",
          terms: {},
        };
      }

      if (!history[sessionKey].terms[termKey]) {
        history[sessionKey].terms[termKey] = {
          term: result.termId?.name || "N/A",
          subjects: [],
          average: 0,
        };
      }

      history[sessionKey].terms[termKey].subjects.push({
        subject: result.subjectId?.name || "Unknown Subject",
        ca1: result.ca1,
        ca2: result.ca2,
        ca3: result.ca3,
        ca4: result.ca4,
        exam: result.exam,
        total: result.total,
        grade: result.grade,
      });
    }

    const academicHistory = Object.values(history).map((session) => {
      const terms = Object.values(session.terms).map((term) => {
        const total = term.subjects.reduce(
          (sum, subject) => sum + (Number(subject.total) || 0),
          0
        );

        return {
          ...term,
          average:
            term.subjects.length > 0
              ? Math.round(total / term.subjects.length)
              : 0,
        };
      });

      return {
        ...session,
        terms,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        student: enrollments[0].studentId,
        academicHistory,
      },
    });
  } catch (error) {
    console.error("getStudentProfile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student profile",
      error:
        process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};