from parse_ldb import parse_ldb_file
import struct

class V8TraceDeserializer:
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
        start_pos = self.pos
        if self.pos == 0:
            h1 = self.read_byte()
            h2 = self.read_byte()
            print(f"[{start_pos:3d}] HEADER: {h1:02x} {h2:02x}")
        
        tag_byte = self.read_byte()
        tag = chr(tag_byte)
        
        print(f"[{start_pos:3d}] TAG: {tag_byte:02x} ({repr(tag)})")
        
        if tag == '\xfe':
            return self.deserialize()
            
        if tag == '_':
            return None
        elif tag == 'u':
            return None
        elif tag == 'T':
            return True
        elif tag == 'F':
            return False
        elif tag == '0':
            return 0
        elif tag == 'I':
            val = self.read_zig_zag()
            print(f"  Int32: {val}")
            return val
        elif tag == 'N':
            val = struct.unpack('<d', self.data[self.pos:self.pos+8])[0]
            self.pos += 8
            print(f"  Double: {val}")
            return val
        elif tag in ('"', 'c'):
            length = self.read_varint()
            val = self.data[self.pos:self.pos+length].decode('utf-8', errors='ignore')
            self.pos += length
            print(f"  String (len {length}): {repr(val)}")
            return val
        elif tag in ('o', '{'):
            print(f"  --> Start Object")
            obj = {}
            while True:
                next_byte = self.data[self.pos]
                if chr(next_byte) == '}':
                    self.pos += 1
                    print(f"  <-- End Object tag '}}'")
                    break
                # Print key offset
                key_pos = self.pos
                key = self.deserialize()
                val = self.deserialize()
                obj[key] = val
            p_count = self.read_varint()
            print(f"  Object Properties Count: {p_count}")
            return obj
        elif tag == 'a':
            length = self.read_varint()
            print(f"  --> Start Array (len {length})")
            arr = []
            for i in range(length):
                print(f"  Array Element {i}:")
                arr.append(self.deserialize())
            while True:
                next_byte = self.data[self.pos]
                if chr(next_byte) == '$':
                    self.pos += 1
                    p_count = self.read_varint()
                    a_len = self.read_varint()
                    print(f"  <-- End Array, properties count {p_count}, array length {a_len}")
                    break
                key = self.deserialize()
                val = self.deserialize()
            return arr
        else:
            raise ValueError(f"Unknown tag: {repr(tag)}")

path = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\file__0.indexeddb.leveldb\000049.ldb"
blocks = parse_ldb_file(path)
block = blocks[0]
offset = 644

deserializer = V8TraceDeserializer(block[offset:])
try:
    deserializer.deserialize()
except Exception as e:
    print("CRASHED:", e)
