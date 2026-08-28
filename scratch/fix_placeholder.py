# Update App.css with lighter placeholder styling
with open('src/App.css', 'r', encoding='utf-8') as f:
    css = f.read()

placeholder_css = """
/* Input Placeholders - Light and clearly distinct from entered text */
input::placeholder, select::placeholder, textarea::placeholder {
  color: #94a3b8 !important;
  opacity: 0.5 !important;
  font-weight: normal !important;
  font-style: normal !important;
}
"""

if 'input::placeholder' not in css:
    css += "\n" + placeholder_css
    with open('src/App.css', 'w', encoding='utf-8') as f:
        f.write(css)

# Update App.jsx placeholders
with open('src/App.jsx', 'r', encoding='utf-8') as f:
    app_jsx = f.read()

app_jsx = app_jsx.replace('placeholder="เช่น 246.00"', 'placeholder="0.00"')
app_jsx = app_jsx.replace('placeholder="0.00 หรือ 246-90"', 'placeholder="0.00"')

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(app_jsx)

print("Placeholders updated cleanly.")
