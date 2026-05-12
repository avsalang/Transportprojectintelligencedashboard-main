import React from 'react';
import { ChevronDown } from 'lucide-react';

interface YearRangeSelectorProps {
  label: string;
  min: number;
  max: number;
  yearMin: number;
  yearMax: number;
  onChange: (min: number, max: number) => void;
}

export function YearRangeSelector({ label, min, max, yearMin, yearMax, onChange }: YearRangeSelectorProps) {
  const years = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  const handleStartChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMin = Number(e.target.value);
    onChange(newMin, Math.max(newMin, yearMax));
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMax = Number(e.target.value);
    onChange(Math.min(newMax, yearMin), newMax);
  };

  return (
    <div>
      <label className="mb-1.5 ml-1 block whitespace-nowrap text-[13px] font-semibold text-slate-500">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 group">
          <select
            value={yearMin}
            onChange={handleStartChange}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-[14px] font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <ChevronDown 
            size={16} 
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-600 pointer-events-none transition-colors" 
          />
        </div>
        
        <div className="text-slate-300 font-medium">—</div>

        <div className="relative flex-1 group">
          <select
            value={yearMax}
            onChange={handleEndChange}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-[14px] font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <ChevronDown 
            size={16} 
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-600 pointer-events-none transition-colors" 
          />
        </div>
      </div>
    </div>
  );
}
