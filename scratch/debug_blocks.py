import os
from parse_ldb import parse_ldb_file

db_dir = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\file__0.indexeddb.leveldb"

for file in os.listdir(db_dir):
    if file.endswith('.ldb'):
        path = os.path.join(db_dir, file)
        blocks = parse_ldb_file(path)
        for idx, block in enumerate(blocks):
            if b'postage_records' in block or b'postage_machine_readings' in block:
                print(f"Found keyword in block {idx} of {file}!")
                # Print hex snippet around the keyword
                k_idx = block.find(b'postage_')
                start = max(0, k_idx - 20)
                end = min(len(block), k_idx + 200)
                print("Snippet hex:", block[start:end].hex())
                print("Snippet ascii:", block[start:end])
