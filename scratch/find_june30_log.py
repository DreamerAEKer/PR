import os
import struct
import json
import re

db_dir = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\file__0.indexeddb.leveldb"

# Let's search all files in db_dir (both ldb and log) for the string "2026-06-30" or b"h0267"
for file in os.listdir(db_dir):
    if file.endswith('.ldb') or file.endswith('.log'):
        path = os.path.join(db_dir, file)
        try:
            with open(path, "rb") as f:
                data = f.read()
            if b'2026-06-30' in data:
                print(f"Found '2026-06-30' in {file}, size: {len(data)}")
                # Search for surrounding window of b'h0267'
                idx = 0
                while True:
                    idx = data.find(b'2026-06-30', idx)
                    if idx == -1:
                        break
                    # print 300 bytes window
                    window = data[max(0, idx - 100) : min(len(data), idx + 200)]
                    print(f"  Offset {idx}: {window.hex()}")
                    # Let's clean the window to print ASCII
                    ascii_win = "".join(chr(b) if 32 <= b <= 126 else "." for b in window)
                    print(f"  ASCII: {ascii_win}")
                    idx += 10
        except Exception as e:
            print("Error reading", file, e)
