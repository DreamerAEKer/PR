import { 
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

import React, { useState, useMemo, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LayoutDashboard, Settings, FileText, PlusCircle, Printer, Trash2, ChevronLeft, ChevronRight, Save, Edit2, Check, X, Download, Upload, ChevronUp, ChevronDown, ArrowRightLeft, Building2, Sparkles, Star, Search, RefreshCw, CheckCircle2, Calculator, MinusCircle, AlertTriangle, AlertCircle, Calendar, Info, ShieldAlert, Copy, ExternalLink, HardDrive } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subDays, isWeekend } from 'date-fns';
import { th } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import './App.css';

const THAI_HOLIDAYS_2026 = [
  '2026-01-01', '2026-03-03', '2026-04-06', '2026-04-13', '2026-04-14', '2026-04-15',
  '2026-05-01', '2026-05-04', '2026-05-31', '2026-06-03', '2026-07-28', '2026-07-29', 
  '2026-07-30', '2026-08-12', '2026-10-13', '2026-10-23', '2026-12-05', '2026-12-10', '2026-12-31'
];

// Safe arithmetic evaluator for inputs like '246-90' or '6*15' or '18+30+24'
const evaluateMathExpression = (expr) => {
  if (expr === null || expr === undefined) return '';
  const str = String(expr).trim();
  if (!str) return '';
  // Check if string contains math operators (+, -, *, /)
  if (/^[0-9\.\s\+\-\*/()]+$/.test(str) && /[\+\-\*/]/.test(str)) {
    try {
      const fn = new Function(`return (${str})`);
      const res = fn();
      if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
        return res >= 0 ? Number(res.toFixed(2)) : 0;
      }
    } catch (e) {
      // Ignore evaluation errors
    }
  }
  return str;
};

// Defensive Utility: Safe Date Formatting
const safeFormat = (date, formatStr, options) => {
  try {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    
    let formatted = format(d, formatStr, options);
    
    // Convert to Buddhist Era if Thai locale is used
    if (options?.locale?.code === 'th') {
      const yearAD = d.getFullYear();
      const yearBE = yearAD + 543;
      
      if (formatStr.includes('yyyy')) {
        formatted = formatted.replace(yearAD.toString(), yearBE.toString());
      } else if (formatStr.includes('yy')) {
        const ad2 = yearAD.toString().slice(-2);
        const be2 = yearBE.toString().slice(-2);
        formatted = formatted.replace(ad2, be2);
      }
    }
    
    return formatted;
  } catch (e) {
    console.error('Date formatting error:', e);
    return '-';
  }
};

// Historical records may use the company's old canonical ID (for example
// "h0128"), while an imported company list may have generated a different ID
// but retained code "H0128". Match both fields without changing stored data.
const normalizeCompanyIdentity = (value) => String(value ?? '').trim().toLowerCase();

// Legacy company IDs found in the March data. These companies were later
// assigned their permanent account codes, while the saved records kept the
// original generated IDs.
const LEGACY_COMPANY_ID_ALIASES = {
  c1: 'h0128',
  '1775098076870': 'h0267',
  '1775098473120': 'h0130',
  '1775100472116': 'h0032',
};

const canonicalCompanyIdentity = (value) => {
  const key = normalizeCompanyIdentity(value);
  return LEGACY_COMPANY_ID_ALIASES[key] || key;
};

const companyMatchesRecordId = (company, recordCompanyId) => {
  if (!company) return false;
  const recordKey = canonicalCompanyIdentity(recordCompanyId);
  return canonicalCompanyIdentity(company.id) === recordKey ||
    canonicalCompanyIdentity(company.code) === recordKey;
};

const findCompanyForRecord = (companies, recordCompanyId) =>
  companies.find(company => companyMatchesRecordId(company, recordCompanyId));

// First published rate per item, used only as an anomaly screen. A value below
// this threshold is unusual, but can still be accepted for a legitimate
// discount or special-rate transaction.
const SERVICE_MINIMUM_RATES = {
  '41010401': 5,
  '41010411': 8,
  '41010421': 18,
  '41010431': 35,
  '41010501': 15,
  '41010511': 80,
  '41010521': 95,
  '41010601': 25,
  '41010611': 40,
  '41010701': 550,
  '41010711': 600,
  '41010801': 35,
  '41010901': 650,
  '41010402': 4,
  '41010403': 5,
  '41010502': 15,
  '41010503': 15,
  '41010721': 140,
  'ECO01': 23,
  'EPK01': 339,
};

const getRateAnomaly = (services, serviceId, countValue, amountValue) => {
  const service = services.find(item => String(item.id) === String(serviceId));
  const minimumRate = service ? SERVICE_MINIMUM_RATES[String(service.code || '').toUpperCase()] : null;
  const count = Number(countValue);
  const amount = Number(amountValue);
  if (!minimumRate || !Number.isFinite(count) || count <= 0 || !Number.isFinite(amount) || amount <= 0) return null;

  const minimumTotal = count * minimumRate;
  if (amount >= minimumTotal) return null;
  return {
    service,
    minimumRate,
    minimumTotal,
    amount,
    difference: minimumTotal - amount,
  };
};

const PAIRED_SERVICE_CODES = {
  '41010401': '41010501', '41010501': '41010401',
  '41010421': '41010511', '41010511': '41010421',
  '41010431': '41010521', '41010521': '41010431',
  '41010601': '41010701', '41010701': '41010601',
  '41010611': '41010711', '41010711': '41010611',
  '41010801': '41010901', '41010901': '41010801',
  '41010402': '41010502', '41010502': '41010402',
  '41010403': '41010503', '41010503': '41010403',
};

const getPairedService = (services, service) => {
  const pairedCode = service && PAIRED_SERVICE_CODES[String(service.code || '').toUpperCase()];
  return pairedCode ? services.find(item => String(item.code || '').toUpperCase() === pairedCode) : null;
};

const getPreviousWorkDay = (date) => {
  try {
    let target = subDays(date, 1);
    let iterations = 0;
    while (iterations < 10 && (isWeekend(target) || THAI_HOLIDAYS_2026.includes(format(target, 'yyyy-MM-dd')))) {
      target = target.getDay() === 0 ? subDays(target, 2) : subDays(target, 1);
      iterations++;
    }
    return target;
  } catch (e) {
    return subDays(date, 1);
  }
};

const getSmartDefaultDate = () => {
  try {
    const today = new Date();
    let target = subDays(today, 1);
    let iterations = 0;
    while (iterations < 10 && (isWeekend(target) || THAI_HOLIDAYS_2026.includes(format(target, 'yyyy-MM-dd')))) {
      target = subDays(target, 1);
      iterations++;
    }
    return format(target, 'yyyy-MM-dd');
  } catch (e) {
    return format(new Date(), 'yyyy-MM-dd');
  }
};

// Subcomponents
const ThaiDatePicker = ({ value, onChange }) => {
  let dateObj = new Date();
  if (value) {
    const parts = value.split('-');
    if (parts.length === 3) {
      dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
  }

  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1;
  const yearBE = dateObj.getFullYear() + 543;

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    { value: 1, name: 'ม.ค.' },
    { value: 2, name: 'ก.พ.' },
    { value: 3, name: 'มี.ค.' },
    { value: 4, name: 'เม.ย.' },
    { value: 5, name: 'พ.ค.' },
    { value: 6, name: 'มิ.ย.' },
    { value: 7, name: 'ก.ค.' },
    { value: 8, name: 'ส.ค.' },
    { value: 9, name: 'ก.ย.' },
    { value: 10, name: 'ต.ค.' },
    { value: 11, name: 'พ.ย.' },
    { value: 12, name: 'ธ.ค.' }
  ];
  const years = Array.from({ length: 15 }, (_, i) => 2565 + i);

  const handleDateChange = (newDay, newMonth, newYearBE) => {
    const yearAD = newYearBE - 543;
    const formatted = `${yearAD}-${String(newMonth).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
    onChange(formatted);
  };

  return (
    <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
      <select 
        value={day} 
        onChange={e => handleDateChange(Number(e.target.value), month, yearBE)}
        className="input-select"
        style={{ padding: '6px 8px', minWidth: '60px', width: 'auto', border: '1px solid var(--glass-border)', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}
      >
        {days.map(d => <option key={d} value={d} style={{ background: 'var(--card-bg, #1e1e2e)' }}>{d}</option>)}
      </select>
      <select 
        value={month} 
        onChange={e => handleDateChange(day, Number(e.target.value), yearBE)}
        className="input-select"
        style={{ padding: '6px 8px', minWidth: '75px', width: 'auto', border: '1px solid var(--glass-border)', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}
      >
        {months.map(m => <option key={m.value} value={m.value} style={{ background: 'var(--card-bg, #1e1e2e)' }}>{m.name}</option>)}
      </select>
      <select 
        value={yearBE} 
        onChange={e => handleDateChange(day, month, Number(e.target.value))}
        className="input-select"
        style={{ padding: '6px 8px', minWidth: '85px', width: 'auto', border: '1px solid var(--glass-border)', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}
      >
        {years.map(y => <option key={y} value={y} style={{ background: 'var(--card-bg, #1e1e2e)' }}>{y}</option>)}
      </select>
    </div>
  );
};

const ThaiMonthPicker = ({ value, onChange }) => {
  let dateObj = new Date();
  if (value) {
    const parts = value.split('-');
    if (parts.length === 2) {
      dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    }
  }

  const month = dateObj.getMonth() + 1;
  const yearBE = dateObj.getFullYear() + 543;

  const months = [
    { value: 1, name: 'ม.ค.' },
    { value: 2, name: 'ก.พ.' },
    { value: 3, name: 'มี.ค.' },
    { value: 4, name: 'เม.ย.' },
    { value: 5, name: 'พ.ค.' },
    { value: 6, name: 'มิ.ย.' },
    { value: 7, name: 'ก.ค.' },
    { value: 8, name: 'ส.ค.' },
    { value: 9, name: 'ก.ย.' },
    { value: 10, name: 'ต.ค.' },
    { value: 11, name: 'พ.ย.' },
    { value: 12, name: 'ธ.ค.' }
  ];
  const years = Array.from({ length: 15 }, (_, i) => 2565 + i);

  const handleMonthChange = (newMonth, newYearBE) => {
    const yearAD = newYearBE - 543;
    const formatted = `${yearAD}-${String(newMonth).padStart(2, '0')}`;
    onChange(formatted);
  };

  return (
    <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
      <select 
        value={month} 
        onChange={e => handleMonthChange(Number(e.target.value), yearBE)}
        className="input-select"
        style={{ padding: '6px 8px', minWidth: '75px', width: 'auto', border: '1px solid var(--glass-border)', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}
      >
        {months.map(m => <option key={m.value} value={m.value} style={{ background: 'var(--card-bg, #1e1e2e)' }}>{m.name}</option>)}
      </select>
      <select 
        value={yearBE} 
        onChange={e => handleMonthChange(month, Number(e.target.value))}
        className="input-select"
        style={{ padding: '6px 8px', minWidth: '85px', width: 'auto', border: '1px solid var(--glass-border)', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}
      >
        {years.map(y => <option key={y} value={y} style={{ background: 'var(--card-bg, #1e1e2e)' }}>{y}</option>)}
      </select>
    </div>
  );
};

const ServicesManager = () => {
  const { services, setServices, updateService } = useApp();
  const [newService, setNewService] = useState({ name: '', code: '', category: 'domestic', isQuickSelect: false });
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  const add = () => {
    if (!newService.name || !newService.code) return;
    setServices([...services, { ...newService, id: Date.now().toString() }]);
    setNewService({ name: '', code: '', category: 'domestic', isQuickSelect: false });
  };

  const remove = (id) => setServices(services.filter(s => s.id !== id));

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditValues(s);
  };

  const saveEdit = () => {
    updateService(editingId, editValues);
    setEditingId(null);
  };

  return (
    <div className="glass-card">
      <h2 style={{ marginBottom: '1rem' }}>จัดการบริการไปรษณีย์</h2>
      <div className="flex-form">
        <input placeholder="ชื่อบริการ" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} />
        <input placeholder="รหัสบัญชี (CA POS)" value={newService.code} onChange={e => setNewService({...newService, code: e.target.value})} />
        <select value={newService.category} onChange={e => setNewService({...newService, category: e.target.value})} className="input-select">
          <option value="domestic">ในประเทศ</option>
          <option value="international">ระหว่างประเทศ</option>
        </select>
        <label className="quick-select-create-option">
          <input
            type="checkbox"
            checked={newService.isQuickSelect}
            onChange={e => setNewService({ ...newService, isQuickSelect: e.target.checked })}
          />
          แสดงเป็นปุ่มด่วน
        </label>
        <button className="btn btn-primary" onClick={add}><PlusCircle size={18}/> เพิ่ม</button>
      </div>
      
      <div className="scroll-x mt-8">
        <table className="grid-entry-table">
          <thead>
            <tr>
              <th>ประเภท</th>
              <th>รหัส</th>
              <th>ชื่อบริการ</th>
              <th style={{ width: '120px' }}>ปุ่มด่วน</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {services.map(s => (
              <tr key={s.id}>
                {editingId === s.id ? (
                  <>
                    <td>
                      <select value={editValues.category} onChange={e => setEditValues({...editValues, category: e.target.value})} className="input-select compact">
                        <option value="domestic">ในประเทศ</option>
                        <option value="international">ระหว่างประเทศ</option>
                      </select>
                    </td>
                    <td><input value={editValues.code} onChange={e => setEditValues({...editValues, code: e.target.value})} /></td>
                    <td><input value={editValues.name} onChange={e => setEditValues({...editValues, name: e.target.value})} /></td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(editValues.isQuickSelect)}
                        onChange={e => setEditValues({ ...editValues, isQuickSelect: e.target.checked })}
                        aria-label="แสดงเป็นปุ่มด่วน"
                      />
                    </td>
                    <td className="actions">
                      <button className="btn-icon" onClick={saveEdit}><Check size={16} color="#10b981" /></button>
                      <button className="btn-icon" onClick={() => setEditingId(null)}><X size={16} color="#ef4444" /></button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{s.category === 'domestic' ? 'ในประเทศ' : 'ต่างประเทศ'}</td>
                    <td>{s.code}</td>
                    <td style={{ textAlign: 'left' }}>{s.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <label className="quick-select-toggle" title={s.isQuickSelect ? 'แสดงเป็นปุ่มด่วนอยู่' : 'อยู่ในเมนูบริการอื่น ๆ'}>
                        <input
                          type="checkbox"
                          checked={Boolean(s.isQuickSelect)}
                          onChange={e => updateService(s.id, { isQuickSelect: e.target.checked })}
                        />
                        <span>{s.isQuickSelect ? 'แสดง' : 'ซ่อน'}</span>
                      </label>
                    </td>
                    <td className="actions">
                      <button className="btn-icon" onClick={() => startEdit(s)}><Edit2 size={16} /></button>
                      <button className="btn-icon" onClick={() => { if (window.confirm('คุณต้องการลบประเภทบริการนี้ใช่หรือไม่?')) { remove(s.id); } }}><Trash2 size={16} color="#ef4444" /></button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CompaniesManager = () => {
  const { companies, setCompanies, updateCompany, reorderCompaniesByCode, moveCompany } = useApp();
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [newCompany, setNewCompany] = useState({ name: '', code: '', showInEntry: true, showInReport: true, isQuickSelect: true });

  const add = () => {
    if (!newCompany.name) return;
    const maxOrder = companies.length > 0 ? Math.max(...companies.map(c => c.order || 0)) : 0;
    setCompanies([...companies, { ...newCompany, id: Date.now().toString(), order: maxOrder + 1 }]);
    setNewCompany({ name: '', code: '', showInEntry: true, showInReport: true, isQuickSelect: true });
  };

  const remove = (id) => setCompanies(companies.filter(c => c.id !== id));

  const move = (id, direction) => {
    moveCompany(id, direction);
  };

  const handleSortByCode = () => {
    if (window.confirm('คุณต้องการเรียงลำดับบริษัทตามเลขที่รหัสรหัสอนุญาตใหม่ทั้งหมดใช่หรือไม่? (ลำดับที่คุณเลื่อนมือไว้จะถูกรีเซ็ต)')) {
      reorderCompaniesByCode();
    }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditValues(c);
  };

  const saveEdit = () => {
    updateCompany(editingId, editValues);
    setEditingId(null);
  };

  return (
    <div className="glass-card mt-8">
      <div className="flex-between mb-4">
        <h2 style={{ marginBottom: 0 }}>จัดการบริษัทลูกค้า</h2>
        <button className="btn btn-secondary" onClick={handleSortByCode}>เรียงตามเลขที่</button>
      </div>
      <div className="flex-form">
        <input placeholder="รหัสบริษัท (ถ้ามี)" value={newCompany.code} onChange={e => setNewCompany({...newCompany, code: e.target.value})} />
        <input placeholder="ชื่อบริษัท" value={newCompany.name} onChange={e => setNewCompany({...newCompany, name: e.target.value})} style={{ flex: 2 }} />
        <button className="btn btn-primary" onClick={add}><PlusCircle size={18}/> เพิ่ม</button>
      </div>
      
      <div className="scroll-x mt-6">
        <table className="grid-entry-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>ปุ่มด่วน</th>
              <th style={{ width: '60px' }}>บันทึก</th>
              <th style={{ width: '60px' }}>รายงาน</th>
              <th style={{ width: '100px' }}>รหัส</th>
              <th>ชื่อบริษัทลูกค้า</th>
              <th style={{ width: '120px' }}>ลำดับ</th>
              <th style={{ width: '100px' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {[...companies].sort((a,b) => (a.order || 0) - (b.order || 0)).map((c, idx) => (
              <tr key={c.id}>
                {editingId === c.id ? (
                  <>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={editValues.isQuickSelect ?? true} 
                        onChange={e => setEditValues({...editValues, isQuickSelect: e.target.checked})} 
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={editValues.showInEntry} 
                        onChange={e => setEditValues({...editValues, showInEntry: e.target.checked})} 
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={editValues.showInReport} 
                        onChange={e => setEditValues({...editValues, showInReport: e.target.checked})} 
                      />
                    </td>
                    <td><input value={editValues.code || ''} onChange={e => setEditValues({...editValues, code: e.target.value})} className="compact" /></td>
                    <td><input value={editValues.name} onChange={e => setEditValues({...editValues, name: e.target.value})} className="compact full" /></td>
                    <td className="actions" style={{ justifyContent: 'center' }}>-</td>
                    <td className="actions">
                      <button className="btn-icon" onClick={saveEdit}><Check size={16} color="#10b981" /></button>
                      <button className="btn-icon" onClick={() => setEditingId(null)}><X size={16} color="#ef4444" /></button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={c.isQuickSelect ?? true} 
                        onChange={e => updateCompany(c.id, { isQuickSelect: e.target.checked })} 
                        title="แสดงในแถบปุ่มเลือกด่วน"
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={c.showInEntry} 
                        onChange={e => updateCompany(c.id, { showInEntry: e.target.checked })} 
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={c.showInReport} 
                        onChange={e => updateCompany(c.id, { showInReport: e.target.checked })} 
                      />
                    </td>
                    <td>{c.code || '-'}</td>
                    <td style={{ textAlign: 'left' }}>{c.name}</td>
                    <td className="actions" style={{ justifyContent: 'center' }}>
                      <button className="btn-icon" onClick={() => move(c.id, 'up')} disabled={idx === 0} style={{ opacity: idx === 0 ? 0.2 : 1 }}><ChevronUp size={18} /></button>
                      <button className="btn-icon" onClick={() => move(c.id, 'down')} disabled={idx === companies.length - 1} style={{ opacity: idx === companies.length - 1 ? 0.2 : 1 }}><ChevronDown size={18} /></button>
                    </td>
                    <td className="actions">
                      <button className="btn-icon" onClick={() => startEdit(c)}><Edit2 size={16} /></button>
                      <button className="btn-icon" onClick={() => { if (window.confirm('คุณต้องการลบรายละเอียดบริษัทนี้ใช่หรือไม่?')) { remove(c.id); } }}><Trash2 size={16} color="#ef4444" /></button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { records, services, companies } = useApp();
  
  // States for filters
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'quarterly'
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#6366f1', '#f43f5e', '#8b5cf6', '#06b6d4', '#475569'];

  const stats = useMemo(() => {
    // 1. Determine Current & Comparison Periods
    let currentPeriodRecords = [];
    let prevPeriodRecords = [];
    let periodLabel = '';

    if (viewMode === 'monthly') {
      const [year, month] = selectedMonth.split('-').map(Number);
      const previousMonth = new Date(year, month - 2, 1);
      const prevMonthStr = format(previousMonth, 'yyyy-MM');
      
      currentPeriodRecords = (records || []).filter(r => r.date && r.date.startsWith(selectedMonth));
      prevPeriodRecords = (records || []).filter(r => r.date && r.date.startsWith(prevMonthStr));
      periodLabel = `เทียบกับ ${safeFormat(previousMonth, 'MMMM yyyy', { locale: th })}`;
    } else {
      const qMonths = [(selectedQuarter - 1) * 3, (selectedQuarter - 1) * 3 + 1, (selectedQuarter - 1) * 3 + 2];
      const previousQuarter = selectedQuarter === 1 ? 4 : selectedQuarter - 1;
      const previousQuarterYear = selectedQuarter === 1 ? selectedYear - 1 : selectedYear;
      const previousQMonths = [(previousQuarter - 1) * 3, (previousQuarter - 1) * 3 + 1, (previousQuarter - 1) * 3 + 2];
      
      currentPeriodRecords = (records || []).filter(r => {
        const d = new Date(r.date);
        return d.getFullYear() === selectedYear && qMonths.includes(d.getMonth());
      });
      prevPeriodRecords = (records || []).filter(r => {
        const d = new Date(r.date);
        return d.getFullYear() === previousQuarterYear && previousQMonths.includes(d.getMonth());
      });
      periodLabel = `เทียบกับ Q${previousQuarter} ${previousQuarterYear + 543}`;
    }

    // 2. Filter by Company
    if (selectedCompany !== 'all') {
      const company = companies.find(c => String(c.id) === String(selectedCompany));
      currentPeriodRecords = currentPeriodRecords.filter(r => companyMatchesRecordId(company, r.companyId));
      prevPeriodRecords = prevPeriodRecords.filter(r => companyMatchesRecordId(company, r.companyId));
    }

    if (selectedCategory !== 'all') {
      const serviceIds = new Set(services.filter(service => service.category === selectedCategory).map(service => service.id));
      currentPeriodRecords = currentPeriodRecords.filter(r => serviceIds.has(r.serviceId));
      prevPeriodRecords = prevPeriodRecords.filter(r => serviceIds.has(r.serviceId));
    }

    // 3. Calculate Totals & Growth
    const curTotalCount = currentPeriodRecords.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
    const curTotalAmount = currentPeriodRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    
    const prevTotalCount = prevPeriodRecords.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
    const prevTotalAmount = prevPeriodRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const calcGrowth = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    // 4. Top Performers (Current Period)
    const serviceMap = {};
    currentPeriodRecords.forEach(r => {
      serviceMap[r.serviceId] = (serviceMap[r.serviceId] || 0) + Number(r.amount);
    });
    const topServiceId = Object.keys(serviceMap).sort((a, b) => serviceMap[b] - serviceMap[a])[0];
    const topServiceName = services.find(s => s.id === topServiceId)?.name || '-';

    const companyMap = {};
    currentPeriodRecords.forEach(r => {
      const companyKey = canonicalCompanyIdentity(r.companyId);
      companyMap[companyKey] = (companyMap[companyKey] || 0) + Number(r.amount);
    });
    const topCompanyId = Object.keys(companyMap).sort((a, b) => companyMap[b] - companyMap[a])[0];
    const topCompanyName = findCompanyForRecord(companies, topCompanyId)?.name || '-';

    const activeCompanyIds = new Set(currentPeriodRecords.map(r => canonicalCompanyIdentity(r.companyId)));
    const averagePerPiece = curTotalCount > 0 ? curTotalAmount / curTotalCount : 0;
    const anomalyRecords = currentPeriodRecords.filter(r =>
      r.rateAnomalyConfirmed || getRateAnomaly(services, r.serviceId, r.count, r.amount)
    );

    const companyRanking = Object.entries(companyMap)
      .map(([companyId, amount]) => {
        const companyRecords = currentPeriodRecords.filter(r => canonicalCompanyIdentity(r.companyId) === canonicalCompanyIdentity(companyId));
        return {
          companyId,
          name: findCompanyForRecord(companies, companyId)?.name || 'ไม่ทราบบริษัท',
          amount,
          count: companyRecords.reduce((sum, r) => sum + (Number(r.count) || 0), 0),
          share: curTotalAmount > 0 ? (amount / curTotalAmount) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const categorySummary = ['domestic', 'international'].map(category => {
      const ids = new Set(services.filter(service => service.category === category).map(service => service.id));
      const categoryRecords = currentPeriodRecords.filter(r => ids.has(r.serviceId));
      return {
        category,
        count: categoryRecords.reduce((sum, r) => sum + (Number(r.count) || 0), 0),
        amount: categoryRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
      };
    });

    const missingMachineCompanies = companies.filter(company => {
      const companyRecords = currentPeriodRecords.filter(r => companyMatchesRecordId(company, r.companyId));
      if (companyRecords.length === 0) return false;
      const lastDate = companyRecords.reduce((latest, r) => r.date > latest ? r.date : latest, companyRecords[0].date);
      return !companyRecords.some(r => r.date === lastDate && r.machineRemaining != null && r.machineAccumulated != null);
    });

    // 5. Daily/Monthly Trend Data
    let trendData = [];
    if (viewMode === 'monthly') {
      const [year, month] = selectedMonth.split('-').map(Number);
      const dateRange = eachDayOfInterval({ 
        start: startOfMonth(new Date(year, month - 1)), 
        end: endOfMonth(new Date(year, month - 1)) 
      });
      trendData = dateRange.map(day => {
        const dStr = format(day, 'yyyy-MM-dd');
        return {
          name: format(day, 'd'),
          ยอดเงิน: currentPeriodRecords.filter(r => r.date === dStr).reduce((sum, r) => sum + Number(r.amount), 0),
          ปีก่อน: prevPeriodRecords.filter(r => {
            const pd = new Date(r.date);
            return pd.getDate() === day.getDate();
          }).reduce((sum, r) => sum + Number(r.amount), 0)
        };
      });
    } else {
      const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const qMonths = [(selectedQuarter - 1) * 3, (selectedQuarter - 1) * 3 + 1, (selectedQuarter - 1) * 3 + 2];
      const previousQuarter = selectedQuarter === 1 ? 4 : selectedQuarter - 1;
      const previousQMonths = [(previousQuarter - 1) * 3, (previousQuarter - 1) * 3 + 1, (previousQuarter - 1) * 3 + 2];
      trendData = qMonths.map((mIdx, index) => {
        return {
          name: monthNames[mIdx],
          ปีนี้: currentPeriodRecords.filter(r => new Date(r.date).getMonth() === mIdx).reduce((sum, r) => sum + Number(r.amount), 0),
          ช่วงก่อน: prevPeriodRecords.filter(r => new Date(r.date).getMonth() === previousQMonths[index]).reduce((sum, r) => sum + Number(r.amount), 0)
        };
      });
    }

    // 6. Service Distribution (Current Period)
    const serviceDistribution = services.map(s => {
      const amount = currentPeriodRecords.filter(r => r.serviceId === s.id).reduce((sum, r) => sum + Number(r.amount), 0);
      return {
        name: s.name.length > 20 ? s.name.substring(0, 20) + '...' : s.name,
        value: amount
      };
    }).filter(d => d.value > 0).sort((a,b) => b.value - a.value);

    return { 
      totalCount: curTotalCount, 
      totalAmount: curTotalAmount, 
      countGrowth: calcGrowth(curTotalCount, prevTotalCount),
      amountGrowth: calcGrowth(curTotalAmount, prevTotalAmount),
      topServiceName, 
      topCompanyName, 
      trendData, 
      serviceDistribution,
      periodLabel,
      averagePerPiece,
      activeCompanyCount: activeCompanyIds.size,
      anomalyCount: anomalyRecords.length,
      missingMachineCount: missingMachineCompanies.length,
      companyRanking,
      categorySummary,
    };
  }, [records, services, companies, selectedMonth, selectedYear, selectedQuarter, selectedCompany, selectedCategory, viewMode]);

  return (
    <div className="fade-in dashboard-page">
      <div className="flex-between mb-8 dashboard-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <h1 style={{ margin: 0 }}>แดชบอร์ด</h1>
          <div className="view-mode-toggle">
            <button className={viewMode === 'monthly' ? 'active' : ''} onClick={() => setViewMode('monthly')}>รายเดือน</button>
            <button className={viewMode === 'quarterly' ? 'active' : ''} onClick={() => setViewMode('quarterly')}>รายไตรมาส</button>
          </div>
        </div>

        <div className="flex-form-controls">
          <select className="input-select" value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}>
            <option value="all">ทุกบริษัท</option>
            {companies
              .filter(c => records.some(r => companyMatchesRecordId(c, r.companyId)))
              .sort((a,b) => (a.order || 0) - (b.order || 0))
              .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
            }
          </select>

          <select className="input-select" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
            <option value="all">ทุกหมวดบริการ</option>
            <option value="domestic">📮 ในประเทศ</option>
            <option value="international">✈️ ระหว่างประเทศ</option>
          </select>
          
          {viewMode === 'monthly' ? (
            <ThaiMonthPicker value={selectedMonth} onChange={setSelectedMonth} />
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select className="input-select mini" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y + 543}</option>)}
              </select>
              <div className="quarter-selector">
                {[1, 2, 3, 4].map(q => (
                  <button key={q} className={selectedQuarter === q ? 'active' : ''} onClick={() => setSelectedQuarter(q)}>Q{q}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="stats-grid-4">
        <div className="glass-card stat-card-mini">
          <div className="flex-between">
            <span className="label">จำนวนชิ้นรวม</span>
            <span className={`growth-badge ${stats.countGrowth >= 0 ? 'up' : 'down'}`}>
              {stats.countGrowth >= 0 ? '+' : ''}{stats.countGrowth.toFixed(1)}%
            </span>
          </div>
          <span className="value">{stats.totalCount.toLocaleString()}</span>
          <span className="prev-info">{stats.periodLabel}</span>
        </div>
        
        <div className="glass-card stat-card-mini primary">
          <div className="flex-between">
            <span className="label">รายได้รวม</span>
            <span className={`growth-badge transparent ${stats.amountGrowth >= 0 ? 'up' : 'down'}`}>
              {stats.amountGrowth >= 0 ? '+' : ''}{stats.amountGrowth.toFixed(1)}%
            </span>
          </div>
          <span className="value">฿{stats.totalAmount.toLocaleString()}</span>
          <span className="prev-info">{stats.periodLabel}</span>
        </div>

        <div className="glass-card stat-card-mini success">
          <span className="label">บริการยอดนิยม</span>
          <span className="value-small">{stats.topServiceName}</span>
          <span className="prev-info">อิงตามรายได้ช่วงนี้</span>
        </div>

        <div className="glass-card stat-card-mini info">
          <span className="label">ลูกค้าใช้บริการสูงสุด</span>
          <span className="value-small">{stats.topCompanyName}</span>
          <span className="prev-info">อิงตามรายได้ช่วงนี้</span>
        </div>
      </div>

      <div className="manager-kpi-grid mt-8">
        <div className="glass-card manager-kpi">
          <span>รายได้เฉลี่ยต่อชิ้น</span>
          <strong>฿{stats.averagePerPiece.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          <small>ช่วยสังเกตความเปลี่ยนแปลงของประเภทงาน</small>
        </div>
        <div className="glass-card manager-kpi">
          <span>บริษัทที่มีรายการ</span>
          <strong>{stats.activeCompanyCount.toLocaleString()} แห่ง</strong>
          <small>ตามเงื่อนไขที่เลือก</small>
        </div>
        <div className={`glass-card manager-kpi ${stats.anomalyCount > 0 ? 'warning' : 'ok'}`}>
          <span>รายการควรตรวจสอบ</span>
          <strong>{stats.anomalyCount.toLocaleString()} รายการ</strong>
          <small>ยอดต่ำกว่าเรทเริ่มต้นหรือเคยยืนยันแล้ว</small>
        </div>
        <div className={`glass-card manager-kpi ${stats.missingMachineCount > 0 ? 'danger' : 'ok'}`}>
          <span>บริษัทยังขาดยอดเครื่อง</span>
          <strong>{stats.missingMachineCount.toLocaleString()} แห่ง</strong>
          <small>แถวบนและแถวล่างของวันล่าสุด</small>
        </div>
      </div>
      
      <div className="dashboard-grid-charts mt-8">
        <div className="glass-card chart-container">
          <h2 className="mb-6">{viewMode === 'monthly' ? 'แนวโน้มรายได้รายวัน' : 'ยอดเปรียบเทียบรายเดือนในไตรมาส'}</h2>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'monthly' ? (
                <LineChart data={stats.trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" fontSize={10} stroke="var(--text-muted)" />
                  <YAxis fontSize={10} stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px' }} />
                  <Line type="monotone" dataKey="ยอดเงิน" stroke="var(--primary)" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="ปีก่อน" stroke="rgba(255,255,255,0.2)" strokeDasharray="5 5" dot={false} />
                </LineChart>
              ) : (
                <BarChart data={stats.trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" fontSize={11} stroke="var(--text-muted)" />
                  <YAxis fontSize={11} stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px' }} />
                  <Bar dataKey="ปีนี้" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ช่วงก่อน" fill="rgba(255,255,255,0.2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card chart-container">
          <h2 className="mb-6">สัดส่วนตามประเภทบริการ</h2>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.serviceDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {stats.serviceDistribution.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => `฿${v.toLocaleString()}`} />
                <text x="50%" y="54%" textAnchor="middle" fill="var(--text-muted)" style={{ fontSize: '12px', fontWeight: 'bold' }}>รายได้รวม</text>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="manager-analysis-grid mt-8">
        <div className="glass-card">
          <h2 className="mb-6">ภาพรวมในประเทศ / ระหว่างประเทศ</h2>
          <div className="category-comparison-cards">
            {stats.categorySummary.map(item => (
              <div key={item.category} className={`category-comparison ${item.category}`}>
                <span>{item.category === 'domestic' ? '📮 ในประเทศ' : '✈️ ระหว่างประเทศ'}</span>
                <strong>฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                <small>{item.count.toLocaleString()} ชิ้น</small>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <h2 className="mb-6">อันดับบริษัทตามรายได้</h2>
          <div className="scroll-x manager-ranking-scroll">
            <table className="grid-entry-table compact-ranking">
              <thead>
                <tr><th>อันดับ</th><th style={{ textAlign: 'left' }}>บริษัท</th><th>ชิ้น</th><th>รายได้</th><th>สัดส่วน</th></tr>
              </thead>
              <tbody>
                {stats.companyRanking.slice(0, 10).map((item, index) => (
                  <tr key={item.companyId}>
                    <td>{index + 1}</td>
                    <td style={{ textAlign: 'left' }}>{item.name}</td>
                    <td>{item.count.toLocaleString()}</td>
                    <td className="num">฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>{item.share.toFixed(1)}%</td>
                  </tr>
                ))}
                {stats.companyRanking.length === 0 && <tr><td colSpan={5}>ไม่มีข้อมูลตามเงื่อนไขที่เลือก</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="glass-card mt-8">
        <h2 className="mb-6">สรุปข้อมูลรายบริการ ({viewMode === 'monthly' ? 'รายเดือน' : 'รายไตรมาส'})</h2>
        <div className="scroll-x">
          <table className="grid-entry-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>บริการ</th>
                <th>รหัส</th>
                <th>จำนวน (ชิ้น)</th>
                <th>ยอดเงิน (฿)</th>
                <th>สัดส่วน (%)</th>
              </tr>
            </thead>
            <tbody>
              {services.filter(s => selectedCategory === 'all' || s.category === selectedCategory).map(s => {
                let count = 0;
                let amount = 0;

                if (viewMode === 'monthly') {
                  const filtered = records.filter(r => 
                    r.date && r.date.startsWith(selectedMonth) && 
                    (selectedCompany === 'all' || companyMatchesRecordId(companies.find(c => String(c.id) === String(selectedCompany)), r.companyId)) &&
                    r.serviceId === s.id
                  );
                  count = filtered.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
                  amount = filtered.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                } else {
                  const qMonths = [(selectedQuarter - 1) * 3, (selectedQuarter - 1) * 3 + 1, (selectedQuarter - 1) * 3 + 2];
                  const filtered = records.filter(r => {
                    const d = new Date(r.date);
                    return d.getFullYear() === selectedYear && 
                           qMonths.includes(d.getMonth()) &&
                           (selectedCompany === 'all' || companyMatchesRecordId(companies.find(c => String(c.id) === String(selectedCompany)), r.companyId)) &&
                           r.serviceId === s.id;
                  });
                  count = filtered.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
                  amount = filtered.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                }
                   
                if (count === 0 && amount === 0) return null;
                const percentage = stats.totalAmount > 0 ? (amount / stats.totalAmount) * 100 : 0;
                
                return (
                  <tr key={s.id}>
                    <td style={{ textAlign: 'left' }}>{s.name}</td>
                    <td>{s.code}</td>
                    <td>{count.toLocaleString()}</td>
                    <td className="num">{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>{percentage.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 'bold' }}>
                <td colSpan={2}>รวมทั้งหมด (ตามเงื่อนไขที่เลือก)</td>
                <td>{stats.totalCount.toLocaleString()}</td>
                <td className="num">฿{stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

const thaiMonthLabel = period => {
  const [year, month] = period.split('-').map(Number);
  return new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
};

const DepartmentDashboard = ({ onChangeSource }) => {
  const months = monthlyDepartmentData.months || [];
  const [selectedPeriod, setSelectedPeriod] = useState(months.at(-1)?.period || '');
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedCompanyKey, setSelectedCompanyKey] = useState('all');
  const monthData = months.find(item => item.period === selectedPeriod) || months.at(-1);
  const previousMonth = months[months.findIndex(item => item.period === selectedPeriod) - 1];
  const companyKey = company => `${company.license}__${company.name}`;
  const companies = (monthData?.companies || [])
    .filter(company => selectedSector === 'all' || company.sector === selectedSector)
    .sort((a, b) => b.amount - a.amount);
  const selectedCompany = selectedCompanyKey === 'all'
    ? null
    : companies.find(company => companyKey(company) === selectedCompanyKey);

  const sectorField = (base, sector = selectedSector) => sector === 'private'
    ? `private${base}`
    : sector === 'government'
      ? `government${base}`
      : base.charAt(0).toLowerCase() + base.slice(1);
  const getServiceValue = (service, base) => Number(service?.[sectorField(base)] || 0);
  const serviceSummary = (monthData?.serviceSummary || [])
    .map(service => ({ ...service, viewCount: getServiceValue(service, 'Count'), viewAmount: getServiceValue(service, 'Amount') }))
    .filter(service => service.viewCount || service.viewAmount)
    .sort((a, b) => b.viewAmount - a.viewAmount);
  const sectorTotal = (base, data = monthData) => (data?.serviceSummary || [])
    .reduce((sum, service) => sum + Number(service?.[sectorField(base)] || 0), 0);
  const totalCount = selectedCompany ? Number(selectedCompany.count || 0) : sectorTotal('Count');
  const totalAmount = selectedCompany ? Number(selectedCompany.amount || 0) : sectorTotal('Amount');
  const previousCompany = selectedCompany && previousMonth?.companies?.find(company => companyKey(company) === selectedCompanyKey);
  const previousAmount = selectedCompany
    ? Number(previousCompany?.amount || 0)
    : sectorTotal('Amount', previousMonth);
  const growth = previousAmount ? ((totalAmount - previousAmount) / previousAmount) * 100 : 0;
  const average = totalCount ? totalAmount / totalCount : 0;
  const activeCompanies = selectedCompany ? 1 : companies.filter(company => company.amount > 0 || company.count > 0).length;
  const centerDeposit = selectedSector === 'all' || selectedSector === 'private' ? Number(monthData?.centerDepositAmount || 0) : 0;
  const centerShare = totalAmount ? (centerDeposit / totalAmount) * 100 : 0;
  const topService = serviceSummary[0];

  const monthlyTrend = months.map(item => {
    let amount;
    if (selectedCompany) {
      amount = Number(item.companies?.find(company => companyKey(company) === selectedCompanyKey)?.amount || 0);
    } else {
      amount = (item.serviceSummary || []).reduce((sum, service) => sum + Number(service?.[sectorField('Amount')] || 0), 0);
    }
    return { name: thaiMonthLabel(item.period).replace(/\s+\d+$/, ''), amount };
  });

  const alerts = [];
  if (previousMonth && growth <= -10) alerts.push(`รายได้ลดลง ${Math.abs(growth).toFixed(1)}% จากเดือนก่อน ควรตรวจลูกค้าหรือบริการที่ลดลง`);
  if (centerShare >= 20 && !selectedCompany) alerts.push(`รายได้จากศูนย์รับฝากคิดเป็น ${centerShare.toFixed(1)}% ของยอดที่เลือก ควรดูแยกจากยอดรายบริษัท`);
  if (!alerts.length) alerts.push('ยังไม่พบการเปลี่ยนแปลงที่เข้าเกณฑ์เตือนจากตัวกรองนี้');

  return (
    <div className="fade-in dashboard-page department-dashboard">
      <div className="dashboard-source-bar glass-card">
        <div>
          <strong>แหล่งข้อมูล: รายงานแผนกจาก Excel</strong>
          <small>อ่านจาก report 01–07.2026.xlsm โดยไม่ปนกับประวัติที่บันทึกในแอป</small>
        </div>
        <button className="secondary-btn" onClick={onChangeSource}>ดูข้อมูลที่บันทึกในแอป</button>
      </div>

      <div className="flex-between mb-8 dashboard-top">
        <div>
          <h1 style={{ margin: 0 }}>วิเคราะห์รายเดือนสำหรับหัวหน้าแผนก</h1>
          <p className="dashboard-subtitle">ภาพรวม เปรียบเทียบ และจุดที่ควรตรวจสอบ</p>
        </div>
        <div className="flex-form-controls department-filters">
          <label>เดือน
            <select className="input-select" value={selectedPeriod} onChange={event => { setSelectedPeriod(event.target.value); setSelectedCompanyKey('all'); }}>
              {months.map(item => <option key={item.period} value={item.period}>{thaiMonthLabel(item.period)}</option>)}
            </select>
          </label>
          <label>กลุ่มลูกค้า
            <select className="input-select" value={selectedSector} onChange={event => { setSelectedSector(event.target.value); setSelectedCompanyKey('all'); }}>
              <option value="all">ทั้งหมด</option>
              <option value="private">เอกชน</option>
              <option value="government">ราชการ</option>
            </select>
          </label>
          <label>บริษัท / หน่วยงาน
            <select className="input-select company-filter" value={selectedCompanyKey} onChange={event => setSelectedCompanyKey(event.target.value)}>
              <option value="all">ทั้งหมดในกลุ่มที่เลือก</option>
              {companies.map(company => <option key={companyKey(company)} value={companyKey(company)}>{company.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="stats-grid-4">
        <div className="glass-card stat-card-mini"><span className="label">จำนวนชิ้น</span><span className="value">{totalCount.toLocaleString()}</span><span className="prev-info">{thaiMonthLabel(selectedPeriod)}</span></div>
        <div className="glass-card stat-card-mini primary"><span className="label">รายได้รวม</span><span className="value">฿{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span><span className={`growth-badge ${growth >= 0 ? 'up' : 'down'}`}>{growth >= 0 ? '+' : ''}{growth.toFixed(1)}% จากเดือนก่อน</span></div>
        <div className="glass-card stat-card-mini success"><span className="label">รายได้เฉลี่ยต่อชิ้น</span><span className="value">฿{average.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><span className="prev-info">ใช้ดูการเปลี่ยนของประเภทงาน</span></div>
        <div className="glass-card stat-card-mini info"><span className="label">ลูกค้าที่มีรายการ</span><span className="value">{activeCompanies.toLocaleString()} แห่ง</span><span className="prev-info">บริการสูงสุด: {topService?.name || '-'}</span></div>
      </div>

      <div className={`manager-alert-panel glass-card mt-8 ${alerts.some(text => text.startsWith('ยังไม่พบ')) ? 'ok' : 'warning'}`}>
        <h2>สิ่งที่หัวหน้าควรทราบ</h2>
        <ul>{alerts.map(alert => <li key={alert}>{alert}</li>)}</ul>
      </div>

      <div className="dashboard-grid-charts mt-8">
        <div className="glass-card chart-container">
          <h2 className="mb-6">แนวโน้มรายได้ ม.ค.–ก.ค. 2569</h2>
          <div style={{ height: 320 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={value => `฿${Number(value).toLocaleString()}`} /><Bar dataKey="amount" name="รายได้" fill="var(--primary)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </div>
        <div className="glass-card chart-container">
          <h2 className="mb-6">สัดส่วนรายได้ตามบริการ</h2>
          <div style={{ height: 320 }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={serviceSummary.slice(0, 8)} dataKey="viewAmount" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>{serviceSummary.slice(0, 8).map((item, index) => <Cell key={item.name} fill={['#2563eb','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#64748b','#ec4899'][index]} />)}</Pie><Tooltip formatter={value => `฿${Number(value).toLocaleString()}`} /></PieChart></ResponsiveContainer></div>
          {selectedCompany && <small className="data-scope-note">ตารางบริการเป็นภาพรวมของกลุ่มลูกค้า เพราะไฟล์ Excel ไม่ได้แยกบริการรายบริษัทในชีตสรุป</small>}
        </div>
      </div>

      <div className="manager-analysis-grid mt-8">
        <div className="glass-card">
          <h2 className="mb-6">อันดับบริษัท / หน่วยงานตามรายได้</h2>
          <div className="scroll-x manager-ranking-scroll"><table className="grid-entry-table compact-ranking"><thead><tr><th>อันดับ</th><th style={{ textAlign: 'left' }}>บริษัท / หน่วยงาน</th><th>ชิ้น</th><th>รายได้</th><th>สัดส่วน</th></tr></thead><tbody>
            {companies.filter(company => company.amount > 0).slice(0, 15).map((company, index) => <tr key={companyKey(company)}><td>{index + 1}</td><td style={{ textAlign: 'left' }}>{company.name}</td><td>{Number(company.count).toLocaleString()}</td><td className="num">฿{Number(company.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td>{totalAmount ? ((company.amount / totalAmount) * 100).toFixed(1) : '0.0'}%</td></tr>)}
          </tbody></table></div>
        </div>
        <div className="glass-card">
          <h2 className="mb-6">รายละเอียดรายบริการ</h2>
          <div className="scroll-x manager-ranking-scroll"><table className="grid-entry-table compact-ranking"><thead><tr><th style={{ textAlign: 'left' }}>บริการ</th><th>ชิ้น</th><th>รายได้</th><th>บาท/ชิ้น</th></tr></thead><tbody>
            {serviceSummary.map(service => <tr key={service.name}><td style={{ textAlign: 'left' }}>{service.name}</td><td>{service.viewCount.toLocaleString()}</td><td className="num">฿{service.viewAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td>{service.viewCount ? (service.viewAmount / service.viewCount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td></tr>)}
          </tbody></table></div>
        </div>
      </div>
    </div>
  );
};

const SeparatedDepartmentDashboard = () => {
  const [source, setSource] = useState('department');
  if (source === 'department') return <DepartmentDashboard onChangeSource={() => setSource('app')} />;
  return (
    <div>
      <div className="dashboard-source-bar glass-card app-source-switch">
        <div><strong>แหล่งข้อมูล: รายการที่บันทึกในแอป</strong><small>ข้อมูลรายวันของบริษัทที่ผู้ใช้บันทึกไว้</small></div>
        <button className="secondary-btn" onClick={() => setSource('department')}>ดูรายงานแผนกจาก Excel</button>
      </div>
      <AppDataDashboard />
    </div>
  );
};

const DataEntry = () => {
  const { services, companies, records, addRecord, deleteSingleRecord, moveSingleRecord, moveDailyRecords, moveSingleRecordToCompany, moveDailyRecordsToCompany, navigationTarget, setNavigationTarget } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(getSmartDefaultDate());
  const [selectedCompany, setSelectedCompany] = useState(companies[0]?.id || '');
  const [activeCategory, setActiveCategory] = useState('domestic');
  const [formData, setFormData] = useState({ serviceId: '', count: '', amount: '', machineRemaining: '', machineMixed: '', topUpAmount: '', manualTopUp: false });
  const [subItems, setSubItems] = useState([]);
  const [showPreservedToast, setShowPreservedToast] = useState(false);
  const [preservedMessage, setPreservedMessage] = useState('');
  const [reassignModal, setReassignModal] = useState({ isOpen: false, target: null, targetCompanyId: '', targetDate: '' });
  
  // Bill Splitter / Pool state
  const [billTotal, setBillTotal] = useState('');
  const [billDeducted, setBillDeducted] = useState(0);
  const [showBillSplitter, setShowBillSplitter] = useState(true);

  useEffect(() => {
    if (navigationTarget) {
      if (navigationTarget.companyId) {
        setSelectedCompany(navigationTarget.companyId);
      }
      if (navigationTarget.date) {
        setSelectedDay(navigationTarget.date);
        const d = new Date(navigationTarget.date);
        if (!isNaN(d.getTime())) {
          setSelectedMonth(d);
        }
      }
      setNavigationTarget(null);
    }
  }, [navigationTarget, setNavigationTarget]);

  // Use the first available company by default
  useEffect(() => {
    if (!selectedCompany && companies.length > 0) {
      setSelectedCompany(companies[0].id);
    }
  }, [companies, selectedCompany]);

  // Load existing machine readings for selected day & company if they exist
  useEffect(() => {
    const existing = (records || []).find(r => 
      r && 
      r.date === selectedDay && 
      r.companyId === selectedCompany && 
      (r.machineRemaining !== null || r.machineAccumulated !== null || r.topUpAmount > 0)
    );

    if (existing) {
      setFormData(prev => ({
        ...prev,
        machineRemaining: existing.machineRemaining !== null && existing.machineRemaining !== undefined ? String(existing.machineRemaining) : '',
        machineMixed: existing.machineAccumulated !== null && existing.machineAccumulated !== undefined ? String(existing.machineAccumulated) : '',
        topUpAmount: existing.topUpAmount ? String(existing.topUpAmount) : '',
        manualTopUp: existing.topUpAmount > 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        machineRemaining: '',
        machineMixed: '',
        topUpAmount: '',
        manualTopUp: false
      }));
    }
  }, [selectedDay, selectedCompany, records]);

  const refService = React.useRef(null);
  const refCount   = React.useRef(null);
  const refAmount  = React.useRef(null);
  const refMachineMixed = React.useRef(null);

  // Companies sorting and quick-select list
  const entryCompanies = useMemo(() => {
    return (companies || [])
      .filter(c => c && c.showInEntry)
      .sort((a,b) => (a.order || 0) - (b.order || 0));
  }, [companies]);

  const quickCompanies = useMemo(() => {
    return entryCompanies.filter(c => c.isQuickSelect || (c.order && c.order <= 10));
  }, [entryCompanies]);

  const currentCompanyObj = useMemo(() => {
    return (companies || []).find(c => String(c.id) === String(selectedCompany)) || entryCompanies[0] || null;
  }, [companies, selectedCompany, entryCompanies]);

  const filteredServices = useMemo(() => {
    const rareKeywords = ['รับประกัน', 'รับรอง', 'ธุรกิจตอบรับ'];
    return [...services]
      .filter(s => s.category === activeCategory)
      .sort((a, b) => {
        const aIsRare = rareKeywords.some(kw => a.name.includes(kw));
        const bIsRare = rareKeywords.some(kw => b.name.includes(kw));
        if (aIsRare === bIsRare) return 0;
        return aIsRare ? 1 : -1;
      });
  }, [services, activeCategory]);

  const evaluatedAmount = useMemo(() => {
    return evaluateMathExpression(formData.amount);
  }, [formData.amount]);

  const currentRateAnomaly = useMemo(
    () => getRateAnomaly(services, formData.serviceId, formData.count, evaluatedAmount),
    [services, formData.serviceId, formData.count, evaluatedAmount]
  );

  const confirmRateAnomaly = anomaly => {
    if (!anomaly) return true;
    const pairedService = getPairedService(services, anomaly.service);
    return window.confirm(
      `⚠️ ยอดเงินต่ำกว่าเรทเริ่มต้น\n\n` +
      `${anomaly.service?.name || 'บริการที่เลือก'}\n` +
      `เรทเริ่มต้น ${anomaly.minimumRate.toLocaleString()} บาท/ชิ้น\n` +
      `จำนวนที่กรอก ${Number(formData.count || 0).toLocaleString()} ชิ้น\n` +
      `ยอดขั้นต่ำที่ควรเป็น ${anomaly.minimumTotal.toLocaleString()} บาท\n` +
      `ยอดที่กรอก ${anomaly.amount.toLocaleString()} บาท (ต่ำกว่า ${anomaly.difference.toLocaleString()} บาท)\n\n` +
      `อาจเลือกบริการหรือในประเทศ/ระหว่างประเทศผิด\n` +
      (pairedService ? `บริการที่ควรตรวจสอบ: ${pairedService.name}\n\n` : '') +
      `กด OK หากตรวจแล้วและต้องการบันทึกต่อ หรือ Cancel เพื่อกลับไปแก้ไข`
    );
  };

  const anomalyAudit = anomaly => anomaly ? {
    rateAnomalyConfirmed: true,
    rateAnomalyMinimumRate: anomaly.minimumRate,
    rateAnomalyMinimumTotal: anomaly.minimumTotal,
    rateAnomalyConfirmedAt: new Date().toISOString(),
  } : {};
  
  const dailyRecords = useMemo(() => {
    if (!records || !Array.isArray(records)) return [];
    return records
      .filter(r => r && r.date === selectedDay && r.companyId === selectedCompany)
      .map(r => ({
        ...r,
        serviceName: services.find(s => s.id === r.serviceId)?.name || 'Unknown'
      }));
  }, [records, selectedDay, selectedCompany, services]);

  const dailyTotalAmount = useMemo(() => {
    return dailyRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [dailyRecords]);

  // Bill remaining calculation
  const billTotalNum = Number(billTotal) || 0;
  const billRemaining = Math.max(0, billTotalNum - billDeducted);

  const handleUseBillRemaining = () => {
    if (billRemaining > 0) {
      setFormData(prev => ({ ...prev, amount: String(billRemaining) }));
      setTimeout(() => {
        refAmount.current?.focus();
        refAmount.current?.select();
      }, 50);
    }
  };

  const handleResetBill = () => {
    setBillTotal('');
    setBillDeducted(0);
  };

  // Machine reading context from latest day before or on selectedDay
  const machineContext = useMemo(() => {
    const companyRecords = (records || []).filter(r => r && r.companyId === selectedCompany && r.machineAccumulated != null);
    const sorted = [...companyRecords].sort((a, b) => {
      if (a.date !== b.date) {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        if (isNaN(da) || isNaN(db)) return 0;
        return da - db;
      }
      return (a.timestamp || 0) - (b.timestamp || 0);
    });

    const previousRecords = sorted.filter(r => r.date < selectedDay);
    const lastBefore = previousRecords.length > 0 ? previousRecords[previousRecords.length - 1] : null;

    const currentDayRecord = sorted.find(r => r.date === selectedDay);

    return {
      lastBeforeAcc: lastBefore ? lastBefore.machineAccumulated : null,
      lastBeforeRem: lastBefore ? lastBefore.machineRemaining : null,
      lastBeforeDate: lastBefore ? lastBefore.date : null,
      currentDayAcc: currentDayRecord ? currentDayRecord.machineAccumulated : null,
      currentDayRem: currentDayRecord ? currentDayRecord.machineRemaining : null,
      acc: lastBefore ? lastBefore.machineAccumulated : null,
      rem: lastBefore ? lastBefore.machineRemaining : null
    };
  }, [records, selectedCompany, selectedDay]);

  // Meter history for this company (last 7 days)
  const companyMeterHistory = useMemo(() => {
    if (!records || !Array.isArray(records)) return [];
    const dayMap = {};
    records
      .filter(r => r && r.companyId === selectedCompany)
      .forEach(r => {
        if (!dayMap[r.date]) {
          dayMap[r.date] = {
            date: r.date,
            totalAmount: 0,
            itemCount: 0,
            machineRemaining: null,
            machineAccumulated: null,
            topUpAmount: 0
          };
        }
        dayMap[r.date].totalAmount += Number(r.amount) || 0;
        dayMap[r.date].itemCount += Number(r.count) || 0;
        if (r.machineRemaining !== null && r.machineRemaining !== undefined) {
          dayMap[r.date].machineRemaining = r.machineRemaining;
        }
        if (r.machineAccumulated !== null && r.machineAccumulated !== undefined) {
          dayMap[r.date].machineAccumulated = r.machineAccumulated;
        }
        if (r.topUpAmount > 0) {
          dayMap[r.date].topUpAmount = r.topUpAmount;
        }
      });

    return Object.values(dayMap)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7);
  }, [records, selectedCompany]);

  // Handler for quick company change with value retention feedback
  const handleSelectCompany = (newCompanyId) => {
    if (!newCompanyId || newCompanyId === selectedCompany) return;
    const targetComp = companies.find(c => c.id === newCompanyId);
    const hasPending = (formData.count && formData.amount) || subItems.length > 0;
    setSelectedCompany(newCompanyId);
    if (hasPending) {
      setPreservedMessage(`สลับมาที่ "${targetComp?.name || ''}" แล้ว — ข้อมูลที่คีย์ไว้คงอยู่ครบ พร้อมกดบันทึกได้ทันที ✨`);
      setShowPreservedToast(true);
      setTimeout(() => setShowPreservedToast(false), 4000);
    }
  };

  // Handler for date change with value retention feedback
  const handleSelectDate = (newDate) => {
    if (!newDate || newDate === selectedDay) return;
    const hasPending = (formData.count && formData.amount) || subItems.length > 0;
    setSelectedDay(newDate);
    if (hasPending) {
      setPreservedMessage(`เปลี่ยนเป็นวันที่ ${safeFormat(newDate, 'd MMMM yyyy', { locale: th })} แล้ว — ข้อมูลที่คีย์ไว้คงอยู่ครบ พร้อมกดบันทึกได้ทันที ✨`);
      setShowPreservedToast(true);
      setTimeout(() => setShowPreservedToast(false), 4000);
    }
  };

  // Quick Date Jump Buttons (-1 day, today, +1 day)
  const handleShiftDate = (daysOffset) => {
    try {
      const current = new Date(selectedDay);
      if (isNaN(current.getTime())) return;
      current.setDate(current.getDate() + daysOffset);
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      handleSelectDate(`${y}-${m}-${d}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenReassignModal = (target) => {
    setReassignModal({
      isOpen: true,
      target,
      targetCompanyId: selectedCompany,
      targetDate: selectedDay
    });
  };

  const handleConfirmReassign = () => {
    const targetCompId = reassignModal.targetCompanyId || selectedCompany;
    const targetDt = reassignModal.targetDate || selectedDay;

    if (targetCompId === selectedCompany && targetDt === selectedDay) {
      alert('กรุณาเลือกบริษัทปลายทาง หรือ วันที่ปลายทาง ที่แตกต่างจากปัจจุบัน');
      return;
    }

    const targetComp = companies.find(c => c.id === targetCompId);
    const targetCompName = targetComp ? `${targetComp.name} (${targetComp.code || ''})` : 'บริษัทปลายทาง';
    const targetDateLabel = safeFormat(targetDt, 'd MMMM yyyy', { locale: th });

    if (reassignModal.target === 'ALL') {
      moveDailyRecords(selectedDay, selectedCompany, {
        targetCompanyId: targetCompId,
        targetDate: targetDt
      });
      alert(`ย้ายรายการทั้งหมดของวันนี้ (${dailyRecords.length} รายการ) ไปยัง "${targetCompName}" วันที่ ${targetDateLabel} สำเร็จเรียบร้อยแล้ว!`);
    } else if (reassignModal.target) {
      moveSingleRecord(reassignModal.target, {
        targetCompanyId: targetCompId,
        targetDate: targetDt
      });
      alert(`ย้ายรายการ "${reassignModal.target.serviceName}" ไปยัง "${targetCompName}" วันที่ ${targetDateLabel} สำเร็จเรียบร้อยแล้ว!`);
    }

    setReassignModal({ isOpen: false, target: null, targetCompanyId: '', targetDate: '' });
    setSelectedCompany(targetCompId);
    setSelectedDay(targetDt);
  };

  const handleAddSubItem = () => {
    if (!formData.serviceId) {
      alert('กรุณาเลือกประเภทบริการก่อน');
      return;
    }
    const evaluatedAmt = evaluateMathExpression(formData.amount);
    if (!formData.count || !evaluatedAmt) {
      alert('กรุณากรอกจำนวนชิ้นและจำนวนเงินก่อน');
      return;
    }
    const count = Number(formData.count);
    const amountVal = Number(evaluatedAmt);
    if (isNaN(count) || count <= 0 || isNaN(amountVal) || amountVal <= 0) {
      alert('กรุณากรอกจำนวนที่ถูกต้องและมากกว่า 0');
      return;
    }

    const anomaly = getRateAnomaly(services, formData.serviceId, count, amountVal);
    if (!confirmRateAnomaly(anomaly)) return;

    const serviceName = services.find(s => s.id === formData.serviceId)?.name || 'Unknown';

    setSubItems(prev => [
      ...prev,
      {
        id: Date.now(),
        serviceId: formData.serviceId,
        serviceName,
        count,
        amount: amountVal,
        ...anomalyAudit(anomaly)
      }
    ]);

    // Deduct from bill pool if active
    if (billTotalNum > 0) {
      setBillDeducted(prev => prev + amountVal);
    }

    setFormData(prev => ({
      ...prev,
      count: '',
      amount: ''
    }));

    setTimeout(() => {
      refCount.current?.focus();
      refCount.current?.select();
    }, 50);
  };

  const saveRecord = () => {
    if (subItems.length > 0) {
      const grouped = subItems.reduce((acc, item) => {
        if (!acc[item.serviceId]) {
          acc[item.serviceId] = { count: 0, amount: 0, anomalyItems: [] };
        }
        acc[item.serviceId].count += item.count;
        acc[item.serviceId].amount += item.amount;
        if (item.rateAnomalyConfirmed) acc[item.serviceId].anomalyItems.push(item);
        return acc;
      }, {});

      const newRecords = Object.keys(grouped).map((serviceId, index) => ({
        date: selectedDay,
        companyId: selectedCompany,
        serviceId,
        count: grouped[serviceId].count,
        amount: grouped[serviceId].amount,
        machineRemaining: formData.machineRemaining ? Number(formData.machineRemaining) : null,
        machineAccumulated: formData.machineMixed ? Number(formData.machineMixed) : null,
        topUpAmount: formData.topUpAmount ? Number(formData.topUpAmount) : 0,
        timestamp: Date.now() + index,
        ...(grouped[serviceId].anomalyItems.length > 0 ? {
          rateAnomalyConfirmed: true,
          rateAnomalyMinimumRate: Math.max(...grouped[serviceId].anomalyItems.map(item => item.rateAnomalyMinimumRate || 0)),
          rateAnomalyMinimumTotal: grouped[serviceId].anomalyItems.reduce((sum, item) => sum + (item.rateAnomalyMinimumTotal || 0), 0),
          rateAnomalyConfirmedAt: grouped[serviceId].anomalyItems[grouped[serviceId].anomalyItems.length - 1].rateAnomalyConfirmedAt,
        } : {})
      }));

      addRecord(newRecords);
      setFormData({ serviceId: '', count: '', amount: '', machineRemaining: '', machineMixed: '', topUpAmount: '', manualTopUp: false });
      setSubItems([]);
      setTimeout(() => refService.current?.focus(), 50);
      return;
    }

    if (dailyRecords.length > 0 && !formData.serviceId && !formData.count && !formData.amount) {
      const updatedRecords = dailyRecords.map(r => ({
        ...r,
        machineRemaining: formData.machineRemaining ? Number(formData.machineRemaining) : null,
        machineAccumulated: formData.machineMixed ? Number(formData.machineMixed) : null,
        topUpAmount: formData.topUpAmount ? Number(formData.topUpAmount) : 0,
      }));
      addRecord(updatedRecords);
      setFormData({ serviceId: '', count: '', amount: '', machineRemaining: '', machineMixed: '', topUpAmount: '', manualTopUp: false });
      alert('ปรับปรุงยอดคงเหลือ/สะสมสำเร็จเรียบร้อยแล้ว!');
      return;
    }

    const evaluatedAmt = evaluateMathExpression(formData.amount);
    if (!formData.serviceId || !formData.count || !evaluatedAmt) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    const finalAmount = Number(evaluatedAmt);
    const countNum = Number(formData.count);
    const anomaly = getRateAnomaly(services, formData.serviceId, countNum, finalAmount);
    if (!confirmRateAnomaly(anomaly)) return;

    addRecord([{
      date: selectedDay,
      companyId: selectedCompany,
      serviceId: formData.serviceId,
      count: countNum,
      amount: finalAmount,
      machineRemaining: formData.machineRemaining ? Number(formData.machineRemaining) : null,
      machineAccumulated: formData.machineMixed ? Number(formData.machineMixed) : null,
      topUpAmount: formData.topUpAmount ? Number(formData.topUpAmount) : 0,
      timestamp: Date.now(),
      ...anomalyAudit(anomaly)
    }]);

    if (billTotalNum > 0) {
      setBillDeducted(prev => prev + finalAmount);
    }

    setFormData({ serviceId: '', count: '', amount: '', machineRemaining: '', machineMixed: '', topUpAmount: '', manualTopUp: false });
    setSubItems([]);
    setTimeout(() => refService.current?.focus(), 50);
  };

  const currentEnteredOrDailyTotal = useMemo(() => {
    if (subItems.length > 0) {
      return subItems.reduce((sum, item) => sum + item.amount, 0);
    }
    const evalAmt = evaluateMathExpression(formData.amount);
    if (evalAmt) {
      return Number(evalAmt) || 0;
    }
    return dailyTotalAmount;
  }, [subItems, formData.amount, dailyTotalAmount]);

  const topUpCalculation = useMemo(() => {
    if (!formData.machineRemaining || machineContext.rem === null || !currentEnteredOrDailyTotal) return 0;
    const currentRem = Number(formData.machineRemaining);
    const expectedRem = machineContext.rem - Number(currentEnteredOrDailyTotal);
    
    if (currentRem > expectedRem) {
      return currentRem - expectedRem;
    }
    return 0;
  }, [formData.machineRemaining, currentEnteredOrDailyTotal, machineContext]);

  useEffect(() => {
    if (topUpCalculation > 0 && formData.topUpAmount !== topUpCalculation) {
      setFormData(prev => ({ ...prev, topUpAmount: topUpCalculation }));
    } else if (topUpCalculation === 0 && formData.topUpAmount && !formData.manualTopUp) {
      setFormData(prev => ({ ...prev, topUpAmount: '' }));
    }
  }, [topUpCalculation, formData.topUpAmount, formData.manualTopUp]);

  const validation = useMemo(() => {
    const totalAmount = currentEnteredOrDailyTotal;

    let accValid = true;
    let remValid = true;
    let expectedAcc = machineContext.acc !== null ? machineContext.acc + totalAmount : null;
    let expectedRem = machineContext.rem !== null ? machineContext.rem - totalAmount : null;

    const currentMachineRem = formData.machineRemaining ? Number(formData.machineRemaining) : null;
    const currentMachineMixed = formData.machineMixed ? Number(formData.machineMixed) : null;
    const currentTopUp = Number(formData.topUpAmount) || 0;

    if (currentMachineMixed != null && expectedAcc !== null) {
      accValid = Math.abs(currentMachineMixed - expectedAcc) < 0.01;
    }

    if (currentMachineRem != null && machineContext.rem !== null) {
      remValid = Math.abs(currentMachineRem - (expectedRem + currentTopUp)) < 0.01;
    }

    return { accValid, remValid, expectedAcc, expectedRem };
  }, [formData.machineMixed, formData.machineRemaining, currentEnteredOrDailyTotal, formData.topUpAmount, machineContext]);

  const handleAutoFillExpected = () => {
    if (validation.expectedRem !== null) {
      const topUpVal = Number(formData.topUpAmount) || 0;
      setFormData(prev => ({
        ...prev,
        machineRemaining: String((validation.expectedRem + topUpVal).toFixed(2)),
        machineMixed: validation.expectedAcc !== null ? String(validation.expectedAcc.toFixed(2)) : prev.machineMixed
      }));
    }
  };

  const hasTypedValues = Boolean((formData.count && formData.amount) || subItems.length > 0);

  return (
    <div className="fade-in app-content-inner">
      {/* Top Header */}
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
      </div>

      {/* Quick Company Bar */}
      <div className="quick-company-panel">
        <div className="quick-company-header">
          <span className="quick-company-title">
            <Sparkles size={16} color="#3b82f6" />
            <span>ปุ่มเลือกด่วนบริษัท (คลิกเพื่อสลับ บ. ทันที):</span>
          </span>
          <small className="text-muted" style={{ fontSize: '0.8rem' }}>
            💡 สลับบริษัทหรือวันที่ได้ตลอดเวลา ค่าที่พิมพ์ไว้ในช่องกรอกจะไม่หาย
          </small>
        </div>
        <div className="quick-company-grid">
          {quickCompanies.map(qc => {
            const isActive = String(selectedCompany) === String(qc.id);
            const shortName = qc.name.replace(/^(บ\.|บริษัท\s*|หสน\.)/g, '').trim();
            return (
              <button
                key={qc.id}
                type="button"
                className={`quick-company-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectCompany(qc.id)}
                title={`${qc.name} ${qc.code ? `(${qc.code})` : ''}`}
              >
                {qc.code && <span className="quick-company-code">{qc.code}</span>}
                <span className="quick-company-name">{shortName}</span>
                {isActive && <CheckCircle2 size={15} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Value Preserved Toast Banner */}
      {showPreservedToast && (
        <div className="fade-in mb-4" style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          padding: '10px 16px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.9rem',
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
        }}>
          <Sparkles size={18} />
          <span>{preservedMessage}</span>
        </div>
      )}

      <div className="grid-2col">
        {/* Entry Form */}
        <div className="glass-card">
          {/* Active Company Status Card */}
          <div className="active-company-banner">
            <div className="active-company-info">
              <Building2 size={22} color="var(--primary)" />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {currentCompanyObj?.code && (
                    <span className="active-company-badge">{currentCompanyObj.code}</span>
                  )}
                  <span className="active-company-label">{currentCompanyObj?.name || 'ไม่ได้เลือกบริษัท'}</span>
                </div>
                <div className="active-company-subtext" style={{ fontWeight: 600, color: 'var(--primary)', marginTop: '2px' }}>
                  📅 บันทึกข้อมูลวันที่ {safeFormat(selectedDay, 'EEEEที่ d MMMM yyyy', { locale: th })}
                </div>
              </div>
            </div>
            {hasTypedValues && (
              <span className="value-retained-badge">
                <CheckCircle2 size={13} /> พร้อมบันทึกให้รายการนี้
              </span>
            )}
          </div>

          {/* Smart Bill Splitter Widget */}
          <div className="bill-splitter-box">
            <div className="bill-splitter-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calculator size={16} />
                <span>เครื่องมือช่วยกระจายยอดบิลรวม (หักยอดอัตโนมัติ)</span>
              </span>
              {billTotal && (
                <button 
                  type="button" 
                  onClick={handleResetBill}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem' }}
                >
                  ล้างบิลรวม
                </button>
              )}
            </div>
            <div className="bill-splitter-grid">
              <div className="bill-splitter-input-group">
                <label>ยอดรวมทั้งบิล:</label>
                <input 
                  type="number" 
                  className="bill-splitter-input" 
                  placeholder="0.00" 
                  value={billTotal}
                  onChange={e => {
                    setBillTotal(e.target.value);
                    setBillDeducted(0);
                  }}
                />
              </div>

              {billTotalNum > 0 && (
                <>
                  <div className="bill-remainder-badge">
                    <span>ยอดคงเหลือในบิล:</span>
                    <strong style={{ fontSize: '1rem' }}>฿{billRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                  </div>
                  {billRemaining > 0 && (
                    <button 
                      type="button" 
                      className="btn-use-remainder" 
                      onClick={handleUseBillRemaining}
                      title="กดเพื่อนำยอดคงเหลือในบิลใส่ในช่องจำนวนเงินทันที"
                    >
                      ⚡ ใช้ยอดคงเหลือ (฿{billRemaining.toLocaleString()})
                    </button>
                  )}
                  {billRemaining === 0 && (
                    <span style={{ color: '#059669', fontSize: '0.82rem', fontWeight: 'bold' }}>
                      ✓ จัดสรรบิลนี้ครบถ้วนแล้ว!
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className={`category-toggle mb-4 ${activeCategory}`}>
            <button className={activeCategory === 'domestic' ? 'active domestic' : ''} onClick={() => setActiveCategory('domestic')}>📮 ในประเทศ</button>
            <button className={activeCategory === 'international' ? 'active international' : ''} onClick={() => setActiveCategory('international')}>✈️ ระหว่างประเทศ</button>
          </div>

          <div className={`entry-category-banner ${activeCategory}`}>
            <strong>{activeCategory === 'domestic' ? '📮 กำลังบันทึกบริการในประเทศ' : '✈️ กำลังบันทึกบริการระหว่างประเทศ'}</strong>
            <span>ตรวจหมวดนี้อีกครั้งก่อนกรอกจำนวนเงิน</span>
          </div>

          <div className="entry-form-vertical">
            <div className="form-group">
              <label>ประเภทบริการ</label>
              <div className="quick-services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
                {filteredServices.filter(s => s.isQuickSelect).map(s => (
                  <button
                    key={s.id}
                    type="button"
                    className={`btn btn-secondary ${formData.serviceId === s.id ? 'active' : ''}`}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, serviceId: s.id }));
                      setTimeout(() => { refCount.current?.focus(); refCount.current?.select(); }, 50);
                    }}
                    style={{
                      padding: '10px',
                      fontSize: '0.9rem',
                      background: formData.serviceId === s.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      color: formData.serviceId === s.id ? 'white' : 'var(--text)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontWeight: formData.serviceId === s.id ? 'bold' : 'normal',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {s.name.replace('รายได้', '').replace('ไปรษณียภัณฑ์', '').replace('พัสดุไปรษณีย์ภัณฑ์', 'พัสดุ').replace(/ในประเทศ-?|ระหว่างประเทศ-?/g, '').replace('ไปรษณีย์ด่วนพิเศษ', 'EMS').trim()}
                    <small className="service-destination-label">{activeCategory === 'domestic' ? 'ในประเทศ' : 'ระหว่างประเทศ'}</small>
                  </button>
                ))}
              </div>

              <select 
                ref={refService}
                className="input-select full" 
                value={filteredServices.filter(s => !s.isQuickSelect).some(s => s.id === formData.serviceId) ? formData.serviceId : ''}
                onChange={e => {
                  if (e.target.value) {
                    setFormData({...formData, serviceId: e.target.value});
                    setTimeout(() => { refCount.current?.focus(); refCount.current?.select(); }, 50);
                  }
                }}
              >
                <option value="">บริการอื่นๆ...</option>
                {filteredServices.filter(s => !s.isQuickSelect).map(s => (
                  <option 
                    key={s.id} 
                    value={s.id} 
                    className={['รับประกัน', 'รับรอง', 'ธุรกิจตอบรับ'].some(kw => s.name.includes(kw)) ? 'rare-service' : ''}
                  >
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-row-calc">
              <div className="form-group">
                <label>จำนวนชิ้น</label>
                <input 
                  ref={refCount}
                  type="number" 
                  value={formData.count} 
                  onChange={e => setFormData({...formData, count: e.target.value})}
                  placeholder="0"
                  onKeyDown={e => { 
                    if (e.key === 'Enter') { 
                      e.preventDefault(); 
                      refAmount.current?.focus(); 
                      refAmount.current?.select(); 
                    } 
                  }}
                />
              </div>
              <div className="form-group">
                <label>
                  จำนวนเงิน (บาท)
                  <small style={{ color: 'var(--text-muted)', marginLeft: '6px', fontWeight: 'normal' }}>
                    (พิมพ์สูตรเช่น 246-90 ได้)
                  </small>
                </label>
                <input 
                  ref={refAmount}
                  type="text" 
                  value={formData.amount} 
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                  onBlur={() => {
                    const evalRes = evaluateMathExpression(formData.amount);
                    if (evalRes !== formData.amount && evalRes !== '') {
                      setFormData(prev => ({ ...prev, amount: String(evalRes) }));
                    }
                  }}
                  placeholder="0.00"
                  onKeyDown={e => { 
                    if (e.key === 'Enter') { 
                      e.preventDefault(); 
                      const evalRes = evaluateMathExpression(formData.amount);
                      if (evalRes !== formData.amount && evalRes !== '') {
                        setFormData(prev => ({ ...prev, amount: String(evalRes) }));
                      }
                      if (subItems.length > 0) {
                        handleAddSubItem();
                      } else {
                        saveRecord();
                      }
                    } 
                  }}
                />
              </div>
              <button 
                type="button" 
                className="btn-calc-add" 
                onClick={handleAddSubItem}
                title="บวกเพิ่มรายการสะสม"
              >
                <PlusCircle size={20} />
              </button>
            </div>

            {currentRateAnomaly && (
              <div style={{
                marginTop: '-4px',
                marginBottom: '16px',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #f59e0b',
                borderLeft: '5px solid #f59e0b',
                background: '#fffbeb',
                color: '#92400e',
                fontSize: '0.9rem',
                lineHeight: 1.55,
              }}>
                <strong>⚠️ ยอดต่ำกว่าเรทเริ่มต้น อาจเลือกบริการผิด</strong>
                <div>
                  เรทเริ่มต้น {currentRateAnomaly.minimumRate.toLocaleString()} บาท/ชิ้น × {Number(formData.count).toLocaleString()} ชิ้น
                  {' '}ควรไม่น้อยกว่า <strong>{currentRateAnomaly.minimumTotal.toLocaleString()} บาท</strong>
                </div>
                <div>
                  ยอดที่กรอก {currentRateAnomaly.amount.toLocaleString()} บาท ต่ำกว่าเกณฑ์ {currentRateAnomaly.difference.toLocaleString()} บาท
                </div>
              </div>
            )}

            {subItems.length > 0 && (
              <div className="sub-items-box">
                <div className="sub-items-header">
                  <span>รายการสะสมชั่วคราว ({subItems.length} รายการ)</span>
                  <button 
                    type="button" 
                    onClick={() => setSubItems([])}
                    style={{ background: 'none', border: 'none', color: 'var(--accent, #ef4444)', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    ล้างทั้งหมด
                  </button>
                </div>
                <div className="sub-items-list">
                  {subItems.map((item) => (
                    <div key={item.id} className="sub-item-row">
                      <div className="sub-item-info">
                        <span style={{ color: '#10b981' }}>•</span>
                        <span>{item.serviceName}</span>
                        <span className="text-muted">({item.count} ชิ้น)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="sub-item-total">฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <button 
                          type="button" 
                          className="btn-icon" 
                          onClick={() => setSubItems(prev => prev.filter(x => x.id !== item.id))}
                          style={{ padding: '2px', background: 'none', border: 'none', color: 'var(--accent, #ef4444)', cursor: 'pointer' }}
                          title="ลบรายการนี้"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="sub-items-footer">
                  <span>รวมสะสม: {subItems.reduce((sum, item) => sum + item.count, 0)} ชิ้น</span>
                  <span>฿{subItems.reduce((sum, item) => sum + item.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
            <div className="form-row">
              <div className="form-group">
                <label>ยอดคงเหลือ (แถวบน)</label>
                <input 
                  type="number" 
                  value={formData.machineRemaining} 
                  onChange={e => setFormData({...formData, machineRemaining: e.target.value})}
                  placeholder="0.00"
                  className={!validation.remValid ? 'input-error' : ''}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      refMachineMixed.current?.focus();
                      refMachineMixed.current?.select();
                    }
                  }}
                />
                {!validation.remValid && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span className="text-danger" style={{ fontSize: '0.75rem' }}>
                      * ควรเป็น {(validation.expectedRem + (Number(formData.topUpAmount) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <button type="button" className="btn-autofill-reading" onClick={handleAutoFillExpected}>
                      ⚡ ใส่อัตโนมัติ
                    </button>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>ยอดสะสม (แถวล่าง)</label>
                <input 
                  ref={refMachineMixed}
                  type="number" 
                  value={formData.machineMixed} 
                  onChange={e => setFormData({...formData, machineMixed: e.target.value})}
                  placeholder="0.00"
                  className={!validation.accValid ? 'input-error' : ''}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      saveRecord();
                    }
                  }}
                />
                {!validation.accValid && validation.expectedAcc !== null && (
                  <p className="text-danger" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                    * ควรเป็น {validation.expectedAcc.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>

            {(topUpCalculation > 0 || formData.manualTopUp) && (
              <div className="form-group fade-in" style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--primary)' }}>
                <label style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✨ ตรวจพบยอดเติมเงิน (คาดการณ์)</label>
                <input 
                  type="number" 
                  value={formData.topUpAmount} 
                  onChange={e => setFormData({...formData, topUpAmount: e.target.value, manualTopUp: true})}
                  placeholder="0.00"
                  className="input-select full"
                  style={{ marginTop: '0.5rem', borderColor: 'var(--primary)' }}
                />
                <p style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--text-muted)' }}>
                  * ระบบคำนวณเบื้องต้นให้ {topUpCalculation.toLocaleString()} บาท (แก้ไขได้)
                </p>
              </div>
            )}

            <button className="btn btn-primary full py-3" onClick={saveRecord}>
              <Save size={18}/> บันทึกรายการ
            </button>
          </div>
        </div>

        {/* Right Column: Daily Summary & Machine History Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Daily Services Summary */}
          <div className="glass-card">
            <div className="flex-between mb-4 flex-wrap gap-2">
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem' }}>
                  รายการของวันที่ {safeFormat(selectedDay, 'd MMMM yyyy', { locale: th })}
                </h2>
                <small className="text-muted">{safeFormat(selectedDay, 'EEEE', { locale: th })}</small>
              </div>
              {dailyRecords.length > 0 && (
                <button 
                  type="button" 
                  className="btn-reassign-icon" 
                  onClick={() => handleOpenReassignModal('ALL')}
                  title="ย้ายทุกรายการของวันนี้ไปยัง บ.อื่น หรือ วันที่อื่น"
                >
                  <ArrowRightLeft size={13} /> ย้ายทั้งหมดไป บ./วันที่อื่น
                </button>
              )}
            </div>
            {dailyRecords.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>ยังไม่มีการบันทึกข้อมูลบริการสำหรับบริษัทนี้ในวันที่เลือก</p>
            ) : (
              <div className="daily-list">
                {dailyRecords.map((r, idx) => (
                  <div key={r.timestamp || `${r.serviceId}_${idx}`} className="daily-item">
                    <div className="info">
                      <div className="name">{r.serviceName}</div>
                      <div className="meta">{r.count} ชิ้น | ฿{r.amount.toLocaleString()}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button 
                        type="button" 
                        className="btn-reassign-icon" 
                        onClick={() => handleOpenReassignModal(r)} 
                        title="ย้ายรายการนี้ไปยังบริษัทอื่น หรือ วันที่อื่น"
                      >
                        <ArrowRightLeft size={13} /> ย้าย บ./วันที่
                      </button>
                      <button 
                        type="button" 
                        className="btn-icon" 
                        onClick={() => { if (window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) { deleteSingleRecord(r.serviceId, r.date, r.companyId, r.timestamp); } }}
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="daily-total mt-4 pt-4">
                  <strong>รวมค่าบริการวันนี้:</strong>
                  <span style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>฿{dailyTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
          </div>

          {/* Today & Historical Machine Meter Card */}
          <div className="glass-card">
            <div className="flex-between mb-3">
              <span style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={16} color="#3b82f6" />
                <span>สรุปยอดเครื่อง & ประวัติย้อนหลัง</span>
              </span>
              {validation.expectedRem !== null && (
                <button type="button" className="btn-autofill-reading" onClick={handleAutoFillExpected}>
                  ⚡ ปรับให้ตรงตามคำนวณ
                </button>
              )}
            </div>

            {/* Current Day Calculated State */}
            <div className="meter-grid-metrics">
              <div className="meter-metric-box active-day">
                <span className="meter-metric-label">
                  🔵 ยอดคงเหลือ (แถวบน)
                </span>
                <span className="meter-metric-val">
                  {formData.machineRemaining !== '' ? `฿${Number(formData.machineRemaining).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>ยังไม่กรอก</span>
                  )}
                </span>
                {validation.expectedRem !== null && (
                  <span className={validation.remValid ? 'meter-metric-match' : 'meter-metric-expected'}>
                    {validation.remValid ? '✓ ถูกต้องตรงตามเกณฑ์' : `* ควรเป็น ฿${(validation.expectedRem + (Number(formData.topUpAmount) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  </span>
                )}
              </div>

              <div className="meter-metric-box active-day">
                <span className="meter-metric-label">
                  🟢 ยอดสะสม (แถวล่าง)
                </span>
                <span className="meter-metric-val">
                  {formData.machineMixed !== '' ? `฿${Number(formData.machineMixed).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>ยังไม่กรอก</span>
                  )}
                </span>
                {validation.expectedAcc !== null && (
                  <span className={validation.accValid ? 'meter-metric-match' : 'meter-metric-expected'}>
                    {validation.accValid ? '✓ ถูกต้องตรงตามเกณฑ์' : `* ควรเป็น ฿${validation.expectedAcc.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  </span>
                )}
              </div>
            </div>

            {/* Meter History Table */}
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                📋 ประวัติการคีย์ย้อนหลัง ({currentCompanyObj?.name}):
              </div>
              {companyMeterHistory.length === 0 ? (
                <p className="text-muted" style={{ fontSize: '0.8rem', margin: '4px 0' }}>ยังไม่มีประวัติการบันทึกยอดเครื่องของบริษัทนี้</p>
              ) : (
                <div className="scroll-x">
                  <table className="meter-history-table">
                    <thead>
                      <tr>
                        <th>วันที่</th>
                        <th>คงเหลือ (บน)</th>
                        <th>สะสม (ล่าง)</th>
                        <th>ยอดใช้</th>
                        <th>เติมเงิน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companyMeterHistory.map((item) => {
                        const isSelected = item.date === selectedDay;
                        return (
                          <tr key={item.date} className={isSelected ? 'selected-row' : ''} style={{ cursor: 'pointer' }} onClick={() => handleSelectDate(item.date)} title="คลิกเพื่อไปยังวันที่นี้">
                            <td>
                              {safeFormat(item.date, 'dd/MM/yy', { locale: th })}
                              {isSelected && <span style={{ color: '#2563eb', marginLeft: '4px' }}>★</span>}
                            </td>
                            <td>{item.machineRemaining !== null ? item.machineRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                            <td>{item.machineAccumulated !== null ? item.machineAccumulated.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                            <td style={{ color: item.totalAmount > 0 ? 'var(--primary)' : 'inherit' }}>
                              {item.totalAmount > 0 ? `฿${item.totalAmount.toLocaleString()}` : '-'}
                            </td>
                            <td style={{ color: item.topUpAmount > 0 ? '#10b981' : 'inherit' }}>
                              {item.topUpAmount > 0 ? `+฿${item.topUpAmount.toLocaleString()}` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reassign / Move Company and Date Modal */}
      {reassignModal.isOpen && (
        <div className="reassign-modal-overlay" onClick={() => setReassignModal({ isOpen: false, target: null, targetCompanyId: '', targetDate: '' })}>
          <div className="reassign-modal-content" onClick={e => e.stopPropagation()}>
            <div className="reassign-modal-header">
              <span className="reassign-modal-title">
                <ArrowRightLeft size={20} color="#2563eb" />
                <span>ย้ายรายการไป บริษัท หรือ วันที่อื่น</span>
              </span>
              <button 
                type="button" 
                className="btn-icon" 
                onClick={() => setReassignModal({ isOpen: false, target: null, targetCompanyId: '', targetDate: '' })}
              >
                <X size={18} />
              </button>
            </div>

            <div className="reassign-item-preview">
              {reassignModal.target === 'ALL' ? (
                <div>
                  <strong>ย้ายทุกรายการของวันที่ {safeFormat(selectedDay, 'd MMMM yyyy', { locale: th })}</strong>
                  <div className="text-muted" style={{ marginTop: '4px' }}>
                    จำนวน {dailyRecords.length} รายการ | รวม ฿{dailyRecords.reduce((s, r) => s + r.amount, 0).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div>
                  <strong>ย้ายรายการ: {reassignModal.target?.serviceName}</strong>
                  <div className="text-muted" style={{ marginTop: '4px' }}>
                    {reassignModal.target?.count} ชิ้น | ยอดเงิน ฿{reassignModal.target?.amount?.toLocaleString()}
                  </div>
                </div>
              )}
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#dc2626' }}>
                จากเดิม: <strong>{currentCompanyObj?.name}</strong> (วันที่ {safeFormat(selectedDay, 'd MMMM yyyy', { locale: th })})
              </div>
            </div>

            {/* Target Company Selection */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>1. บริษัทปลายทาง:</label>
              <select 
                className="input-select full" 
                value={reassignModal.targetCompanyId} 
                onChange={e => setReassignModal(prev => ({ ...prev, targetCompanyId: e.target.value }))}
                style={{ fontSize: '0.95rem', padding: '10px' }}
              >
                {entryCompanies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code ? `[${c.code}] ` : ''}{c.name} {c.id === selectedCompany ? '(บริษัทเดิม)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Date Selection */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>2. วันที่ปลายทาง:</label>
              <ThaiDatePicker 
                value={reassignModal.targetDate || selectedDay} 
                onChange={val => setReassignModal(prev => ({ ...prev, targetDate: val }))} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setReassignModal({ isOpen: false, target: null, targetCompanyId: '', targetDate: '' })}
              >
                ยกเลิก
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleConfirmReassign}
              >
                <Check size={16} /> ยืนยันย้ายข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Reports = ({ setView }) => {
  const {
    services,
    companies,
    records,
    setNavigationTarget,
    reportLogo,
    reportLogoSize,
    reportLogoAlign
  } = useApp();
  const [missingReadings, setMissingReadings] = useState([]);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [missingMeterDetail, setMissingMeterDetail] = useState(null);
  const [reportMonth, setReportMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() - 1, 1);
  });
  const [reportType, setReportType] = useState('pn3_v2');
  const [selectedCompany, setSelectedCompany] = useState('');

  const monthRecords = useMemo(() => {
    const monthStr = safeFormat(reportMonth, 'yyyy-MM');
    return (records || []).filter(r => r && r.date && r.date.startsWith(monthStr));
  }, [records, reportMonth]);

  const reportCompanies = useMemo(() => {
    return companies
      .filter(c => monthRecords.some(r => companyMatchesRecordId(c, r.companyId)))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [companies, monthRecords]);

  // Use the first company with records in the selected month when the previous
  // selection is no longer available. This keeps the option label, report data,
  // and heading on the same company without a stale render in between.
  const effectiveSelectedCompany = reportCompanies.some(c => String(c.id) === String(selectedCompany))
    ? selectedCompany
    : (reportCompanies[0]?.id || '');

  const selectedReportCompany = companies.find(c => String(c.id) === String(effectiveSelectedCompany));

  const stats = useMemo(() => {

    if (['company_v2', 'company_summary'].includes(reportType)) {
      return monthRecords.filter(r => companyMatchesRecordId(selectedReportCompany, r.companyId));
    }
    return monthRecords;
  }, [monthRecords, reportType, selectedReportCompany]);

  const summaryData = useMemo(() => {
    // Generate unique list of report groups
    const groups = [];
    const processedGroups = new Set();
    
    services.forEach(s => {
      const gId = s.reportGroupId || s.id;
      if (!processedGroups.has(gId)) {
        processedGroups.add(gId);
        
        // Find all services in this group
        const groupServices = services.filter(sv => (sv.reportGroupId || sv.id) === gId);
        const groupServiceIds = groupServices.map(sv => sv.id);
        
        // Sum all records matching these IDs
        const groupRecords = stats.filter(r => groupServiceIds.includes(r.serviceId));
        
        groups.push({
          id: gId,
          code: s.code, // Use the first service's code as reference
          name: s.name.includes('eCo-Post') || s.name.includes('ePacket') ? groupServices.find(sv => !sv.name.includes('e'))?.name || s.name : s.name,
          count: groupRecords.reduce((sum, r) => sum + r.count, 0),
          amount: groupRecords.reduce((sum, r) => sum + r.amount, 0),
          hasConfirmedAnomaly: groupRecords.some(r => r.rateAnomalyConfirmed)
        });
      }
    });
    
    return groups;
  }, [services, stats]);

  const companySummary = useMemo(() => {
    return companies.map(c => {
      const companyRecords = stats.filter(r => r.companyId === c.id);
      return {
        ...c,
        count: companyRecords.reduce((sum, r) => sum + r.count, 0),
        amount: companyRecords.reduce((sum, r) => sum + r.amount, 0)
      };
    }).filter(c => c.count > 0);
  }, [companies, stats]);

  const checkMissingReadings = () => {
    const companyIds = Array.from(new Set(monthRecords.map(r => r.companyId)));
    const missing = [];
    
    companyIds.forEach(compId => {
      const comp = companies.find(c => String(c.id) === String(compId));
      if (!comp) return;
      
      const compRecs = monthRecords.filter(r => String(r.companyId) === String(compId));
      if (compRecs.length === 0) return;
      
      const dates = compRecs.map(r => r.date);
      const lastDate = dates.reduce((max, d) => d > max ? d : max, dates[0]);
      
      const hasStatus = compRecs.some(r => 
        r.date === lastDate && 
        r.machineRemaining !== null && 
        r.machineRemaining !== undefined &&
        r.machineAccumulated !== null && 
        r.machineAccumulated !== undefined
      );
      
      if (!hasStatus) {
        missing.push({
          companyId: compId,
          companyName: comp.name,
          date: lastDate
        });
      }
    });
    
    return missing;
  };

  const handlePrintClick = () => {
    const missing = checkMissingReadings();
    if (missing.length > 0) {
      setMissingReadings(missing);
      setShowWarningModal(true);
    } else {
      window.print();
    }
  };

  return (
    <div className="fade-in">
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>รายงาน</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select className="input-select" value={reportType} onChange={e => setReportType(e.target.value)}>
            <option value="pn3_v2">รายได้ส่ง ปน.3</option>
            <option value="admin_v2">ส่งธุรการ</option>
            <option value="company_v2">รายงานแยกบริษัท (แบบละเอียด)</option>
            <option value="company_summary">สรุปรายเดือนแยกบริษัท</option>
            <option value="machine_v2">สรุปเครื่องประทับ</option>
          </select>
          {['company_v2', 'company_summary'].includes(reportType) && (
            <select className="input-select" value={effectiveSelectedCompany} onChange={e => setSelectedCompany(e.target.value)}>
              {reportCompanies.length === 0 && <option value="">ไม่มีข้อมูลบริษัทในเดือนนี้</option>}
              {reportCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <div className="month-picker">
            <button className="btn-icon" onClick={() => setReportMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}><ChevronLeft/></button>
            <span>{safeFormat(reportMonth, 'MMMM yyyy', { locale: th })}</span>
            <button className="btn-icon" onClick={() => setReportMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}><ChevronRight/></button>
          </div>
          <button className="btn btn-primary" onClick={handlePrintClick}><Printer size={18}/> พิมพ์ (A4)</button>
        </div>
      </div>

      <div className="report-canvas">
        {reportType === 'pn3_v2' && (
          <div className="print-pn3-v2 portrait">
            <header className="report-header-v2" style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: '0' }}>ที่ทำการ &nbsp;&nbsp;ไปรษณีย์กลาง &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;สังกัด ปน.3</h2>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '5px 0' }}>รายละเอียดรายได้บริการชำระตราไปรษณียากรด้วยเครื่องประทับของที่ทำการ</h3>
              <p style={{ fontSize: '1rem', fontWeight: 'bold', margin: '5px 0' }}>ประจำเดือน {safeFormat(reportMonth, 'MMMM yyyy', { locale: th })}</p>
            </header>

            <table className="report-table bordered pn3-v2-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ลำดับที่</th>
                  <th style={{ width: '120px' }}>รหัสบัญชี (CA POS)</th>
                  <th>ชื่อบัญชี</th>
                  <th style={{ width: '150px' }}>จำนวนเงิน</th>
                  <th style={{ width: '100px' }}>หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: '1', code: '41010401', name: 'รายได้ไปรษณียภัณฑ์ในประเทศ-ธรรมดา' },
                  { id: '2', code: '41010411', name: 'รายได้ไปรษณียภัณฑ์ในประเทศ-รับรอง' },
                  { id: '3', code: '41010421', name: 'รายได้ไปรษณียภัณฑ์ในประเทศ-ลงทะเบียน' },
                  { id: '4', code: '41010431', name: 'รายได้ไปรษณียภัณฑ์ในประเทศ-รับประกัน' },
                  { id: '5', code: '41010501', name: 'รายได้ไปรษณียภัณฑ์ระหว่างประเทศ-ธรรมดา' },
                  { id: '6', code: '41010511', name: 'รายได้ไปรษณียภัณฑ์ระหว่างประเทศ-ลงทะเบียน' },
                  { id: '7', code: '41010521', name: 'รายได้ไปรษณียภัณฑ์ระหว่างประเทศ-รับประกัน' },
                  { id: '8', code: '41010601', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ในประเทศ-ธรรมดา' },
                  { id: '9', code: '41010611', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ในประเทศ-รับประกัน' },
                  { id: '10', code: '41010701', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ระหว่างประเทศ-ธรรมดา' },
                  { id: '11', code: '41010711', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ระหว่างประเทศรับ-รับประกัน' },
                  { id: '12', code: '41010801', name: 'รายได้ไปรษณีย์ด่วนพิเศษในประเทศ' },
                  { id: '13', code: '41010901', name: 'รายได้ไปรษณีย์ด่วนพิเศษระหว่างประเทศ' },
                  { id: '14', code: '41012101', name: 'รายได้บริการธุรกิจตอบรับ-ในประเทศ' }
                ].map((row, index) => {
                  const groupAmount = stats.reduce((sum, r) => {
                    const s = services.find(serv => serv.id === r.serviceId);
                    return s && s.reportGroupId === row.id ? sum + r.amount : sum;
                  }, 0);
                  const hasConfirmedAnomaly = stats.some(r => {
                    const s = services.find(serv => serv.id === r.serviceId);
                    return s && s.reportGroupId === row.id && r.rateAnomalyConfirmed;
                  });
                  
                  return (
                    <tr key={row.code}>
                      <td style={{ textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ textAlign: 'center' }}>{row.code}</td>
                      <td style={{ textAlign: 'left', paddingLeft: '10px' }}>{row.name}</td>
                      <td className="num">{groupAmount > 0 ? groupAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}</td>
                      <td style={{ textAlign: 'center', color: hasConfirmedAnomaly ? '#b45309' : undefined }}>
                        {hasConfirmedAnomaly ? '⚠ ยืนยันแล้ว' : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 'bold', height: '35px' }}>
                  <td colSpan={3} style={{ textAlign: 'center' }}>รวมทั้งสิ้น</td>
                  <td className="num" style={{ borderBottom: 'double 3px #000' }}>
                    {stats.reduce((sum, r) => sum + r.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {reportType === 'pn3' && (
          <div className="print-summary portrait">
            <header className="report-header" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>ที่ทำการ ไปรษณีย์กลาง สังกัด ปน.3</h3>
              <p style={{ margin: '4px 0' }}>รายละเอียดรายได้บริการชำระตราไปรษณียากรด้วยเครื่องประทับของที่ทำการ</p>
              <p style={{ margin: 0 }}>ประจำเดือน {safeFormat(reportMonth, 'MMMM yyyy', { locale: th })}</p>
            </header>
            <table className="report-table bordered" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>ลำดับที่</th>
                  <th style={{ width: '120px' }}>รหัสบัญชี (CA POS)</th>
                  <th>ชื่อบัญชี</th>
                  <th style={{ width: '150px' }}>จำนวนเงิน</th>
                  <th style={{ width: '80px' }}>หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {summaryData.map((s, idx) => (
                  <tr key={s.id}>
                    <td>{idx + 1}</td>
                    <td>{s.code === '41012101' ? '41012101' : (s.code || '-')}</td>
                    <td style={{ textAlign: 'left' }}>{s.name}</td>
                    <td className="num">{s.amount > 0 ? s.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}</td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 'bold' }}>
                  <td colSpan={3}>รวมทั้งสิ้น</td>
                  <td className="num">{summaryData.reduce((sum, s) => sum + s.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {reportType === 'company' && (
          <div className="print-company portrait">
            <header className="report-header" style={{ textAlign: 'left' }}>
              <h2>{selectedReportCompany?.name || ''}</h2>
              <p>ประจำเดือน {safeFormat(reportMonth, 'MMMM yyyy', { locale: th })}</p>
            </header>
            <table className="report-table compact">
              <thead>
                <tr>
                  <th>วันที่</th>
                  {services.filter(s => summaryData.find(sd => sd.id === s.id && sd.count > 0)).map(s => (
                    <th key={s.id}>{s.name.substring(0, 10)}...</th>
                  ))}
                  <th>รวม</th>
                </tr>
              </thead>
              <tbody>
                {eachDayOfInterval({ start: startOfMonth(reportMonth), end: endOfMonth(reportMonth) }).map(day => {
                  const dStr = format(day, 'yyyy-MM-dd');
                  const dayRecords = stats.filter(r => r.date === dStr);
                  const dayTotal = dayRecords.reduce((sum, r) => sum + r.amount, 0);
                  if (dayTotal === 0) return null;
                  return (
                    <tr key={dStr}>
                      <td>{format(day, 'd')}</td>
                      {services.filter(s => summaryData.find(sd => sd.id === s.id && sd.count > 0)).map(s => (
                        <td key={s.id}>{dayRecords.find(r => r.serviceId === s.id)?.amount || ''}</td>
                      ))}
                      <td style={{ fontWeight: 'bold' }}>{dayTotal.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'company_v2' && (
          <div className="print-company-v2 portrait">
            <header className="report-header-v2" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div className="report-logo-container" style={{ textAlign: reportLogoAlign, marginBottom: '1rem' }}>
                {reportLogo && <img src={reportLogo} alt="Logo" style={{ width: `${reportLogoSize}px` }} />}
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0' }}>{selectedReportCompany?.name || ''}</h2>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '5px 0' }}>ประจำเดือน {safeFormat(reportMonth, 'MMMM yyyy', { locale: th })}</h3>
            </header>

            {/* Part 1: Daily Breakdown */}
            <div className="report-section mb-8">
              <table className="report-table bordered company-v2-daily-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>วันที่</th>
                    {services.filter(s => stats.some(r => r.serviceId === s.id)).map(s => (
                      <th key={s.id} style={{ fontSize: '0.7rem', verticalAlign: 'middle' }}>
                        {s.name.replace('รายได้', '').replace('ไปรษณียภัณฑ์', 'ปน.').replace('พัสดุไปรษณีย์ภัณฑ์', 'พัสดุ').replace('ในประเทศ', '(ใน)').replace('ระหว่างประเทศ', '(ต่าง)')}
                      </th>
                    ))}
                    <th style={{ width: '80px' }}>รวม</th>
                  </tr>
                </thead>
                <tbody>
                  {eachDayOfInterval({ start: startOfMonth(reportMonth), end: endOfMonth(reportMonth) }).map(day => {
                    const dStr = format(day, 'yyyy-MM-dd');
                    const dayRecords = stats.filter(r => r.date === dStr);
                    const dayTotal = dayRecords.reduce((sum, r) => sum + r.amount, 0);
                    if (dayTotal === 0) return null;
                    
                    const activeServices = services.filter(s => stats.some(r => r.serviceId === s.id));
                    
                    return (
                      <tr key={dStr}>
                        <td style={{ fontWeight: 'bold' }}>{format(day, 'd')}</td>
                        {activeServices.map(s => {
                          const amt = dayRecords.find(r => r.serviceId === s.id)?.amount;
                          return <td key={s.id} className="num">{amt ? amt.toLocaleString() : ''}</td>;
                        })}
                        <td className="num" style={{ fontWeight: 'bold', background: '#f9f9f9' }}>{dayTotal.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 'bold', background: '#f2f2f2' }}>
                    <td>รวม</td>
                    {services.filter(s => stats.some(r => r.serviceId === s.id)).map(s => (
                      <td key={s.id} className="num">
                        {stats.filter(r => r.serviceId === s.id).reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
                      </td>
                    ))}
                    <td className="num">{stats.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Part 2: Service Summary */}
            <div className="report-section" style={{ width: '100%', marginTop: '30px' }}>
              <h4 style={{ borderBottom: '2px solid #000', paddingBottom: '5px', marginBottom: '10px' }}>สรุปแยกประเภทบริการ</h4>
              <table className="report-table bordered company-v2-summary-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', paddingLeft: '15px' }}>ประเภทบริการ</th>
                    <th style={{ width: '100px' }}>ชิ้น</th>
                    <th style={{ width: '150px' }}>เงิน</th>
                  </tr>
                </thead>
                <tbody>
                  {services
                    .filter(s => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'].includes(s.reportGroupId))
                    .reduce((acc, s) => {
                      // Group by reportGroupId to match the summary style
                      const existing = acc.find(item => item.groupId === s.reportGroupId);
                      const sCount = stats.filter(r => r.serviceId === s.id).reduce((sum, r) => sum + r.count, 0);
                      const sAmount = stats.filter(r => r.serviceId === s.id).reduce((sum, r) => sum + r.amount, 0);
                      
                      if (existing) {
                        existing.count += sCount;
                        existing.amount += sAmount;
                      } else {
                        acc.push({
                          groupId: s.reportGroupId,
                          name: s.name.split('-')[0], // Simplified name
                          fullName: s.name,
                          count: sCount,
                          amount: sAmount
                        });
                      }
                      return acc;
                    }, [])
                    .map(item => (
                      <tr key={item.groupId}>
                        <td style={{ textAlign: 'left', paddingLeft: '15px' }}>{item.fullName}</td>
                        <td className="num">{item.count.toLocaleString()}</td>
                        <td className="num">{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 'bold', background: '#f2f2f2' }}>
                    <td style={{ textAlign: 'right', paddingRight: '15px' }}>รวมทั้งสิ้น</td>
                    <td className="num">{stats.reduce((sum, r) => sum + r.count, 0).toLocaleString()}</td>
                    <td className="num">{stats.reduce((sum, r) => sum + r.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {reportType === 'company_summary' && (
          <div className="print-company-summary portrait">
            <header className="report-header-v2" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: '0' }}>สรุปรายละเอียดรายได้บริการชำระตราไปรษณียากรด้วยเครื่องประทับ</h2>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '8px 0' }}>{selectedReportCompany?.name || ''}</h3>
              <p style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '5px 0' }}>ประจำเดือน {safeFormat(reportMonth, 'MMMM yyyy', { locale: th })}</p>
            </header>

            <table className="report-table bordered pn3-v2-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingLeft: '15px' }}>ประเภทบริการ</th>
                  <th style={{ width: '120px' }}>ชิ้น</th>
                  <th style={{ width: '180px' }}>เงิน</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: '1', name: 'รายได้ไปรษณียภัณฑ์ในประเทศ-ธรรมดา' },
                  { id: '2', name: 'รายได้ไปรษณียภัณฑ์ในประเทศ-รับรอง' },
                  { id: '3', name: 'รายได้ไปรษณียภัณฑ์ในประเทศ-ลงทะเบียน' },
                  { id: '4', name: 'รายได้ไปรษณียภัณฑ์ในประเทศ-รับประกัน' },
                  { id: '5', name: 'รายได้ไปรษณียภัณฑ์ระหว่างประเทศ-ธรรมดา' },
                  { id: '6', name: 'รายได้ไปรษณียภัณฑ์ระหว่างประเทศ-ลงทะเบียน' },
                  { id: '7', name: 'รายได้ไปรษณียภัณฑ์ระหว่างประเทศ-รับประกัน' },
                  { id: '8', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ในประเทศ-ธรรมดา' },
                  { id: '9', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ในประเทศ-รับประกัน' },
                  { id: '10', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ระหว่างประเทศ-ธรรมดา' },
                  { id: '11', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ระหว่างประเทศรับ-รับประกัน' },
                  { id: '12', name: 'รายได้ไปรษณีย์ด่วนพิเศษในประเทศ' },
                  { id: '13', name: 'รายได้ไปรษณีย์ด่วนพิเศษระหว่างประเทศ' },
                  { id: '14', name: 'รายได้บริการธุรกิจตอบรับ-ในประเทศ' }
                ].map((row) => {
                  const groupRecords = stats.filter(r => {
                    const s = services.find(serv => serv.id === r.serviceId);
                    return s && s.reportGroupId === row.id;
                  });
                  const gCount = groupRecords.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
                  const gAmount = groupRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                  
                  return (
                    <tr key={row.id}>
                      <td style={{ textAlign: 'left', paddingLeft: '15px' }}>{row.name}</td>
                      <td className="num">{gCount > 0 ? gCount.toLocaleString() : '0'}</td>
                      <td className="num">{gAmount > 0 ? gAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 'bold', background: '#f2f2f2' }}>
                  <td style={{ textAlign: 'right', paddingRight: '15px' }}>รวมทั้งสิ้น</td>
                  <td className="num">
                    {stats.reduce((sum, r) => sum + (Number(r.count) || 0), 0).toLocaleString()}
                  </td>
                  <td className="num" style={{ borderBottom: 'double 3px #000' }}>
                    {stats.reduce((sum, r) => sum + (Number(r.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {reportType === 'admin' && (
          <div className="print-admin portrait">
            <header className="report-header" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 'bold', borderBottom: 'none' }}>ประจำเดือน {safeFormat(reportMonth, 'MMMM yyyy', { locale: th })}</p>
            </header>
            
            <div className="admin-simple-layout">
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.2rem' }}>เครื่องประทับ</h3>
              <table className="report-table bordered shadow-none">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', width: '350px' }}>ประเภทบริการ</th>
                    <th style={{ width: '100px' }}>ชิ้น</th>
                    <th style={{ width: '150px' }}>เงิน</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryData.map(s => (
                    <tr key={s.id}>
                      <td style={{ textAlign: 'left' }}>{s.name}</td>
                      <td className="num">{s.count.toLocaleString()}</td>
                      <td className="num">{s.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 'bold' }}>
                    <td style={{ textAlign: 'left' }}>รวม</td>
                    <td className="num">{summaryData.reduce((sum, s) => sum + s.count, 0).toLocaleString()}</td>
                    <td className="num">{summaryData.reduce((sum, s) => sum + s.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {reportType === 'admin_v2' && (
          <div className="print-admin-v2 portrait">
            <header className="report-header-v2" style={{ marginBottom: '10px', textAlign: 'left', paddingLeft: '50px' }}>
              <p style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                {safeFormat(reportMonth, 'MMM-yy', { locale: th })}
              </p>
            </header>
            
            <div className="admin-v2-grid">
              {/* Table 1: เครื่องประทับ (Circle) */}
              <div className="admin-v2-section table-main">
                <table className="report-table bordered compact-v2">
                  <thead>
                    <tr>
                      <th style={{ width: '220px' }}>เครื่องประทับ</th>
                      <th style={{ width: '80px' }}>ชิ้น</th>
                      <th style={{ width: '120px' }}>เงิน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'จดหมายธรรมดาในฯ', ids: ['1'] },
                      { label: 'สิ่งพิมพ์ธรรมดาในฯ', ids: ['17'] },
                      { label: 'ไปรษณีย์บัตร', ids: ['18'] },
                      { label: 'จดหมายธรรมดาต่างฯ', ids: ['5'] },
                      { label: 'สิ่งพิมพ์ธรรมดาต่างฯ', ids: ['19'] },
                      { label: 'ไปรษณีย์บัตรต่างฯ', ids: ['20'] },
                      { label: 'ลงทะเบียนในฯ', ids: ['3', '15'] },
                      { label: 'ลงทะเบียนต่างฯ', ids: ['6', '16'] },
                      { label: 'พัสดุในฯ', ids: ['8'] },
                      { label: 'พัสดุต่างฯ', ids: ['10'] },
                      { label: 'พัสดุย่อย', ids: ['21'] },
                      { label: 'รับประกัน', ids: ['4', '7', '9', '11'] },
                      { label: 'รับรอง', ids: ['2'] },
                      { label: 'ems ในฯ', ids: ['12'] },
                      { label: 'ems ต่างฯ', ids: ['13'] }
                    ].map(row => {
                      const rowRecords = stats.filter(r => row.ids.includes(r.serviceId));
                      const count = rowRecords.reduce((sum, r) => sum + r.count, 0);
                      const amount = rowRecords.reduce((sum, r) => sum + r.amount, 0);
                      return (
                        <tr key={row.label}>
                          <td style={{ textAlign: 'left' }}>{row.label}</td>
                          <td className="num">{count > 0 ? count.toLocaleString() : ''}</td>
                          <td className="num">{amount > 0 ? amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 'bold' }}>
                      <td style={{ textAlign: 'right' }}>รวม</td>
                      <td className="num">{
                        [ '1', '17', '18', '5', '19', '20', '3', '15', '6', '16', '8', '10', '21', '4', '7', '9', '11', '2', '12', '13' ]
                          .reduce((sum, id) => sum + stats.filter(r => r.serviceId === id).reduce((s, r) => s + r.count, 0), 0)
                          .toLocaleString()
                      }</td>
                      <td className="num">{
                        [ '1', '17', '18', '5', '19', '20', '3', '15', '6', '16', '8', '10', '21', '4', '7', '9', '11', '2', '12', '13' ]
                          .reduce((sum, id) => sum + stats.filter(r => r.serviceId === id).reduce((s, r) => s + r.amount, 0), 0)
                          .toLocaleString(undefined, { minimumFractionDigits: 2 })
                      }</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Table 2 & 3: รายเดือนเอกชน / รายเดือนราชการ */}
              <div className="admin-v2-row">
                <div className="admin-v2-section">
                  <table className="report-table bordered compact-v2">
                    <thead>
                      <tr>
                        <th style={{ width: '150px' }}>รายเดือนเอกชน</th>
                        <th style={{ width: '60px' }}>ชิ้น</th>
                        <th style={{ width: '100px' }}>เงิน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        'จดหมายธรรมดาในฯ', 'สิ่งพิมพ์ธรรมดาในฯ', 'ไปรษณีย์บัตร',
                        'จดหมายธรรมดาต่างฯ', 'สิ่งพิมพ์ธรรมดาต่างฯ', 'ไปรษณีย์บัตรต่างฯ',
                        'ลงทะเบียนในฯ', 'ลงทะเบียนต่างฯ', 'พัสดุในฯ', 'พัสดุต่างฯ',
                        'พัสดุย่อย', 'รับประกัน', 'รับรอง', 'EMSใน', 'EMSต่าง'
                      ].map(label => (
                        <tr key={label}>
                          <td style={{ textAlign: 'left' }}>{label}</td><td></td><td></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr><td style={{ textAlign: 'right' }}>รวม</td><td className="num">0</td><td className="num">0.00</td></tr>
                    </tfoot>
                  </table>
                </div>

                <div className="admin-v2-section">
                  <table className="report-table bordered compact-v2">
                    <thead>
                      <tr>
                        <th style={{ width: '150px' }}>รายเดือนราชการ</th>
                        <th style={{ width: '60px' }}>ชิ้น</th>
                        <th style={{ width: '100px' }}>เงิน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        'จดหมายธรรมดาในฯ', 'สิ่งพิมพ์ธรรมดาในฯ', 'ไปรษณีย์บัตร',
                        'จดหมายธรรมดาต่างฯ', 'สิ่งพิมพ์ธรรมดาต่างฯ', 'ไปรษณีย์บัตรต่างฯ',
                        'ลงทะเบียนในฯ', 'ลงทะเบียนต่างฯ', 'พัสดุในฯ', 'พัสดุต่างฯ',
                        'พัสดุย่อย', 'รับประกัน', 'EMSใน', 'EMSต่าง'
                      ].map(label => (
                        <tr key={label}>
                          <td style={{ textAlign: 'left' }}>{label}</td><td></td><td></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr><td style={{ textAlign: 'right' }}>รวม</td><td className="num">0</td><td className="num">0.00</td></tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Table 4: เงินสด */}
              <div className="admin-v2-section" style={{ width: '50%' }}>
                <table className="report-table bordered compact-v2">
                  <thead>
                    <tr>
                      <th style={{ width: '150px' }}>เงินสด</th>
                      <th style={{ width: '60px' }}>ชิ้น</th>
                      <th style={{ width: '100px' }}>เงิน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      'จดหมายธรรมดาในฯ', 'สิ่งพิมพ์ธรรมดาในฯ', 'ไปรษณีย์บัตร',
                      'พัสดุในฯ', 'ลงทะเบียนในฯ', 'ตราสิน', 'รับรอง'
                    ].map(label => (
                      <tr key={label}>
                        <td style={{ textAlign: 'left' }}>{label}</td><td></td><td></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><td style={{ textAlign: 'right' }}>รวม</td><td className="num">0.00</td><td className="num">0.00</td></tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {reportType === 'machine_v2' && (
          <div className="print-machine-v2 portrait">
            <header className="report-header-v3" style={{ textAlign: 'center', marginBottom: '1rem', padding: '0 50px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0' }}>บัญชีสรุปการใช้เครื่องประทับไปรษณียากร</h3>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '2px 0' }}>ที่ทำการไปรษณีย์กลาง 10501 สังกัด ปน.3</h3>
              <p style={{ marginTop: '0.5rem', fontSize: '1.0rem', fontWeight: 'bold' }}>
                ประจำเดือน {safeFormat(reportMonth, 'MMMM yyyy', { locale: th })}
              </p>
            </header>

            <table className="report-table bordered machine-v2-table">
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: '80px' }}>เลขที่อนุญาต</th>
                  <th rowSpan={2}>ชื่อผู้ใช้บริการ</th>
                  <th rowSpan={2} style={{ width: '70px' }}>จำนวน<br/>ชิ้น</th>
                  <th rowSpan={2} style={{ width: '90px' }}>ค่าไปรษณียากร<br/>บาท</th>
                  <th colSpan={2}>เงินในเครื่องมือฝากส่งครั้งล่าสุด</th>
                </tr>
                <tr>
                  <th style={{ width: '100px' }}>แถวบน (ยอดคงเหลือ )</th>
                  <th style={{ width: '100px' }}>แถวล่าง (ยอดสะสม )</th>
                </tr>
              </thead>
              <tbody>
                {companies
                  .filter(c => c.showInReport)
                  .sort((a,b) => (a.order || 0) - (b.order || 0))
                  .map((officialCompany) => {
                  const code = officialCompany.code;
                  const officialName = officialCompany.name || '';
                  
                  // Extract core name for fuzzy matching (removing common prefixes/suffixes)
                  const cleanName = (name) => {
                    if (!name) return "";
                    return name
                      .replace(/บ\.?|บจก\.?|บริษัท|หสน\.?|หจก\.?|จก\.?|\(มหาชน\)/g, "")
                      .replace(/\s+/g, "")
                      .trim();
                  };
                  
                  const targetCoreName = cleanName(officialName);
                  
                  // Find all companies that should be aggregated into this row
                  const matchingCompanyIds = companies
                    .filter(comp => {
                      if (comp.code === code && code) return true;
                      if (!comp.code || comp.code === "-") {
                        const compCoreName = cleanName(comp.name);
                        // If core names are very similar, or one contains the other (above length 5)
                        if (targetCoreName && compCoreName) {
                          if (compCoreName === targetCoreName) return true;
                          if (compCoreName.includes(targetCoreName) && targetCoreName.length > 5) return true;
                          if (targetCoreName.includes(compCoreName) && compCoreName.length > 5) return true;
                        }
                      }
                      return false;
                    })
                    .map(comp => comp.id);

                  const companyRecords = stats.filter(r => matchingCompanyIds.includes(r.companyId));
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
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 'bold' }}>
                  <td colSpan={2} style={{ textAlign: 'right', paddingRight: '10px' }}>รวมทั้งสิ้น</td>
                  <td className="num">{
                    companies
                      .filter(c => c.showInReport)
                      .reduce((sum, officialCompany) => {
                        const code = officialCompany.code;
                        const officialName = officialCompany.name || "";
                        const cleanName = (name) => {
                          if (!name) return "";
                          return name.replace(/บ\.?|บจก\.?|บริษัท|หสน\.?|หจก\.?|จก\.?|\(มหาชน\)/g, "").replace(/\s+/g, "").trim();
                        };
                        const targetCoreName = cleanName(officialName);
                        
                        const matchingCompanyIds = companies
                          .filter(comp => {
                            if (comp.code === code && code) return true;
                            if (!comp.code || comp.code === "-") {
                              const compCoreName = cleanName(comp.name);
                              if (targetCoreName && compCoreName && (compCoreName === targetCoreName || (compCoreName.includes(targetCoreName) && targetCoreName.length > 5))) return true;
                            }
                            return false;
                          })
                          .map(comp => comp.id);
                        
                        return sum + stats.filter(r => matchingCompanyIds.includes(r.companyId)).reduce((s, r) => s + (Number(r.count) || 0), 0);
                      }, 0).toLocaleString()
                  }</td>
                  <td className="num">{
                    companies
                      .filter(c => c.showInReport)
                      .reduce((sum, officialCompany) => {
                        const code = officialCompany.code;
                        const officialName = officialCompany.name || "";
                        const cleanName = (name) => {
                          if (!name) return "";
                          return name.replace(/บ\.?|บจก\.?|บริษัท|หสน\.?|หจก\.?|จก\.?|\(มหาชน\)/g, "").replace(/\s+/g, "").trim();
                        };
                        const targetCoreName = cleanName(officialName);
                        const matchingCompanyIds = companies
                          .filter(comp => {
                            if (comp.code === code && code) return true;
                            if (!comp.code || comp.code === "-") {
                              const compCoreName = cleanName(comp.name);
                              if (targetCoreName && compCoreName && (compCoreName === targetCoreName || (compCoreName.includes(targetCoreName) && targetCoreName.length > 5))) return true;
                            }
                            return false;
                          })
                          .map(comp => comp.id);
                        
                        return sum + stats.filter(r => matchingCompanyIds.includes(r.companyId)).reduce((s, r) => s + (Number(r.amount) || 0), 0);
                      }, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })
                  }</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {reportType === 'machine' && (
          <div className="print-machine portrait">
            <header className="report-header" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>บัญชีสรุปการใช้เครื่องประทับไปรษณียากร</h3>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>ที่ทำการไปรษณีย์กลาง 10501 สังกัด ปน.3</h3>
              <p style={{ marginTop: '0.5rem', fontSize: '1rem' }}>ประจำเดือน {safeFormat(reportMonth, 'MMMM yyyy', { locale: th })}</p>
            </header>
            <table className="report-table bordered machine-report-table">
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: '100px' }}>รหัส</th>
                  <th rowSpan={2}>รายชื่อผู้รับบริการ</th>
                  <th rowSpan={2} style={{ width: '80px' }}>จำนวน/ชิ้น</th>
                  <th rowSpan={2} style={{ width: '120px' }}>ยอดเงินบาท/บาท</th>
                  <th colSpan={2}>เงินในรหัสเครื่อง ณ ปรับตั้งครั้งสุดท้าย</th>
                </tr>
                <tr>
                  <th style={{ width: '100px' }}>แถวบน<br/>(ยอดคงเหลือ)</th>
                  <th style={{ width: '100px' }}>แถวล่าง<br/>(ยอดสะสม)</th>
                </tr>
              </thead>
              <tbody>
                {companies
                  .filter(c => c.showInReport)
                  .sort((a,b) => (a.order || 0) - (b.order || 0))
                  .map((c) => {
                  const companyRecords = stats.filter(r => r.companyId === c.id);
                  const count = companyRecords.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
                  const amount = companyRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                  
                  // Get the latest recorded machine status for this company in this month
                  const latestRecordWithMachineStatus = [...companyRecords]
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .find(r => r.machineRemaining !== null || r.machineAccumulated !== null);
                    
                  const remaining = latestRecordWithMachineStatus?.machineRemaining;
                  const accumulated = latestRecordWithMachineStatus?.machineAccumulated;

                  if (count === 0 && !remaining && !accumulated) return null;
                  
                  return (
                    <tr key={c.id}>
                      <td>{c.code || '-'}</td>
                      <td style={{ textAlign: 'left' }}>{c.name}</td>
                      <td className="num">{count > 0 ? count.toLocaleString() : '-'}</td>
                      <td className="num">{amount > 0 ? amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                      <td className="num">{remaining != null ? remaining.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}</td>
                      <td className="num">{accumulated != null ? accumulated.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 'bold' }}>
                  <td colSpan={2} style={{ textAlign: 'right' }}>รวมทั้งสิ้น</td>
                  <td className="num">{stats.reduce((sum, r) => sum + (Number(r.count) || 0), 0).toLocaleString()}</td>
                  <td className="num">{stats.reduce((sum, r) => sum + (Number(r.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
      {showWarningModal && (
        <div className="modal-overlay no-print">
          <div className="modal-content">
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️ ตรวจพบข้อมูลไม่ครบถ้วน</span>
            </div>
            <div className="modal-body" style={{ color: 'var(--text-main)' }}>
              <p>พบว่าบริษัทดังต่อไปนี้ <strong>ยังไม่มีการบันทึกยอดคงเหลือ (แถวบน) และยอดสะสม (แถวล่าง)</strong> ในวันสุดท้ายที่มีการบันทึกข้อมูลของเดือนนี้:</p>
              <div style={{ marginTop: '0.75rem', maxHeight: '220px', overflowY: 'auto' }}>
                {missingReadings.map((item, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '6px' }}>
                    <div>
                      <strong>{item.companyName}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>วันล่าสุด: {safeFormat(item.date, 'd MMMM yyyy', { locale: th })}</div>
                    </div>
                    <button 
                      type="button" 
                      className="btn-goto-edit" 
                      style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                      onClick={() => {
                        setNavigationTarget({ companyId: item.companyId, date: item.date });
                        setView('entry');
                        setShowWarningModal(false);
                      }}
                    >
                      ✏️ ไปกรอกยอดเครื่อง
                    </button>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                คุณต้องการทำอย่างไร?
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }} onClick={() => {
                const first = missingReadings[0];
                setNavigationTarget({ companyId: first.companyId, date: first.date });
                setView('entry');
                setShowWarningModal(false);
              }}>
                ตกลง (ไปกรอกข้อมูลที่ขาด)
              </button>
              <button className="btn btn-primary" onClick={() => {
                setShowWarningModal(false);
                setTimeout(() => window.print(), 100);
              }}>
                ต้องการพิมพ์ต่อ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Missing Meter Helper Modal */}
      {missingMeterDetail && (
        <div className="missing-meter-modal-overlay" onClick={() => setMissingMeterDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="missing-meter-modal" onClick={e => e.stopPropagation()} style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div className="flex-between mb-4">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontSize: '1.15rem' }}>
                <AlertCircle size={22} />
                <span>วันที่คีย์ล่าสุด (ที่ยังขาดยอดเครื่อง)</span>
              </h3>
              <button type="button" className="btn-icon" onClick={() => setMissingMeterDetail(null)} style={{ fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--glass-border)', marginBottom: '1rem' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>
                🏢 {missingMeterDetail.company.code ? `[${missingMeterDetail.company.code}] ` : ''}{missingMeterDetail.company.name}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                ยอดรวมทั้งเดือน: <strong>{missingMeterDetail.count.toLocaleString()} ชิ้น</strong> | <strong>฿{missingMeterDetail.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</strong>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                📅 วันที่พบคีย์รายการล่าสุดในเดือนนี้:
              </label>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(37, 99, 235, 0.12)', color: '#2563eb', border: '1px solid rgba(37, 99, 235, 0.3)', padding: '8px 14px', borderRadius: '20px', fontSize: '0.95rem', fontWeight: 700 }}>
                <Calendar size={18} />
                <span>
                  {missingMeterDetail.latestDate 
                    ? safeFormat(missingMeterDetail.latestDate, 'EEEEที่ d MMMM yyyy', { locale: th })
                    : 'ไม่พบวันที่'}
                </span>
              </div>
            </div>

            {/* Breakdown of days in this month */}
            {missingMeterDetail.dayBreakdown && missingMeterDetail.dayBreakdown.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  🗓️ วันที่มีรายการคีย์ทั้งหมดในเดือนนี้ ({missingMeterDetail.dayBreakdown.length} วัน):
                </label>
                <div style={{ maxHeight: '120px', overflowY: 'auto', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', padding: '6px 10px', fontSize: '0.82rem' }}>
                  {missingMeterDetail.dayBreakdown.map((d, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < missingMeterDetail.dayBreakdown.length - 1 ? '1px dashed rgba(255,255,255,0.08)' : 'none' }}>
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
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', padding: '0.8rem', fontSize: '0.92rem', fontWeight: 700 }}
              >
                ✏️ ไปที่หน้าบันทึกข้อมูลของวันที่ {safeFormat(missingMeterDetail.latestDate, 'd MMM yyyy', { locale: th })} (เพื่อกรอกยอดเครื่อง)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const IMPORT_FIELD_SETS = {
  records: [
    ['date', 'วันที่', true], ['company', 'บริษัท/หน่วยงาน', true], ['service', 'บริการ', true],
    ['count', 'จำนวนชิ้น', true], ['amount', 'จำนวนเงิน', true], ['category', 'ใน/ต่างประเทศ', false],
    ['paymentMethod', 'วิธีชำระเงิน', false], ['machineRemaining', 'ยอดคงเหลือเครื่อง', false],
    ['machineAccumulated', 'ยอดสะสมเครื่อง', false], ['topUpAmount', 'ยอดเติม', false],
  ],
  companies: [['code', 'รหัสบริษัท', false], ['name', 'ชื่อบริษัท/หน่วยงาน', true], ['sector', 'เอกชน/ราชการ', false], ['paymentMethod', 'วิธีชำระเงิน', false]],
  services: [['code', 'รหัสบริการ', false], ['name', 'ชื่อบริการ', true], ['category', 'ใน/ต่างประเทศ', false]],
  reference: [],
};

const normalizeImportCell = value => {
  if (value == null) return '';
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    if ('result' in value) return normalizeImportCell(value.result);
    if (Array.isArray(value.richText)) return value.richText.map(item => item.text || '').join('');
    if ('text' in value) return value.text;
  }
  return value;
};

const parseCsvRows = text => {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(value); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value); if (row.some(cell => String(cell).trim())) rows.push(row); row = []; value = '';
    } else value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
};

const ImportStudio = () => {
  const { records, setRecords, companies, setCompanies, services, setServices } = useApp();
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [headerRow, setHeaderRow] = useState(1);
  const [dataType, setDataType] = useState('reference');
  const [datasetName, setDatasetName] = useState('');
  const [mapping, setMapping] = useState({});
  const [status, setStatus] = useState('');
  const activeRows = sheets[sheetIndex]?.rows || [];
  const headers = (activeRows[headerRow - 1] || []).map((value, index) => String(normalizeImportCell(value) || `คอลัมน์ ${index + 1}`).trim());
  const dataRows = activeRows.slice(headerRow).filter(row => row.some(value => String(normalizeImportCell(value)).trim() !== ''));

  const autoMap = (nextType, nextHeaders = headers) => {
    const aliases = {
      date: ['วันที่','date'], company: ['บริษัท','หน่วยงาน','ลูกค้า','ชื่อผู้ใช้บริการ'], service: ['บริการ','ประเภทบริการ','service'],
      count: ['จำนวนชิ้น','ชิ้น','จำนวน'], amount: ['จำนวนเงิน','ยอดเงิน','บาท','amount'], category: ['ใน/ต่างประเทศ','หมวด','category'],
      paymentMethod: ['วิธีชำระ','การจ่ายเงิน','payment'], machineRemaining: ['คงเหลือ','แถวบน'], machineAccumulated: ['สะสม','แถวล่าง'], topUpAmount: ['ยอดเติม','เติมเงิน'],
      code: ['รหัส','เลขอนุญาต','code'], name: ['ชื่อบริษัท','ชื่อหน่วยงาน','ชื่อบริการ','รายชื่อ','name'], sector: ['เอกชน/ราชการ','ประเภทลูกค้า','sector'],
    };
    const next = {};
    (IMPORT_FIELD_SETS[nextType] || []).forEach(([key]) => {
      const index = nextHeaders.findIndex(header => (aliases[key] || []).some(alias => String(header).toLowerCase().includes(alias.toLowerCase())));
      if (index >= 0) next[key] = String(index);
    });
    setMapping(next);
  };

  const detectHeaderRow = rows => {
    const keywords = ['วันที่','บริษัท','หน่วยงาน','บริการ','จำนวน','ยอดเงิน','บาท','รหัส','รายชื่อ'];
    let best = 0, bestScore = -1;
    rows.slice(0, 30).forEach((row, index) => {
      const score = row.reduce((sum, cell) => sum + keywords.filter(word => String(normalizeImportCell(cell)).includes(word)).length, 0);
      if (score > bestScore) { bestScore = score; best = index; }
    });
    return best + 1;
  };

  const handleFile = async file => {
    if (!file) return;
    setStatus('กำลังอ่านไฟล์...'); setFileName(file.name);
    try {
      const extension = file.name.split('.').pop().toLowerCase();
      let parsedSheets = [];
      if (extension === 'csv') {
        parsedSheets = [{ name: file.name, rows: parseCsvRows(await file.text()) }];
      } else if (extension === 'json') {
        const value = JSON.parse(await file.text());
        const rows = Array.isArray(value) ? value : (Array.isArray(value.rows) ? value.rows : []);
        const keys = [...new Set(rows.flatMap(item => Object.keys(item || {})))];
        parsedSheets = [{ name: file.name, rows: [keys, ...rows.map(item => keys.map(key => item?.[key] ?? ''))] }];
      } else {
        const ExcelModule = await import('exceljs');
        const ExcelJS = ExcelModule.default || ExcelModule;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        workbook.eachSheet(worksheet => {
          const rows = [];
          worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber <= 100000) rows[rowNumber - 1] = row.values.slice(1).map(normalizeImportCell);
          });
          parsedSheets.push({ name: worksheet.name, rows });
        });
      }
      if (!parsedSheets.length) throw new Error('ไม่พบชีตหรือแถวข้อมูล');
      setSheets(parsedSheets); setSheetIndex(0);
      const detected = detectHeaderRow(parsedSheets[0].rows);
      setHeaderRow(detected);
      const detectedHeaders = (parsedSheets[0].rows[detected - 1] || []).map((value, index) => String(normalizeImportCell(value) || `คอลัมน์ ${index + 1}`).trim());
      autoMap(dataType, detectedHeaders);
      setStatus(`อ่านสำเร็จ ${parsedSheets.length} ชีต — กรุณาตรวจตัวอย่างก่อนนำเข้า`);
    } catch (error) {
      console.error(error); setSheets([]); setStatus('อ่านไฟล์ไม่สำเร็จ กรุณาตรวจชนิดไฟล์หรือเลือกไฟล์ใหม่');
    }
  };

  const getValue = (row, field) => mapping[field] == null ? '' : normalizeImportCell(row[Number(mapping[field])]);
  const toNumber = value => Number(String(value ?? '').replace(/,/g, '')) || 0;
  const toDate = value => {
    if (value instanceof Date) return format(value, 'yyyy-MM-dd');
    if (typeof value === 'number' && value > 20000) return format(new Date(Date.UTC(1899, 11, 30 + value)), 'yyyy-MM-dd');
    const text = String(value || '').trim();
    const match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (match) { const year = Number(match[3]) > 2400 ? Number(match[3]) - 543 : Number(match[3]); return `${year}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`; }
    const parsed = new Date(text); return isNaN(parsed.getTime()) ? '' : format(parsed, 'yyyy-MM-dd');
  };
  const slug = text => String(text || '').trim().toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  const inferColumnType = columnIndex => {
    const values = dataRows.slice(0, 200).map(row => normalizeImportCell(row[columnIndex])).filter(value => value !== '' && value != null);
    if (!values.length) return 'empty';
    const numberCount = values.filter(value => typeof value === 'number' || /^-?[\d,]+(?:\.\d+)?$/.test(String(value).trim())).length;
    const dateCount = values.filter(value => value instanceof Date || /^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(String(value).trim()) || /^\d{4}-\d{2}-\d{2}/.test(String(value).trim())).length;
    if (numberCount / values.length >= .8) return 'number';
    if (dateCount / values.length >= .8) return 'date';
    return 'text';
  };

  const commitImport = async () => {
    const required = (IMPORT_FIELD_SETS[dataType] || []).filter(([, , isRequired]) => isRequired);
    const missing = required.filter(([key]) => mapping[key] == null).map(([, label]) => label);
    if (missing.length) { alert(`กรุณาจับคู่คอลัมน์: ${missing.join(', ')}`); return; }
    if (!dataRows.length) { alert('ไม่พบแถวข้อมูลสำหรับนำเข้า'); return; }
    const mappedColumns = new Set(Object.values(mapping).map(Number));
    const extrasFor = row => Object.fromEntries(headers.map((header, index) => [header, normalizeImportCell(row[index])]).filter(([, value], index) => !mappedColumns.has(index) && value !== ''));
    const approved = confirm(`เตรียมนำเข้า ${dataRows.length.toLocaleString()} แถว จากชีต “${sheets[sheetIndex].name}”\nระบบจะเพิ่มข้อมูลใหม่เท่านั้นและไม่เขียนทับข้อมูลเดิม\n\nกด OK เพื่อยืนยัน`);
    if (!approved) return;
    await setIdb('postage_import_recovery_latest', {
      records, companies, services,
      createdAt: new Date().toISOString(),
      beforeImport: { fileName, sheetName: sheets[sheetIndex].name, dataType },
    });
    if (dataType === 'reference') {
      const key = `postage_custom_import_${Date.now()}`;
      const schema = headers.map((name, index) => ({ name, type: inferColumnType(index), index }));
      const resolvedDatasetName = datasetName.trim() || `${fileName} — ${sheets[sheetIndex].name}`;
      await setIdb(key, { name: resolvedDatasetName, fileName, sheetName: sheets[sheetIndex].name, headers, schema, rows: dataRows.map(row => headers.map((_, index) => normalizeImportCell(row[index]))), importedAt: new Date().toISOString(), formatVersion: 1 });
      const catalog = JSON.parse(localStorage.getItem('postage_custom_import_catalog') || '[]');
      localStorage.setItem('postage_custom_import_catalog', JSON.stringify([...catalog, { key, name: resolvedDatasetName, fileName, sheetName: sheets[sheetIndex].name, rowCount: dataRows.length, columnCount: headers.length, schema, importedAt: new Date().toISOString() }]));
      setStatus(`เก็บชุดข้อมูล “${resolvedDatasetName}” แล้ว ${dataRows.length.toLocaleString()} แถว ${headers.length.toLocaleString()} คอลัมน์ โดยไม่บังคับรูปแบบ`); return;
    }
    if (dataType === 'companies') {
      const existing = new Set(companies.map(item => `${String(item.code).toLowerCase()}|${String(item.name).toLowerCase()}`));
      const additions = dataRows.map((row, index) => ({ id: `import-company-${Date.now()}-${index}`, code: String(getValue(row,'code') || '').trim(), name: String(getValue(row,'name') || '').trim(), sector: String(getValue(row,'sector') || '').trim(), paymentMethod: String(getValue(row,'paymentMethod') || '').trim(), extraFields: extrasFor(row) })).filter(item => item.name && !existing.has(`${item.code.toLowerCase()}|${item.name.toLowerCase()}`));
      setCompanies(prev => [...prev, ...additions]); setStatus(`เพิ่มบริษัท/หน่วยงาน ${additions.length.toLocaleString()} รายการ และข้ามข้อมูลซ้ำ ${dataRows.length - additions.length} รายการ`); return;
    }
    if (dataType === 'services') {
      const existing = new Set(services.map(item => `${String(item.code).toLowerCase()}|${String(item.name).toLowerCase()}`));
      const additions = dataRows.map((row, index) => ({ id: `import-service-${Date.now()}-${index}`, code: String(getValue(row,'code') || '').trim(), name: String(getValue(row,'name') || '').trim(), category: String(getValue(row,'category')).includes('ต่าง') ? 'international' : 'domestic', extraFields: extrasFor(row) })).filter(item => item.name && !existing.has(`${item.code.toLowerCase()}|${item.name.toLowerCase()}`));
      setServices(prev => [...prev, ...additions]); setStatus(`เพิ่มบริการ ${additions.length.toLocaleString()} รายการ และข้ามข้อมูลซ้ำ ${dataRows.length - additions.length} รายการ`); return;
    }
    const nextCompanies = [...companies], nextServices = [...services];
    const imported = dataRows.map((row, index) => {
      const companyText = String(getValue(row,'company') || '').trim();
      const serviceText = String(getValue(row,'service') || '').trim();
      let company = nextCompanies.find(item => [item.id,item.code,item.name].some(value => String(value).trim().toLowerCase() === companyText.toLowerCase()));
      if (!company && companyText) { company = { id: `import-company-${slug(companyText) || index}`, code: '', name: companyText }; nextCompanies.push(company); }
      let service = nextServices.find(item => [item.id,item.code,item.name].some(value => String(value).trim().toLowerCase() === serviceText.toLowerCase()));
      if (!service && serviceText) { service = { id: `import-service-${slug(serviceText) || index}`, code: '', name: serviceText, category: String(getValue(row,'category')).includes('ต่าง') ? 'international' : 'domestic' }; nextServices.push(service); }
      return { date: toDate(getValue(row,'date')), companyId: company?.id, serviceId: service?.id, count: toNumber(getValue(row,'count')), amount: toNumber(getValue(row,'amount')), paymentMethod: String(getValue(row,'paymentMethod') || '').trim(), machineRemaining: mapping.machineRemaining == null ? null : toNumber(getValue(row,'machineRemaining')), machineAccumulated: mapping.machineAccumulated == null ? null : toNumber(getValue(row,'machineAccumulated')), topUpAmount: toNumber(getValue(row,'topUpAmount')), extraFields: extrasFor(row), importSource: { fileName, sheetName: sheets[sheetIndex].name, row: headerRow + index + 1 }, timestamp: Date.now() + index };
    }).filter(item => item.date && item.companyId && item.serviceId);
    const keyOf = item => [item.date,item.companyId,item.serviceId,item.count,item.amount].join('|');
    const existingKeys = new Set(records.map(keyOf));
    const additions = imported.filter(item => !existingKeys.has(keyOf(item)));
    setCompanies(nextCompanies); setServices(nextServices); setRecords(prev => [...prev, ...additions]);
    setStatus(`นำเข้าสำเร็จ ${additions.length.toLocaleString()} รายการ — ข้ามข้อมูลซ้ำ/ไม่ครบ ${dataRows.length - additions.length} รายการ`);
  };

  return (
    <div className="glass-card mt-8 import-studio">
      <div className="flex-between"><div><h2>นำเข้าข้อมูลแบบเลือกได้</h2><p className="text-muted">รองรับ Excel, XLSM, CSV และ JSON — ดูตัวอย่างและจับคู่คอลัมน์ก่อนยืนยัน</p></div><label className="btn btn-primary"><Upload size={18}/> เลือกไฟล์<input type="file" accept=".xlsx,.xlsm,.csv,.json" hidden onChange={event => handleFile(event.target.files?.[0])}/></label></div>
      {status && <div className="import-status">{status}</div>}
      {sheets.length > 0 && <>
        <div className="import-controls">
          <label>รูปแบบการนำเข้า<select className="input-select" value={dataType} onChange={event => { setDataType(event.target.value); autoMap(event.target.value); }}><option value="reference">ข้อมูลทั่วไป — ไม่กำหนดรูปแบบ</option><option value="records">เชื่อมเป็นรายการไปรษณีย์รายวัน</option><option value="companies">เชื่อมเป็นทะเบียนบริษัท/หน่วยงาน</option><option value="services">เชื่อมเป็นทะเบียนบริการ</option></select></label>
          <label>ชีต<select className="input-select" value={sheetIndex} onChange={event => { const index = Number(event.target.value); setSheetIndex(index); const detected = detectHeaderRow(sheets[index].rows); setHeaderRow(detected); autoMap(dataType, (sheets[index].rows[detected - 1] || []).map(normalizeImportCell)); }} >{sheets.map((sheet,index) => <option key={sheet.name} value={index}>{sheet.name}</option>)}</select></label>
          <label>แถวหัวตาราง<input className="compact" type="number" min="1" max={Math.max(activeRows.length,1)} value={headerRow} onChange={event => { setHeaderRow(Number(event.target.value)); setMapping({}); }}/></label>
        </div>
        {dataType === 'reference' && <div className="generic-import-box"><label>ชื่อชุดข้อมูล<input className="input-select" value={datasetName} onChange={event => setDatasetName(event.target.value)} placeholder={`${fileName} — ${sheets[sheetIndex]?.name || ''}`}/></label><div><strong>ระบบไม่บังคับชื่อคอลัมน์</strong><span>เก็บทุกคอลัมน์ตามต้นฉบับ และตรวจชนิดเป็นข้อความ ตัวเลข หรือวันที่ให้อัตโนมัติ เพื่อใช้สร้างตัวกรอง/กราฟในอนาคต</span></div></div>}
        {dataType !== 'reference' && <div className="mapping-grid">{IMPORT_FIELD_SETS[dataType].map(([key,label,required]) => <label key={key}>{label}{required && <b> *</b>}<select className="input-select" value={mapping[key] ?? ''} onChange={event => setMapping(prev => ({...prev,[key]:event.target.value === '' ? undefined : event.target.value}))}><option value="">— ไม่ได้นำเข้า —</option>{headers.map((header,index) => <option key={`${header}-${index}`} value={index}>{header}</option>)}</select></label>)}</div>}
        <div className="import-preview"><div className="flex-between"><strong>ตัวอย่าง 5 แถวแรก จากทั้งหมด {dataRows.length.toLocaleString()} แถว</strong><span>คอลัมน์อื่นจะเก็บใน “ข้อมูลเพิ่มเติม”</span></div><div className="scroll-x"><table className="grid-entry-table"><thead><tr>{headers.slice(0,10).map((header,index)=><th key={`${header}-${index}`}>{header}</th>)}</tr></thead><tbody>{dataRows.slice(0,5).map((row,rowIndex)=><tr key={rowIndex}>{headers.slice(0,10).map((_,columnIndex)=><td key={columnIndex}>{String(normalizeImportCell(row[columnIndex]) ?? '').slice(0,60)}</td>)}</tr>)}</tbody></table></div></div>
        <button className="btn btn-primary import-confirm" onClick={commitImport}>ตรวจแล้ว — เพิ่มข้อมูลโดยไม่เขียนทับของเดิม</button>
      </>}
    </div>
  );
};



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
        const match = text.match(/\{[\s\S]*\}/);
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
      if (data.records && typeof setRecords === 'function') {
        setRecords(data.records);
      }
      if (data.companies && typeof setCompanies === 'function') {
        setCompanies(data.companies);
      }
      if (data.services && typeof setServices === 'function') {
        setServices(data.services);
      }
      if (data.machineReadings && typeof setMachineReadings === 'function') {
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

const BackupManager = () => {
  const { exportData, importData } = useApp();

  return (
    <div className="glass-card mt-8">
      <h2 style={{ marginBottom: '1rem' }}>สำรองและเรียกคืนข้อมูล</h2>
      <p className="text-muted mb-4">แนะนำให้สำรองข้อมูลเป็นประจำเพื่อป้องกันข้อมูลสูญหาย</p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button className="btn btn-primary" onClick={exportData}>
          <Download size={18}/> สำรองข้อมูล (Backup)
        </button>
        <label className="btn" style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}>
          <Upload size={18}/> นำเข้าข้อมูล (Restore)
          <input 
            type="file" 
            accept=".json" 
            style={{ display: 'none' }} 
            onChange={e => e.target.files[0] && importData(e.target.files[0])} 
          />
        </label>
      </div>
    </div>
  );
};

const LogoManager = () => {
  const { 
    reportLogo, setReportLogo, 
    reportLogoSize, setReportLogoSize, 
    reportLogoAlign, setReportLogoAlign 
  } = useApp();

  return (
    <div className="glass-card mt-8">
      <h2 style={{ marginBottom: '1rem' }}>โลโก้รายงาน</h2>
      <p className="text-muted mb-4">อัปโหลดรูปภาพโลโก้ไปรษณีย์ไทยเพื่อแสดงในรายงาน (แนะนำไฟล์ PNG ที่มีพื้นหลังโปร่งใส)</p>
      
      <div className="logo-manager-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="logo-upload-section" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {reportLogo && (
            <div className="logo-preview" style={{ position: 'relative', background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <img src={reportLogo} alt="Report Logo Preview" style={{ height: '60px', objectFit: 'contain' }} />
              <button 
                className="btn-icon" 
                onClick={() => setReportLogo(null)} 
                style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#ef4444', borderRadius: '50%', color: 'white', border: 'none', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                title="ลบโลโก้"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
          <div className="upload-controls">
            <input 
              type="file" 
              id="logo-input" 
              accept="image/*" 
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setReportLogo(reader.result);
                  };
                  reader.readAsDataURL(file);
                }
              }} 
              style={{ display: 'none' }}
            />
            <button className="btn btn-secondary" onClick={() => document.getElementById('logo-input').click()} style={{ border: '1px solid var(--glass-border)' }}>
              <Upload size={18} /> {reportLogo ? 'เปลี่ยนรูปภาพโลโก้' : 'เลือกรูปภาพโลโก้'}
            </button>
          </div>
        </div>

        <div className="logo-settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <div className="setting-item">
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>ขนาดความกว้าง ({reportLogoSize}px)</label>
            <input 
              type="range" 
              min="40" 
              max="400" 
              step="10"
              value={reportLogoSize} 
              onChange={(e) => setReportLogoSize(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
          </div>
          
          <div className="setting-item">
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>ตำแหน่งวางโลโก้</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className={`btn btn-icon ${reportLogoAlign === 'left' ? 'active' : ''}`} 
                onClick={() => setReportLogoAlign('left')}
                style={{ flex: 1, background: reportLogoAlign === 'left' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: reportLogoAlign === 'left' ? 'white' : 'inherit', border: '1px solid var(--glass-border)', padding: '8px' }}
              >
                ซ้าย
              </button>
              <button 
                className={`btn btn-icon ${reportLogoAlign === 'center' ? 'active' : ''}`} 
                onClick={() => setReportLogoAlign('center')}
                style={{ flex: 1, background: reportLogoAlign === 'center' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: reportLogoAlign === 'center' ? 'white' : 'inherit', border: '1px solid var(--glass-border)', padding: '8px' }}
              >
                กลาง
              </button>
              <button 
                className={`btn btn-icon ${reportLogoAlign === 'right' ? 'active' : ''}`} 
                onClick={() => setReportLogoAlign('right')}
                style={{ flex: 1, background: reportLogoAlign === 'right' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: reportLogoAlign === 'right' ? 'white' : 'inherit', border: '1px solid var(--glass-border)', padding: '8px' }}
              >
                ขวา
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Navigation = ({ view, setView }) => {
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
};

const History = () => {
  const { 
    services, 
    companies, 
    records, 
    deleteSingleRecord, 
    addRecord 
  } = useApp();
  const [editingKey, setEditingKey] = useState(null);
  const [editData, setEditData] = useState({});
  
  // Filter & Sort State
  const [filterCompany, setFilterCompany] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const filteredAndSortedRecords = useMemo(() => {
    let result = [...(records || [])].filter(Boolean);

    // Filter by Company
    if (filterCompany !== 'all') {
      const selectedFilterCompany = companies.find(c => String(c.id) === String(filterCompany));
      result = result.filter(r => companyMatchesRecordId(selectedFilterCompany, r.companyId));
    }

    // Sort Logic
    result.sort((a, b) => {
      let valA, valB;
      
      switch (sortBy) {
        case 'date':
          valA = new Date(a.date).getTime();
          valB = new Date(b.date).getTime();
          break;
        case 'company':
          valA = findCompanyForRecord(companies, a.companyId)?.name || '';
          valB = findCompanyForRecord(companies, b.companyId)?.name || '';
          break;
        case 'amount':
          valA = Number(a.amount) || 0;
          valB = Number(b.amount) || 0;
          break;
        case 'count':
          valA = Number(a.count) || 0;
          valB = Number(b.count) || 0;
          break;
        default:
          valA = new Date(a.date).getTime();
          valB = new Date(b.date).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      
      // Secondary sort for stability (date desc, then timestamp desc)
      if (sortBy !== 'date') {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        if (da !== db) return db - da;
      }
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

    return result;
  }, [records, filterCompany, sortBy, sortOrder, companies]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const startEdit = (r, key) => {
    setEditingKey(key);
    setEditData({ ...r });
  };

  const saveEdit = () => {
    // delete old, add new
    deleteSingleRecord(editData.serviceId, editData.date, editData.companyId, editData.timestamp);
    addRecord([editData]);
    setEditingKey(null);
  };

  const hasRecords = records.length > 0;

  return (
    <div className="fade-in">
      <div className="flex-between mb-8">
        <h1 style={{ margin: 0 }}>ประวัติการบันทึก</h1>
        <div className="sort-options">
          <button className={`sort-btn ${sortBy === 'date' ? `active ${sortOrder}` : ''}`} onClick={() => toggleSort('date')}>
            <ChevronUp size={14}/> เรียงตามวันที่
          </button>
          <button className={`sort-btn ${sortBy === 'company' ? `active ${sortOrder}` : ''}`} onClick={() => toggleSort('company')}>
            <ChevronUp size={14}/> เรียงตามบริษัท
          </button>
          <button className={`sort-btn ${sortBy === 'amount' ? `active ${sortOrder}` : ''}`} onClick={() => toggleSort('amount')}>
            <ChevronUp size={14}/> เรียงตามยอดเงิน
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label>เลือกบริษัท:</label>
          <select 
            className="input-select" 
            style={{ minWidth: '250px' }}
            value={filterCompany} 
            onChange={e => setFilterCompany(e.target.value)}
          >
            <option value="all">แสดงทั้งหมด</option>
            {companies
              .filter(c => records.some(r => companyMatchesRecordId(c, r.companyId)))
              .sort((a,b) => (a.order || 0) - (b.order || 0))
              .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
            }
          </select>
        </div>
        <div className="text-muted" style={{ fontSize: '0.9rem' }}>
          พบทั้งหมด {filteredAndSortedRecords.length} รายการ
        </div>
      </div>
      
      {!hasRecords ? (
        <div className="glass-card text-center" style={{ padding: '4rem 2rem' }}>
          <p className="text-muted">ยังไม่มีข้อมูลในประวัติ</p>
        </div>
      ) : (
        <div className="glass-card">
          <div className="scroll-x history-table-container">
            <table className="grid-entry-table">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>บริษัท</th>
                  <th>บริการ</th>
                  <th>จำนวน</th>
                  <th>ยอดเงิน</th>
                  <th>คงเหลือ (แถวบน)</th>
                  <th>สะสม (แถวล่าง)</th>
                  <th>ยอดเติม</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedRecords.map((r, idx) => {
                  const s = services.find(serv => serv.id === r.serviceId);
                  const c = findCompanyForRecord(companies, r.companyId);
                  const key = `${r.date}-${r.companyId}-${r.serviceId}-${r.timestamp || idx}`;
                  const isEditing = editingKey === key;
                  
                  return (
                    <tr key={key}>
                      {isEditing ? (
                        <>
                          <td>
                            <ThaiDatePicker value={editData.date} onChange={val => setEditData({...editData, date: val})} />
                          </td>
                          <td>
                            <select value={editData.companyId} onChange={e => setEditData({...editData, companyId: e.target.value})} className="compact">
                              {companies.map(comp => <option key={comp.id} value={comp.id}>{comp.name}</option>)}
                            </select>
                          </td>
                          <td>
                            <select value={editData.serviceId} onChange={e => setEditData({...editData, serviceId: e.target.value})} className="compact">
                              {services.map(serv => <option key={serv.id} value={serv.id}>{serv.name}</option>)}
                            </select>
                          </td>
                          <td><input type="number" value={editData.count} onChange={e => setEditData({...editData, count: Number(e.target.value)})} className="compact" /></td>
                          <td><input type="number" value={editData.amount} onChange={e => setEditData({...editData, amount: Number(e.target.value)})} className="compact" /></td>
                          <td>
                            <input 
                              type="number" 
                              value={editData.machineRemaining === null || editData.machineRemaining === undefined ? '' : editData.machineRemaining} 
                              onChange={e => setEditData({...editData, machineRemaining: e.target.value !== '' ? Number(e.target.value) : null})} 
                              className="compact"
                              placeholder="-"
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              value={editData.machineAccumulated === null || editData.machineAccumulated === undefined ? '' : editData.machineAccumulated} 
                              onChange={e => setEditData({...editData, machineAccumulated: e.target.value !== '' ? Number(e.target.value) : null})} 
                              className="compact"
                              placeholder="-"
                            />
                          </td>
                          <td><input type="number" value={editData.topUpAmount} onChange={e => setEditData({...editData, topUpAmount: Number(e.target.value)})} className="compact" /></td>
                          <td className="actions">
                            <button className="btn-icon" onClick={saveEdit}><Check size={16} color="#10b981" /></button>
                            <button className="btn-icon" onClick={() => setEditingKey(null)}><X size={16} color="#ef4444" /></button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{safeFormat(r.date, 'dd/MM/yyyy', { locale: th })}</td>
                          <td style={{ textAlign: 'left' }}>{c?.name || 'Unknown'}</td>
                          <td style={{ textAlign: 'left' }}>
                            {s?.name || 'Unknown'}
                            {r.rateAnomalyConfirmed && <span title="ยอดต่ำกว่าเรทขั้นต่ำและผู้ใช้ยืนยันแล้ว" style={{ color: '#b45309', marginLeft: '6px' }}>⚠</span>}
                          </td>
                          <td>{r.count}</td>
                          <td className="num">฿{r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="num">{r.machineRemaining !== null && r.machineRemaining !== undefined ? `฿${r.machineRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}</td>
                          <td className="num">{r.machineAccumulated !== null && r.machineAccumulated !== undefined ? `฿${r.machineAccumulated.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}</td>
                          <td className="num" style={{ color: r.topUpAmount > 0 ? 'var(--primary)' : 'inherit' }}>
                            {r.topUpAmount > 0 ? `฿${r.topUpAmount.toLocaleString()}` : '-'}
                          </td>
                          <td className="actions">
                            <button className="btn-icon" onClick={() => startEdit(r, key)}><Edit2 size={16} /></button>
                            <button className="btn-icon" onClick={() => { if (window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) { deleteSingleRecord(r.serviceId, r.date, r.companyId, r.timestamp); } }}>
                              <Trash2 size={16} color="#ef4444" />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const AppContent = () => {
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
            <CloudSyncManager />
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
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
