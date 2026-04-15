import csv
import json
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATA_CSV = ROOT.parent / "transport_projects_cross_mdb_shareable_v5.csv"
OUT_TS = ROOT / "src" / "app" / "data" / "mockData.ts"

FUNDING_SOURCES = ["World Bank", "ADB", "AIIB"]
MDB_SHORT = {"World Bank": "wb", "ADB": "adb", "AIIB": "aiib"}
MDB_COLORS = {
    "World Bank": "#1D4ED8",
    "ADB": "#E3500C",
    "AIIB": "#059669",
}
MODE_COLORS = {
    "Road": "#F59E0B",
    "Rail": "#2563EB",
    "Water": "#06B6D4",
    "Aviation": "#8B5CF6",
    "Other": "#64748B",
}
MODE_DETAIL_COLORS = {
    "Roads": "#F59E0B",
    "Railways": "#2563EB",
    "Urban rail / metro": "#1D4ED8",
    "Ports and maritime terminals": "#06B6D4",
    "Airports": "#8B5CF6",
    "Urban transit (non-rail)": "#10B981",
    "Logistics and trade facilitation": "#EF4444",
    "Multimodal transport": "#F97316",
    "Transport policy and financing": "#6366F1",
    "Other / unspecified transport": "#94A3B8",
}
STATUS_COLORS = {
    "Active": "#059669",
    "Closed": "#6B7280",
    "Dropped": "#DC2626",
    "Approved": "#2563EB",
    "Proposed": "#7C3AED",
    "Pipeline": "#7C3AED",
    "Terminated / Cancelled": "#B91C1C",
    "Unknown": "#64748B",
}


def clean_text(value):
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def parse_float(value):
    text = clean_text(value)
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def parse_int(value):
    text = clean_text(value)
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def parse_bool(value):
    text = (clean_text(value) or "").upper()
    return text in {"TRUE", "1", "YES"}


def display_country(row):
    status = clean_text(row.get("country_standardization_status"))
    if status in {"exact", "alias"}:
        return clean_text(row.get("country_standardized")) or clean_text(row.get("country"))
    return clean_text(row.get("country_original")) or clean_text(row.get("country"))


def display_region(row):
    return clean_text(row.get("region")) or "Unknown"


def display_mode(row):
    return clean_text(row.get("transport_mode_standardized")) or "Unknown"


def display_mode_ato_umbrella(row):
    return clean_text(row.get("mode_ato_umbrella")) or "Other"


def display_mode_ato_detail(row):
    return clean_text(row.get("mode_ato_detail")) or "Other / unspecified transport"


def display_text(row, key, fallback="Unknown"):
    return clean_text(row.get(key)) or fallback


def build_project(row):
    source = display_text(row, "funding_source")
    project_id = clean_text(row.get("project_id"))
    source_uid = clean_text(row.get("source_record_uid")) or clean_text(row.get("source_locator")) or "unknown"
    project_key = f"{source}-{project_id or source_uid}"
    return {
        "id": project_key,
        "funding_source": source,
        "project_name": display_text(row, "project_name"),
        "country": display_country(row),
        "country_original": clean_text(row.get("country_original")) or clean_text(row.get("country")),
        "region": display_region(row),
        "project_status": display_text(row, "project_status"),
        "approval_year": parse_int(row.get("approval_year")),
        "approval_date": clean_text(row.get("approval_date")) or "",
        "sector": display_text(row, "sector_standardized"),
        "subsector": display_text(row, "subsector_standardized"),
        "transport_mode": display_mode(row),
        "transport_mode_category": display_mode_ato_umbrella(row),
        "transport_mode_detail": display_mode_ato_detail(row),
        "mode_ato_umbrella": display_mode_ato_umbrella(row),
        "mode_ato_detail": display_mode_ato_detail(row),
        "mode_ato_mapping_confidence": clean_text(row.get("mode_ato_mapping_confidence")) or "",
        "transport_function": clean_text(row.get("transport_function")) or "",
        "transport_context": clean_text(row.get("transport_context")) or "",
        "infrastructure_type": clean_text(row.get("infrastructure_type")) or "",
        "financing_type": clean_text(row.get("financing_type")) or "",
        "amount": parse_float(row.get("amount_original")),
        "currency": display_text(row, "currency", "USD"),
        "description": clean_text(row.get("description")) or "",
        "has_coordinates": parse_bool(row.get("has_final_coordinates")),
        "latitude": parse_float(row.get("final_latitude")),
        "longitude": parse_float(row.get("final_longitude")),
        "location_name": clean_text(row.get("final_location_name")) or "",
        "geo_status": clean_text(row.get("geo_monitor_status")) or clean_text(row.get("final_geo_status")) or "unknown",
        "low_precision": parse_bool(row.get("geo_low_precision_flag")),
        "source_locator": clean_text(row.get("source_locator")) or "",
    }


def to_js(value):
    return json.dumps(value, ensure_ascii=False, indent=2)


def main():
    with DATA_CSV.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    projects = [build_project(row) for row in rows]

    total_projects = len(projects)
    total_financing = sum(p["amount"] or 0 for p in projects)
    mapped_projects = sum(1 for p in projects if p["has_coordinates"] and p["latitude"] is not None and p["longitude"] is not None)
    countries_count = len({display_country(r) for r in rows if clean_text(r.get("country_standardization_status")) in {"exact", "alias"}})

    by_source = {src: sum(1 for p in projects if p["funding_source"] == src) for src in FUNDING_SOURCES}
    by_source_financing = {
        src: round(sum((p["amount"] or 0) for p in projects if p["funding_source"] == src) / 1e9, 2)
        for src in FUNDING_SOURCES
    }
    mapped_by_source = {
        src: sum(1 for p in projects if p["funding_source"] == src and p["has_coordinates"] and p["latitude"] is not None and p["longitude"] is not None)
        for src in FUNDING_SOURCES
    }
    geo_status = dict(Counter(p["geo_status"] for p in projects))

    year_counter = defaultdict(lambda: {src: 0 for src in FUNDING_SOURCES})
    for p in projects:
        if p["approval_year"] is not None:
            year_counter[p["approval_year"]][p["funding_source"]] += 1
    approval_year_data = []
    for year in sorted(year_counter):
        entry = {"year": year}
        for src in FUNDING_SOURCES:
            entry[MDB_SHORT[src]] = year_counter[year][src]
        approval_year_data.append(entry)

    mode_counts = defaultdict(lambda: {"count": 0, "financing": 0.0, "wb": 0, "adb": 0, "aiib": 0})
    for p in projects:
        mode = p["mode_ato_umbrella"]
        mode_counts[mode]["count"] += 1
        mode_counts[mode]["financing"] += p["amount"] or 0.0
        mode_counts[mode][MDB_SHORT[p["funding_source"]]] += 1
    projects_by_mode = []
    for mode, stats in sorted(mode_counts.items(), key=lambda kv: (-kv[1]["count"], kv[0])):
        projects_by_mode.append(
            {
                "mode": mode,
                "count": stats["count"],
                "financing": round(stats["financing"] / 1e9, 2),
                "wb": stats["wb"],
                "adb": stats["adb"],
                "aiib": stats["aiib"],
            }
        )

    valid_country_rows = [r for r in rows if clean_text(r.get("country_standardization_status")) in {"exact", "alias"}]
    country_agg = defaultdict(lambda: {"count": 0, "financing": 0.0, "lat_sum": 0.0, "lng_sum": 0.0, "coord_count": 0})
    for row, p in zip(rows, projects):
        if clean_text(row.get("country_standardization_status")) not in {"exact", "alias"}:
            continue
        country = display_country(row)
        agg = country_agg[country]
        agg["count"] += 1
        agg["financing"] += p["amount"] or 0.0
        if p["has_coordinates"] and p["latitude"] is not None and p["longitude"] is not None:
            agg["lat_sum"] += p["latitude"]
            agg["lng_sum"] += p["longitude"]
            agg["coord_count"] += 1

    country_summaries = []
    for country, agg in sorted(country_agg.items(), key=lambda kv: (-kv[1]["count"], kv[0])):
        lat = round(agg["lat_sum"] / agg["coord_count"], 6) if agg["coord_count"] else None
        lng = round(agg["lng_sum"] / agg["coord_count"], 6) if agg["coord_count"] else None
        country_summaries.append(
            {
                "country": country,
                "count": agg["count"],
                "financing": round(agg["financing"] / 1e9, 2),
                "lat": lat,
                "lng": lng,
            }
        )
    top_countries = country_summaries[:20]

    region_agg = defaultdict(lambda: {"count": 0, "financing": 0.0})
    for p in projects:
        region_agg[p["region"]]["count"] += 1
        region_agg[p["region"]]["financing"] += p["amount"] or 0.0
    region_data = [
        {"region": region, "count": agg["count"], "financing": round(agg["financing"] / 1e9, 2)}
        for region, agg in sorted(region_agg.items(), key=lambda kv: (-kv[1]["count"], kv[0]))
    ]

    mdb_mode_mix = []
    for mode_entry in projects_by_mode:
        row = {"mode": mode_entry["mode"]}
        for src in FUNDING_SOURCES:
            total = by_source[src] or 1
            row[src] = round(100 * mode_entry[MDB_SHORT[src]] / total, 1)
        mdb_mode_mix.append(row)

    top_countries_by_source = {}
    for src in FUNDING_SOURCES:
        source_country_agg = defaultdict(int)
        for row in rows:
            if display_text(row, "funding_source") != src:
                continue
            if clean_text(row.get("country_standardization_status")) not in {"exact", "alias"}:
                continue
            source_country_agg[display_country(row)] += 1
        top_countries_by_source[src] = [
            {"country": country, "count": count}
            for country, count in sorted(source_country_agg.items(), key=lambda kv: (-kv[1], kv[0]))[:8]
        ]

    country_coords = {c["country"]: {"lat": c["lat"], "lng": c["lng"]} for c in country_summaries if c["lat"] is not None and c["lng"] is not None}
    project_status_options = sorted({p["project_status"] for p in projects})
    mode_options = sorted({p["mode_ato_umbrella"] for p in projects})

    file_text = f"""// Auto-generated from transport_projects_cross_mdb_shareable_v5.csv
// Do not edit manually. Rebuild with build_dashboard_data.py.

export type FundingSource = 'World Bank' | 'ADB' | 'AIIB';
export type ProjectStatus = string;

export interface Project {{
  id: string;
  funding_source: FundingSource;
  project_name: string;
  country: string;
  country_original: string;
  region: string;
  project_status: ProjectStatus;
  approval_year: number | null;
  approval_date: string;
  sector: string;
  subsector: string;
  transport_mode: string;
  transport_mode_category: string;
  transport_mode_detail: string;
  mode_ato_umbrella: string;
  mode_ato_detail: string;
  mode_ato_mapping_confidence: string;
  transport_function: string;
  transport_context: string;
  infrastructure_type: string;
  financing_type: string;
  amount: number | null;
  currency: string;
  description: string;
  has_coordinates: boolean;
  latitude: number | null;
  longitude: number | null;
  location_name: string;
  geo_status: string;
  low_precision: boolean;
  source_locator: string;
}}

export const MDB_COLORS: Record<FundingSource, string> = {to_js(MDB_COLORS)};
export const MODE_COLORS: Record<string, string> = {to_js(MODE_COLORS)};
export const MODE_DETAIL_COLORS: Record<string, string> = {to_js(MODE_DETAIL_COLORS)};
export const STATUS_COLORS: Record<string, string> = {to_js(STATUS_COLORS)};

export const PORTFOLIO_STATS = {to_js({
        "totalProjects": total_projects,
        "totalFinancing": round(total_financing / 1e9, 2),
        "countriesCount": countries_count,
        "mappedProjects": mapped_projects,
        "bySource": by_source,
        "bySourceFinancing": by_source_financing,
        "mappedBySource": mapped_by_source,
        "geoStatus": geo_status,
    })};

export const APPROVAL_YEAR_DATA = {to_js(approval_year_data)};
export const PROJECTS_BY_MODE = {to_js(projects_by_mode)};
export const COUNTRY_SUMMARIES = {to_js(country_summaries)};
export const TOP_COUNTRIES = {to_js(top_countries)};
export const REGION_DATA = {to_js(region_data)};
export const MDB_MODE_MIX = {to_js(mdb_mode_mix)};
export const WB_TOP_COUNTRIES = {to_js(top_countries_by_source["World Bank"])};
export const ADB_TOP_COUNTRIES = {to_js(top_countries_by_source["ADB"])};
export const AIIB_TOP_COUNTRIES = {to_js(top_countries_by_source["AIIB"])};
export const PROJECT_STATUS_OPTIONS = {to_js(project_status_options)};
export const MODE_OPTIONS = {to_js(mode_options)};
export const PROJECTS: Project[] = {to_js(projects)};
export const COUNTRY_COORDS: Record<string, {{ lat: number; lng: number }}> = {to_js(country_coords)};

export const fmt = {{
  usd: (v: number | null): string => {{
    if (v === null || Number.isNaN(v)) return '—';
    if (v >= 1e9) return `$${{(v / 1e9).toFixed(2)}}B`;
    if (v >= 1e6) return `$${{(v / 1e6).toFixed(1)}}M`;
    return `$${{v.toLocaleString()}}`;
  }},
  year: (y: number | null): string => (y === null ? '—' : String(y)),
  num: (n: number): string => n.toLocaleString(),
}};
"""

    OUT_TS.write_text(file_text, encoding="utf-8")
    print(f"Wrote {OUT_TS}")


if __name__ == "__main__":
    main()
