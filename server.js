require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./app");
const connectDB = require("./src/config/db");
const createInitialAdmin = require("./src/utils/createInitialAdmin");
const autoSubmitExpired = require("./src/utils/cbt/autoSubmitExpired");

const PORT = process.env.PORT || 3001;

let server;
let autoSubmitInterval;

const startServer = async () => {
  try {
    await connectDB();

    // Create initial master admin after DB connection is ready
    await createInitialAdmin();

    server = app.listen(PORT, () => {
      console.log(`🚀 API running on port ${PORT}`);
    });

    autoSubmitExpired();
    autoSubmitInterval = setInterval(autoSubmitExpired, 60 * 1000);
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  if (autoSubmitInterval) {
    clearInterval(autoSubmitInterval);
  }

  if (server) {
    server.close(async () => {
      await mongoose.connection.close();
      console.log("✅ Server and database connection closed.");
      process.exit(0);
    });
  } else {
    await mongoose.connection.close();
    process.exit(0);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
  shutdown("unhandledRejection");
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

startServer();