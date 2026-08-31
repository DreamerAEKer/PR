import subprocess

# Run dump leveldb strings or parse ldb to find August records
try:
    with open('scratch/parse_ldb.py', 'r', encoding='utf-8') as f:
        code = f.read()
    print("Found parse_ldb.py")
except Exception as e:
    print(e)
