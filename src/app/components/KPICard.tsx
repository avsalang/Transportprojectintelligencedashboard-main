import { ReactNode } from 'react';

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  accent?: string; // tailwind color class e.g. "blue"
  trend?: string;
}

export function KPICard({ label, value, sub, icon, accent = 'blue', trend }: KPICardProps) {
  const accentMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    purple: 'bg-violet-50 text-violet-600 border-violet-100',
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <p className="text-slate-500 text-xs uppercase tracking-wider">{label}</p>
        {icon && (
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center border ${accentMap[accent]}`}>
            {icon}
          </span>
        )}
      </div>
      <div>
        <p className="text-slate-900 text-2xl font-semibold tabular-nums leading-none">{value}</p>
        {sub && <p className="text-slate-400 text-xs mt-1">{sub}</p>}
      </div>
      {trend && (
        <p className="text-emerald-600 text-xs">{trend}</p>
      )}
    </div>
  );
}
