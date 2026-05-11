import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parent
WORKSPACE = ROOT.parent
AI_THEME_TAGS_CSV = WORKSPACE / "theme_tagging_new_semantic_rpt10_strict" / "ai_tagging_results_crs_rows_positive_long.csv"
THEME_DEFINITIONS_JSON = WORKSPACE / "theme_tagging_new_semantic_rpt10_strict" / "theme_definitions_new.json"
CRS_RECORDS_INDEX = ROOT / "public" / "data" / "crs-decade-records" / "index.json"
OUT_TS = ROOT / "src" / "app" / "data" / "themeData.ts"
ATO_ECONOMIES_TS = ROOT / "src" / "app" / "data" / "atoEconomies.ts"

RECIPIENT_ALIAS_MAP = {
    "China": "People's Republic of China",
    "China (People's Republic of)": "People's Republic of China",
    "Korea": "Republic of Korea",
    "Lao PDR": "Lao People's Democratic Republic",
    "Laos": "Lao People's Democratic Republic",
    "Turkey": "Türkiye",
    "Turkiye": "Türkiye",
    "Vietnam": "Viet Nam",
}

DONOR_ALIAS_MAP = {
    "Korea": "Republic of Korea",
    "Slovak Republic": "Slovakia",
    "Chinese Taipei": "Taipei,China",
}

ATO_REGIONAL_TERMS = ("asia", "pacific", "oceania")

THEMES = {
    "e_mobility": {
        "label": "E-Mobility",
        "shortLabel": "E-Mobility",
        "description": "Projects explicitly supporting electric mobility, electric vehicles, charging or battery infrastructure, grid integration, electric freight and logistics, EV finance, pilots, skills, data, or inclusion.",
        "color": "#0891B2",
    },
    "active_transport": {
        "label": "Active Transport",
        "shortLabel": "Active Transport",
        "description": "Projects supporting walking, cycling, non-motorized transport, pedestrian infrastructure, cycling facilities, safe active mobility, complete streets, and first/last-mile active access.",
        "color": "#65A30D",
    },
    "urban_transport": {
        "label": "Urban Transport",
        "shortLabel": "Urban Transport",
        "description": "Projects focused on mobility within cities, towns, metropolitan areas, or other urban settlements, including public transport, urban roads and streets, traffic management, terminals, multimodal integration, TOD, shared mobility, and urban logistics.",
        "color": "#4F46E5",
    },
}


def clean(value):
    text = str(value or "").strip()
    return text


def load_ato_economies():
    text = ATO_ECONOMIES_TS.read_text(encoding="utf-8")
    return set(re.findall(r'"([^"]+)"', text))


def normalize_recipient(value):
    recipient = clean(value)
    return RECIPIENT_ALIAS_MAP.get(recipient, recipient)


def normalize_donor(value):
    donor = clean(value)
    return DONOR_ALIAS_MAP.get(donor, donor)


def is_ato_scoped_recipient(recipient, scope, region_detail="", region=""):
    recipient = normalize_recipient(recipient)
    scope = clean(scope).lower()
    if scope == "economy" or not scope:
        if recipient in ATO_ECONOMIES:
            return True

    regional_text = " ".join(
        [recipient, clean(region_detail), clean(region)]
    ).lower()
    is_regional = scope == "regional" or ", regional" in recipient.lower()
    return is_regional and any(term in regional_text for term in ATO_REGIONAL_TERMS)


ATO_ECONOMIES = load_ato_economies()


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


def load_subtheme_labels():
    data = json.loads(THEME_DEFINITIONS_JSON.read_text(encoding="utf-8"))
    labels = {}
    for theme in data.get("themes", []):
        for subtheme in theme.get("subthemes", []):
            labels[subtheme["id"]] = subtheme["label"]
    return labels


def load_crs_record_lookup():
    index = json.loads(CRS_RECORDS_INDEX.read_text(encoding="utf-8"))
    lookup = {}
    for chunk in index["chunks"]:
        chunk_path = ROOT / "public" / chunk["file"]
        for record in json.loads(chunk_path.read_text(encoding="utf-8")):
            lookup[str(record.get("row_number"))] = record
    return lookup


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
    crs_records = load_crs_record_lookup()
    subtheme_labels = load_subtheme_labels()
    grouped = {}

    with AI_THEME_TAGS_CSV.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            row_number = clean(row.get("row_number"))
            theme_id = clean(row.get("theme_id"))
            if theme_id not in THEMES or not row_number:
                continue

            crs = crs_records.get(row_number)
            if not crs:
                continue

            recipient = normalize_recipient(crs.get("recipient"))
            if not is_ato_scoped_recipient(
                recipient,
                crs.get("recipient_scope"),
                crs.get("recipient_region_detail"),
                crs.get("region"),
            ):
                continue

            key = (row_number, theme_id)
            entry = grouped.get(key)
            if entry is None:
                entry = {
                    "themeId": theme_id,
                    "rowNumber": row_number,
                    "year": parse_int(crs.get("year")),
                    "donor": normalize_donor(crs.get("donor")),
                    "agency": clean(crs.get("agency")),
                    "recipient": recipient,
                    "region": clean(crs.get("region")),
                    "mode": clean(crs.get("mode")) or "Other",
                    "modeDetail": clean(crs.get("mode_detail")),
                    "flow": clean(crs.get("flow")),
                    "commitment": parse_float(crs.get("commitment")),
                    "disbursement": parse_float(crs.get("disbursement")),
                    "commitment_defl": parse_float(crs.get("commitment_defl")),
                    "disbursement_defl": parse_float(crs.get("disbursement_defl")),
                    "title": clean(crs.get("title")),
                    "description": clean(crs.get("long_description")) or clean(crs.get("short_description")) or clean(crs.get("purpose")),
                    "tags": [],
                    "tagIds": set(),
                    "needsReview": False,
                }
                grouped[key] = entry

            subtheme_id = clean(row.get("subtheme_id"))
            tag_label = subtheme_labels.get(subtheme_id)
            if not tag_label:
                tag_label = f"{THEMES[theme_id]['shortLabel']} tag"
            if tag_label not in entry["tagIds"]:
                entry["tagIds"].add(tag_label)
                entry["tags"].append(tag_label)
            entry["needsReview"] = entry["needsReview"] or truthy(row.get("needs_human_review"))

    datasets = []
    for entry in grouped.values():
        entry.pop("tagIds", None)
        datasets.append(entry)

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
    all_records = {}
    emobility_sankey = {"nodes": [], "links": []}
    year_map = defaultdict(lambda: defaultdict(lambda: {"commitment_defl": 0.0, "disbursement_defl": 0.0, "count": 0}))

    for theme_id in THEMES:
        theme_rows = by_theme.get(theme_id, [])
        if not theme_rows:
            continue
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
            subtype_rows = ranking_rows(subtype_counter, top=max(len(subtype_counter), 1))
            emobility_sankey = build_emobility_sankey(theme_rows)

        all_records[theme_id] = [
            {
                "rowNumber": row["rowNumber"],
                "year": row["year"],
                "donor": row["donor"],
                "recipient": row["recipient"],
                "mode": row["mode"],
                "flow": row["flow"],
                "commitment_defl": round(row["commitment_defl"], 4),
                "disbursement_defl": round(row["disbursement_defl"], 4),
                "title": row["title"],
                "description": row["description"][:360],
                "tags": row["tags"][:5],
                "needsReview": row["needsReview"],
            }
            for row in theme_rows
        ]

        sample_records[theme_id] = [
            {
                "rowNumber": row["rowNumber"],
                "year": row["year"],
                "donor": row["donor"],
                "recipient": row["recipient"],
                "mode": row["mode"],
                "flow": row["flow"],
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
        "records": all_records,
        "sampleRecords": sample_records,
    }

    theme_type = " | ".join(json.dumps(theme_id) for theme_id in THEMES)

    OUT_TS.write_text(
        "// Auto-generated by build_theme_dashboard_data.py\n"
        "// Do not edit manually.\n\n"
        f"export type ThemeId = {theme_type};\n\n"
        "export type ThemeRankingRow = { label: string; commitment: number; disbursement: number; commitment_defl: number; disbursement_defl: number; count: number };\n\n"
        "export type ThemeRecord = { rowNumber: string; year: number | null; donor: string; recipient: string; mode: string; flow: string; commitment_defl: number; disbursement_defl: number; title: string; description: string; tags: string[]; needsReview: boolean };\n\n"
        "export type ThemeSankeyNode = { id: string; name: string; role: 'donor' | 'subtag' | 'recipient'; totalValue: number; color?: string };\n\n"
        "export type ThemeSankeyLink = { source: number; target: number; sourceName: string; targetName: string; value: number; flowType?: string; color?: string };\n\n"
        "export type ThemeSankeyData = { nodes: ThemeSankeyNode[]; links: ThemeSankeyLink[] };\n\n"
        f"export const THEME_SUMMARIES = {json.dumps(payload['summaries'], ensure_ascii=False, indent=2)} as const;\n\n"
        f"export const THEME_YEAR_SERIES = {json.dumps(payload['yearSeries'], ensure_ascii=False, indent=2)};\n\n"
        f"export const THEME_TOP_DONORS: Record<ThemeId, ThemeRankingRow[]> = {json.dumps(payload['topDonors'], ensure_ascii=False, indent=2)};\n\n"
        f"export const THEME_TOP_RECIPIENTS: Record<ThemeId, ThemeRankingRow[]> = {json.dumps(payload['topRecipients'], ensure_ascii=False, indent=2)};\n\n"
        f"export const THEME_MODE_BREAKDOWN: Record<ThemeId, ThemeRankingRow[]> = {json.dumps(payload['modeBreakdown'], ensure_ascii=False, indent=2)};\n\n"
        f"export const EMOBILITY_SUBTYPES: ThemeRankingRow[] = {json.dumps(payload['emobilitySubtypes'], ensure_ascii=False, indent=2)};\n\n"
        f"export const EMOBILITY_TECHNOLOGY_ENABLER_SANKEY: ThemeSankeyData = {json.dumps(payload['emobilitySankey'], ensure_ascii=False, indent=2)};\n\n"
        f"export const THEME_RECORDS: Record<ThemeId, ThemeRecord[]> = {json.dumps(payload['records'], ensure_ascii=False, indent=2)};\n\n"
        f"export const THEME_SAMPLE_RECORDS: Record<ThemeId, ThemeRecord[]> = {json.dumps(payload['sampleRecords'], ensure_ascii=False, indent=2)};\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUT_TS}")


if __name__ == "__main__":
    main()
