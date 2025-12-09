// config/db.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const DB_CACHE = new Map(); // cache per dbName

function createSequelize(dbName) {
  const host = process.env.RDS_DB_HOST || '127.0.0.1';
  const port = Number(process.env.DB_PORT || 5432);
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  if (!user || !password) {
    throw new Error('DB_USER and DB_PASSWORD environment variables are required');
  }

  console.log('🗄️ DB config (sanitized):', {
    host,
    port,
    userPresent: !!user,
    hasPassword: !!password,
  });

  return new Sequelize(dbName, user, password, {
    host,
    port,
    dialect: 'postgres',
    logging: false, // change to console.log if you want SQL logs
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
      application_name: 'node-express-api',
      statement_timeout: 20000,                    // ms
      query_timeout: 25000,                        // ms
      idle_in_transaction_session_timeout: 60000,  // ms
    },
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
      acquire: 30000,
      evict: 1000,
    },
    retry: {
      max: 3,
    },
  });
}

function getDb(dbName) {
  if (!DB_CACHE.has(dbName)) {
    DB_CACHE.set(dbName, createSequelize(dbName));
  }
  return DB_CACHE.get(dbName);
}

module.exports = getDb;
