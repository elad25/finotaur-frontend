
// finotaur-server/src/routes/register.js
// Helper to register all routes in ESM apps with top-level await.
export default async function registerRoutes(app) {
  try { const { default: priceRoutes }   = await import('./price.js');   app.use('/api', priceRoutes); } catch (e) { console.warn('[routes] price not loaded', e?.message); }
  try { const { default: eventsRoutes }  = await import('./events.js');  app.use('/api', eventsRoutes); } catch (e) { console.warn('[routes] events not loaded', e?.message); }
  try { const { default: profileRoutes } = await import('./profile.js'); app.use('/api', profileRoutes); } catch (e) { console.warn('[routes] profile not loaded', e?.message); }
  try { const { default: newsRoutes }    = await import('./news.js');    app.use('/api', newsRoutes); } catch (e) { console.warn('[routes] news not loaded', e?.message); }
}
