// const jwt = require("jsonwebtoken");
// const User = require("../models/User");

// const protect = async (req, res, next) => {
//   try {
//     const token = req.cookies?.jwt;
//     if (!token) return res.status(401).json({ message: "Not authorized, no token" });

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     const user = await User.findById(decoded.id).select("-password");
//     if (!user) return res.status(401).json({ message: "User not found" });

//     req.user = user; // <-- attach full user here
//     next();
//   } catch (err) {
//     console.error("Auth middleware error:", err);
//     res.status(401).json({ message: "Not authorized, token failed" });
//   }
// };

// // --- Restrict access to specific roles ---
// const restrictToRoles = (...roles) => {
//   return (req, res, next) => {
//     if (!req.user) {
//       return res.status(401).json({ message: "Not authorized" });
//     }

//     if (!roles.includes(req.user.role)) {
//       return res
//         .status(403)
//         .json({ message: "Access forbidden: insufficient permissions" });
//     }

//     next();
//   };
// };

// module.exports = { protect, restrictToRoles };


// const jwt = require("jsonwebtoken");
// const { StatusCodes } = require("http-status-codes");

// const User = require("../models/User");
// const asyncHandler = require("./asyncHandler");

// const protect = asyncHandler(async (req, res, next) => {
//   const token = req.cookies?.accessToken;

//   if (!token) {
//     res.status(StatusCodes.UNAUTHORIZED);
//     throw new Error("Not authorized, no access token");
//   }

//   const decoded = jwt.verify(token, process.env.JWT_SECRET);

//   if (decoded.type !== "access") {
//     res.status(StatusCodes.UNAUTHORIZED);
//     throw new Error("Invalid token type");
//   }

//   const user = await User.findById(decoded.id);

//   if (!user) {
//     res.status(StatusCodes.UNAUTHORIZED);
//     throw new Error("User not found");
//   }

//   if (user.isBlocked) {
//     res.status(StatusCodes.FORBIDDEN);
//     throw new Error("Your account has been blocked");
//   }

//   req.user = user;

//   next();
// });

// const restrictToRoles = (...roles) => {
//   return (req, res, next) => {
//     if (!req.user) {
//       res.status(StatusCodes.UNAUTHORIZED);
//       throw new Error("Not authorized");
//     }

//     if (!roles.includes(req.user.role)) {
//       res.status(StatusCodes.FORBIDDEN);
//       throw new Error("Access forbidden: insufficient permissions");
//     }

//     next();
//   };
// };

// module.exports = {
//   protect,
//   restrictToRoles,
// };

const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");

const User = require("../models/User");
const asyncHandler = require("./asyncHandler");

const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check Authorization header first (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  // Fallback to cookie (keeps backward compatibility)
  if (!token) {
    token = req.cookies?.accessToken;
  }

  if (!token) {
    res.status(StatusCodes.UNAUTHORIZED);
    throw new Error("Not authorized, no access token");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (decoded.type !== "access") {
    res.status(StatusCodes.UNAUTHORIZED);
    throw new Error("Invalid token type");
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    res.status(StatusCodes.UNAUTHORIZED);
    throw new Error("User not found");
  }

  if (user.isBlocked) {
    res.status(StatusCodes.FORBIDDEN);
    throw new Error("Your account has been blocked");
  }

  req.user = user;

  next();
});

const restrictToRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Not authorized");
    }

    if (!roles.includes(req.user.role)) {
      res.status(StatusCodes.FORBIDDEN);
      throw new Error("Access forbidden: insufficient permissions");
    }

    next();
  };
};

module.exports = {
  protect,
  restrictToRoles,
};