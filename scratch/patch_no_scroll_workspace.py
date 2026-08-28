import re

# 1. Update CSS for compact, no-scroll workspace
with open('src/App.css', 'r', encoding='utf-8') as f:
    css = f.read()

no_scroll_css = """
/* No-Scroll Compact Workplace for Data Entry */
.app-content {
  flex: 1;
  margin-left: 210px;
  padding: 0.75rem 1.25rem;
  max-width: 1440px;
  width: calc(100% - 210px);
  box-sizing: border-box;
}

.data-entry-header-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.data-entry-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.quick-company-panel {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  padding: 0.4rem 0.65rem;
  margin-bottom: 0.65rem;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
}

.quick-company-panel .quick-company-header {
  display: none;
}

.quick-company-grid {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
  width: 100%;
}

.quick-company-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  font-size: 0.78rem;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-main);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.quick-company-btn.active {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}

.grid-2col-entry {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 0.85rem;
  align-items: start;
}

.glass-card-compact {
  background: var(--card-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  padding: 0.85rem 1rem;
  margin-bottom: 0.75rem;
}

.active-company-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 0.65rem;
  padding: 0.45rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(37, 99, 235, 0.25);
  background: rgba(37, 99, 235, 0.05);
}

.active-company-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main);
}

.active-company-subtext {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--primary);
}

.category-toggle {
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px;
  border-radius: 8px;
  border: 1px solid var(--glass-border);
  margin-bottom: 0.65rem;
}

.category-toggle button {
  flex: 1;
  padding: 0.4rem;
  font-size: 0.82rem;
  font-weight: 600;
}

.quick-services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 5px;
  margin-bottom: 0.65rem;
}

.quick-service-btn {
  padding: 5px 8px;
  font-size: 0.78rem;
  border-radius: 6px;
}

.entry-form-vertical {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.form-group input, 
.input-select {
  padding: 0.45rem 0.65rem;
  font-size: 0.88rem;
  border-radius: 6px;
}

.daily-records-scroll {
  max-height: 180px;
  overflow-y: auto;
}

.meter-compact-card {
  padding: 0.65rem 0.85rem;
  border-radius: 8px;
}
"""

if '/* No-Scroll Compact Workplace for Data Entry */' not in css:
    css += "\n" + no_scroll_css
    with open('src/App.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("App.css updated with no-scroll styles.")

# 2. Update App.jsx DataEntry top structure for tight single-screen layout
with open('src/App.jsx', 'r', encoding='utf-8') as f:
    app_jsx = f.read()

# Replace DataEntry top header in App.jsx
old_top_header = """      {/* Top Header */}
      <div className="flex-between mb-4 flex-wrap gap-4">
        <div>
          <h1 style={{ margin: 0 }}>บันทึกข้อมูลรายวัน</h1>
          <p className="text-muted" style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>
            เลือกบริษัทและวันที่ แล้วกรอกจำนวนชิ้นและยอดเงิน
          </p>
        </div>
        <div className="flex-form-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <select 
            className="input-select" 
            value={selectedCompany} 
            onChange={e => handleSelectCompany(e.target.value)}
            style={{ fontWeight: 600, minWidth: '220px' }}
          >
            {entryCompanies.map(c => (
              <option key={c.id} value={c.id}>
                {c.code ? `[${c.code}] ` : ''}{c.name}
              </option>
            ))}
          </select>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => handleShiftDate(-1)} 
              title="วันก่อนหน้า"
              style={{ padding: '6px 10px', fontSize: '0.85rem' }}
            >
              ◀
            </button>
            <ThaiDatePicker value={selectedDay} onChange={handleSelectDate} />
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => handleShiftDate(1)} 
              title="วันถัดไป"
              style={{ padding: '6px 10px', fontSize: '0.85rem' }}
            >
              ▶
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => handleSelectDate(getSmartDefaultDate())} 
              title="ไปยังวันทำการล่าสุด/วันนี้"
              style={{ padding: '6px 10px', fontSize: '0.85rem' }}
            >
              วันนี้
            </button>
          </div>
        </div>
      </div>"""

new_top_header = """      {/* Top Consolidated Single-Row Header */}
      <div className="data-entry-header-compact">
        <h1 className="data-entry-title">
          <span>📝 บันทึกข้อมูลรายวัน</span>
        </h1>
        <div className="flex-form-controls" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <select 
            className="input-select" 
            value={selectedCompany} 
            onChange={e => handleSelectCompany(e.target.value)}
            style={{ fontWeight: 600, minWidth: '200px', padding: '4px 8px' }}
          >
            {entryCompanies.map(c => (
              <option key={c.id} value={c.id}>
                {c.code ? `[${c.code}] ` : ''}{c.name}
              </option>
            ))}
          </select>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => handleShiftDate(-1)} 
              title="วันก่อนหน้า"
              style={{ padding: '4px 8px', fontSize: '0.82rem' }}
            >
              ◀
            </button>
            <ThaiDatePicker value={selectedDay} onChange={handleSelectDate} />
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => handleShiftDate(1)} 
              title="วันถัดไป"
              style={{ padding: '4px 8px', fontSize: '0.82rem' }}
            >
              ▶
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => handleSelectDate(getSmartDefaultDate())} 
              title="ไปยังวันทำการล่าสุด/วันนี้"
              style={{ padding: '4px 8px', fontSize: '0.82rem' }}
            >
              วันนี้
            </button>
          </div>
        </div>
      </div>"""

app_jsx = app_jsx.replace(old_top_header, new_top_header)

# Replace <div className="grid-2col"> with <div className="grid-2col-entry">
app_jsx = app_jsx.replace('<div className="grid-2col">', '<div className="grid-2col-entry">', 1)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(app_jsx)

print("App.jsx updated with compact header.")
