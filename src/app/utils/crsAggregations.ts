import { CRS_COUNTRY_MAP_POINTS, CRS_FACTS, CRSFact } from '../data/crsData';
import { CRS_SECTOR6_OPTIONS, getSustainabilityTags } from './crsFiltering';

export type CRSMeasure = 'commitment' | 'disbursement' | 'commitment_defl' | 'disbursement_defl';

type AggregateRow = {
  label: string;
  commitment: number;
  disbursement: number;
  commitment_defl: number;
  disbursement_defl: number;
  count: number;
};

const countryCoordinateLookup = new Map(
  CRS_COUNTRY_MAP_POINTS.map((point) => [
    point.recipient,
    {
      lat: point.lat,
      lng: point.lng,
      region: point.region,
    },
  ]),
);

export function summarizeFacts(facts: CRSFact[]) {
  const donors = new Set<string>();
  const recipients = new Set<string>();
  const countryRecipients = new Set<string>();
  const regionalRecipients = new Set<string>();
  let commitment = 0;
  let disbursement = 0;
  let commitment_defl = 0;
  let disbursement_defl = 0;
  let count = 0;

  facts.forEach((fact) => {
    donors.add(fact.donor);
    recipients.add(fact.recipient);
    if (fact.recipient_scope === 'economy') countryRecipients.add(fact.recipient);
    if (fact.recipient_scope === 'regional') regionalRecipients.add(fact.recipient);
    commitment += fact.commitment;
    disbursement += fact.disbursement;
    commitment_defl += fact.commitment_defl ?? fact.commitment;
    disbursement_defl += fact.disbursement_defl ?? fact.disbursement;
    count += fact.count;
  });

  // Calculate sustainable totals (any of Big 6 markers > 0)
  const sustainableFacts = facts.filter(f => 
    (f.climate_mitigation ?? 0) > 0 || 
    (f.climate_adaptation ?? 0) > 0 || 
    (f.gender ?? 0) > 0 ||
    (f.drr ?? 0) > 0 ||
    (f.biodiversity ?? 0) > 0 ||
    (f.environment ?? 0) > 0
  );
  const sustainableStats = sustainableFacts.reduce((acc, f) => ({
    commitment: acc.commitment + f.commitment,
    commitment_defl: acc.commitment_defl + (f.commitment_defl ?? f.commitment),
    count: acc.count + f.count
  }), { commitment: 0, commitment_defl: 0, count: 0 });

  return {
    commitment,
    disbursement,
    commitment_defl,
    disbursement_defl,
    count,
    donorCount: donors.size,
    recipientCount: recipients.size,
    countryRecipientCount: countryRecipients.size,
    regionalRecipientCount: regionalRecipients.size,
    sustainableCommitment: sustainableStats.commitment,
    sustainableCommitmentDefl: sustainableStats.commitment_defl,
    sustainableCount: sustainableStats.count
  };
}

export function aggregateFacts(
  facts: CRSFact[],
  getKey: (fact: CRSFact) => string,
): AggregateRow[] {
  const grouped = new Map<string, AggregateRow>();
  facts.forEach((fact) => {
    const key = getKey(fact) || 'Unknown';
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
    entry.commitment += fact.commitment;
    entry.disbursement += fact.disbursement;
    entry.commitment_defl += fact.commitment_defl ?? fact.commitment;
    entry.disbursement_defl += fact.disbursement_defl ?? fact.disbursement;
    entry.count += fact.count;
  });
  return [...grouped.values()].sort((a, b) => b.commitment - a.commitment);
}

export function aggregateSustainabilityTags(facts: CRSFact[]): AggregateRow[] {
  const grouped = new Map<string, AggregateRow>(
    CRS_SECTOR6_OPTIONS.map((tag) => [
      tag,
      {
        label: tag,
        commitment: 0,
        disbursement: 0,
        commitment_defl: 0,
        disbursement_defl: 0,
        count: 0,
      },
    ]),
  );

  facts.forEach((fact) => {
    const tags = getSustainabilityTags(fact);
    tags.forEach((tag) => {
      const entry = grouped.get(tag)!;
      entry.commitment += fact.commitment;
      entry.disbursement += fact.disbursement;
      entry.commitment_defl += fact.commitment_defl ?? fact.commitment;
      entry.disbursement_defl += fact.disbursement_defl ?? fact.disbursement;
      entry.count += fact.count;
    });
  });

  return [...grouped.values()].sort((a, b) => b.commitment - a.commitment);
}

export function buildSustainabilityStackByDonor(facts: CRSFact[], limit = 8) {
  const donorRows = aggregateFacts(facts, (fact) => fact.donor).slice(0, limit);
  const donorSet = new Set(donorRows.map((item) => item.label));

  const rowMap = new Map(
    donorRows.map((item) => [
      item.label,
      {
        label: item.label,
        commitment: item.commitment,
        disbursement: item.disbursement,
        Mitigation: 0,
        Adaptation: 0,
        Gender: 0,
        DRR: 0,
        Biodiversity: 0,
        Environment: 0,
      },
    ]),
  );

  facts.forEach((fact) => {
    if (!donorSet.has(fact.donor)) return;
    const row = rowMap.get(fact.donor);
    if (!row) return;
    getSustainabilityTags(fact).forEach((tag) => {
      row[tag as keyof typeof row] = Number(row[tag as keyof typeof row]) + fact.commitment;
    });
  });

  return [...rowMap.values()].sort((a, b) => b.commitment - a.commitment);
}

function normalizeMode(mode?: string) {
  const lower = (mode || 'Other').toLowerCase();
  if (lower.includes('road')) return 'Road';
  if (lower.includes('rail')) return 'Rail';
  if (lower.includes('air') || lower.includes('aviation')) return 'Aviation';
  if (lower.includes('water') || lower.includes('sea') || lower.includes('river') || lower.includes('maritime')) return 'Water';
  return 'Other';
}

export function buildModeStackByDonor(facts: CRSFact[], limit = 8) {
  const donorRows = aggregateFacts(facts, (fact) => fact.donor).slice(0, limit);
  const donorSet = new Set(donorRows.map((item) => item.label));

  const rowMap = new Map(
    donorRows.map((item) => [
      item.label,
      {
        label: item.label,
        commitment: item.commitment,
        disbursement: item.disbursement,
        Road: 0,
        Rail: 0,
        Aviation: 0,
        Water: 0,
        Other: 0,
      },
    ]),
  );

  facts.forEach((fact) => {
    if (!donorSet.has(fact.donor)) return;
    const row = rowMap.get(fact.donor);
    if (!row) return;
    const mode = normalizeMode(fact.mode);
    row[mode as keyof typeof row] = Number(row[mode as keyof typeof row]) + fact.commitment;
  });

  return [...rowMap.values()].sort((a, b) => b.commitment - a.commitment);
}

export function buildYearSeries(facts: CRSFact[]) {
  const byYear = new Map<number, { year: string; commitment: number; disbursement: number; commitment_defl: number; disbursement_defl: number; count: number }>();
  facts.forEach((fact) => {
    if (!byYear.has(fact.year)) {
      byYear.set(fact.year, {
        year: String(fact.year),
        commitment: 0,
        disbursement: 0,
        commitment_defl: 0,
        disbursement_defl: 0,
        count: 0,
      });
    }
    const entry = byYear.get(fact.year)!;
    entry.commitment += fact.commitment;
    entry.disbursement += fact.disbursement;
    entry.commitment_defl += fact.commitment_defl ?? fact.commitment;
    entry.disbursement_defl += fact.disbursement_defl ?? fact.disbursement;
    entry.count += fact.count;
  });
  return [...byYear.values()].sort((a, b) => Number(a.year) - Number(b.year));
}

export function buildYearModeStack(facts: CRSFact[], measure: CRSMeasure) {
  const byYear = new Map<
    number,
    { year: string; Road: number; Rail: number; Aviation: number; Water: number; Other: number }
  >();

  facts.forEach((fact) => {
    if (!byYear.has(fact.year)) {
      byYear.set(fact.year, {
        year: String(fact.year),
        Road: 0,
        Rail: 0,
        Aviation: 0,
        Water: 0,
        Other: 0,
      });
    }

    const entry = byYear.get(fact.year)!;
    const mode = normalizeMode(fact.mode);
    entry[mode as keyof Omit<typeof entry, 'year'>] += fact[measure] ?? 0;
  });

  return [...byYear.values()].sort((a, b) => Number(a.year) - Number(b.year));
}

export function buildSustainabilityTrend(facts: CRSFact[], isConstant = false) {
  const byYear = new Map<number, { 
    year: string; 
    sustainable: number; 
    total: number;
    mitigation: number;
    adaptation: number;
    gender: number;
    drr: number;
    biodiversity: number;
    environment: number;
  }>();
  
  facts.forEach((fact) => {
    if (!byYear.has(fact.year)) {
      byYear.set(fact.year, { 
        year: String(fact.year), 
        sustainable: 0, 
        total: 0,
        mitigation: 0,
        adaptation: 0,
        gender: 0,
        drr: 0,
        biodiversity: 0,
        environment: 0
      });
    }
    const entry = byYear.get(fact.year)!;
    const val = isConstant ? (fact.commitment_defl ?? fact.commitment) : fact.commitment;
    entry.total += val;
    
    let isSustainable = false;
    if ((fact.climate_mitigation ?? 0) > 0) { entry.mitigation += val; isSustainable = true; }
    if ((fact.climate_adaptation ?? 0) > 0) { entry.adaptation += val; isSustainable = true; }
    if ((fact.gender ?? 0) > 0) { entry.gender += val; isSustainable = true; }
    if ((fact.drr ?? 0) > 0) { entry.drr += val; isSustainable = true; }
    if ((fact.biodiversity ?? 0) > 0) { entry.biodiversity += val; isSustainable = true; }
    if ((fact.environment ?? 0) > 0) { entry.environment += val; isSustainable = true; }
    
    if (isSustainable) {
      entry.sustainable += val;
    }
  });
  
  return [...byYear.values()]
    .sort((a, b) => Number(a.year) - Number(b.year))
    .map(d => ({ 
      ...d, 
      sustainableShare: d.total > 0 ? (d.sustainable / d.total) * 100 : 0,
      mitigationShare: d.total > 0 ? (d.mitigation / d.total) * 100 : 0
    }));
}

export function buildCountryMapPoints(facts: CRSFact[]) {
  const grouped = new Map<
    string,
    { recipient: string; region: string; commitment: number; disbursement: number; count: number }
  >();

  facts.forEach((fact) => {
    if (fact.recipient_scope !== 'economy') return;
    const coords = countryCoordinateLookup.get(fact.recipient);
    if (!coords) return;
    if (!grouped.has(fact.recipient)) {
      grouped.set(fact.recipient, {
        recipient: fact.recipient,
        region: coords.region || fact.region,
        commitment: 0,
        disbursement: 0,
        count: 0,
      });
    }
    const entry = grouped.get(fact.recipient)!;
    entry.commitment += fact.commitment;
    entry.disbursement += fact.disbursement;
    entry.count += fact.count;
  });

  return [...grouped.values()]
    .map((entry) => {
      const coords = countryCoordinateLookup.get(entry.recipient)!;
      return {
        ...entry,
        lat: coords.lat!,
        lng: coords.lng!,
      };
    })
    .filter((entry) => Number.isFinite(entry.lat) && Number.isFinite(entry.lng))
    .sort((a, b) => b.commitment - a.commitment);
}

export function buildFlowSankeyData(
  facts: CRSFact[],
  measure: CRSMeasure,
  topDonors = 6,
  topAgencies = 8,
  topRecipients = 10,
) {
  const MIN_VISIBLE_FLOW_VALUE = 0.05;
  const scopedFacts = facts.filter((fact) => fact.recipient_scope === 'economy' || fact.recipient_scope === 'regional');
  const uniqueDonors = new Set(scopedFacts.map((fact) => fact.donor));
  const uniqueRecipients = new Set(scopedFacts.map((fact) => fact.recipient));
  const isRecipientFocus = uniqueRecipients.size === 1;
  const isDonorFocus = uniqueDonors.size === 1;
  const donorLimit = isRecipientFocus ? 7 : isDonorFocus ? 1 : Math.min(topDonors, 5);
  const agencyLimit = isRecipientFocus ? 6 : isDonorFocus ? 5 : Math.min(topAgencies, 6);
  const recipientLimit = isRecipientFocus ? 1 : isDonorFocus ? 7 : Math.min(topRecipients, 8);
  const donorTotals = aggregateFacts(scopedFacts, (fact) => fact.donor).slice(0, donorLimit);
  const recipientTotals = aggregateFacts(scopedFacts, (fact) => fact.recipient).slice(0, recipientLimit);

  const donorSet = new Set(donorTotals.map((item) => item.label));
  const recipientSet = new Set(recipientTotals.map((item) => item.label));
  const constrainedFacts = scopedFacts.filter((fact) => donorSet.has(fact.donor) && recipientSet.has(fact.recipient));
  const tripletTotals = aggregateFacts(constrainedFacts, (fact) => `${fact.donor}|||${fact.agency}|||${fact.recipient}`);
  const selectedTriplets = new Set<string>();
  const addTriplets = (entries: typeof tripletTotals, limit: number) => {
    entries
      .filter((item) => item[measure] >= MIN_VISIBLE_FLOW_VALUE)
      .sort((a, b) => b[measure] - a[measure])
      .slice(0, limit)
      .forEach((item) => selectedTriplets.add(item.label));
  };

  addTriplets(tripletTotals, isRecipientFocus ? 10 : isDonorFocus ? 10 : 12);

  donorSet.forEach((donor) => {
    addTriplets(
      tripletTotals.filter((item) => item.label.startsWith(`${donor}|||`)),
      isRecipientFocus ? 2 : 1,
    );
  });

  recipientSet.forEach((recipient) => {
    addTriplets(
      tripletTotals.filter((item) => item.label.endsWith(`|||${recipient}`)),
      1,
    );
  });

  const shortlistedFacts = constrainedFacts.filter((fact) => selectedTriplets.has(`${fact.donor}|||${fact.agency}|||${fact.recipient}`));
  const agencyTotals = aggregateFacts(shortlistedFacts, (fact) => fact.agency).slice(0, agencyLimit);
  const agencySet = new Set(agencyTotals.map((item) => item.label));

  const donorAgencyLinkMap = new Map<string, number>();
  const agencyRecipientLinkMap = new Map<string, number>();

  shortlistedFacts.forEach((fact) => {
    const tripletKey = `${fact.donor}|||${fact.agency}|||${fact.recipient}`;
    if (
      !donorSet.has(fact.donor) ||
      !agencySet.has(fact.agency) ||
      !recipientSet.has(fact.recipient) ||
      !selectedTriplets.has(tripletKey)
    ) {
      return;
    }

    const donorAgencyKey = `${fact.donor}|||${fact.agency}`;
    const agencyRecipientKey = `${fact.agency}|||${fact.recipient}`;
    donorAgencyLinkMap.set(donorAgencyKey, (donorAgencyLinkMap.get(donorAgencyKey) ?? 0) + fact[measure]);
    agencyRecipientLinkMap.set(agencyRecipientKey, (agencyRecipientLinkMap.get(agencyRecipientKey) ?? 0) + fact[measure]);
  });

  const donorAgencyLinks = [...donorAgencyLinkMap.entries()]
    .map(([key, value]) => {
      const [donor, agency] = key.split('|||');
      return {
        sourceId: `donor::${donor}`,
        targetId: `agency::${agency}`,
        sourceName: donor,
        targetName: agency,
        value,
      };
    })
    .filter((link) => link.value >= MIN_VISIBLE_FLOW_VALUE);

  const agencyRecipientLinks = [...agencyRecipientLinkMap.entries()]
    .map(([key, value]) => {
      const [agency, recipient] = key.split('|||');
      return {
        sourceId: `agency::${agency}`,
        targetId: `recipient::${recipient}`,
        sourceName: agency,
        targetName: recipient,
        value,
      };
    })
    .filter((link) => link.value >= MIN_VISIBLE_FLOW_VALUE);

  const activeDonors = new Set(donorAgencyLinks.map((link) => link.sourceName));
  const activeAgencies = new Set([
    ...donorAgencyLinks.map((link) => link.targetName),
    ...agencyRecipientLinks.map((link) => link.sourceName),
  ]);
  const activeRecipients = new Set(agencyRecipientLinks.map((link) => link.targetName));

  const nodes = [
    ...donorTotals.filter((item) => activeDonors.has(item.label)).map((item) => ({ id: `donor::${item.label}`, name: item.label, role: 'donor', globalValue: item[measure] })),
    ...agencyTotals.filter((item) => activeAgencies.has(item.label)).map((item) => ({ id: `agency::${item.label}`, name: item.label, role: 'agency', globalValue: item[measure] })),
    ...recipientTotals.filter((item) => activeRecipients.has(item.label)).map((item) => ({ id: `recipient::${item.label}`, name: item.label, role: 'recipient', globalValue: item[measure] })),
  ];
  const nodeIndex = new Map(nodes.map((node, index) => [node.id, index]));

  const links = [...donorAgencyLinks, ...agencyRecipientLinks]
    .filter((link) => nodeIndex.has(link.sourceId) && nodeIndex.has(link.targetId))
    .map((link) => ({
      source: nodeIndex.get(link.sourceId)!,
      target: nodeIndex.get(link.targetId)!,
      sourceId: link.sourceId,
      targetId: link.targetId,
      sourceName: link.sourceName,
      targetName: link.targetName,
      value: link.value,
    }))
    .sort((a, b) => b.value - a.value);

  const donorLinkTotals = donorTotals
    .map((item) => ({
      ...item,
      visibleValue: links
        .filter((link) => link.sourceId === `donor::${item.label}`)
        .reduce((sum, link) => sum + link.value, 0),
    }))
    .filter((item) => item.visibleValue > 0)
    .map((item) => ({
      label: item.label,
      commitment: measure === 'commitment' ? item.visibleValue : 0,
      disbursement: measure === 'disbursement' ? item.visibleValue : 0,
      count: item.count,
      value: item.visibleValue,
    }))
    .sort((a, b) => b.value - a.value);

  const agencyLinkTotals = agencyTotals
    .map((item) => {
      const nodeId = `agency::${item.label}`;
      const outgoing = links
        .filter((link) => link.sourceId === nodeId)
        .reduce((sum, link) => sum + link.value, 0);
      const incoming = links
        .filter((link) => link.targetId === nodeId)
        .reduce((sum, link) => sum + link.value, 0);
      return {
        ...item,
        visibleValue: Math.max(outgoing, incoming),
      };
    })
    .filter((item) => item.visibleValue > 0)
    .map((item) => ({
      label: item.label,
      commitment: measure === 'commitment' ? item.visibleValue : 0,
      disbursement: measure === 'disbursement' ? item.visibleValue : 0,
      count: item.count,
      value: item.visibleValue,
    }))
    .sort((a, b) => b.value - a.value);

  const recipientLinkTotals = recipientTotals
    .map((item) => ({
      ...item,
      visibleValue: links
        .filter((link) => link.targetId === `recipient::${item.label}`)
        .reduce((sum, link) => sum + link.value, 0),
    }))
    .filter((item) => item.visibleValue > 0)
    .map((item) => ({
      label: item.label,
      commitment: measure === 'commitment' ? item.visibleValue : 0,
      disbursement: measure === 'disbursement' ? item.visibleValue : 0,
      count: item.count,
      value: item.visibleValue,
    }))
    .sort((a, b) => b.value - a.value);

  return { nodes, links, donorLinkTotals, agencyLinkTotals, recipientLinkTotals };
}

export function getLatestYearFromFacts(facts: CRSFact[]) {
  return facts.reduce((maxYear, fact) => Math.max(maxYear, fact.year), 0);
}

export function getLatestYearChange() {
  const years = buildYearSeries(CRS_FACTS);
  const latest = years.at(-1);
  const previous = years.at(-2);
  if (!latest || !previous || previous.commitment === 0) return null;
  return ((latest.commitment - previous.commitment) / previous.commitment) * 100;
}

export function buildStrategicInsights(facts: CRSFact[], activeMeasure: CRSMeasure) {
  const entityMap = new Map<string, { 
    label: string, 
    commitment: number, 
    disbursement: number, 
    count: number, 
    sustainableCommitment: number,
    modes: Map<string, { commitment: number, disbursement: number }> 
  }>();

  const STANDARD_MODES = ['Road', 'Rail', 'Aviation', 'Water', 'Other'];

  facts.forEach(f => {
    const dKey = f.donor;
    let mRaw = f.mode || 'Other';
    
    // Mapping to standard categories
    let mKey = 'Other';
    const lowerRaw = mRaw.toLowerCase();
    if (lowerRaw.includes('road')) mKey = 'Road';
    else if (lowerRaw.includes('rail')) mKey = 'Rail';
    else if (lowerRaw.includes('air') || lowerRaw.includes('aviation')) mKey = 'Aviation';
    else if (lowerRaw.includes('water') || lowerRaw.includes('sea') || lowerRaw.includes('river')) mKey = 'Water';
    else mKey = 'Other';

    if (!entityMap.has(dKey)) {
      entityMap.set(dKey, { 
        label: dKey, 
        commitment: 0, 
        disbursement: 0, 
        count: 0, 
        sustainableCommitment: 0, 
        modes: new Map() 
      });
    }
    const entry = entityMap.get(dKey)!;
    entry.commitment += f.commitment;
    entry.disbursement += f.disbursement;
    entry.count += f.count;
    
    const isSustainable = 
      (f.climate_mitigation ?? 0) > 0 || 
      (f.climate_adaptation ?? 0) > 0 || 
      (f.gender ?? 0) > 0 ||
      (f.drr ?? 0) > 0 ||
      (f.biodiversity ?? 0) > 0 ||
      (f.environment ?? 0) > 0;

    if (isSustainable) {
      entry.sustainableCommitment += f.commitment;
    }

    if (!entry.modes.has(mKey)) {
      entry.modes.set(mKey, { commitment: 0, disbursement: 0 });
    }
    const mEntry = entry.modes.get(mKey)!;
    mEntry.commitment += f.commitment;
    mEntry.disbursement += f.disbursement;
  });

  const entities = [...entityMap.values()].sort((a,b) => b.commitment - a.commitment);

  // Prep Stacked Data for Top 10 Donors
  const topEntities = entities.slice(0, 10);
  const stackedData = topEntities.map(e => {
    const row: any = { label: e.label, total: e.commitment };
    e.modes.forEach((val, mode) => { 
        row[mode] = val[activeMeasure.includes('commitment') ? 'commitment' : 'disbursement']; 
    });
    return row;
  });

  return { entities, stackedData, modes: STANDARD_MODES };
}
