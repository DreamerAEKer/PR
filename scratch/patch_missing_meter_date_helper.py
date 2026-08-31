import re

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    app_jsx = f.read()

# 1. Add state in Reports component
old_report_states = """  const [missingReadings, setMissingReadings] = useState([]);
  const [showWarningModal, setShowWarningModal] = useState(false);"""

new_report_states = """  const [missingReadings, setMissingReadings] = useState([]);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [missingMeterDetail, setMissingMeterDetail] = useState(null);"""

app_jsx = app_jsx.replace(old_report_states, new_report_states)

# 2. Update ReportMachineV2 mapping logic
old_machine_row_calc = """                  const companyRecords = stats.filter(r => matchingCompanyIds.includes(r.companyId));
                  const count = companyRecords.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
                  const amount = companyRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                  
                  const latestRecordWithMachineStatus = [...companyRecords]
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .find(r => r.machineRemaining !== null || r.machineAccumulated !== null);
                    
                  const remaining = latestRecordWithMachineStatus?.machineRemaining;
                  const accumulated = latestRecordWithMachineStatus?.machineAccumulated;
                  
                  return (
                    <tr key={officialCompany.id}>
                      <td style={{ fontSize: '0.85rem' }}>{code || '-'}</td>
                      <td style={{ textAlign: 'left', fontSize: officialName.length > 30 ? '0.75rem' : '0.85rem', paddingLeft: '8px', whiteSpace: 'nowrap' }}>{officialName || '-'}</td>
                      <td className="num">{count > 0 ? count.toLocaleString() : ''}</td>
                      <td className="num">{amount > 0 ? amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}</td>
                      <td className="num" style={{ fontSize: '0.85rem' }}>{remaining != null ? remaining.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}</td>
                      <td className="num" style={{ fontSize: '0.85rem' }}>{accumulated != null ? accumulated.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}</td>
                    </tr>
                  );"""

new_machine_row_calc = """                  const companyRecords = stats.filter(r => matchingCompanyIds.includes(r.companyId));
                  const count = companyRecords.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
                  const amount = companyRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                  
                  const sortedRecordsByDate = [...companyRecords].sort((a, b) => new Date(b.date) - new Date(a.date));
                  const latestRecord = sortedRecordsByDate.length > 0 ? sortedRecordsByDate[0] : null;
                  const latestDate = latestRecord?.date;

                  const dayMap = {};
                  sortedRecordsByDate.forEach(r => {
                    if (r && r.date) {
                      if (!dayMap[r.date]) {
                        dayMap[r.date] = { date: r.date, count: 0, amount: 0 };
                      }
                      dayMap[r.date].count += Number(r.count) || 0;
                      dayMap[r.date].amount += Number(r.amount) || 0;
                    }
                  });
                  const dayBreakdown = Object.values(dayMap).sort((a, b) => new Date(b.date) - new Date(a.date));

                  const latestRecordWithMachineStatus = sortedRecordsByDate
                    .find(r => r.machineRemaining !== null || r.machineAccumulated !== null);
                    
                  const remaining = latestRecordWithMachineStatus?.machineRemaining;
                  const accumulated = latestRecordWithMachineStatus?.machineAccumulated;
                  const isMissingMachine = amount > 0 && (remaining == null || accumulated == null);
                  
                  return (
                    <tr key={officialCompany.id}>
                      <td style={{ fontSize: '0.85rem' }}>{code || '-'}</td>
                      <td style={{ textAlign: 'left', fontSize: officialName.length > 30 ? '0.75rem' : '0.85rem', paddingLeft: '8px', whiteSpace: 'nowrap' }}>{officialName || '-'}</td>
                      <td className="num">{count > 0 ? count.toLocaleString() : ''}</td>
                      <td className="num">{amount > 0 ? amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}</td>
                      <td className="num" style={{ fontSize: '0.85rem' }}>
                        {remaining != null ? (
                          remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })
                        ) : isMissingMachine && latestDate ? (
                          <button
                            type="button"
                            className="btn-missing-meter no-print"
                            onClick={() => setMissingMeterDetail({
                              company: officialCompany,
                              latestDate,
                              dayBreakdown,
                              count,
                              amount
                            })}
                            title={`คลิกเพื่อดูวันที่คีย์ล่าสุด (${safeFormat(latestDate, 'd MMM yyyy', { locale: th })}) และไปกรอกยอดเครื่อง`}
                          >
                            <AlertCircle size={12} />
                            <span>คีย์ล่าสุด: {safeFormat(latestDate, 'd MMM', { locale: th })}</span>
                          </button>
                        ) : ''}
                      </td>
                      <td className="num" style={{ fontSize: '0.85rem' }}>
                        {accumulated != null ? (
                          accumulated.toLocaleString(undefined, { minimumFractionDigits: 2 })
                        ) : isMissingMachine && latestDate ? (
                          <button
                            type="button"
                            className="btn-missing-meter no-print"
                            onClick={() => setMissingMeterDetail({
                              company: officialCompany,
                              latestDate,
                              dayBreakdown,
                              count,
                              amount
                            })}
                            title={`คลิกเพื่อดูวันที่คีย์ล่าสุด (${safeFormat(latestDate, 'd MMM yyyy', { locale: th })}และไปกรอกยอดเครื่อง`}
                          >
                            <span>[ ✏️ เติมยอด ]</span>
                          </button>
                        ) : ''}
                      </td>
                    </tr>
                  );"""

app_jsx = app_jsx.replace(old_machine_row_calc, new_machine_row_calc)

# 3. Add Modal in Reports component before return end
modal_code = """
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
                      setView('entry');
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

# Insert modal before the end of Reports return statement
app_jsx = app_jsx.replace(
    "{/* Warning Modal */}",
    modal_code + "\n        {/* Warning Modal */}"
)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(app_jsx)

print("App.jsx patched successfully with missing meter helper!")
