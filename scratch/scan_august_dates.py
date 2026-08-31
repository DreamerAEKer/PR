import os
import glob
import re

chrome_dir = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data"
ldb_files = glob.glob(os.path.join(chrome_dir, "**", "*.ldb"), recursive=True) + glob.glob(os.path.join(chrome_dir, "**", "*.log"), recursive=True)

h0032_hits = []
h0130_hits = []

for file_path in ldb_files:
    try:
        with open(file_path, 'rb') as f:
            content = f.read()
            
        # Search for August 2026 dates (2026-08) with h0032 or h0130
        for match in re.finditer(rb'2026-08-\d{2}', content):
            start = max(0, match.start() - 100)
            end = min(len(content), match.end() + 200)
            snippet = content[start:end]
            if b'h0032' in snippet.lower() or b'H0032' in snippet or b'\xe0\xb9\x80\xe0\xb8\xad\xe0\xb9\x80\xe0\xb8\x8a\xe0\xb8\xb5\xe0\xb9\x88\xe0\xb8\xa2\xe0\xb8\x99' in snippet:
                h0032_hits.append((match.group(0).decode('ascii'), snippet))
            if b'h0130' in snippet.lower() or b'H0130' in snippet or b'\xe0\xb8\xaa\xe0\xb8\xb4\xe0\xb8\x97\xe0\xb8\x98\xe0\xb8\xb4\xe0\xb8\x9c\xe0\xb8\xa5' in snippet:
                h0130_hits.append((match.group(0).decode('ascii'), snippet))
    except Exception:
        pass

print("=== H0032 (เอเชี่ยนฮอนด้า) August Dates ===")
print(sorted(list(set([d for d, _ in h0032_hits]))))

print("\n=== H0130 (สิทธิผล) August Dates ===")
print(sorted(list(set([d for d, _ in h0130_hits]))))
