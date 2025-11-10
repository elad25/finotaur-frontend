import SkeletonBlock from './SkeletonBlock';

export default function PeersTable({ data, isLoading }: { data: any; isLoading: boolean }) {
  if (isLoading) return <SkeletonBlock lines={6} />;
  if (!data?.peers) return null;

  const rows = data.peers || [];
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] p-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-zinc-400">
            <th className="p-2 text-left font-normal">Symbol</th>
            <th className="p-2 text-right font-normal">Market Cap</th>
            <th className="p-2 text-right font-normal">P/E</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, idx: number) => (
            <tr key={idx} className="border-b border-[rgba(255,255,255,0.06)]">
              <td className="p-2 text-zinc-300">{r.symbol}</td>
              <td className="p-2 text-right text-white">{r.marketCap ?? '—'}</td>
              <td className="p-2 text-right text-white">{r.pe ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
