import os
import struct
import json

class V8Deserializer:
    def __init__(self, data):
        self.data = data
        self.pos = 0

    def read_byte(self):
        if self.pos >= len(self.data):
            raise EOFError()
        b = self.data[self.pos]
        self.pos += 1
        return b

    def read_varint(self):
        value = 0
        shift = 0
        while True:
            b = self.read_byte()
            value |= (b & 0x7f) << shift
            if not (b & 0x80):
                break
            shift += 7
        return value

    def read_zig_zag(self):
        raw = self.read_varint()
        return (raw >> 1) ^ -(raw & 1)

    def deserialize(self):
        if self.pos == 0:
            h1 = self.read_byte()
            h2 = self.read_byte()
            if h1 != 0xff or not (0x01 <= h2 <= 0x20):
                raise ValueError(f"Invalid V8 header: {h1:02x} {h2:02x}")
        
        if self.pos >= len(self.data):
            raise EOFError()
        tag = chr(self.data[self.pos])
        self.pos += 1
        
        if tag == '_': # null
            return None
        elif tag == 'u': # undefined
            return None
        elif tag == 'T': # true
            return True
        elif tag == 'F': # false
            return False
        elif tag == 'I': # Int32
            return self.read_zig_zag()
        elif tag == 'N': # Double
            val = struct.unpack('<d', self.data[self.pos:self.pos+8])[0]
            self.pos += 8
            return val
        elif tag in ('"', 'c'): # String
            length = self.read_varint()
            val = self.data[self.pos:self.pos+length].decode('utf-8', errors='ignore')
            self.pos += length
            return val
        elif tag == 'o': # Object
            obj = {}
            while True:
                if self.pos >= len(self.data):
                    break
                next_byte = self.data[self.pos]
                if chr(next_byte) == '}':
                    self.pos += 1
                    break
                key = self.deserialize()
                val = self.deserialize()
                obj[key] = val
            self.read_varint()
            return obj
        elif tag == 'a': # Array
            length = self.read_varint()
            arr = []
            for _ in range(length):
                arr.append(self.deserialize())
            while True:
                if self.pos >= len(self.data):
                    break
                next_byte = self.data[self.pos]
                if chr(next_byte) == '$':
                    self.pos += 1
                    self.read_varint()
                    self.read_varint()
                    break
                key = self.deserialize()
                val = self.deserialize()
            return arr
        else:
            raise ValueError(f"Unknown tag: {tag} (code: {ord(tag)}), position: {self.pos}")

db_dir = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\file__0.indexeddb.leveldb"

records_list = []
readings_list = []

for file in os.listdir(db_dir):
    if file.endswith('.ldb') or file.endswith('.log'):
        path = os.path.join(db_dir, file)
        try:
            with open(path, 'rb') as f:
                content = f.read()
            
            idx = 0
            while True:
                idx = content.find(b'\xff', idx)
                if idx == -1:
                    break
                if idx + 1 < len(content):
                    next_byte = content[idx+1]
                    if 0x01 <= next_byte <= 0x20:
                        try:
                            deserializer = V8Deserializer(content[idx:])
                            result = deserializer.deserialize()
                            if isinstance(result, list) and len(result) > 0:
                                first = result[0]
                                if isinstance(first, dict) and 'date' in first:
                                    if 'serviceId' in first:
                                        records_list.append(result)
                                    elif 'machineRemaining' in first:
                                        readings_list.append(result)
                        except Exception as e:
                            pass
                idx += 1
        except Exception as e:
            print(f"Error reading {file}: {e}")

# Take the longest matching arrays
best_records = []
for r in records_list:
    if len(r) > len(best_records):
        best_records = r

best_readings = []
for rd in readings_list:
    if len(rd) > len(best_readings):
        best_readings = rd

print(f"Successfully extracted: records: {len(best_records)}, readings: {len(best_readings)}")

if best_records:
    with open("extracted_records_final.json", "w", encoding="utf-8") as f:
        json.dump(best_records, f, indent=2, ensure_ascii=False)
if best_readings:
    with open("extracted_readings_final.json", "w", encoding="utf-8") as f:
        json.dump(best_readings, f, indent=2, ensure_ascii=False)
