import { ReactNode } from 'react';

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: string;
}

export const KPICard = ({ label, value, sub, trend }: KPICardProps) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div>
        <p className="text-slate-500 text-[14px]">{label}</p>
      </div>
      <div>
        <p className="text-slate-900 text-2xl font-medium tabular-nums leading-none">{value}</p>
        {sub && <p className="text-slate-500 text-[15px] mt-1 font-normal">{sub}</p>}
      </div>
      {trend && (
        <p className="text-emerald-600 text-[15px] font-medium">{trend}</p>
      )}
    </div>
  );
}
