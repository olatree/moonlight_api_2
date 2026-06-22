// // routes/resultRoutes.js
// const express = require("express");
// const router = express.Router();
// const resultController = require("../controllers/resultController");
// const { verifyStudent } = require("../middleware/studentAuth");

// // Bulk add/update results for a class
// router.post("/add-or-update", resultController.addOrUpdateResults);

// // Get all results for a class (by subject, term, session)
// router.get("/class", resultController.getClassResults);
// router.get("/class/all-subjects", resultController.getAllClassResults);


// // Get a student's term result
// router.get("/student-term", verifyStudent, resultController.getStudentTermResults);

// // Get a student's yearly result
// router.get("/student/yearly", resultController.getStudentYearlyResults);

// router.get("/by-subject", resultController.getResultsBySubject);

// module.exports = router;


// routes/resultRoutes.js
const express = require("express");
const router = express.Router();
const resultController = require("../controllers/resultController");
const { verifyStudent } = require("../middleware/studentAuth");

router.post("/add-or-update", resultController.addOrUpdateResults);

router.get("/class", resultController.getClassResults);
router.get("/class/all-subjects", resultController.getAllClassResults);

router.get("/student-term", verifyStudent, resultController.getStudentTermResults);
router.get("/student/yearly", resultController.getStudentYearlyResults);

router.get("/by-subject", resultController.getResultsBySubject);

// New admin result lookup routes
router.get("/by-student", resultController.getResultsByStudent);
router.get("/student-profile", resultController.getStudentProfile);

module.exports = router;