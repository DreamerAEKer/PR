import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  onSnapshot, 
  writeBatch 
} from 'firebase/firestore';

const STORAGE_KEY = 'postage_firebase_config';
const AUTO_SYNC_KEY = 'postage_firebase_auto_sync';

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDo0W-4JxD6GWPURTo8wFULxkgGUFnFf3Q",
  authDomain: "postage-report-app.firebaseapp.com",
  projectId: "postage-report-app",
  storageBucket: "postage-report-app.firebasestorage.app",
  messagingSenderId: "924193152164",
  appId: "1:924193152164:web:017cc69b09fbf790881a31"
};

export const getSavedFirebaseConfig = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'null' || raw === 'disabled') return null;
    return raw ? JSON.parse(raw) : DEFAULT_FIREBASE_CONFIG;
  } catch (e) {
    console.error('Failed to parse saved firebase config:', e);
    return DEFAULT_FIREBASE_CONFIG;
  }
};

export const saveFirebaseConfig = (config) => {
  if (!config) {
    localStorage.setItem(STORAGE_KEY, 'disabled');
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
};

export const getAutoSyncSetting = () => {
  return localStorage.getItem(AUTO_SYNC_KEY) === 'true';
};

export const setAutoSyncSetting = (enabled) => {
  localStorage.setItem(AUTO_SYNC_KEY, enabled ? 'true' : 'false');
};

let dbInstance = null;
let appInstance = null;

export const getFirebaseDb = () => {
  if (dbInstance) return dbInstance;
  const config = getSavedFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) return null;

  try {
    appInstance = getApps().length === 0 ? initializeApp(config) : getApp();
    dbInstance = getFirestore(appInstance);
    return dbInstance;
  } catch (e) {
    console.error('Failed to initialize Firebase:', e);
    return null;
  }
};

export const resetFirebaseApp = () => {
  dbInstance = null;
  appInstance = null;
};

// Test connection
export const testFirebaseConnection = async (config) => {
  try {
    const targetConfig = config || getSavedFirebaseConfig();
    const testApp = initializeApp(targetConfig, `test_${Date.now()}`);
    const testDb = getFirestore(testApp);
    const testRef = doc(testDb, 'system_health', 'ping');
    await setDoc(testRef, { lastPing: new Date().toISOString(), status: 'ok' }, { merge: true });
    return { success: true, message: 'เชื่อมต่อ Firebase Firestore สำเร็จเรียบร้อย!' };
  } catch (e) {
    console.error('Firebase test failed:', e);
    return { success: false, message: e.message || 'ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบว่าเปิด Firestore Database ในโหมด Test mode แล้วหรือยัง' };
  }
};

// Upload all local data to Firestore
export const uploadDataToFirestore = async ({ records, companies, services, machineReadings }) => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase ยังไม่ได้เชื่อมต่อ');

  try {
    const metaRef = doc(db, 'postage_app', 'metadata');
    await setDoc(metaRef, {
      lastUpdated: new Date().toISOString(),
      recordCount: (records || []).length,
      companyCount: (companies || []).length,
      serviceCount: (services || []).length,
      machineReadingCount: (machineReadings || []).length
    }, { merge: true });

    // Save Master Data (Companies & Services)
    const masterRef = doc(db, 'postage_app', 'master_data');
    await setDoc(masterRef, {
      companies: companies || [],
      services: services || []
    }, { merge: true });

    // Save Records Bundle
    const recordsDocRef = doc(db, 'postage_app', 'records_bundle');
    await setDoc(recordsDocRef, {
      records: records || [],
      machineReadings: machineReadings || [],
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      recordCount: (records || []).length,
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    console.error('Failed to upload to Firestore:', e);
    throw e;
  }
};

// Download all data from Firestore
export const downloadDataFromFirestore = async () => {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase ยังไม่ได้เชื่อมต่อ');

  try {
    const masterDoc = await getDoc(doc(db, 'postage_app', 'master_data'));
    const recordsDoc = await getDoc(doc(db, 'postage_app', 'records_bundle'));

    const masterData = masterDoc.exists() ? masterDoc.data() : null;
    const recordsData = recordsDoc.exists() ? recordsDoc.data() : null;

    if (!masterData && !recordsData) {
      return {
        hasData: false,
        message: 'ยังไม่มีข้อมูลบนคลาวด์'
      };
    }

    return {
      hasData: true,
      companies: masterData?.companies || null,
      services: masterData?.services || null,
      records: recordsData?.records || [],
      machineReadings: recordsData?.machineReadings || [],
      updatedAt: recordsData?.updatedAt || null
    };
  } catch (e) {
    console.error('Failed to download from Firestore:', e);
    throw e;
  }
};
