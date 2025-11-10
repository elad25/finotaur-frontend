// src/components/overview/AnalystDonut.tsx
import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function AnalystDonut({ buy, hold, sell }:{ buy:number; hold:number; sell:number; }){
  const data = [
    { name: 'Buy', value: buy },
    { name: 'Hold', value: hold },
    { name: 'Sell', value: sell },
  ];
  const COLORS = ['#22c55e','#eab308','#ef4444'];
  return (
    <div style={{ width: '100%', height: 140 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
            {data.map((entry, index) => (<Cell key={`c-${index}`} fill={COLORS[index % COLORS.length]} />))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
