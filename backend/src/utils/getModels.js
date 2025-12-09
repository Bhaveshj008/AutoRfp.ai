// utils/getModels.js

const getDb = require("../config/db");
const defineModels = require("../models/associations");

const modelCache = {};

/**
 * Dynamically initializes and caches Sequelize models for a given database.
 *
 *  Use Case:
 * - Multi-tenant apps where each tenant has its own DB
 * - Avoids reinitializing models for the same DB
 *
 * @function getModels
 * @param {string} dbName - The PostgreSQL database name to connect to
 * @returns {Object} An object containing all Sequelize models for the given DB
 * @throws {Error} If dbName is not provided
 *
 * @example
 * const models = getModels("onboarding_service");
 * const { AdminUser } = models;
 * const user = await AdminUser.findOne(...);
 */
const getModels = (dbName) => {
  if (!dbName) throw new Error("dbName is required");

  if (modelCache[dbName]) {
    return modelCache[dbName];
  }

  const sequelize = getDb(dbName);
  const models = defineModels(sequelize);
  modelCache[dbName] = models;

  return models;
};

module.exports = getModels;
