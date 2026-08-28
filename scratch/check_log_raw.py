path = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\file__0.indexeddb.leveldb\000053.log"
with open(path, 'rb') as f:
    content = f.read()

print("File size:", len(content))
print("Contains 'postage_records':", b'postage_records' in content)
print("Contains 'postage_machine_readings':", b'postage_machine_readings' in content)
print("Contains 'postage':", b'postage' in content)
print("Contains 'h0032':", b'h0032' in content)
