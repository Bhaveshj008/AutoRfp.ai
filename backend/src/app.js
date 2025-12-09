const express = require('express');
const cors = require('cors');
const { allowedOrigins } = require('./utils/corsUtil');

const routes = require('./routes');

const app = express();

// ===== CORS (GLOBAL) =====
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (curl, Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
  })
);


// Parse JSON
app.use(express.json({ limit: '2mb' }));

// Routes
app.use('/', routes);

// 404 handler
app.use((req, res) => {
  return res.status(404).json({
    statusCode: 404,
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error middleware:', err);
  const status = err.statusCode || 500;
  return res.status(status).json({
    statusCode: status,
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Unexpected error',
    },
  });
});

module.exports = app;
