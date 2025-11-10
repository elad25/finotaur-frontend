import { AreaChart, Area, ResponsiveContainer } from "recharts";

export default function Spark({ data = [], dataKey = "value", height = 28 }: any) {
  if (!Array.isArray(data) || data.length < 2) return <div className="h-[28px]" />;
  return (
    <div className="h-[28px]">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <Area type="monotone" dataKey={dataKey} fillOpacity={0.15} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
