
// src/controllers/lessonController.js
const path = require("path");
const cloudinary = require("cloudinary").v2;

const Lesson = require("../models/Lesson");
const Term = require("../models/Term");

const isAdminRole = (role) =>
  ["admin", "super_admin", "master_admin", "principal"].includes(role);

const canModifyLesson = (req, lesson) => {
  if (isAdminRole(req.user.role)) return true;
  return lesson.createdBy?.toString() === req.user._id.toString();
};

const getCloudinaryResourceType = (file) => {
  const ext = path.extname(file.originalname || "").toLowerCase();

  const documentExtensions = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];
  const imageExtensions = [".jpg", ".jpeg", ".png", ".webp"];

  if (documentExtensions.includes(ext)) return "raw";
  if (imageExtensions.includes(ext)) return "image";

  return "raw";
};

const uploadToCloudinary = (fileBuffer, file, folder = "lessons") => {
  const resourceType = getCloudinaryResourceType(file);

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `school-app/${folder}`,
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) return reject(error);

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
          });
        }
      )
      .end(fileBuffer);
  });
};

const deleteCloudinaryResource = async (publicId, resourceType = "raw") => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
  } catch (error) {
    console.warn("Cloudinary delete failed:", error.message);
  }
};

const parseJsonArray = (value) => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// ===============================
// CREATE LESSON
// ===============================
exports.createLesson = async (req, res) => {
  try {
    const {
      title,
      description,
      week,
      sessionId,
      termId,
      classId,
      armId,
      subjectId,
      status,
      textResources,
      videoResources,
    } = req.body;

    if (!title || !sessionId || !termId || !classId || !subjectId) {
      return res.status(400).json({
        success: false,
        message: "Title, session, term, class and subject are required",
      });
    }

    const resources = [];

    parseJsonArray(textResources).forEach((item) => {
      if (item.title && item.content) {
        resources.push({
          type: "text",
          title: item.title,
          description: item.description || "",
          content: item.content,
        });
      }
    });

    parseJsonArray(videoResources).forEach((item) => {
      if (item.title && item.videoUrl) {
        resources.push({
          type: "video_link",
          title: item.title,
          description: item.description || "",
          videoUrl: item.videoUrl,
        });
      }
    });

    if (req.files?.length) {
      for (const file of req.files) {
        const uploaded = await uploadToCloudinary(file.buffer, file);

        resources.push({
          type: "document",
          title: file.originalname,
          fileUrl: uploaded.url,
          filePublicId: uploaded.publicId,
          fileName: file.originalname,
          fileMimeType: file.mimetype,
          fileResourceType: uploaded.resourceType,
        });
      }
    }

    let termName = req.body.termName || "";

if (!termName && termId) {
  const term = await Term.findById(termId).select("name");
  termName = term?.name || "";
}

    const lesson = await Lesson.create({
      title: title.trim(),
      description: description || "",
      week: Number(week || 1),
      sessionId,
      termId,
      termName,
      classId,
      armId: armId || null,
      subjectId,
      resources,
      status: status || "published",
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Lesson created successfully",
      data: lesson,
    });
  } catch (error) {
    console.error("Create lesson error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// GET STAFF LESSONS
// ===============================
exports.getLessons = async (req, res) => {
  try {
    const { sessionId, termId, classId, armId, subjectId, week, status } =
      req.query;

    const query = {};

    if (!isAdminRole(req.user.role)) {
      query.createdBy = req.user._id;
    }

    if (sessionId) query.sessionId = sessionId;
    if (termId) query.termId = termId;
    if (classId) query.classId = classId;
    if (armId) query.armId = armId;
    if (subjectId) query.subjectId = subjectId;
    if (week) query.week = Number(week);
    if (status) query.status = status;

    const lessons = await Lesson.find(query)
      .populate("sessionId", "name")
      .populate("termId", "name")
      .populate("classId", "name")
      .populate("armId", "name")
      .populate("subjectId", "name")
      .populate("createdBy", "name role")
      .sort({ week: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: lessons.length,
      data: lessons,
    });
  } catch (error) {
    console.error("Get lessons error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// GET SINGLE STAFF LESSON
// ===============================
exports.getLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id)
      .populate("sessionId", "name")
      .populate("termId", "name")
      .populate("classId", "name")
      .populate("armId", "name")
      .populate("subjectId", "name")
      .populate("createdBy", "name role");

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    if (!canModifyLesson(req, lesson)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this lesson",
      });
    }

    res.status(200).json({
      success: true,
      data: lesson,
    });
  } catch (error) {
    console.error("Get lesson error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// UPDATE LESSON BASIC INFO
// ===============================
exports.updateLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    if (!canModifyLesson(req, lesson)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to edit this lesson",
      });
    }

    const fields = [
      "title",
      "description",
      "week",
      "sessionId",
      "termId",
      "classId",
      "armId",
      "subjectId",
      "status",
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        lesson[field] = req.body[field] || null;
      }
    });

    if (req.body.title) {
      lesson.title = req.body.title.trim();
    }

    if (req.body.week !== undefined) {
      lesson.week = Number(req.body.week || 1);
    }

    await lesson.save();

    res.status(200).json({
      success: true,
      message: "Lesson updated successfully",
      data: lesson,
    });
  } catch (error) {
    console.error("Update lesson error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// ADD RESOURCES
// ===============================
exports.addLessonResources = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    if (!canModifyLesson(req, lesson)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this lesson",
      });
    }

    const { textResources, videoResources } = req.body;
    const resources = [];

    parseJsonArray(textResources).forEach((item) => {
      if (item.title && item.content) {
        resources.push({
          type: "text",
          title: item.title,
          description: item.description || "",
          content: item.content,
        });
      }
    });

    parseJsonArray(videoResources).forEach((item) => {
      if (item.title && item.videoUrl) {
        resources.push({
          type: "video_link",
          title: item.title,
          description: item.description || "",
          videoUrl: item.videoUrl,
        });
      }
    });

    if (req.files?.length) {
      for (const file of req.files) {
        const uploaded = await uploadToCloudinary(file.buffer, file);

        resources.push({
          type: "document",
          title: file.originalname,
          fileUrl: uploaded.url,
          filePublicId: uploaded.publicId,
          fileName: file.originalname,
          fileMimeType: file.mimetype,
          fileResourceType: uploaded.resourceType,
        });
      }
    }

    lesson.resources.push(...resources);
    await lesson.save();

    res.status(200).json({
      success: true,
      message: "Resources added successfully",
      data: lesson,
    });
  } catch (error) {
    console.error("Add resources error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// REMOVE RESOURCE
// ===============================
exports.removeLessonResource = async (req, res) => {
  try {
    const { lessonId, resourceId } = req.params;

    const lesson = await Lesson.findById(lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    if (!canModifyLesson(req, lesson)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this lesson",
      });
    }

    const resource = lesson.resources.id(resourceId);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    if (resource.type === "document") {
      await deleteCloudinaryResource(
        resource.filePublicId,
        resource.fileResourceType || "raw"
      );
    }

    resource.deleteOne();
    await lesson.save();

    res.status(200).json({
      success: true,
      message: "Resource removed successfully",
      data: lesson,
    });
  } catch (error) {
    console.error("Remove resource error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// UPDATE STATUS
// ===============================
exports.updateLessonStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["draft", "published", "archived"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lesson status",
      });
    }

    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    if (!canModifyLesson(req, lesson)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this lesson",
      });
    }

    lesson.status = status;
    await lesson.save();

    res.status(200).json({
      success: true,
      message: "Lesson status updated successfully",
      data: lesson,
    });
  } catch (error) {
    console.error("Update lesson status error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// DELETE LESSON
// ===============================
exports.deleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    if (!canModifyLesson(req, lesson)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this lesson",
      });
    }

    for (const resource of lesson.resources || []) {
      if (resource.type === "document") {
        await deleteCloudinaryResource(
          resource.filePublicId,
          resource.fileResourceType || "raw"
        );
      }
    }

    await lesson.deleteOne();

    res.status(200).json({
      success: true,
      message: "Lesson deleted successfully",
    });
  } catch (error) {
    console.error("Delete lesson error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// STUDENT LESSON LIBRARY
// ===============================
// exports.getStudentLessons = async (req, res) => {
//   try {
//     const { classId, subjectId, termId, week } = req.query;

//     const query = {
//       status: "published",
//     };

//     if (classId) query.classId = classId;
//     if (subjectId) query.subjectId = subjectId;
//     if (termId) query.termId = termId;
//     if (week) query.week = Number(week);

//     const lessons = await Lesson.find(query)
//       .populate("sessionId", "name")
//       .populate("termId", "name")
//       .populate("classId", "name")
//       .populate("armId", "name")
//       .populate("subjectId", "name")
//       .sort({ classId: 1, subjectId: 1, termId: 1, week: 1, createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       count: lessons.length,
//       data: lessons,
//     });
//   } catch (error) {
//     console.error("Get student lessons error:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

exports.getStudentLessons = async (req, res) => {
  try {
    const { classId, subjectId, termName, week } = req.query;

    const query = {
      status: "published",
    };

    if (classId) query.classId = classId;
    if (subjectId) query.subjectId = subjectId;
    if (termName) query.termName = termName;
    if (week) query.week = Number(week);

    const lessons = await Lesson.find(query)
      .populate("sessionId", "name")
      .populate("termId", "name")
      .populate("classId", "name")
      .populate("armId", "name")
      .populate("subjectId", "name")
      .sort({ classId: 1, subjectId: 1, termName: 1, week: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: lessons.length,
      data: lessons,
    });
  } catch (error) {
    console.error("Get student lessons error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// STUDENT SINGLE LESSON
// ===============================
exports.getStudentLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findOne({
      _id: req.params.id,
      status: "published",
    })
      .populate("sessionId", "name")
      .populate("termId", "name")
      .populate("classId", "name")
      .populate("armId", "name")
      .populate("subjectId", "name");

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    res.status(200).json({
      success: true,
      data: lesson,
    });
  } catch (error) {
    console.error("Get student lesson error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// STUDENT DOWNLOAD RESOURCE
// ===============================
exports.downloadLessonResource = async (req, res) => {
  try {
    const { lessonId, resourceId } = req.params;

    const lesson = await Lesson.findOne({
      _id: lessonId,
      status: "published",
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    const resource = lesson.resources.id(resourceId);

    if (!resource || !resource.fileUrl) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        fileUrl: resource.fileUrl,
        fileName: resource.fileName || "lesson-document",
        fileMimeType: resource.fileMimeType || "application/octet-stream",
        fileResourceType: resource.fileResourceType || "raw",
      },
    });
  } catch (error) {
    console.error("Download lesson resource error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};