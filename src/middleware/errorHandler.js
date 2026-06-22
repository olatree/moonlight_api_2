// const { StatusCodes } = require('http-status-codes');


// exports.notFound = (req, res, next) => {
// res.status(StatusCodes.NOT_FOUND).json({ message: 'Route not found' });
// };


// exports.errorHandler = (err, req, res, next) => {
// console.error(err);
// const status = err.status || StatusCodes.BAD_REQUEST;
// res.status(status).json({ message: err.message || 'Something went wrong' });
// };


const { StatusCodes } = require("http-status-codes");

exports.notFound = (req, res, next) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
};

exports.errorHandler = (err, req, res, next) => {
  console.error(err);

  const statusCode =
    err.statusCode || err.status || StatusCodes.INTERNAL_SERVER_ERROR;

  res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message || "Something went wrong",
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};