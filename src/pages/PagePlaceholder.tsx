// src/pages/PagePlaceholder.tsx
import React from "react";
import { useLocation } from "react-router-dom";

const PagePlaceholder: React.FC<{ title?: string }> = ({ title }) => {
  const loc = useLocation();
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">{title ?? "Coming Soon"}</h1>
      <p className="text-sm text-zinc-400">
        This route is wired ({loc.pathname}). We kept your design intact and only added the 2‑layer navigation.
        Hook your existing widgets/data here when ready.
      </p>
    </div>
  );
};

export default PagePlaceholder;
