import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface CheckboxDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  optionGroups?: Array<{
    title: string;
    options: string[];
  }>;
}

export function CheckboxDropdown({ label, options, selected, onChange, optionGroups }: CheckboxDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const groupedOptions = optionGroups && optionGroups.length
    ? optionGroups
    : [{ title: '', options }];

  const filteredGroups = groupedOptions
    .map((group) => ({
      ...group,
      options: group.options.filter((opt) => opt.toLowerCase().includes(search.toLowerCase())),
    }))
    .filter((group) => group.options.length > 0);

  const filteredOptionsCount = filteredGroups.reduce((sum, group) => sum + group.options.length, 0);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(o => o !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const clearAll = () => onChange([]);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[14px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
        {label}
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full group flex items-center justify-between px-3 py-2 text-[15px] bg-white border border-slate-200 rounded-lg shadow-sm hover:border-slate-300 transition-all ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-500' : ''}`}
      >
        <span className="truncate text-slate-700 font-medium">
          {selected.length === 0 ? 'All' : `${selected.length} Selected`}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 origin-top">
          <div className="p-2 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-[14px] bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
               <button onClick={clearAll} className="text-[12px] font-semibold text-blue-600 hover:text-blue-700">
                Clear All
              </button>
              <span className="text-[12px] text-slate-400 font-medium">{filteredOptionsCount} results</span>
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
            {filteredOptionsCount === 0 ? (
              <div className="px-3 py-4 text-center text-base text-slate-500 italic">No matches found</div>
            ) : (
              filteredGroups.map((group, groupIndex) => (
                <div key={group.title || `group-${groupIndex}`}>
                  {group.title ? (
                    <div className={`px-2.5 py-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400 ${groupIndex > 0 ? 'mt-1 border-t border-slate-100' : ''}`}>
                      {group.title}
                    </div>
                  ) : null}
                  {group.options.map((opt) => {
                    const isSelected = selected.includes(opt);
                    return (
                      <button
                        key={opt}
                        onClick={() => toggleOption(opt)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-[14px] rounded-md transition-colors ${isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                          {isSelected && <Check size={10} className="text-white" />}
                        </div>
                        <span className="truncate">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
