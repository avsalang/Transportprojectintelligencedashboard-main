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
  topDonors = 8,
  topRecipients = 12,
) {
  const donorTotals = aggregateFacts(facts, (fact) => fact.donor).slice(0, topDonors);
  const recipientTotals = aggregateFacts(
    facts.filter((fact) => fact.recipient_scope === 'economy'),
    (fact) => fact.recipient,
  ).slice(0, topRecipients);

  const donorSet = new Set(donorTotals.map((item) => item.label));
  const recipientSet = new Set(recipientTotals.map((item) => item.label));
  const linkMap = new Map<string, number>();

  facts.forEach((fact) => {
    if (!donorSet.has(fact.donor) || !recipientSet.has(fact.recipient)) return;
    if (fact.recipient_scope !== 'economy') return;
    const key = `${fact.donor}|||${fact.recipient}`;
    linkMap.set(key, (linkMap.get(key) ?? 0) + fact[measure]);
  });

  const nodes = [...donorTotals.map((item) => ({ name: item.label })), ...recipientTotals.map((item) => ({ name: item.label }))];
  const nodeIndex = new Map(nodes.map((node, index) => [node.name, index]));
  const links = [...linkMap.entries()]
    .map(([key, value]) => {
      const [donor, recipient] = key.split('|||');
      return {
        source: nodeIndex.get(donor)!,
        target: nodeIndex.get(recipient)!,
        value,
      };
    })
    .filter((link) => link.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 36);

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

  return { nodes, links, donorLinkTotals, recipientLinkTotals };
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
