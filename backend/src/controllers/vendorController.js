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
