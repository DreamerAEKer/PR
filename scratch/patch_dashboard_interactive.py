import re

# 1. Update App.css with interactive KPI and drilldown modal styles
css_addon = """
/* Interactive KPI Cards */
.manager-kpi.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.manager-kpi.clickable:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.manager-kpi.clickable.warning:hover {
  border-color: #f59e0b;
  box-shadow: 0 8px 20px rgba(245, 158, 11, 0.2);
}

.manager-kpi.clickable.danger:hover {
  border-color: #ef4444;
  box-shadow: 0 8px 20px rgba(239, 68, 68, 0.2);
}

.kpi-click-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-top: 4px;
  opacity: 0.85;
}

/* Drilldown Modals */
.drilldown-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
  animation: fadeIn 0.2s ease;
}

.drilldown-modal-content {
  background: var(--card-bg, #ffffff);
  border-radius: 16px;
  border: 1px solid var(--glass-border);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 820px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.25s ease;
}

.drilldown-modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--glass-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drilldown-modal-title {
  font-size: 1.15rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.drilldown-modal-body {
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.drilldown-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.drilldown-table th {
  background: rgba(241, 245, 249, 0.8);
  padding: 10px 12px;
  font-weight: 600;
  text-align: left;
  border-bottom: 2px solid var(--glass-border);
  white-space: nowrap;
}

.drilldown-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--glass-border);
  vertical-align: middle;
}

.drilldown-table tr:hover td {
  background: rgba(248, 250, 252, 0.8);
}

.btn-goto-edit {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.btn-goto-edit:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}
"""

with open('src/App.css', 'r', encoding='utf-8') as f:
    css = f.read()

if '.manager-kpi.clickable' not in css:
    css += "\n" + css_addon
    with open('src/App.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("App.css updated with drilldown styles.")

# 2. Update Dashboard in App.jsx
with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_dashboard = """const Dashboard = ({ setView }) => {
  const { records, services, companies, setNavigationTarget } = useApp();
  
  // States for filters
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'quarterly'
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Drilldown Modals
  const [anomalyModalOpen, setAnomalyModalOpen] = useState(false);
  const [missingMachineModalOpen, setMissingMachineModalOpen] = useState(false);

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

    // Detailed Anomaly Records List
    const anomalyRecords = currentPeriodRecords
      .map(r => {
        const anomaly = getRateAnomaly(services, r.serviceId, r.count, r.amount);
        const service = services.find(s => s.id === r.serviceId);
        const company = findCompanyForRecord(companies, r.companyId);
        if (!r.rateAnomalyConfirmed && !anomaly) return null;
        return {
          ...r,
          serviceName: service?.name || 'ไม่ทราบบริการ',
          companyName: company?.name || 'ไม่ทราบบริษัท',
          companyCode: company?.code || '',
          anomaly,
          minimumRate: anomaly?.minimumRate || r.rateAnomalyMinimumRate || 0,
          minimumTotal: anomaly?.minimumTotal || r.rateAnomalyMinimumTotal || 0,
          difference: anomaly?.difference || ((r.rateAnomalyMinimumTotal || 0) - r.amount)
        };
      })
      .filter(Boolean);

    // Detailed Missing Machine Companies List
    const missingMachineDetails = [];
    companies.forEach(company => {
      const companyRecords = currentPeriodRecords.filter(r => companyMatchesRecordId(company, r.companyId));
      if (companyRecords.length === 0) return;
      
      const dateMap = {};
      companyRecords.forEach(r => {
        if (!dateMap[r.date]) {
          dateMap[r.date] = { count: 0, amount: 0, hasReading: false };
        }
        dateMap[r.date].count += Number(r.count) || 0;
        dateMap[r.date].amount += Number(r.amount) || 0;
        if (r.machineRemaining !== null && r.machineRemaining !== undefined && r.machineAccumulated !== null && r.machineAccumulated !== undefined) {
          dateMap[r.date].hasReading = true;
        }
      });

      const dates = Object.keys(dateMap).sort();
      const lastDate = dates[dates.length - 1];
      if (lastDate && !dateMap[lastDate].hasReading) {
        missingMachineDetails.push({
          company,
          date: lastDate,
          count: dateMap[lastDate].count,
          amount: dateMap[lastDate].amount,
        });
      }
    });

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
      const previousQuarterYear = selectedQuarter === 1 ? selectedYear - 1 : selectedYear;
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
      anomalyRecords,
      missingMachineCount: missingMachineDetails.length,
      missingMachineDetails,
      companyRanking,
      categorySummary,
    };
  }, [records, services, companies, selectedMonth, selectedYear, selectedQuarter, selectedCompany, selectedCategory, viewMode]);

  const handleNavigateToEdit = (companyId, date) => {
    if (setNavigationTarget) {
      setNavigationTarget({ companyId, date });
    }
    if (setView) {
      setView('entry');
    }
    setAnomalyModalOpen(false);
    setMissingMachineModalOpen(false);
  };

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
        <div 
          className={`glass-card manager-kpi clickable ${stats.anomalyCount > 0 ? 'warning' : 'ok'}`}
          onClick={() => stats.anomalyCount > 0 && setAnomalyModalOpen(true)}
          title={stats.anomalyCount > 0 ? "คลิกเพื่อดูรายการและไปหน้าแก้ไข" : "ไม่มีรายการผิดปกติ"}
        >
          <span>รายการควรตรวจสอบ</span>
          <strong>{stats.anomalyCount.toLocaleString()} รายการ</strong>
          <small>ยอดต่ำกว่าเรทเริ่มต้นหรือเคยยืนยันแล้ว</small>
          {stats.anomalyCount > 0 && (
            <span className="kpi-click-hint" style={{ color: '#d97706' }}>
              คลิกเพื่อดูและไปแก้ไข ➜
            </span>
          )}
        </div>
        <div 
          className={`glass-card manager-kpi clickable ${stats.missingMachineCount > 0 ? 'danger' : 'ok'}`}
          onClick={() => stats.missingMachineCount > 0 && setMissingMachineModalOpen(true)}
          title={stats.missingMachineCount > 0 ? "คลิกเพื่อดูบริษัทที่ขาดและไปกรอกยอดเครื่อง" : "กรอกยอดเครื่องครบทุกแห่งแล้ว"}
        >
          <span>บริษัทยังขาดยอดเครื่อง</span>
          <strong>{stats.missingMachineCount.toLocaleString()} แห่ง</strong>
          <small>แถวบนและแถวล่างของวันล่าสุด</small>
          {stats.missingMachineCount > 0 && (
            <span className="kpi-click-hint" style={{ color: '#dc2626' }}>
              คลิกเพื่อดูและไปกรอก ➜
            </span>
          )}
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
          <h2 className="mb-6">อันดับรายได้ตามบริษัท</h2>
          <div className="ranking-list">
            {stats.companyRanking.slice(0, 5).map((item, index) => (
              <div key={item.companyId} className="ranking-item">
                <div className="rank-badge">{index + 1}</div>
                <div className="rank-info">
                  <div className="rank-name">{item.name}</div>
                  <div className="rank-meta">{item.count.toLocaleString()} ชิ้น ({item.share.toFixed(1)}%)</div>
                </div>
                <div className="rank-amount">฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drilldown Modal: Anomaly Records */}
      {anomalyModalOpen && (
        <div className="drilldown-modal-overlay" onClick={() => setAnomalyModalOpen(false)}>
          <div className="drilldown-modal-content" onClick={e => e.stopPropagation()}>
            <div className="drilldown-modal-header">
              <span className="drilldown-modal-title" style={{ color: '#d97706' }}>
                <Sparkles size={20} />
                <span>รายการที่ควรตรวจสอบ ({stats.anomalyRecords.length} รายการ)</span>
              </span>
              <button type="button" className="btn-icon" onClick={() => setAnomalyModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="drilldown-modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1rem' }}>
                รายการด้านล่างมียอดเงินต่ำกว่าเกณฑ์เริ่มต้น หรือได้รับการยืนยันบันทึกไว้ คลิกปุ่ม <strong>"ไปแก้ไข"</strong> เพื่อเปิดหน้าบันทึกข้อมูลของวันนั้นได้ทันที:
              </p>
              <div className="scroll-x">
                <table className="drilldown-table">
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>บริษัท</th>
                      <th>ประเภทบริการ</th>
                      <th>จำนวน</th>
                      <th>ยอดเงินที่กรอก</th>
                      <th>ยอดขั้นต่ำที่ควรเป็น</th>
                      <th>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.anomalyRecords.map((item, idx) => (
                      <tr key={item.timestamp || `${item.date}_${item.serviceId}_${idx}`}>
                        <td>{safeFormat(item.date, 'dd/MM/yyyy', { locale: th })}</td>
                        <td>
                          <strong>{item.companyName}</strong>
                          {item.companyCode && <small style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>({item.companyCode})</small>}
                        </td>
                        <td>{item.serviceName}</td>
                        <td>{item.count} ชิ้น</td>
                        <td style={{ color: '#ef4444', fontWeight: 700 }}>฿{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td style={{ color: 'var(--text-muted)' }}>฿{Number(item.minimumTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td>
                          <button 
                            type="button" 
                            className="btn-goto-edit" 
                            onClick={() => handleNavigateToEdit(item.companyId, item.date)}
                            title="เปิดหน้าบันทึกข้อมูลเพื่อแก้ไขรายการนี้"
                          >
                            <Edit2 size={13} /> ไปแก้ไข
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drilldown Modal: Missing Machine Readings */}
      {missingMachineModalOpen && (
        <div className="drilldown-modal-overlay" onClick={() => setMissingMachineModalOpen(false)}>
          <div className="drilldown-modal-content" onClick={e => e.stopPropagation()}>
            <div className="drilldown-modal-header">
              <span className="drilldown-modal-title" style={{ color: '#dc2626' }}>
                <RefreshCw size={20} />
                <span>บริษัทที่ยังขาดยอดเครื่อง ({stats.missingMachineDetails.length} แห่ง)</span>
              </span>
              <button type="button" className="btn-icon" onClick={() => setMissingMachineModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="drilldown-modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1rem' }}>
                บริษัทด้านล่างมีการบันทึกค่าบริการ แต่ยังไม่ได้ลง <strong>ยอดคงเหลือ (แถวบน) หรือยอดสะสม (แถวล่าง)</strong> ในวันล่าสุด คลิกปุ่ม <strong>"ไปกรอกยอดเครื่อง"</strong> เพื่อไปยังหน้าบันทึกข้อมูลของวันและบริษัทนั้นทันที:
              </p>
              <div className="scroll-x">
                <table className="drilldown-table">
                  <thead>
                    <tr>
                      <th>รหัส</th>
                      <th>ชื่อบริษัท</th>
                      <th>วันล่าสุดที่มีรายการ</th>
                      <th>ยอดค่าบริการของวันนั้น</th>
                      <th>จำนวนชิ้น</th>
                      <th>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.missingMachineDetails.map(item => (
                      <tr key={item.company.id}>
                        <td><span className="active-company-badge" style={{ fontSize: '0.75rem' }}>{item.company.code || '-'}</span></td>
                        <td><strong>{item.company.name}</strong></td>
                        <td>{safeFormat(item.date, 'EEEEที่ d MMMM yyyy', { locale: th })}</td>
                        <td style={{ color: 'var(--primary)', fontWeight: 700 }}>฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td>{item.count.toLocaleString()} ชิ้น</td>
                        <td>
                          <button 
                            type="button" 
                            className="btn-goto-edit" 
                            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                            onClick={() => handleNavigateToEdit(item.company.id, item.date)}
                            title="เปิดหน้าบันทึกข้อมูลเพื่อกรอกยอดเครื่องให้บริษัทนี้"
                          >
                            <Save size={13} /> ไปกรอกยอดเครื่อง
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};"""

pattern_dashboard = re.compile(r"const Dashboard = \(.*?\) => \{.*?(?=const ServicesManager = )", re.DOTALL)
content = pattern_dashboard.sub(lambda _: new_dashboard + "\n\n", content)

# 3. Ensure <Dashboard setView={setView} /> in AppContent
content = content.replace(
    "{view === 'dashboard' && <Dashboard />}",
    "{view === 'dashboard' && <Dashboard setView={setView} />}"
)

# 4. Enhance Reports warning modal with item-by-item direct links
reports_missing_old = """              <ul style={{ marginTop: '0.75rem', paddingLeft: '1.25rem', maxHeight: '180px', overflowY: 'auto' }}>
                {missingReadings.map((item, index) => (
                  <li key={index} style={{ marginBottom: '8px', textAlign: 'left' }}>
                    <strong>{item.companyName}</strong> (วันสุดท้าย: {safeFormat(item.date, 'dd/MM/yyyy', { locale: th })})
                  </li>
                ))}
              </ul>"""

reports_missing_new = """              <div style={{ marginTop: '0.75rem', maxHeight: '220px', overflowY: 'auto' }}>
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
              </div>"""

content = content.replace(reports_missing_old, reports_missing_new)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Dashboard interactive patch applied successfully.")
