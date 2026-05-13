import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { KPICard } from './KPICard';
import { Sheet, SheetContent } from './ui/sheet';
import { crsFmt } from '../data/crsData';

export type ProjectRecordColumnKey =
  | 'year'
  | 'record'
  | 'donor'
  | 'agency'
  | 'recipient'
  | 'mode'
  | 'flow'
  | 'themes'
  | 'subtags'
  | 'amount';

type SortDirection = 'asc' | 'desc';
type ColumnFilterMode = 'dropdown' | 'text' | 'none';
type ColumnFilters = Record<ProjectRecordColumnKey, string>;

export type ProjectRecordChip = {
  label: string;
  color?: string;
};

export type ProjectRecordDetailRow = {
  label: string;
  value: ReactNode;
};

export type ProjectRecordTableRecord = {
  id: string;
  rowNumber?: string | number;
  year?: number | null;
  title?: string;
  description?: string;
  donor?: string;
  agency?: string;
  recipient?: string;
  mode?: string;
  flow?: string;
  amount: number;
  commitment?: number;
  disbursement?: number;
  commitment_defl?: number;
  disbursement_defl?: number;
  themes?: ProjectRecordChip[];
  subtags?: ProjectRecordChip[];
  markers?: ProjectRecordChip[];
  searchText?: string;
  detailRows?: ProjectRecordDetailRow[];
};

export type ProjectRecordColumnConfig = {
  key: ProjectRecordColumnKey;
  label?: string;
  filter?: ColumnFilterMode;
  align?: 'left' | 'right';
  className?: string;
};

type ProjectRecordColumnInput = ProjectRecordColumnKey | ProjectRecordColumnConfig;

type ProjectRecordsTableProps = {
  records: ProjectRecordTableRecord[];
  columns: ProjectRecordColumnInput[];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
  minWidthClass?: string;
  initialSortKey?: ProjectRecordColumnKey;
};

const DEFAULT_FILTERS: ColumnFilters = {
  year: '',
  record: '',
  donor: '',
  agency: '',
  recipient: '',
  mode: '',
  flow: '',
  themes: '',
  subtags: '',
  amount: '',
};

const DEFAULT_LABELS: Record<ProjectRecordColumnKey, string> = {
  year: 'Year',
  record: 'Record',
  donor: 'Donor',
  agency: 'Agency',
  recipient: 'Recipient',
  mode: 'Mode',
  flow: 'Flow',
  themes: 'Themes',
  subtags: 'Subtags',
  amount: 'Amount',
};

const DEFAULT_WIDTHS: Record<ProjectRecordColumnKey, string> = {
  year: 'w-[7%]',
  record: 'w-[20%]',
  donor: 'w-[13%]',
  agency: 'w-[14%]',
  recipient: 'w-[13%]',
  mode: 'w-[9%]',
  flow: 'w-[10%]',
  themes: 'w-[14%]',
  subtags: 'w-[15%]',
  amount: 'w-[9%]',
};

const DROPDOWN_FILTERS = new Set<ProjectRecordColumnKey>(['year', 'donor', 'agency', 'recipient', 'mode', 'flow', 'themes', 'subtags']);

function normalizeColumn(column: ProjectRecordColumnInput): Required<ProjectRecordColumnConfig> {
  const config = typeof column === 'string' ? { key: column } : column;
  return {
    key: config.key,
    label: config.label ?? DEFAULT_LABELS[config.key],
    filter: config.filter ?? (config.key === 'amount' ? 'none' : DROPDOWN_FILTERS.has(config.key) ? 'dropdown' : 'text'),
    align: config.align ?? (config.key === 'amount' ? 'right' : 'left'),
    className: config.className ?? DEFAULT_WIDTHS[config.key],
  };
}

function textValue(value: unknown) {
  if (value == null) return '';
  return String(value);
}

function chipLabels(chips?: ProjectRecordChip[]) {
  return chips?.map((chip) => chip.label).filter(Boolean) ?? [];
}

function columnText(record: ProjectRecordTableRecord, key: ProjectRecordColumnKey) {
  switch (key) {
    case 'year':
      return textValue(record.year);
    case 'record':
      return [record.title, record.description].filter(Boolean).join(' ');
    case 'donor':
      return textValue(record.donor);
    case 'agency':
      return textValue(record.agency);
    case 'recipient':
      return textValue(record.recipient);
    case 'mode':
      return textValue(record.mode);
    case 'flow':
      return textValue(record.flow);
    case 'themes':
      return chipLabels(record.themes).join(' ');
    case 'subtags':
      return chipLabels(record.subtags).join(' ');
    case 'amount':
      return textValue(record.amount);
  }
}

function sortValue(record: ProjectRecordTableRecord, key: ProjectRecordColumnKey) {
  if (key === 'year') return record.year ?? 0;
  if (key === 'amount') return record.amount ?? 0;
  return columnText(record, key).toLowerCase();
}

function recordSearchText(record: ProjectRecordTableRecord) {
  return (
    record.searchText ??
    [
      record.year,
      record.title,
      record.description,
      record.donor,
      record.agency,
      record.recipient,
      record.mode,
      record.flow,
      chipLabels(record.themes).join(' '),
      chipLabels(record.subtags).join(' '),
    ].join(' ')
  ).toLowerCase();
}

function filterValues(records: ProjectRecordTableRecord[], key: ProjectRecordColumnKey) {
  const values = new Set<string>();
  records.forEach((record) => {
    if (key === 'themes') {
      chipLabels(record.themes).forEach((value) => values.add(value));
      return;
    }
    if (key === 'subtags') {
      chipLabels(record.subtags).forEach((value) => values.add(value));
      return;
    }
    const value = columnText(record, key);
    if (value) values.add(value);
  });
  return [...values].sort((a, b) => {
    if (key === 'year') return Number(b) - Number(a);
    return a.localeCompare(b);
  });
}

function matchesColumnFilter(record: ProjectRecordTableRecord, key: ProjectRecordColumnKey, filterValue: string) {
  if (!filterValue) return true;
  if (key === 'themes') return chipLabels(record.themes).some((label) => label.toLowerCase() === filterValue.toLowerCase());
  if (key === 'subtags') return chipLabels(record.subtags).some((label) => label.toLowerCase() === filterValue.toLowerCase());
  return columnText(record, key).toLowerCase().includes(filterValue.toLowerCase());
}

function ChipList({ chips, emptyLabel, max = 4 }: { chips?: ProjectRecordChip[]; emptyLabel: string; max?: number }) {
  const visibleChips = chips?.filter((chip) => chip.label).slice(0, max) ?? [];
  if (!visibleChips.length) return <span className="text-[12px] text-slate-400">{emptyLabel}</span>;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleChips.map((chip) => (
        <span
          key={chip.label}
          className="rounded-md px-2 py-0.5 text-[10px] font-medium"
          style={{
            backgroundColor: chip.color ?? '#E0F2FE',
            color: chip.color ? '#FFFFFF' : '#0369A1',
            boxShadow: chip.color ? undefined : 'inset 0 0 0 1px #BAE6FD',
          }}
        >
          {chip.label}
        </span>
      ))}
      {(chips?.length ?? 0) > max ? <span className="text-[11px] text-slate-400">+{(chips?.length ?? 0) - max}</span> : null}
    </div>
  );
}

function cellContent(record: ProjectRecordTableRecord, key: ProjectRecordColumnKey) {
  if (key === 'record') {
    return (
      <div className="min-w-0">
        <p className="line-clamp-1 text-[14px] font-medium text-slate-900">{record.title || 'Untitled record'}</p>
        <p className="mt-1 line-clamp-2 text-[13px] text-slate-500">{record.description || 'No description available.'}</p>
      </div>
    );
  }
  if (key === 'amount') return crsFmt.usdM(record.amount || 0);
  if (key === 'themes') return <ChipList chips={record.themes} emptyLabel="No theme assigned" />;
  if (key === 'subtags') return <ChipList chips={record.subtags} emptyLabel="No subtag assigned" />;
  return columnText(record, key) || 'Not specified';
}

export function ProjectRecordsTable({
  records,
  columns,
  title = 'Project Records',
  subtitle = 'Select a project record to view details.',
  emptyMessage = 'No project records match the current filters and search.',
  minWidthClass = 'min-w-[1160px]',
  initialSortKey = 'amount',
}: ProjectRecordsTableProps) {
  const normalizedColumns = useMemo(() => columns.map(normalizeColumn), [columns]);
  const [recordSearch, setRecordSearch] = useState('');
  const [activeRecord, setActiveRecord] = useState<ProjectRecordTableRecord | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [recordSortKey, setRecordSortKey] = useState<ProjectRecordColumnKey>(initialSortKey);
  const [recordSortDirection, setRecordSortDirection] = useState<SortDirection>('desc');
  const [recordColumnFilters, setRecordColumnFilters] = useState<ColumnFilters>(DEFAULT_FILTERS);

  const dropdownOptions = useMemo(() => {
    return normalizedColumns.reduce((options, column) => {
      if (column.filter === 'dropdown') {
        options[column.key] = filterValues(records, column.key);
      }
      return options;
    }, {} as Partial<Record<ProjectRecordColumnKey, string[]>>);
  }, [normalizedColumns, records]);

  const filteredRecords = useMemo(() => {
    const query = recordSearch.trim().toLowerCase();
    const activeFilters = normalizedColumns
      .map((column) => [column.key, recordColumnFilters[column.key]] as const)
      .filter(([, value]) => value.trim().length > 0);

    return [...records]
      .filter((record) => {
        if (query && !recordSearchText(record).includes(query)) return false;
        return activeFilters.every(([key, value]) => matchesColumnFilter(record, key, value));
      })
      .sort((a, b) => {
        const aValue = sortValue(a, recordSortKey);
        const bValue = sortValue(b, recordSortKey);
        const direction = recordSortDirection === 'asc' ? 1 : -1;
        if (typeof aValue === 'number' && typeof bValue === 'number') return (aValue - bValue) * direction;
        return String(aValue).localeCompare(String(bValue)) * direction;
      });
  }, [normalizedColumns, recordColumnFilters, recordSearch, recordSortDirection, recordSortKey, records]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));
  const pagedRecords = filteredRecords.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const hasColumnFilters = normalizedColumns.some((column) => recordColumnFilters[column.key]);

  useEffect(() => {
    setPage(1);
  }, [recordColumnFilters, recordSearch, records, rowsPerPage]);

  function handleRecordSort(key: ProjectRecordColumnKey) {
    if (recordSortKey === key) {
      setRecordSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setRecordSortKey(key);
    setRecordSortDirection(key === 'year' || key === 'amount' ? 'desc' : 'asc');
  }

  function sortIcon(key: ProjectRecordColumnKey) {
    if (recordSortKey !== key) return <ChevronUp size={12} className="text-slate-300" />;
    return recordSortDirection === 'asc'
      ? <ChevronUp size={12} className="text-blue-600" />
      : <ChevronDown size={12} className="text-blue-600" />;
  }

  const detailRows: ProjectRecordDetailRow[] = activeRecord
    ? activeRecord.detailRows ?? [
      { label: 'Donor', value: activeRecord.donor },
      { label: 'Agency', value: activeRecord.agency },
      { label: 'Recipient', value: activeRecord.recipient },
      { label: 'Flow', value: activeRecord.flow },
      { label: 'Mode', value: activeRecord.mode },
      { label: 'Year', value: activeRecord.year },
    ]
    : [];

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-slate-50/50 px-6 py-4 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-lg tracking-tight text-slate-900">{title}</h2>
          <p className="mt-1 text-[14px] text-slate-500">{subtitle}</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <Search size={16} className="text-slate-400" />
            <input
              value={recordSearch}
              onChange={(event) => setRecordSearch(event.target.value)}
              placeholder="Search project records"
              className="w-48 border-none bg-transparent text-[14px] placeholder:text-slate-400 focus:ring-0"
            />
          </div>
          <div className="flex items-center gap-2 text-[13px] text-slate-500">
            <span>Rows</span>
            <select
              value={rowsPerPage}
              onChange={(event) => setRowsPerPage(Number(event.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px] text-slate-700"
            >
              {[25, 50, 100].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          {hasColumnFilters ? (
            <button
              onClick={() => setRecordColumnFilters(DEFAULT_FILTERS)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Clear column filters
            </button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className={`w-full table-fixed border-collapse ${minWidthClass}`}>
          <colgroup>
            {normalizedColumns.map((column) => (
              <col key={column.key} className={column.className} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/40 text-[12px] text-slate-500">
              {normalizedColumns.map((column) => (
                <th key={column.key} className={`px-4 pb-2 pt-4 ${column.align === 'right' ? 'text-right' : 'text-left'}`}>
                  <button
                    type="button"
                    onClick={() => handleRecordSort(column.key)}
                    className={`inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-slate-800 ${
                      column.align === 'right' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span>{column.label}</span>
                    {sortIcon(column.key)}
                  </button>
                </th>
              ))}
            </tr>
            <tr className="border-b border-slate-200 bg-slate-50/40">
              {normalizedColumns.map((column) => (
                <th key={`${column.key}-filter`} className="px-4 pb-3 text-left">
                  {column.filter === 'none' ? (
                    <div className="h-8" aria-hidden="true" />
                  ) : column.filter === 'dropdown' ? (
                    <select
                      value={recordColumnFilters[column.key]}
                      onChange={(event) =>
                        setRecordColumnFilters((current) => ({
                          ...current,
                          [column.key]: event.target.value,
                        }))
                      }
                      className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-[12px] font-medium normal-case tracking-normal text-slate-600 shadow-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">All</option>
                      {(dropdownOptions[column.key] ?? []).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={recordColumnFilters[column.key]}
                      onChange={(event) =>
                        setRecordColumnFilters((current) => ({
                          ...current,
                          [column.key]: event.target.value,
                        }))
                      }
                      placeholder="Filter"
                      className={`h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-[12px] font-medium normal-case tracking-normal text-slate-600 shadow-sm outline-none transition-colors placeholder:text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                        column.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagedRecords.length === 0 ? (
              <tr>
                <td colSpan={normalizedColumns.length} className="px-4 py-20 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pagedRecords.map((record) => (
                <tr
                  key={record.id}
                  onClick={() => setActiveRecord(record)}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                >
                  {normalizedColumns.map((column) => (
                    <td
                      key={`${record.id}-${column.key}`}
                      className={`break-words px-4 py-4 text-[14px] ${column.align === 'right' ? 'text-right font-medium text-slate-900' : 'text-slate-600'}`}
                    >
                      {cellContent(record, column.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-slate-500">
          Showing {filteredRecords.length ? (page - 1) * rowsPerPage + 1 : 0}-
          {Math.min(page * rowsPerPage, filteredRecords.length)} of {filteredRecords.length.toLocaleString()} project records
        </p>
        <div className="flex items-center gap-2 text-[13px] text-slate-500">
          <button
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
          >
            Prev
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <Sheet open={!!activeRecord} onOpenChange={(open) => !open && setActiveRecord(null)}>
        <SheetContent className="border-l border-slate-200 bg-white/95 p-0 shadow-2xl backdrop-blur-xl sm:max-w-2xl">
          {activeRecord ? (
            <div className="flex h-full flex-col">
              <div className="bg-slate-900 p-10 text-white">
                <span className="rounded-full bg-blue-600 px-3 py-1 text-[12px] font-semibold">Record detail</span>
                <h2 className="mt-6 text-2xl font-bold leading-tight tracking-tight text-white">{activeRecord.title || 'Untitled record'}</h2>
              </div>
              <div className="flex-1 space-y-8 overflow-y-auto p-10">
                <div className="grid grid-cols-2 gap-4">
                  <KPICard label="Commitment" value={crsFmt.usdM(activeRecord.commitment_defl ?? activeRecord.commitment ?? 0)} />
                  <KPICard label="Disbursement" value={crsFmt.usdM(activeRecord.disbursement_defl ?? activeRecord.disbursement ?? 0)} />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {detailRows.map((row) => (
                    <div key={row.label}>
                      <p className="text-[12px] font-medium text-slate-500">{row.label}</p>
                      <p className="mt-1 text-[15px] text-slate-900">{row.value || 'Not specified'}</p>
                    </div>
                  ))}
                </div>

                {activeRecord.themes?.length ? (
                  <div>
                    <p className="mb-3 text-[12px] font-medium text-slate-500">Themes</p>
                    <ChipList chips={activeRecord.themes} emptyLabel="No theme assigned" max={30} />
                  </div>
                ) : null}

                {activeRecord.subtags?.length ? (
                  <div>
                    <p className="mb-3 text-[12px] font-medium text-slate-500">Subtags</p>
                    <ChipList chips={activeRecord.subtags} emptyLabel="No subtag assigned" max={30} />
                  </div>
                ) : null}

                {activeRecord.markers?.length ? (
                  <div>
                    <p className="mb-3 text-[12px] font-medium text-slate-500">Sustainability-related Tags</p>
                    <ChipList chips={activeRecord.markers} emptyLabel="No sustainability tag assigned" max={30} />
                  </div>
                ) : null}

                <div>
                  <p className="mb-3 text-[12px] font-medium text-slate-500">Description</p>
                  <div className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-6 text-[15px] leading-relaxed text-slate-700">
                    {activeRecord.description || 'Detailed descriptive metadata not available for this record.'}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}
