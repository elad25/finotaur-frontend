/**
 * Mount /api/search router.
 * Usage in src/index.js:
 *   const mountSearch = require('./mountSearch');
 *   mountSearch(app);
 */
module.exports = function mountSearch(app) {
  const express = require('express');
  const search = require('./routes/search');
  const base = express.Router();
  base.use('/search', search);
  app.use('/api', base);
};
