import re

# Update App.css with compact, professional proportions
with open('src/App.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Update sidebar and main layout
css = re.sub(r'\.side-nav\s*\{[^}]*\}', """.side-nav {
  width: 215px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border-right: 1px solid var(--glass-border);
  padding: 1.25rem 0.75rem;
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
  z-index: 100;
}""", css)

css = re.sub(r'\.logo\s*\{[^}]*\}', """.logo {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--primary);
  margin-bottom: 1.75rem;
  padding: 0 0.5rem;
  letter-spacing: -0.04em;
}""", css)

css = re.sub(r'\.side-nav button\s*\{[^}]*\}', """.side-nav button {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.6rem 0.8rem;
  border: none;
  background: transparent;
  color: var(--text-main);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.88rem;
  transition: all 0.2s;
  text-align: left;
}""", css)

css = re.sub(r'\.app-content\s*\{[^}]*\}', """.app-content {
  flex: 1;
  margin-left: 215px;
  padding: 1.5rem 2rem;
  max-width: 1440px;
  width: calc(100% - 215px);
}""", css)

css = re.sub(r'\.grid-2col\s*\{[^}]*\}', """.grid-2col {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 1.25rem;
  align-items: start;
}""", css)

css = re.sub(r'\.glass-card\s*\{[^}]*\}', """.glass-card {
  background: var(--card-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.04), inset 0 0 0 1px rgba(255,255,255,0.4);
  padding: 1.15rem 1.25rem;
  margin-bottom: 1.15rem;
}""", css)

css = re.sub(r'\.entry-form-vertical\s*\{[^}]*\}', """.entry-form-vertical {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}""", css)

css = re.sub(r'\.form-group\s*\{[^}]*\}', """.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}""", css)

css = re.sub(r'\.form-group label\s*\{[^}]*\}', """.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}""", css)

css = re.sub(r'\.form-group input\s*\{[^}]*\}', """.form-group input {
  padding: 0.55rem 0.75rem;
  border-radius: 7px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.05);
  font-size: 0.9rem;
}""", css)

css = re.sub(r'\.active-company-banner\s*\{[^}]*\}', """.active-company-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin: -0.25rem 0 0.85rem;
  padding: 0.65rem 0.9rem;
  border-radius: 10px;
  border: 1px solid rgba(37, 99, 235, 0.3);
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%);
}""", css)

css = re.sub(r'\.quick-company-panel\s*\{[^}]*\}', """.quick-company-panel {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  padding: 0.65rem 0.85rem;
  margin-bottom: 1rem;
}""", css)

css = re.sub(r'\.quick-company-grid\s*\{[^}]*\}', """.quick-company-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}""", css)

css = re.sub(r'\.quick-company-btn\s*\{[^}]*\}', """.quick-company-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  font-size: 0.76rem;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}""", css)

# Add media queries for compact / 150% scaled screens
media_query_compact = """
/* Responsive Density for 1080p @ 150% Windows Scaling (1280x720 effective) */
@media screen and (max-width: 1400px), screen and (max-height: 850px) {
  html {
    font-size: 14.5px;
  }
  
  .app-content {
    padding: 1.15rem 1.5rem;
  }
  
  .side-nav {
    width: 200px;
    padding: 1rem 0.6rem;
  }
  
  .app-content {
    margin-left: 200px;
    width: calc(100% - 200px);
  }
  
  .logo {
    font-size: 1.2rem;
    margin-bottom: 1.25rem;
  }
  
  .glass-card {
    padding: 0.95rem 1.1rem;
    margin-bottom: 0.95rem;
  }
  
  .entry-form-vertical {
    gap: 0.75rem;
  }
  
  .grid-2col {
    gap: 1rem;
  }
  
  .stats-grid-4 {
    gap: 0.85rem;
  }
  
  .manager-kpi-grid {
    gap: 0.85rem;
  }
}
"""

if 'Responsive Density for 1080p @ 150% Windows Scaling' not in css:
    css += "\n" + media_query_compact

with open('src/App.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Compact proportions and 150% display scaling styles applied.")
