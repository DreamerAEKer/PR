path = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\file__0.indexeddb.leveldb\000053.log"
with open(path, 'rb') as f:
    content = f.read()

idx = 0
while True:
    idx = content.find(b'h0032', idx)
    if idx == -1:
        break
    print(f"\nFound h0032 at offset {idx}:")
    start = max(0, idx - 100)
    end = min(len(content), idx + 200)
    chunk = content[start:end]
    print("Hex:", chunk.hex())
    # ASCII view, replace control chars
    ascii_view = "".join(chr(b) if 32 <= b <= 126 else f"\\x{b:02x}" for b in chunk)
    print("ASCII:", ascii_view)
    idx += 5
