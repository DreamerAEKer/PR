import os
import datetime

user_data = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data"
for root, dirs, files in os.walk(user_data):
    if root.endswith('IndexedDB'):
        print(f"\nIndexedDB root: {root}")
        for d in os.listdir(root):
            path = os.path.join(root, d)
            if os.path.isdir(path):
                mtime = os.path.getmtime(path)
                mtime_str = datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M:%S')
                print(f"  {d} (Modified: {mtime_str})")
