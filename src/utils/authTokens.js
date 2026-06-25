// server/src/utils/authTokens.js

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const ACCESS_TOKEN_EXPIRES_IN = "7d";
const REFRESH_TOKEN_EXPIRES_DAYS = 7;

const isProduction = process.env.NODE_ENV === "production";

const accessCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
};

const clearCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
};

const signAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      type: "access",
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

const hashRefreshToken = async (token) => {
  return bcrypt.hash(token, 12);
};

const compareRefreshToken = async (token, hash) => {
  return bcrypt.compare(token, hash);
};

// const setAuthCookies = (res, accessToken, refreshToken) => {
//   res.cookie("accessToken", accessToken, accessCookieOptions);
//   res.cookie("refreshToken", refreshToken, refreshCookieOptions);
// };

// const clearAuthCookies = (res) => {
//   res.clearCookie("accessToken", clearCookieOptions);
//   res.clearCookie("refreshToken", clearCookieOptions);
// };

// src/utils/authTokens.js

const setAuthCookies = (res, accessToken, refreshToken) => {
  const cookieOptions = {
    httpOnly: true,
    secure: true,        // ✅ must be true (you're on HTTPS)
    sameSite: "None",   // ✅ must be "None" for cross-domain (Render → Go54)
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  res.cookie("accessToken", accessToken, cookieOptions);
  res.cookie("refreshToken", refreshToken, cookieOptions);
};

const clearAuthCookies = (res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "None",   // ✅ must match what was set — or clearing won't work
  };

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);
};

module.exports = {
  REFRESH_TOKEN_EXPIRES_DAYS,
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  compareRefreshToken,
  setAuthCookies,
  clearAuthCookies,
};