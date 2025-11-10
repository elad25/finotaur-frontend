// src/utils/cache.js
const store = new Map();
function set(key, value, ttlMs = 5 * 60 * 1000) { store.set(key, { value, exp: Date.now() + ttlMs }); }
function get(key) { const e = store.get(key); if (!e) return null; if (Date.now() > e.exp) { store.delete(key); return null; } return e.value; }
function del(key) { store.delete(key); }
module.exports = { set, get, del };
export { set, get, del };
