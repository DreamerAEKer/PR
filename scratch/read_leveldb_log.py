import os
import struct
import json
from v8_deserializer import V8Deserializer

def parse_log_file(filepath):
    assembled_records = []
    current_record = bytearray()
    
    with open(filepath, 'rb') as f:
        while True:
            block = f.read(32768)
            if not block:
                break
            
            offset = 0
            while offset + 7 <= len(block):
                crc, length, rtype = struct.unpack_from('<IHB', block, offset)
                if crc == 0 and length == 0 and rtype == 0:
                    break
                
                data = block[offset+7 : offset+7+length]
                if rtype == 1:
                    assembled_records.append(data)
                elif rtype == 2:
                    current_record = bytearray(data)
                elif rtype == 3:
                    current_record.extend(data)
                elif rtype == 4:
                    current_record.extend(data)
                    assembled_records.append(bytes(current_record))
                    current_record = bytearray()
                
                offset += 7 + length
    return assembled_records

dirs = [
    r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\file__0.indexeddb.leveldb",
    r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\Local Storage\leveldb"
]

all_extracted_records = []
all_extracted_readings = []

for db_dir in dirs:
    if not os.path.exists(db_dir):
        continue
    log_files = [os.path.join(db_dir, f) for f in os.listdir(db_dir) if f.endswith('.log')]

    for log_file in log_files:
        try:
            raw_records = parse_log_file(log_file)
            for idx, record in enumerate(raw_records):
                if b'postage_records' in record or b'postage_machine_readings' in record:
                    # Let's search for V8 serialization header inside the record
                    v8_idx = 0
                    while True:
                        v8_idx = record.find(b'\xff', v8_idx)
                        if v8_idx == -1:
                            break
                        if v8_idx + 1 < len(record):
                            next_byte = record[v8_idx+1]
                            if 0x01 <= next_byte <= 0x20:
                                try:
                                    deserializer = V8Deserializer(record[v8_idx:])
                                    result = deserializer.deserialize()
                                    if isinstance(result, list) and len(result) > 0:
                                        first = result[0]
                                        if isinstance(first, dict) and 'date' in first:
                                            if 'serviceId' in first:
                                                all_extracted_records.append(result)
                                            elif 'machineRemaining' in first:
                                                all_extracted_readings.append(result)
                                except Exception as e:
                                    # Print the error to see what went wrong!
                                    print(f"Error deserializing at offset {v8_idx} in {os.path.basename(log_file)}: {e}")
                        v8_idx += 1
        except Exception as e:
            print("Error parsing file:", e)

# Find the longest ones
best_records = []
for r in all_extracted_records:
    if len(r) > len(best_records):
        best_records = r

best_readings = []
for rd in all_extracted_readings:
    if len(rd) > len(best_readings):
        best_readings = rd

print(f"Best extracted: records={len(best_records)}, readings={len(best_readings)}")

if best_records:
    with open("extracted_records_log.json", "w", encoding="utf-8") as f:
        json.dump(best_records, f, indent=2, ensure_ascii=False)
if best_readings:
    with open("extracted_readings_log.json", "w", encoding="utf-8") as f:
        json.dump(best_readings, f, indent=2, ensure_ascii=False)
