export type CRSFilters = {
  donors: string[];
  regions: string[];
  recipients: string[];
  modes: string[];
  scopes: string[];
  yearMin: number;
  yearMax: number;
  isConstantUSD: boolean;
  climateMitigation: number | null; // 0, 1, 2
  climateAdaptation: number | null;
  gender: number | null;
  measure: 'commitment' | 'disbursement';
};

export function matchesCRSFilters(
  record: any,
  filters: CRSFilters,
  atoEconomies: string[]
): boolean {
  // Donor filter
  if (filters.donors.length && !filters.donors.includes(record.donor)) return false;

  // Region filter (with specialized ATO logic)
  if (filters.regions.length) {
    const hasATO = filters.regions.includes('Asia-Pacific (ATO)');
    const otherRegions = filters.regions.filter((r) => r !== 'Asia-Pacific (ATO)');

    let matchesRegion = false;
    if (otherRegions.length && otherRegions.includes(record.region || 'Unknown')) {
      matchesRegion = true;
    }
    if (hasATO && atoEconomies.includes(record.recipient)) {
      matchesRegion = true;
    }

    if (!matchesRegion) return false;
  }

  // Recipient filter
  if (filters.recipients.length && !filters.recipients.includes(record.recipient || 'Unknown')) return false;

  // Mode filter
  if (filters.modes.length && !filters.modes.includes(record.mode || 'Other')) return false;

  // Scope filter
  const recipientScope = record.recipient_scope || 'economy';
  if (filters.scopes.length && !filters.scopes.includes(recipientScope)) return false;

  // Year filter
  if (record.year && (record.year < filters.yearMin || record.year > filters.yearMax)) return false;

  return true;
}
