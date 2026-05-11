import csv
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
APP_DATABASE = WORKSPACE / "compiled_app_data" / "ato_dashboard_app_database.csv"
OUT_CSV = WORKSPACE / "compiled_app_data" / "app_unique_recipients_and_donors.csv"


def add_entity(entities, source_area, entity_type, name, dataset):
    name = (name or "").strip()
    if not name:
        return
    key = (source_area, entity_type, name)
    entry = entities[key]
    entry["row_count"] += 1
    entry["datasets"].add(dataset)


def main():
    if not APP_DATABASE.exists():
        raise FileNotFoundError(f"Missing compiled app database: {APP_DATABASE}")

    entities = defaultdict(lambda: {"row_count": 0, "datasets": set()})
    with APP_DATABASE.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            dataset = row["dataset"]

            if dataset in {"crsData.CRS_FACTS", "public.crs-decade-records"}:
                add_entity(entities, "CRS finance", "donor", row["donor"], dataset)
                add_entity(entities, "CRS finance", "recipient", row["recipient"], dataset)
                continue

            if dataset == "mockData.PROJECTS":
                add_entity(entities, "MDB project portfolio", "donor/funder", row["donor"], dataset)
                add_entity(entities, "MDB project portfolio", "recipient/country", row["country"], dataset)
                continue

            if dataset in {
                "lowCarbonScreenerData.LOW_CARBON_SCREENER_RANKING",
                "lowCarbonScreenerData.LOW_CARBON_SCREENER_BY_ECONOMY",
            }:
                add_entity(entities, "Low-carbon screener", "recipient/economy", row["country"], dataset)

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        fieldnames = ["source_area", "entity_type", "name", "row_count", "datasets"]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for (source_area, entity_type, name), entry in sorted(entities.items()):
            writer.writerow(
                {
                    "source_area": source_area,
                    "entity_type": entity_type,
                    "name": name,
                    "row_count": entry["row_count"],
                    "datasets": "; ".join(sorted(entry["datasets"])),
                }
            )

    print(f"Wrote {OUT_CSV}")
    print(f"Unique entities: {len(entities)}")


if __name__ == "__main__":
    main()
