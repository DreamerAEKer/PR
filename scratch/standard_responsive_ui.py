import re

with open('src/App.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace with standard clean responsive layout
standard_css = """
/* Standard Modern Responsive Layout System */
:root {
  --sidebar-width: 230px;
  --content-max-width: 1400px;
  --base-gap: 1.25rem;
}

.app-layout {
  display: flex;
  min-height: 100vh;
  width: 100%;
}

.side-nav {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid var(--glass-border);
  padding: 1.5rem 0.85rem;
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
  z-index: 100;
  box-sizing: border-box;
}

.logo {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--primary);
  margin-bottom: 2rem;
  padding: 0 0.5rem;
  letter-spacing: -0.03em;
}

.side-nav button {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  border: none;
  background: transparent;
  color: var(--text-main);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
}

.side-nav button:hover {
  background: rgba(255, 255, 255, 0.08);
}

.side-nav button.active {
  background: var(--primary);
  color: white;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}

.app-content {
  flex: 1;
  margin-left: var(--sidebar-width);
  padding: clamp(1rem, 2vw, 2rem) clamp(1rem, 2.5vw, 2.5rem);
  max-width: var(--content-max-width);
  width: calc(100% - var(--sidebar-width));
  box-sizing: border-box;
}

/* Fluid Standard Grid Layout */
.grid-2col {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: var(--base-gap);
  align-items: start;
}

.glass-card {
  background: var(--card-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255,255,255,0.5);
  padding: clamp(1rem, 1.5vw, 1.35rem);
  margin-bottom: var(--base-gap);
}

.entry-form-vertical {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

.form-group input, 
.input-select {
  padding: 0.65rem 0.85rem;
  border-radius: 8px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-main);
  font-size: 0.92rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus,
.input-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

/* Fluid Auto-Adaptation for Tablets / Laptops / Displays */
@media screen and (max-width: 1024px) {
  :root {
    --sidebar-width: 72px;
  }
  
  .side-nav {
    padding: 1.25rem 0.4rem;
    align-items: center;
  }
  
  .side-nav .logo {
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
    text-align: center;
    padding: 0;
  }
  
  .side-nav button span {
    display: none;
  }
  
  .side-nav button {
    justify-content: center;
    padding: 0.75rem;
  }
  
  .storage-origin-badge strong span,
  .storage-origin-badge div {
    display: none;
  }
}
"""

# Remove old media queries and layout blocks
css = re.sub(r'/\* Responsive Density for 1080p @ 150% Windows Scaling[\s\S]*', '', css)
css = re.sub(r'\.app-layout\s*\{[^}]*\}', '', css)
css = re.sub(r'\.side-nav\s*\{[^}]*\}', '', css)
css = re.sub(r'\.logo\s*\{[^}]*\}', '', css)
css = re.sub(r'\.side-nav button\s*\{[^}]*\}', '', css)
css = re.sub(r'\.side-nav button:hover\s*\{[^}]*\}', '', css)
css = re.sub(r'\.side-nav button\.active\s*\{[^}]*\}', '', css)
css = re.sub(r'\.app-content\s*\{[^}]*\}', '', css)
css = re.sub(r'\.grid-2col\s*\{[^}]*\}', '', css)
css = re.sub(r'\.glass-card\s*\{[^}]*\}', '', css)

css = standard_css + "\n" + css

with open('src/App.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Standard Responsive Auto-Adaptive CSS applied.")
