import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export type BasisMeasure = 'commitment_defl' | 'disbursement_defl';
type SupportedMeasure = BasisMeasure | 'commitment' | 'disbursement';

type BasisDropdownProps = {
  label?: string;
  value: SupportedMeasure;
  onChange: (value: BasisMeasure) => void;
  className?: string;
};

const OPTIONS: Array<{ value: BasisMeasure; label: string }> = [
  { value: 'commitment_defl', label: 'Commitments' },
  { value: 'disbursement_defl', label: 'Disbursements' },
];

export function BasisDropdown({ label = 'Basis', value, onChange, className = '' }: BasisDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const normalizedValue: BasisMeasure = value.includes('disbursement') ? 'disbursement_defl' : 'commitment_defl';
  const selectedLabel = OPTIONS.find((option) => option.value === normalizedValue)?.label ?? 'Commitments';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label ? (
        <label className="mb-1.5 ml-1 block whitespace-nowrap text-[14px] font-semibold text-slate-500">
          {label}
        </label>
      ) : null}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`group flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-[15px] shadow-sm transition-all hover:border-slate-300 ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : ''
        }`}
      >
        <span className="truncate font-medium text-slate-700">{selectedLabel}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen ? (
        <div className="absolute z-50 mt-2 w-full origin-top overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in duration-200">
          <div className="p-1">
            {OPTIONS.map((option) => {
              const isSelected = option.value === normalizedValue;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2.5 rounded-md px-2.5 py-2 text-[14px] transition-colors ${
                    isSelected ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected ? <Check size={14} className="flex-shrink-0 text-blue-600" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
