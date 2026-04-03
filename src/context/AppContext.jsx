import React, { createContext, useContext, useState, useEffect } from 'react';
import { format } from 'date-fns';


const AppContext = createContext();

export const AppProvider = ({ children }) => {
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
      { id: '1', name: 'รายได้ไปรษณียภัณฑ์ในประเทศ-ธรรมดา', code: '41010401', category: 'domestic', reportGroupId: '1' },
      { id: '2', name: 'รายได้ไปรษณียภัณฑ์ในประเทศ-รับรอง', code: '41010411', category: 'domestic', reportGroupId: '2' },
      { id: '3', name: 'รายได้ไปรษณียภัณฑ์ในประเทศ-ลงทะเบียน', code: '41010421', category: 'domestic', reportGroupId: '3' },
      { id: '4', name: 'รายได้ไปรษณียภัณฑ์ในประเทศ-รับประกัน', code: '41010431', category: 'domestic', reportGroupId: '4' },
      { id: '5', name: 'รายได้ไปรษณียภัณฑ์ระหว่างประเทศ-ธรรมดา', code: '41010501', category: 'international', reportGroupId: '5' },
      { id: '6', name: 'รายได้ไปรษณียภัณฑ์ระหว่างประเทศ-ลงทะเบียน', code: '41010511', category: 'international', reportGroupId: '6' },
      { id: '7', name: 'รายได้ไปรษณียภัณฑ์ระหว่างประเทศ-รับประกัน', code: '41010521', category: 'international', reportGroupId: '7' },
      { id: '8', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ในประเทศ-ธรรมดา', code: '41010601', category: 'domestic', reportGroupId: '8' },
      { id: '9', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ในประเทศ-รับประกัน', code: '41010611', category: 'domestic', reportGroupId: '9' },
      { id: '10', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ระหว่างประเทศ-ธรรมดา', code: '41010701', category: 'international', reportGroupId: '10' },
      { id: '11', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ระหว่างประเทศ-รับประกัน', code: '41010711', category: 'international', reportGroupId: '11' },
      { id: '12', name: 'รายได้ไปรษณีย์ด่วนพิเศษในประเทศ', code: '41010801', category: 'domestic', reportGroupId: '12' },
      { id: '13', name: 'รายได้ไปรษณีย์ด่วนพิเศษระหว่างประเทศ', code: '41010901', category: 'international', reportGroupId: '13' },
      { id: '14', name: 'รายได้บริการธุรกิจตอบรับ-ในประเทศ', code: '41012101', category: 'domestic', reportGroupId: '14' },
      { id: '17', name: 'สิ่งพิมพ์ธรรมดาในประเทศ', code: '41010402', category: 'domestic', reportGroupId: '1' },
      { id: '18', name: 'ไปรษณีย์บัตรในประเทศ', code: '41010403', category: 'domestic', reportGroupId: '1' },
      { id: '19', name: 'สิ่งพิมพ์ธรรมดาต่างประเทศ', code: '41010502', category: 'international', reportGroupId: '5' },
      { id: '20', name: 'ไปรษณีย์บัตรต่างประเทศ', code: '41010503', category: 'international', reportGroupId: '5' },
      { id: '21', name: 'พัสดุย่อย', code: '41010721', category: 'international', reportGroupId: '10' },
      { id: '15', name: 'บริการ eCo-Post', code: 'ECO01', category: 'domestic', reportGroupId: '3' },
      { id: '16', name: 'บริการ ePacket', code: 'EPK01', category: 'international', reportGroupId: '6' }
    ];

    const saved = localStorage.getItem('postage_services');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration: Ensure all services have reportGroupId and add missing default services
      const currentMap = new Map(parsed.map(s => [s.code || s.id, s]));
      
      const merged = [...parsed];
      defaultServices.forEach(ds => {
        const existing = currentMap.get(ds.code);
        if (!existing) {
          merged.push(ds);
        } else {
          // Sync system services: Update name and reportGroupId to match latest code
          existing.name = ds.name;
          existing.reportGroupId = ds.reportGroupId;
        }
      });
      return merged;
    }
    return defaultServices;
  });

  const [companies, setCompanies] = useState(() => {
    const saved = localStorage.getItem('postage_companies');
    return saved ? JSON.parse(saved) : [
      { id: 'h0032', name: 'บ.เอเชี่ยนฮอนด้าคอมเมอร์ส จก.', code: 'H0032' },
      { id: 'h0128', name: 'บ.ไทยเศรษฐกิจประกันภัย จก.(มหาชน)', code: 'H0128' },
      { id: 'h0130', name: 'บ.สิทธิผล 1919 จก.', code: 'H0130' },
      { id: 'h0143', name: 'บ.เอสเอวายเอ(ประเทศไทย)จำกัด', code: 'H0143' },
      { id: 'h0148', name: 'ราชกรีฑาสโมสร', code: 'H0148' },
      { id: 'h0223', name: 'บ.สรรพสินค้าเซ็นทรัล จก.', code: 'H0223' },
      { id: 'h0241', name: 'สำนักงานบริการโทรศัพท์สุรวงศ์', code: 'H0241' },
      { id: 'h0250', name: 'บ.โรงแรมรอยัลออคิด(ปทท) จก.(มหาชน)', code: 'H0250' },
      { id: 'h0267', name: 'หสน.ดัลลัส แอนด์ กิ๊บบินส์', code: 'H0267' },
      { id: 'h0298', name: 'ธ.มิตซูโฮคอร์ปอเรต จก. สาขากรุงเทพฯ', code: 'H0298' },
      { id: 'h0308', name: 'บ.ซิงเกอร์ประเทศไทย จำกัด', code: 'H0308' },
      { id: 'p0403', name: 'บ.พาราวันเซอร์วิส จก.', code: 'P0403' },
      { id: 'p0574', name: 'ธนาคารสากลพาณิชย์แห่งประเทศจีน', code: 'P0574' },
      { id: 'p0617', name: 'บ.อเวนติส ฟาร์มา จก.', code: 'P0617' },
      { id: 'p0727', name: 'บ.ดูปองต์(ประเทศไทย)จก.', code: 'P0727' },
      { id: 'p1074', name: 'บ.พรีเชียส ชิปปิ้ง จก.(มหาชน)', code: 'P1074' },
      { id: 'p3028', name: 'สถานทูตอเมริกา', code: 'P3028' },
      { id: 'p3064', name: 'สถานเอกอัครราชทูตแคนาดา', code: 'P3064' },
      { id: 'p3088', name: 'สถานเอกอัครราชทูตสวิสเซอร์แลนด์', code: 'P3088' },
      { id: 'p3111', name: 'บ.นิวแฮมพ์เชียร์ อินชัวรันส์ จก.', code: 'P3111' },
      { id: 'p3114', name: 'บ.มิตรแท้ประกันภัย จำกัด', code: 'P3114' },
      { id: 'p3115', name: 'บ.ฮี โด ชู (ไทยแลนด์) จก.', code: 'P3115' },
      { id: 'n20011', name: 'บ.ล็อกเล่ย์ (กรุงเทพฯ) จก.', code: 'N20011' },
      { id: 'n20028', name: 'บริษัท ไบเออร์ไทย จำกัด', code: 'N20028' },
      { id: 'n20032', name: 'สำนักกฎหมายดำเนินสมเกียรติและบุญมา', code: 'N20032' },
      { id: 'n40011', name: 'บ.บริหารสินทรัพย์กรุงเทพพาณิชย์การ จก.', code: 'N40011' },
      { id: 'n40016', name: 'บริษัท ฟิลิปประกันชีวิต จำกัด (มหาชน)', code: 'N40016' },
      { id: 'n40019', name: 'Sumitomo Corporation', code: 'N40019' },
      { id: 'n40021', name: 'ธ.แห่งอเมริกา เนชั่นแนล แอสโซซิเอชั่น', code: 'N40021' },
      { id: 'n40022', name: 'เมอร์เซเดส-เบนซ์', code: 'N40022' },
      { id: 'n40027', name: 'สถานทูตเยอรมนี', code: 'N40027' }
    ];
  });

  const [records, setRecords] = useState(() => {
    const saved = localStorage.getItem('postage_records');
    return saved ? JSON.parse(saved) : [];
  });

  const [reportLogo, setReportLogo] = useState(() => {
    return localStorage.getItem('postage_report_logo') || null;
  });

  // Sync / Merge 31 standard companies
  useEffect(() => {
    const standardCompanies = [
      { id: 'h0032', name: 'บ.เอเชี่ยนฮอนด้าคอมเมอร์ส จก.', code: 'H0032', order: 1, showInEntry: true, showInReport: true },
      { id: 'h0128', name: 'บ.ไทยเศรษฐกิจประกันภัย จก.(มหาชน)', code: 'H0128', order: 2, showInEntry: true, showInReport: true },
      { id: 'h0130', name: 'บ.สิทธิผล 1919 จก.', code: 'H0130', order: 3, showInEntry: true, showInReport: true },
      { id: 'h0143', name: 'บ.เอสเอวายเอ(ประเทศไทย)จำกัด', code: 'H0143', order: 4, showInEntry: true, showInReport: true },
      { id: 'h0148', name: 'ราชกรีฑาสโมสร', code: 'H0148', order: 5, showInEntry: true, showInReport: true },
      { id: 'h0223', name: 'บ.สรรพสินค้าเซ็นทรัล จก.', code: 'H0223', order: 6, showInEntry: true, showInReport: true },
      { id: 'h0241', name: 'สำนักงานบริการโทรศัพท์สุรวงศ์', code: 'H0241', order: 7, showInEntry: true, showInReport: true },
      { id: 'h0250', name: 'บ.โรงแรมรอยัลออคิด(ปทท) จก.(มหาชน)', code: 'H0250', order: 8, showInEntry: true, showInReport: true },
      { id: 'h0267', name: 'หสน.ดัลลัส แอนด์ กิ๊บบินส์', code: 'H0267', order: 9, showInEntry: true, showInReport: true },
      { id: 'h0298', name: 'ธ.มิตซูโฮคอร์ปอเรต จก. สาขากรุงเทพฯ', code: 'H0298', order: 10, showInEntry: true, showInReport: true },
      { id: 'h0308', name: 'บ.ซิงเกอร์ประเทศไทย จำกัด', code: 'H0308', order: 11, showInEntry: true, showInReport: true },
      { id: 'p0403', name: 'บ.พาราวันเซอร์วิส จก.', code: 'P0403', order: 12, showInEntry: true, showInReport: true },
      { id: 'p0574', name: 'ธนาคารสากลพาณิชย์แห่งประเทศจีน', code: 'P0574', order: 13, showInEntry: true, showInReport: true },
      { id: 'p0617', name: 'บ.อเวนติส ฟาร์มา จก.', code: 'P0617', order: 14, showInEntry: true, showInReport: true },
      { id: 'p0727', name: 'บ.ดูปองต์(ประเทศไทย)จก.', code: 'P0727', order: 15, showInEntry: true, showInReport: true },
      { id: 'p1074', name: 'บ.พรีเชียส ชิปปิ้ง จก.(มหาชน)', code: 'P1074', order: 16, showInEntry: true, showInReport: true },
      { id: 'p3028', name: 'สถานทูตอเมริกา', code: 'P3028', order: 17, showInEntry: true, showInReport: true },
      { id: 'p3064', name: 'สถานเอกอัครราชทูตแคนาดา', code: 'P3064', order: 18, showInEntry: true, showInReport: true },
      { id: 'p3088', name: 'สถานเอกอัครราชทูตสวิสเซอร์แลนด์', code: 'P3088', order: 19, showInEntry: true, showInReport: true },
      { id: 'p3111', name: 'บ.นิวแฮมพ์เชียร์ อินชัวรันส์ จก.', code: 'P3111', order: 20, showInEntry: true, showInReport: true },
      { id: 'p3114', name: 'บ.มิตรแท้ประกันภัย จำกัด', code: 'P3114', order: 21, showInEntry: true, showInReport: true },
      { id: 'p3115', name: 'บ.ฮี โด ชู (ไทยแลนด์) จก.', code: 'P3115', order: 22, showInEntry: true, showInReport: true },
      { id: 'n20011', name: 'บ.ล็อกเล่ย์ (กรุงเทพฯ) จก.', code: 'N20011', order: 23, showInEntry: true, showInReport: true },
      { id: 'n20028', name: 'บริษัท ไบเออร์ไทย จำกัด', code: 'N20028', order: 24, showInEntry: true, showInReport: true },
      { id: 'n20032', name: 'สำนักกฎหมายดำเนินสมเกียรติและบุญมา', code: 'N20032', order: 25, showInEntry: true, showInReport: true },
      { id: 'n40011', name: 'บ.บริหารสินทรัพย์กรุงเทพพาณิชย์การ จก.', code: 'N40011', order: 26, showInEntry: true, showInReport: true },
      { id: 'n40016', name: 'บริษัท ฟิลิปประกันชีวิต จำกัด (มหาชน)', code: 'N40016', order: 27, showInEntry: true, showInReport: true },
      { id: 'n40019', name: 'Sumitomo Corporation', code: 'N40019', order: 28, showInEntry: true, showInReport: true },
      { id: 'n40021', name: 'ธ.แห่งอเมริกา เนชั่นแนล แอสโซซิเอชั่น', code: 'N40021', order: 29, showInEntry: true, showInReport: true },
      { id: 'n40022', name: 'เมอร์เซเดส-เบนซ์', code: 'N40022', order: 30, showInEntry: true, showInReport: true },
      { id: 'n40027', name: 'สถานทูตเยอรมนี', code: 'N40027', order: 31, showInEntry: true, showInReport: true }
    ];

    setCompanies(prev => {
      // 1. Assign order to all current companies if missing
      const sortedCurrent = [...prev].sort((a,b) => {
        if (a.order != null && b.order != null) return a.order - b.order;
        if (a.order != null) return -1;
        if (b.order != null) return 1;
        if (a.code && b.code) return a.code.localeCompare(b.code, 'en', { numeric: true });
        if (a.code) return -1;
        if (b.code) return 1;
        return (a.name || '').localeCompare(b.name || '', 'th');
      });

      let changed = false;
      const updated = sortedCurrent.map((c, idx) => {
        let u = { ...c };
        // 1. Assign order if missing
        if (u.order === undefined) {
          u.order = idx + 1;
          changed = true;
        }
        // 2. Migration: isHidden -> showInEntry/showInReport
        if (u.showInEntry === undefined) {
          u.showInEntry = u.isHidden === undefined ? true : !u.isHidden;
          changed = true;
        }
        if (u.showInReport === undefined) {
          u.showInReport = u.isHidden === undefined ? true : !u.isHidden;
          changed = true;
        }
        // 3. Clean up old field
        if (u.hasOwnProperty('isHidden')) {
          delete u.isHidden;
          changed = true;
        }
        return u;
      });

      // 2. Merge brand new standard companies
      standardCompanies.forEach(sc => {
        if (!updated.find(c => c.code === sc.code)) {
          updated.push(sc);
          changed = true;
        }
      });

      return changed ? updated : prev;
    });
  }, []);

  useEffect(() => {
    try {
      if (reportLogo) {
        localStorage.setItem('postage_report_logo', reportLogo);
      } else {
        localStorage.removeItem('postage_report_logo');
      }
    } catch (e) {
      console.error('Failed to save logo:', e);
    }
  }, [reportLogo]);

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
    try {
      localStorage.setItem('postage_records', JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save records to localStorage:', e);
      if (e.name === 'QuotaExceededError') {
        alert('หน่วยความจำเต็ม! ไม่สามารถบันทึกข้อมูลเพิ่มเติมได้ กรุณาสำรองข้อมูลและล้างข้อมูลเก่า');
      }
    }
  }, [records]);

  const addRecord = (newRecords) => {
    if (!newRecords || !Array.isArray(newRecords)) return;
    
    // Filter out invalid/null records
    const validNewRecords = newRecords.filter(nr => nr && nr.serviceId && nr.date);
    if (validNewRecords.length === 0) return;

    setRecords(prev => {
      // Ensure prev is an array
      const currentRecords = Array.isArray(prev) ? prev : [];
      
      // Use timestamp as unique ID if available, otherwise fallback to date/company/service composite
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
      if (timestamp && r.timestamp === timestamp) return false;
      if (!timestamp && r.serviceId === serviceId && r.date === date && r.companyId === companyId) return false;
      return true;
    }));
  };

  const deleteRecords = (date, companyId) => {
    setRecords(prev => prev.filter(r => !(r.date === date && r.companyId === companyId)));
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

  const exportData = () => {
    const data = { services, companies, records, version: '1.1', exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `postage_backup_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.services && data.companies && data.records) {
          const mode = confirm('ต้องการเขียนทับข้อมูลเดิมทั้งหมดหรือไม่?\n(ตกลง = เขียนทับ, ยกเลิก = รวมข้อมูลเดิม)') ? 'overwrite' : 'merge';
          
          if (mode === 'overwrite') {
            setServices(data.services);
            setCompanies(data.companies);
            setRecords(data.records);
            alert('นำเข้าแบบเขียนทับสำเร็จแล้ว!');
          } else {
            // MERGE Logic
            setCompanies(prev => {
              const merged = [...prev];
              data.companies.forEach(nc => {
                if (!merged.find(c => c.code === nc.code)) merged.push(nc);
              });
              return merged;
            });

            const processedRecords = data.records.map(r => {
              const oldService = data.services.find(s => s.id === r.serviceId);
              if (!oldService) return r;
              
              const newServiceId = findServiceMatch(oldService.name, oldService.code, services);
              return { ...r, serviceId: newServiceId || r.serviceId };
            });

            setRecords(prev => {
              const merged = [...prev];
              processedRecords.forEach(nr => {
                const isDuplicate = merged.find(r => r.date === nr.date && r.companyId === nr.companyId && r.serviceId === nr.serviceId);
                if (!isDuplicate) merged.push(nr);
              });
              return merged;
            });
            alert('รวมข้อมูลสำเร็จเรียบร้อยแล้ว!');
          }
        } else {
          alert('รูปแบบไฟล์ไม่ถูกต้อง');
        }
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์');
      }
    };
    reader.readAsText(file);
  };

  return (
    <AppContext.Provider value={{ 
      services, setServices, updateService,
      companies, setCompanies, updateCompany, reorderCompaniesByCode,
      records, setRecords, addRecord, deleteRecords, deleteSingleRecord,
      exportData, importData,
      reportLogo, setReportLogo
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
