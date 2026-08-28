import re

# 1. Update App.css with Cloud Sync styles
css_addon = """
/* Cloud Sync & Firebase Styles */
.cloud-sync-card {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(14, 165, 233, 0.05) 100%);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.cloud-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 700;
}

.cloud-status-badge.online {
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.cloud-status-badge.offline {
  background: rgba(148, 163, 184, 0.15);
  color: #64748b;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

.cloud-sync-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
  margin-top: 1rem;
}

.cloud-action-box {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.cloud-guide-steps {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  font-size: 0.85rem;
  line-height: 1.6;
  margin-top: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.cloud-guide-steps ol {
  margin: 0.5rem 0 0 0;
  padding-left: 1.25rem;
}

.cloud-guide-steps li {
  margin-bottom: 4px;
}
"""

with open('src/App.css', 'r', encoding='utf-8') as f:
    css = f.read()

if '.cloud-sync-card' not in css:
    css += "\n" + css_addon
    with open('src/App.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("App.css updated with cloud sync styles.")

# 2. Update App.jsx
with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Import Firebase service functions
firebase_imports = """import { 
  getSavedFirebaseConfig, 
  saveFirebaseConfig, 
  testFirebaseConnection, 
  uploadDataToFirestore, 
  downloadDataFromFirestore, 
  getAutoSyncSetting, 
  setAutoSyncSetting,
  resetFirebaseApp
} from './services/firebase';
import { Cloud, CloudUpload, CloudDownload, CloudCheck, CloudOff } from 'lucide-react';
"""

if 'getSavedFirebaseConfig' not in content:
    content = firebase_imports + "\n" + content

# CloudSyncManager Component
cloud_sync_manager_code = """
const CloudSyncManager = () => {
  const { records, setRecords, companies, setCompanies, services, setServices, machineReadings, setMachineReadings } = useApp();
  const [configText, setConfigText] = useState(() => {
    const saved = getSavedFirebaseConfig();
    return saved ? JSON.stringify(saved, null, 2) : '';
  });
  const [isConfigured, setIsConfigured] = useState(() => Boolean(getSavedFirebaseConfig()));
  const [autoSync, setAutoSync] = useState(() => getAutoSyncSetting());
  const [statusMessage, setStatusMessage] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => localStorage.getItem('postage_last_cloud_sync') || '');

  // Helper to parse JSON or JS object from text
  const parseConfigInput = (input) => {
    if (!input || !input.trim()) return null;
    let text = input.trim();
    
    // If text contains 'apiKey', try to extract JSON-like object
    try {
      return JSON.parse(text);
    } catch (e) {
      // Try to extract object from JS code like 'const firebaseConfig = { ... };'
      try {
        const match = text.match(/\\{[\\s\\S]*\\}/);
        if (match) {
          const jsObj = new Function(`return ${match[0]}`)();
          if (jsObj && jsObj.apiKey && jsObj.projectId) {
            return jsObj;
          }
        }
      } catch (err) {}
    }
    return null;
  };

  const handleTestConnection = async () => {
    const config = parseConfigInput(configText);
    if (!config || !config.apiKey || !config.projectId) {
      alert('กรุณากรอก Firebase Config ให้ถูกต้อง (ต้องมี apiKey และ projectId)');
      return;
    }
    setIsTesting(true);
    setStatusMessage('กำลังทดสอบการเชื่อมต่อไปยัง Firebase Firestore...');
    try {
      const res = await testFirebaseConnection(config);
      if (res.success) {
        setStatusMessage('✅ ' + res.message);
        alert(res.message);
      } else {
        setStatusMessage('❌ ' + res.message);
        alert('เชื่อมต่อไม่สำเร็จ: ' + res.message);
      }
    } catch (e) {
      setStatusMessage('❌ ' + (e.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ'));
      alert('เกิดข้อผิดพลาด: ' + e.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = () => {
    const config = parseConfigInput(configText);
    if (!config || !config.apiKey || !config.projectId) {
      alert('กรุณากรอก Firebase Config ให้ถูกต้อง');
      return;
    }
    saveFirebaseConfig(config);
    resetFirebaseApp();
    setIsConfigured(true);
    setConfigText(JSON.stringify(config, null, 2));
    alert('บันทึก Firebase Config เรียบร้อยแล้ว! ระบบพร้อมเชื่อมต่อ Cloud Sync');
  };

  const handleDisconnect = () => {
    if (window.confirm('คุณต้องการยกเลิกการเชื่อมต่อ Firebase และกลับสู่โหมดในเครื่อง (ออฟไลน์) ใช่หรือไม่?')) {
      saveFirebaseConfig(null);
      resetFirebaseApp();
      setIsConfigured(false);
      setConfigText('');
      setStatusMessage('');
      alert('ยกเลิกการเชื่อมต่อ Firebase เรียบร้อยแล้ว แอปจะทำงานในโหมดในเครื่อง');
    }
  };

  const handleUploadAll = async () => {
    if (!isConfigured) {
      alert('กรุณาบันทึกการตั้งค่า Firebase ก่อน');
      return;
    }
    if (!window.confirm(`คุณต้องการอัปโหลดข้อมูลในเครื่องทั้งหมด (${(records || []).length} รายการ) ขึ้นคลาวด์ Firestore ใช่หรือไม่?`)) {
      return;
    }
    setIsSyncing(true);
    try {
      const res = await uploadDataToFirestore({ records, companies, services, machineReadings });
      const nowStr = new Date().toLocaleString('th-TH');
      localStorage.setItem('postage_last_cloud_sync', nowStr);
      setLastSyncTime(nowStr);
      alert(`🎉 ซิงค์ข้อมูลขึ้นคลาวด์สำเร็จเรียบร้อย! (${res.recordCount} รายการ) ข้อมูลออนไลน์พร้อมใช้งานจากทุกที่`);
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการซิงค์ข้อมูลขึ้นคลาวด์: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!isConfigured) {
      alert('กรุณาบันทึกการตั้งค่า Firebase ก่อน');
      return;
    }
    if (!window.confirm('คุณต้องการดึงข้อมูลจากคลาวด์ Firestore ลงมาในเครื่องใช่หรือไม่? (ข้อมูลในเครื่องจะถูกรวมและอัปเดตตามคลาวด์)')) {
      return;
    }
    setIsSyncing(true);
    try {
      const data = await downloadDataFromFirestore();
      if (!data.hasData) {
        alert('ยังไม่พบข้อมูลที่บันทึกไว้บนคลาวด์');
        return;
      }
      if (data.records && data.records.length > 0) {
        setRecords(data.records);
      }
      if (data.companies && data.companies.length > 0) {
        setCompanies(data.companies);
      }
      if (data.services && data.services.length > 0) {
        setServices(data.services);
      }
      if (data.machineReadings && data.machineReadings.length > 0) {
        setMachineReadings(data.machineReadings);
      }
      const nowStr = new Date().toLocaleString('th-TH');
      localStorage.setItem('postage_last_cloud_sync', nowStr);
      setLastSyncTime(nowStr);
      alert(`🎉 ดึงข้อมูลจากคลาวด์สำเร็จเรียบร้อย! (ได้รับ ${(data.records || []).length} รายการ)`);
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการดึงข้อมูลจากคลาวด์: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleAutoSync = (e) => {
    const val = e.target.checked;
    setAutoSync(val);
    setAutoSyncSetting(val);
  };

  return (
    <div className="glass-card cloud-sync-card">
      <div className="flex-between mb-4 flex-wrap gap-2">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Cloud size={24} color="#0284c7" />
          <span>การเชื่อมต่อคลาวด์ออนไลน์ (Firebase / Cloud Sync)</span>
        </h2>
        <span className={`cloud-status-badge ${isConfigured ? 'online' : 'offline'}`}>
          {isConfigured ? <CheckCircle2 size={14} /> : <CloudOff size={14} />}
          <span>{isConfigured ? '🟢 เชื่อมต่อคลาวด์สำเร็จ (พร้อมใช้งาน)' : '⚪ ใช้งานโหมดในเครื่อง (ออฟไลน์ 100%)'}</span>
        </span>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.6 }}>
        เชื่อมต่อฐานข้อมูล <strong>Google Firebase Firestore</strong> เพื่อซิงค์ข้อมูลให้ตรงกันทุกเครื่อง (มือถือ, โน้ตบุ๊ก, คอมพิวเตอร์) 
        และปลอดภัยสูงสุดด้วยระบบ <strong>Offline-First</strong> (แม้ไม่มีเน็ต ข้อมูลในเครื่องยังทำงานได้ตามปกติ 100%)
      </p>

      {/* Cloud Actions Panel */}
      {isConfigured && (
        <div className="cloud-sync-grid mb-6">
          <div className="cloud-action-box">
            <div>
              <strong style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#0284c7' }}>
                <CloudUpload size={18} />
                <span>ซิงค์ข้อมูลขึ้นคลาวด์ (Upload)</span>
              </strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '6px 0 12px' }}>
                นำข้อมูลทั้งหมดในเครื่องนี้ ({(records || []).length} รายการ) ส่งขึ้นคลาวด์เพื่อให้เครื่องอื่นเปิดดูได้ทันที
              </p>
            </div>
            <button 
              type="button" 
              className="btn btn-primary full" 
              onClick={handleUploadAll}
              disabled={isSyncing}
              style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}
            >
              {isSyncing ? 'กำลังซิงค์...' : '⬆️ ซิงค์ข้อมูลขึ้นคลาวด์เดี๋ยวนี้'}
            </button>
          </div>

          <div className="cloud-action-box">
            <div>
              <strong style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
                <CloudDownload size={18} />
                <span>ดึงข้อมูลจากคลาวด์ (Download)</span>
              </strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '6px 0 12px' }}>
                ดึงข้อมูลล่าสุดจากคลาวด์ลงมาอัปเดตในเครื่องนี้ (สำหรับเครื่องใหม่ หรือเมื่อเริ่มใช้งานวันใหม่)
              </p>
            </div>
            <button 
              type="button" 
              className="btn btn-secondary full" 
              onClick={handleDownloadAll}
              disabled={isSyncing}
            >
              {isSyncing ? 'กำลังดึงข้อมูล...' : '⬇️ ดึงข้อมูลล่าสุดจากคลาวด์'}
            </button>
          </div>
        </div>
      )}

      {/* Last Sync Info */}
      {lastSyncTime && (
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          🕒 ซิงค์ข้อมูลล่าสุดเมื่อ: <strong>{lastSyncTime}</strong>
        </div>
      )}

      {/* Firebase Config Editor */}
      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
        <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
          วาง Firebase Config จาก Firebase Console:
        </label>
        <textarea 
          rows={6} 
          className="input-select full" 
          style={{ fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.5, resize: 'vertical' }}
          placeholder={`ตัวอย่าง (วางทั้งบล็อกได้เลย):
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456...",
  appId: "1:123456:web:abcdef..."
};`}
          value={configText}
          onChange={e => setConfigText(e.target.value)}
        />

        {statusMessage && (
          <div style={{ marginTop: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
            {statusMessage}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handleTestConnection}
            disabled={isTesting}
          >
            {isTesting ? 'กำลังทดสอบ...' : '🔌 ทดสอบการเชื่อมต่อ'}
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleSaveConfig}
          >
            <Save size={16} /> บันทึกการเชื่อมต่อ
          </button>
          {isConfigured && (
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleDisconnect}
              style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
            >
              ยกเลิกการเชื่อมต่อ
            </button>
          )}
        </div>
      </div>

      {/* Guide Steps */}
      <div className="cloud-guide-steps">
        <strong>💡 วิธีรับ Firebase Config ฟรี (ทำครั้งเดียวใช้ได้ตลอดไป):</strong>
        <ol>
          <li>เปิดเว็บไซต์ <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>console.firebase.google.com</a> แล้วกด <strong>"Add project"</strong></li>
          <li>ไปที่เมนู <strong>Cloud Firestore</strong> กด <strong>"Create database"</strong> (เลือก Start in test mode)</li>
          <li>ไปที่ <strong>Project settings (รูปฟันเฟือง)</strong> &gt; ด้านล่างเลือก <strong>Web App (&lt;/&gt;)</strong> &gt; ก็อปปี้โค้ด `firebaseConfig` มาวางในช่องด้านบนแล้วกด "บันทึก" ได้ทันทีครับ</li>
        </ol>
      </div>
    </div>
  );
};
"""

content = content.replace("const StorageOriginManager = () => {", cloud_sync_manager_code + "\nconst StorageOriginManager = () => {")

# Add CloudSyncManager into Settings view in AppContent
content = content.replace(
    "<StorageOriginManager />",
    "<CloudSyncManager />\n            <StorageOriginManager />"
)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Firebase UI patch applied successfully.")
