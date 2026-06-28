const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");

const authRoutes = require("./src/routes/authRoutes");
const sessionRoutes = require("./src/routes/sessionRoutes");
const classRoutes = require("./src/routes/classRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const principalRoutes = require("./src/routes/principalRoutes");
const teacherRoutes = require("./src/routes/teacherRoutes");
const subjectRoutes = require("./src/routes/SubjectRoutes");
const subjectAssignmentRoutes = require("./src/routes/subjectAssignmentRoutes");
const teacherAssignmentRoutes = require("./src/routes/teacherAssignmentRoutes");
const classTeacherRoutes = require("./src/routes/classTeacherRoutes");
const studentRoutes = require("./src/routes/studentRoutes");
const resultRoutes = require("./src/routes/resultRoutes");
const teacherAuthRoutes = require("./src/routes/teachersAuthRoutes");
const termReportRoutes = require("./src/routes/termReportRoutes");
const attendanceRoutes = require("./src/routes/attendanceRoutes");
// const feeRoutes = require("./src/routes/feeRoutes");
const cbtRoutes = require("./src/routes/cbt/index");
const promotionRoutes = require("./src/routes/promotionRoutes");
const feeTypeRoutes = require("./src/routes/fees/feeTypeRoutes");
const feeStructureRoutes = require("./src/routes/fees/feeStructureRoutes");
const feeAccountRoutes = require("./src/routes/fees/feeAccountRoutes");
const paymentRoutes = require("./src/routes/fees/paymentRoutes");
const discountRoutes = require("./src/routes/fees/discountRoutes");
const feeReportRoutes = require("./src/routes/fees/feeReportRoutes");
const lessonRoutes = require("./src/routes/lessonRoutes");


// const notFound = require("./src/middleware/notFound");
const {notFound, errorHandler} = require("./src/middleware/errorHandler");

const app = express();

const allowedOrigins = process.env.FRONTEND_URL
? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
: [];
console.log("Allowed origins:", allowedOrigins);

app.use(helmet());
app.use(compression());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      } 
      
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// app.use(
//   cors({
//     origin: "moonlightcollege.com.ng",
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: {
      success: false,
      message: "Too many requests. Please try again later.",
    },
  })
);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/principals", principalRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/subject-assignments", subjectAssignmentRoutes);
app.use("/api/teacher-assignments", teacherAssignmentRoutes);
app.use("/api/class-teachers", classTeacherRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/teachers-auth", teacherAuthRoutes);
app.use("/api/term-reports", termReportRoutes);
app.use("/api/attendance", attendanceRoutes);
// app.use("/api/fees", feeRoutes);
app.use("/api/cbt", cbtRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/fees/types", feeTypeRoutes);
app.use("/api/fees/structures", feeStructureRoutes);
app.use("/api/fees/accounts", feeAccountRoutes);
app.use("/api/fees/payments", paymentRoutes);
app.use("/api/fees/discounts", discountRoutes);
// app.use("/api/fees/discounts", discountRoutes);
app.use("/api/fees/reports", feeReportRoutes);
app.use("/api/student-fees", require("./src/routes/fees/studentFeeRoutes"));

app.use("/api/student-fees", require("./src/routes/fees/studentFeeRoutes"));
app.use("/api/lessons", lessonRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;