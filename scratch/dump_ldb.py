import os
import re
import json

path = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\Local Storage\leveldb\002512.ldb"

with open(path, 'rb') as f:
    content = f.read()

print("File size:", len(content))

# Let's extract any JSON-like structures. In LocalStorage leveldb, the values are often UTF-16 or UTF-8 strings.
# Let's find strings starting with [ and ending with ]
# Or let's scan for any sequence of ascii/utf-8 characters that looks like JSON.
# We can search for the substring b'postage_records' and look at what follows it.
idx = 0
while True:
    idx = content.find(b'postage_', idx)
    if idx == -1:
        break
    print(f"\n--- Found postage_ at byte {idx} ---")
    # print 500 bytes before and 1500 bytes after
    start = max(0, idx - 50)
    end = min(len(content), idx + 2000)
    chunk = content[start:end]
    # Let's try to find if there is a JSON string
    # We can try to decode it as utf-8 or utf-16le
    try:
        print("Raw UTF-8 representation:")
        print(chunk.decode('utf-8', errors='replace')[:500])
    except:
        pass
    idx += 8
