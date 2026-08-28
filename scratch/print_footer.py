import os

path = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\file__0.indexeddb.leveldb\000049.ldb"
with open(path, 'rb') as f:
    content = f.read()

print("File size:", len(content))
print("Last 48 bytes hex:", content[-48:].hex())
print("Last 48 bytes ascii:", content[-48:])
