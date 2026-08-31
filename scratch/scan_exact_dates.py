import os
import glob
import json
import re

idb_dir = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\IndexedDB"
files = glob.glob(os.path.join(idb_dir, "**", "*.ldb"), recursive=True) + glob.glob(os.path.join(idb_dir, "**", "*.log"), recursive=True)

h0032_records = []
h0130_records = []

for file_path in files:
    try:
        with open(file_path, 'rb') as f:
            data = f.read()
            
        text = data.decode('utf-8', errors='ignore')
        for match in re.finditer(r'\{[^{}]*?"date"\s*:\s*"([^"]+)"[^{}]*?"companyId"\s*:\s*"([^"]+)"[^{}]*?\}', text):
            full_match = match.group(0)
            date = match.group(1)
            comp_id = match.group(2)
            if 'h0032' in comp_id.lower():
                h0032_records.append((date, full_match))
            if 'h0130' in comp_id.lower():
                h0130_records.append((date, full_match))
    except Exception:
        pass

print("=== H0032 Records by Date ===")
for d in sorted(list(set([d for d, _ in h0032_records]))):
    print(d)

print("\n=== H0130 Records by Date ===")
for d in sorted(list(set([d for d, _ in h0130_records]))):
    print(d)
