import { CRS_COUNTRY_MAP_POINTS, CRS_FACTS, CRSFact } from '../data/crsData';

export type CRSMeasure = 'commitment' | 'disbursement';

type AggregateRow = {
  label: string;
  commitment: number;
  disbursement: number;
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
  let count = 0;

  facts.forEach((fact) => {
    donors.add(fact.donor);
    recipients.add(fact.recipient);
    if (fact.recipient_scope === 'economy') countryRecipients.add(fact.recipient);
    if (fact.recipient_scope === 'regional') regionalRecipients.add(fact.recipient);
    commitment += fact.commitment;
    disbursement += fact.disbursement;
    count += fact.count;
  });

  return {
    commitment,
    disbursement,
    count,
    donorCount: donors.size,
    recipientCount: recipients.size,
    countryRecipientCount: countryRecipients.size,
    regionalRecipientCount: regionalRecipients.size,
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
        count: 0,
      });
    }
    const entry = grouped.get(key)!;
    entry.commitment += fact.commitment;
    entry.disbursement += fact.disbursement;
    entry.count += fact.count;
  });
  return [...grouped.values()].sort((a, b) => b.commitment - a.commitment);
}

export function buildYearSeries(facts: CRSFact[]) {
  const byYear = new Map<number, { year: string; commitment: number; disbursement: number; count: number }>();
  facts.forEach((fact) => {
    if (!byYear.has(fact.year)) {
      byYear.set(fact.year, {
        year: String(fact.year),
        commitment: 0,
        disbursement: 0,
        count: 0,
      });
    }
    const entry = byYear.get(fact.year)!;
    entry.commitment += fact.commitment;
    entry.disbursement += fact.disbursement;
    entry.count += fact.count;
  });
  return [...byYear.values()].sort((a, b) => Number(a.year) - Number(b.year));
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
  const economyFacts = facts.filter((fact) => fact.recipient_scope === 'economy');
  const uniqueDonors = new Set(economyFacts.map((fact) => fact.donor));
  const uniqueRecipients = new Set(economyFacts.map((fact) => fact.recipient));
  const isRecipientFocus = uniqueRecipients.size === 1;
  const isDonorFocus = uniqueDonors.size === 1;
  const donorLimit = isRecipientFocus ? 7 : isDonorFocus ? 1 : Math.min(topDonors, 5);
  const agencyLimit = isRecipientFocus ? 6 : isDonorFocus ? 5 : Math.min(topAgencies, 6);
  const recipientLimit = isRecipientFocus ? 1 : isDonorFocus ? 7 : Math.min(topRecipients, 8);
  const donorTotals = aggregateFacts(economyFacts, (fact) => fact.donor).slice(0, donorLimit);
  const recipientTotals = aggregateFacts(economyFacts, (fact) => fact.recipient).slice(0, recipientLimit);

  const donorSet = new Set(donorTotals.map((item) => item.label));
  const recipientSet = new Set(recipientTotals.map((item) => item.label));
  const constrainedFacts = economyFacts.filter((fact) => donorSet.has(fact.donor) && recipientSet.has(fact.recipient));
  const donorAgencyTotals = aggregateFacts(constrainedFacts, (fact) => `${fact.donor}|||${fact.agency}`);
  const donorAgencyByDonor = new Map<string, typeof donorAgencyTotals>();
  donorAgencyTotals.forEach((item) => {
    const [donor] = item.label.split('|||');
    donorAgencyByDonor.set(donor, [...(donorAgencyByDonor.get(donor) ?? []), item]);
  });

  const maxAgenciesPerDonor = isRecipientFocus ? 2 : isDonorFocus ? agencyLimit : 2;
  const selectedDonorAgencyPairs = new Set<string>();
  donorSet.forEach((donor) => {
    (donorAgencyByDonor.get(donor) ?? [])
      .sort((a, b) => b.value - a.value)
      .slice(0, maxAgenciesPerDonor)
      .forEach((item) => selectedDonorAgencyPairs.add(item.label));
  });

  const shortlistedFacts = constrainedFacts.filter((fact) => selectedDonorAgencyPairs.has(`${fact.donor}|||${fact.agency}`));
  const agencyTotals = aggregateFacts(shortlistedFacts, (fact) => fact.agency).slice(0, agencyLimit);
  const agencySet = new Set(agencyTotals.map((item) => item.label));
  const agencyRecipientTotals = aggregateFacts(
    shortlistedFacts.filter((fact) => agencySet.has(fact.agency)),
    (fact) => `${fact.agency}|||${fact.recipient}`,
  );
  const agencyRecipientByAgency = new Map<string, typeof agencyRecipientTotals>();
  agencyRecipientTotals.forEach((item) => {
    const [agency] = item.label.split('|||');
    agencyRecipientByAgency.set(agency, [...(agencyRecipientByAgency.get(agency) ?? []), item]);
  });

  const maxRecipientsPerAgency = isRecipientFocus ? 1 : isDonorFocus ? 2 : 2;
  const selectedAgencyRecipientPairs = new Set<string>();
  agencySet.forEach((agency) => {
    (agencyRecipientByAgency.get(agency) ?? [])
      .sort((a, b) => b.value - a.value)
      .slice(0, maxRecipientsPerAgency)
      .forEach((item) => selectedAgencyRecipientPairs.add(item.label));
  });

  const donorAgencyLinkMap = new Map<string, number>();
  const agencyRecipientLinkMap = new Map<string, number>();

  shortlistedFacts.forEach((fact) => {
    const donorAgencyKey = `${fact.donor}|||${fact.agency}`;
    const agencyRecipientKey = `${fact.agency}|||${fact.recipient}`;
    if (
      !donorSet.has(fact.donor) ||
      !agencySet.has(fact.agency) ||
      !recipientSet.has(fact.recipient) ||
      !selectedDonorAgencyPairs.has(donorAgencyKey) ||
      !selectedAgencyRecipientPairs.has(agencyRecipientKey)
    ) {
      return;
    }

    donorAgencyLinkMap.set(donorAgencyKey, (donorAgencyLinkMap.get(donorAgencyKey) ?? 0) + fact[measure]);
    agencyRecipientLinkMap.set(agencyRecipientKey, (agencyRecipientLinkMap.get(agencyRecipientKey) ?? 0) + fact[measure]);
  });

  const donorAgencyLinks = [...donorAgencyLinkMap.entries()]
    .map(([key, value]) => {
      const [donor, agency] = key.split('|||');
      return {
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
    ...donorTotals.filter((item) => activeDonors.has(item.label)).map((item) => ({ name: item.label, role: 'donor' })),
    ...agencyTotals.filter((item) => activeAgencies.has(item.label)).map((item) => ({ name: item.label, role: 'agency' })),
    ...recipientTotals.filter((item) => activeRecipients.has(item.label)).map((item) => ({ name: item.label, role: 'recipient' })),
  ];
  const nodeIndex = new Map(nodes.map((node, index) => [node.name, index]));

  const links = [...donorAgencyLinks, ...agencyRecipientLinks]
    .filter((link) => nodeIndex.has(link.sourceName) && nodeIndex.has(link.targetName))
    .map((link) => ({
      source: nodeIndex.get(link.sourceName)!,
      target: nodeIndex.get(link.targetName)!,
      value: link.value,
    }))
    .sort((a, b) => b.value - a.value);

  const donorLinkTotals = donorTotals
    .map((item) => ({
      ...item,
      visibleValue: links
        .filter((link) => link.source === nodeIndex.get(item.label))
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
      const nodeIdx = nodeIndex.get(item.label);
      const outgoing = links
        .filter((link) => link.source === nodeIdx)
        .reduce((sum, link) => sum + link.value, 0);
      const incoming = links
        .filter((link) => link.target === nodeIdx)
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
        .filter((link) => link.target === nodeIndex.get(item.label))
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
