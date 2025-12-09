const express = require('express');
const healthRoutes = require('./healthRoutes');
const apiRoutes = require('./apiRoutes');

const router = express.Router();

// Health ping
router.use('/health', healthRoutes);

// Single action-based API
router.use('/api', apiRoutes);

module.exports = router;
