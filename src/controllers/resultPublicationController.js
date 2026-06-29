// server/src/controllers/resultPublicationController.js
const ResultPublication = require("../models/ResultPublication");

exports.publishResult = async (req, res) => {
  try {
    const { sessionId, termId } = req.body;

    if (!sessionId || !termId) {
      return res.status(400).json({
        success: false,
        message: "sessionId and termId are required",
      });
    }

    const publication = await ResultPublication.findOneAndUpdate(
      { sessionId, termId },
      {
        sessionId,
        termId,
        isPublished: true,
        publishedBy: req.user._id,
        publishedAt: new Date(),
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Result published successfully",
      data: publication,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.unpublishResult = async (req, res) => {
  try {
    const { sessionId, termId } = req.body;

    if (!sessionId || !termId) {
      return res.status(400).json({
        success: false,
        message: "sessionId and termId are required",
      });
    }

    const publication = await ResultPublication.findOneAndUpdate(
      { sessionId, termId },
      {
        sessionId,
        termId,
        isPublished: false,
        publishedBy: null,
        publishedAt: null,
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Result unpublished successfully",
      data: publication,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPublicationStatus = async (req, res) => {
  try {
    const { sessionId, termId } = req.query;

    const publication = await ResultPublication.findOne({
      sessionId,
      termId,
    });

    res.status(200).json({
      success: true,
      data: {
        isPublished: !!publication?.isPublished,
        publication,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};