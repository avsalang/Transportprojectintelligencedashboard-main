import csv
import json
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parent
WORKSPACE = ROOT.parent
EMOBILITY_CSV = WORKSPACE / "emobility_review_batches_completed" / "crs_emobility_tagged_records_final.csv"
ROAD_SAFETY_CSV = WORKSPACE / "crs_road_safety_hits_v2.csv"
OUT_TS = ROOT / "src" / "app" / "data" / "themeData.ts"

THEMES = {
    "e_mobility": {
        "label": "E-Mobility",
        "shortLabel": "E-Mobility",
        "description": "Electric mobility, transport electrification, charging, grid integration, and enabling systems across all transport modes.",
        "color": "#0EA5E9",
    },
    "road_safety": {
        "label": "Road Safety",
        "shortLabel": "Road Safety",
        "description": "Projects and transactions related to road safety, safety management, safer infrastructure, and transport safety interventions.",
        "color": "#F97316",
    },
}

EMOBILITY_SUBTYPES = [
    ("electric_vehicle", "Electric Vehicle"),
    ("public_transport_electrification", "Public Transport Electrification"),
    ("charging_infrastructure", "Charging Infrastructure"),
    ("power_grid_and_energy_integration", "Power Grid & Energy Integration"),
    ("battery_systems_and_supply_chain", "Battery Systems & Supply Chain"),
    ("recycling_circularity", "Recycling & Circularity"),
    ("policy_regulation_and_standards", "Policy, Regulation & Standards"),
    ("financing_and_business_models", "Financing & Business Models"),
    ("operations_maintenance_and_skills", "Operations, Maintenance & Skills"),
    ("urban_mobility_and_last_mile_electrification", "Urban Mobility & Last-Mile Electrification"),
    ("freight_and_logistics_electrification", "Freight & Logistics Electrification"),
    ("environmental_and_climate_impacts", "Environmental & Climate Impacts"),
    ("equity_access_and_inclusion", "Equity, Access & Inclusion"),
    ("data_digital_systems_and_innovation", "Data, Digital Systems & Innovation"),
    ("safety_and_risk_management", "Safety & Risk Management"),
    ("institutional_coordination_and_market_development", "Institutional Coordination & Market Development"),
]


def clean(value):
    text = str(value or "").strip()
    return text


def parse_float(value):
    try:
        return float(value or 0)
    except ValueError:
        return 0.0


def parse_int(value):
    try:
        return int(float(value or 0))
    except ValueError:
        return None


def truthy(value):
    return clean(value).upper() in {"TRUE", "1", "YES"}


def ranking_rows(counter, top=10):
    rows = []
    for label, values in sorted(counter.items(), key=lambda item: (-item[1]["commitment_defl"], item[0]))[:top]:
        rows.append(
            {
                "label": label or "Unknown",
                "commitment": round(values["commitment"], 4),
                "disbursement": round(values["disbursement"], 4),
                "commitment_defl": round(values["commitment_defl"], 4),
                "disbursement_defl": round(values["disbursement_defl"], 4),
                "count": values["count"],
            }
        )
    return rows


def build_emobility_sankey(theme_rows, top_donor_count=8, top_recipient_count=10):
    donor_totals = defaultdict(float)
    recipient_totals = defaultdict(float)
    tag_totals = defaultdict(float)
    donor_tag = defaultdict(float)
    tag_recipient = defaultdict(float)

    for row in theme_rows:
        tags = row["tags"]
        if not tags:
            continue
        donor = row["donor"] or "Unknown donor"
        recipient = row["recipient"] or "Unknown recipient"
        value = row["commitment_defl"] / len(tags)
        if value <= 0:
            continue
        for tag in tags:
            donor_totals[donor] += value
            recipient_totals[recipient] += value
            tag_totals[tag] += value

    top_donors = {
        label
        for label, _value in sorted(donor_totals.items(), key=lambda item: (-item[1], item[0]))[:top_donor_count]
    }
    top_recipients = {
        label
        for label, _value in sorted(recipient_totals.items(), key=lambda item: (-item[1], item[0]))[:top_recipient_count]
    }

    for row in theme_rows:
        tags = row["tags"]
        if not tags:
            continue
        donor = row["donor"] if row["donor"] in top_donors else "Other donors"
        recipient = row["recipient"] if row["recipient"] in top_recipients else "Other recipients"
        value = row["commitment_defl"] / len(tags)
        if value <= 0:
            continue
        for tag in tags:
            donor_tag[(donor, tag)] += value
            tag_recipient[(tag, recipient)] += value

    active_donors = {donor for donor, _tag in donor_tag}
    active_tags = {tag for _donor, tag in donor_tag} | {tag for tag, _recipient in tag_recipient}
    active_recipients = {recipient for _tag, recipient in tag_recipient}

    def node_total(role, name):
        if role == "donor":
            return sum(value for (donor, _tag), value in donor_tag.items() if donor == name)
        if role == "subtag":
            incoming = sum(value for (_donor, tag), value in donor_tag.items() if tag == name)
            outgoing = sum(value for (tag, _recipient), value in tag_recipient.items() if tag == name)
            return max(incoming, outgoing)
        return sum(value for (_tag, recipient), value in tag_recipient.items() if recipient == name)

    nodes = []
    for name in sorted(active_donors, key=lambda item: (-node_total("donor", item), item)):
        nodes.append({"id": f"donor::{name}", "name": name, "role": "donor", "totalValue": round(node_total("donor", name), 4)})
    for name in sorted(active_tags, key=lambda item: (-node_total("subtag", item), item)):
        nodes.append({"id": f"subtag::{name}", "name": name, "role": "subtag", "totalValue": round(node_total("subtag", name), 4)})
    for name in sorted(active_recipients, key=lambda item: (-node_total("recipient", item), item)):
        nodes.append({"id": f"recipient::{name}", "name": name, "role": "recipient", "totalValue": round(node_total("recipient", name), 4)})

    node_index = {node["id"]: index for index, node in enumerate(nodes)}
    links = []
    for (donor, tag), value in donor_tag.items():
        source_id = f"donor::{donor}"
        target_id = f"subtag::{tag}"
        if source_id in node_index and target_id in node_index and value >= 0.05:
            links.append(
                {
                    "source": node_index[source_id],
                    "target": node_index[target_id],
                    "sourceName": donor,
                    "targetName": tag,
                    "value": round(value, 4),
                }
            )
    for (tag, recipient), value in tag_recipient.items():
        source_id = f"subtag::{tag}"
        target_id = f"recipient::{recipient}"
        if source_id in node_index and target_id in node_index and value >= 0.05:
            links.append(
                {
                    "source": node_index[source_id],
                    "target": node_index[target_id],
                    "sourceName": tag,
                    "targetName": recipient,
                    "value": round(value, 4),
                }
            )

    return {"nodes": nodes, "links": sorted(links, key=lambda item: item["value"], reverse=True)}


def load_theme_rows():
    datasets = []

    with EMOBILITY_CSV.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            datasets.append(
                {
                    "themeId": "e_mobility",
                    "rowNumber": clean(row.get("row_number")),
                    "year": parse_int(row.get("year")),
                    "donor": clean(row.get("donor")),
                    "agency": clean(row.get("agency")),
                    "recipient": clean(row.get("recipient")),
                    "region": clean(row.get("region")),
                    "mode": clean(row.get("mode")) or "Other",
                    "modeDetail": clean(row.get("mode_detail")),
                    "flow": clean(row.get("flow")),
                    "commitment": parse_float(row.get("commitment")),
                    "disbursement": parse_float(row.get("disbursement")),
                    "commitment_defl": parse_float(row.get("commitment_defl")),
                    "disbursement_defl": parse_float(row.get("disbursement_defl")),
                    "title": clean(row.get("title")),
                    "description": clean(row.get("long_description")) or clean(row.get("short_description")) or clean(row.get("purpose")),
                    "tags": [label for key, label in EMOBILITY_SUBTYPES if truthy(row.get(key))],
                    "confidence": clean(row.get("confidence")),
                    "needsReview": truthy(row.get("needs_review")),
                }
            )

    with ROAD_SAFETY_CSV.open("r", encoding="utf-8-sig", newline="") as handle:
        for idx, row in enumerate(csv.DictReader(handle), start=1):
            datasets.append(
                {
                    "themeId": "road_safety",
                    "rowNumber": clean(row.get("row_number")) or f"road-{idx}",
                    "year": parse_int(row.get("year")),
                    "donor": clean(row.get("donor_name_standardized")) or clean(row.get("donor_name")),
                    "agency": clean(row.get("agency_name_standardized")) or clean(row.get("agency_name")),
                    "recipient": clean(row.get("recipient_standardized")) or clean(row.get("recipient_name")),
                    "region": clean(row.get("region_standardized")) or clean(row.get("region_name")),
                    "mode": clean(row.get("mode_ato_umbrella")) or "Other",
                    "modeDetail": clean(row.get("mode_ato_detail")) or clean(row.get("purpose_name")),
                    "flow": clean(row.get("flow_name")),
                    "commitment": parse_float(row.get("usd_commitment")),
                    "disbursement": parse_float(row.get("usd_disbursement")),
                    "commitment_defl": parse_float(row.get("usd_commitment_defl")),
                    "disbursement_defl": parse_float(row.get("usd_disbursement_defl")),
                    "title": clean(row.get("project_title")) or clean(row.get("short_description")),
                    "description": clean(row.get("long_description")) or clean(row.get("short_description")) or clean(row.get("purpose_name")),
                    "tags": [],
                    "confidence": "",
                    "needsReview": False,
                }
            )

    return datasets


def add_agg(bucket, row):
    bucket["commitment"] += row["commitment"]
    bucket["disbursement"] += row["disbursement"]
    bucket["commitment_defl"] += row["commitment_defl"]
    bucket["disbursement_defl"] += row["disbursement_defl"]
    bucket["count"] += 1


def main():
    rows = load_theme_rows()
    by_theme = defaultdict(list)
    for row in rows:
        by_theme[row["themeId"]].append(row)

    summaries = []
    top_donors = {}
    top_recipients = {}
    mode_breakdown = {}
    sample_records = {}
    subtype_rows = []
    emobility_sankey = {"nodes": [], "links": []}
    year_map = defaultdict(lambda: defaultdict(lambda: {"commitment_defl": 0.0, "disbursement_defl": 0.0, "count": 0}))

    for theme_id, theme_rows in by_theme.items():
        years = [row["year"] for row in theme_rows if row["year"]]
        donors = {row["donor"] for row in theme_rows if row["donor"]}
        recipients = {row["recipient"] for row in theme_rows if row["recipient"]}
        mode_counts = Counter(row["mode"] for row in theme_rows)

        total = {
            "commitment": sum(row["commitment"] for row in theme_rows),
            "disbursement": sum(row["disbursement"] for row in theme_rows),
            "commitment_defl": sum(row["commitment_defl"] for row in theme_rows),
            "disbursement_defl": sum(row["disbursement_defl"] for row in theme_rows),
        }

        summaries.append(
            {
                "id": theme_id,
                **THEMES[theme_id],
                "recordCount": len(theme_rows),
                "commitment": round(total["commitment"], 4),
                "disbursement": round(total["disbursement"], 4),
                "commitment_defl": round(total["commitment_defl"], 4),
                "disbursement_defl": round(total["disbursement_defl"], 4),
                "donorCount": len(donors),
                "recipientCount": len(recipients),
                "yearMin": min(years) if years else None,
                "yearMax": max(years) if years else None,
                "topMode": mode_counts.most_common(1)[0][0] if mode_counts else "Unknown",
            }
        )

        donor_counter = defaultdict(lambda: {"commitment": 0.0, "disbursement": 0.0, "commitment_defl": 0.0, "disbursement_defl": 0.0, "count": 0})
        recipient_counter = defaultdict(lambda: {"commitment": 0.0, "disbursement": 0.0, "commitment_defl": 0.0, "disbursement_defl": 0.0, "count": 0})
        mode_counter = defaultdict(lambda: {"commitment": 0.0, "disbursement": 0.0, "commitment_defl": 0.0, "disbursement_defl": 0.0, "count": 0})
        subtype_counter = defaultdict(lambda: {"commitment": 0.0, "disbursement": 0.0, "commitment_defl": 0.0, "disbursement_defl": 0.0, "count": 0})

        for row in theme_rows:
            add_agg(donor_counter[row["donor"] or "Unknown"], row)
            add_agg(recipient_counter[row["recipient"] or "Unknown"], row)
            add_agg(mode_counter[row["mode"] or "Unknown"], row)
            if row["year"]:
                year_map[row["year"]][theme_id]["commitment_defl"] += row["commitment_defl"]
                year_map[row["year"]][theme_id]["disbursement_defl"] += row["disbursement_defl"]
                year_map[row["year"]][theme_id]["count"] += 1
            for tag in row["tags"]:
                add_agg(subtype_counter[tag], row)

        top_donors[theme_id] = ranking_rows(donor_counter)
        top_recipients[theme_id] = ranking_rows(recipient_counter)
        mode_breakdown[theme_id] = ranking_rows(mode_counter, top=8)
        if theme_id == "e_mobility":
            subtype_rows = ranking_rows(subtype_counter, top=len(EMOBILITY_SUBTYPES))
            emobility_sankey = build_emobility_sankey(theme_rows)

        sample_records[theme_id] = [
            {
                "rowNumber": row["rowNumber"],
                "year": row["year"],
                "donor": row["donor"],
                "recipient": row["recipient"],
                "mode": row["mode"],
                "commitment_defl": round(row["commitment_defl"], 4),
                "disbursement_defl": round(row["disbursement_defl"], 4),
                "title": row["title"],
                "description": row["description"][:360],
                "tags": row["tags"][:5],
                "needsReview": row["needsReview"],
            }
            for row in sorted(theme_rows, key=lambda item: item["commitment_defl"], reverse=True)[:80]
        ]

    year_series = []
    for year in sorted(year_map):
        entry = {"year": year}
        for theme_id in THEMES:
            entry[f"{theme_id}_commitment_defl"] = round(year_map[year][theme_id]["commitment_defl"], 4)
            entry[f"{theme_id}_disbursement_defl"] = round(year_map[year][theme_id]["disbursement_defl"], 4)
            entry[f"{theme_id}_count"] = year_map[year][theme_id]["count"]
        year_series.append(entry)

    payload = {
        "summaries": summaries,
        "yearSeries": year_series,
        "topDonors": top_donors,
        "topRecipients": top_recipients,
        "modeBreakdown": mode_breakdown,
        "emobilitySubtypes": subtype_rows,
        "emobilitySankey": emobility_sankey,
        "sampleRecords": sample_records,
    }

    OUT_TS.write_text(
        "// Auto-generated by build_theme_dashboard_data.py\n"
        "// Do not edit manually.\n\n"
        "export type ThemeId = 'e_mobility' | 'road_safety';\n\n"
        "export type ThemeRankingRow = { label: string; commitment: number; disbursement: number; commitment_defl: number; disbursement_defl: number; count: number };\n\n"
        "export type ThemeRecord = { rowNumber: string; year: number | null; donor: string; recipient: string; mode: string; commitment_defl: number; disbursement_defl: number; title: string; description: string; tags: string[]; needsReview: boolean };\n\n"
        "export type ThemeSankeyNode = { id: string; name: string; role: 'donor' | 'subtag' | 'recipient'; totalValue: number; color?: string };\n\n"
        "export type ThemeSankeyLink = { source: number; target: number; sourceName: string; targetName: string; value: number; color?: string };\n\n"
        "export type ThemeSankeyData = { nodes: ThemeSankeyNode[]; links: ThemeSankeyLink[] };\n\n"
        f"export const THEME_SUMMARIES = {json.dumps(payload['summaries'], ensure_ascii=False, indent=2)} as const;\n\n"
        f"export const THEME_YEAR_SERIES = {json.dumps(payload['yearSeries'], ensure_ascii=False, indent=2)};\n\n"
        f"export const THEME_TOP_DONORS: Record<ThemeId, ThemeRankingRow[]> = {json.dumps(payload['topDonors'], ensure_ascii=False, indent=2)};\n\n"
        f"export const THEME_TOP_RECIPIENTS: Record<ThemeId, ThemeRankingRow[]> = {json.dumps(payload['topRecipients'], ensure_ascii=False, indent=2)};\n\n"
        f"export const THEME_MODE_BREAKDOWN: Record<ThemeId, ThemeRankingRow[]> = {json.dumps(payload['modeBreakdown'], ensure_ascii=False, indent=2)};\n\n"
        f"export const EMOBILITY_SUBTYPES: ThemeRankingRow[] = {json.dumps(payload['emobilitySubtypes'], ensure_ascii=False, indent=2)};\n\n"
        f"export const EMOBILITY_TECHNOLOGY_ENABLER_SANKEY: ThemeSankeyData = {json.dumps(payload['emobilitySankey'], ensure_ascii=False, indent=2)};\n\n"
        f"export const THEME_SAMPLE_RECORDS: Record<ThemeId, ThemeRecord[]> = {json.dumps(payload['sampleRecords'], ensure_ascii=False, indent=2)};\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUT_TS}")


if __name__ == "__main__":
    main()
