// src/controllers/vendorController.js
const {
  listVendorsService,
  createVendorService,
  updateVendorService,
  deleteVendorService,
} = require("../services/vendorService");

const { successResponse, errorResponse } = require("../utils/response");
const { SUCCESS } = require("../utils/messages.json");

const {
  vendorCreateSchema,
  vendorListSchema,
  vendorUpdateSchema,
  vendorDeleteSchema,
} = require("../utils/validationUtils/zodValidatorUtils");
const mapZodErrors = require("../utils/validationUtils/zodErrorMapper");

const {
  setVendorRating,
  getVendorRatingSummary,
} = require("../utils/vendorRatingUtils");

// ----------------------------------
// LIST VENDORS
// ----------------------------------
exports.listVendorsController = async (data) => {
  try {
    const validated = vendorListSchema.parse(data.data);
    const result = await listVendorsService(validated);

    if (result?.error) {
      return errorResponse(400, result.error);
    }

    const { statusCode, message } = SUCCESS.VENDORS_LISTED;
    return successResponse(statusCode, message, result);
  } catch (err) {
    throw err; // no validation in list → direct throw
  }
};

// ----------------------------------
// CREATE VENDOR
// ----------------------------------
exports.createVendorController = async (data) => {
  try {
    // Always expect an array here (validated)
    const vendors = vendorCreateSchema.parse(data.data);

    const result = await createVendorService(vendors);

    if (result?.error) {
      return errorResponse(400, result.error);
    }

    const { statusCode, message } = SUCCESS.VENDOR_CREATED;
    return successResponse(statusCode, message, result);
  } catch (err) {
    const mapped = mapZodErrors(err);
    if (mapped) return errorResponse(400, mapped);
    throw err;
  }
};

// ----------------------------------
// UPDATE VENDOR
// ----------------------------------
exports.updateVendorController = async (data) => {
  try {
    const validated = vendorUpdateSchema.parse(data.data);
    const result = await updateVendorService(validated);

    if (result?.error) {
      return errorResponse(400, result.error);
    }

    const { statusCode, message } = SUCCESS.VENDOR_UPDATED;
    return successResponse(statusCode, message, result);
  } catch (err) {
    const mapped = mapZodErrors(err);
    if (mapped) return errorResponse(400, mapped);
    throw err;
  }
};

// ----------------------------------
// DELETE VENDOR
// ----------------------------------
exports.deleteVendorController = async (data) => {
  try {
    const validated = vendorDeleteSchema.parse(data.data);
    const result = await deleteVendorService(validated);

    if (result?.error) {
      return errorResponse(400, result.error);
    }

    const { statusCode, message } = SUCCESS.VENDOR_DELETED;
    return successResponse(statusCode, message, result);
  } catch (err) {
    const mapped = mapZodErrors(err);
    if (mapped) return errorResponse(400, mapped);
    throw err;
  }
};

// ----------------------------------
// SET VENDOR RATING (Manual)
// ----------------------------------
exports.setVendorRatingController = async (data) => {
  try {
    const { vendor_id, rating } = data.data || data;

    if (!vendor_id || rating === null || rating === undefined) {
      return errorResponse(400, "vendor_id and rating are required");
    }

    if (typeof rating !== "number" || rating < 0 || rating > 10) {
      return errorResponse(400, "rating must be a number between 0 and 10");
    }

    const result = await setVendorRating(vendor_id, rating);

    if (result?.error) {
      return errorResponse(400, result.error);
    }

    const { statusCode, message } = SUCCESS.VENDOR_UPDATED;
    return successResponse(statusCode, message, result);
  } catch (err) {
    throw err;
  }
};

// ----------------------------------
// GET VENDOR RATING SUMMARY
// ----------------------------------
exports.getVendorRatingSummaryController = async (data) => {
  try {
    const { vendor_id } = data.data || data;

    if (!vendor_id) {
      return errorResponse(400, "vendor_id is required");
    }

    const result = await getVendorRatingSummary(vendor_id);

    if (result?.error) {
      return errorResponse(400, result.error);
    }

    const { statusCode, message } = SUCCESS.VENDOR_LISTED;
    return successResponse(statusCode, message, result);
  } catch (err) {
    throw err;
  }
};
