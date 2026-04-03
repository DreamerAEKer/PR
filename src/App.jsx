import React, { useState, useMemo, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LayoutDashboard, Settings, FileText, PlusCircle, Printer, Trash2, ChevronLeft, ChevronRight, Save, Edit2, Check, X, Download, Upload, ChevronUp, ChevronDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subDays, isWeekend } from 'date-fns';
import { th } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import './App.css';

const THAI_HOLIDAYS_2026 = [
  '2026-01-01', '2026-03-03', '2026-04-06', '2026-04-13', '2026-04-14', '2026-04-15',
  '2026-05-01', '2026-05-04', '2026-05-31', '2026-06-03', '2026-07-28', '2026-07-29', 
  '2026-07-30', '2026-08-12', '2026-10-13', '2026-10-23', '2026-12-05', '2026-12-10', '2026-12-31'
];

// Defensive Utility: Safe Date Formatting
const safeFormat = (date, formatStr, options) => {
  try {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    return format(d, formatStr, options);
  } catch (e) {
    console.error('Date formatting error:', e);
    return '-';
  }
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
const ServicesManager = () => {
  const { services, setServices, updateService } = useApp();
  const [newService, setNewService] = useState({ name: '', code: '', category: 'domestic' });
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  const add = () => {
    if (!newService.name) return;
    setServices([...services, { ...newService, id: Date.now().toString() }]);
    setNewService({ name: '', code: '', category: 'domestic' });
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
        <button className="btn btn-primary" onClick={add}><PlusCircle size={18}/> เพิ่ม</button>
      </div>
      
      <div className="scroll-x mt-8">
        <table className="grid-entry-table">
          <thead>
            <tr>
              <th>ประเภท</th>
              <th>รหัส</th>
              <th>ชื่อบริการ</th>
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
                    <td className="actions">
                      <button className="btn-icon" onClick={() => startEdit(s)}><Edit2 size={16} /></button>
                      <button className="btn-icon" onClick={() => remove(s.id)}><Trash2 size={16} color="#ef4444" /></button>
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
  const { companies, setCompanies, updateCompany, reorderCompaniesByCode } = useApp();
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [newCompany, setNewCompany] = useState({ name: '', code: '', showInEntry: true, showInReport: true });

  const add = () => {
    if (!newCompany.name) return;
    const maxOrder = companies.length > 0 ? Math.max(...companies.map(c => c.order || 0)) : 0;
    setCompanies([...companies, { ...newCompany, id: Date.now().toString(), order: maxOrder + 1 }]);
    setNewCompany({ name: '', code: '' });
  };

  const remove = (id) => setCompanies(companies.filter(c => c.id !== id));

  const move = (id, direction) => {
    const idx = companies.findIndex(c => c.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === companies.length - 1) return;

    const newCompanies = [...companies].sort((a,b) => (a.order || 0) - (b.order || 0));
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    
    // Swap orders
    const temp = newCompanies[idx].order;
    newCompanies[idx].order = newCompanies[targetIdx].order;
    newCompanies[targetIdx].order = temp;

    setCompanies(newCompanies);
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
                      <button className="btn-icon" onClick={() => remove(c.id)}><Trash2 size={16} color="#ef4444" /></button>
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
  const { records, services } = useApp();
  
  const stats = useMemo(() => {
    const totalCount = records.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
    const totalAmount = records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    
    // Group by service for chart
    const serviceData = services.map(s => ({
      name: s.name.substring(0, 15) + '...',
      value: records.filter(r => r.serviceId === s.id).reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
    })).filter(d => d.value > 0);

    return { totalCount, totalAmount, serviceData };
  }, [records, services]);

  return (
    <div className="fade-in">
      <h1 style={{ marginBottom: '2rem' }}>แดชบอร์ด</h1>
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <span className="label">จำนวนชิ้นรวม</span>
          <span className="value">{stats.totalCount.toLocaleString()}</span>
        </div>
        <div className="glass-card stat-card primary">
          <span className="label">รายได้รวม</span>
          <span className="value">฿{stats.totalAmount.toLocaleString()}</span>
        </div>
      </div>
      
      <div className="glass-card mt-8">
        <h2 style={{ marginBottom: '1.5rem' }}>สัดส่วนรายได้แยกตามบริการ</h2>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.serviceData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip 
                contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--text-main)' }}
              />
              <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card mt-8">
        <h2 style={{ marginBottom: '1.5rem' }}>สรุปข้อมูลจริงรายบริการ</h2>
        <div className="scroll-x">
          <table className="grid-entry-table">
            <thead>
              <tr>
                <th>บริการ</th>
                <th>รหัส</th>
                <th>จำนวน (ชิ้น)</th>
                <th>ยอดเงิน (฿)</th>
              </tr>
            </thead>
            <tbody>
              {services.map(s => {
                const serviceRecords = records.filter(r => r.serviceId === s.id);
                const count = serviceRecords.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
                const amount = serviceRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                if (count === 0 && amount === 0) return null;
                return (
                  <tr key={s.id}>
                    <td style={{ textAlign: 'left' }}>{s.name}</td>
                    <td>{s.code}</td>
                    <td>{count.toLocaleString()}</td>
                    <td className="num">{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 'bold' }}>
                <td colSpan={2}>รวมทั้งหมด</td>
                <td>{stats.totalCount.toLocaleString()}</td>
                <td className="num">฿{stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

const DataEntry = () => {
  const { services, companies, records, addRecord, deleteSingleRecord } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(getSmartDefaultDate());
  const [selectedCompany, setSelectedCompany] = useState(companies[0]?.id || '');
  
  // Auto-select company if currently empty but companies exist
  useEffect(() => {
    if (!selectedCompany && companies.length > 0) {
      setSelectedCompany(companies[0].id);
    }
  }, [companies, selectedCompany]);

  const [activeCategory, setActiveCategory] = useState('domestic');

  const [formData, setFormData] = useState({ serviceId: '', count: '', amount: '', machineRemaining: '', machineMixed: '' });

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
  
  const dailyRecords = useMemo(() => {
    if (!records || !Array.isArray(records)) return [];
    return records
      .filter(r => r && r.date === selectedDay && r.companyId === selectedCompany)
      .map(r => ({
        ...r,
        serviceName: services.find(s => s.id === r.serviceId)?.name || 'Unknown'
      }));
  }, [records, selectedDay, selectedCompany, services]);

  const saveRecord = () => {
    if (!formData.serviceId || !formData.count || !formData.amount) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    addRecord([{
      date: selectedDay,
      companyId: selectedCompany,
      serviceId: formData.serviceId,
      count: Number(formData.count),
      amount: Number(formData.amount),
      machineRemaining: formData.machineRemaining ? Number(formData.machineRemaining) : null,
      machineAccumulated: formData.machineMixed ? Number(formData.machineMixed) : null,
      topUpAmount: formData.topUpAmount ? Number(formData.topUpAmount) : 0,
      timestamp: Date.now()
    }]);
    setFormData({ serviceId: '', count: '', amount: '', machineRemaining: '', machineMixed: '', topUpAmount: '', manualTopUp: false });
  };


  const machineContext = useMemo(() => {
    // Find the chronologically latest record before (or same day but earlier timestamp) the current selection
    // to determine the machine state context.
    const companyRecords = (records || []).filter(r => r && r.companyId === selectedCompany && r.machineAccumulated != null);
    
    // Sort all records by date and then by timestamp
    const sorted = [...companyRecords].sort((a, b) => {
      if (a.date !== b.date) {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        if (isNaN(da) || isNaN(db)) return 0;
        return da - db;
      }
      return (a.timestamp || 0) - (b.timestamp || 0);
    });

    // Find the last record that is before the selected day OR same day (if we want to chain entries)
    // For a new entry, we look for the last one in the sorted list that isn't the current entry
    const last = [...sorted].reverse().find(r => r.date <= selectedDay);
    
    return last ? { acc: last.machineAccumulated, rem: last.machineRemaining } : { acc: 0, rem: null };
  }, [records, selectedCompany, selectedDay]);

  const topUpCalculation = useMemo(() => {
    if (!formData.machineRemaining || machineContext.rem === null || !formData.amount) return 0;
    const currentRem = Number(formData.machineRemaining);
    const expectedRem = machineContext.rem - Number(formData.amount);
    
    if (currentRem > expectedRem) {
      // Potentially a top-up
      return currentRem - expectedRem;
    }
    return 0;
  }, [formData.machineRemaining, formData.amount, machineContext]);

  // Sync auto-calculated top-up to formData if detected
  useEffect(() => {
    // Only update if value actually changed to avoid infinite cycles
    if (topUpCalculation > 0 && formData.topUpAmount !== topUpCalculation) {
      setFormData(prev => ({ ...prev, topUpAmount: topUpCalculation }));
    } else if (topUpCalculation === 0 && formData.topUpAmount && !formData.manualTopUp) {
      setFormData(prev => ({ ...prev, topUpAmount: '' }));
    }
  }, [topUpCalculation, formData.topUpAmount, formData.manualTopUp]);

  const validation = useMemo(() => {
    if (!formData.amount) return { accValid: true, remValid: true };
    
    const amount = Number(formData.amount);
    let accValid = true;
    let remValid = true;
    let expectedAcc = machineContext.acc + amount;
    let expectedRem = machineContext.rem !== null ? machineContext.rem - amount : null;

    const currentMachineRem = formData.machineRemaining ? Number(formData.machineRemaining) : null;
    const currentMachineMixed = formData.machineMixed ? Number(formData.machineMixed) : null;
    const currentTopUp = Number(formData.topUpAmount) || 0;

    if (currentMachineMixed != null) {
      accValid = Math.abs(currentMachineMixed - expectedAcc) < 0.01;
    }

    if (currentMachineRem != null && machineContext.rem !== null) {
      remValid = Math.abs(currentMachineRem - (expectedRem + currentTopUp)) < 0.01;
    }

    return { accValid, remValid, expectedAcc, expectedRem };
  }, [formData.machineMixed, formData.machineRemaining, formData.amount, formData.topUpAmount, machineContext]);

  if (!selectedCompany) return <div className="glass-card">กรุณาเพิ่มบริษัทก่อนบันทึกข้อมูล</div>;

  return (
    <div className="fade-in app-content-inner">
      <div className="flex-between mb-8">
        <h1>บันทึกข้อมูลรายวัน</h1>
        <div className="flex-form-controls">
          <select className="input-select" value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}>
            {companies
              .filter(c => c.showInEntry)
              .sort((a,b) => (a.order || 0) - (b.order || 0))
              .map(c => <option key={c.id} value={c.id}>{c.name} {c.code ? `(${c.code})` : ''}</option>)
            }
          </select>
          <input type="date" className="input-select" value={selectedDay} onChange={e => setSelectedDay(e.target.value)} />
        </div>
      </div>

      <div className="grid-2col">
        {/* Entry Form */}
        <div className="glass-card">
          <h2 className="mb-4">กรอกข้อมูลใหม่</h2>
          
          <div className="category-toggle mb-6">
            <button className={activeCategory === 'domestic' ? 'active' : ''} onClick={() => setActiveCategory('domestic')}>ในประเทศ</button>
            <button className={activeCategory === 'international' ? 'active' : ''} onClick={() => setActiveCategory('international')}>ระหว่างประเทศ</button>
          </div>

          <div className="entry-form-vertical">
            <div className="form-group">
              <label>ประเภทบริการ</label>
              <select 
                className="input-select full" 
                value={formData.serviceId} 
                onChange={e => setFormData({...formData, serviceId: e.target.value})}
              >
                <option value="">เลือกบริการ...</option>
                {filteredServices.map(s => (
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
            
            <div className="form-row">
              <div className="form-group">
                <label>จำนวนชิ้น</label>
                <input 
                  type="number" 
                  value={formData.count} 
                  onChange={e => setFormData({...formData, count: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label>จำนวนเงิน (บาท)</label>
                <input 
                  type="number" 
                  value={formData.amount} 
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>ยอดคงเหลือ (แถวบน)</label>
                <input 
                  type="number" 
                  value={formData.machineRemaining} 
                  onChange={e => setFormData({...formData, machineRemaining: e.target.value})}
                  placeholder="0.00"
                  className={!validation.remValid ? 'input-error' : ''}
                />
                {!validation.remValid && (
                  <p className="text-danger" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                    * ควรเป็น {(validation.expectedRem + (Number(formData.topUpAmount) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
              <div className="form-group">
                <label>ยอดสะสม (แถวล่าง)</label>
                <input 
                  type="number" 
                  value={formData.machineMixed} 
                  onChange={e => setFormData({...formData, machineMixed: e.target.value})}
                  placeholder="0.00"
                  className={!validation.accValid ? 'input-error' : ''}
                />
                {!validation.accValid && (
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

        {/* Daily Summary */}
        <div className="glass-card">
          <h2 className="mb-4">รายการของวันที่ {safeFormat(selectedDay, 'd MMMM yyyy', { locale: th })}</h2>
          {dailyRecords.length === 0 ? (
            <p className="text-muted">ยังไม่มีการบันทึกข้อมูลสำหรับวันนี้</p>
          ) : (
            <div className="daily-list">
              {dailyRecords.map(r => (
                <div key={r.serviceId} className="daily-item">
                  <div className="info">
                    <div className="name">{r.serviceName}</div>
                    <div className="meta">{r.count} ชิ้น | ฿{r.amount.toLocaleString()}</div>
                  </div>
                  <button className="btn-icon" onClick={() => deleteSingleRecord(r.serviceId, r.date, r.companyId, r.timestamp)}>
                    <Trash2 size={16} color="#ef4444" />
                  </button>
                </div>
              ))}
              <div className="daily-total mt-4 pt-4">
                <strong>รวมทั้งหมด:</strong>
                <span>฿{dailyRecords.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Reports = () => {
  const { services, companies, records, reportLogo, reportLogoSize, reportLogoAlign } = useApp();
  const [reportMonth, setReportMonth] = useState(new Date());
  const [reportType, setReportType] = useState('pn3'); // pn3, admin, company, machine
  const [selectedCompany, setSelectedCompany] = useState(companies[0]?.id || '');

  // Auto-select company if currently empty but companies exist
  useEffect(() => {
    if (!selectedCompany && companies.length > 0) {
      setSelectedCompany(companies[0].id);
    }
  }, [companies, selectedCompany]);

  const stats = useMemo(() => {

    const monthStr = safeFormat(reportMonth, 'yyyy-MM');
    const filtered = (records || []).filter(r => r && r.date && r.date.startsWith(monthStr));
    
    if (reportType === 'company') {
      return filtered.filter(r => r.companyId === selectedCompany);
    }
    return filtered;
  }, [records, reportMonth, reportType, selectedCompany]);

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
          amount: groupRecords.reduce((sum, r) => sum + r.amount, 0)
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

  const print = () => window.print();

  return (
    <div className="fade-in">
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>รายงาน</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select className="input-select" value={reportType} onChange={e => setReportType(e.target.value)}>
            <option value="pn3">รายได้ส่ง ปน.3</option>
            <option value="pn3_v2">รายได้ส่ง ปน.3 Ver 2</option>
            <option value="admin">ส่งธุรการ</option>
            <option value="admin_v2">ส่งธุรการ Ver 2</option>
            <option value="company">รายเดือนแยกบริษัท</option>
            <option value="machine">สรุปเครื่อง (SUMMARY MACHINE)</option>
            <option value="machine_v2">สรุปเครื่องประทับ Ver 2</option>
          </select>
          {reportType === 'company' && (
            <select className="input-select" value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <div className="month-picker">
            <button className="btn-icon" onClick={() => setReportMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}><ChevronLeft/></button>
            <span>{format(reportMonth, 'MMMM yyyy', { locale: th })}</span>
            <button className="btn-icon" onClick={() => setReportMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}><ChevronRight/></button>
          </div>
          <button className="btn btn-primary" onClick={print}><Printer size={18}/> พิมพ์ (A4)</button>
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
                  
                  return (
                    <tr key={row.code}>
                      <td style={{ textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ textAlign: 'center' }}>{row.code}</td>
                      <td style={{ textAlign: 'left', paddingLeft: '10px' }}>{row.name}</td>
                      <td className="num">{groupAmount > 0 ? groupAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}</td>
                      <td></td>
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
            <header className="report-header" style={{ 
              marginBottom: '1.5rem', 
              display: 'flex', 
              flexDirection: reportLogoAlign === 'center' ? 'column' : 'row',
              alignItems: 'flex-start',
              gap: '20px',
              textAlign: reportLogoAlign
            }}>
              {reportLogo && reportLogoAlign !== 'right' && (
                <img src={reportLogo} alt="Logo" style={{ width: `${reportLogoSize}px`, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 'bold' }}>ที่ทำการ ไปรษณีย์กลาง สังกัด ปน.3</h3>
                <p style={{ margin: '4px 0', fontWeight: 'bold' }}>รายละเอียดรายได้บริการชำระตราไปรษณียากรด้วยเครื่องประทับของที่ทำการ</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>ประจำเดือน {safeFormat(reportMonth, 'MMMM yyyy', { locale: th })}</p>
              </div>
              {reportLogo && reportLogoAlign === 'right' && (
                <img src={reportLogo} alt="Logo" style={{ width: `${reportLogoSize}px`, flexShrink: 0 }} />
              )}
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
            <header className="report-header" style={{ 
              marginBottom: '1rem',
              display: 'flex', 
              flexDirection: reportLogoAlign === 'center' ? 'column' : 'row',
              alignItems: 'flex-start',
              gap: '20px',
              textAlign: reportLogoAlign
            }}>
              {reportLogo && reportLogoAlign !== 'right' && (
                <img src={reportLogo} alt="Logo" style={{ width: `${reportLogoSize}px`, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0 }}>{companies.find(c => c.id === selectedCompany)?.name || ''}</h2>
                <p style={{ margin: '5px 0' }}>ประจำเดือน {safeFormat(reportMonth, 'MMMM yyyy', { locale: th })}</p>
              </div>
              {reportLogo && reportLogoAlign === 'right' && (
                <img src={reportLogo} alt="Logo" style={{ width: `${reportLogoSize}px`, flexShrink: 0 }} />
              )}
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

        {reportType === 'admin' && (
          <div className="print-admin portrait">
            <header className="report-header" style={{ 
              marginBottom: '1.5rem', 
              display: 'flex', 
              flexDirection: reportLogoAlign === 'center' ? 'column' : 'row',
              alignItems: 'flex-start',
              gap: '20px',
              textAlign: reportLogoAlign
            }}>
              {reportLogo && reportLogoAlign !== 'right' && (
                <img src={reportLogo} alt="Logo" style={{ width: `${reportLogoSize}px`, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>สรุปรายได้ประจำเดือน {safeFormat(reportMonth, 'MMMM yyyy', { locale: th })}</p>
              </div>
              {reportLogo && reportLogoAlign === 'right' && (
                <img src={reportLogo} alt="Logo" style={{ width: `${reportLogoSize}px`, flexShrink: 0 }} />
              )}
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
            <header className="report-header-v2" style={{ 
              marginBottom: '10px', 
              display: 'flex', 
              flexDirection: reportLogoAlign === 'center' ? 'column' : 'row',
              alignItems: 'flex-start',
              gap: '20px',
              textAlign: reportLogoAlign,
              paddingLeft: reportLogoAlign === 'left' ? '0' : '50px' 
            }}>
              {reportLogo && reportLogoAlign !== 'right' && (
                <img src={reportLogo} alt="Logo" style={{ width: `${reportLogoSize}px`, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0 }}>
                  {(() => {
                    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                    const monthStr = months[reportMonth.getMonth()];
                    const yearBE = (reportMonth.getFullYear() + 543).toString().slice(-2);
                    return `${monthStr}-${yearBE}`;
                  })()}
                </p>
              </div>
              {reportLogo && reportLogoAlign === 'right' && (
                <img src={reportLogo} alt="Logo" style={{ width: `${reportLogoSize}px`, flexShrink: 0 }} />
              )}
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
            <header className="report-header-v3" style={{ 
              marginBottom: '1rem', 
              display: 'flex', 
              flexDirection: reportLogoAlign === 'center' ? 'column' : 'row',
              alignItems: 'flex-start',
              gap: '20px',
              textAlign: reportLogoAlign,
              padding: reportLogoAlign === 'center' ? '0 50px' : '0'
            }}>
              {reportLogo && reportLogoAlign !== 'right' && (
                <img src={reportLogo} alt="Logo" style={{ width: `${reportLogoSize}px`, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0' }}>บัญชีสรุปการใช้เครื่องประทับไปรษณียากร</h3>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '2px 0' }}>ที่ทำการไปรษณีย์กลาง 10501 สังกัด ปน.3</h3>
                <p style={{ marginTop: '0.5rem', fontSize: '1.0rem', fontWeight: 'bold', margin: 0 }}>
                  ประจำเดือน {safeFormat(reportMonth, 'MMMM yyyy', { locale: th })}
                </p>
              </div>
              {reportLogo && reportLogoAlign === 'right' && (
                <img src={reportLogo} alt="Logo" style={{ width: `${reportLogoSize}px`, flexShrink: 0 }} />
              )}
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

const Navigation = ({ view, setView }) => (
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
);

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
  
  const sortedRecords = useMemo(() => {
    return [...(records || [])].filter(Boolean).sort((a, b) => {
      if (a.date !== b.date) {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        if (isNaN(da)) return 1;
        if (isNaN(db)) return -1;
        return db - da; 
      }
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  }, [records]);

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
      <h1 style={{ marginBottom: '2rem' }}>ประวัติการบันทึก</h1>
      
      {!hasRecords ? (
        <div className="glass-card text-center" style={{ padding: '4rem 2rem' }}>
          <p className="text-muted">ยังไม่มีข้อมูลในประวัติ</p>
        </div>
      ) : (
        <div className="glass-card">
          <div className="scroll-x">
            <table className="grid-entry-table">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>บริษัท</th>
                  <th>บริการ</th>
                  <th>จำนวน</th>
                  <th>ยอดเงิน</th>
                  <th>ยอดเติม</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((r, idx) => {
                  const s = services.find(serv => serv.id === r.serviceId);
                  const c = companies.find(comp => comp.id === r.companyId);
                  const key = `${r.date}-${r.companyId}-${r.serviceId}-${r.timestamp || idx}`;
                  const isEditing = editingKey === key;
                  
                  return (
                    <tr key={key}>
                      {isEditing ? (
                        <>
                          <td><input type="date" value={editData.date} onChange={e => setEditData({...editData, date: e.target.value})} className="compact" /></td>
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
                          <td style={{ textAlign: 'left' }}>{s?.name || 'Unknown'}</td>
                          <td>{r.count}</td>
                          <td className="num">฿{r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="num" style={{ color: r.topUpAmount > 0 ? 'var(--primary)' : 'inherit' }}>
                            {r.topUpAmount > 0 ? `฿${r.topUpAmount.toLocaleString()}` : '-'}
                          </td>
                          <td className="actions">
                            <button className="btn-icon" onClick={() => startEdit(r, key)}><Edit2 size={16} /></button>
                            <button className="btn-icon" onClick={() => deleteSingleRecord(r.serviceId, r.date, r.companyId, r.timestamp)}>
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
  const [view, setView] = useState('dashboard');

  return (
    <div className="app-layout">
      <Navigation view={view} setView={setView} />
      <main className="app-content">
        {view === 'dashboard' && <Dashboard />}
        {view === 'entry' && <DataEntry />}
        {view === 'settings' && (
          <div className="fade-in">
            <h1 style={{ marginBottom: '2rem' }}>การตั้งค่า</h1>
            <ServicesManager />
            <CompaniesManager />
            <LogoManager />
            <BackupManager />
          </div>
        )}
        {view === 'history' && <History />}
        {view === 'reports' && <Reports />}
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
