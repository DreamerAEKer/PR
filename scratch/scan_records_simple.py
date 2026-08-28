import os
import struct
import json
from parse_ldb import parse_ldb_file

def decode_varint(data, pos):
    val = 0
    shift = 0
    while True:
        if pos >= len(data):
            return 0, pos
        b = data[pos]
        pos += 1
        val |= (b & 0x7f) << shift
        if not (b & 0x80):
            break
        shift += 7
    return val, pos

def decode_zigzag(data, pos):
    val, pos = decode_varint(data, pos)
    return (val >> 1) ^ -(val & 1), pos

def extract_records_from_block(block):
    # Scan for "date" key. In V8 serialization:
    # '"' (0x22) followed by 0x04 (len), then 'date'
    # Or in UTF-16 or UTF-8. We look for the bytes b'date'
    offset = 0
    records = []
    
    while True:
        idx = block.find(b'date', offset)
        if idx == -1:
            break
        offset = idx + 4
        
        # Let's try to parse a record starting around idx.
        # A record has properties in some order. Let's look at a window of 300 bytes around idx.
        window = block[max(0, idx - 50) : min(len(block), idx + 250)]
        
        # We can search for keys inside this window
        # Keys: 'date', 'companyId', 'serviceId', 'count', 'amount', 'machineRemaining', 'machineAccumulated', 'topUpAmount'
        record = {}
        
        # Extract date (e.g. 2026-06-08)
        # It follows 'date' key string. In V8, date is followed by '"' or 'c' and length, then string.
        d_idx = window.find(b'date')
        if d_idx != -1:
            # Look for 10-char date string pattern
            date_match = re.search(rb'\d{4}-\d{2}-\d{2}', window[d_idx:])
            if date_match:
                record['date'] = date_match.group(0).decode('utf-8')
                
        # Extract companyId
        c_idx = window.find(b'companyId')
        if c_idx != -1:
            # In our data, companyId starts with h or p followed by numbers, e.g. h0032, p0403, etc.
            comp_match = re.search(rb'[hpn]\d{4,5}', window[c_idx:c_idx+50])
            if comp_match:
                record['companyId'] = comp_match.group(0).decode('utf-8')
                
        # Extract serviceId
        s_idx = window.find(b'serviceId')
        if s_idx != -1:
            # serviceId is a string, e.g. "3" or "12"
            # It starts with '"' (0x22) followed by length (1 or 2 bytes), then the digit bytes.
            # Let's search for a short digit string
            serv_match = re.search(rb'\d{1,2}', window[s_idx:s_idx+20])
            if serv_match:
                record['serviceId'] = serv_match.group(0).decode('utf-8')
                
        # Extract count
        # key 'count' followed by 'I' (tag) and zigzag varint
        cnt_idx = window.find(b'count')
        if cnt_idx != -1:
            # Key string is count. Next tag is 'I' (0x49) or '0' (0x30)
            tag_pos = cnt_idx + len('count')
            # skip any V8 string length prefix/tag for key if we matched 'count' raw
            # Let's search for 'I' or '0' in the next 10 bytes
            for i in range(tag_pos, tag_pos + 15):
                if i < len(window):
                    tag = chr(window[i])
                    if tag == 'I':
                        val, _ = decode_zigzag(window, i + 1)
                        record['count'] = val
                        break
                    elif tag == '0':
                        record['count'] = 0
                        break

        # Extract amount
        amt_idx = window.find(b'amount')
        if amt_idx != -1:
            tag_pos = amt_idx + len('amount')
            for i in range(tag_pos, tag_pos + 15):
                if i < len(window):
                    tag = chr(window[i])
                    if tag == 'I':
                        val, _ = decode_zigzag(window, i + 1)
                        record['amount'] = val
                        break
                    elif tag == 'N': # Double
                        if i + 9 <= len(window):
                            val = struct.unpack('<d', window[i+1:i+9])[0]
                            record['amount'] = val
                            break
                    elif tag == '0':
                        record['amount'] = 0
                        break

        # Extract machineRemaining
        rem_idx = window.find(b'machineRemaining')
        if rem_idx != -1:
            tag_pos = rem_idx + len('machineRemaining')
            for i in range(tag_pos, tag_pos + 15):
                if i < len(window):
                    tag = chr(window[i])
                    if tag == 'I':
                        val, _ = decode_zigzag(window, i + 1)
                        record['machineRemaining'] = val
                        break
                    elif tag == 'N':
                        if i + 9 <= len(window):
                            val = struct.unpack('<d', window[i+1:i+9])[0]
                            record['machineRemaining'] = val
                            break
                    elif tag == '0':
                        record['machineRemaining'] = 0
                        break

        # Extract machineAccumulated
        acc_idx = window.find(b'machineAccumulated')
        if acc_idx != -1:
            tag_pos = acc_idx + len('machineAccumulated')
            for i in range(tag_pos, tag_pos + 15):
                if i < len(window):
                    tag = chr(window[i])
                    if tag == 'I':
                        val, _ = decode_zigzag(window, i + 1)
                        record['machineAccumulated'] = val
                        break
                    elif tag == 'N':
                        if i + 9 <= len(window):
                            val = struct.unpack('<d', window[i+1:i+9])[0]
                            record['machineAccumulated'] = val
                            break
                    elif tag == '0':
                        record['machineAccumulated'] = 0
                        break
                        
        # Extract topUpAmount
        top_idx = window.find(b'topUpAmount')
        if top_idx != -1:
            tag_pos = top_idx + len('topUpAmount')
            for i in range(tag_pos, tag_pos + 15):
                if i < len(window):
                    tag = chr(window[i])
                    if tag == 'I':
                        val, _ = decode_zigzag(window, i + 1)
                        record['topUpAmount'] = val
                        break
                    elif tag == 'N':
                        if i + 9 <= len(window):
                            val = struct.unpack('<d', window[i+1:i+9])[0]
                            record['topUpAmount'] = val
                            break
                    elif tag == '0':
                        record['topUpAmount'] = 0
                        break

        # If it has date, companyId, and serviceId, it's a valid record!
        if 'date' in record and 'companyId' in record and 'serviceId' in record:
            # Check duplicates
            if not any(r['date'] == record['date'] and r['companyId'] == record['companyId'] and r['serviceId'] == record['serviceId'] and r.get('count') == record.get('count') for r in records):
                records.append(record)
                
    return records

import re
db_dir = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\file__0.indexeddb.leveldb"

all_scanned_records = []
for file in os.listdir(db_dir):
    if file.endswith('.ldb'):
        path = os.path.join(db_dir, file)
        try:
            blocks = parse_ldb_file(path)
            for block in blocks:
                all_scanned_records.extend(extract_records_from_block(block))
        except Exception as e:
            print("Error parsing", file, e)

print(f"Total scanned records extracted: {len(all_scanned_records)}")

# Deduplicate
unique_records = []
seen = set()
for r in all_scanned_records:
    # key by date, company, service, count, amount
    k = (r['date'], r['companyId'], r['serviceId'], r.get('count'), r.get('amount'))
    if k not in seen:
        seen.add(k)
        unique_records.append(r)

print(f"Unique scanned records: {len(unique_records)}")

# Save to file
with open("scanned_records.json", "w", encoding="utf-8") as f:
    json.dump(unique_records, f, indent=2, ensure_ascii=False)
