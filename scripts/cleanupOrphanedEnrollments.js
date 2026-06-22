require("dotenv").config();

const mongoose = require("mongoose");
const Enrollment = require("../src/models/Enrollment");
const Student = require("../src/models/Student");

const cleanupOrphanedEnrollments = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  console.log("Connected to MongoDB");

  const enrollments = await Enrollment.find().select("_id studentId");

  const orphanedEnrollmentIds = [];

  for (const enrollment of enrollments) {
    const studentExists = await Student.exists({
      _id: enrollment.studentId,
    });

    if (!studentExists) {
      orphanedEnrollmentIds.push(enrollment._id);
    }
  }

  console.log(`Found ${orphanedEnrollmentIds.length} orphaned enrollments`);

  if (orphanedEnrollmentIds.length > 0) {
    const result = await Enrollment.deleteMany({
      _id: { $in: orphanedEnrollmentIds },
    });

    console.log(`Deleted ${result.deletedCount} orphaned enrollments`);
  }

  await mongoose.disconnect();
  console.log("Done");
};

cleanupOrphanedEnrollments().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});