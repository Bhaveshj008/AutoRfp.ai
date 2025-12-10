const { Op } = require("sequelize");
const getModels = require("../utils/getModels");
const { databases } = require("../config/dbMap.json");
const {
  ensureAssociation,
  makeDynamicInclude,
} = require("../utils/dynamicAssociations");
const { sendEmail } = require("../utils/emailClient");
const { buildRfpInviteEmail } = require("../utils/emailTemplates");
const {
  buildRfpReplyTo,
  generateReplyToken,
} = require("../utils/emailRouting");
const { sendRfpInviteEmails } = require("../utils/emailSendingUtils");
const logger = require("../utils/logger");

/**
 * List inbound emails for an RFP with pagination
 */
const listEmailsService = async (data) => {
  const db = databases.RFP.DB_NAME;
  const { Emails, Vendors, sequelize } = getModels(db);
  const { rfp_id, page = 1, limit = 20 } = data;

  // Zod already guarantees types. Just normalize / cap for safety.
  const safePage = page > 0 ? page : 1;
  const safeLimit = limit > 0 && limit <= 100 ? limit : 20;
  const offset = (safePage - 1) * safeLimit;

  try {
    ensureAssociation(sequelize, {
      from: Emails,
      to: Vendors,
      as: "vendor",
      type: "belongsTo",
      foreignKey: "vendor_id",
    });

    const emails = await Emails.findAll({
      where: {
        rfp_id,
        direction: "inbound",
      },
      // Avoid pulling huge columns you don't need (e.g. raw headers, html body)
      attributes: [
        "id",
        "rfp_id",
        "vendor_id",
        "direction",
        "subject",
        "body_text",
        "sent_at",
        "received_at",
        "created_at",
      ],
      include: [
        makeDynamicInclude(sequelize, {
          from: Emails,
          to: Vendors,
          as: "vendor",
          type: "belongsTo",
          attributes: ["id", "name", "email"],
        }),
      ],
      order: [["created_at", "DESC"]],
      offset,
      limit: safeLimit,
    });

    return emails.map((e) => ({
      id: e.id,
      rfp_id: e.rfp_id,
      vendor_id: e.vendor_id,
      vendor_name: e.vendor?.name ?? null,
      vendor_email: e.vendor?.email ?? null,
      direction: e.direction,
      subject: e.subject,
      body_text: e.body_text,
      sent_at: e.sent_at,
      received_at: e.received_at,
      created_at: e.created_at,
    }));
  } catch (error) {
    logger.error("listEmailsService error", { error: error.message });
    throw error;
  }
};

/**
 * Fetch emails from IMAP inbox and store in database
 */
const fetchEmailsService = async () => {
  try {
    const { pollInboxForRfpEmails } = require("../workers/imapWorker");

    logger.info("Starting email fetch service");
    await pollInboxForRfpEmails();

    return {
      success: true,
      message: "Emails fetched and synced to database",
    };
  } catch (error) {
    logger.error("fetchEmailsService error", { error: error.message });
    throw error;
  }
};

/**
 * Send RFP invitations to vendors asynchronously
 * All complexity (retries, concurrency, DB updates) handled internally
 */
const sendRfpService = async (data) => {
  const db = databases.RFP.DB_NAME;
  const { sequelize, Rfps, Vendors, RfpVendors, Emails, RfpItems } =
    getModels(db);

  const requestId = `RFP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; // Request tracing

  // FIX #1: Validate BEFORE opening transaction to avoid connection leak
  const { rfp_id, vendor_ids } = data;
  
  if (!Array.isArray(vendor_ids) || vendor_ids.length === 0) {
    return { error: "vendor_ids must be a non-empty array" };
  }

  const t = await sequelize.transaction();

  try {
    logger.info(`[${requestId}] Starting SendRfp`, { rfp_id, vendor_count: vendor_ids.length });

    // Fetch and lock RFP row (for consistency)
    const rfp = await Rfps.findOne({
      where: { id: rfp_id },
      transaction: t,
      lock: true, // Prevents concurrent modifications
    });

    if (!rfp) {
      await t.rollback();
      logger.warn(`[${requestId}] RFP not found`, { rfp_id });
      return { error: "RFP not found" };
    }

    if (rfp.status === "closed") {
      await t.rollback();
      logger.warn(`[${requestId}] RFP already closed`, { rfp_id });
      return { error: "RFP is already closed" };
    }

    logger.debug(`[${requestId}] RFP loaded`, { status: rfp.status, title: rfp.title });

    // Load RFP items for email body
    const rfpItems = await RfpItems.findAll({
      where: { rfp_id },
      order: [
        ["sort_order", "ASC"],
        ["created_at", "ASC"],
      ],
      transaction: t,
    });

    logger.debug(`[${requestId}] RFP items loaded`, { count: rfpItems.length });

    // Validate vendors exist
    const vendors = await Vendors.findAll({
      where: { id: { [Op.in]: vendor_ids } },
      transaction: t,
    });

    if (!vendors.length) {
      await t.rollback();
      logger.warn(`[${requestId}] No valid vendors found`, { requested: vendor_ids.length });
      return { error: "No valid vendors found for provided vendor_ids" };
    }

    if (vendors.length < vendor_ids.length) {
      const found = vendors.map((v) => v.id);
      const missing = vendor_ids.filter((id) => !found.includes(id));
      logger.warn(`[${requestId}] Some vendors not found`, { missing: missing.length });
    }

    logger.debug(`[${requestId}] Vendors loaded`, { count: vendors.length });

    // Preload existing mappings to prevent duplicate creates
    const existingMappings = await RfpVendors.findAll({
      where: {
        rfp_id,
        vendor_id: { [Op.in]: vendors.map((v) => v.id) },
      },
      transaction: t,
      lock: true, // Prevent race conditions
    });

    const mappingByVendorId = new Map(
      existingMappings.map((m) => [m.vendor_id, m])
    );

    let invitedCount = 0;
    const emailsToSend = [];

    for (const vendor of vendors) {
      let mapping = mappingByVendorId.get(vendor.id);

      // FIX #4: Validate vendor email before queueing
      if (!vendor.email || typeof vendor.email !== "string" || !vendor.email.includes("@")) {
        logger.debug(`[${requestId}] Skipping vendor (invalid email)`, { vendor_id: vendor.id, name: vendor.name });
        continue;
      }

      // Create mapping if doesn't exist
      if (!mapping) {
        mapping = await RfpVendors.create(
          {
            rfp_id,
            vendor_id: vendor.id,
            invite_status: "pending",
            invited_at: new Date(),
          },
          { transaction: t }
        );
        mappingByVendorId.set(vendor.id, mapping);
        logger.debug(
          `[${requestId}] Created RfpVendors mapping`,
          { vendor_id: vendor.id, name: vendor.name }
        );
      } else {
        // FIX #2: Skip if already sent - don't resend
        if (mapping.invite_status === "sent") {
          logger.debug(
            `[${requestId}] Skipping vendor (already sent)`,
            { vendor_id: vendor.id, name: vendor.name }
          );
          continue;
        }

          logger.debug(
            `[${requestId}] Reusing RfpVendors mapping`,
            { vendor_id: vendor.id, name: vendor.name, status: mapping.invite_status }
          );
      }

      // Generate or reuse reply token
      if (!mapping.reply_token) {
        const token = generateReplyToken();
        mapping.reply_token = token;
        await mapping.save({ transaction: t });
        logger.debug(`[${requestId}] Generated reply token`, { vendor_id: vendor.id });
      }

      // Build email content
      const { subject, text, html } = buildRfpInviteEmail({
        rfp,
        vendor,
        items: rfpItems,
      });

      const replyTo = buildRfpReplyTo({
        baseEmail: process.env.GMAIL_USER,
        replyToken: mapping.reply_token,
      });

      // Queue email for async sending
      emailsToSend.push({
        to: vendor.email,
        subject,
        text,
        html,
        replyTo,
        rfp_id,
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        mapping_id: mapping.id,
      });

      // Only update DB if status is NOT already sent (idempotent)
      // This prevents re-sending already-sent emails
      if (mapping.invite_status !== "sent") {
        mapping.invite_status = "pending";
        mapping.last_email_id = null;
        await mapping.save({ transaction: t });
      }

      invitedCount += 1;
    }

    logger.info(`[${requestId}] Prepared vendors for invitation`, { count: invitedCount });

    if (invitedCount === 0) {
      logger.warn(
        `[${requestId}] No vendors prepared for invitation (all already sent or invalid emails)`
      );
    }

    // Update RFP status if moving from draft to sent
    if (invitedCount > 0 && rfp.status === "draft") {
      await rfp.update({ status: "sent" }, { transaction: t });
      logger.debug(`[${requestId}] RFP status updated`, { from: "draft", to: "sent" });
    }

    // Commit transaction - DB state locked in
    await t.commit();
    logger.debug(`[${requestId}] Transaction committed`);

    // Async non-blocking email sending with bounded concurrency
    // All complexity (retries, concurrency, DB updates) hidden in sendRfpInviteEmails
    if (emailsToSend.length > 0) {
      setImmediate(async () => {
        try {
          await sendRfpInviteEmails({
            emailsToSend,
            Emails,
            RfpVendors,
            requestId,
          });
        } catch (err) {
          logger.error(`[${requestId}] Error in async email send`, { error: err.message });
        }
      });
    }

    logger.info(`[${requestId}] SendRfp response sent`, { invited_count: invitedCount });

    return {
      rfp_id,
      invited_count: invitedCount,
      request_id: requestId, // Return for client to track in logs
    };
  } catch (error) {
    await t.rollback();
    logger.warn(`[${requestId}] SendRfp failed (rolled back)`, { error: error.message });
    throw error;
  }
};

module.exports = {
  listEmailsService,
  fetchEmailsService,
  sendRfpService,
};
