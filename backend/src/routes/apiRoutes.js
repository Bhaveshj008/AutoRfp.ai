// src/routes/apiRoutes.js
const express = require('express');

const {
  analyzeRfpPreviewController,
  createRfpController,
  listRfpsController,
  getRfpDetailsController,
} = require('../controllers/rfpController');

const {
  sendRfpController,
  listEmailsController,
  fetchEmailsController,
} = require('../controllers/emailController');

const {
  parseProposalsController,
  awardProposalController,
  rejectProposalController,
  listProposalsController,
} = require('../controllers/proposalController');

const {
  listVendorsController,
  createVendorController,
  updateVendorController,
  deleteVendorController,
} = require('../controllers/vendorController');

const { sanitizeError } = require('../utils/errorUtils');
const ERROR = require('../utils/messages.json').ERROR;

const router = express.Router();

router.post('/', async (req, res) => {
  const data = req.body || {};

  try {
    const { action } = data;

    // Missing Action
    if (!action) {
      const { statusCode, message } = ERROR.APINAME_REQUIRED;
      return res.status(statusCode).json({
        statusCode,
        message,
      });
    }

    console.log("AutoRFP action:", action);

    let response;

    switch (action) {
      // ========== RFP MAIN FLOW ==========
      case 'AnalyzeRfpPreview':
        response = await analyzeRfpPreviewController(data);
        break;

      case 'CreateRfp':
        response = await createRfpController(data);
        break;
      
      case 'ListRfps':
        response = await listRfpsController(data);
        break;

      case 'GetRfpDetails':
        response = await getRfpDetailsController(data);
        break;

      case 'SendRfp':
        response = await sendRfpController(data);
        break;

      // ========== VENDORS ==========
      case 'ListVendors':
        response = await listVendorsController(data);
        break;

      case 'CreateVendor':
        response = await createVendorController(data);
        break;

      case 'UpdateVendor':
        response = await updateVendorController(data);
        break;

      case 'DeleteVendor':
        response = await deleteVendorController(data);
        break;

      // ========== EMAILS ==========
      case 'ListEmails':
        response = await listEmailsController(data);
        break;

      case 'FetchEmails':
        response = await fetchEmailsController(data);
        break;

      // ========== PROPOSALS ==========
      case 'ParseProposals':
        response = await parseProposalsController(data);
        break;

      case 'ListProposals':
        response = await listProposalsController(data);
        break;

      case 'AwardProposal':
        response = await awardProposalController(data);
        break;

      case 'RejectProposal':
        response = await rejectProposalController(data);
        break;

      // ========== UNKNOWN ACTION ==========
      default: {
        const { statusCode, message } = ERROR.INVALID_APINAME;
        return res.status(statusCode).json({
          statusCode,
          message,
        });
      }
    }

    return res
      .status(response?.statusCode || 500)
      .json(response);

  } catch (err) {
    console.error("AutoRFP handler error:", err);

    const sanitized = sanitizeError(err);

    return res.status(sanitized.statusCode).json({
      success: false,
      statusCode: sanitized.statusCode,
      message: sanitized.message,
    });
  }
});

module.exports = router;
