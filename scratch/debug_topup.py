import json

with open("scanned_records.json", "r", encoding="utf-8") as f:
    records = json.load(f)

# Filter for Dallas & Gibbons (h0267)
dallas_recs = [r for r in records if r['companyId'] == 'h0267']
dallas_recs.sort(key=lambda r: (r['date'], r.get('timestamp', 0)))

print(f"Total Dallas & Gibbons records: {len(dallas_recs)}")
# Print the last 15 records in chronological order
for r in dallas_recs[-15:]:
    print(json.dumps(r, ensure_ascii=False))
