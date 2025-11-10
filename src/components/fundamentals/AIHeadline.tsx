
import React from 'react';
const AIHeadline: React.FC<{ text?: string | null }> = ({ text }) => {
  if (!text) return null;
  return (
    <div className="rounded-xl border border-zinc-800 p-3 bg-zinc-900/40">
      <div className="text-sm">
        <span className="font-semibold">AI Summary: </span>
        <span className="opacity-90">{text}</span>
      </div>
    </div>
  );
};
export default AIHeadline;
