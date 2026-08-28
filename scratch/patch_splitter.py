import re

# 1. Update App.css with Bill Splitter styles
css_addon = """
/* Smart Bill Splitter Widget */
.bill-splitter-box {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  margin-bottom: 1rem;
  animation: fadeIn 0.3s ease;
}

.bill-splitter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.65rem;
  font-weight: 700;
  font-size: 0.88rem;
  color: #1d4ed8;
}

.bill-splitter-grid {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.bill-splitter-input-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 180px;
}

.bill-splitter-input-group label {
  font-size: 0.78rem;
  color: var(--text-muted);
  white-space: nowrap;
  font-weight: 600;
}

.bill-splitter-input {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
  font-weight: 700;
  font-family: monospace;
  width: 100%;
}

.bill-remainder-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #059669;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 700;
}

.btn-use-remainder {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn-use-remainder:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.btn-use-remainder:active {
  transform: translateY(0);
}
"""

with open('src/App.css', 'r', encoding='utf-8') as f:
    css = f.read()

if '.bill-splitter-box' not in css:
    with open('src/App.css', 'a', encoding='utf-8') as f:
        f.write(css_addon)

# 2. Update App.jsx
with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure evaluateMathExpression helper is defined
helper_code = """// Safe arithmetic evaluator for inputs like '246-90' or '6*15' or '18+30+24'
const evaluateMathExpression = (expr) => {
  if (expr === null || expr === undefined) return '';
  const str = String(expr).trim();
  if (!str) return '';
  // Check if string contains math operators (+, -, *, /)
  if (/^[0-9\\.\\s\\+\\-\\*/()]+$/.test(str) && /[\\+\\-\\*/]/.test(str)) {
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
"""

if 'const evaluateMathExpression' not in content:
    content = content.replace(
        "// Defensive Utility: Safe Date Formatting",
        helper_code + "\n// Defensive Utility: Safe Date Formatting"
    )

# 3. Update lucide-react imports if needed
import_match = re.search(r"import \{[^}]+\} from 'lucide-react';", content)
if import_match:
    icons = "LayoutDashboard, Settings, FileText, PlusCircle, Printer, Trash2, ChevronLeft, ChevronRight, Save, Edit2, Check, X, Download, Upload, ChevronUp, ChevronDown, ArrowRightLeft, Building2, Sparkles, Star, Search, RefreshCw, CheckCircle2, Calculator, MinusCircle"
    content = content[:import_match.start()] + f"import {{ {icons} }} from 'lucide-react';" + content[import_match.end():]

# 4. Update DataEntry with smart splitter
new_data_entry = """const DataEntry = () => {
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
                  placeholder="เช่น 246.00" 
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
                  placeholder="0.00 หรือ 246-90"
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
};"""

pattern_data_entry = re.compile(r"const DataEntry = \(\) => \{.*?(?=const Reports = )", re.DOTALL)
content = pattern_data_entry.sub(lambda _: new_data_entry + "\n\n", content)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Smart Splitter patch applied successfully.")
