import os
import struct

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

for db_dir in dirs:
    if not os.path.exists(db_dir):
        continue
    log_files = [os.path.join(db_dir, f) for f in os.listdir(db_dir) if f.endswith('.log')]
    for log_file in log_files:
        try:
            raw_records = parse_log_file(log_file)
            print(f"File {os.path.basename(log_file)} has {len(raw_records)} records")
            for idx, r in enumerate(raw_records):
                if b'postage' in r:
                    print(f"  Record {idx} (size {len(r)}) contains 'postage'")
                    # Find \xff followed by 0x01 to 0x20
                    v8_idx = 0
                    headers = []
                    while True:
                        v8_idx = r.find(b'\xff', v8_idx)
                        if v8_idx == -1:
                            break
                        if v8_idx + 1 < len(r):
                            headers.append(f"{v8_idx}:{r[v8_idx+1]:02x}")
                        v8_idx += 1
                    print(f"    Potential V8 headers at: {headers}")
        except Exception as e:
            print("Error:", e)
