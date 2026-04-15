import csv
import json
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parent
CRS_CSV = ROOT.parent / "crs_transport_dashboard_ready.csv"
COUNTRY_COORD_SOURCE = ROOT.parent / "transport_projects_cross_mdb_shareable_v5.csv"
OUT_TS = ROOT / "src" / "app" / "data" / "crsData.ts"
PUBLIC_DATA_DIR = ROOT / "public" / "data"
RECORDS_DIR = PUBLIC_DATA_DIR / "crs-records"
OUT_RECORDS_INDEX = RECORDS_DIR / "index.json"
LEGACY_RECORDS_JSON = PUBLIC_DATA_DIR / "crs-records.json"
RECORD_CHUNK_TARGET_BYTES = 20 * 1024 * 1024

MODE_COLORS = {
    "Road": "#F59E0B",
    "Rail": "#2563EB",
    "Water": "#06B6D4",
    "Aviation": "#8B5CF6",
    "Other": "#64748B",
}


def clean_text(value):
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def parse_float(value):
    text = clean_text(value)
    if not text:
        return 0.0
    try:
        return float(text)
    except ValueError:
        return 0.0


def parse_int(value):
    text = clean_text(value)
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def to_js(value):
    return json.dumps(value, ensure_ascii=False, indent=2)


def shard_records(records):
    RECORDS_DIR.mkdir(parents=True, exist_ok=True)
    for stale in RECORDS_DIR.glob("*.json"):
        stale.unlink()

    chunk_meta = []
    entity_shard_map = {
        "country": defaultdict(set),
        "regionalRecipient": defaultdict(set),
        "broadRegion": defaultdict(set),
        "donor": defaultdict(set),
        "agency": defaultdict(set),
    }

    chunk_id = 1
    current_strings = []
    current_records = []
    current_bytes = 2  # []

    def write_chunk():
        nonlocal chunk_id, current_strings, current_records, current_bytes
        if not current_strings:
            return
        filename = f"chunk-{chunk_id:03d}.json"
        path = RECORDS_DIR / filename
        payload = "[" + ",".join(current_strings) + "]"
        path.write_text(payload, encoding="utf-8")
        chunk_meta.append(
            {
                "id": chunk_id,
                "file": f"data/crs-records/{filename}",
                "count": len(current_records),
                "sizeBytes": len(payload.encode("utf-8")),
            }
        )
        current_strings = []
        current_records = []
        current_bytes = 2
        chunk_id += 1

    for record in records:
        compact = json.dumps(record, ensure_ascii=False, separators=(",", ":"))
        compact_bytes = len(compact.encode("utf-8"))
        additional_bytes = compact_bytes + (1 if current_strings else 0)
        if current_strings and current_bytes + additional_bytes > RECORD_CHUNK_TARGET_BYTES:
            write_chunk()

        current_strings.append(compact)
        current_records.append(record)
        current_bytes += compact_bytes + (1 if len(current_strings) > 1 else 0)

        recipient_scope = record.get("recipient_scope")
        if recipient_scope == "economy":
            entity_shard_map["country"][record["recipient"]].add(chunk_id)
        elif recipient_scope == "regional":
            entity_shard_map["regionalRecipient"][record.get("recipient_region_detail") or record["recipient"]].add(chunk_id)
        entity_shard_map["broadRegion"][record.get("region") or "Unknown"].add(chunk_id)
        entity_shard_map["donor"][record.get("donor") or "Unknown"].add(chunk_id)
        entity_shard_map["agency"][record.get("agency") or "Unknown"].add(chunk_id)

    write_chunk()

    index_payload = {
        "version": 1,
        "totalRecords": len(records),
        "chunks": chunk_meta,
        "entityShardMap": {
            entity_type: {label: sorted(ids) for label, ids in mapping.items()}
            for entity_type, mapping in entity_shard_map.items()
        },
    }
    OUT_RECORDS_INDEX.write_text(
        json.dumps(index_payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    if LEGACY_RECORDS_JSON.exists():
        LEGACY_RECORDS_JSON.unlink()
    return index_payload


def load_country_coords():
    sums = defaultdict(lambda: {"lat": 0.0, "lng": 0.0, "n": 0})
    with COUNTRY_COORD_SOURCE.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            country = clean_text(row.get("country"))
            lat = clean_text(row.get("final_latitude"))
            lng = clean_text(row.get("final_longitude"))
            if not country or not lat or not lng:
                continue
            try:
                lat_f = float(lat)
                lng_f = float(lng)
            except ValueError:
                continue
            sums[country]["lat"] += lat_f
            sums[country]["lng"] += lng_f
            sums[country]["n"] += 1
    return {
        country: {
            "lat": round(vals["lat"] / vals["n"], 6),
            "lng": round(vals["lng"] / vals["n"], 6),
        }
        for country, vals in sums.items()
        if vals["n"] > 0
    }


def main():
    country_coords = load_country_coords()

    facts = defaultdict(lambda: {"commitment": 0.0, "disbursement": 0.0, "count": 0})
    year_totals = defaultdict(lambda: {"commitment": 0.0, "disbursement": 0.0})
    donor_totals = defaultdict(lambda: {"commitment": 0.0, "disbursement": 0.0, "count": 0})
    recipient_totals = defaultdict(lambda: {"commitment": 0.0, "disbursement": 0.0, "count": 0, "scope": "", "region": "", "detail": ""})
    mode_totals = defaultdict(lambda: {"commitment": 0.0, "disbursement": 0.0, "count": 0})
    scope_totals = Counter()
    top_records = []
    country_records = defaultdict(list)
    all_records = []

    with CRS_CSV.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            year = parse_int(row.get("year"))
            donor = clean_text(row.get("donor_name_standardized")) or clean_text(row.get("donor_name")) or "Unknown"
            agency = clean_text(row.get("agency_name_standardized")) or clean_text(row.get("agency_name")) or "Unknown"
            recipient = clean_text(row.get("recipient_standardized")) or clean_text(row.get("recipient_name")) or "Unknown"
            recipient_scope = clean_text(row.get("recipient_scope")) or "unknown"
            recipient_detail = clean_text(row.get("recipient_region_detail")) or ""
            region = clean_text(row.get("region_standardized")) or "Unknown"
            mode = clean_text(row.get("mode_ato_umbrella")) or "Other"
            mode_detail = clean_text(row.get("mode_ato_detail")) or "Other"
            flow = clean_text(row.get("flow_name")) or "Unknown"
            commitment = parse_float(row.get("usd_commitment"))
            disbursement = parse_float(row.get("usd_disbursement"))

            key = (
                year or 0,
                donor,
                agency,
                recipient,
                recipient_scope,
                recipient_detail,
                region,
                mode,
                mode_detail,
                flow,
            )
            facts[key]["commitment"] += commitment
            facts[key]["disbursement"] += disbursement
            facts[key]["count"] += 1

            if year is not None:
                year_totals[year]["commitment"] += commitment
                year_totals[year]["disbursement"] += disbursement

            donor_totals[donor]["commitment"] += commitment
            donor_totals[donor]["disbursement"] += disbursement
            donor_totals[donor]["count"] += 1

            recipient_totals[recipient]["commitment"] += commitment
            recipient_totals[recipient]["disbursement"] += disbursement
            recipient_totals[recipient]["count"] += 1
            recipient_totals[recipient]["scope"] = recipient_scope
            recipient_totals[recipient]["region"] = region
            recipient_totals[recipient]["detail"] = recipient_detail

            mode_totals[mode]["commitment"] += commitment
            mode_totals[mode]["disbursement"] += disbursement
            mode_totals[mode]["count"] += 1

            scope_totals[recipient_scope] += 1

            if len(top_records) < 5000:
                top_records.append(
                    {
                        "id": len(all_records) + 1,
                        "year": year,
                        "donor": donor,
                        "agency": agency,
                        "recipient": recipient,
                        "recipient_scope": recipient_scope,
                        "recipient_region_detail": recipient_detail,
                        "region": region,
                        "mode": mode,
                        "mode_detail": mode_detail,
                        "flow": flow,
                        "commitment": commitment,
                        "disbursement": disbursement,
                        "title": clean_text(row.get("project_title")) or "",
                        "description": clean_text(row.get("short_description")) or "",
                    }
                )

            record_row = {
                "id": len(all_records) + 1,
                "year": year,
                "donor": donor,
                "donor_original": clean_text(row.get("donor_name")) or "",
                "agency": agency,
                "agency_original": clean_text(row.get("agency_name")) or "",
                "recipient": recipient,
                "recipient_original": clean_text(row.get("recipient_name")) or "",
                "recipient_scope": recipient_scope,
                "recipient_region_detail": recipient_detail,
                "region": region,
                "region_original": clean_text(row.get("region_name")) or "",
                "recipient_group": clean_text(row.get("recipient_ato_group")) or "",
                "recipient_subgroup": clean_text(row.get("recipient_ato_subgroup")) or "",
                "income_group": clean_text(row.get("recipient_income_group_standardized")) or "",
                "flow": flow,
                "finance_type": clean_text(row.get("finance_t")) or "",
                "aid_type": clean_text(row.get("aid_t")) or "",
                "commitment": round(commitment, 4),
                "disbursement": round(disbursement, 4),
                "title": clean_text(row.get("project_title")) or "",
                "short_description": clean_text(row.get("short_description")) or "",
                "purpose": clean_text(row.get("purpose_name")) or "",
                "sector": clean_text(row.get("sector_name")) or "",
                "channel": clean_text(row.get("channel_name")) or "",
                "channel_reported": clean_text(row.get("channel_reported_name")) or "",
                "geography": clean_text(row.get("geography")) or "",
                "expected_start_date": clean_text(row.get("expected_start_date")) or "",
                "completion_date": clean_text(row.get("completion_date")) or "",
                "long_description": clean_text(row.get("long_description")) or "",
                "mode": mode,
                "mode_detail": mode_detail,
            }
            all_records.append(record_row)

            if recipient_scope == "economy":
                country_records[recipient].append(
                    {
                        "year": year,
                        "donor": donor,
                        "agency": agency,
                        "recipient": recipient,
                        "region": region,
                        "mode": mode,
                        "mode_detail": mode_detail,
                        "flow": flow,
                        "commitment": round(commitment, 4),
                        "disbursement": round(disbursement, 4),
                        "title": clean_text(row.get("project_title")) or "",
                        "description": clean_text(row.get("short_description")) or "",
                    }
                )

    facts_list = [
        {
            "year": year,
            "donor": donor,
            "agency": agency,
            "recipient": recipient,
            "recipient_scope": recipient_scope,
            "recipient_region_detail": recipient_detail,
            "region": region,
            "mode": mode,
            "mode_detail": mode_detail,
            "flow": flow,
            "commitment": round(vals["commitment"], 4),
            "disbursement": round(vals["disbursement"], 4),
            "count": vals["count"],
        }
        for (year, donor, agency, recipient, recipient_scope, recipient_detail, region, mode, mode_detail, flow), vals in facts.items()
    ]

    year_series = [
        {
            "year": year,
            "commitment": round(vals["commitment"], 2),
            "disbursement": round(vals["disbursement"], 2),
        }
        for year, vals in sorted(year_totals.items())
    ]

    donor_summary = [
        {
            "donor": donor,
            "commitment": round(vals["commitment"], 2),
            "disbursement": round(vals["disbursement"], 2),
            "count": vals["count"],
        }
        for donor, vals in sorted(donor_totals.items(), key=lambda kv: (-kv[1]["commitment"], kv[0]))
    ]

    recipient_summary = []
    for recipient, vals in sorted(recipient_totals.items(), key=lambda kv: (-kv[1]["commitment"], kv[0])):
        coords = country_coords.get(recipient, {}) if vals["scope"] == "economy" else {}
        recipient_summary.append(
            {
                "recipient": recipient,
                "recipient_scope": vals["scope"],
                "region": vals["region"],
                "recipient_region_detail": vals["detail"],
                "commitment": round(vals["commitment"], 2),
                "disbursement": round(vals["disbursement"], 2),
                "count": vals["count"],
                "lat": coords.get("lat"),
                "lng": coords.get("lng"),
            }
        )

    mode_summary = [
        {
            "mode": mode,
            "commitment": round(vals["commitment"], 2),
            "disbursement": round(vals["disbursement"], 2),
            "count": vals["count"],
        }
        for mode, vals in sorted(mode_totals.items(), key=lambda kv: (-kv[1]["commitment"], kv[0]))
    ]

    region_detail_summary = defaultdict(lambda: {"commitment": 0.0, "disbursement": 0.0, "count": 0})
    for rec in recipient_summary:
        label = rec["recipient_region_detail"] or rec["region"]
        region_detail_summary[label]["commitment"] += rec["commitment"]
        region_detail_summary[label]["disbursement"] += rec["disbursement"]
        region_detail_summary[label]["count"] += rec["count"]

    region_detail_summary_list = [
        {
            "region": region,
            "commitment": round(vals["commitment"], 2),
            "disbursement": round(vals["disbursement"], 2),
            "count": vals["count"],
        }
        for region, vals in sorted(region_detail_summary.items(), key=lambda kv: (-kv[1]["commitment"], kv[0]))
    ]

    country_map_points = [rec for rec in recipient_summary if rec["recipient_scope"] == "economy" and rec["lat"] is not None and rec["lng"] is not None]
    regional_flow_nodes = [rec for rec in recipient_summary if rec["recipient_scope"] == "regional"]

    donor_options = [d["donor"] for d in donor_summary[:80]]
    mode_options = sorted({row["mode"] for row in facts_list})
    region_options = sorted({row["region"] for row in facts_list if row["region"]})
    region_detail_options = sorted({row["recipient_region_detail"] for row in facts_list if row["recipient_region_detail"]})

    overview_stats = {
        "totalCommitment": round(sum(d["commitment"] for d in donor_summary), 2),
        "totalDisbursement": round(sum(d["disbursement"] for d in donor_summary), 2),
        "donorCount": len(donor_totals),
        "recipientCount": len([r for r in recipient_summary if r["recipient_scope"] == "economy"]),
        "regionalRecipientCount": len([r for r in recipient_summary if r["recipient_scope"] == "regional"]),
        "countryMapCount": len(country_map_points),
        "factCount": len(facts_list),
    }

    country_records_export = {}
    for recipient, records in country_records.items():
        sorted_records = sorted(
            records,
            key=lambda row: (
                -(row["commitment"] or 0.0),
                -(row["disbursement"] or 0.0),
                -(row["year"] or 0),
            ),
        )
        country_records_export[recipient] = sorted_records[:80]

    file_text = f"""// Auto-generated from crs_transport_dashboard_ready.csv
// Do not edit manually. Rebuild with build_crs_dashboard_data.py.

export interface CRSFact {{
  year: number;
  donor: string;
  agency: string;
  recipient: string;
  recipient_scope: string;
  recipient_region_detail: string;
  region: string;
  mode: string;
  mode_detail: string;
  flow: string;
  commitment: number;
  disbursement: number;
  count: number;
}}

export interface CRSRecipientSummary {{
  recipient: string;
  recipient_scope: string;
  region: string;
  recipient_region_detail: string;
  commitment: number;
  disbursement: number;
  count: number;
  lat: number | null;
  lng: number | null;
}}

export interface CRSCountryRecord {{
  year: number | null;
  donor: string;
  agency: string;
  recipient: string;
  region: string;
  mode: string;
  mode_detail: string;
  flow: string;
  commitment: number;
  disbursement: number;
  title: string;
  description: string;
}}

export const CRS_MODE_COLORS: Record<string, string> = {to_js(MODE_COLORS)};
export const CRS_OVERVIEW_STATS = {to_js(overview_stats)};
export const CRS_FACTS: CRSFact[] = {to_js(facts_list)};
export const CRS_YEAR_SERIES = {to_js(year_series)};
export const CRS_DONOR_SUMMARY = {to_js(donor_summary)};
export const CRS_RECIPIENT_SUMMARY: CRSRecipientSummary[] = {to_js(recipient_summary)};
export const CRS_MODE_SUMMARY = {to_js(mode_summary)};
export const CRS_REGION_DETAIL_SUMMARY = {to_js(region_detail_summary_list)};
export const CRS_COUNTRY_MAP_POINTS: CRSRecipientSummary[] = {to_js(country_map_points)};
export const CRS_REGIONAL_RECIPIENTS = {to_js(regional_flow_nodes)};
export const CRS_DONOR_OPTIONS = {to_js(donor_options)};
export const CRS_MODE_OPTIONS = {to_js(mode_options)};
export const CRS_REGION_OPTIONS = {to_js(region_options)};
export const CRS_REGION_DETAIL_OPTIONS = {to_js(region_detail_options)};
export const CRS_TOP_RECORDS = {to_js(top_records)};
export const CRS_COUNTRY_RECORDS: Record<string, CRSCountryRecord[]> = {to_js(country_records_export)};

export const crsFmt = {{
  usdM: (v: number): string => {{
    if (!Number.isFinite(v)) return '—';
    if (v >= 1000) return `$${{(v / 1000).toFixed(1)}}B`;
    return `$${{v.toFixed(1)}}M`;
  }},
  num: (n: number): string => n.toLocaleString(),
}};
"""

    OUT_TS.write_text(file_text, encoding="utf-8")
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
    records_index = shard_records(all_records)
    print(f"Wrote {OUT_TS}")
    print(f"Wrote {OUT_RECORDS_INDEX}")
    print(f"Record chunks: {len(records_index['chunks'])}")
    print(f"Facts: {len(facts_list)}")


if __name__ == "__main__":
    main()
