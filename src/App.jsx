import React, { useState, useMemo } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LayoutDashboard, Settings, FileText, PlusCircle, Printer, Trash2, ChevronLeft, ChevronRight, Save, Edit2, Check, X, Download, Upload } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subDays, isWeekend } from 'date-fns';
import { th } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import './App.css';

const THAI_HOLIDAYS_2026 = [
  '2026-01-01', '2026-03-03', '2026-04-06', '2026-04-13', '2026-04-14', '2026-04-15',
  '2026-05-01', '2026-05-04', '2026-05-31', '2026-06-03', '2026-07-28', '2026-07-29', 
  '2026-07-30', '2026-08-12', '2026-10-13', '2026-10-23', '2026-12-05', '2026-12-10', '2026-12-31'
];

const getPreviousWorkDay = (date) => {
  let target = subDays(date, 1);
  while (isWeekend(target) || THAI_HOLIDAYS_2026.includes(format(target, 'yyyy-MM-dd'))) {
    target = target.getDay() === 0 ? subDays(target, 2) : subDays(target, 1); // Optimization: if Sunday, skip Sat-Sun
    if (isWeekend(target) || THAI_HOLIDAYS_2026.includes(format(target, 'yyyy-MM-dd'))) continue;
  }
  return target;
};

const getSmartDefaultDate = () => {
  const today = new Date();
  // Simple check for weekend/holiday to find the most relevant "yesterday"
  let target = subDays(today, 1);
  while (isWeekend(target) || THAI_HOLIDAYS_2026.includes(format(target, 'yyyy-MM-dd'))) {
    target = subDays(target, 1);
  }
  return format(target, 'yyyy-MM-dd');
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
  const { companies, setCompanies } = useApp();
  const [newName, setNewName] = useState('');

  const add = () => {
    if (!newName) return;
    setCompanies([...companies, { name: newName, id: Date.now().toString() }]);
    setNewName('');
  };

  const remove = (id) => setCompanies(companies.filter(c => c.id !== id));

  return (
    <div className="glass-card">
      <h2 style={{ marginBottom: '1rem' }}>จัดการบริษัทลูกค้า</h2>
      <div className="flex-form">
        <input placeholder="ชื่อบริษัท" value={newName} onChange={e => setNewName(e.target.value)} />
        <button className="btn btn-primary" onClick={add}><PlusCircle size={18}/> เพิ่ม</button>
      </div>
      <div className="company-chips mt-4">
        {companies.map(c => (
          <div key={c.id} className="chip">
            {c.name}
            <button className="btn-icon" onClick={() => remove(c.id)}><Trash2 size={14} /></button>
          </div>
        ))}
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
    </div>
  );
};

const DataEntry = () => {
  const { services, companies, records, addRecord, deleteSingleRecord } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(getSmartDefaultDate());
  const [selectedCompany, setSelectedCompany] = useState(companies[0]?.id || '');
  const [activeCategory, setActiveCategory] = useState('domestic');
  const [formData, setFormData] = useState({ serviceId: '', count: '', amount: '' });

  const filteredServices = services.filter(s => s.category === activeCategory);
  
  const dailyRecords = records.filter(r => 
    r.date === selectedDay && r.companyId === selectedCompany
  ).map(r => ({
    ...r,
    serviceName: services.find(s => s.id === r.serviceId)?.name || 'Unknown'
  }));

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
      amount: Number(formData.amount)
    }]);
    setFormData({ ...formData, count: '', amount: '' });
  };

  if (!selectedCompany) return <div className="glass-card">กรุณาเพิ่มบริษัทก่อนบันทึกข้อมูล</div>;

  return (
    <div className="fade-in app-content-inner">
      <div className="flex-between mb-8">
        <h1>บันทึกข้อมูลรายวัน</h1>
        <div className="flex-form-controls">
          <select className="input-select" value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                {filteredServices.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
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

            <button className="btn btn-primary full py-3" onClick={saveRecord}>
              <Save size={18}/> บันทึกรายการ
            </button>
          </div>
        </div>

        {/* Daily Summary */}
        <div className="glass-card">
          <h2 className="mb-4">รายการของวันที่ {format(new Date(selectedDay), 'd MMMM yyyy', { locale: th })}</h2>
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
                  <button className="btn-icon" onClick={() => deleteSingleRecord(r.serviceId, r.date, r.companyId)}>
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
  const { services, companies, records } = useApp();
  const [reportMonth, setReportMonth] = useState(new Date());
  const [reportType, setReportType] = useState('pn3'); // pn3, admin, company, machine
  const [selectedCompany, setSelectedCompany] = useState(companies[0]?.id || '');

  const stats = useMemo(() => {
    const monthStr = format(reportMonth, 'yyyy-MM');
    const filtered = records.filter(r => r.date.startsWith(monthStr));
    
    if (reportType === 'company') {
      return filtered.filter(r => r.companyId === selectedCompany);
    }
    return filtered;
  }, [records, reportMonth, reportType, selectedCompany]);

  const summaryData = useMemo(() => {
    return services.map(s => {
      const serviceRecords = stats.filter(r => r.serviceId === s.id);
      return {
        ...s,
        count: serviceRecords.reduce((sum, r) => sum + r.count, 0),
        amount: serviceRecords.reduce((sum, r) => sum + r.amount, 0)
      };
    });
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
            <option value="admin">ส่งธุรการ</option>
            <option value="company">รายเดือนแยกบริษัท</option>
            <option value="machine">สรุปเครื่อง (SUMMARY MACHINE)</option>
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
        {reportType === 'pn3' && (
          <div className="print-summary portrait">
            <header className="report-header" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>ที่ทำการ ไปรษณีย์กลาง สังกัด ปน.3</h3>
              <p style={{ margin: '4px 0' }}>รายละเอียดรายได้บริการชำระตราไปรษณียากรด้วยเครื่องประทับของที่ทำการ</p>
              <p style={{ margin: 0 }}>ประจำเดือน {format(reportMonth, 'MMMM yyyy', { locale: th })}</p>
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
              <h2>{companies.find(c => c.id === selectedCompany)?.name}</h2>
              <p>ประจำเดือน {format(reportMonth, 'MMMM yyyy', { locale: th })}</p>
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
            <header className="report-header" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 'bold', borderBottom: 'none' }}>ประจำเดือน {format(reportMonth, 'MMMM yyyy', { locale: th })}</p>
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

        {reportType === 'machine' && (
          <div className="print-machine portrait">
            <header className="report-header">
              <h3>ที่ทำการไปรษณีย์กลาง 10501 สังกัด ปน.3</h3>
              <p>สรุปเครื่อง ประจำเดือน {format(reportMonth, 'MMMM yyyy', { locale: th })}</p>
            </header>
            <table className="report-table bordered">
              <thead>
                <tr>
                  <th>ลำดับ</th>
                  <th>รหัส</th>
                  <th>รายชื่อผู้รับบริการ</th>
                  <th>จำนวนชิ้น</th>
                  <th>ยอดเงิน</th>
                  <th>ภาษีมูลค่าเพิ่ม</th>
                  <th>ยอดเงินสุทธิ</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c, idx) => {
                  const companyRecords = stats.filter(r => r.companyId === c.id);
                  const count = companyRecords.reduce((sum, r) => sum + r.count, 0);
                  const amount = companyRecords.reduce((sum, r) => sum + r.amount, 0);
                  const vat = amount * 0.07;
                  const total = amount + vat;
                  if (count === 0) return null;
                  return (
                    <tr key={c.id}>
                      <td>{idx + 1}</td>
                      <td>{c.code || '-'}</td>
                      <td style={{ textAlign: 'left' }}>{c.name}</td>
                      <td className="num">{count.toLocaleString()}</td>
                      <td className="num">{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="num">{vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="num">{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 'bold' }}>
                  <td colSpan={3}>รวมทั้งสิ้น</td>
                  <td className="num">{stats.reduce((sum, r) => sum + r.count, 0).toLocaleString()}</td>
                  <td className="num">{stats.reduce((sum, r) => sum + r.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="num">{(stats.reduce((sum, r) => sum + r.amount, 0) * 0.07).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="num">{(stats.reduce((sum, r) => sum + r.amount, 0) * 1.07).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
      Version 1.2.0
    </div>
  </nav>
);

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
            <BackupManager />
          </div>
        )}
        {view === 'history' && <h1>ประวัติ (กำลังพัฒนา)</h1>}
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
