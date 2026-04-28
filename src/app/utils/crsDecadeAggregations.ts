import { CRSDecadeRecord, CRSDecadeThemeId, CRS_DECADE_THEMES } from '../data/crsDecadeData';
import { CRSFilters } from './crsFiltering';

export type CRSDecadeMeasure = 'commitment' | 'disbursement' | 'commitment_defl' | 'disbursement_defl';

export type DecadeAggregateRow = {
  label: string;
  commitment: number;
  disbursement: number;
  commitment_defl: number;
  disbursement_defl: number;
  count: number;
};

export function getDecadeThemeIds(record: CRSDecadeRecord): CRSDecadeThemeId[] {
  return CRS_DECADE_THEMES
    .filter((theme) => record[theme.id])
    .map((theme) => theme.id);
}

export function matchesDecadeFilters(
  record: CRSDecadeRecord,
  filters: CRSFilters,
  selectedThemes: CRSDecadeThemeId[],
) {
  if (filters.donors.length && !filters.donors.includes(record.donor)) return false;
  if (filters.agencies.length && !filters.agencies.includes(record.agency || 'Unknown')) return false;
  if (filters.recipients.length && !filters.recipients.includes(record.recipient || 'Unknown')) return false;
  if (filters.modes.length && !filters.modes.includes(record.mode || 'Other')) return false;
  if (filters.flows.length && !filters.flows.includes(record.flow || 'Unknown')) return false;
  if (record.year && (record.year < filters.yearMin || record.year > filters.yearMax)) return false;

  if (filters.sectors.length) {
    const sustainabilityTags: string[] = [];
    if ((record.climate_mitigation ?? 0) > 0) sustainabilityTags.push('Mitigation');
    if ((record.climate_adaptation ?? 0) > 0) sustainabilityTags.push('Adaptation');
    if ((record.gender ?? 0) > 0) sustainabilityTags.push('Gender');
    if ((record.drr ?? 0) > 0) sustainabilityTags.push('DRR');
    if ((record.biodiversity ?? 0) > 0) sustainabilityTags.push('Biodiversity');
    if ((record.environment ?? 0) > 0) sustainabilityTags.push('Environment');
    if (!filters.sectors.some((tag) => sustainabilityTags.includes(tag))) return false;
  }

  if (selectedThemes.length && !selectedThemes.some((theme) => record[theme])) return false;
  return true;
}

export function summarizeDecadeRecords(records: CRSDecadeRecord[], measure: CRSDecadeMeasure) {
  const donors = new Set<string>();
  const recipients = new Set<string>();
  let commitment = 0;
  let disbursement = 0;
  let commitment_defl = 0;
  let disbursement_defl = 0;
  let taggedCount = 0;
  let taggedMeasure = 0;

  records.forEach((record) => {
    donors.add(record.donor);
    recipients.add(record.recipient);
    commitment += record.commitment;
    disbursement += record.disbursement;
    commitment_defl += record.commitment_defl;
    disbursement_defl += record.disbursement_defl;
    if (getDecadeThemeIds(record).length) {
      taggedCount += 1;
      taggedMeasure += record[measure] ?? 0;
    }
  });

  return {
    commitment,
    disbursement,
    commitment_defl,
    disbursement_defl,
    count: records.length,
    taggedCount,
    taggedMeasure,
    donorCount: donors.size,
    recipientCount: recipients.size,
  };
}

export function aggregateDecade(
  records: CRSDecadeRecord[],
  getKey: (record: CRSDecadeRecord) => string,
): DecadeAggregateRow[] {
  const grouped = new Map<string, DecadeAggregateRow>();
  records.forEach((record) => {
    const key = getKey(record) || 'Unknown';
    if (!grouped.has(key)) {
      grouped.set(key, {
        label: key,
        commitment: 0,
        disbursement: 0,
        commitment_defl: 0,
        disbursement_defl: 0,
        count: 0,
      });
    }
    const entry = grouped.get(key)!;
    entry.commitment += record.commitment;
    entry.disbursement += record.disbursement;
    entry.commitment_defl += record.commitment_defl;
    entry.disbursement_defl += record.disbursement_defl;
    entry.count += 1;
  });
  return [...grouped.values()].sort((a, b) => b.commitment - a.commitment);
}

export function aggregateByTheme(records: CRSDecadeRecord[]): DecadeAggregateRow[] {
  const grouped = new Map<string, DecadeAggregateRow>(
    CRS_DECADE_THEMES.map((theme) => [
      theme.label,
      { label: theme.label, commitment: 0, disbursement: 0, commitment_defl: 0, disbursement_defl: 0, count: 0 },
    ]),
  );

  records.forEach((record) => {
    CRS_DECADE_THEMES.forEach((theme) => {
      if (!record[theme.id]) return;
      const entry = grouped.get(theme.label)!;
      entry.commitment += record.commitment;
      entry.disbursement += record.disbursement;
      entry.commitment_defl += record.commitment_defl;
      entry.disbursement_defl += record.disbursement_defl;
      entry.count += 1;
    });
  });

  return [...grouped.values()].sort((a, b) => b.commitment - a.commitment);
}

export function buildThemeTrend(records: CRSDecadeRecord[], measure: CRSDecadeMeasure) {
  const grouped = new Map<number, Record<string, number | string>>();
  records.forEach((record) => {
    if (!record.year) return;
    if (!grouped.has(record.year)) {
      grouped.set(record.year, {
        year: String(record.year),
        ...Object.fromEntries(CRS_DECADE_THEMES.map((theme) => [theme.label, 0])),
      });
    }
    const row = grouped.get(record.year)!;
    CRS_DECADE_THEMES.forEach((theme) => {
      if (record[theme.id]) {
        row[theme.label] = Number(row[theme.label] ?? 0) + (record[measure] ?? 0);
      }
    });
  });
  return [...grouped.values()].sort((a, b) => Number(a.year) - Number(b.year));
}

export function buildModeThemeMatrix(records: CRSDecadeRecord[], measure: CRSDecadeMeasure) {
  const modes = ['Road', 'Rail', 'Water', 'Aviation', 'Other'];
  const grouped = new Map<string, Record<string, number | string>>(
    modes.map((mode) => [mode, { mode, ...Object.fromEntries(CRS_DECADE_THEMES.map((theme) => [theme.label, 0])) }]),
  );
  records.forEach((record) => {
    const mode = modes.includes(record.mode) ? record.mode : 'Other';
    const row = grouped.get(mode)!;
    CRS_DECADE_THEMES.forEach((theme) => {
      if (record[theme.id]) {
        row[theme.label] = Number(row[theme.label] ?? 0) + (record[measure] ?? 0);
      }
    });
  });
  return [...grouped.values()];
}

export function buildTopThemeByRecipient(records: CRSDecadeRecord[], measure: CRSDecadeMeasure, limit = 12) {
  const recipients = aggregateDecade(records, (record) => record.recipient).slice(0, limit);
  return recipients.map((recipient) => {
    const recipientRecords = records.filter((record) => record.recipient === recipient.label);
    const topTheme = aggregateByTheme(recipientRecords)[0];
    return {
      ...recipient,
      topTheme: topTheme?.count ? topTheme.label : 'No theme assigned',
      taggedShare: recipientRecords.length
        ? (recipientRecords.filter((record) => getDecadeThemeIds(record).length > 0).length / recipientRecords.length) * 100
        : 0,
      value: recipient[measure] ?? 0,
    };
  });
}

export function buildDonorThemePortfolio(records: CRSDecadeRecord[], measure: CRSDecadeMeasure, limit = 10) {
  const donors = aggregateDecade(records, (record) => record.donor).slice(0, limit);
  const donorSet = new Set(donors.map((donor) => donor.label));
  const rows = new Map(
    donors.map((donor) => [
      donor.label,
      {
        donor: donor.label,
        total: donor[measure] ?? 0,
        dominantTheme: 'No theme assigned',
        ...Object.fromEntries(CRS_DECADE_THEMES.map((theme) => [theme.label, 0])),
      },
    ]),
  );

  records.forEach((record) => {
    if (!donorSet.has(record.donor)) return;
    const row = rows.get(record.donor);
    if (!row) return;
    CRS_DECADE_THEMES.forEach((theme) => {
      if (record[theme.id]) {
        row[theme.label] = Number(row[theme.label] ?? 0) + (record[measure] ?? 0);
      }
    });
  });

  return [...rows.values()].map((row) => {
    const topTheme = CRS_DECADE_THEMES
      .map((theme) => ({ label: theme.label, value: Number(row[theme.label] ?? 0) }))
      .sort((a, b) => b.value - a.value)[0];
    return {
      ...row,
      dominantTheme: topTheme && topTheme.value > 0 ? topTheme.label : 'No theme assigned',
    };
  });
}
