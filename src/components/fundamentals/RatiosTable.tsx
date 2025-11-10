import SkeletonBlock from './SkeletonBlock';

export default function RatiosTable({ data, isLoading }: { data: any; isLoading: boolean }) {
  if (isLoading) return <SkeletonBlock lines={8} />;
  if (!data?.ratios) return null;

  const rows = data.ratios || [];
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] p-2">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r: any, idx: number) => (
            <tr key={idx} className="border-b border-[rgba(255,255,255,0.06)]">
              <td className="p-2 text-zinc-300">{r.label}</td>
              <td className="p-2 text-right text-white">{r.value ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
