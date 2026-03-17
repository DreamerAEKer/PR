import React, { createContext, useContext, useState, useEffect } from 'react';

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
      { id: '1', name: 'รายได้ไปรษณีย์ภัณฑ์ในประเทศ-ธรรมดา', code: '41010401', category: 'domestic', reportGroupId: '1' },
      { id: '2', name: 'รายได้ไปรษณีย์ภัณฑ์ในประเทศ-รับรอง', code: '41010411', category: 'domestic', reportGroupId: '2' },
      { id: '3', name: 'รายได้ไปรษณีย์ภัณฑ์ในประเทศ-ลงทะเบียน', code: '41010421', category: 'domestic', reportGroupId: '3' },
      { id: '15', name: 'บริการ eCo-Post', code: 'ECO01', category: 'domestic', reportGroupId: '3' },
      { id: '4', name: 'รายได้ไปรษณีย์ภัณฑ์ในประเทศ-รับประกัน', code: '41010431', category: 'domestic', reportGroupId: '4' },
      { id: '5', name: 'รายได้ไปรษณีย์ภัณฑ์ระหว่างประเทศ-ธรรมดา', code: '41010501', category: 'international', reportGroupId: '5' },
      { id: '6', name: 'รายได้ไปรษณีย์ภัณฑ์ระหว่างประเทศ-ลงทะเบียน', code: '41010511', category: 'international', reportGroupId: '6' },
      { id: '16', name: 'บริการ ePacket', code: 'EPK01', category: 'international', reportGroupId: '6' },
      { id: '7', name: 'รายได้ไปรษณีย์ภัณฑ์ระหว่างประเทศ-รับประกัน', code: '41010521', category: 'international', reportGroupId: '7' },
      { id: '8', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ในประเทศ-ธรรมดา', code: '41010601', category: 'domestic', reportGroupId: '8' },
      { id: '9', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ในประเทศ-รับประกัน', code: '41010611', category: 'domestic', reportGroupId: '9' },
      { id: '10', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ระหว่างประเทศ-ธรรมดา', code: '41010701', category: 'international', reportGroupId: '10' },
      { id: '11', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ระหว่างประเทศ-รับประกัน', code: '41010711', category: 'international', reportGroupId: '11' },
      { id: '12', name: 'รายได้ไปรษณีย์ด่วนพิเศษในประเทศ', code: '41010801', category: 'domestic', reportGroupId: '12' },
      { id: '13', name: 'รายได้ไปรษณีย์ด่วนพิเศษระหว่างประเทศ', code: '41010901', category: 'international', reportGroupId: '13' },
      { id: '14', name: 'รายได้บริการธุรกิจตอบรับ-ในประเทศ', code: '41012101', category: 'domestic', reportGroupId: '41012101' }
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
      { id: 'c1', name: 'บริษัท ไทยเศรษฐกิจประกันภัย', code: 'H0100' },
      { id: 'c2', name: 'บริษัท เอ็นเซอร์ไพรส์', code: 'H0128' },
      { id: 'c3', name: 'บริษัท ไปรษณีย์ไทย จำกัด', code: 'H0130' }
    ];
  });

  const [records, setRecords] = useState(() => {
    const saved = localStorage.getItem('postage_records');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('postage_services', JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem('postage_companies', JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem('postage_records', JSON.stringify(records));
  }, [records]);

  const addRecord = (newRecords) => {
    setRecords(prev => {
      const filtered = prev.filter(r => 
        !newRecords.some(nr => nr.date === r.date && nr.companyId === r.companyId && nr.serviceId === r.serviceId)
      );
      return [...filtered, ...newRecords];
    });
  };

  const updateService = (id, updated) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
  };

  const deleteSingleRecord = (serviceId, date, companyId) => {
    setRecords(prev => prev.filter(r => !(r.serviceId === serviceId && r.date === date && r.companyId === companyId)));
  };

  const deleteRecords = (date, companyId) => {
    setRecords(prev => prev.filter(r => !(r.date === date && r.companyId === companyId)));
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
      services, setServices,
      companies, setCompanies,
      records, setRecords,
      addRecord, deleteRecords, updateService, deleteSingleRecord,
      exportData, importData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
