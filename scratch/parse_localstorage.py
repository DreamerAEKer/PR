import os
import json

path = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\Local Storage\leveldb\002512.ldb"

with open(path, 'rb') as f:
    data = f.read()

# Let's search for occurrences of b'postage_records' and b'postage_machine_readings'
# In LevelDB, the key might be prefixed and the value is stored nearby.
# Let's search for JSON-like string starting with b'[' and ending with b']' or b'{' and b'}'
# containing typical fields like "serviceId", "companyId", "date"

# We will scan for JSON sequences.
import re

# We search for sequences of bytes that match typical JSON array of objects with "date" and "companyId"
# E.g. [{"date":"2026-06-08",...}]
# Since Chrome LocalStorage encodes strings as UTF-16 (or sometimes UTF-8), we should search for both.

def clean_and_parse(text):
    # Try to find a valid JSON array or object
    # Find first '[' and matching ']'
    start = text.find('[')
    if start == -1:
        return None
    
    depth = 0
    for idx in range(start, len(text)):
        char = text[idx]
        if char == '[':
            depth += 1
        elif char == ']':
            depth -= 1
            if depth == 0:
                candidate = text[start:idx+1]
                try:
                    parsed = json.loads(candidate)
                    if isinstance(parsed, list) and len(parsed) > 0:
                        return parsed
                except:
                    pass
    return None

records = None
readings = None

# Try UTF-8 strings
utf8_str = data.decode('utf-8', errors='ignore')
# Let's find all occurrences of "postage_records"
for match in re.finditer(r'postage_records', utf8_str):
    start_idx = match.start()
    # Search forward for JSON
    snippet = utf8_str[start_idx:start_idx+500000] # search up to 500KB ahead
    parsed = clean_and_parse(snippet)
    if parsed and (not records or len(parsed) > len(records)):
        records = parsed

# Let's also look for "postage_machine_readings"
for match in re.finditer(r'postage_machine_readings', utf8_str):
    start_idx = match.start()
    snippet = utf8_str[start_idx:start_idx+100000]
    parsed = clean_and_parse(snippet)
    if parsed and (not readings or len(parsed) > len(readings)):
        readings = parsed

# If not found, try UTF-16 (little endian) which is common in Chrome's LocalStorage values
try:
    utf16_str = data.decode('utf-16-le', errors='ignore')
    for match in re.finditer(r'postage_records', utf16_str):
        start_idx = match.start()
        snippet = utf16_str[start_idx:start_idx+500000]
        parsed = clean_and_parse(snippet)
        if parsed and (not records or len(parsed) > len(records)):
            records = parsed
            
    for match in re.finditer(r'postage_machine_readings', utf16_str):
        start_idx = match.start()
        snippet = utf16_str[start_idx:start_idx+100000]
        parsed = clean_and_parse(snippet)
        if parsed and (not readings or len(parsed) > len(readings)):
            readings = parsed
except Exception as e:
    print("UTF-16 decoding failed:", e)

# If we still can't find it, let's do a broad regex search on the raw file content decoded as ascii/utf-8 with replacement
# to extract any valid JSON lists that contain "companyId" and "serviceId"
if not records:
    print("Falling back to broad search...")
    # Find all strings matching [{"date":"..."
    matches = re.finditer(r'\[\s*\{\s*"date"\s*:\s*"\d{4}-\d{2}-\d{2}"', utf8_str)
    for m in matches:
        start_idx = m.start()
        snippet = utf8_str[start_idx:start_idx+1000000]
        parsed = clean_and_parse(snippet)
        if parsed and (not records or len(parsed) > len(records)):
            # Check if it has serviceId
            if 'serviceId' in parsed[0]:
                records = parsed

print("Records found:", len(records) if records else "None")
print("Readings found:", len(readings) if readings else "None")

if records:
    with open("records.json", "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
if readings:
    with open("readings.json", "w", encoding="utf-8") as f:
        json.dump(readings, f, indent=2, ensure_ascii=False)
