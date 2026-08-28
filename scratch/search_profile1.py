import os
import re
import json

search_dir = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data\Profile 1\IndexedDB"
results = []

def search_files(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.log') or file.endswith('.ldb'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'rb') as f:
                        content = f.read()
                        # IndexedDB values are serialized, let's search for some Thai company name or 'postage'
                        # Let's search for byte sequences
                        if b'h0032' in content or b'P0403' in content or b'postage_records' in content:
                            print(f"Found match in Profile 1: {path}")
                            # Let's extract any JSON-like substrings
                            # Let's find dates like 2026-06- or 2026-07-
                            dates = re.findall(rb'2026-\d{2}-\d{2}', content)
                            if dates:
                                print(f"Found {len(dates)} dates in {file}")
                                # Let's write a chunk of this file to a text file for inspection
                                with open(f"dump_{file}.txt", "w", encoding="utf-8") as out:
                                    out.write(content.decode('utf-8', errors='replace'))
                except Exception as e:
                    pass

search_files(search_dir)
