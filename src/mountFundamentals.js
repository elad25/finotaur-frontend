/**
 * Mount fundamentals router without touching other routes.
 * Usage in src/index.js (CommonJS):
 *   const mountFundamentals = require('./mountFundamentals');
 *   mountFundamentals(app);
 */
module.exports = function mountFundamentals(app) {
  const express = require('express');
  const fundamentals = require('./routes/fundamentals');
  const base = express.Router();
  base.use('/fundamentals', fundamentals);
  app.use('/api', base);
};
