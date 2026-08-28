import os
import re

search_dir = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data"
count = 0

for root, dirs, files in os.walk(search_dir):
    # Skip Cache, Code Cache, GPUCache
    if any(p in root for p in ["Cache", "GPUCache", "System Profile", "Crashpad", "dictionaries"]):
        continue
    for file in files:
        if file.endswith('.log') or file.endswith('.ldb') or file.endswith('.localstorage') or file.endswith('.sqlite'):
            path = os.path.join(root, file)
            try:
                if os.path.getsize(path) > 20 * 1024 * 1024: # Skip files > 20MB
                    continue
                with open(path, 'rb') as f:
                    content = f.read()
                    if b'postage_records' in content or b'postage_machine_readings' in content:
                        print(f"Match: {path} (size: {len(content)} bytes)")
                        count += 1
            except:
                pass
print(f"Total matching files: {count}")
