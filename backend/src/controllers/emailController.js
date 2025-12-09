const {
  sendRfpService,
  listEmailsService,
  fetchEmailsService,
} = require("../services/emailService");

const { successResponse, errorResponse } = require("../utils/response");
const { SUCCESS } = require("../utils/messages.json");
const mapZodErrors = require("../utils/validationUtils/zodErrorMapper");

const {
  sendRfpSchema,
  listEmailsSchema,
} = require("../utils/validationUtils/zodValidatorUtils");

/**
 * Send RFP to vendors
 */
exports.sendRfpController = async (data) => {
  try {
    const validatedData = sendRfpSchema.parse(data.data);

    const result = await sendRfpService(validatedData);

    if (result?.error) {
      return errorResponse(400, result.error);
    }

    const { statusCode, message } = SUCCESS.RFP_SENT;
    return successResponse(statusCode, message, result);
  } catch (err) {
    const errorMap = mapZodErrors(err);
    if (errorMap) return errorResponse(400, errorMap);
    throw err;
  }
};

/**
 * List emails for an RFP (Inbox)
 */
exports.listEmailsController = async (data) => {
  try {
    const validatedData = listEmailsSchema.parse(data.data);

    const result = await listEmailsService(validatedData);

    if (result?.error) {
      return errorResponse(400, result.error);
    }

    const { statusCode, message } = SUCCESS.RFP_EMAILS_LISTED;
    return successResponse(statusCode, message, result);
  } catch (err) {
    const errorMap = mapZodErrors(err);
    if (errorMap) return errorResponse(400, errorMap);
    throw err;
  }
};

/**
 * Fetch emails from IMAP inbox
 */
exports.fetchEmailsController = async (data) => {
  try {
    const result = await fetchEmailsService();

    if (result?.error) {
      return errorResponse(400, result.error);
    }

    const { statusCode, message } = SUCCESS.RFP_EMAILS_FETCHED;
    return successResponse(statusCode, message, result);
  } catch (err) {
    console.error(" Error in fetchEmailsController:", err);
    throw err;
  }
};
