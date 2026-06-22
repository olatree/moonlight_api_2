// server/controllers/studentController.js
const { StatusCodes } = require("http-status-codes");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;

const Student = require("../models/Student");
const Enrollment = require("../models/Enrollment");
const asyncHandler = require("../middleware/asyncHandler");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const isProduction = process.env.NODE_ENV === "production";

const studentCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const clearStudentCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
};

const sanitizeStudent = (student) => ({
  id: student._id,
  name: student.name,
  admissionNumber: student.admissionNumber,
  image: student.image,
  gender: student.gender,
  dateOfBirth: student.dateOfBirth,
  parentContact: student.parentContact,
  blocked: student.blocked,
  archived: student.archived,
  createdAt: student.createdAt,
  updatedAt: student.updatedAt,
});

const uploadToCloudinary = async (fileBuffer, folder = "students") => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `school-app/${folder}`,
          resource_type: "image",
        },
        (error, result) => {
          if (error) return reject(error);

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      )
      .end(fileBuffer);
  });
};

const extractCloudinaryPublicId = (imageUrl) => {
  if (!imageUrl) return null;

  try {
    const parts = imageUrl.split("/");
    const uploadIndex = parts.findIndex((part) => part === "upload");

    if (uploadIndex === -1) return null;

    const publicIdParts = parts.slice(uploadIndex + 1);

    if (publicIdParts[0]?.startsWith("v")) {
      publicIdParts.shift();
    }

    const publicIdWithExtension = publicIdParts.join("/");
    return publicIdWithExtension.replace(/\.[^/.]+$/, "");
  } catch {
    return null;
  }
};

const deleteCloudinaryImage = async (imageUrl) => {
  const publicId = extractCloudinaryPublicId(imageUrl);

  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
    });
  } catch (error) {
    console.warn("Failed to delete Cloudinary image:", error.message);
  }
};

const getDefaultStudentPassword = (name) => {
  return name.trim().split(/\s+/)[0].toLowerCase();
};

// Register Student
exports.registerStudent = asyncHandler(async (req, res) => {
  const {
    name,
    dateOfBirth,
    gender,
    parentContact,
    classId,
    armId,
    sessionId,
    termId,
  } = req.body;

  if (
    !name ||
    !dateOfBirth ||
    !gender ||
    !parentContact ||
    !classId ||
    !armId ||
    !sessionId
  ) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error(
      "Name, date of birth, gender, parent contact, class, arm, and session are required"
    );
  }

  let imageUrl = null;

  if (req.file) {
    const uploaded = await uploadToCloudinary(
      req.file.buffer,
      "students/pictures"
    );
    imageUrl = uploaded.url;
  }

  const defaultPassword = getDefaultStudentPassword(name);

  const student = await Student.create({
    name: name.trim(),
    dateOfBirth: new Date(dateOfBirth),
    gender,
    parentContact: parentContact.trim(),
    image: imageUrl,
    password: defaultPassword,
  });

  const enrollmentPayload = {
    studentId: student._id,
    classId,
    armId,
    sessionId,
  };

  if (termId) {
    enrollmentPayload.termId = termId;
  }

  const enrollment = await Enrollment.create(enrollmentPayload);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Student registered and enrolled successfully",
    data: {
      student: sanitizeStudent(student),
      enrollment,
      loginCredentials: {
        admissionNumber: student.admissionNumber,
        password: defaultPassword,
      },
    },
  });
});

// Get Students
exports.getStudents = asyncHandler(async (req, res) => {
  const { sessionId, classId, armId, studentId } = req.query;

  const filter = {};

  if (sessionId) filter.sessionId = sessionId;
  if (classId) filter.classId = classId;
  if (armId) filter.armId = armId;
  if (studentId) filter.studentId = studentId;

  const enrollments = await Enrollment.find(filter)
    .populate(
      "studentId",
      "name image admissionNumber dateOfBirth gender parentContact blocked archived"
    )
    .populate("classId", "name")
    .populate("armId", "name")
    .populate("sessionId", "name")
    .lean();

  res.status(StatusCodes.OK).json({
    success: true,
    count: enrollments.length,
    data: enrollments,
  });
});

// Count Students
exports.getCount = asyncHandler(async (req, res) => {
  const { classId, armId, sessionId, termId } = req.query;

  if (!classId || !armId || !sessionId) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("classId, armId, and sessionId are required");
  }

  const filter = {
    classId,
    armId,
    sessionId,
  };

  if (termId) {
    filter.termId = termId;
  }

  const count = await Enrollment.countDocuments(filter);

  res.status(StatusCodes.OK).json({
    success: true,
    count,
  });
});

// Block Student
exports.blockStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findByIdAndUpdate(
    studentId,
    { blocked: true },
    { new: true, runValidators: true }
  );

  if (!student) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Student not found");
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Student blocked successfully",
    data: sanitizeStudent(student),
  });
});

// Unblock Student
exports.unblockStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findByIdAndUpdate(
    studentId,
    { blocked: false },
    { new: true, runValidators: true }
  );

  if (!student) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Student not found");
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Student unblocked successfully",
    data: sanitizeStudent(student),
  });
});

// Update Student
exports.updateStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findById(studentId).select("+password");

  if (!student) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Student not found");
  }

  if (req.file) {
    const uploaded = await uploadToCloudinary(
      req.file.buffer,
      "students/pictures"
    );

    await deleteCloudinaryImage(student.image);

    student.image = uploaded.url;
  }

  const allowedStudentFields = [
    "name",
    "dateOfBirth",
    "gender",
    "parentContact",
  ];

  allowedStudentFields.forEach((field) => {
    if (
      req.body[field] !== undefined &&
      req.body[field] !== "" &&
      req.body[field] !== null
    ) {
      student[field] =
        field === "name" || field === "parentContact"
          ? req.body[field].trim()
          : req.body[field];
    }
  });

  if (req.body.newPassword) {
    const { newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Passwords do not match");
    }

    if (newPassword.length < 6) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Password must be at least 6 characters");
    }

    student.password = newPassword;
  }

  await student.save();

  const enrollmentUpdates = {};

  if (req.body.classId) enrollmentUpdates.classId = req.body.classId;
  if (req.body.armId) enrollmentUpdates.armId = req.body.armId;
  if (req.body.sessionId) enrollmentUpdates.sessionId = req.body.sessionId;
  if (req.body.termId) enrollmentUpdates.termId = req.body.termId;

  if (Object.keys(enrollmentUpdates).length > 0) {
    await Enrollment.findOneAndUpdate(
      { studentId: student._id },
      enrollmentUpdates,
      {
        new: true,
        runValidators: true,
      }
    );
  }

  const updatedEnrollment = await Enrollment.findOne({ studentId: student._id })
    .populate("studentId", "name image admissionNumber dateOfBirth gender parentContact blocked archived")
    .populate("classId", "name")
    .populate("armId", "name")
    .populate("sessionId", "name")
    .lean();

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Student updated successfully",
    data: updatedEnrollment,
  });
});

// Delete Student
exports.deleteStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findById(studentId);

  if (!student) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Student not found");
  }

  await deleteCloudinaryImage(student.image);

  await Enrollment.deleteMany({ studentId: student._id });
  await student.deleteOne();

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Student and enrollments deleted successfully",
  });
});

// Login Student
exports.loginStudent = asyncHandler(async (req, res) => {
  const { admissionNumber, password } = req.body;

  if (!admissionNumber || !password) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Admission number and password are required");
  }

  const student = await Student.findOne({
    admissionNumber: admissionNumber.trim(),
    archived: false,
  }).select("+password");

  if (!student) {
    res.status(StatusCodes.UNAUTHORIZED);
    throw new Error("Invalid admission number or password");
  }

  if (student.blocked) {
    res.status(StatusCodes.FORBIDDEN);
    throw new Error("Your account is blocked. Please contact the school.");
  }

  const isMatch = await student.matchPassword(password);

  if (!isMatch) {
    res.status(StatusCodes.UNAUTHORIZED);
    throw new Error("Invalid admission number or password");
  }

  const studentToken = jwt.sign(
    {
      id: student._id,
      admissionNumber: student.admissionNumber,
      type: "student",
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("studentToken", studentToken, studentCookieOptions);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Login successful",
    token: studentToken,
    studentToken,
    data: sanitizeStudent(student),
  });
});

// Current Logged-in Student
exports.getMe = asyncHandler(async (req, res) => {
  res.status(StatusCodes.OK).json({
    success: true,
    data: sanitizeStudent(req.student),
  });
});

// Logout Student
exports.logoutStudent = asyncHandler(async (req, res) => {
  res.clearCookie("studentToken", clearStudentCookieOptions);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Logged out successfully",
  });
});