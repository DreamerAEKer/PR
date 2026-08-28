from parse_ldb import parse_ldb_file

path = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\file__0.indexeddb.leveldb\000049.ldb"
blocks = parse_ldb_file(path)
block = blocks[0]

# Print offsets of 0x7b ({) and 0x7d (}) in the block
offsets_7b = [i for i, b in enumerate(block) if b == 0x7b]
offsets_7d = [i for i, b in enumerate(block) if b == 0x7d]

print("Offsets of 0x7b ({):", offsets_7b)
print("Offsets of 0x7d (}):", offsets_7d)
