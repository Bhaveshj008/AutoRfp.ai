const {
  parseProposalsService,
  awardProposalService,
  rejectProposalService,
  listProposalsService,
} = require("../services/proposalService");

const { successResponse, errorResponse } = require("../utils/response");
const { SUCCESS } = require("../utils/messages.json");
const mapZodErrors = require("../utils/validationUtils/zodErrorMapper");

const {
  parseProposalsSchema,
  awardProposalSchema,
  rejectProposalSchema,
  listProposalsSchema,
} = require("../utils/validationUtils/zodValidatorUtils");

/**
 * Parse proposals from inbound emails
 */
exports.parseProposalsController = async (data) => {
  try {
    const validatedData = parseProposalsSchema.parse(data.data);

    const result = await parseProposalsService(validatedData);

    if (result?.error) {
      return errorResponse(400, result.error);
    }

    const { statusCode, message } = SUCCESS.RFP_PROPOSALS_PARSED;
    return successResponse(statusCode, message, result);
  } catch (err) {
    const errorMap = mapZodErrors(err);
    if (errorMap) return errorResponse(400, errorMap);
    throw err;
  }
};

/**
 * Award a proposal
 */
exports.awardProposalController = async (data) => {
  try {
    const validatedData = awardProposalSchema.parse(data.data);

    const result = await awardProposalService(validatedData);

    if (result?.error) {
      return errorResponse(400, result.error);
    }

    const { statusCode, message } = SUCCESS.RFP_PROPOSAL_AWARDED;
    return successResponse(statusCode, message, result);
  } catch (err) {
    const errorMap = mapZodErrors(err);
    if (errorMap) return errorResponse(400, errorMap);
    throw err;
  }
};

/**
 * Reject a proposal
 */
exports.rejectProposalController = async (data) => {
  try {
    const validatedData = rejectProposalSchema.parse(data.data);

    const result = await rejectProposalService(validatedData);

    if (result?.error) {
      return errorResponse(400, result.error);
    }

    const { statusCode, message } = SUCCESS.RFP_PROPOSAL_REJECTED;
    return successResponse(statusCode, message, result);
  } catch (err) {
    const errorMap = mapZodErrors(err);
    if (errorMap) return errorResponse(400, errorMap);
    throw err;
  }
};

/**
 * List Proposals for an RFP
 */
exports.listProposalsController = async (data) => {
  try {
    const validatedData = listProposalsSchema.parse(data.data);

    const result = await listProposalsService(validatedData);

    if (result?.error) {
      return errorResponse(400, result.error);
    }

    const { statusCode, message } = SUCCESS.PROPOSALS_LISTED;
    return successResponse(statusCode, message, result);
  } catch (err) {
    const errorMap = mapZodErrors(err);
    if (errorMap) return errorResponse(400, errorMap);
    throw err;
  }
};
