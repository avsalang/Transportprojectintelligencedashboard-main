import csv
import re
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
CRS_CSV = WORKSPACE / "crs_transport_dashboard_ready.csv"
ATO_ECONOMIES_TS = ROOT / "src" / "app" / "data" / "atoEconomies.ts"
OUT_CSV = WORKSPACE / "compiled_app_data" / "crs_unique_recipients_and_donors_current_app.csv"


def clean(value):
    return str(value or "").strip()


def parse_float(value):
    text = clean(value)
    if not text:
        return 0.0
    try:
        return float(text)
    except ValueError:
        return 0.0


def parse_int(value):
    text = clean(value)
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def load_ato_economies():
    text = ATO_ECONOMIES_TS.read_text(encoding="utf-8")
    return set(re.findall(r'"([^"]+)"', text))


def is_asia_regional_recipient(recipient, scope):
    text = clean(recipient).lower()
    return scope == "regional" and ", regional" in text and "asia" in text


def is_current_app_recipient(recipient, scope, ato_economies):
    if scope == "economy":
        return recipient in ato_economies
    return is_asia_regional_recipient(recipient, scope)


def new_summary(entity_type, name):
    return {
        "entity_type": entity_type,
        "name": name,
        "recipient_scope": "",
        "record_count": 0,
        "first_year": None,
        "last_year": None,
        "commitment_defl": 0.0,
        "disbursement_defl": 0.0,
    }


def update_summary(summary, row, recipient_scope=""):
    year = parse_int(row.get("year"))
    summary["record_count"] += 1
    summary["recipient_scope"] = recipient_scope or summary["recipient_scope"]
    if year is not None:
      summary["first_year"] = year if summary["first_year"] is None else min(summary["first_year"], year)
      summary["last_year"] = year if summary["last_year"] is None else max(summary["last_year"], year)
    summary["commitment_defl"] += parse_float(row.get("usd_commitment_defl"))
    summary["disbursement_defl"] += parse_float(row.get("usd_disbursement_defl"))


def main():
    ato_economies = load_ato_economies()
    summaries = {}

    with CRS_CSV.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            recipient = clean(row.get("recipient_standardized")) or clean(row.get("recipient_name")) or "Unknown"
            scope = clean(row.get("recipient_scope")) or "unknown"
            if not is_current_app_recipient(recipient, scope, ato_economies):
                continue

            donor = clean(row.get("donor_name_standardized")) or clean(row.get("donor_name")) or "Unknown"

            donor_key = ("donor", donor)
            if donor_key not in summaries:
                summaries[donor_key] = new_summary("donor", donor)
            update_summary(summaries[donor_key], row)

            recipient_key = ("recipient", recipient)
            if recipient_key not in summaries:
                summaries[recipient_key] = new_summary("recipient", recipient)
            update_summary(summaries[recipient_key], row, scope)

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        fieldnames = [
            "entity_type",
            "name",
            "recipient_scope",
            "record_count",
            "first_year",
            "last_year",
            "commitment_defl",
            "disbursement_defl",
        ]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for summary in sorted(summaries.values(), key=lambda item: (item["entity_type"], item["name"])):
            row = dict(summary)
            row["first_year"] = row["first_year"] or ""
            row["last_year"] = row["last_year"] or ""
            row["commitment_defl"] = round(row["commitment_defl"], 6)
            row["disbursement_defl"] = round(row["disbursement_defl"], 6)
            writer.writerow(row)

    donor_count = sum(1 for key in summaries if key[0] == "donor")
    recipient_count = sum(1 for key in summaries if key[0] == "recipient")
    print(f"Wrote {OUT_CSV}")
    print(f"Donors: {donor_count}")
    print(f"Recipients: {recipient_count}")


if __name__ == "__main__":
    main()
