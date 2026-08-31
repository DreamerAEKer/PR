import os
import glob
import json
from v8_deserializer import V8Deserializer
from parse_ldb import parse_ldb_file

chrome_idb = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\IndexedDB"

all_records_found = []

for root, dirs, files in os.walk(chrome_idb):
    for f in files:
        if f.endswith('.ldb'):
            fpath = os.path.join(root, f)
            try:
                blocks = parse_ldb_file(fpath)
                for block in blocks:
                    v8_idx = 0
                    while True:
                        v8_idx = block.find(b'\xff', v8_idx)
                        if v8_idx == -1:
                            break
                        if v8_idx + 1 < len(block):
                            next_byte = block[v8_idx+1]
                            if 0x01 <= next_byte <= 0x20:
                                try:
                                    deserializer = V8Deserializer(block[v8_idx:])
                                    result = deserializer.deserialize()
                                    if isinstance(result, list) and len(result) > 0:
                                        first = result[0]
                                        if isinstance(first, dict) and 'date' in first and 'serviceId' in first:
                                            all_records_found.append(result)
                                except Exception:
                                    pass
                        v8_idx += 1
            except Exception:
                pass

print(f"Total list candidates found: {len(all_records_found)}")
# Find largest list
best = max(all_records_found, key=lambda x: len(x)) if all_records_found else []
print(f"Largest record set: {len(best)} items")

# Check H0032 and H0130 in August 2026
h0032_aug = [r for r in best if '2026-08' in r.get('date', '') and ('h0032' in str(r.get('companyId', '')).lower() or 'h0032' in str(r.get('companyCode', '')).lower())]
h0130_aug = [r for r in best if '2026-08' in r.get('date', '') and ('h0130' in str(r.get('companyId', '')).lower() or 'h0130' in str(r.get('companyCode', '')).lower())]

print("\n--- H0032 (เอเชี่ยนฮอนด้า) August Entries ---")
for r in sorted(h0032_aug, key=lambda x: x.get('date')):
    print(f"Date: {r.get('date')} | Amount: {r.get('amount')} | Count: {r.get('count')} | Remaining: {r.get('machineRemaining')} | Acc: {r.get('machineAccumulated')}")

print("\n--- H0130 (สิทธิผล 1919) August Entries ---")
for r in sorted(h0130_aug, key=lambda x: x.get('date')):
    print(f"Date: {r.get('date')} | Amount: {r.get('amount')} | Count: {r.get('count')} | Remaining: {r.get('machineRemaining')} | Acc: {r.get('machineAccumulated')}")
