import SkeletonBlock from './SkeletonBlock';

export default function StatementsCompact({ data, isLoading }: { data: any; isLoading: boolean }) {
  if (isLoading) return <SkeletonBlock lines={10} />;
  if (!data?.statements) return null;

  const s = data.statements;
  // Replace with your existing compact statements table component
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] p-4">
      <div className="mb-2 text-sm font-medium text-zinc-200">Financial Statements (compact)</div>
      <div className="text-xs text-zinc-400">[Table placeholder for IS / BS / CF with latest few periods]</div>
    </div>
  );
}
