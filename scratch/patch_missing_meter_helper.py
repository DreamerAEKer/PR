import re

# 1. Add CSS for missing meter helper button and modal in App.css
css_addon = """
/* Missing Meter Helper Styles */
.btn-missing-meter {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
  border: 1px dashed rgba(239, 68, 68, 0.4);
  padding: 3px 7px;
  border-radius: 6px;
  font-size: 0.73rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 2px;
  transition: all 0.15s ease;
}

.btn-missing-meter:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: #dc2626;
  transform: translateY(-1px);
}

@media print {
  .btn-missing-meter,
  .no-print {
    display: none !important;
  }
}

.missing-meter-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}

.missing-meter-modal {
  background: var(--card-bg);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  max-width: 550px;
  width: 100%;
  padding: 1.5rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  animation: scaleUp 0.2s ease;
}

.missing-meter-date-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(37, 99, 235, 0.1);
  color: var(--primary);
  border: 1px solid rgba(37, 99, 235, 0.25);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 700;
}
"""

with open('src/App.css', 'r', encoding='utf-8') as f:
    css = f.read()

if '.btn-missing-meter' not in css:
    css += "\n" + css_addon
    with open('src/App.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("App.css updated with missing meter helper styles.")

# 2. Update Report view in App.jsx to include interactive helper & modal
with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's inspect ReportMachineV2 row rendering in App.jsx
# We will enhance Report component to support missing meter modal & direct jump
patch_report_code = """
        {/* Missing Meter Helper Modal */}
        {missingMeterDetail && (
          <div className="missing-meter-modal-overlay" onClick={() => setMissingMeterDetail(null)}>
            <div className="missing-meter-modal" onClick={e => e.stopPropagation()}>
              <div className="flex-between mb-4">
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
                  <AlertCircle size={22} />
                  <span>ข้อมูลวันที่คีย์ล่าสุด (ที่ยังขาดยอดเครื่อง)</span>
                </h3>
                <button type="button" className="btn-icon" onClick={() => setMissingMeterDetail(null)}>✕</button>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--glass-border)', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>
                  🏢 {missingMeterDetail.company.code ? `[${missingMeterDetail.company.code}] ` : ''}{missingMeterDetail.company.name}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  ยอดรวมทั้งเดือน: <strong>{missingMeterDetail.count.toLocaleString()} ชิ้น</strong> | <strong>฿{missingMeterDetail.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</strong>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  📅 วันที่พบคีย์รายการล่าสุดในเดือนนี้:
                </label>
                <div className="missing-meter-date-badge">
                  <Calendar size={16} />
                  <span>
                    {missingMeterDetail.latestDate 
                      ? safeFormat(missingMeterDetail.latestDate, 'EEEEที่ d MMMM yyyy (d/MM/yyyy)', { locale: th })
                      : 'ไม่พบวันที่'}
                  </span>
                </div>
              </div>

              {/* Breakdown of days in this month */}
              {missingMeterDetail.dayBreakdown && missingMeterDetail.dayBreakdown.length > 1 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    🗓️ วันที่มีรายการคีย์ทั้งหมดในเดือนนี้ ({missingMeterDetail.dayBreakdown.length} วัน):
                  </label>
                  <div style={{ maxHeight: '120px', overflowY: 'auto', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', padding: '6px 10px', fontSize: '0.8rem' }}>
                    {missingMeterDetail.dayBreakdown.map((d, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: i < missingMeterDetail.dayBreakdown.length - 1 ? '1px dashed rgba(255,255,255,0.08)' : 'none' }}>
                        <span>• {safeFormat(d.date, 'd MMMM yyyy', { locale: th })}</span>
                        <span><strong>{d.count} ชิ้น</strong> (฿{d.amount.toFixed(2)})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-primary full"
                  onClick={() => {
                    if (missingMeterDetail.latestDate) {
                      setNavigationTarget({
                        companyId: missingMeterDetail.company.id,
                        date: missingMeterDetail.latestDate
                      });
                      setCurrentView('entry');
                      setMissingMeterDetail(null);
                    }
                  }}
                  style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', padding: '0.75rem' }}
                >
                  ✏️ ไปที่หน้าบันทึกข้อมูลของวันที่ {safeFormat(missingMeterDetail.latestDate, 'd MMM yyyy', { locale: th })} (เพื่อกรอกยอดเครื่อง)
                </button>
              </div>
            </div>
          </div>
        )}
"""

# Let's check Report component in App.jsx to insert state and modal
# We will use python to cleanly inject `const [missingMeterDetail, setMissingMeterDetail] = useState(null);` in Report component
print("Preparing to patch App.jsx for Report Missing Meter Helper...")
