import React from 'react';

export const Block = ({ h = 120 }: { h?: number }) => (
  <div
    className="rounded-2xl border border-zinc-800 bg-zinc-900/30 animate-pulse"
    style={{ height: h }}
  />
);

export const BlockSkeleton = ({ h = 120 }: { h?: number }) => <Block h={h} />;

export const CardSkeleton = () => (
  <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 animate-pulse">
    <div className="h-3 w-2/3 rounded bg-zinc-800 mb-2" />
    <div className="h-5 w-1/2 rounded bg-zinc-800" />
  </div>
);
