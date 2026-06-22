// server/src/utils/audit.js

const AuditLog = require("../models/AuditLog");

const auditLog = async ({
  req,
  actor = null,
  action,
  entity,
  entityId = null,
  metadata = {},
}) => {
  try {
    await AuditLog.create({
      actor,
      action,
      entity,
      entityId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata,
    });
  } catch (error) {
    console.error("Audit log failed:", error.message);
  }
};

module.exports = auditLog;