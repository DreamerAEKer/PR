import re

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Ensure lucide-react imports have all required icons
import_target = re.search(r"import \{[^}]+\} from 'lucide-react';", content)
if import_target:
    needed_icons = "LayoutDashboard, Settings, FileText, PlusCircle, Printer, Trash2, ChevronLeft, ChevronRight, Save, Edit2, Check, X, Download, Upload, ChevronUp, ChevronDown, ArrowRightLeft, Building2, Sparkles, Star, Search, RefreshCw, CheckCircle2"
    content = content[:import_target.start()] + f"import {{ {needed_icons} }} from 'lucide-react';" + content[import_target.end():]

# 2. Fix ServicesManager and CompaniesManager section
services_companies_replacement = """const ServicesManager = () => {
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
};"""

pattern_serv_comp = re.compile(r"const ServicesManager = \(\) => \{.*?(?=const Dashboard = \(\) => \{)", re.DOTALL)
content = pattern_serv_comp.sub(lambda _: services_companies_replacement + "\n\n", content)

# 3. Enhanced DataEntry component
new_data_entry = """const DataEntry = () => {
  const { services, companies, records, addRecord, deleteSingleRecord, moveSingleRecordToCompany, moveDailyRecordsToCompany, navigationTarget, setNavigationTarget } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(getSmartDefaultDate());
  const [selectedCompany, setSelectedCompany] = useState(companies[0]?.id || '');
  const [activeCategory, setActiveCategory] = useState('domestic');
  const [formData, setFormData] = useState({ serviceId: '', count: '', amount: '', machineRemaining: '', machineMixed: '', topUpAmount: '', manualTopUp: false });
  const [subItems, setSubItems] = useState([]);
  const [editingDailyKey, setEditingDailyKey] = useState(null);
  const [editDailyData, setEditDailyData] = useState({});
  const [showPreservedToast, setShowPreservedToast] = useState(false);
  const [preservedMessage, setPreservedMessage] = useState('');
  const [reassignModal, setReassignModal] = useState({ isOpen: false, target: null, targetCompanyId: '' });
  
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

  const currentRateAnomaly = useMemo(
    () => getRateAnomaly(services, formData.serviceId, formData.count, formData.amount),
    [services, formData.serviceId, formData.count, formData.amount]
  );

  const confirmRateAnomaly = anomaly => {
    if (!anomaly) return true;
    const pairedService = getPairedService(services, anomaly.service);
    return window.confirm(
      `⚠️ ยอดเงินต่ำกว่าเรทเริ่มต้น\\n\\n` +
      `${anomaly.service?.name || 'บริการที่เลือก'}\\n` +
      `เรทเริ่มต้น ${anomaly.minimumRate.toLocaleString()} บาท/ชิ้น\\n` +
      `จำนวนที่กรอก ${Number(formData.count || 0).toLocaleString()} ชิ้น\\n` +
      `ยอดขั้นต่ำที่ควรเป็น ${anomaly.minimumTotal.toLocaleString()} บาท\\n` +
      `ยอดที่กรอก ${anomaly.amount.toLocaleString()} บาท (ต่ำกว่า ${anomaly.difference.toLocaleString()} บาท)\\n\\n` +
      `อาจเลือกบริการหรือในประเทศ/ระหว่างประเทศผิด\\n` +
      (pairedService ? `บริการที่ควรตรวจสอบ: ${pairedService.name}\\n\\n` : '') +
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

  const handleOpenReassignModal = (target) => {
    const defaultTarget = entryCompanies.find(c => c.id !== selectedCompany)?.id || '';
    setReassignModal({
      isOpen: true,
      target,
      targetCompanyId: defaultTarget
    });
  };

  const handleConfirmReassign = () => {
    if (!reassignModal.targetCompanyId || reassignModal.targetCompanyId === selectedCompany) {
      alert('กรุณาเลือกบริษัทปลายทางที่แตกต่างจากบริษัทปัจจุบัน');
      return;
    }
    const targetComp = companies.find(c => c.id === reassignModal.targetCompanyId);
    const targetName = targetComp ? `${targetComp.name} (${targetComp.code || ''})` : 'บริษัทปลายทาง';

    if (reassignModal.target === 'ALL') {
      moveDailyRecordsToCompany(selectedDay, selectedCompany, reassignModal.targetCompanyId);
      alert(`ย้ายรายการทั้งหมดของวันนี้ (${dailyRecords.length} รายการ) ไปยัง "${targetName}" สำเร็จเรียบร้อยแล้ว!`);
    } else if (reassignModal.target) {
      moveSingleRecordToCompany(reassignModal.target, reassignModal.targetCompanyId);
      alert(`ย้ายรายการ "${reassignModal.target.serviceName}" ไปยัง "${targetName}" สำเร็จเรียบร้อยแล้ว!`);
    }
    const newCompId = reassignModal.targetCompanyId;
    setReassignModal({ isOpen: false, target: null, targetCompanyId: '' });
    setSelectedCompany(newCompId);
  };

  const handleAddSubItem = () => {
    if (!formData.serviceId) {
      alert('กรุณาเลือกประเภทบริการก่อน');
      return;
    }
    if (!formData.count || !formData.amount) {
      alert('กรุณากรอกจำนวนชิ้นและจำนวนเงินก่อน');
      return;
    }
    const count = Number(formData.count);
    const amountVal = Number(formData.amount);
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

    if (!formData.serviceId || !formData.count || !formData.amount) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (!confirmRateAnomaly(currentRateAnomaly)) return;
    addRecord([{
      date: selectedDay,
      companyId: selectedCompany,
      serviceId: formData.serviceId,
      count: Number(formData.count),
      amount: Number(formData.amount),
      machineRemaining: formData.machineRemaining ? Number(formData.machineRemaining) : null,
      machineAccumulated: formData.machineMixed ? Number(formData.machineMixed) : null,
      topUpAmount: formData.topUpAmount ? Number(formData.topUpAmount) : 0,
      timestamp: Date.now(),
      ...anomalyAudit(currentRateAnomaly)
    }]);
    setFormData({ serviceId: '', count: '', amount: '', machineRemaining: '', machineMixed: '', topUpAmount: '', manualTopUp: false });
    setSubItems([]);
    setTimeout(() => refService.current?.focus(), 50);
  };

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

    const last = [...sorted].reverse().find(r => r.date <= selectedDay);
    return last ? { acc: last.machineAccumulated, rem: last.machineRemaining } : { acc: null, rem: null };
  }, [records, selectedCompany, selectedDay]);

  const topUpCalculation = useMemo(() => {
    if (!formData.machineRemaining || machineContext.rem === null || !formData.amount) return 0;
    const currentRem = Number(formData.machineRemaining);
    const expectedRem = machineContext.rem - Number(formData.amount);
    
    if (currentRem > expectedRem) {
      return currentRem - expectedRem;
    }
    return 0;
  }, [formData.machineRemaining, formData.amount, machineContext]);

  useEffect(() => {
    if (topUpCalculation > 0 && formData.topUpAmount !== topUpCalculation) {
      setFormData(prev => ({ ...prev, topUpAmount: topUpCalculation }));
    } else if (topUpCalculation === 0 && formData.topUpAmount && !formData.manualTopUp) {
      setFormData(prev => ({ ...prev, topUpAmount: '' }));
    }
  }, [topUpCalculation, formData.topUpAmount, formData.manualTopUp]);

  const validation = useMemo(() => {
    const totalAmount = subItems.length > 0
      ? subItems.reduce((sum, item) => sum + item.amount, 0)
      : (formData.amount ? Number(formData.amount) : 0);

    if (totalAmount === 0) return { accValid: true, remValid: true };
    
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
  }, [formData.machineMixed, formData.machineRemaining, formData.amount, formData.topUpAmount, machineContext, subItems]);

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
        <div className="flex-form-controls">
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
          <ThaiDatePicker value={selectedDay} onChange={setSelectedDay} />
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
            💡 สลับบริษัทได้ตลอดเวลา ค่าที่พิมพ์ไว้ในช่องกรอกจะไม่หาย
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
                <div className="active-company-subtext">
                  วันที่ {safeFormat(selectedDay, 'd MMMM yyyy', { locale: th })}
                </div>
              </div>
            </div>
            {hasTypedValues && (
              <span className="value-retained-badge">
                <CheckCircle2 size={13} /> พร้อมบันทึกให้ บ. นี้
              </span>
            )}
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
                <label>จำนวนเงิน (บาท)</label>
                <input 
                  ref={refAmount}
                  type="number" 
                  value={formData.amount} 
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                  placeholder="0.00"
                  onKeyDown={e => { 
                    if (e.key === 'Enter') { 
                      e.preventDefault(); 
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
                  <p className="text-danger" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                    * ควรเป็น {(validation.expectedRem + (Number(formData.topUpAmount) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
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

        {/* Daily Summary */}
        <div className="glass-card">
          <div className="flex-between mb-4 flex-wrap gap-2">
            <h2 style={{ margin: 0 }}>รายการของวันที่ {safeFormat(selectedDay, 'd MMMM yyyy', { locale: th })}</h2>
            {dailyRecords.length > 0 && (
              <button 
                type="button" 
                className="btn-reassign-icon" 
                onClick={() => handleOpenReassignModal('ALL')}
                title="ย้ายทุกรายการของวันนี้ไปยังบริษัทอื่น"
              >
                <ArrowRightLeft size={13} /> ย้ายทั้งหมดไป บ.อื่น
              </button>
            )}
          </div>
          {dailyRecords.length === 0 ? (
            <p className="text-muted">ยังไม่มีการบันทึกข้อมูลสำหรับบริษัทนี้ในวันนี้</p>
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
                      title="ย้ายรายการนี้ไปยังบริษัทอื่น"
                    >
                      <ArrowRightLeft size={13} /> ย้าย บ.
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
                <strong>รวมทั้งหมด:</strong>
                <span>฿{dailyRecords.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reassign / Move Company Modal */}
      {reassignModal.isOpen && (
        <div className="reassign-modal-overlay" onClick={() => setReassignModal({ isOpen: false, target: null, targetCompanyId: '' })}>
          <div className="reassign-modal-content" onClick={e => e.stopPropagation()}>
            <div className="reassign-modal-header">
              <span className="reassign-modal-title">
                <ArrowRightLeft size={20} color="#2563eb" />
                <span>ย้ายรายการไปยังบริษัทอื่น</span>
              </span>
              <button 
                type="button" 
                className="btn-icon" 
                onClick={() => setReassignModal({ isOpen: false, target: null, targetCompanyId: '' })}
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
                จากบริษัทเดิม: <strong>{currentCompanyObj?.name}</strong>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>เลือกบริษัทปลายทางที่ต้องการย้ายไป:</label>
              <select 
                className="input-select full" 
                value={reassignModal.targetCompanyId} 
                onChange={e => setReassignModal(prev => ({ ...prev, targetCompanyId: e.target.value }))}
                style={{ fontSize: '0.95rem', padding: '10px' }}
              >
                <option value="" disabled>-- เลือกบริษัทปลายทาง --</option>
                {entryCompanies
                  .filter(c => c.id !== selectedCompany)
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code ? `[${c.code}] ` : ''}{c.name}
                    </option>
                  ))
                }
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setReassignModal({ isOpen: false, target: null, targetCompanyId: '' })}
              >
                ยกเลิก
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleConfirmReassign}
                disabled={!reassignModal.targetCompanyId}
              >
                <Check size={16} /> ยืนยันย้ายข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};"""

pattern_data_entry = re.compile(r"const DataEntry = \(\) => \{.*?(?=const Reports = )", re.DOTALL)
content = pattern_data_entry.sub(lambda _: new_data_entry + "\n\n", content)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied successfully.")
