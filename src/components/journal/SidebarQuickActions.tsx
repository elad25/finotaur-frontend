import React from "react";
import { Link } from "react-router-dom";

export default function SidebarQuickActions(){
  const btn = (to:string, label:string, cls:string) => (
    <Link to={to}
      className={`mt-2 block rounded-full px-3 py-1.5 text-center text-sm font-medium transition ${cls}`}>
      {label}
    </Link>
  );
  return (
    <div className="px-3 pt-2">
      {btn('/app/journal/new?side=long', 'LONG TRADE', 'bg-[#00C46C] text-black hover:brightness-110')}
      {btn('/app/journal/new?side=short', 'SHORT TRADE', 'bg-[#E44545] text-white hover:brightness-110')}
    </div>
  );
}
