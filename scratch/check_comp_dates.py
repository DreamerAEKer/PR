import json
import os

# Let's inspect scanned_records.json or records in LevelDB / local storage
if os.path.exists('scanned_records.json'):
    with open('scanned_records.json', 'r', encoding='utf-8') as f:
        records = json.load(f)
        
    print(f"Total records in scanned_records.json: {len(records)}")
    
    # Check H0032 and H0130 in August 2569 (2026-08)
    for r in records:
        comp_id = str(r.get('companyId', '')).lower()
        date = str(r.get('date', ''))
        if '2026-08' in date:
            if 'h0032' in comp_id or 'h0130' in comp_id:
                print(f"Date: {date} | Comp: {comp_id} | Count: {r.get('count')} | Amount: {r.get('amount')} | Machine: {r.get('machineRemaining')}/{r.get('machineAccumulated')}")
else:
    print("scanned_records.json not found")
