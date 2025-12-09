const {
  analyzeRfpPreviewService,
  createRfpService,
  listRfpsService,
  getRfpDetailsService,
} = require("../services/rfpService");

const { successResponse, errorResponse } = require("../utils/response");
const { SUCCESS } = require("../utils/messages.json");
const mapZodErrors = require("../utils/validationUtils/zodErrorMapper");

const {
  analyzeRfpPreviewSchema,
  createRfpSchema,
  listRfpsSchema,
  getRfpDetailsSchema,
} = require("../utils/validationUtils/zodValidatorUtils");

/**
 * Analyze RFP (Preview only)
 */
exports.analyzeRfpPreviewController = async (data) => {
  try {
    const validatedData = analyzeRfpPreviewSchema.parse(data.data);

    const result = await analyzeRfpPreviewService(validatedData);

    if (result?.error) {
      return errorResponse(400, result.error);
    }

    const { statusCode, message } = SUCCESS.RFP_ANALYZE_PREVIEW;
    return successResponse(statusCode, message, result);
  } catch (err) {
    const errorMap = mapZodErrors(err);
    if (errorMap) return errorResponse(400, errorMap);
    throw err;
  }
};

/**
 * Create RFP (after user confirms preview)
 */
exports.createRfpController = async (data) => {
  try {
    const validatedData = createRfpSchema.parse(data.data);

    const result = await createRfpService(validatedData);

    if (result?.error) {
      return errorResponse(400, result.error);
    }

    const { statusCode, message } = SUCCESS.RFP_CREATED;
    return successResponse(statusCode, message, result);
  } catch (err) {
    const errorMap = mapZodErrors(err);
    if (errorMap) return errorResponse(400, errorMap);
    throw err;
  }
};

/**
 * List RFPs
 */
exports.listRfpsController = async (data) => {
  try {
    // e.g. { page, limit, search, status, dateRange, ... }
    const validatedData = listRfpsSchema.parse(data.data);

    const result = await listRfpsService(validatedData);

    if (result?.error) {
      return errorResponse(400, result.error);
    }

    const { statusCode, message } = SUCCESS.RFP_LISTED;
    return successResponse(statusCode, message, result);
  } catch (err) {
    const errorMap = mapZodErrors(err);
    if (errorMap) return errorResponse(400, errorMap);
    throw err;
  }
};

/**
 * Get RFP Details
 */
exports.getRfpDetailsController = async (data) => {
  try {
    const validatedData = getRfpDetailsSchema.parse(data.data);

    const result = await getRfpDetailsService(validatedData);

    if (result?.error) {
      return errorResponse(400, result.error);
    }

    const { statusCode, message } = SUCCESS.RFP_DETAILS_RETRIEVED;
    return successResponse(statusCode, message, result);
  } catch (err) {
    const errorMap = mapZodErrors(err);
    if (errorMap) return errorResponse(400, errorMap);
    throw err;
  }
};
