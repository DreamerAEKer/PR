import os
import json
import re

db_dir = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\Local Storage\leveldb"

records = []
readings = []

def extract_from_content(content):
    # Search for all strings of JSON. In leveldb, it can have null bytes or control characters in between if it's UTF-16,
    # or it might have a length prefix. Let's try to extract contiguous printable ASCII/UTF-8 character sequences.
    # We look for sequences containing JSON elements like "date", "companyId", etc.
    # To do this, let's filter out non-ascii bytes first or decode using errors='ignore'
    
    # Try decoding as UTF-8
    decoded_utf8 = content.decode('utf-8', errors='ignore')
    # Try decoding as UTF-16 LE
    decoded_utf16 = content.decode('utf-16-le', errors='ignore')
    
    for text in [decoded_utf8, decoded_utf16]:
        # Search for any brackets [ ] containing dicts
        matches = re.finditer(r'\[\s*\{.*?\}\s*\]', text, re.DOTALL)
        for match in matches:
            candidate = match.group(0)
            # Remove any odd non-printable characters inside the candidate
            cleaned = "".join(c for c in candidate if c.isprintable() or c in '\n\r\t ')
            try:
                parsed = json.loads(cleaned)
                if isinstance(parsed, list) and len(parsed) > 0:
                    if 'serviceId' in parsed[0] and 'date' in parsed[0]:
                        records.append(parsed)
                    elif 'machineRemaining' in parsed[0] and 'date' in parsed[0]:
                        readings.append(parsed)
            except:
                # Try finding sub-JSON
                try:
                    # Let's find first '[' and last ']' in cleaned
                    start = cleaned.find('[')
                    end = cleaned.rfind(']')
                    if start != -1 and end != -1:
                        parsed = json.loads(cleaned[start:end+1])
                        if isinstance(parsed, list) and len(parsed) > 0:
                            if 'serviceId' in parsed[0] and 'date' in parsed[0]:
                                records.append(parsed)
                            elif 'machineRemaining' in parsed[0] and 'date' in parsed[0]:
                                readings.append(parsed)
                except:
                    pass

for file in os.listdir(db_dir):
    if file.endswith('.ldb') or file.endswith('.log'):
        path = os.path.join(db_dir, file)
        try:
            with open(path, 'rb') as f:
                content = f.read()
                extract_from_content(content)
        except Exception as e:
            print(f"Error reading {file}: {e}")

# Filter unique and take the longest list
best_records = []
for r in records:
    if len(r) > len(best_records):
        best_records = r

best_readings = []
for rd in readings:
    if len(rd) > len(best_readings):
        best_readings = rd

print(f"Best records count: {len(best_records)}")
print(f"Best readings count: {len(best_readings)}")

if best_records:
    with open("extracted_records.json", "w", encoding="utf-8") as f:
        json.dump(best_records, f, indent=2, ensure_ascii=False)
if best_readings:
    with open("extracted_readings.json", "w", encoding="utf-8") as f:
        json.dump(best_readings, f, indent=2, ensure_ascii=False)
