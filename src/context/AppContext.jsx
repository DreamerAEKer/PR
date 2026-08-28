import React, { createContext, useContext, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { get, set } from 'idb-keyval';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);

  // Helper for keyword matching
  const findServiceMatch = (name, code, currentServices) => {
    // 1. Match by Code
    if (code) {
      const match = currentServices.find(s => s.code === code);
      if (match) return match.id;
    }
    // 2. Fuzzy match by name/keywords
    const n = name.toLowerCase();
    const isInter = n.includes('ต่างประเทศ') || n.includes('ระหว่างประเทศ') || n.includes('inter');
    
    if (n.includes('ems') || n.includes('ด่วนพิเศษ')) {
      const match = currentServices.find(s => s.name.includes('ด่วนพิเศษ') && (isInter ? s.category === 'international' : s.category === 'domestic'));
      if (match) return match.id;
    }
    
    if (n.includes('ลงทะเบียน') || n.includes('ecopost') || n.includes('eco-post') || n.includes('epacket')) {
      const match = currentServices.find(s => s.name.includes('ลงทะเบียน') && (isInter ? s.category === 'international' : s.category === 'domestic'));
      if (match) return match.id;
    }

    if (n.includes('รับประกัน')) {
      const match = currentServices.find(s => s.name.includes('รับประกัน') && (isInter ? s.category === 'international' : s.category === 'domestic'));
      if (match) return match.id;
    }

    return null;
  };

  const [services, setServices] = useState(() => {
    const defaultServices = [
      { id: '1', name: 'รายได้ไปรษณียภัณฑ์ในประเทศ-ธรรมดา', code: '41010401', category: 'domestic', reportGroupId: '1', isQuickSelect: true },
      { id: '2', name: 'รายได้ไปรษณียภัณฑ์ในประเทศ-รับรอง', code: '41010411', category: 'domestic', reportGroupId: '2', isQuickSelect: false },
      { id: '3', name: 'รายได้ไปรษณียภัณฑ์ในประเทศ-ลงทะเบียน', code: '41010421', category: 'domestic', reportGroupId: '3', isQuickSelect: true },
      { id: '4', name: 'รายได้ไปรษณียภัณฑ์ในประเทศ-รับประกัน', code: '41010431', category: 'domestic', reportGroupId: '4', isQuickSelect: false },
      { id: '5', name: 'รายได้ไปรษณียภัณฑ์ระหว่างประเทศ-ธรรมดา', code: '41010501', category: 'international', reportGroupId: '5', isQuickSelect: true },
      { id: '6', name: 'รายได้ไปรษณียภัณฑ์ระหว่างประเทศ-ลงทะเบียน', code: '41010511', category: 'international', reportGroupId: '6', isQuickSelect: true },
      { id: '7', name: 'รายได้ไปรษณียภัณฑ์ระหว่างประเทศ-รับประกัน', code: '41010521', category: 'international', reportGroupId: '7', isQuickSelect: false },
      { id: '8', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ในประเทศ-ธรรมดา', code: '41010601', category: 'domestic', reportGroupId: '8', isQuickSelect: true },
      { id: '9', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ในประเทศ-รับประกัน', code: '41010611', category: 'domestic', reportGroupId: '9', isQuickSelect: false },
      { id: '10', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ระหว่างประเทศ-ธรรมดา', code: '41010701', category: 'international', reportGroupId: '10', isQuickSelect: true },
      { id: '11', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ระหว่างประเทศ-รับประกัน', code: '41010711', category: 'international', reportGroupId: '11', isQuickSelect: false },
      { id: '12', name: 'รายได้ไปรษณีย์ด่วนพิเศษในประเทศ', code: '41010801', category: 'domestic', reportGroupId: '12', isQuickSelect: true },
      { id: '13', name: 'รายได้ไปรษณีย์ด่วนพิเศษระหว่างประเทศ', code: '41010901', category: 'international', reportGroupId: '13', isQuickSelect: true },
      { id: '17', name: 'สิ่งพิมพ์ธรรมดาในประเทศ', code: '41010402', category: 'domestic', reportGroupId: '1', isQuickSelect: true },
      { id: '18', name: 'ไปรษณีย์บัตรในประเทศ', code: '41010403', category: 'domestic', reportGroupId: '1', isQuickSelect: false },
      { id: '19', name: 'สิ่งพิมพ์ธรรมดาต่างประเทศ', code: '41010502', category: 'international', reportGroupId: '5', isQuickSelect: true },
      { id: '20', name: 'ไปรษณีย์บัตรต่างประเทศ', code: '41010503', category: 'international', reportGroupId: '5', isQuickSelect: false },
      { id: '21', name: 'พัสดุย่อย', code: '41010721', category: 'international', reportGroupId: '10', isQuickSelect: true },
      { id: '15', name: 'บริการ eCo-Post', code: 'ECO01', category: 'domestic', reportGroupId: '3', isQuickSelect: true },
      { id: '16', name: 'บริการ ePacket', code: 'EPK01', category: 'international', reportGroupId: '6', isQuickSelect: true }
    ];

    const saved = localStorage.getItem('postage_services');
    if (saved) {
      const parsed = JSON.parse(saved);
      const currentMap = new Map(parsed.map(s => [s.code || s.id, s]));
      
      const merged = [...parsed];
      defaultServices.forEach(ds => {
        const existing = currentMap.get(ds.code);
        if (!existing) {
          merged.push(ds);
        } else {
          existing.name = ds.name;
          existing.reportGroupId = ds.reportGroupId;
          if (existing.isQuickSelect === undefined) existing.isQuickSelect = ds.isQuickSelect;
        }
      });
      return merged;
    }
    return defaultServices;
  });

  const [companies, setCompanies] = useState(() => {
    const saved = localStorage.getItem('postage_companies');
    return saved ? JSON.parse(saved) : [
      { id: 'h0032', name: 'บ.เอเชี่ยนฮอนด้าคอมเมอร์ส จก.', code: 'H0032', order: 1, showInEntry: true, showInReport: true, isQuickSelect: true },
      { id: 'h0128', name: 'บ.ไทยเศรษฐกิจประกันภัย จก.(มหาชน)', code: 'H0128', order: 2, showInEntry: true, showInReport: true, isQuickSelect: true },
      { id: 'h0130', name: 'บ.สิทธิผล 1919 จก.', code: 'H0130', order: 3, showInEntry: true, showInReport: true, isQuickSelect: true },
      { id: 'h0143', name: 'บ.เอสเอวายเอ(ประเทศไทย)จำกัด', code: 'H0143', order: 4, showInEntry: true, showInReport: true, isQuickSelect: true },
      { id: 'h0148', name: 'ราชกรีฑาสโมสร', code: 'H0148', order: 5, showInEntry: true, showInReport: true, isQuickSelect: true },
      { id: 'h0223', name: 'บ.สรรพสินค้าเซ็นทรัล จก.', code: 'H0223', order: 6, showInEntry: true, showInReport: true, isQuickSelect: true },
      { id: 'h0241', name: 'สำนักงานบริการโทรศัพท์สุรวงศ์', code: 'H0241', order: 7, showInEntry: true, showInReport: true, isQuickSelect: true },
      { id: 'h0250', name: 'บ.โรงแรมรอยัลออคิด(ปทท) จก.(มหาชน)', code: 'H0250', order: 8, showInEntry: true, showInReport: true, isQuickSelect: true },
      { id: 'h0267', name: 'หสน.ดัลลัส แอนด์ กิ๊บบินส์', code: 'H0267', order: 9, showInEntry: true, showInReport: true, isQuickSelect: true },
      { id: 'h0298', name: 'ธ.มิตซูโฮคอร์ปอเรต จก. สาขากรุงเทพฯ', code: 'H0298', order: 10, showInEntry: true, showInReport: true, isQuickSelect: true },
      { id: 'h0308', name: 'บ.ซิงเกอร์ประเทศไทย จำกัด', code: 'H0308', order: 11, showInEntry: true, showInReport: true, isQuickSelect: false },
      { id: 'p0403', name: 'บ.พาราวันเซอร์วิส จก.', code: 'P0403', order: 12, showInEntry: true, showInReport: true, isQuickSelect: false },
      { id: 'p0574', name: 'ธนาคารสากลพาณิชย์แห่งประเทศจีน', code: 'P0574', order: 13, showInEntry: true, showInReport: true, isQuickSelect: false },
      { id: 'p0617', name: 'บ.อเวนติส ฟาร์มา จก.', code: 'P0617', order: 14, showInEntry: true, showInReport: true, isQuickSelect: false },
      { id: 'p0727', name: 'บ.ดูปองต์(ประเทศไทย)จก.', code: 'P0727', order: 15, showInEntry: true, showInReport: true, isQuickSelect: false },
      { id: 'p1074', name: 'บ.พรีเชียส ชิปปิ้ง จก.(มหาชน)', code: 'P1074', order: 16, showInEntry: true, showInReport: true, isQuickSelect: false },
      { id: 'p3028', name: 'สถานทูตอเมริกา', code: 'P3028', order: 17, showInEntry: true, showInReport: true, isQuickSelect: false },
      { id: 'p3064', name: 'สถานเอกอัครราชทูตแคนาดา', code: 'P3064', order: 18, showInEntry: true, showInReport: true, isQuickSelect: false },
      { id: 'p3088', name: 'สถานเอกอัครราชทูตสวิสเซอร์แลนด์', code: 'P3088', order: 19, showInEntry: true, showInReport: true, isQuickSelect: false },
      { id: 'p3111', name: 'บ.นิวแฮปเชียร์ อินชัวรันส์ จก.', code: 'P3111', order: 20, showInEntry: true, showInReport: true, isQuickSelect: false },
      { id: 'p3114', name: 'บ.มิตรแท้ประกันภัย จำกัด', code: 'P3114', order: 21, showInEntry: true, showInReport: true, isQuickSelect: false },
      { id: 'p3115', name: 'บ.ฮี โด ชู (ไทยแลนด์) จก.', code: 'P3115', order: 22, showInEntry: true, showInReport: true, isQuickSelect: false },
      { id: 'n20011', name: 'บ.ล็อกเล่ย์ (กรุงเทพฯ) จก.', code: 'N20011', order: 23, showInEntry: true, showInReport: true, isQuickSelect: false },
      { id: 'n20028', name: 'บริษัท ไบเออร์ไทย จำกัด', code: 'N20028', order: 24, showInEntry: true, showInReport: true, isQuickSelect: false },
      { id: 'n20032', name: 'สำนักกฎหมายดำเนินสมเกียรติและบุญมา', code: 'N20032', order: 25, showInEntry: true, showInReport: true, isQuickSelect: false },
      { id: 'n40011', name: 'บ.บริหารสินทรัพย์กรุงเทพพาณิชย์การ จก.', code: 'N40011', order: 26, showInEntry: true, showInReport: true, isQuickSelect: false },
      { id: 'n40016', name: 'บริษัท ฟิลิปประกันชีวิต จำกัด (มหาชน)', code: 'N40016', order: 27, showInEntry: true, showInReport: true, isQuickSelect: false },
      { id: 'n40019', name: 'Sumitomo Corporation', code: 'N40019', order: 28, showInEntry: true, showInReport: true, isQuickSelect: false },
      { id: 'n40021', name: 'ธ.แห่งอเมริกา เนชั่นแนล แอสโซซิเอชั่น', code: 'N40021', order: 29, showInEntry: true, showInReport: true, isQuickSelect: false },
      { id: 'n40022', name: 'เมอร์เซเดส-เบนซ์', code: 'N40022', order: 30, showInEntry: true, showInReport: true, isQuickSelect: false },
      { id: 'n40027', name: 'สถานทูตเยอรมนี', code: 'N40027', order: 31, showInEntry: true, showInReport: true, isQuickSelect: false }
    ];
  });

  const [records, setRecords] = useState([]);
  const [primaryLocation, setPrimaryLocationState] = useState(() => {
    return localStorage.getItem('postage_primary_location') || '';
  });
  const [primaryRecordCount, setPrimaryRecordCount] = useState(() => {
    return Number(localStorage.getItem('postage_primary_record_count')) || 0;
  });
  const [machineReadings, setMachineReadings] = useState([]);
  const [navigationTarget, setNavigationTarget] = useState(null);

  useEffect(() => {
    async function loadStorage() {
      try {
        const standardCompanies = [
          { id: 'h0032', name: 'บ.เอเชี่ยนฮอนด้าคอมเมอร์ส จก.', code: 'H0032', order: 1, showInEntry: true, showInReport: true, isQuickSelect: true },
          { id: 'h0128', name: 'บ.ไทยเศรษฐกิจประกันภัย จก.(มหาชน)', code: 'H0128', order: 2, showInEntry: true, showInReport: true, isQuickSelect: true },
          { id: 'h0130', name: 'บ.สิทธิผล 1919 จก.', code: 'H0130', order: 3, showInEntry: true, showInReport: true, isQuickSelect: true },
          { id: 'h0143', name: 'บ.เอสเอวายเอ(ประเทศไทย)จำกัด', code: 'H0143', order: 4, showInEntry: true, showInReport: true, isQuickSelect: true },
          { id: 'h0148', name: 'ราชกรีฑาสโมสร', code: 'H0148', order: 5, showInEntry: true, showInReport: true, isQuickSelect: true },
          { id: 'h0223', name: 'บ.สรรพสินค้าเซ็นทรัล จก.', code: 'H0223', order: 6, showInEntry: true, showInReport: true, isQuickSelect: true },
          { id: 'h0241', name: 'สำนักงานบริการโทรศัพท์สุรวงศ์', code: 'H0241', order: 7, showInEntry: true, showInReport: true, isQuickSelect: true },
          { id: 'h0250', name: 'บ.โรงแรมรอยัลออคิด(ปทท) จก.(มหาชน)', code: 'H0250', order: 8, showInEntry: true, showInReport: true, isQuickSelect: true },
          { id: 'h0267', name: 'หสน.ดัลลัส แอนด์ กิ๊บบินส์', code: 'H0267', order: 9, showInEntry: true, showInReport: true, isQuickSelect: true },
          { id: 'h0298', name: 'ธ.มิตซูโฮคอร์ปอเรต จก. สาขากรุงเทพฯ', code: 'H0298', order: 10, showInEntry: true, showInReport: true, isQuickSelect: true },
          { id: 'h0308', name: 'บ.ซิงเกอร์ประเทศไทย จำกัด', code: 'H0308', order: 11, showInEntry: true, showInReport: true, isQuickSelect: false },
          { id: 'p0403', name: 'บ.พาราวันเซอร์วิส จก.', code: 'P0403', order: 12, showInEntry: true, showInReport: true, isQuickSelect: false },
          { id: 'p0574', name: 'ธนาคารสากลพาณิชย์แห่งประเทศจีน', code: 'P0574', order: 13, showInEntry: true, showInReport: true, isQuickSelect: false },
          { id: 'p0617', name: 'บ.อเวนติส ฟาร์มา จก.', code: 'P0617', order: 14, showInEntry: true, showInReport: true, isQuickSelect: false },
          { id: 'p0727', name: 'บ.ดูปองต์(ประเทศไทย)จก.', code: 'P0727', order: 15, showInEntry: true, showInReport: true, isQuickSelect: false },
          { id: 'p1074', name: 'บ.พรีเชียส ชิปปิ้ง จก.(มหาชน)', code: 'P1074', order: 16, showInEntry: true, showInReport: true, isQuickSelect: false },
          { id: 'p3028', name: 'สถานทูตอเมริกา', code: 'P3028', order: 17, showInEntry: true, showInReport: true, isQuickSelect: false },
          { id: 'p3064', name: 'สถานเอกอัครราชทูตแคนาดา', code: 'P3064', order: 18, showInEntry: true, showInReport: true, isQuickSelect: false },
          { id: 'p3088', name: 'สถานเอกอัครราชทูตสวิสเซอร์แลนด์', code: 'P3088', order: 19, showInEntry: true, showInReport: true, isQuickSelect: false },
          { id: 'p3111', name: 'บ.นิวแฮมพ์เชียร์ อินชัวรันส์ จก.', code: 'P3111', order: 20, showInEntry: true, showInReport: true, isQuickSelect: false },
          { id: 'p3114', name: 'บ.มิตรแท้ประกันภัย จำกัด', code: 'P3114', order: 21, showInEntry: true, showInReport: true, isQuickSelect: false },
          { id: 'p3115', name: 'บ.ฮี โด ชู (ไทยแลนด์) จก.', code: 'P3115', order: 22, showInEntry: true, showInReport: true, isQuickSelect: false },
          { id: 'n20011', name: 'บ.ล็อกเล่ย์ (กรุงเทพฯ) จก.', code: 'N20011', order: 23, showInEntry: true, showInReport: true, isQuickSelect: false },
          { id: 'n20028', name: 'บริษัท ไบเออร์ไทย จำกัด', code: 'N20028', order: 24, showInEntry: true, showInReport: true, isQuickSelect: false },
          { id: 'n20032', name: 'สำนักกฎหมายดำเนินสมเกียรติและบุญมา', code: 'N20032', order: 25, showInEntry: true, showInReport: true, isQuickSelect: false },
          { id: 'n40011', name: 'บ.บริหารสินทรัพย์กรุงเทพพาณิชย์การ จก.', code: 'N40011', order: 26, showInEntry: true, showInReport: true, isQuickSelect: false },
          { id: 'n40016', name: 'บริษัท ฟิลิปประกันชีวิต จำกัด (มหาชน)', code: 'N40016', order: 27, showInEntry: true, showInReport: true, isQuickSelect: false },
          { id: 'n40019', name: 'Sumitomo Corporation', code: 'N40019', order: 28, showInEntry: true, showInReport: true, isQuickSelect: false },
          { id: 'n40021', name: 'ธ.แห่งอเมริกา เนชั่นแนล แอสโซซิเอชั่น', code: 'N40021', order: 29, showInEntry: true, showInReport: true, isQuickSelect: false },
          { id: 'n40022', name: 'เมอร์เซเดส-เบนซ์', code: 'N40022', order: 30, showInEntry: true, showInReport: true, isQuickSelect: false },
          { id: 'n40027', name: 'สถานทูตเยอรมนี', code: 'N40027', order: 31, showInEntry: true, showInReport: true, isQuickSelect: false }
        ];

        setCompanies(prev => {
          const sortedCurrent = [...prev].sort((a,b) => {
            if (a.order != null && b.order != null) return a.order - b.order;
            if (a.order != null) return -1;
            if (b.order != null) return 1;
            if (a.code && b.code) return a.code.localeCompare(b.code, 'en', { numeric: true });
            if (a.code) return -1;
            if (b.code) return 1;
            const setAsPrimaryLocation = (locHref) => {
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

  return (a.name || '').localeCompare(b.name || '', 'th');
          });

          let changed = false;
          const updated = sortedCurrent.map((c, idx) => {
            let u = { ...c };
            if (u.order === undefined) {
              u.order = idx + 1;
              changed = true;
            }
            if (u.showInEntry === undefined) {
              u.showInEntry = u.isHidden === undefined ? true : !u.isHidden;
              changed = true;
            }
            if (u.showInReport === undefined) {
              u.showInReport = u.isHidden === undefined ? true : !u.isHidden;
              changed = true;
            }
            if (u.isQuickSelect === undefined) {
              u.isQuickSelect = (u.order || idx + 1) <= 10;
              changed = true;
            }
            if (u.hasOwnProperty('isHidden')) {
              delete u.isHidden;
              changed = true;
            }
            return u;
          });

          standardCompanies.forEach(sc => {
            if (!updated.find(c => c.code === sc.code)) {
              updated.push(sc);
              changed = true;
            }
          });

          return changed ? updated : prev;
        });

        let idbRecords = await get('postage_records');
        let idbMachineReadings = await get('postage_machine_readings');

        // Migration from localStorage
        if (!idbRecords) {
          const localRecordsStr = localStorage.getItem('postage_records');
          if (localRecordsStr) {
            idbRecords = JSON.parse(localRecordsStr);
            await set('postage_records', idbRecords);
          } else {
            idbRecords = [];
          }
        }

        if (!idbMachineReadings) {
          const localMRStr = localStorage.getItem('postage_machine_readings');
          if (localMRStr) {
            idbMachineReadings = JSON.parse(localMRStr);
            await set('postage_machine_readings', idbMachineReadings);
          } else {
            // Legacy Migration from records on first load
            const grouped = {};
            if (idbRecords && idbRecords.length > 0) {
              idbRecords.forEach(r => {
                if (r && (r.machineRemaining != null || r.machineAccumulated != null)) {
                  const key = `${r.date}__${r.companyId}`;
                  if (!grouped[key] || (r.timestamp || 0) > (grouped[key].timestamp || 0)) {
                    grouped[key] = r;
                  }
                }
              });
            }
            idbMachineReadings = Object.values(grouped).map(r => ({
              id: `mig_${r.date}_${r.companyId}`,
              date: r.date,
              companyId: r.companyId,
              machineRemaining: r.machineRemaining,
              machineAccumulated: r.machineAccumulated,
              topUpAmount: r.topUpAmount || 0,
              isTopUp: (r.topUpAmount || 0) > 0,
              timestamp: r.timestamp || 0,
            }));
            if (idbMachineReadings.length > 0) {
              await set('postage_machine_readings', idbMachineReadings);
            }
          }
        }

        setRecords(idbRecords);
        setMachineReadings(idbMachineReadings);
      } catch (error) {
        console.error('Failed to load data from IndexedDB:', error);
      } finally {
        // Auto-register primary location on load if not set or if this origin has more records
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

        setIsStorageLoaded(true);
      }
    }
    loadStorage();
  }, []);

  const [reportLogo, setReportLogo] = useState(() => {
    return localStorage.getItem('postage_report_logo') || null;
  });

  const [reportLogoSize, setReportLogoSize] = useState(() => {
    return Number(localStorage.getItem('postage_report_logo_size')) || 80;
  });

  const [reportLogoAlign, setReportLogoAlign] = useState(() => {
    return localStorage.getItem('postage_report_logo_align') || 'center';
  });

  useEffect(() => {
    try {
      if (reportLogo) {
        localStorage.setItem('postage_report_logo', reportLogo);
        localStorage.setItem('postage_report_logo_size', reportLogoSize.toString());
        localStorage.setItem('postage_report_logo_align', reportLogoAlign);
      } else {
        localStorage.removeItem('postage_report_logo');
      }
    } catch (e) {
      console.error('Failed to save logo settings:', e);
    }
  }, [reportLogo, reportLogoSize, reportLogoAlign]);

  useEffect(() => {
    try {
      localStorage.setItem('postage_services', JSON.stringify(services));
    } catch (e) {
      console.error('Failed to save services to localStorage:', e);
    }
  }, [services]);

  useEffect(() => {
    try {
      localStorage.setItem('postage_companies', JSON.stringify(companies));
    } catch (e) {
      console.error('Failed to save companies to localStorage:', e);
    }
  }, [companies]);

  useEffect(() => {
    if (!isStorageLoaded) return;
    set('postage_records', records).catch(e => {
      console.error('Failed to save records to IndexedDB:', e);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    });
  }, [records, isStorageLoaded]);

  useEffect(() => {
    if (!isStorageLoaded) return;
    set('postage_machine_readings', machineReadings).catch(e => {
      console.error('Failed to save machine readings to IndexedDB:', e);
    });
  }, [machineReadings, isStorageLoaded]);

  const addRecord = (newRecords) => {
    if (!newRecords || !Array.isArray(newRecords)) return;
    
    // Filter out invalid/null records
    const validNewRecords = newRecords.filter(nr => nr && nr.serviceId && nr.date);
    if (validNewRecords.length === 0) return;

    setRecords(prev => {
      const currentRecords = Array.isArray(prev) ? prev : [];
      const filtered = currentRecords.filter(r => 
        r && !validNewRecords.some(nr => 
          (nr.timestamp && r.timestamp === nr.timestamp) || 
          (!nr.timestamp && nr.date === r.date && nr.companyId === r.companyId && nr.serviceId === r.serviceId)
        )
      );
      return [...filtered, ...validNewRecords];
    });
  };

  const updateService = (id, updated) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
  };

  const updateCompany = (id, updated) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
  };

  const deleteSingleRecord = (serviceId, date, companyId, timestamp) => {
    setRecords(prev => prev.filter(r => {
      if (timestamp && r.timestamp && String(r.timestamp) === String(timestamp)) return false;
      if (String(r.serviceId) === String(serviceId) && String(r.date) === String(date) && String(r.companyId) === String(companyId)) {
        if (!timestamp || !r.timestamp) return false;
      }
      return true;
    }));
  };

  const deleteRecords = (date, companyId) => {
    setRecords(prev => prev.filter(r => !(r.date === date && r.companyId === companyId)));
  };

  const addMachineReading = (reading) => {
    setMachineReadings(prev => {
      const filtered = prev.filter(r => !(r.date === reading.date && r.companyId === reading.companyId));
      return [...filtered, { ...reading, id: `mr_${Date.now()}`, timestamp: Date.now() }];
    });
  };

  const deleteMachineReading = (date, companyId) => {
    setMachineReadings(prev => prev.filter(r => !(r.date === date && r.companyId === companyId)));
  };

  const moveSingleRecord = (record, { targetCompanyId, targetDate }) => {
    if (!record) return;
    setRecords(prev => prev.map(r => {
      const isMatch = (record.timestamp && r.timestamp && String(r.timestamp) === String(record.timestamp)) ||
        (!record.timestamp && r.date === record.date && r.companyId === record.companyId && r.serviceId === record.serviceId);
      if (isMatch) {
        return {
          ...r,
          companyId: targetCompanyId || r.companyId,
          date: targetDate || r.date
        };
      }
      return r;
    }));
  };

  const moveDailyRecords = (fromDate, fromCompanyId, { targetCompanyId, targetDate }) => {
    if (!fromDate || !fromCompanyId) return;
    const toCompanyId = targetCompanyId || fromCompanyId;
    const toDate = targetDate || fromDate;
    if (fromDate === toDate && fromCompanyId === toCompanyId) return;

    setRecords(prev => prev.map(r => {
      if (r.date === fromDate && r.companyId === fromCompanyId) {
        return {
          ...r,
          companyId: toCompanyId,
          date: toDate
        };
      }
      return r;
    }));

    setMachineReadings(prev => prev.map(mr => {
      if (mr.date === fromDate && mr.companyId === fromCompanyId) {
        return {
          ...mr,
          companyId: toCompanyId,
          date: toDate
        };
      }
      return mr;
    }));
  };

  const moveSingleRecordToCompany = (record, targetCompanyId) => {
    moveSingleRecord(record, { targetCompanyId });
  };

  const moveDailyRecordsToCompany = (date, fromCompanyId, targetCompanyId) => {
    moveDailyRecords(date, fromCompanyId, { targetCompanyId });
  };

  const toggleCompanyQuickSelect = (companyId) => {
    setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, isQuickSelect: !(c.isQuickSelect ?? true) } : c));
  };

  const reorderCompaniesByCode = () => {
    setCompanies(prev => {
      const sorted = [...prev].sort((a,b) => {
        if (a.code && b.code) return a.code.localeCompare(b.code, 'en', { numeric: true });
        if (a.code) return -1;
        if (b.code) return 1;
        return (a.name || '').localeCompare(b.name || '', 'th');
      });
      return sorted.map((c, idx) => ({ ...c, order: idx + 1 }));
    });
  };

  const moveCompany = (id, direction) => {
    setCompanies(prev => {
      const sorted = [...prev].sort((a,b) => (a.order || 0) - (b.order || 0));
      const idx = sorted.findIndex(c => c.id === id);
      if (idx === -1) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === sorted.length - 1) return prev;

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      
      const newSorted = [...sorted];
      const temp = newSorted[idx];
      newSorted[idx] = newSorted[targetIdx];
      newSorted[targetIdx] = temp;

      return newSorted.map((c, i) => ({ ...c, order: i + 1 }));
    });
  };

  const exportData = () => {
    const data = { services, companies, records, machineReadings, version: '1.2', exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `postage_report_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data.services) && Array.isArray(data.companies) && Array.isArray(data.records)) {
          const normalize = value => String(value ?? '').trim().toLowerCase();
          const currentCompanyByImportId = new Map();
          const mergedCompanies = [...companies];

          data.companies.forEach(importedCompany => {
            const matched = mergedCompanies.find(company =>
              normalize(company.code) === normalize(importedCompany.code) ||
              normalize(company.id) === normalize(importedCompany.id)
            );
            if (matched) {
              currentCompanyByImportId.set(normalize(importedCompany.id), matched.id);
            } else {
              mergedCompanies.push(importedCompany);
              currentCompanyByImportId.set(normalize(importedCompany.id), importedCompany.id);
            }
          });

          const importedServiceToCurrent = new Map();
          const mergedServices = [...services];
          data.services.forEach(importedService => {
            const matchedId = findServiceMatch(importedService.name, importedService.code, mergedServices);
            if (matchedId) {
              importedServiceToCurrent.set(normalize(importedService.id), matchedId);
            } else {
              mergedServices.push(importedService);
              importedServiceToCurrent.set(normalize(importedService.id), importedService.id);
            }
          });

          const processedRecords = data.records.map(record => ({
            ...record,
            companyId: currentCompanyByImportId.get(normalize(record.companyId)) || record.companyId,
            serviceId: importedServiceToCurrent.get(normalize(record.serviceId)) || record.serviceId,
          }));

          const recordKey = record => record.timestamp != null
            ? `timestamp:${record.timestamp}`
            : [record.date, record.companyId, record.serviceId, record.count, record.amount,
                record.machineRemaining, record.machineAccumulated, record.topUpAmount].join('|');
          const recordValue = record => [record.date, record.companyId, record.serviceId, record.count,
            record.amount, record.machineRemaining, record.machineAccumulated, record.topUpAmount].join('|');
          const existingRecordsByKey = new Map(records.map(record => [recordKey(record), record]));
          const newRecords = processedRecords.filter(record => !existingRecordsByKey.has(recordKey(record)));
          const conflictingRecords = processedRecords.filter(record => {
            const existing = existingRecordsByKey.get(recordKey(record));
            return existing && recordValue(existing) !== recordValue(record);
          });

          const importedMachineReadings = Array.isArray(data.machineReadings)
            ? data.machineReadings.map(reading => ({
                ...reading,
                companyId: currentCompanyByImportId.get(normalize(reading.companyId)) || reading.companyId,
              }))
            : [];
          const readingKey = reading => reading.id != null
            ? `id:${reading.id}`
            : [reading.date, reading.companyId, reading.machineRemaining,
                reading.machineAccumulated, reading.topUpAmount].join('|');
          const readingValue = reading => [reading.date, reading.companyId, reading.machineRemaining,
            reading.machineAccumulated, reading.topUpAmount, reading.isTopUp].join('|');
          const existingReadingsByKey = new Map(machineReadings.map(reading => [readingKey(reading), reading]));
          const newMachineReadings = importedMachineReadings.filter(reading => !existingReadingsByKey.has(readingKey(reading)));
          const conflictingReadings = importedMachineReadings.filter(reading => {
            const existing = existingReadingsByKey.get(readingKey(reading));
            return existing && readingValue(existing) !== readingValue(reading);
          });

          const companyMasterChanged = mergedCompanies.length !== companies.length || data.companies.some(imported => {
            const current = companies.find(company =>
              normalize(company.code) === normalize(imported.code) || normalize(company.id) === normalize(imported.id)
            );
            return current && (normalize(current.name) !== normalize(imported.name) ||
              normalize(current.code) !== normalize(imported.code));
          });
          const serviceMasterChanged = mergedServices.length !== services.length || data.services.some(imported => {
            const matchedId = importedServiceToCurrent.get(normalize(imported.id));
            const current = services.find(service => service.id === matchedId);
            return current && (normalize(current.name) !== normalize(imported.name) ||
              normalize(current.code) !== normalize(imported.code) ||
              normalize(current.category) !== normalize(imported.category));
          });
          const hasConflicts = conflictingRecords.length > 0 || conflictingReadings.length > 0;
          if (companyMasterChanged || serviceMasterChanged || hasConflicts) {
            const changes = [
              companyMasterChanged ? 'ข้อมูลบริษัทแตกต่างกัน' : null,
              serviceMasterChanged ? 'ข้อมูลบริการแตกต่างกัน' : null,
              conflictingRecords.length > 0 ? `รายการบันทึกขัดแย้ง ${conflictingRecords.length} รายการ` : null,
              conflictingReadings.length > 0 ? `ยอดเครื่องขัดแย้ง ${conflictingReadings.length} รายการ` : null,
            ].filter(Boolean).join(' และ ');
            const approved = confirm(
              `ไฟล์สำรองมีข้อมูลหลักแตกต่างจากแอป (${changes})\n\n` +
              `ระบบจะเพิ่มเฉพาะข้อมูลที่ยังไม่มี และจะไม่ลบหรือเขียนทับข้อมูลเดิม\n` +
              `กด OK เพื่อดำเนินการ หรือ Cancel เพื่อยกเลิก`
            );
            if (!approved) return;
          }

          setServices(mergedServices);
          setCompanies(mergedCompanies);
          setRecords(prev => [...prev, ...newRecords]);
          setMachineReadings(prev => [...prev, ...newMachineReadings]);

          alert(
            `นำเข้าข้อมูลสำเร็จ โดยไม่เขียนทับข้อมูลเดิม\n` +
            `เพิ่มรายการบันทึก ${newRecords.length} รายการ\n` +
            `เพิ่มยอดเครื่อง ${newMachineReadings.length} รายการ\n` +
            `ข้ามข้อมูลที่มีอยู่แล้ว ${processedRecords.length - newRecords.length} รายการ`
          );
        } else {
          alert('รูปแบบไฟล์ไม่ถูกต้อง');
        }
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์');
      }
    };
    reader.readAsText(file);
  };

  const setAsPrimaryLocation = (locHref) => {
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

  return (
    <AppContext.Provider value={{
      services, setServices, updateService,
      companies, setCompanies, updateCompany, reorderCompaniesByCode, moveCompany, toggleCompanyQuickSelect,
      records, setRecords, addRecord, deleteRecords, deleteSingleRecord, moveSingleRecord, moveDailyRecords, moveSingleRecordToCompany, moveDailyRecordsToCompany,
      machineReadings, addMachineReading, deleteMachineReading,
      exportData, importData,
      reportLogo, setReportLogo, reportLogoSize, setReportLogoSize, reportLogoAlign, setReportLogoAlign,
      navigationTarget, setNavigationTarget, primaryLocation, primaryRecordCount, setAsPrimaryLocation, clearPrimaryLocation
    }}>
      {!isStorageLoaded ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', backgroundColor: '#f0f2f5' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid #ddd', borderTop: '4px solid #004d9d', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }}></div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <p style={{ color: '#555', fontFamily: 'sans-serif', marginTop: '16px' }}>กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
