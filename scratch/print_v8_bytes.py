from parse_ldb import parse_ldb_file

path = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\file__0.indexeddb.leveldb\000049.ldb"
blocks = parse_ldb_file(path)

# Let's inspect block 0
block = blocks[0]
offset = 644
chunk = block[offset : offset + 300]
print("Hex:", chunk.hex())
# Print byte offsets and representation
for idx, b in enumerate(chunk):
    print(f"{idx:3d} (offset {offset+idx:3d}): {b:02x} {chr(b) if 32 <= b <= 126 else '.'}")
