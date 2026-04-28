export type CRSFilters = {
  donors: string[];
  agencies: string[];
  recipients: string[];
  modes: string[];
  flows: string[];
  sectors: string[];
  yearMin: number;
  yearMax: number;
  measure: 'commitment' | 'disbursement' | 'commitment_defl' | 'disbursement_defl';
};

export const CRS_SECTOR6_OPTIONS = [
  'Mitigation',
  'Adaptation',
  'Gender',
  'DRR',
  'Biodiversity',
  'Environment',
] as const;

export function isAsiaRegionalRecipient(recipient: string | undefined, scope: string | undefined): boolean {
  if (scope !== 'regional' || !recipient) return false;
  const text = recipient.toLowerCase();
  return text.includes(', regional') && text.includes('asia');
}

export function isATOScopedRecipient(record: any, atoEconomies: string[]): boolean {
  if (record.recipient_scope === 'economy') {
    return atoEconomies.includes(record.recipient);
  }
  return isAsiaRegionalRecipient(record.recipient, record.recipient_scope);
}

export function getSustainabilityTags(record: any): string[] {
  const tags: string[] = [];
  if ((record.climate_mitigation ?? 0) > 0) tags.push('Mitigation');
  if ((record.climate_adaptation ?? 0) > 0) tags.push('Adaptation');
  if ((record.gender ?? 0) > 0) tags.push('Gender');
  if ((record.drr ?? 0) > 0) tags.push('DRR');
  if ((record.biodiversity ?? 0) > 0) tags.push('Biodiversity');
  if ((record.environment ?? 0) > 0) tags.push('Environment');
  return tags;
}

export function matchesCRSFilters(
  record: any,
  filters: CRSFilters,
  atoEconomies: string[]
): boolean {
  if (!isATOScopedRecipient(record, atoEconomies)) return false;

  // Donor filter
  if (filters.donors.length && !filters.donors.includes(record.donor)) return false;

  // Agency filter
  if (filters.agencies.length && !filters.agencies.includes(record.agency || 'Unknown')) return false;

  // Recipient filter
  if (filters.recipients.length && !filters.recipients.includes(record.recipient || 'Unknown')) return false;

  // Mode filter
  if (filters.modes.length && !filters.modes.includes(record.mode || 'Other')) return false;

  // Flow / financial instrument filter
  if (filters.flows.length && !filters.flows.includes(record.flow || 'Unknown')) return false;

  // Sustainability tag filter
  if (filters.sectors.length) {
    const recordTags = getSustainabilityTags(record);
    if (!filters.sectors.some((tag) => recordTags.includes(tag))) return false;
  }

  // Year filter
  if (record.year && (record.year < filters.yearMin || record.year > filters.yearMax)) return false;

  return true;
}
