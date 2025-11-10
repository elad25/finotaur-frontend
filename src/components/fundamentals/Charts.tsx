// src/components/fundamentals/Charts.tsx
import React from "react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar } from "recharts";
type Row={endDate:string;revenue?:number|null;netIncome?:number|null;grossMargin?:number|null;operatingMargin?:number|null;netMargin?:number|null;totalDebt?:number|null;equity?:number|null;eps?:number|null;opCF?:number|null;capex?:number|null;};
export const Charts:React.FC<{rows:Row[]}> = ({rows})=>{
  const data=[...rows].reverse().map(r=>({date:r.endDate?.slice(0,10),revenue:r.revenue??null,netIncome:r.netIncome??null,grossMargin:r.grossMargin!=null?r.grossMargin*100:null,operatingMargin:r.operatingMargin!=null?r.operatingMargin*100:null,netMargin:r.netMargin!=null?r.netMargin*100:null,totalDebt:r.totalDebt??null,equity:r.equity??null,eps:r.eps??null,opCF:r.opCF??null,capex:r.capex!=null?-Math.abs(r.capex):null,}));
  return (<div className="space-y-6">
    <Section title="Revenue vs Net Income"><ResponsiveContainer width="100%" height={260}><AreaChart data={data}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Legend/><Area type="monotone" dataKey="revenue"/><Area type="monotone" dataKey="netIncome"/></AreaChart></ResponsiveContainer></Section>
    <Section title="Margins Over Time"><ResponsiveContainer width="100%" height={260}><LineChart data={data}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Legend/><Line type="monotone" dataKey="grossMargin"/><Line type="monotone" dataKey="operatingMargin"/><Line type="monotone" dataKey="netMargin"/></LineChart></ResponsiveContainer></Section>
    <Section title="Debt vs Equity"><ResponsiveContainer width="100%" height={260}><LineChart data={data}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Legend/><Line type="monotone" dataKey="totalDebt"/><Line type="monotone" dataKey="equity"/></LineChart></ResponsiveContainer></Section>
    <Section title="Cash Flow Breakdown (OpCF vs Capex)"><ResponsiveContainer width="100%" height={260}><BarChart data={data}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Legend/><Bar dataKey="opCF"/><Bar dataKey="capex"/></BarChart></ResponsiveContainer></Section>
  </div>);
};
const Section:React.FC<{title:string;children:React.ReactNode}> = ({title,children})=> (<div className="rounded-xl border border-zinc-800 p-4"><div className="text-sm font-semibold mb-2">{title}</div>{children}</div>);
export default Charts;
