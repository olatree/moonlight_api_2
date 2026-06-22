// // server/controllers/authController.js
// const User = require("../models/User");
// const jwt = require("jsonwebtoken");

// // Generate and set JWT cookie
// const generateToken = (res, userId, role) => {
//   const token = jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
//     expiresIn: "7d",
//   });

//   res.cookie("jwt", token, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production", // true on production (HTTPS)
//     sameSite: "lax",
//     maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
//   });

//   return token;
// };

// // @desc Register new user
// exports.register = async (req, res) => {
//   try {
//     const { name, userId, password, role } = req.body;

//     // Ensure uniqueness by userId
//     const exists = await User.findOne({ userId });
//     if (exists) return res.status(400).json({ message: "User already exists" });

//     const user = await User.create({ name, userId, password, role });
//     generateToken(res, user._id, user.role);

//     res.status(201).json({
//       id: user._id,
//       name: user.name,
//       userId: user.userId,
//       role: user.role,
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // @desc Login user
// exports.login = async (req, res) => {
//   const { userId, password } = req.body;

//   try {
//     const user = await User.findOne({ userId });
//     if (!user) return res.status(400).json({ message: "Invalid ID or password" });

//     const isMatch = await user.matchPassword(password);
//     if (!isMatch) return res.status(400).json({ message: "Invalid ID or password" });

//     generateToken(res, user._id, user.role);

//     res.json({
//       id: user._id,
//       userId: user.userId,
//       name: user.name,
//       role: user.role,
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // @desc Logout user
// exports.logout = (req, res) => {
//   res.clearCookie("jwt", {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "lax",
//   });
//   res.json({ message: "Logged out successfully" });
// };

// // @desc Current logged in user
// exports.me = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id).select("-password");
//     if (!user) return res.status(404).json({ message: "User not found" });
//     res.json(user);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };

// // GET /api/users
// exports.getUsers = async (req, res) => {
//   try {
//     // Always return ALL users
//     const users = await User.find().select("-password");

//     res.json(users);
//   } catch (err) {
//     res.status(500).json({ message: "Error fetching users", error: err });
//   }
// };

const { StatusCodes } = require("http-status-codes");

const User = require("../models/User");
const AuthSession = require("../models/AuthSession");
const asyncHandler = require("../middleware/asyncHandler");
const auditLog = require("../utils/audit");

const {
  REFRESH_TOKEN_EXPIRES_DAYS,
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  compareRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} = require("../utils/authTokens");

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  userId: user.userId,
  role: user.role,
  isBlocked: user.isBlocked,
  isClassTeacher: user.isClassTeacher || false,
  classTeacherOf: user.classTeacherOf || null,

});

const createSessionAndSetCookies = async (req, res, user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = await hashRefreshToken(refreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

  await AuthSession.create({
    user: user._id,
    refreshTokenHash,
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
    expiresAt,
  });

  setAuthCookies(res, accessToken, refreshToken);
};

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Name, email, password and role are required");
  }

  const allowedRoles = ["teacher", "principal"];

  if (!allowedRoles.includes(role)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid registration role");
  }

  const normalizedEmail = email.toLowerCase().trim();

  const exists = await User.findOne({ email: normalizedEmail });

  if (exists) {
    res.status(StatusCodes.CONFLICT);
    throw new Error("Email already exists");
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role,
  });

  await createSessionAndSetCookies(req, res, user);

  await auditLog({
    req,
    actor: user._id,
    action: "AUTH_REGISTER",
    entity: "User",
    entityId: user._id,
  });

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Registration successful",
    data: sanitizeUser(user),
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("User ID and password are required");
  }

  const user = await User.findOne({ userId }).select("+password");

  if (!user) {
    res.status(StatusCodes.UNAUTHORIZED);
    throw new Error("Invalid ID or password");
  }

  if (user.isBlocked) {
    res.status(StatusCodes.FORBIDDEN);
    throw new Error("Your account has been blocked. Contact admin.");
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    res.status(StatusCodes.UNAUTHORIZED);
    throw new Error("Invalid ID or password");
  }

  await createSessionAndSetCookies(req, res, user);

  await auditLog({
    req,
    actor: user._id,
    action: "AUTH_LOGIN",
    entity: "User",
    entityId: user._id,
  });

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Login successful",
    data: sanitizeUser(user),
  });
});

exports.refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    res.status(StatusCodes.UNAUTHORIZED);
    throw new Error("Refresh token missing");
  }

  const sessions = await AuthSession.find({
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).populate("user");

  let matchedSession = null;

  for (const session of sessions) {
    const isMatch = await compareRefreshToken(
      refreshToken,
      session.refreshTokenHash
    );

    if (isMatch) {
      matchedSession = session;
      break;
    }
  }

  if (!matchedSession || !matchedSession.user) {
    clearAuthCookies(res);
    res.status(StatusCodes.UNAUTHORIZED);
    throw new Error("Invalid refresh token");
  }

  const user = matchedSession.user;

  if (user.isBlocked) {
    matchedSession.revokedAt = new Date();
    await matchedSession.save();

    clearAuthCookies(res);
    res.status(StatusCodes.FORBIDDEN);
    throw new Error("Your account has been blocked");
  }

  // Refresh token rotation
  matchedSession.revokedAt = new Date();
  await matchedSession.save();

  await createSessionAndSetCookies(req, res, user);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Session refreshed",
    data: sanitizeUser(user),
  });
});

exports.logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    const sessions = await AuthSession.find({
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    for (const session of sessions) {
      const isMatch = await compareRefreshToken(
        refreshToken,
        session.refreshTokenHash
      );

      if (isMatch) {
        session.revokedAt = new Date();
        await session.save();
        break;
      }
    }
  }

  clearAuthCookies(res);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Logged out successfully",
  });
});

exports.logoutAll = asyncHandler(async (req, res) => {
  await AuthSession.updateMany(
    {
      user: req.user._id,
      revokedAt: null,
    },
    {
      revokedAt: new Date(),
    }
  );

  clearAuthCookies(res);

  await auditLog({
    req,
    actor: req.user._id,
    action: "AUTH_LOGOUT_ALL",
    entity: "User",
    entityId: req.user._id,
  });

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Logged out from all devices",
  });
});

exports.me = asyncHandler(async (req, res) => {
  res.status(StatusCodes.OK).json({
    success: true,
    data: sanitizeUser(req.user),
  });
});

exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });

  res.status(StatusCodes.OK).json({
    success: true,
    count: users.length,
    data: users,
  });
});