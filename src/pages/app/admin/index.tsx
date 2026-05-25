// src/pages/app/admin/index.tsx
// Entry for the Admin CRM. Route guard is handled at App.tsx via
// ProtectedAdminRoute; this file just re-exports the shell so React.lazy
// can import it from a single path.

export { default } from './AdminCRMShell';
