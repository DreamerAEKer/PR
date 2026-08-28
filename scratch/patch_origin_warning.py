import re

# 1. Update AppContext.jsx with Primary Location tracking
with open('src/context/AppContext.jsx', 'r', encoding='utf-8') as f:
    app_context = f.read()

# Add primary location state and management
if 'primaryLocation' not in app_context:
    # Add state in AppProvider
    old_state_decl = "  const [records, setRecords] = useState([]);"
    new_state_decl = """  const [records, setRecords] = useState([]);
  const [primaryLocation, setPrimaryLocationState] = useState(() => {
    return localStorage.getItem('postage_primary_location') || '';
  });
  const [primaryRecordCount, setPrimaryRecordCount] = useState(() => {
    return Number(localStorage.getItem('postage_primary_record_count')) || 0;
  });"""
    app_context = app_context.replace(old_state_decl, new_state_decl)

    # In loadStorage, set primary location if empty and records exist
    old_load_end = "        setIsStorageLoaded(true);"
    new_load_end = """        // Auto-register primary location on load if not set or if this origin has more records
        try {
          const curLoc = window.location.href;
          const savedLoc = localStorage.getItem('postage_primary_location');
          const curCount = (idbRecords || []).length;
          
          if (!savedLoc && curCount > 0) {
            localStorage.setItem('postage_primary_location', curLoc);
            localStorage.setItem('postage_primary_record_count', String(curCount));
            setPrimaryLocationState(curLoc);
            setPrimaryRecordCount(curCount);
          } else if (savedLoc) {
            setPrimaryLocationState(savedLoc);
            const savedCount = Number(localStorage.getItem('postage_primary_record_count')) || 0;
            if (curLoc === savedLoc && curCount !== savedCount) {
              localStorage.setItem('postage_primary_record_count', String(curCount));
              setPrimaryRecordCount(curCount);
            }
          }
        } catch (e) {
          console.error('Failed to initialize primary location:', e);
        }

        setIsStorageLoaded(true);"""
    app_context = app_context.replace(old_load_end, new_load_end)

    # Add helper functions to change/set primary location
    helpers = """  const setAsPrimaryLocation = (locHref) => {
    const targetLoc = locHref || window.location.href;
    const count = (records || []).length;
    localStorage.setItem('postage_primary_location', targetLoc);
    localStorage.setItem('postage_primary_record_count', String(count));
    setPrimaryLocationState(targetLoc);
    setPrimaryRecordCount(count);
  };

  const clearPrimaryLocation = () => {
    localStorage.removeItem('postage_primary_location');
    localStorage.removeItem('postage_primary_record_count');
    setPrimaryLocationState('');
    setPrimaryRecordCount(0);
  };
"""
    app_context = app_context.replace("  return (", helpers + "\n  return (")

    # Export in AppContext.Provider
    app_context = app_context.replace(
        "navigationTarget, setNavigationTarget",
        "navigationTarget, setNavigationTarget, primaryLocation, primaryRecordCount, setAsPrimaryLocation, clearPrimaryLocation"
    )

    with open('src/context/AppContext.jsx', 'w', encoding='utf-8') as f:
        f.write(app_context)
    print("AppContext.jsx updated with primary location features.")

# 2. Update App.css with Warning Banner & Storage Badge styles
css_addon = """
/* Primary Storage & Non-Main Origin Warning Styles */
.non-main-origin-banner {
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
  color: white;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  box-shadow: 0 8px 24px rgba(239, 68, 68, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.25);
  animation: pulseBorder 2s infinite ease-in-out, slideDown 0.3s ease;
}

@keyframes pulseBorder {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
  70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.non-main-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.non-main-details {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin: 0.75rem 0;
  font-size: 0.85rem;
  line-height: 1.6;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.non-main-details code {
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.82rem;
  word-break: break-all;
}

.non-main-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 0.75rem;
}

.btn-origin-action {
  background: rgba(255, 255, 255, 0.95);
  color: #991b1b;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s ease;
}

.btn-origin-action:hover {
  background: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.btn-origin-secondary {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s ease;
}

.btn-origin-secondary:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* Sidebar Storage Location Badge */
.storage-origin-badge {
  margin: 0.75rem;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 0.73rem;
  line-height: 1.4;
  text-align: left;
  border: 1px solid var(--glass-border);
}

.storage-origin-badge.primary {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.3);
  color: #059669;
}

.storage-origin-badge.warning {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.35);
  color: #dc2626;
  cursor: pointer;
}

.storage-origin-badge strong {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 700;
  margin-bottom: 2px;
}
"""

with open('src/App.css', 'r', encoding='utf-8') as f:
    css = f.read()

if '.non-main-origin-banner' not in css:
    css += "\n" + css_addon
    with open('src/App.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("App.css updated with origin warning styles.")

# 3. Update App.jsx with Origin Warning Banner, Navigation badge, and Settings manager
with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add ShieldAlert, Copy, ExternalLink, HardDrive to imports
import_match = re.search(r"import \{[^}]+\} from 'lucide-react';", content)
if import_match:
    icons = "LayoutDashboard, Settings, FileText, PlusCircle, Printer, Trash2, ChevronLeft, ChevronRight, Save, Edit2, Check, X, Download, Upload, ChevronUp, ChevronDown, ArrowRightLeft, Building2, Sparkles, Star, Search, RefreshCw, CheckCircle2, Calculator, MinusCircle, AlertTriangle, ShieldAlert, Copy, ExternalLink, HardDrive"
    content = content[:import_match.start()] + f"import {{ {icons} }} from 'lucide-react';" + content[import_match.end():]

# Add StorageOriginManager component before BackupManager
storage_manager_code = """
const StorageOriginManager = () => {
  const { records, primaryLocation, primaryRecordCount, setAsPrimaryLocation, clearPrimaryLocation } = useApp();
  const [copied, setCopied] = useState(false);
  const currentLoc = window.location.href;
  const isPrimary = !primaryLocation || currentLoc === primaryLocation;

  const handleCopyCurrent = () => {
    navigator.clipboard.writeText(currentLoc);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSetPrimary = () => {
    if (window.confirm('คุณต้องการบันทึกให้ที่อยู่นี้ (URL/Path ปัจจุบัน) เป็น "ฐานข้อมูลหลัก" ของระบบใช่หรือไม่?')) {
      setAsPrimaryLocation(currentLoc);
      alert('บันทึกพิกัดฐานข้อมูลหลักเรียบร้อยแล้ว!');
    }
  };

  return (
    <div className="glass-card mb-8">
      <div className="flex-between mb-4">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <HardDrive size={22} color="var(--primary)" />
          <span>การจัดการพิกัดฐานข้อมูลหลัก (Origin / File Location)</span>
        </h2>
        <span className={`storage-origin-badge ${isPrimary ? 'primary' : 'warning'}`} style={{ margin: 0, padding: '4px 10px' }}>
          <strong>{isPrimary ? '🟢 พิกัดฐานข้อมูลหลัก' : '⚠️ ไม่ใช่พิกัดหลัก'}</strong>
        </span>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.6 }}>
        เบราว์เซอร์จะแยกฐานข้อมูล (IndexedDB / LocalStorage) แยกตาม URL และพิกัดไฟล์อย่างอิสระ 
        ระบบนี้จะช่วยตรวจสอบและป้องกันไม่ให้คุณเผลอไปเปิดและบันทึกข้อมูลในไฟล์สำเนา หรือ URL อื่น
      </p>

      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--glass-border)', marginBottom: '1rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>พิกัดที่เปิดอยู่ขณะนี้:</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              readOnly 
              value={currentLoc} 
              className="input-select full" 
              style={{ fontSize: '0.85rem', fontFamily: 'monospace', background: 'rgba(0,0,0,0.1)' }}
            />
            <button type="button" className="btn btn-secondary" onClick={handleCopyCurrent} title="คัดลอกลิงก์นี้">
              <Copy size={16} /> {copied ? 'คัดลอกแล้ว!' : 'คัดลอก'}
            </button>
          </div>
          <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
            📊 ข้อมูลที่มีในพิกัดนี้: <strong>{(records || []).length.toLocaleString()} รายการ</strong>
          </small>
        </div>

        {primaryLocation && (
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--glass-border)' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>พิกัดหลักที่บันทึกไว้ในระบบ:</label>
            <input 
              readOnly 
              value={primaryLocation} 
              className="input-select full" 
              style={{ fontSize: '0.85rem', fontFamily: 'monospace', background: 'rgba(0,0,0,0.1)' }}
            />
            <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              🎯 สถานะ: {currentLoc === primaryLocation ? 'ตรงกัน (กำลังใช้งานพิกัดหลัก ✓)' : 'ต่างกัน (คุณกำลังเปิดจากสำเนา/URL อื่น)'}
            </small>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" onClick={handleSetPrimary}>
          <Check size={16} /> ตั้งค่าพิกัดปัจจุบันนี้ให้เป็น "ฐานข้อมูลหลัก"
        </button>
        {primaryLocation && (
          <button type="button" className="btn btn-secondary" onClick={() => {
            if (window.confirm('คุณต้องการรีเซ็ตพิกัดหลักเพื่อตรวจจับใหม่อัตโนมัติใช่หรือไม่?')) {
              clearPrimaryLocation();
            }
          }}>
            รีเซ็ตพิกัดหลัก
          </button>
        )}
      </div>
    </div>
  );
};
"""

content = content.replace("const BackupManager = () => {", storage_manager_code + "\nconst BackupManager = () => {")

# Update Navigation to show database status badge
old_nav = """const Navigation = ({ view, setView }) => (
  <nav className="no-print side-nav">
    <div className="logo">POST STATS</div>
    <div className="nav-items">
      <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}><LayoutDashboard size={20}/> <span>แดชบอร์ด</span></button>
      <button className={view === 'entry' ? 'active' : ''} onClick={() => setView('entry')}><PlusCircle size={20}/> <span>บันทึกข้อมูล</span></button>
      <button className={view === 'history' ? 'active' : ''} onClick={() => setView('history')}><FileText size={20}/> <span>ประวัติ</span></button>
      <button className={view === 'reports' ? 'active' : ''} onClick={() => setView('reports')}><Printer size={20}/> <span>รายงาน</span></button>
      <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}><Settings size={20}/> <span>ตั้งค่า</span></button>
    </div>
    <div className="nav-footer" style={{ marginTop: 'auto', padding: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid var(--glass-border)' }}>
      Version 1.5.0
    </div>
  </nav>
);"""

new_nav = """const Navigation = ({ view, setView }) => {
  const { records, primaryLocation } = useApp();
  const currentLoc = window.location.href;
  const isPrimary = !primaryLocation || currentLoc === primaryLocation;

  return (
    <nav className="no-print side-nav">
      <div className="logo">POST STATS</div>
      <div className="nav-items">
        <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}><LayoutDashboard size={20}/> <span>แดชบอร์ด</span></button>
        <button className={view === 'entry' ? 'active' : ''} onClick={() => setView('entry')}><PlusCircle size={20}/> <span>บันทึกข้อมูล</span></button>
        <button className={view === 'history' ? 'active' : ''} onClick={() => setView('history')}><FileText size={20}/> <span>ประวัติ</span></button>
        <button className={view === 'reports' ? 'active' : ''} onClick={() => setView('reports')}><Printer size={20}/> <span>รายงาน</span></button>
        <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}><Settings size={20}/> <span>ตั้งค่า</span></button>
      </div>

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--glass-border)' }}>
        <div 
          className={`storage-origin-badge ${isPrimary ? 'primary' : 'warning'}`}
          onClick={() => !isPrimary && setView('settings')}
          title={isPrimary ? "คุณกำลังเปิดใช้งานบนฐานข้อมูลหลัก" : "คลิกเพื่อไปดูการตั้งค่าพิกัดฐานข้อมูล"}
        >
          <strong>
            {isPrimary ? <CheckCircle2 size={13} color="#10b981" /> : <AlertTriangle size={13} color="#ef4444" />}
            <span>{isPrimary ? 'ฐานข้อมูลหลัก' : 'นอกพิกัดหลัก!'}</span>
          </strong>
          <div style={{ opacity: 0.85 }}>
            {(records || []).length.toLocaleString()} รายการ
          </div>
        </div>

        <div className="nav-footer" style={{ padding: '0.6rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Version 1.5.0
        </div>
      </div>
    </nav>
  );
};"""

content = content.replace(old_nav, new_nav)

# Update AppContent to show persistent warning banner if not primary
old_app_content = """const AppContent = () => {
  const [view, setView] = useState('dashboard');

  return (
    <div className="app-layout">
      <Navigation view={view} setView={setView} />
      <main className="app-content">
        {view === 'dashboard' && <Dashboard setView={setView} />}
        {view === 'entry' && <DataEntry />}
        {view === 'settings' && (
          <div className="fade-in">
            <h1 style={{ marginBottom: '2rem' }}>การตั้งค่า</h1>
            <ServicesManager />
            <CompaniesManager />
            <BackupManager />
          </div>
        )}
        {view === 'history' && <History />}
        {view === 'reports' && <Reports setView={setView} />}
      </main>
    </div>
  );
};"""

new_app_content = """const AppContent = () => {
  const { records, primaryLocation, primaryRecordCount, setAsPrimaryLocation } = useApp();
  const [view, setView] = useState('dashboard');
  const [dismissBanner, setDismissBanner] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const currentLoc = window.location.href;
  const isNonMainOrigin = Boolean(primaryLocation && currentLoc !== primaryLocation && !dismissBanner);

  const handleCopyPrimary = () => {
    if (primaryLocation) {
      navigator.clipboard.writeText(primaryLocation);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleSetCurrentAsMain = () => {
    if (window.confirm('คุณต้องการเปลี่ยนให้พิกัด/ไฟล์นี้เป็น "ฐานข้อมูลหลัก" แทนใช่หรือไม่?')) {
      setAsPrimaryLocation(currentLoc);
      alert('ตั้งค่าพิกัดปัจจุบันเป็นฐานข้อมูลหลักเรียบร้อยแล้ว!');
    }
  };

  return (
    <div className="app-layout">
      <Navigation view={view} setView={setView} />
      <main className="app-content">
        {/* Non-Main Origin Alert Banner */}
        {isNonMainOrigin && (
          <div className="non-main-origin-banner">
            <div className="non-main-header">
              <ShieldAlert size={24} />
              <span>แจ้งเตือน: คุณกำลังเปิดแอปจากตำแหน่งที่ไม่ใช่ฐานข้อมูลหลัก!</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>
              เบราว์เซอร์จะแยกฐานข้อมูลออกตามที่อยู่ไฟล์ หากคุณบันทึกข้อมูลในหน้านี้ ข้อมูลจะไม่ถูกบันทึกรวมกับฐานข้อมูลหลัก และอาจทำให้ข้อมูลกระจัดกระจาย
            </p>
            <div className="non-main-details">
              <div>📍 <strong>ตำแหน่งที่เปิดอยู่นี้:</strong> <code>{currentLoc}</code> (พบข้อมูล: {(records || []).length.toLocaleString()} รายการ)</div>
              <div style={{ marginTop: '4px' }}>🎯 <strong>พิกัดฐานข้อมูลหลัก:</strong> <code>{primaryLocation}</code> (ข้อมูลหลัก: {primaryRecordCount.toLocaleString()} รายการ)</div>
            </div>
            <div className="non-main-actions">
              <button type="button" className="btn-origin-action" onClick={handleCopyPrimary}>
                <Copy size={15} /> {copiedLink ? 'คัดลอกลิงก์หลักแล้ว!' : 'คัดลอกลิงก์ฐานข้อมูลหลัก'}
              </button>
              <button type="button" className="btn-origin-action" onClick={handleSetCurrentAsMain}>
                <Check size={15} /> ตั้งค่าหน้านี้เป็นฐานข้อมูลหลักแทน
              </button>
              <button type="button" className="btn-origin-secondary" onClick={() => setView('settings')}>
                <Settings size={15} /> จัดการในหน้าตั้งค่า
              </button>
              <button type="button" className="btn-origin-secondary" onClick={() => setDismissBanner(true)} style={{ marginLeft: 'auto' }}>
                <X size={15} /> รับทราบและปิดเตือนชั่วคราว
              </button>
            </div>
          </div>
        )}

        {view === 'dashboard' && <Dashboard setView={setView} />}
        {view === 'entry' && <DataEntry />}
        {view === 'settings' && (
          <div className="fade-in">
            <h1 style={{ marginBottom: '2rem' }}>การตั้งค่า</h1>
            <StorageOriginManager />
            <ServicesManager />
            <CompaniesManager />
            <BackupManager />
          </div>
        )}
        {view === 'history' && <History />}
        {view === 'reports' && <Reports setView={setView} />}
      </main>
    </div>
  );
};"""

content = content.replace(old_app_content, new_app_content)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Origin warning patch applied successfully.")
