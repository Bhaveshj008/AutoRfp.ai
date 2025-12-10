/**
 * Generic email sending utilities with retry logic and error handling
 * Used for RFP invites, award notifications, and rejection notifications
 */

const { sendEmail } = require("./emailClient");
const logger = require("./logger");

/**
 * Send email with retry logic, error classification, and comprehensive logging
 * 
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} params.text - Email body text
 * @param {string} params.html - Email body HTML (optional)
 * @param {string} params.replyTo - Reply-to address (optional)
 * @param {number} params.maxRetries - Max retry attempts (default 3)
 * @param {string} params.taskId - Task identifier for logging (default auto-generated)
 * @returns {Promise<{success: boolean, messageId: string, elapsed: number, attempts: number}>}
 */
async function sendEmailWithRetry({
  to,
  subject,
  text,
  html,
  replyTo,
  maxRetries = 3,
  taskId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
}) {
  let lastError;
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Send email via provider
      const sendResult = await sendEmail({
        to,
        subject,
        text,
        html,
        replyTo,
      });

      const elapsed = Date.now() - startTime;
      logger.info(`[${taskId}] Email sent to ${to}`, { attempt, elapsed });

      return {
        success: true,
        messageId: sendResult.messageId,
        elapsed,
        attempts: attempt,
      };
    } catch (err) {
      lastError = err;
      const elapsed = Date.now() - startTime;

      // Classify error type for intelligent retry decisions
      const errorClassification = classifyEmailError(err);

      logger.debug(`[${taskId}] Send attempt ${attempt}/${maxRetries} failed`, {
        message: err.message,
        code: err.code,
        responseCode: err.responseCode,
        ...errorClassification,
      });

      // Don't retry authentication errors
      if (errorClassification.isAuthError) {
        logger.warn(`[${taskId}] Authentication error - aborting (Gmail credentials invalid)`);
        break;
      }

      // Retry with backoff if not the last attempt
      if (attempt < maxRetries) {
        let delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s

        // Longer backoff on rate limit errors
        if (errorClassification.isRateLimitError) {
          delayMs = Math.min(30000, delayMs * 2); // Longer backoff, max 30s
          logger.debug(`[${taskId}] Rate limit - backing off ${delayMs}ms`);
        } else {
          logger.debug(`[${taskId}] Retrying in ${delayMs}ms`);
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries exhausted
  const elapsed = Date.now() - startTime;
  logger.warn(`[${taskId}] Permanently failed after ${maxRetries} attempts`, {
    elapsed,
    error: lastError?.message,
  });

  return {
    success: false,
    error: lastError,
    elapsed,
    attempts: maxRetries,
  };
}

/**
 * Classify email error to determine retry strategy
 * Returns error classification flags
 * 
 * @param {Error} err - Error object from email send attempt
 * @returns {Object} Classification with isNetworkError, isAuthError, isRateLimitError flags
 */
function classifyEmailError(err) {
  // Harden: err.code might not be a string
  const code = typeof err.code === "string" ? err.code : "";

  const isNetworkError =
    code.includes("ECONNREFUSED") ||
    code.includes("ETIMEDOUT") ||
    code.includes("EHOSTUNREACH") ||
    code === "ESOCKETTIMEDOUT" ||
    err.errno === -111; // ECONNREFUSED errno

  const errorCode = err.responseCode || err.statusCode || err.code;
  const isAuthError =
    errorCode === 535 || // 535 = Authentication failed
    errorCode === 534 || // 534 = Application-specific password issue
    err.message?.includes("Invalid login") ||
    err.message?.includes("Bad credentials");

  const isRateLimitError = errorCode === 429 || errorCode === 452; // Gmail rate limiting

  return {
    isNetworkError,
    isAuthError,
    isRateLimitError,
  };
}

/**
 * Send email and update database record
 * IMPORTANT: NOT transactional - Emails.create and RfpVendors.update are separate operations
 * Used for RFP invites - updates RfpVendors mapping table
 * 
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} params.text - Email body text
 * @param {string} params.html - Email body HTML (optional)
 * @param {string} params.replyTo - Reply-to address (optional)
 * @param {Object} params.Emails - Sequelize Emails model
 * @param {Object} params.RfpVendors - Sequelize RfpVendors model
 * @param {string} params.rfp_id - RFP ID for email record
 * @param {string} params.vendor_id - Vendor ID for email record
 * @param {string} params.mapping_id - RfpVendors mapping ID for status update
 * @param {number} params.maxRetries - Max retry attempts (default 3)
 * @returns {Promise<{success: boolean, email: Object|null, mapping: Object|null, error: Error|null}>}
 * 
 * Edge case: If Emails.create succeeds but RfpVendors.update fails,
 * email row is inserted but mapping status may not update (will be marked failed).
 * This is acceptable since retry logic will eventually fix it.
 */
async function sendEmailAndUpdateStatus({
  to,
  subject,
  text,
  html,
  replyTo,
  Emails,
  RfpVendors,
  rfp_id,
  vendor_id,
  mapping_id,
  maxRetries = 3,
}) {
  const taskId = `${rfp_id}:${vendor_id}`;

  // Send email with retries
  const sendResult = await sendEmailWithRetry({
    to,
    subject,
    text,
    html,
    replyTo,
    maxRetries,
    taskId,
  });

  // If send failed, mark mapping as failed and return
  if (!sendResult.success) {
    try {
      const { Op } = require("sequelize");
      await RfpVendors.update(
        {
          invite_status: "failed",
          updated_at: new Date(),
        },
        {
          where: {
            id: mapping_id,
            invite_status: { [Op.in]: ["pending", "failed"] }, // Only update if not already sent
          },
        }
      );
      logger.debug(`[${taskId}] Marked RfpVendors as failed`);
    } catch (updateErr) {
      logger.warn(`[${taskId}] Failed to update RfpVendors status`, { error: updateErr.message });
    }

    return {
      success: false,
      email: null,
      mapping: null,
      error: sendResult.error,
    };
  }

  // Send succeeded - record in database
  try {
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

    // IMPORTANT: This is NOT a transaction with the Emails.create above
    // If this update fails, email row exists but mapping may not reflect success
    // Retry logic will eventually correct this (mapping marked failed, retry happens)
    const { Op } = require("sequelize");
    const updated = await RfpVendors.update(
      {
        invite_status: "sent",
        last_email_id: email.id,
        updated_at: new Date(),
      },
      {
        where: {
          id: mapping_id,
          // Race condition guard: only update if still pending or previously failed
          invite_status: { [Op.in]: ["pending", "failed"] },
        },
      }
    );

    if (updated[0] === 0) {
      // Race condition: another process already marked this as sent
      logger.debug(`[${taskId}] Race condition: mapping already updated`);
      return {
        success: true,
        email,
        mapping: null,
        error: null,
      };
    }

    return {
      success: true,
      email,
      mapping: { id: mapping_id, invite_status: "sent" },
      error: null,
    };
  } catch (dbErr) {
    logger.warn(`[${taskId}] Failed to record sent email`, { error: dbErr.message });
    return {
      success: false,
      email: null,
      mapping: null,
      error: dbErr,
    };
  }
}

/**
 * Process items with bounded concurrency
 * Tracks progress and prevents any single failure from blocking others
 *
 * In production, consider replacing with a proper job queue (Bull, RabbitMQ, SQS)
 * for: persistence, retries, monitoring, distributed processing, scaling
 *
 * @param {Array} items - Items to process
 * @param {number} concurrency - Max concurrent workers
 * @param {Function} handler - Async function to handle each item
 * @returns {Promise<{completed: number, failed: number, total: number}>}
 */
async function processConcurrency(items, concurrency, handler) {
  let index = 0;
  let completed = 0;
  let failed = 0;
  const startTime = Date.now();
  const total = items.length;

  async function worker(workerId) {
    while (true) {
      const current = index++;
      if (current >= items.length) break;

      const item = items[current];
      try {
        await handler(item);
        completed++;

        // Log progress only every 10 items or at completion (debug level)
        if (completed % 10 === 0 || completed === total) {
          const elapsed = Date.now() - startTime;
          logger.debug(`Concurrency progress`, { completed, total, failed, elapsed });
        }
      } catch (err) {
        failed++;
        // Handler should already log errors; don't rethrow to avoid killing other workers
        logger.warn(`Concurrency worker error (item ${current}/${total})`, { error: err.message });
      }
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  logger.debug(`Concurrency pool`, { total, workers: workerCount, maxConcurrency: concurrency });

  const workers = [];
  for (let i = 1; i <= workerCount; i++) {
    workers.push(worker(i));
  }

  await Promise.all(workers);

  const totalElapsed = Date.now() - startTime;
  logger.debug(`Concurrency complete`, { completed, total, failed, totalElapsed });

  return { completed, failed, total };
}

/**
 * Send award email to winning vendor
 * @param {Object} params
 * @param {Object} params.vendor - Vendor object with name and email
 * @param {Object} params.rfp - RFP object with title
 * @returns {Promise<void>}
 */
async function sendAwardEmail({ vendor, rfp }) {
  if (!vendor || !vendor.email) {
    logger.debug("[AwardEmail] Skipping - vendor or email missing");
    return;
  }

  const awardEmailBody = `Dear ${vendor.name},\n\nCongratulations! Your proposal for RFP "${rfp.title}" has been awarded.\n\nWe will contact you shortly with further details.\n\nBest regards,\nProcurement Team`;

  const result = await sendEmailWithRetry({
    to: vendor.email,
    subject: `Proposal Awarded - ${rfp.title}`,
    text: awardEmailBody,
    taskId: `AWARD:${rfp.id}:${vendor.id}`,
  });

  if (!result.success) {
    throw result.error; // Re-throw for caller to handle
  }
}

/**
 * Send rejection email to a single vendor
 * @param {Object} params
 * @param {Object} params.vendor - Vendor object with name and email
 * @param {Object} params.rfp - RFP object with title
 * @param {string} params.type - Email type: "auto-reject" (from award) or "manual-reject" (manual rejection)
 * @returns {Promise<void>}
 */
async function sendRejectionEmail({ vendor, rfp, type = "manual-reject" }) {
  if (!vendor || !vendor.email) {
    logger.debug("[RejectionEmail] Skipping - vendor or email missing");
    return;
  }

  const isAutoReject = type === "auto-reject";
  const rejectionEmailBody = isAutoReject
    ? `Dear ${vendor.name},\n\nThank you for your proposal for RFP "${rfp.title}".\n\nWe regret to inform you that another proposal has been selected for this RFP. We appreciate your effort and would like to consider you for future opportunities.\n\nBest regards,\nProcurement Team`
    : `Dear ${vendor.name},\n\nThank you for your proposal for RFP "${rfp.title}".\n\nUnfortunately, we have decided to proceed with another vendor at this time.\n\nWe appreciate your interest and hope to work with you on future opportunities.\n\nBest regards,\nProcurement Team`;

  const emailType = isAutoReject ? "AutoRejectEmail" : "RejectionEmail";
  const taskIdPrefix = isAutoReject ? "AUTO-REJECT" : "MANUAL-REJECT";

  const result = await sendEmailWithRetry({
    to: vendor.email,
    subject: `RFP "${rfp.title}" - Proposal Status Update`,
    text: rejectionEmailBody,
    taskId: `${taskIdPrefix}:${rfp.id}:${vendor.id}`,
  });

  if (!result.success) {
    throw result.error; // Re-throw for caller to handle
  }
}

/**
 * Send rejection emails to multiple vendors with bounded concurrency
 * Used for auto-rejecting other vendors when a proposal is awarded
 * 
 * @param {Object} params
 * @param {Array} params.rejectedVendors - Array of vendor objects to reject
 * @param {Object} params.rfp - RFP object with title
 * @param {number} params.concurrency - Max concurrent sends (default 5)
 * @returns {Promise<{completed: number, failed: number, total: number}>}
 */
async function sendBulkRejectionEmails({ rejectedVendors, rfp, concurrency = 5 }) {
  if (!rejectedVendors || rejectedVendors.length === 0) {
    logger.info("[BulkRejectionEmails] No vendors to reject");
    return { completed: 0, failed: 0, total: 0 };
  }

  logger.debug(`[BulkRejectionEmails] Starting`, { vendors: rejectedVendors.length, concurrency });

  try {
    const result = await processConcurrency(rejectedVendors, concurrency, async (vendor) => {
      await sendRejectionEmail({ vendor, rfp, type: "auto-reject" });
    });
    logger.info(`[BulkRejectionEmails] Complete`, { sent: result.completed, failed: result.failed, total: result.total });
    return result;
  } catch (err) {
    logger.warn("[BulkRejectionEmails] Unhandled error", { error: err.message });
    throw err;
  }
}

/**
 * HIGH-LEVEL API: Send RFP invite emails to multiple vendors
 * Handles all concurrency, retries, and DB updates internally
 * 
 * @param {Object} params
 * @param {Array} params.emailsToSend - Array of email data objects
 * @param {Object} params.Emails - Sequelize Emails model
 * @param {Object} params.RfpVendors - Sequelize RfpVendors model
 * @param {string} params.requestId - Request tracing ID
 * @returns {Promise<{completed: number, failed: number, total: number}>}
 */
async function sendRfpInviteEmails({ emailsToSend, Emails, RfpVendors, requestId }) {
  if (!emailsToSend || emailsToSend.length === 0) {
    logger.info(`[${requestId}] No emails to send`);
    return { completed: 0, failed: 0, total: 0 };
  }

  logger.info(`[${requestId}] Starting RFP email send`, { emails: emailsToSend.length });

  try {
    // Internal concurrency handling - hides complexity from caller
    const result = await processConcurrency(emailsToSend, 5, async (emailData) => {
      const { to, subject, text, html, replyTo, rfp_id, vendor_id, mapping_id } = emailData;

      const sendResult = await sendEmailAndUpdateStatus({
        to,
        subject,
        text,
        html,
        replyTo,
        Emails,
        RfpVendors,
        rfp_id,
        vendor_id,
        mapping_id,
        maxRetries: 3,
      });

      // Rethrow error so processConcurrency increments failed counter
      // (errors don't escape - processConcurrency catches and logs them)
      if (!sendResult.success) {
        throw sendResult.error;
      }
    });

    logger.info(`[${requestId}] RFP email send complete`, { sent: result.completed, failed: result.failed });

    return result;
  } catch (err) {
    logger.warn(`[${requestId}] RFP email send failed`, { error: err.message });
    throw err;
  }
}

/**
 * HIGH-LEVEL API: Send proposal-related emails (award/rejection)
 * Handles award email + auto-rejection emails with concurrency
 * 
 * @param {Object} params
 * @param {Object} params.awardVendor - Vendor object to award (or null)
 * @param {Array} params.rejectVendors - Vendor objects to reject (or empty array)
 * @param {Object} params.rfp - RFP object
 * @param {string} params.requestId - Request tracing ID
 * @returns {Promise<{award: {success, sent}, rejections: {completed, failed, total}}>}
 */
async function sendProposalEmails({ awardVendor, rejectVendors, rfp, requestId }) {
  const result = {
    award: { success: false, sent: false },
    rejections: { completed: 0, failed: 0, total: 0 },
  };

  // Send award email if provided
  if (awardVendor && awardVendor.email) {
    try {
      await sendAwardEmail({ vendor: awardVendor, rfp });
      result.award = { success: true, sent: true };
      logger.info(`[${requestId}] Award email sent`, { vendor: awardVendor.email });
    } catch (err) {
      result.award = { success: false, sent: false, error: err.message };
      logger.warn(`[${requestId}] Award email failed`, { error: err.message });
    }
  }

  // Send rejection emails if provided (with internal concurrency)
  if (rejectVendors && rejectVendors.length > 0) {
    try {
      result.rejections = await sendBulkRejectionEmails({
        rejectedVendors: rejectVendors,
        rfp,
        concurrency: 5,
      });
      logger.info(`[${requestId}] Rejection emails complete`, { sent: result.rejections.completed, failed: result.rejections.failed });
    } catch (err) {
      logger.warn(`[${requestId}] Rejection emails failed`, { error: err.message });

    }
  }

  return result;
}

module.exports = {
  sendEmailWithRetry,
  classifyEmailError,
  sendEmailAndUpdateStatus,
  sendAwardEmail,
  sendRejectionEmail,
  sendBulkRejectionEmails,
  processConcurrency,
  sendRfpInviteEmails,
  sendProposalEmails,
};
