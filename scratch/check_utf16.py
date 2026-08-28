path = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\file__0.indexeddb.leveldb\000053.log"
with open(path, 'rb') as f:
    content = f.read()

utf16_key1 = 'postage_records'.encode('utf-16-le')
utf16_key2 = 'postage_machine_readings'.encode('utf-16-le')

print("Contains UTF-16 'postage_records':", utf16_key1 in content)
print("Contains UTF-16 'postage_machine_readings':", utf16_key2 in content)
