import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [services, setServices] = useState(() => {
    const saved = localStorage.getItem('postage_services');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map(s => {
        if (!s.category) {
          // Migration logic: assign category based on name if missing
          return {
            ...s,
            category: s.name.includes('ในประเทศ') ? 'domestic' : 'international'
          };
        }
        return s;
      });
    }
    return [
      { id: '1', name: 'รายได้ไปรษณีย์ภัณฑ์ในประเทศ-ธรรมดา', code: '41010401', category: 'domestic' },
      { id: '2', name: 'รายได้ไปรษณีย์ภัณฑ์ในประเทศ-รับรอง', code: '41010411', category: 'domestic' },
      { id: '3', name: 'รายได้ไปรษณีย์ภัณฑ์ในประเทศ-ลงทะเบียน', code: '41010421', category: 'domestic' },
      { id: '4', name: 'รายได้ไปรษณีย์ภัณฑ์ในประเทศ-รับประกัน', code: '41010431', category: 'domestic' },
      { id: '5', name: 'รายได้ไปรษณีย์ภัณฑ์ระหว่างประเทศ-ธรรมดา', code: '41010501', category: 'international' },
      { id: '6', name: 'รายได้ไปรษณีย์ภัณฑ์ระหว่างประเทศ-ลงทะเบียน', code: '41010511', category: 'international' },
      { id: '7', name: 'รายได้ไปรษณีย์ภัณฑ์ระหว่างประเทศ-รับประกัน', code: '41010521', category: 'international' },
      { id: '8', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ในประเทศ-ธรรมดา', code: '41010601', category: 'domestic' },
      { id: '9', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ในประเทศ-รับประกัน', code: '41010611', category: 'domestic' },
      { id: '10', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ระหว่างประเทศ-ธรรมดา', code: '41010701', category: 'international' },
      { id: '11', name: 'รายได้พัสดุไปรษณีย์ภัณฑ์ระหว่างประเทศ-รับประกัน', code: '41010711', category: 'international' },
      { id: '12', name: 'รายได้ไปรษณีย์ด่วนพิเศษในประเทศ', code: '41010801', category: 'domestic' },
      { id: '13', name: 'รายได้ไปรษณีย์ด่วนพิเศษระหว่างประเทศ', code: '41010901', category: 'international' },
      { id: '14', name: 'รายได้บริการธุรกิจตอบรับ-ในประเทศ', code: '41012101', category: 'domestic' }
    ];
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
      // Filter out old records for the same date/company/service if they exist
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
    const data = { services, companies, records, version: '1.0', exportDate: new Date().toISOString() };
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
          if (confirm('คำเตือน: การนำเข้าข้อมูลจะเขียนทับข้อมูลปัจจุบันทั้งหมด คุณต้องการดำเนินการต่อหรือไม่?')) {
            setServices(data.services);
            setCompanies(data.companies);
            setRecords(data.records);
            alert('นำเข้าข้อมูลสำเร็จแล้ว!');
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
