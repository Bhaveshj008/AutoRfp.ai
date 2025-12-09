// src/workers/imapWorker.js
const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const replyParser = require("node-email-reply-parser");
const getModels = require("../utils/getModels");
const { databases } = require("../config/dbMap.json");
const { parseRfpPlusAddress } = require("../utils/emailRouting");

let lastProcessedUid = 0;

async function pollInboxForRfpEmails() {
  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
    logger: false,
  });

  client.on("error", (err) => {
    console.error("[ERROR] IMAP client error:", err);
  });

  const db = databases.RFP.DB_NAME;
  const { Emails, Vendors, Rfps, RfpVendors } = getModels(db);

  try {
    console.log("[INFO] Connecting to IMAP...");
    await client.connect();

    const lock = await client.getMailboxLock("INBOX");
    try {
      const total = client.mailbox.exists || 0;
      if (!total) {
        console.log("[INFO] INBOX empty - resetting cache");
        lastProcessedUid = 0; // Smart reset when inbox is empty
        return;
      }

      const fromSeq = Math.max(1, lastProcessedUid + 1);
      console.log(`[INFO] Fetching messages from UID ${fromSeq} to ${total}`);

      const messages = [];
      for await (const message of client.fetch(`${fromSeq}:*`, {
        uid: true,
        envelope: true,
        internalDate: true,
        flags: true,
        source: true,
      })) {
        messages.push(message);
      }

      if (messages.length === 0) {
        console.log("[INFO] No new messages since last poll");
        return;
      }

      console.log(`[INFO] Retrieved ${messages.length} new messages`);

      const messageIds = [];
      const replyTokens = new Set();
      const messageMap = new Map();
      let maxUid = lastProcessedUid;

      for (const message of messages) {
        const { envelope, uid } = message;
        const messageId = envelope?.messageId;
        
        if (messageId) {
          messageIds.push(messageId);
        }

        if (uid > maxUid) {
          maxUid = uid;
        }

        const toList = envelope?.to?.map((addr) => addr.address) || [];
        let routing = null;
        for (const addr of toList) {
          routing = parseRfpPlusAddress(addr);
          if (routing) {
            replyTokens.add(routing.replyToken);
            break;
          }
        }

        messageMap.set(uid, {
          message,
          messageId,
          subject: envelope?.subject || "(no subject)",
          fromAddr: envelope?.from?.[0]?.address?.toLowerCase() || null,
          toList,
          routing,
          receivedAt: message.internalDate || new Date(),
        });
      }

      console.log("[INFO] Batch querying database...");

      const existingEmails = messageIds.length > 0
        ? await Emails.findAll({
            where: { message_id: messageIds },
            attributes: ['message_id'],
            raw: true,
          })
        : [];
      const existingSet = new Set(existingEmails.map(e => e.message_id));

      const mappings = replyTokens.size > 0
        ? await RfpVendors.findAll({
            where: { reply_token: Array.from(replyTokens) },
            raw: true,
          })
        : [];
      const tokenMap = new Map(mappings.map(m => [m.reply_token, m]));

      const vendorIds = [...new Set(mappings.map(m => m.vendor_id))];
      const rfpIds = [...new Set(mappings.map(m => m.rfp_id))];

      const [vendors, rfps] = await Promise.all([
        vendorIds.length > 0
          ? Vendors.findAll({
              where: { id: vendorIds },
              raw: true,
            })
          : [],
        rfpIds.length > 0
          ? Rfps.findAll({
              where: { id: rfpIds },
              raw: true,
            })
          : [],
      ]);

      const vendorMap = new Map(vendors.map(v => [v.id, v]));
      const rfpMap = new Map(rfps.map(r => [r.id, r]));

      console.log(`[INFO] Found ${mappings.length} mappings, ${vendors.length} vendors, ${rfps.length} RFPs`);

      const emailsToInsert = [];
      let processedCount = 0;
      let skippedCount = 0;

      for (const [uid, data] of messageMap) {
        const { message, messageId, subject, fromAddr, routing, receivedAt } = data;

        if (!routing) {
          skippedCount++;
          continue;
        }

        const { replyToken } = routing;
        console.log("Routing token:", replyToken);

        if (messageId && existingSet.has(messageId)) {
          console.log("[INFO] Already stored:", messageId);
          skippedCount++;
          continue;
        }

        const mapping = tokenMap.get(replyToken);
        if (!mapping) {
          console.log(`[WARN] No mapping for token=${replyToken}`);
          skippedCount++;
          continue;
        }

        const vendor = vendorMap.get(mapping.vendor_id);
        const rfp = rfpMap.get(mapping.rfp_id);

        if (!vendor || !rfp) {
          console.log(`[WARN] Vendor or RFP missing for token=${replyToken}`);
          skippedCount++;
          continue;
        }

        if (fromAddr && vendor.email &&
            fromAddr !== vendor.email.toLowerCase()) {
          console.log(`[WARN] From (${fromAddr}) != vendor (${vendor.email})`);
          skippedCount++;
          continue;
        }

        let bodyText = "";
        let bodyHtml = null;

        try {
          if (message.source) {
            const parsed = await simpleParser(message.source);
            const rawText = (parsed.text || "").trim();
            
            const email = replyParser(rawText);
            bodyText = email.getVisibleText({ aggressive: true }).trim();
            bodyHtml = parsed.html || null;
            
            console.log(`[DEBUG] Cleaned: ${rawText.length} -> ${bodyText.length} chars`);
          } else {
            console.warn("[WARN] No source buffer for UID:", uid);
          }
        } catch (err) {
          console.error("[ERROR] Failed to parse MIME:", uid, err.message);
          skippedCount++;
          continue;
        }

        emailsToInsert.push({
          rfp_id: rfp.id,
          vendor_id: vendor.id,
          direction: "inbound",
          subject,
          body_text: bodyText,
          body_html: bodyHtml,
          message_id: messageId,
          sent_at: null,
          received_at: receivedAt,
        });

        processedCount++;
        console.log(`[INFO] Prepared email: rfp=${rfp.id}, vendor=${vendor.id}`);
      }

      if (emailsToInsert.length > 0) {
        try {
          await Emails.bulkCreate(emailsToInsert, {
            ignoreDuplicates: true,
          });
          console.log(`[INFO] Inserted ${emailsToInsert.length} emails`);
          // Update cache only after successful insertion
          lastProcessedUid = maxUid;
          console.log(`[INFO] Updated cache: lastProcessedUid = ${lastProcessedUid}`);
        } catch (err) {
          console.error("[ERROR] Bulk insert failed:", err.message);
          for (const email of emailsToInsert) {
            try {
              await Emails.create(email);
            } catch (innerErr) {
              console.error("[ERROR] Failed to insert single email:", innerErr.message);
            }
          }
          // Update cache after individual inserts too
          lastProcessedUid = maxUid;
          console.log(`[INFO] Updated cache: lastProcessedUid = ${lastProcessedUid}`);
        }
      }

      console.log(`[INFO] Summary: ${processedCount} processed, ${skippedCount} skipped`);

    } finally {
      lock.release();
    }

    await client.logout();
    console.log("[INFO] IMAP polling finished.");
  } catch (err) {
    console.error("[ERROR] IMAP polling failed:", err);
    throw err;
  }
}

module.exports = {
  pollInboxForRfpEmails,
  resetLastProcessedUid,
};

function resetLastProcessedUid() {
  lastProcessedUid = 0;
  console.log("[INFO] Cache reset: lastProcessedUid = 0");
}