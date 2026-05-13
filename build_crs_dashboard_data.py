import csv
import json
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parent
CRS_CSV = ROOT.parent / "crs_transport_dashboard_ready.csv"
COUNTRY_COORD_SOURCE = ROOT.parent / "transport_projects_cross_mdb_shareable_v5.csv"
OUT_TS = ROOT / "src" / "app" / "data" / "crsData.ts"
PUBLIC_DATA_DIR = ROOT / "public" / "data"
OUT_FACTS_JSON = PUBLIC_DATA_DIR / "crs-facts.json"
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


def load_ato_economies():
    source = ROOT / "src" / "app" / "data" / "atoEconomies.ts"
    text = source.read_text(encoding="utf-8")
    economies = set()
    for line in text.splitlines():
        line = line.strip().rstrip(",")
        if line.startswith('"') and line.endswith('"'):
            economies.add(line.strip('"'))
    return economies


def is_asia_regional_recipient(recipient, scope):
    if scope != "regional" or not recipient:
        return False
    text = recipient.lower()
    return ", regional" in text and "asia" in text


def is_ato_scoped_fact(record, ato_economies):
    if record.get("recipient_scope") == "economy":
        return record.get("recipient") in ato_economies
    return is_asia_regional_recipient(record.get("recipient"), record.get("recipient_scope"))


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


def dashboard_value(row, measure):
    if measure == "commitment":
        return row.get("commitment_defl") or row.get("commitment") or 0.0
    if measure == "disbursement":
        return row.get("disbursement_defl") or row.get("disbursement") or 0.0
    return row.get(measure) or 0.0


def normalize_mode_label(mode):
    lower = (mode or "Other").lower()
    if "road" in lower:
        return "Road"
    if "rail" in lower:
        return "Rail"
    if "air" in lower or "aviation" in lower:
        return "Aviation"
    if "water" in lower or "sea" in lower or "river" in lower or "maritime" in lower:
        return "Water"
    return "Other"


def aggregate_dashboard_rows(rows, key_fn):
    grouped = defaultdict(lambda: {"commitment": 0.0, "disbursement": 0.0, "commitment_defl": 0.0, "disbursement_defl": 0.0, "count": 0})
    for row in rows:
        key = key_fn(row) or "Unknown"
        entry = grouped[key]
        entry["commitment"] += row.get("commitment", 0.0)
        entry["disbursement"] += row.get("disbursement", 0.0)
        entry["commitment_defl"] += row.get("commitment_defl") or row.get("commitment", 0.0)
        entry["disbursement_defl"] += row.get("disbursement_defl") or row.get("disbursement", 0.0)
        entry["count"] += row.get("count", 0)

    return [
        {
            "label": label,
            "commitment": round(vals["commitment"], 4),
            "disbursement": round(vals["disbursement"], 4),
            "commitment_defl": round(vals["commitment_defl"], 4),
            "disbursement_defl": round(vals["disbursement_defl"], 4),
            "count": vals["count"],
        }
        for label, vals in sorted(grouped.items(), key=lambda item: (-item[1]["commitment"], item[0]))
    ]


def build_default_overview_snapshot(rows, country_coords):
    sustainable_markers = ("climate_mitigation", "climate_adaptation", "gender", "drr", "biodiversity", "environment")
    sustainable_rows = [
        row for row in rows
        if any((row.get(marker) or 0) > 0 for marker in sustainable_markers)
    ]

    stats = {
        "commitment": round(sum(row.get("commitment", 0.0) for row in rows), 4),
        "disbursement": round(sum(row.get("disbursement", 0.0) for row in rows), 4),
        "commitment_defl": round(sum(row.get("commitment_defl") or row.get("commitment", 0.0) for row in rows), 4),
        "disbursement_defl": round(sum(row.get("disbursement_defl") or row.get("disbursement", 0.0) for row in rows), 4),
        "count": sum(row.get("count", 0) for row in rows),
        "donorCount": len({row.get("donor") for row in rows}),
        "recipientCount": len({row.get("recipient") for row in rows}),
        "countryRecipientCount": len({row.get("recipient") for row in rows if row.get("recipient_scope") == "economy"}),
        "regionalRecipientCount": len({row.get("recipient") for row in rows if row.get("recipient_scope") == "regional"}),
        "sustainableCommitment": round(sum(row.get("commitment", 0.0) for row in sustainable_rows), 4),
        "sustainableCommitmentDefl": round(sum(row.get("commitment_defl") or row.get("commitment", 0.0) for row in sustainable_rows), 4),
        "sustainableCount": sum(row.get("count", 0) for row in sustainable_rows),
    }

    country_grouped = defaultdict(lambda: {"region": "", "commitment": 0.0, "disbursement": 0.0, "commitment_defl": 0.0, "disbursement_defl": 0.0, "count": 0})
    for row in rows:
        recipient = row.get("recipient")
        if row.get("recipient_scope") != "economy" or recipient not in country_coords:
            continue
        entry = country_grouped[recipient]
        entry["region"] = row.get("region") or entry["region"]
        entry["commitment"] += row.get("commitment", 0.0)
        entry["disbursement"] += row.get("disbursement", 0.0)
        entry["commitment_defl"] += row.get("commitment_defl") or row.get("commitment", 0.0)
        entry["disbursement_defl"] += row.get("disbursement_defl") or row.get("disbursement", 0.0)
        entry["count"] += row.get("count", 0)

    country_points = []
    for recipient, vals in country_grouped.items():
        country_points.append({
            "recipient": recipient,
            "region": vals["region"],
            "commitment": round(vals["commitment"], 4),
            "disbursement": round(vals["disbursement"], 4),
            "commitment_defl": round(vals["commitment_defl"], 4),
            "disbursement_defl": round(vals["disbursement_defl"], 4),
            "count": vals["count"],
            "lat": country_coords[recipient]["lat"],
            "lng": country_coords[recipient]["lng"],
        })
    country_points.sort(key=lambda row: (-row["commitment"], row["recipient"]))

    year_mode = defaultdict(lambda: {"year": "", "Road": 0.0, "Rail": 0.0, "Aviation": 0.0, "Water": 0.0, "Other": 0.0})
    for row in rows:
        year = row.get("year")
        if not year:
            continue
        entry = year_mode[year]
        entry["year"] = str(year)
        entry[normalize_mode_label(row.get("mode"))] += dashboard_value(row, "commitment_defl")

    donor_seed = aggregate_dashboard_rows(rows, lambda row: row.get("donor"))[:8]
    donor_mode = {
        item["label"]: {
            "label": item["label"],
            "commitment": item["commitment"],
            "disbursement": item["disbursement"],
            "Road": 0.0,
            "Rail": 0.0,
            "Aviation": 0.0,
            "Water": 0.0,
            "Other": 0.0,
        }
        for item in donor_seed
    }
    for row in rows:
        donor = row.get("donor")
        if donor in donor_mode:
            donor_mode[donor][normalize_mode_label(row.get("mode"))] += dashboard_value(row, "commitment_defl")

    sector_marker_map = {
        "Mitigation": "climate_mitigation",
        "Adaptation": "climate_adaptation",
        "Gender": "gender",
        "DRR": "drr",
        "Biodiversity": "biodiversity",
        "Environment": "environment",
    }
    sector_rows = {
        label: {"label": label, "commitment": 0.0, "disbursement": 0.0, "commitment_defl": 0.0, "disbursement_defl": 0.0, "count": 0}
        for label in sector_marker_map
    }
    for row in rows:
        for label, marker in sector_marker_map.items():
            if (row.get(marker) or 0) <= 0:
                continue
            entry = sector_rows[label]
            entry["commitment"] += row.get("commitment", 0.0)
            entry["disbursement"] += row.get("disbursement", 0.0)
            entry["commitment_defl"] += row.get("commitment_defl") or row.get("commitment", 0.0)
            entry["disbursement_defl"] += row.get("disbursement_defl") or row.get("disbursement", 0.0)
            entry["count"] += row.get("count", 0)

    def rounded_mapping_list(values):
        return [
            {key: (round(value, 4) if isinstance(value, float) else value) for key, value in row.items()}
            for row in values
        ]

    return {
        "stats": stats,
        "countryPoints": country_points,
        "yearModeStack": rounded_mapping_list([row for _year, row in sorted(year_mode.items())]),
        "topRecipients": aggregate_dashboard_rows(rows, lambda row: row.get("recipient"))[:10],
        "topDonors": aggregate_dashboard_rows(rows, lambda row: row.get("donor"))[:10],
        "modeSeries": aggregate_dashboard_rows(rows, lambda row: row.get("mode"))[:10],
        "sectorSeries": sorted(rounded_mapping_list(sector_rows.values()), key=lambda row: -row["commitment"]),
        "donorModeStack": rounded_mapping_list(sorted(donor_mode.values(), key=lambda row: -row["commitment"])),
        "financingSeries": aggregate_dashboard_rows(rows, lambda row: row.get("flow"))[:10],
    }


def main():
    ato_economies = load_ato_economies()
    country_coords = load_country_coords()

    facts = defaultdict(lambda: {"commitment": 0.0, "disbursement": 0.0, "commitment_defl": 0.0, "disbursement_defl": 0.0, "count": 0})
    year_totals = defaultdict(lambda: {"commitment": 0.0, "disbursement": 0.0, "commitment_defl": 0.0, "disbursement_defl": 0.0})
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
            commitment_defl = parse_float(row.get("usd_commitment_defl"))
            disbursement_defl = parse_float(row.get("usd_disbursement_defl"))
            
            # Sustainability markers (usually 0, 1, 2)
            gender = parse_int(row.get("gender")) or 0
            climate_mitigation = parse_int(row.get("climate_mitigation")) or 0
            climate_adaptation = parse_int(row.get("climate_adaptation")) or 0
            environment = parse_int(row.get("environment")) or 0
            biodiversity = parse_int(row.get("biodiversity")) or 0
            drr = parse_int(row.get("drr")) or 0

            title = clean_text(row.get("project_title")) or clean_text(row.get("short_description")) or ""
            description = clean_text(row.get("long_description")) or ""

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
                climate_mitigation,
                climate_adaptation,
                gender,
                drr,
                biodiversity,
                environment,
            )
            facts[key]["commitment"] += commitment
            facts[key]["disbursement"] += disbursement
            facts[key]["commitment_defl"] += commitment_defl
            facts[key]["disbursement_defl"] += disbursement_defl
            facts[key]["count"] += 1

            if year is not None:
                year_totals[year]["commitment"] += commitment
                year_totals[year]["disbursement"] += disbursement
                year_totals[year]["commitment_defl"] += commitment_defl
                year_totals[year]["disbursement_defl"] += disbursement_defl

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
                        "commitment_defl": commitment_defl,
                        "disbursement_defl": disbursement_defl,
                        "title": title,
                        "description": description,
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
                "commitment": round(commitment, 2),
                "disbursement": round(disbursement, 2),
                "commitment_defl": round(commitment_defl, 2),
                "disbursement_defl": round(disbursement_defl, 2),
                "title": title,
                "description": description,
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
                "gender": gender,
                "climate_mitigation": climate_mitigation,
                "climate_adaptation": climate_adaptation,
                "environment": environment,
                "biodiversity": biodiversity,
                "drr": drr,
                "grant_equiv": parse_float(row.get("grant_equiv")),
                "usd_grant_equiv": parse_float(row.get("usd_grant_equiv")),
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
                        "commitment": round(commitment, 2),
                        "disbursement": round(disbursement, 2),
                        "commitment_defl": round(commitment_defl, 2),
                        "disbursement_defl": round(disbursement_defl, 2),
                        "title": title,
                        "description": description,
                        "climate_mitigation": climate_mitigation,
                        "climate_adaptation": climate_adaptation,
                        "gender": gender,
                        "drr": drr,
                        "biodiversity": biodiversity,
                        "environment": environment,
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
            "commitment_defl": round(vals["commitment_defl"], 4),
            "disbursement_defl": round(vals["disbursement_defl"], 4),
            "climate_mitigation": climate_mitigation,
            "climate_adaptation": climate_adaptation,
            "gender": gender,
            "drr": drr,
            "biodiversity": biodiversity,
            "environment": environment,
            "count": vals["count"],
        }
        for (year, donor, agency, recipient, recipient_scope, recipient_detail, region, mode, mode_detail, flow, climate_mitigation, climate_adaptation, gender, drr, biodiversity, environment), vals in facts.items()
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
    region_options = sorted({row["region"] for row in facts_list if row["region"]} | {"Asia-Pacific (ATO)"})
    region_detail_options = sorted({row["recipient_region_detail"] for row in facts_list if row["recipient_region_detail"]})
    ato_facts_list = [row for row in facts_list if is_ato_scoped_fact(row, ato_economies)]
    ato_donor_options = sorted({row["donor"] for row in ato_facts_list})
    ato_mode_options = sorted({row["mode"] for row in ato_facts_list})
    default_overview_snapshot = build_default_overview_snapshot(ato_facts_list, country_coords)

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


    # Simple Sankey data generation (Donor -> Mode -> Region)
    def build_sankey_data(records):
        node_map = {}
        def get_node(name, category):
            key = f"{category}:{name}"
            if key not in node_map:
                node_map[key] = len(node_map)
            return node_map[key]

        links = defaultdict(float)
        for r in records:
            d_idx = get_node(r['donor'], 'donor')
            m_idx = get_node(r['mode'], 'mode')
            r_idx = get_node(r['region'], 'region')
            links[(d_idx, m_idx)] += r.get('commitment', 0)
            links[(m_idx, r_idx)] += r.get('commitment', 0)

        nodes = [{"id": k, "name": k.split(':', 1)[1], "category": k.split(':', 1)[0]} for k, v in sorted(node_map.items(), key=lambda x: x[1])]
        return {
            "nodes": nodes,
            "links": [{"source": s, "target": t, "value": round(v, 2)} for (s, t), v in links.items() if v > 0]
        }

    sankey_data = build_sankey_data(all_records)

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
  commitment_defl?: number;
  disbursement_defl?: number;
  gender?: number;
  climate_mitigation?: number;
  climate_adaptation?: number;
  drr?: number;
  biodiversity?: number;
  environment?: number;
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
  commitment_defl?: number;
  disbursement_defl?: number;
  title: string;
  description: string;
  climate_mitigation?: number;
  climate_adaptation?: number;
  gender?: number;
  drr?: number;
  biodiversity?: number;
  environment?: number;
}}

export const CRS_MODE_COLORS: Record<string, string> = {to_js(MODE_COLORS)};
export const CRS_FACTS_URL = './data/crs-facts.json';
export const CRS_COUNTRY_MAP_POINTS: CRSRecipientSummary[] = {to_js(country_map_points)};
export const CRS_DONOR_OPTIONS = {to_js(ato_donor_options or donor_options)};
export const CRS_MODE_OPTIONS = {to_js(ato_mode_options or mode_options)};
export const CRS_DEFAULT_OVERVIEW = {to_js(default_overview_snapshot)};

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
    OUT_FACTS_JSON.write_text(
        json.dumps(ato_facts_list, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    records_index = shard_records(all_records)
    print(f"Wrote {OUT_TS}")
    print(f"Wrote {OUT_FACTS_JSON}")
    print(f"Wrote {OUT_RECORDS_INDEX}")
    print(f"Record chunks: {len(records_index['chunks'])}")
    print(f"Facts: {len(facts_list)}")
    print(f"ATO-scoped facts: {len(ato_facts_list)}")


if __name__ == "__main__":
    main()
