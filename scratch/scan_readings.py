import os
import struct
import json
import re
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

def extract_readings_from_block(block):
    offset = 0
    readings = []
    
    # Scan for "isTopUp" which is unique to machine readings!
    while True:
        idx = block.find(b'isTopUp', offset)
        if idx == -1:
            break
        offset = idx + 7
        
        # Look at window
        window = block[max(0, idx - 150) : min(len(block), idx + 200)]
        reading = {}
        
        # Date
        date_match = re.search(rb'\d{4}-\d{2}-\d{2}', window)
        if date_match:
            reading['date'] = date_match.group(0).decode('utf-8')
            
        # Company ID
        comp_match = re.search(rb'[hpn]\d{4,5}', window)
        if comp_match:
            reading['companyId'] = comp_match.group(0).decode('utf-8')
            
        # machineRemaining
        rem_idx = window.find(b'machineRemaining')
        if rem_idx != -1:
            tag_pos = rem_idx + len('machineRemaining')
            for i in range(tag_pos, tag_pos + 15):
                if i < len(window):
                    tag = chr(window[i])
                    if tag == 'I':
                        val, _ = decode_zigzag(window, i + 1)
                        reading['machineRemaining'] = val
                        break
                    elif tag == 'N':
                        if i + 9 <= len(window):
                            val = struct.unpack('<d', window[i+1:i+9])[0]
                            reading['machineRemaining'] = val
                            break
                    elif tag == '0':
                        reading['machineRemaining'] = 0
                        break

        # machineAccumulated
        acc_idx = window.find(b'machineAccumulated')
        if acc_idx != -1:
            tag_pos = acc_idx + len('machineAccumulated')
            for i in range(tag_pos, tag_pos + 15):
                if i < len(window):
                    tag = chr(window[i])
                    if tag == 'I':
                        val, _ = decode_zigzag(window, i + 1)
                        reading['machineAccumulated'] = val
                        break
                    elif tag == 'N':
                        if i + 9 <= len(window):
                            val = struct.unpack('<d', window[i+1:i+9])[0]
                            reading['machineAccumulated'] = val
                            break
                    elif tag == '0':
                        reading['machineAccumulated'] = 0
                        break

        # topUpAmount
        top_idx = window.find(b'topUpAmount')
        if top_idx != -1:
            tag_pos = top_idx + len('topUpAmount')
            for i in range(tag_pos, tag_pos + 15):
                if i < len(window):
                    tag = chr(window[i])
                    if tag == 'I':
                        val, _ = decode_zigzag(window, i + 1)
                        reading['topUpAmount'] = val
                        break
                    elif tag == 'N':
                        if i + 9 <= len(window):
                            val = struct.unpack('<d', window[i+1:i+9])[0]
                            reading['topUpAmount'] = val
                            break
                    elif tag == '0':
                        reading['topUpAmount'] = 0
                        break

        if 'date' in reading and 'companyId' in reading:
            if not any(r['date'] == reading['date'] and r['companyId'] == reading['companyId'] and r.get('machineRemaining') == reading.get('machineRemaining') for r in readings):
                readings.append(reading)
                
    return readings

db_dir = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\file__0.indexeddb.leveldb"

all_scanned_readings = []
for file in os.listdir(db_dir):
    if file.endswith('.ldb'):
        path = os.path.join(db_dir, file)
        try:
            blocks = parse_ldb_file(path)
            for block in blocks:
                all_scanned_readings.extend(extract_readings_from_block(block))
        except Exception as e:
            print("Error parsing", file, e)

# Deduplicate
unique_readings = []
seen = set()
for r in all_scanned_readings:
    k = (r['date'], r['companyId'], r.get('machineRemaining'), r.get('machineAccumulated'), r.get('topUpAmount'))
    if k not in seen:
        seen.add(k)
        unique_readings.append(r)

print(f"Unique machine readings extracted: {len(unique_readings)}")

with open("scanned_readings.json", "w", encoding="utf-8") as f:
    json.dump(unique_readings, f, indent=2, ensure_ascii=False)
