/**
 * Centralized logging utility for the entire backend
 * 
 * Environment variable: LOG_LEVEL
 * - error   (0): Only critical failures
 * - warn    (1): Warnings + errors (DEFAULT for production)
 * - info    (2): Operational milestones + warnings + errors
 * - debug   (3): Detailed flow + all above (DEFAULT for development)
 * 
 * Usage:
 *   const logger = require("../utils/logger");
 *   logger.info("Operation complete", { items: 5, duration: 120 });
 *   logger.warn("Validation failed", { reason: "invalid email" });
 *   logger.debug("Processing item", { id: "xyz", index: 3 });
 *   logger.error("Database error", { code: "ECONNREFUSED" });
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Determine current log level
// Development defaults to debug, production defaults to warn
const isProduction = process.env.NODE_ENV === "production";
const defaultLevel = isProduction ? "warn" : "debug";
const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || defaultLevel] ?? LOG_LEVELS.debug;

/**
 * Format log message with context
 * @param {string} level - Log level (error, warn, info, debug)
 * @param {string} message - Main log message
 * @param {Object} context - Additional context data (optional)
 * @returns {string} Formatted message
 */
function formatMessage(level, message, context) {
  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase().padEnd(5);
  
  if (context && Object.keys(context).length > 0) {
    // Only include non-empty context
    return `[${timestamp}] [${levelUpper}] ${message} ${JSON.stringify(context)}`;
  }
  
  return `[${timestamp}] [${levelUpper}] ${message}`;
}

/**
 * Log error (always shown)
 * @param {string} message
 * @param {Object} context
 */
function error(message, context) {
  console.error(formatMessage("error", message, context));
}

/**
 * Log warning
 * @param {string} message
 * @param {Object} context
 */
function warn(message, context) {
  if (CURRENT_LOG_LEVEL >= LOG_LEVELS.warn) {
    console.warn(formatMessage("warn", message, context));
  }
}

/**
 * Log info
 * @param {string} message
 * @param {Object} context
 */
function info(message, context) {
  if (CURRENT_LOG_LEVEL >= LOG_LEVELS.info) {
    console.log(formatMessage("info", message, context));
  }
}

/**
 * Log debug (development only typically)
 * @param {string} message
 * @param {Object} context
 */
function debug(message, context) {
  if (CURRENT_LOG_LEVEL >= LOG_LEVELS.debug) {
    console.log(formatMessage("debug", message, context));
  }
}

/**
 * Log with custom level
 * @param {string} level - error, warn, info, or debug
 * @param {string} message
 * @param {Object} context
 */
function log(level, message, context) {
  const levelLower = level.toLowerCase();
  if (typeof loggers[levelLower] === "function") {
    loggers[levelLower](message, context);
  } else {
    console.warn(`Invalid log level: ${level}`);
  }
}

const loggers = { error, warn, info, debug, log };

/**
 * Get current log level info (for monitoring/debugging)
 * @returns {Object}
 */
function getLevelInfo() {
  return {
    current: Object.keys(LOG_LEVELS).find((k) => LOG_LEVELS[k] === CURRENT_LOG_LEVEL),
    levelNumber: CURRENT_LOG_LEVEL,
    environment: process.env.NODE_ENV || "development",
    configured: process.env.LOG_LEVEL ? `via LOG_LEVEL=${process.env.LOG_LEVEL}` : "using default",
  };
}

module.exports = {
  error,
  warn,
  info,
  debug,
  log,
  getLevelInfo,
  LOG_LEVELS,
  CURRENT_LOG_LEVEL,
};
