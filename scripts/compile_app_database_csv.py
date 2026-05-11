import csv
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
OUT_DIR = WORKSPACE / "compiled_app_data"
OUT_CSV = OUT_DIR / "ato_dashboard_app_database.csv"

DATA_DIR = ROOT / "src" / "app" / "data"
PUBLIC_DATA_DIR = ROOT / "public" / "data"

DATA_FILES = [
    DATA_DIR / "atoEconomies.ts",
    DATA_DIR / "crsData.ts",
    DATA_DIR / "crsDecadeData.ts",
    DATA_DIR / "lowCarbonScreenerData.ts",
    DATA_DIR / "mockData.ts",
    DATA_DIR / "themeData.ts",
]

CSV_COLUMNS = [
    "dataset",
    "export_name",
    "source_file",
    "record_index",
    "record_id",
    "country",
    "recipient",
    "donor",
    "agency",
    "year",
    "mode",
    "theme",
    "title",
    "amount_commitment",
    "amount_disbursement",
    "payload_json",
]


def iter_export_literals(text):
    pattern = re.compile(r"export\s+const\s+([A-Za-z0-9_]+)(?:\s*:[^=]+)?\s*=")
    for match in pattern.finditer(text):
        name = match.group(1)
        i = match.end()
        while i < len(text) and text[i].isspace():
            i += 1
        if i >= len(text) or text[i] not in "[{":
            continue

        opening = text[i]
        closing = "]" if opening == "[" else "}"
        depth = 0
        in_string = False
        escape = False
        start = i

        while i < len(text):
            ch = text[i]
            if in_string:
                if escape:
                    escape = False
                elif ch == "\\":
                    escape = True
                elif ch == '"':
                    in_string = False
            else:
                if ch == '"':
                    in_string = True
                elif ch == opening:
                    depth += 1
                elif ch == closing:
                    depth -= 1
                    if depth == 0:
                        yield name, text[start : i + 1]
                        break
            i += 1


def parse_exports(path):
    text = path.read_text(encoding="utf-8")
    parsed = {}
    for name, literal in iter_export_literals(text):
        try:
            parsed[name] = json.loads(literal)
        except json.JSONDecodeError:
            continue
    return parsed


def compact_json(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def as_text(value):
    if value is None:
        return ""
    if isinstance(value, (str, int, float, bool)):
        return str(value)
    return ""


def first_value(record, keys):
    if not isinstance(record, dict):
        return ""
    for key in keys:
        value = record.get(key)
        if value not in (None, ""):
            return value
    return ""


def common_row(dataset, export_name, source_file, record_index, record):
    if isinstance(record, dict):
        recipient = first_value(record, ["recipient", "recipient_name", "recipient_standardized"])
        country = first_value(record, ["country", "economy", "name"])
        if not country:
            country = recipient
        amount_commitment = first_value(
            record,
            ["commitment_defl", "commitment", "usd_commitment_defl", "usd_commitment", "totalCommitment"],
        )
        amount_disbursement = first_value(
            record,
            ["disbursement_defl", "disbursement", "usd_disbursement_defl", "usd_disbursement", "totalDisbursement"],
        )
        return {
            "dataset": dataset,
            "export_name": export_name,
            "source_file": source_file,
            "record_index": record_index,
            "record_id": as_text(first_value(record, ["row_number", "id", "project_id", "code"])),
            "country": as_text(country),
            "recipient": as_text(recipient),
            "donor": as_text(first_value(record, ["donor", "donor_name", "funding_source", "source"])),
            "agency": as_text(first_value(record, ["agency", "agency_name"])),
            "year": as_text(first_value(record, ["year", "approval_year"])),
            "mode": as_text(first_value(record, ["mode", "mode_detail", "transport_mode"])),
            "theme": as_text(first_value(record, ["theme", "themeId", "category"])),
            "title": as_text(first_value(record, ["title", "project_title", "name", "short_description"])),
            "amount_commitment": as_text(amount_commitment),
            "amount_disbursement": as_text(amount_disbursement),
            "payload_json": compact_json(record),
        }

    return {
        "dataset": dataset,
        "export_name": export_name,
        "source_file": source_file,
        "record_index": record_index,
        "record_id": "",
        "country": as_text(record),
        "recipient": "",
        "donor": "",
        "agency": "",
        "year": "",
        "mode": "",
        "theme": "",
        "title": as_text(record),
        "amount_commitment": "",
        "amount_disbursement": "",
        "payload_json": compact_json(record),
    }


def emit_export_rows(rows, source_path, export_name, value):
    source_file = str(source_path.relative_to(ROOT)).replace("\\", "/")
    dataset = f"{source_path.stem}.{export_name}"

    if isinstance(value, list):
        for index, record in enumerate(value, start=1):
            rows.append(common_row(dataset, export_name, source_file, index, record))
        return

    if isinstance(value, dict):
        for index, (key, record) in enumerate(value.items(), start=1):
            if isinstance(record, dict):
                payload = {"key": key, **record}
            else:
                payload = {"key": key, "value": record}
            rows.append(common_row(dataset, export_name, source_file, index, payload))
        return

    rows.append(common_row(dataset, export_name, source_file, 1, value))


def emit_crs_decade_record_rows(rows):
    records_dir = PUBLIC_DATA_DIR / "crs-decade-records"
    if not records_dir.exists():
        return
    for chunk_path in sorted(records_dir.glob("chunk-*.json")):
        data = json.loads(chunk_path.read_text(encoding="utf-8"))
        source_file = str(chunk_path.relative_to(ROOT)).replace("\\", "/")
        for index, record in enumerate(data, start=1):
            row = common_row("public.crs-decade-records", "CRS_DECADE_RECORD", source_file, index, record)
            rows.append(row)

    index_path = records_dir / "index.json"
    if index_path.exists():
        index_payload = json.loads(index_path.read_text(encoding="utf-8"))
        rows.append(
            common_row(
                "public.crs-decade-records.index",
                "CRS_DECADE_RECORD_INDEX",
                str(index_path.relative_to(ROOT)).replace("\\", "/"),
                1,
                index_payload,
            )
        )


def main():
    rows = []
    for path in DATA_FILES:
        exports = parse_exports(path)
        for export_name, value in exports.items():
            emit_export_rows(rows, path, export_name, value)

    emit_crs_decade_record_rows(rows)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {OUT_CSV}")
    print(f"Rows: {len(rows)}")


if __name__ == "__main__":
    main()
