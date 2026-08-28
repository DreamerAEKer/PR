import os
import struct
import json
import traceback

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
        
        # Handle padding tag \xfe
        if tag == '\xfe':
            return self.deserialize()
            
        if tag == '_': # null
            return None
        elif tag == 'u': # undefined
            return None
        elif tag == 'T': # true
            return True
        elif tag == 'F': # false
            return False
        elif tag == '0': # V8 integer 0 optimization
            return 0
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
        elif tag in ('o', '{'): # Object (treat { same as o)
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
            raise ValueError(f"Unknown tag: {repr(tag)} (code: {ord(tag)}), position: {self.pos}")

from parse_ldb import parse_ldb_file

db_dir = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\file__0.indexeddb.leveldb"

with open("parse_errors.log", "w", encoding="utf-8") as log:
    for file in os.listdir(db_dir):
        if file.endswith('.ldb'):
            path = os.path.join(db_dir, file)
            blocks = parse_ldb_file(path)
            for b_idx, block in enumerate(blocks):
                if b'companyId' in block:
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
                                            log.write(f"Success in {file} block {b_idx}! Found array of length {len(result)}\n")
                                            print(f"Success in {file} block {b_idx}! Found array of length {len(result)}")
                                            with open(f"extracted_records_{os.path.basename(file)}_{b_idx}.json", "w", encoding="utf-8") as out:
                                                json.dump(result, out, indent=2, ensure_ascii=False)
                                except Exception as e:
                                    log.write(f"Error in {file} block {b_idx} offset {v8_idx}: {repr(e)}\n")
                                    log.write(traceback.format_exc())
                                    log.write("\n" + "="*40 + "\n")
                        v8_idx += 1
print("Done log parsing.")
