export default function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-2 rounded-xl bg-[rgba(255,255,255,0.04)] p-4">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 w-full rounded bg-[rgba(255,255,255,0.08)]" />
      ))}
    </div>
  );
}
