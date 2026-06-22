// const jwt = require("jsonwebtoken");
// const Student = require("../models/Student");

// exports.verifyStudent = async (req, res, next) => {
//   try {
//     console.log("All cookies received:", req.cookies);
//     console.log("studentToken:", req.cookies?.studentToken);
    
//     const token = req.cookies.studentToken; // read from cookie
//     if (!token) {
//       console.log("No token found");
//       return res.status(401).json({ message: "Not authenticated" });
//     } 

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const student = await Student.findById(decoded.id).select("-password");

//     if (!student) {
//       return res.status(404).json({ message: "Student not found" });
//     }

//     req.student = student; // attach to request
//     next();
//   } catch (err) {
//     console.error("Student auth error:", err.message);
//     res.status(401).json({ message: "Invalid or expired token" });
//   }
// };


// const jwt = require("jsonwebtoken");
// const { StatusCodes } = require("http-status-codes");

// const Student = require("../models/Student");
// const asyncHandler = require("./asyncHandler");

// exports.verifyStudent = asyncHandler(async (req, res, next) => {
//   const token = req.cookies?.studentToken;

//   if (!token) {
//     res.status(StatusCodes.UNAUTHORIZED);
//     throw new Error("Not authenticated");
//   }

//   const decoded = jwt.verify(token, process.env.JWT_SECRET);

//   const student = await Student.findOne({
//     _id: decoded.id,
//     archived: false,
//   });

//   if (!student) {
//     res.status(StatusCodes.UNAUTHORIZED);
//     throw new Error("Student not found");
//   }

//   if (student.blocked) {
//     res.status(StatusCodes.FORBIDDEN);
//     throw new Error("Your account is blocked. Please contact the school.");
//   }

//   req.student = student;

//   next();
// });

const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");

const Student = require("../models/Student");
const asyncHandler = require("./asyncHandler");

exports.verifyStudent = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.studentToken;

  if (
    !token &&
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(StatusCodes.UNAUTHORIZED);
    throw new Error("Not authenticated");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const student = await Student.findOne({
    _id: decoded.id,
    archived: false,
  });

  if (!student) {
    res.status(StatusCodes.UNAUTHORIZED);
    throw new Error("Student not found");
  }

  if (student.blocked) {
    res.status(StatusCodes.FORBIDDEN);
    throw new Error("Your account is blocked. Please contact the school.");
  }

  req.student = student;
  next();
});