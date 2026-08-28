import os
import struct
import json
from v8_deserializer import V8Deserializer

def snappy_decompress(src):
    pos = 0
    dec_len = 0
    shift = 0
    while True:
        b = src[pos]
        pos += 1
        dec_len |= (b & 0x7f) << shift
        if not (b & 0x80):
            break
        shift += 7
    
    dst = bytearray()
    limit = len(src)
    while pos < limit:
        tag = src[pos]
        pos += 1
        tag_type = tag & 0x3
        if tag_type == 0:
            length = tag >> 2
            if length < 60:
                length += 1
            elif length == 60:
                length = src[pos] + 1
                pos += 1
            elif length == 61:
                length = struct.unpack_from('<H', src, pos)[0] + 1
                pos += 2
            elif length == 62:
                length = struct.unpack_from('<I', src, pos)[0] + 1
                pos += 3
            elif length == 63:
                length = struct.unpack_from('<I', src, pos)[0] + 1
                pos += 4
            dst.extend(src[pos:pos+length])
            pos += length
        elif tag_type == 1:
            length = 4 + ((tag >> 2) & 0x7)
            offset = ((tag >> 5) << 8) | src[pos]
            pos += 1
            for _ in range(length):
                dst.append(dst[-offset])
        elif tag_type == 2:
            length = 1 + (tag >> 2)
            offset = struct.unpack_from('<H', src, pos)[0]
            pos += 2
            for _ in range(length):
                dst.append(dst[-offset])
        elif tag_type == 3:
            length = 1 + (tag >> 2)
            offset = struct.unpack_from('<I', src, pos)[0]
            pos += 4
            for _ in range(length):
                dst.append(dst[-offset])
    return bytes(dst)

def read_varint_from_bytes(data, pos):
    val = 0
    shift = 0
    while True:
        b = data[pos]
        pos += 1
        val |= (b & 0x7f) << shift
        if not (b & 0x80):
            break
        shift += 7
    return val, pos

def parse_block(data):
    num_restarts = struct.unpack_from('<I', data, len(data) - 4)[0]
    restarts_offset = len(data) - 4 - num_restarts * 4
    
    pos = 0
    entries = []
    while pos < restarts_offset:
        try:
            shared, pos = read_varint_from_bytes(data, pos)
            non_shared, pos = read_varint_from_bytes(data, pos)
            val_len, pos = read_varint_from_bytes(data, pos)
            
            key_delta = data[pos : pos + non_shared]
            pos += non_shared
            val = data[pos : pos + val_len]
            pos += val_len
            
            entries.append((shared, key_delta, val))
        except Exception as e:
            break
    return entries

def read_handle(data, pos):
    offset, pos = read_varint_from_bytes(data, pos)
    size, pos = read_varint_from_bytes(data, pos)
    return offset, size, pos

def parse_ldb_file(filepath):
    with open(filepath, 'rb') as f:
        content = f.read()
    
    if len(content) < 48:
        return []
    
    footer = content[-48:]
    magic = footer[-8:]
    # Chromium LevelDB magic number in little-endian
    if magic != b'\x57\xfb\x80\x8b\x24\x75\x47\xdb':
        return []
    
    pos = 0
    meta_offset, meta_size, pos = read_handle(footer, pos)
    index_offset, index_size, pos = read_handle(footer, pos)
    
    index_block_data = content[index_offset : index_offset + index_size]
    comp_type = content[index_offset + index_size]
    if comp_type == 1:
        index_block_data = snappy_decompress(index_block_data)
        
    index_entries = parse_block(index_block_data)
    
    decompressed_blocks = []
    for shared, key_delta, val in index_entries:
        offset, size, _ = read_handle(val, 0)
        block_data = content[offset : offset + size]
        block_comp = content[offset + size]
        if block_comp == 1:
            try:
                block_data = snappy_decompress(block_data)
            except Exception as e:
                continue
        decompressed_blocks.append(block_data)
    print(f"Successfully parsed {len(decompressed_blocks)} blocks from {os.path.basename(filepath)}")
    return decompressed_blocks

db_dir = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\file__0.indexeddb.leveldb"

all_records = []
all_readings = []

for file in os.listdir(db_dir):
    if file.endswith('.ldb'):
        path = os.path.join(db_dir, file)
        try:
            blocks = parse_ldb_file(path)
            for b_idx, block in enumerate(blocks):
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
                                    if isinstance(first, dict) and 'date' in first:
                                        if 'serviceId' in first:
                                            all_records.append(result)
                                        elif 'machineRemaining' in first:
                                            all_readings.append(result)
                            except Exception as e:
                                pass
                    v8_idx += 1
        except Exception as e:
            print(f"Error parsing {file}: {e}")

# Take the longest matching arrays
best_records = []
for r in all_records:
    if len(r) > len(best_records):
        best_records = r

best_readings = []
for rd in all_readings:
    if len(rd) > len(best_readings):
        best_readings = rd

print(f"Decompressed LevelDB records: {len(best_records)}, readings: {len(best_readings)}")

if best_records:
    with open("extracted_records_final.json", "w", encoding="utf-8") as f:
        json.dump(best_records, f, indent=2, ensure_ascii=False)
if best_readings:
    with open("extracted_readings_final.json", "w", encoding="utf-8") as f:
        json.dump(best_readings, f, indent=2, ensure_ascii=False)
