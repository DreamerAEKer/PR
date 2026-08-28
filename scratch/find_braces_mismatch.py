# Let's read App.jsx and check braces matching
with open("src/App.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Let's count open/close braces for the Reports component.
# Reports starts at line 1225 (1-based, index 1224).
# It ends at line 2245 (index 2244).

brace_count = 0
in_jsx = 0
for idx in range(1224, 2246):
    line = lines[idx]
    # Simple brace counting
    for char_idx, char in enumerate(line):
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count < 0:
                print(f"Brace went negative at line {idx+1} char {char_idx}: {line.strip()}")
                brace_count = 0

print(f"Final brace count: {brace_count}")
