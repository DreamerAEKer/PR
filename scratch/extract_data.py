import os
import re
import json

search_dir = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data"
results = []

def search_files(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.log') or file.endswith('.ldb') or file.endswith('.localstorage'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'rb') as f:
                        content = f.read()
                        if b'postage_records' in content or b'postage_machine_readings' in content:
                            print(f"Found match in: {path}")
                            # Let's extract JSON arrays from this file
                            # Find things that look like [{"date":...}] or similar
                            matches = re.findall(b'(\\[\\s*\\{\\s*"date"\\s*:.*?\\])', content, re.DOTALL)
                            for match in matches:
                                try:
                                    decoded = match.decode('utf-8', errors='ignore')
                                    # clean up non-printable chars or incomplete json
                                    # let's try to find valid JSON subarray
                                    # Find matching brackets
                                    depth = 0
                                    start = -1
                                    for idx, char in enumerate(decoded):
                                        if char == '[':
                                            if depth == 0:
                                                start = idx
                                            depth += 1
                                        elif char == ']':
                                            depth -= 1
                                            if depth == 0 and start != -1:
                                                candidate = decoded[start:idx+1]
                                                try:
                                                    parsed = json.loads(candidate)
                                                    if isinstance(parsed, list) and len(parsed) > 0 and 'date' in parsed[0]:
                                                        results.append((path, parsed))
                                                except:
                                                    pass
                                except Exception as e:
                                    pass
                except Exception as e:
                    pass

search_files(search_dir)

if results:
    # Print the largest list of records found
    results.sort(key=lambda x: len(x[1]), reverse=True)
    best_file, best_data = results[0]
    print(f"\nSuccessfully extracted {len(best_data)} records from {best_file}")
    with open("extracted_records.json", "w", encoding="utf-8") as out:
        json.dump(best_data, out, indent=2, ensure_ascii=False)
else:
    print("\nNo records extracted via regex search.")
