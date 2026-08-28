import os

db_dir = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\file__0.indexeddb.leveldb"
out_path = "raw_leveldb_strings.txt"

with open(out_path, "w", encoding="utf-8") as out:
    for file in os.listdir(db_dir):
        if file.endswith('.ldb') or file.endswith('.log'):
            path = os.path.join(db_dir, file)
            out.write(f"\n=================== FILE: {file} ===================\n")
            try:
                with open(path, 'rb') as f:
                    content = f.read()
                # Find all printable ASCII / UTF-8 strings
                import string
                printable = set(string.printable.encode('ascii'))
                current_str = []
                for byte in content:
                    if byte in printable and byte not in (0, 7, 8, 9, 10, 11, 12, 13): # skip null, tabs, newlines
                        current_str.append(chr(byte))
                    else:
                        if len(current_str) >= 4:
                            s = "".join(current_str).strip()
                            if s:
                                out.write(s + "\n")
                        current_str = []
                if len(current_str) >= 4:
                    out.write("".join(current_str).strip() + "\n")
            except Exception as e:
                out.write(f"Error reading: {e}\n")
print("Done writing strings to raw_leveldb_strings.txt")
