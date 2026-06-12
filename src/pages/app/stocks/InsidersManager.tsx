// ============================================================
// src/pages/app/stocks/InsidersManager.tsx
// Manager detail page — route: /app/stocks/insiders/:slug
// ============================================================

import { memo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { ManagerDetail } from './_insiders/ManagerDetail';

export default memo(function InsidersManager() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) return <Navigate to="/app/stocks/insiders" replace />;

  return (
    <div className="px-4 py-4 sm:px-6">
      <ManagerDetail slug={slug} />
    </div>
  );
});
