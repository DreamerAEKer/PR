import os

db_dir = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\file__0.indexeddb.leveldb"

for file in os.listdir(db_dir):
    if file.endswith('.ldb') or file.endswith('.log'):
        path = os.path.join(db_dir, file)
        try:
            with open(path, 'rb') as f:
                content = f.read()
            # Find \xff followed by any byte
            idx = 0
            found = []
            while True:
                idx = content.find(b'\xff', idx)
                if idx == -1:
                    break
                if idx + 1 < len(content):
                    next_byte = content[idx+1]
                    if 0x01 <= next_byte <= 0x20:
                        found.append(f"{idx}:{next_byte:02x}")
                idx += 1
            if found:
                print(f"{file} has potential headers: {', '.join(found[:10])}")
        except Exception as e:
            print(f"Error {file}: {e}")
