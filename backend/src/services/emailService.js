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
    console.error(" Error in listEmailsService:", error);
    throw error;
  }
};

/**
 * Fetch emails from IMAP inbox and store in database
 */
const fetchEmailsService = async () => {
  try {
    const { pollInboxForRfpEmails } = require("../workers/imapWorker");

    console.log("[INFO] Starting email fetch service...");
    await pollInboxForRfpEmails();

    return {
      success: true,
      message: "Emails fetched and synced to database",
    };
  } catch (error) {
    console.error(" Error in fetchEmailsService:", error);
    throw error;
  }
};

/**
 * Send RFP invitations to vendors asynchronously
 */
// Small utility to process items with bounded concurrency
async function processWithConcurrency(items, concurrency, handler) {
  let index = 0;

  async function worker() {
    while (true) {
      const current = index++;
      if (current >= items.length) break;

      const item = items[current];
      try {
        await handler(item);
      } catch (err) {
        // handler should already log errors; don't rethrow to avoid killing other workers
        console.error("Error in concurrency worker:", err);
      }
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  const workers = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
}

// Sends one invite + records email + updates mapping
async function sendSingleInvite({ Emails, RfpVendors, emailData }) {
  const { to, subject, text, html, replyTo, rfp_id, vendor_id, mapping_id } =
    emailData;

  try {
    const sendResult = await sendEmail({
      to,
      subject,
      text,
      html,
      replyTo,
    });

    const email = await Emails.create({
      rfp_id,
      vendor_id,
      direction: "outbound",
      subject,
      body_text: text,
      raw_payload: null,
      message_id: sendResult.messageId,
      sent_at: new Date(),
      received_at: null,
    });

    await RfpVendors.update(
      {
        invite_status: "sent",
        last_email_id: email.id,
      },
      { where: { id: mapping_id } }
    );

    console.log(` Invite email sent to ${to}`);
  } catch (err) {
    console.error(` Failed to send invite email to ${to}:`, err.message);

    // Mark mapping as failed but don’t throw to keep other sends going
    await RfpVendors.update(
      { invite_status: "failed" },
      { where: { id: mapping_id } }
    );
  }
}

const sendRfpService = async (data) => {
  const db = databases.RFP.DB_NAME;
  const { sequelize, Rfps, Vendors, RfpVendors, Emails, RfpItems } =
    getModels(db);

  const t = await sequelize.transaction();

  try {
    const { rfp_id, vendor_ids } = data;

    const rfp = await Rfps.findOne({ where: { id: rfp_id }, transaction: t });
    if (!rfp) {
      await t.rollback();
      return { error: "RFP not found" };
    }

    if (rfp.status === "closed") {
      await t.rollback();
      return { error: "RFP is already closed" };
    }

    // Load requested items for the email body
    const rfpItems = await RfpItems.findAll({
      where: { rfp_id },
      order: [
        ["sort_order", "ASC"],
        ["created_at", "ASC"],
      ],
      transaction: t,
    });

    const vendors = await Vendors.findAll({
      where: { id: { [Op.in]: vendor_ids } },
      transaction: t,
    });

    if (!vendors.length) {
      await t.rollback();
      return { error: "No valid vendors found for provided vendor_ids" };
    }

    // Preload existing mappings in one go
    const existingMappings = await RfpVendors.findAll({
      where: {
        rfp_id,
        vendor_id: { [Op.in]: vendors.map((v) => v.id) },
      },
      transaction: t,
    });

    const mappingByVendorId = new Map(
      existingMappings.map((m) => [m.vendor_id, m])
    );

    let invitedCount = 0;
    const emailsToSend = [];

    for (const vendor of vendors) {
      let mapping = mappingByVendorId.get(vendor.id);

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
      }

      if (!mapping.reply_token) {
        const token = generateReplyToken();
        mapping.reply_token = token;
        await mapping.save({ transaction: t });
      }

      const { subject, text, html } = buildRfpInviteEmail({
        rfp,
        vendor,
        items: rfpItems,
      });

      const replyTo = buildRfpReplyTo({
        baseEmail: process.env.GMAIL_USER,
        replyToken: mapping.reply_token,
      });

      // Keep all data we need for async sending
      emailsToSend.push({
        to: vendor.email,
        subject,
        text,
        html,
        replyTo,
        rfp_id,
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        mapping_id: mapping.id, // critical: avoid extra findOne later
      });

      // Mark as pending before we actually send
      mapping.invite_status = "pending";
      mapping.last_email_id = null;
      await mapping.save({ transaction: t });

      invitedCount += 1;
    }

    if (invitedCount > 0 && rfp.status === "draft") {
      await rfp.update({ status: "sent" }, { transaction: t });
    }

    await t.commit();

    // Async non-blocking email sending with bounded concurrency
    if (emailsToSend.length > 0) {
      setImmediate(() => {
        // tune concurrency based on your provider / infra
        processWithConcurrency(emailsToSend, 5, (emailData) =>
          sendSingleInvite({ Emails, RfpVendors, emailData })
        ).catch((err) => {
          console.error(" Error in bulk invite sending:", err);
        });
      });
    }

    return {
      rfp_id,
      invited_count: invitedCount,
    };
  } catch (error) {
    await t.rollback();
    console.error(" Error in sendRfpService:", error);
    throw error;
  }
};

module.exports = {
  listEmailsService,
  fetchEmailsService,
  sendRfpService,
};
