import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Building2, Globe2, Layers3, MapPinned, Table2 } from 'lucide-react';
import { estimateCategoryAxisWidth, WrappedAxisTick, WrappedCategoryTick } from '../components/ChartTicks';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { crsFmt } from '../data/crsData';
import { useCRSFilters } from '../context/CRSFilterContext';
import { aggregateFacts, summarizeFacts, type CRSMeasure } from '../utils/crsAggregations';

type CRSEntityType = 'country' | 'regionalRecipient' | 'broadRegion' | 'donor' | 'agency';

type CRSRecord = {
  id: number;
  year: number | null;
  donor: string;
  donor_original: string;
  agency: string;
  agency_original: string;
  recipient: string;
  recipient_original: string;
  recipient_scope: string;
  recipient_region_detail: string;
  region: string;
  region_original: string;
  recipient_group: string;
  recipient_subgroup: string;
  income_group: string;
  flow: string;
  finance_type: string;
  aid_type: string;
  commitment: number;
  disbursement: number;
  title: string;
  short_description: string;
  purpose: string;
  sector: string;
  channel: string;
  channel_reported: string;
  geography: string;
  expected_start_date: string;
  completion_date: string;
  long_description: string;
  mode: string;
  mode_detail: string;
};

type CRSRecordIndex = {
  version: number;
  totalRecords: number;
  chunks: Array<{
    id: number;
    file: string;
    count: number;
    sizeBytes: number;
  }>;
  entityShardMap: Record<CRSEntityType, Record<string, number[]>>;
};

const ENTITY_META: Record<CRSEntityType, { label: string; description: string }> = {
  country: {
    label: 'Country',
    description: 'Recipient economies included in the current filter state.',
  },
  regionalRecipient: {
    label: 'Regional recipient',
    description: 'Recipient labels coming from `recipient_name` values ending in “, regional”.',
  },
  broadRegion: {
    label: 'Broad region',
    description: 'Top-level regional rollup from the standardized CRS geography layer.',
  },
  donor: {
    label: 'Funding source',
    description: 'Top-level donor or funding institution names in the current filter state.',
  },
  agency: {
    label: 'Agency / financing window',
    description: 'Reported agency labels, windows, funds, ministries, and implementing bodies in the current filter state.',
  },
};

const PAGE_SIZES = [10, 25, 50, 100];

function entityLabelForFact(type: CRSEntityType, fact: any) {
  switch (type) {
    case 'country':
      return fact.recipient_scope === 'economy' ? fact.recipient : '';
    case 'regionalRecipient':
      return fact.recipient_scope === 'regional' ? fact.recipient_region_detail || fact.recipient : '';
    case 'broadRegion':
      return fact.region || 'Unknown';
    case 'donor':
      return fact.donor || 'Unknown';
    case 'agency':
      return fact.agency || 'Unknown';
    default:
      return '';
  }
}

function recordMatchesEntity(record: CRSRecord, type: CRSEntityType, selectedEntity: string) {
  if (!selectedEntity) return false;
  switch (type) {
    case 'country':
      return record.recipient_scope === 'economy' && record.recipient === selectedEntity;
    case 'regionalRecipient':
      return record.recipient_scope === 'regional' && (record.recipient_region_detail || record.recipient) === selectedEntity;
    case 'broadRegion':
      return record.region === selectedEntity;
    case 'donor':
      return record.donor === selectedEntity;
    case 'agency':
      return record.agency === selectedEntity;
    default:
      return false;
  }
}

function formatDateLabel(value: string) {
  return value || '—';
}

export function CRSProfiles() {
  const { filteredFacts, filters } = useCRSFilters();
  const [measure, setMeasure] = useState<CRSMeasure>('commitment');
  const [entityType, setEntityType] = useState<CRSEntityType>('country');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [entitySearch, setEntitySearch] = useState<string>('');
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [page, setPage] = useState<number>(1);
  const [recordIndex, setRecordIndex] = useState<CRSRecordIndex | null>(null);
  const [recordChunks, setRecordChunks] = useState<Record<string, CRSRecord[]>>({});
  const [indexLoading, setIndexLoading] = useState<boolean>(true);
  const [recordsLoading, setRecordsLoading] = useState<boolean>(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [activeRecord, setActiveRecord] = useState<CRSRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadRecordIndex() {
      try {
        setIndexLoading(true);
        setRecordsError(null);
        const response = await fetch(`${import.meta.env.BASE_URL}data/crs-records/index.json`);
        if (!response.ok) throw new Error(`Failed to load CRS record index (${response.status})`);
        const payload = (await response.json()) as CRSRecordIndex;
        if (!cancelled) setRecordIndex(payload);
      } catch (error) {
        if (!cancelled) setRecordsError(error instanceof Error ? error.message : 'Unable to load CRS records');
      } finally {
        if (!cancelled) setIndexLoading(false);
      }
    }
    void loadRecordIndex();
    return () => {
      cancelled = true;
    };
  }, []);

  const entityOptions = useMemo(() => {
    return aggregateFacts(filteredFacts, (fact) => entityLabelForFact(entityType, fact))
      .filter((item) => item.label)
      .slice(0, 240);
  }, [entityType, filteredFacts]);

  const filteredEntityOptions = useMemo(() => {
    const query = entitySearch.trim().toLowerCase();
    if (!query) return entityOptions;
    return entityOptions.filter((item) => item.label.toLowerCase().includes(query));
  }, [entityOptions, entitySearch]);

  useEffect(() => {
    if (!selectedEntity && entityOptions[0]) setSelectedEntity(entityOptions[0].label);
  }, [entityOptions, selectedEntity]);

  useEffect(() => {
    if (selectedEntity && !entityOptions.some((item) => item.label === selectedEntity)) {
      setSelectedEntity(entityOptions[0]?.label ?? '');
    }
  }, [entityOptions, selectedEntity]);

  useEffect(() => {
    setPage(1);
  }, [entityType, selectedEntity, rowsPerPage, measure, filters]);

  useEffect(() => {
    setEntitySearch('');
  }, [entityType]);

  const subset = useMemo(
    () => filteredFacts.filter((fact) => entityLabelForFact(entityType, fact) === selectedEntity),
    [entityType, filteredFacts, selectedEntity],
  );

  const stats = useMemo(() => summarizeFacts(subset), [subset]);

  const counterpartRanking = useMemo(() => {
    if (entityType === 'donor' || entityType === 'agency') {
      return aggregateFacts(subset, (fact) =>
        fact.recipient_scope === 'regional' ? fact.recipient_region_detail || fact.recipient : fact.recipient,
      ).slice(0, 12);
    }
    return aggregateFacts(subset, (fact) => fact.donor).slice(0, 12);
  }, [entityType, subset]);

  const modeRanking = useMemo(() => aggregateFacts(subset, (fact) => fact.mode).slice(0, 8), [subset]);
  const flowRanking = useMemo(() => aggregateFacts(subset, (fact) => fact.flow).slice(0, 8), [subset]);
  const relationshipRanking = useMemo(() => {
    if (entityType === 'donor') {
      return aggregateFacts(subset, (fact) => fact.agency || 'Unknown').slice(0, 10);
    }
    if (entityType === 'agency') {
      return aggregateFacts(subset, (fact) => fact.donor || 'Unknown').slice(0, 10);
    }
    if (entityType === 'country' || entityType === 'regionalRecipient' || entityType === 'broadRegion') {
      return aggregateFacts(subset, (fact) => fact.agency || 'Unknown').slice(0, 10);
    }
    return [];
  }, [entityType, subset]);

  const counterpartLabel =
    entityType === 'donor' || entityType === 'agency' ? 'Top recipients' : 'Top donors';
  const counterpartAxisWidth = useMemo(
    () => estimateCategoryAxisWidth(counterpartRanking.map((item) => item.label), { maxChars: 18, minWidth: 180, maxWidth: 248 }),
    [counterpartRanking],
  );
  const relationshipLabel =
    entityType === 'donor'
      ? 'Top agencies / windows'
      : entityType === 'agency'
        ? 'Top funding sources'
        : 'Top agencies / windows';
  const relationshipAxisWidth = useMemo(
    () => estimateCategoryAxisWidth(relationshipRanking.map((item) => item.label), { maxChars: 18, minWidth: 180, maxWidth: 248 }),
    [relationshipRanking],
  );

  const selectedMeta = ENTITY_META[entityType];
  const selectedEntityMetrics = useMemo(
    () => entityOptions.find((option) => option.label === selectedEntity) ?? null,
    [entityOptions, selectedEntity],
  );
  const activeShardIds = useMemo(
    () => recordIndex?.entityShardMap?.[entityType]?.[selectedEntity] ?? [],
    [entityType, recordIndex, selectedEntity],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadMissingShards() {
      if (!recordIndex || !activeShardIds.length) {
        setRecordsLoading(false);
        return;
      }

      const missingShardIds = activeShardIds.filter((id) => !recordChunks[String(id)]);
      if (!missingShardIds.length) {
        setRecordsLoading(false);
        return;
      }

      try {
        setRecordsLoading(true);
        setRecordsError(null);
        const loaded = await Promise.all(
          missingShardIds.map(async (id) => {
            const chunk = recordIndex.chunks.find((entry) => entry.id === id);
            if (!chunk) {
              throw new Error(`Missing chunk metadata for shard ${id}`);
            }
            const response = await fetch(`${import.meta.env.BASE_URL}${chunk.file}`);
            if (!response.ok) throw new Error(`Failed to load CRS records shard ${id} (${response.status})`);
            const payload = (await response.json()) as CRSRecord[];
            return [String(id), payload] as const;
          }),
        );
        if (!cancelled) {
          setRecordChunks((prev) => {
            const next = { ...prev };
            loaded.forEach(([id, payload]) => {
              next[id] = payload;
            });
            return next;
          });
        }
      } catch (error) {
        if (!cancelled) setRecordsError(error instanceof Error ? error.message : 'Unable to load CRS records');
      } finally {
        if (!cancelled) setRecordsLoading(false);
      }
    }

    void loadMissingShards();
    return () => {
      cancelled = true;
    };
  }, [activeShardIds, recordChunks, recordIndex]);

  const records = useMemo(
    () => activeShardIds.flatMap((id) => recordChunks[String(id)] ?? []),
    [activeShardIds, recordChunks],
  );

  const filteredRecords = useMemo(() => {
    return records
      .filter((record) => {
        if (filters.donors.length && !filters.donors.includes(record.donor)) return false;
        if (filters.regions.length && !filters.regions.includes(record.region || 'Unknown')) return false;
        if (filters.regionDetails.length && !filters.regionDetails.includes(record.recipient_region_detail || '')) return false;
        if (filters.modes.length && !filters.modes.includes(record.mode || 'Other')) return false;
        if (filters.scopes.length && !filters.scopes.includes(record.recipient_scope || 'unknown')) return false;
        if (filters.yearMin) {
          const minYear = parseInt(filters.yearMin, 10);
          if (!Number.isNaN(minYear) && (record.year ?? 0) < minYear) return false;
        }
        if (filters.yearMax) {
          const maxYear = parseInt(filters.yearMax, 10);
          if (!Number.isNaN(maxYear) && (record.year ?? 0) > maxYear) return false;
        }
        return recordMatchesEntity(record, entityType, selectedEntity);
      })
      .sort((a, b) => {
        const measureDiff = (b[measure] ?? 0) - (a[measure] ?? 0);
        if (measureDiff !== 0) return measureDiff;
        return (b.year ?? 0) - (a.year ?? 0);
      });
  }, [entityType, filters, measure, records, selectedEntity]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pagedRecords = filteredRecords.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-slate-900 text-xl font-semibold">Entity Deep Dive</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Drill into countries, regional recipients, broad regions, and organizations with the current global CRS filters applied.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={entityType}
            onChange={(event) => setEntityType(event.target.value as CRSEntityType)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm min-w-[210px] bg-white"
          >
            {Object.entries(ENTITY_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <input
            value={entitySearch}
            onChange={(event) => setEntitySearch(event.target.value)}
            placeholder={`Search ${selectedMeta.label.toLowerCase()}...`}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm min-w-[240px] bg-white"
          />
          <select
            value={selectedEntity}
            onChange={(event) => setSelectedEntity(event.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm min-w-[280px] bg-white"
          >
            {filteredEntityOptions.map((option) => (
              <option key={option.label} value={option.label}>
                {option.label} · {crsFmt.usdM(option[measure])} · {crsFmt.num(option.count)} records
              </option>
            ))}
          </select>
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setMeasure('commitment')}
              className={`px-3 py-1.5 text-xs rounded-md ${measure === 'commitment' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Commitments
            </button>
            <button
              onClick={() => setMeasure('disbursement')}
              className={`px-3 py-1.5 text-xs rounded-md ${measure === 'disbursement' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Disbursements
            </button>
          </div>
        </div>
      </div>

      {(entityType === 'donor' || entityType === 'agency') ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-amber-900 text-sm font-semibold">
            {entityType === 'donor' ? 'Funding source view' : 'Agency / financing window view'}
          </p>
          <p className="text-amber-800 text-sm mt-1">
            {entityType === 'donor'
              ? 'This view groups records by the top-level donor or institution. A single funding source can contain many reported agencies, windows, funds, or ministries underneath it.'
              : 'This view groups records by the reported agency label in CRS. These labels can include true agencies, financing windows, trust funds, ministries, or other reporting buckets, so they may look more mixed than donor names.'}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-slate-500 text-xs uppercase tracking-wider">Selected entity</p>
          <div className="flex items-center gap-2 mt-3">
            {entityType === 'country' ? <MapPinned size={16} className="text-emerald-600" /> : null}
            {entityType === 'regionalRecipient' ? <Layers3 size={16} className="text-emerald-600" /> : null}
            {entityType === 'broadRegion' ? <Globe2 size={16} className="text-emerald-600" /> : null}
            {(entityType === 'donor' || entityType === 'agency') ? <Building2 size={16} className="text-emerald-600" /> : null}
            <div>
              <p className="text-slate-900 text-lg font-semibold">{selectedEntity || '—'}</p>
              <p className="text-slate-500 text-xs mt-0.5">{selectedMeta.label}</p>
              {selectedEntityMetrics ? (
                <p className="text-slate-400 text-xs mt-1">
                  {crsFmt.num(selectedEntityMetrics.count)} records in current filtered view
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-slate-500 text-xs uppercase tracking-wider">Commitments</p>
          <p className="text-slate-900 text-2xl font-semibold mt-3">{crsFmt.usdM(stats.commitment)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-slate-500 text-xs uppercase tracking-wider">Disbursements</p>
          <p className="text-slate-900 text-2xl font-semibold mt-3">{crsFmt.usdM(stats.disbursement)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-slate-500 text-xs uppercase tracking-wider">Underlying records</p>
          <p className="text-slate-900 text-2xl font-semibold mt-3">{indexLoading || recordsLoading ? '…' : crsFmt.num(filteredRecords.length)}</p>
          <p className="text-slate-500 text-xs mt-1">{selectedMeta.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-slate-800 text-sm font-semibold mb-1">{counterpartLabel}</p>
          <p className="text-slate-400 text-xs mb-4">Largest connected entities under the current selection</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={counterpartRanking} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={<WrappedCategoryTick maxChars={18} />} tickLine={false} axisLine={false} width={counterpartAxisWidth} interval={0} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} formatter={(value: number) => [crsFmt.usdM(value), measure === 'commitment' ? 'Commitments' : 'Disbursements']} />
              <Bar dataKey={measure} radius={[0, 3, 3, 0]} maxBarSize={15}>
                {counterpartRanking.map((row) => (
                  <Cell key={row.label} fill="#0F766E" fillOpacity={0.84} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-slate-800 text-sm font-semibold mb-1">{relationshipLabel}</p>
          <p className="text-slate-400 text-xs mb-4">
            {entityType === 'donor'
              ? 'How this funding source breaks down across reported agencies and financing windows'
              : entityType === 'agency'
                ? 'Which funding sources are using this agency / financing window label'
                : 'Agencies and financing windows most associated with this selection'}
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={relationshipRanking} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={<WrappedCategoryTick maxChars={18} />} tickLine={false} axisLine={false} width={relationshipAxisWidth} interval={0} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} formatter={(value: number) => [crsFmt.usdM(value), measure === 'commitment' ? 'Commitments' : 'Disbursements']} />
              <Bar dataKey={measure} radius={[0, 3, 3, 0]} maxBarSize={15}>
                {relationshipRanking.map((row) => (
                  <Cell key={row.label} fill="#2563EB" fillOpacity={0.78} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-slate-800 text-sm font-semibold mb-1">Mode Mix</p>
          <p className="text-slate-400 text-xs mb-4">Transport composition inside the selected entity</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={modeRanking}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="label" tick={<WrappedAxisTick maxChars={12} />} tickLine={false} axisLine={false} height={78} interval={0} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} formatter={(value: number) => [crsFmt.usdM(value), measure === 'commitment' ? 'Commitments' : 'Disbursements']} />
              <Bar dataKey={measure} radius={[6, 6, 0, 0]}>
                {modeRanking.map((row) => (
                  <Cell key={row.label} fill="#059669" fillOpacity={0.84} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-slate-800 text-sm font-semibold mb-1">Financing Mix</p>
          <p className="text-slate-400 text-xs mb-4">How support is delivered into this selected entity</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={flowRanking}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="label" tick={<WrappedAxisTick maxChars={12} />} tickLine={false} axisLine={false} height={78} interval={0} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} formatter={(value: number) => [crsFmt.usdM(value), measure === 'commitment' ? 'Commitments' : 'Disbursements']} />
              <Bar dataKey={measure} radius={[6, 6, 0, 0]}>
                {flowRanking.map((row) => (
                  <Cell key={row.label} fill="#10B981" fillOpacity={0.84} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Table2 size={14} className="text-emerald-600" />
            <div>
              <p className="text-slate-900 text-sm font-semibold">Underlying Records</p>
              <p className="text-slate-400 text-xs mt-0.5">
                Full CRS rows matching the current selection and filters. Click a row to open the original entry.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Exploring by</p>
              <p className="text-sm text-slate-700 font-medium">{selectedMeta.label}</p>
            </div>
            <label className="text-xs text-slate-500">Rows per page</label>
            <select
              value={rowsPerPage}
              onChange={(event) => setRowsPerPage(Number(event.target.value))}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        {indexLoading || recordsLoading ? (
          <div className="px-5 py-14 text-sm text-slate-500">Loading CRS records for the deep dive…</div>
        ) : recordsError ? (
          <div className="px-5 py-14 text-sm text-rose-600">{recordsError}</div>
        ) : (
          <>
            <div className="px-5 py-3 text-xs text-slate-500 border-b border-slate-100 flex items-center justify-between">
              <span>
                Showing {(currentPage - 1) * rowsPerPage + (pagedRecords.length ? 1 : 0)}–
                {Math.min(currentPage * rowsPerPage, filteredRecords.length)} of {filteredRecords.length} records
              </span>
              <span>{selectedMeta.label}: {selectedEntity || '—'}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-slate-500 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 font-medium">Year</th>
                    <th className="px-4 py-3 font-medium">Donor</th>
                    <th className="px-4 py-3 font-medium">Agency</th>
                    <th className="px-4 py-3 font-medium">Recipient</th>
                    <th className="px-4 py-3 font-medium">Mode</th>
                    <th className="px-4 py-3 font-medium">Flow</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Title / Description</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-slate-100 align-top cursor-pointer hover:bg-slate-50"
                      onClick={() => setActiveRecord(record)}
                    >
                      <td className="px-4 py-3 text-slate-600">{record.year ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-800 font-medium">{record.donor}</td>
                      <td className="px-4 py-3 text-slate-600">{record.agency}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <div>{record.recipient}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{record.region}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div>{record.mode}</div>
                        {record.mode_detail && record.mode_detail !== record.mode ? (
                          <div className="text-xs text-slate-400 mt-0.5">{record.mode_detail}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{record.flow}</td>
                      <td className="px-4 py-3 text-slate-800 font-medium">{crsFmt.usdM(record[measure])}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[420px]">
                        <div className="font-medium text-slate-800">{record.title || 'Untitled record'}</div>
                        <div className="text-xs text-slate-500 mt-1">{record.short_description || 'No description available.'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500">Page {currentPage} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Sheet open={Boolean(activeRecord)} onOpenChange={(open) => !open && setActiveRecord(null)}>
        <SheetContent side="right" className="sm:max-w-xl bg-white">
          {activeRecord ? (
            <>
              <SheetHeader className="border-b border-slate-100">
                <SheetTitle className="text-slate-900">{activeRecord.title || 'Untitled CRS entry'}</SheetTitle>
                <SheetDescription className="text-slate-500">
                  Full original-entry detail for the selected CRS transport record.
                </SheetDescription>
              </SheetHeader>
              <div className="p-5 space-y-5 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Commitment</p>
                    <p className="text-slate-900 text-sm font-semibold mt-1">{crsFmt.usdM(activeRecord.commitment)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Disbursement</p>
                    <p className="text-slate-900 text-sm font-semibold mt-1">{crsFmt.usdM(activeRecord.disbursement)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Donor</p>
                    <p className="text-slate-900">{activeRecord.donor}</p>
                    <p className="text-slate-500 text-xs mt-1">Top-level funding source</p>
                    {activeRecord.donor_original && activeRecord.donor_original !== activeRecord.donor ? (
                      <p className="text-slate-500 text-xs mt-1">Original: {activeRecord.donor_original}</p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Agency</p>
                    <p className="text-slate-900">{activeRecord.agency}</p>
                    <p className="text-slate-500 text-xs mt-1">Reported agency / financing window label</p>
                    {activeRecord.agency_original && activeRecord.agency_original !== activeRecord.agency ? (
                      <p className="text-slate-500 text-xs mt-1">Original: {activeRecord.agency_original}</p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Recipient</p>
                    <p className="text-slate-900">{activeRecord.recipient}</p>
                    <p className="text-slate-500 text-xs mt-1">
                      {activeRecord.recipient_scope} • {activeRecord.region}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Year</p>
                    <p className="text-slate-900">{activeRecord.year ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Mode</p>
                    <p className="text-slate-900">{activeRecord.mode}</p>
                    <p className="text-slate-500 text-xs mt-1">{activeRecord.mode_detail || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Flow</p>
                    <p className="text-slate-900">{activeRecord.flow}</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Short description</p>
                    <p className="text-slate-700 leading-6">{activeRecord.short_description || 'No short description available.'}</p>
                  </div>
                  {activeRecord.long_description ? (
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Long description</p>
                      <p className="text-slate-700 leading-6 whitespace-pre-wrap">{activeRecord.long_description}</p>
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Purpose</p>
                    <p className="text-slate-900">{activeRecord.purpose || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Sector</p>
                    <p className="text-slate-900">{activeRecord.sector || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Finance type</p>
                    <p className="text-slate-900">{activeRecord.finance_type || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Aid type</p>
                    <p className="text-slate-900">{activeRecord.aid_type || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Channel</p>
                    <p className="text-slate-900">{activeRecord.channel || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Channel reported</p>
                    <p className="text-slate-900">{activeRecord.channel_reported || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Geography</p>
                    <p className="text-slate-900">{activeRecord.geography || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Income group</p>
                    <p className="text-slate-900">{activeRecord.income_group || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Expected start</p>
                    <p className="text-slate-900">{formatDateLabel(activeRecord.expected_start_date)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Completion</p>
                    <p className="text-slate-900">{formatDateLabel(activeRecord.completion_date)}</p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
