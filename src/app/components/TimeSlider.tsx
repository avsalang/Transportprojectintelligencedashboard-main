import React from 'react';

interface TimeSliderProps {
  label: string;
  min: number;
  max: number;
  yearMin: number;
  yearMax: number;
  onChange: (min: number, max: number) => void;
}

export function TimeSlider({ label, min, max, yearMin, yearMax, onChange }: TimeSliderProps) {
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(e.target.value), yearMax - 1);
    onChange(value, yearMax);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(e.target.value), yearMin + 1);
    onChange(yearMin, value);
  };

  const minPct = ((yearMin - min) / (max - min)) * 100;
  const maxPct = ((yearMax - min) / (max - min)) * 100;

  return (
    <div className="px-2 pb-2">
      <div className="flex items-center justify-between mb-3 ml-1">
        <label className="text-[14px] font-semibold text-slate-500">
          {label}
        </label>
        <span className="text-[14px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full ring-1 ring-blue-500/10">
          {yearMin} — {yearMax}
        </span>
      </div>
      
      <div className="relative h-6 flex items-center">
        {/* Track Background */}
        <div className="absolute w-full h-1.5 bg-slate-100 rounded-full" />
        
        {/* Active Track Focus */}
        <div 
          className="absolute h-1.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.3)]"
          style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
        />
        
        {/* Inverted Inputs for Range Interaction */}
        <input
          type="range"
          min={min}
          max={max}
          value={yearMin}
          onChange={handleMinChange}
          className="absolute w-full h-1.5 pointer-events-none appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-125"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={yearMax}
          onChange={handleMaxChange}
          className="absolute w-full h-1.5 pointer-events-none appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-125"
        />
      </div>
      
      <div className="flex justify-between mt-1 px-0.5">
        <span className="text-[12px] font-medium text-slate-400">{min}</span>
        <span className="text-[12px] font-medium text-slate-400">{max}</span>
      </div>
    </div>
  );
}
