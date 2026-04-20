import csv
import os

csv_path = '../crs_transport_dashboard_ready.csv'
if not os.path.exists(csv_path):
    print(f"Error: {csv_path} not found")
    exit(1)

rows = 0
total_commitment = 0.0
total_commitment_defl = 0.0

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        rows += 1
        try:
            total_commitment += float(row.get('usd_commitment') or 0)
            total_commitment_defl += float(row.get('usd_commitment_defl') or 0)
        except:
            pass

print(f"CSV Rows: {rows:,}")
print(f"CSV Total Commitment: ${total_commitment:,.2f}")
print(f"CSV Total Commitment (Defl): ${total_commitment_defl:,.2f}")
