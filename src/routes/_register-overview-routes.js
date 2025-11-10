// src/routes/_register-overview-routes.js
// Safe registrar: can be required once from src/index.js without breaking other flows.
module.exports = function registerOverviewRoutes(app) {
  try { app.use("/api", require("./price")); } catch {}
  try { app.use("/api", require("./events")); } catch {}
  try { app.use("/api", require("./profile")); } catch {}
  try { app.use("/api", require("./news")); } catch {}
  return app;
};
