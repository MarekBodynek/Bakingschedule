import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle, RefreshCw, Upload, Edit3, Package, TrendingUp, ChevronDown, ChevronUp, Printer } from 'lucide-react';
import _ from 'lodash';
import * as XLSX from 'xlsx';

// ✨ NOWE IMPORTY - Utility modules
import {
  getTopFastMovingProducts,
  detectAllStockouts,
  estimateUnmetDemand
} from './utils/stockoutDetection';

import {
  savePlan,
  getPlan,
  saveManagerCorrection,
  getAllManagerCorrections,
  getMLWeights,
  saveActualSales,
  saveActualWaste,
  exportAllData,
  importAllData,
  clearAllData,
  clearGeneratedPlans
} from './utils/localStorage';

import {
  optimizeWeightsForProduct,
  learnFromManagerCorrections,
  learnFromStockouts,
  runWeeklyOptimization
} from './utils/simpleMachineLearning';

// ✨ NOWE IMPORTY - UI Components
import ManagerCorrectionModal from './components/ManagerCorrectionModal';
import TrayOptimizationView from './components/TrayOptimizationView';
import MetricsDashboard from './components/MetricsDashboard';
import OvenConfigurationModal from './components/OvenConfigurationModal';

// ✨ IMPORT - Internationalization
import { getLanguageDictionary, availableLanguages } from './utils/i18n';

const BakeryPlanningSystem = () => {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [salesData2025, setSalesData2025] = useState([]);
  const [salesData2024, setSalesData2024] = useState([]);
  const [wasteData, setWasteData] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentWave, setCurrentWave] = useState(1);
  const [plans, setPlans] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [fileStatus, setFileStatus] = useState({ hourly: false, daily: false, waste: false });
  const [showUpload, setShowUpload] = useState(false);
  const [showDateConfirmModal, setShowDateConfirmModal] = useState(false);
  const [pendingDate, setPendingDate] = useState(null);

  // ✨ NOWE STANY - Stockout detection & UI
  const [fastMovingSkus, setFastMovingSkus] = useState([]);
  const [detectedStockouts, setDetectedStockouts] = useState([]);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState(null);
  const [activeTab, setActiveTab] = useState('plan'); // 'plan', 'trays', 'metrics'
  const [showBuffers, setShowBuffers] = useState(false); // Pokaži/skrij bufferje - domyślnie ukryte
  const [showOvenConfig, setShowOvenConfig] = useState(false); // Modal konfiguracji pieców
  const [expandedWaves, setExpandedWaves] = useState({ 1: false, 2: false, 3: false }); // Rozwinięcie fal - domyślnie zwinięte
  const [showResetModal, setShowResetModal] = useState(false); // Modal potwierdzenia resetu

  // PWA Installation
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installPassword, setInstallPassword] = useState('');
  const [installError, setInstallError] = useState('');

  // ✨ Language
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'sl'; // Domyślnie słoweński
  });
  const t = getLanguageDictionary(currentLanguage);

  const previousDateRef = useRef(selectedDate);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    const oldDate = previousDateRef.current;
    
    console.log('📅 Date change triggered:', { oldDate, newDate, hasPlans: Object.keys(plans).length > 0 });
    
    if (!newDate || newDate === oldDate) {
      console.log('❌ Same date or empty, ignoring');
      return;
    }
    
    const hasPlans = Object.keys(plans).length > 0;
    
    if (hasPlans) {
      console.log('⚠️ Plans exist, showing custom confirmation dialog');
      setPendingDate(newDate);
      setShowDateConfirmModal(true);
    } else {
      console.log('✅ No plans, changing date directly');
      setSelectedDate(newDate);
      previousDateRef.current = newDate;
    }
  };

  const confirmDateChange = () => {
    console.log('✅ User confirmed date change to:', pendingDate);
    setSelectedDate(pendingDate);
    previousDateRef.current = pendingDate;
    setPlans({});
    setCurrentWave(1);
    setShowDateConfirmModal(false);
    setPendingDate(null);
  };

  const cancelDateChange = () => {
    console.log('❌ User cancelled date change');
    setShowDateConfirmModal(false);
    setPendingDate(null);
    // Force re-render by setting to empty first, then back to old date
    setSelectedDate('');
    setTimeout(() => {
      setSelectedDate(previousDateRef.current);
    }, 0);
  };

  const toggleWave = (waveNumber) => {
    setExpandedWaves(prev => ({
      ...prev,
      [waveNumber]: !prev[waveNumber]
    }));
  };

  const calculateEaster = (year) => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  };

  const getSlovenianHolidays = (year) => {
    const easter = calculateEaster(year);
    const easterMonday = new Date(easter);
    easterMonday.setDate(easter.getDate() + 1);
    
    return [
      `${year}-01-01`, `${year}-01-02`, `${year}-02-08`,
      easter.toISOString().split('T')[0],
      easterMonday.toISOString().split('T')[0],
      `${year}-04-27`, `${year}-05-01`, `${year}-05-02`,
      `${year}-06-25`, `${year}-08-15`, `${year}-10-31`,
      `${year}-11-01`, `${year}-12-25`, `${year}-12-26`,
    ];
  };

  const isHoliday = (dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const holidays = getSlovenianHolidays(year);
    return holidays.includes(dateStr);
  };

  const isPreHoliday = (dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const holidays = getSlovenianHolidays(year);
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];
    return holidays.includes(nextDayStr);
  };

  const isPensionPaymentDay = (dateStr) => {
    const date = new Date(dateStr);
    const month = date.getMonth();
    const year = date.getFullYear();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    
    let targetDay;
    if (lastDayOfMonth >= 31) {
      targetDay = 31;
    } else {
      targetDay = 30;
    }
    
    if (targetDay > lastDayOfMonth) {
      targetDay = lastDayOfMonth;
    }
    
    let paymentDate = new Date(year, month, targetDay);
    
    while (paymentDate.getDay() === 0 || paymentDate.getDay() === 6 || isHoliday(paymentDate.toISOString().split('T')[0])) {
      paymentDate.setDate(paymentDate.getDate() - 1);
    }
    
    return dateStr === paymentDate.toISOString().split('T')[0];
  };

  const isHighSalesDay = (dateStr) => {
    return isPreHoliday(dateStr) || isPensionPaymentDay(dateStr);
  };

  const identifyFileByContent = (data, fileName) => {
    try {
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
      const firstRows = rawData.slice(0, 10).flat().join(' ').toUpperCase();
      
      if (firstRows.includes('ODPISI') || firstRows.includes('LOSES') || firstRows.includes('LOSS')) {
        console.log('→ WASTE file detected');
        return 'waste';
      }
      if (firstRows.includes('PRODAJA PO URAH') || (firstRows.includes('URA') && firstRows.includes('2025'))) {
        console.log('→ 2025 HOURLY file detected');
        return 'hourly';
      }
      if (firstRows.includes('PRODAJA PO DNEVIH') || (firstRows.includes('DATUM') && firstRows.includes('2024'))) {
        console.log('→ 2024 DAILY file detected');
        return 'daily';
      }
      
      const fileNameLower = fileName.toLowerCase();
      if (fileNameLower.includes('hour') || fileNameLower.includes('2025')) return 'hourly';
      if (fileNameLower.includes('day') || fileNameLower.includes('2024')) return 'daily';
      if (fileNameLower.includes('waste') || fileNameLower.includes('loss') || fileNameLower.includes('loses')) return 'waste';
      
      return 'unknown';
    } catch (err) {
      return 'unknown';
    }
  };

  const parseEuropeanNumber = (value) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    // Konwertuj string na number obsługując format europejski (przecinek jako separator dziesiętny)
    const str = String(value).trim();
    
    // Jeśli zawiera przecinek i kropkę, usuń kropki (separator tysięcy) i zamień przecinek na kropkę
    if (str.includes(',') && str.includes('.')) {
      return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    }
    
    // Jeśli zawiera tylko przecinek, zamień na kropkę (separator dziesiętny)
    if (str.includes(',')) {
      return parseFloat(str.replace(',', '.')) || 0;
    }
    
    // Standardowe parsowanie
    return parseFloat(str) || 0;
  };

  const parseAllData = async (hourlyFile, dailyFile, wasteFile) => {
    const status = { ...fileStatus };
    let sales2025Local = [...salesData2025];
    let sales2024Local = [...salesData2024];
    let wasteLocal = [...wasteData];
    
    if (hourlyFile && hourlyFile.fileName) {
      setLoadingStatus('Obdelava urne prodaje 2025...');
      const workbook = XLSX.read(hourlyFile.data, { cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      sales2025Local = rawData.slice(3).filter(row => row.length > 6 && row[4]).map(row => ({
        date: new Date(row[1]),
        dateStr: new Date(row[1]).toISOString().split('T')[0],
        dayOfWeek: new Date(row[1]).getDay(),
        hour: row[2],
        eanCode: row[4],
        productName: (row[5] || '').trim(),
        quantity: parseEuropeanNumber(row[6])
      }));
      
      status.hourly = true;
    }
    
    if (dailyFile && dailyFile.fileName) {
      setLoadingStatus('Obdelava dnevne prodaje 2024...');
      const workbook = XLSX.read(dailyFile.data, { cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      sales2024Local = rawData.slice(3).filter(row => row.length > 6 && row[3]).map(row => ({
        date: new Date(row[0]),
        dateStr: new Date(row[0]).toISOString().split('T')[0],
        dayOfWeek: new Date(row[0]).getDay(),
        eanCode: row[3],
        productName: (row[4] || '').trim(),
        quantity: parseEuropeanNumber(row[18])
      }));
      
      status.daily = true;
    }
    
    if (wasteFile && wasteFile.fileName) {
      setLoadingStatus('Obdelava podatkov o odpadkih...');
      const workbook = XLSX.read(wasteFile.data, { cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      wasteLocal = rawData.slice(3).filter(row => row.length > 3).map(row => ({
        date: new Date(row[0]),
        dateStr: new Date(row[0]).toISOString().split('T')[0],
        eanCode: row[3] || row[4],
        productName: (row[4] || row[5] || '').trim(),
        wasteQuantity: parseEuropeanNumber(row[18] || row[6])
      }));
      
      status.waste = true;
    }
    
    setSalesData2025(sales2025Local);
    setSalesData2024(sales2024Local);
    setWasteData(wasteLocal);
    setFileStatus(status);
    
    const allSales = [...sales2025Local, ...sales2024Local];
    const uniqueProducts = [];
    const seen = new Set();
    
    allSales.forEach(s => {
      if (!seen.has(s.eanCode)) {
        seen.add(s.eanCode);
        
        // 🔥 Automatyczne rozpoznawanie pakowania (np. 5x60, 3x80)
        const packagingInfo = parsePackagingInfo(s.productName);
        
        uniqueProducts.push({
          sku: s.eanCode,
          name: s.productName,
          isKey: ['3831002150359', '3831002150205'].includes(s.eanCode),
          isPackaged: packagingInfo.isPackaged,
          packageQuantity: packagingInfo.quantity,
          packageWeight: packagingInfo.weight || 0,
          packagePattern: packagingInfo.pattern || ''
        });
      }
    });
    
    setProducts(uniqueProducts);

    // ✨ NOWA FUNKCJONALNOŚĆ: Wykryj TOP 5 i stockouts
    const top5 = getTopFastMovingProducts(sales2025Local, uniqueProducts, 28);
    setFastMovingSkus(top5);

    const stockouts = detectAllStockouts(sales2025Local, uniqueProducts, 28);
    setDetectedStockouts(stockouts);

    console.log(`🔥 TOP 5 products:`, top5.map(sku => {
      const product = uniqueProducts.find(p => p.sku === sku);
      return product?.name || sku;
    }));
    console.log(`🚨 Detected ${stockouts.length} stockouts`);
    console.log(`📊 Parsed ${uniqueProducts.length} unique products`);

    console.log('✅ Setting dataLoaded=true, showUpload=false');
    setDataLoaded(true);
    setShowUpload(false);
    setError(null);
    setLoadingStatus('');
    console.log('✅ parseAllData completed successfully');
  };

  const handleFileUpload = async (event, specificType = null) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    try {
      console.log(`📤 Starting file upload: ${files.length} files`);
      setError(null);
      setLoadingStatus(`Nalaganje ${files.length} datotek...`);

      let hourlyFile = fileStatus.hourly ? { data: salesData2025, fileName: 'existing' } : null;
      let dailyFile = fileStatus.daily ? { data: salesData2024, fileName: 'existing' } : null;
      let wasteFile = fileStatus.waste ? { data: wasteData, fileName: 'existing' } : null;

      for (const file of files) {
        const data = await file.arrayBuffer();
        const fileType = specificType || identifyFileByContent(data, file.name);
        console.log(`📄 File: ${file.name} -> Type: ${fileType}`);

        if (fileType === 'hourly') hourlyFile = { data, fileName: file.name };
        else if (fileType === 'waste') wasteFile = { data, fileName: file.name };
        else if (fileType === 'daily') dailyFile = { data, fileName: file.name };
      }

      console.log('📊 Calling parseAllData...');
      await parseAllData(hourlyFile, dailyFile, wasteFile);
      console.log('✅ handleFileUpload completed');
    } catch (err) {
      console.error('❌ Error in handleFileUpload:', err);
      setError(err.message);
      setLoadingStatus('');
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    await handleFileUpload({ target: { files: event.dataTransfer.files } });
  };

  // 🔥 FUNKCJA: Automatyczne rozpoznawanie pakowania (np. pak 5x60, pakirane 3/50, PAK. 5/1)
  const parsePackagingInfo = (productName) => {
    if (!productName) return { isPackaged: false, quantity: 1 };
    
    const nameUpper = productName.toUpperCase();
    
    // WZORZEC 1: Szukaj "PAK" lub "PAKIRANE" (opcjonalnie z kropką) po którym jest liczba, separator (/, *, x, X), i druga liczba
    // Przykłady: "PAK 5x60", "PAK. 5/1", "PAKIRANE 3/50", "pak 10*100"
    const pakPattern = /(PAK(?:IRANE)?\.?)\s*(\d+)\s*[\/\*xX×]\s*(\d+)/i;
    const pakMatch = productName.match(pakPattern);
    
    if (pakMatch) {
      const quantity = parseInt(pakMatch[2], 10);
      const secondNumber = parseInt(pakMatch[3], 10);
      
      // Walidacja: quantity powinno być 2-20
      // Druga liczba może być wagą (20-500g) lub kodem (1-10)
      if (quantity >= 2 && quantity <= 20) {
        return {
          isPackaged: true,
          quantity: quantity,
          weight: secondNumber >= 20 ? secondNumber : 0,
          pattern: pakMatch[0]
        };
      }
    }
    
    // WZORZEC 2: Stary wzorzec dla kompatybilności: [liczba]x[liczba] lub [liczba]X[liczba]
    // Przykłady: "5x60", "3X80", "5 x 60"
    const pattern = /(\d+)\s*[xX×]\s*(\d+)/i;
    const match = productName.match(pattern);
    
    if (match) {
      const quantity = parseInt(match[1], 10);
      const weight = parseInt(match[2], 10);
      
      // Walidacja: quantity powinno być 2-10, weight powinno być sensowne (20-200g)
      if (quantity >= 2 && quantity <= 10 && weight >= 20 && weight <= 200) {
        return {
          isPackaged: true,
          quantity: quantity,
          weight: weight,
          pattern: match[0]
        };
      }
    }
    
    return { isPackaged: false, quantity: 1 };
  };

  useEffect(() => {
    // Bezpośrednio pokazujemy ekran uploadu zamiast próbować automatycznego ładowania
    setShowUpload(true);
  }, []);

  // ✨ Ładowanie zapisanych planów dla wybranej daty
  useEffect(() => {
    if (dataLoaded && selectedDate) {
      const savedPlan = getPlan(selectedDate);
      if (savedPlan) {
        console.log(`📥 Załadowano zapisany plan dla ${selectedDate}`);
        setPlans(savedPlan);
      } else {
        console.log(`ℹ️ Brak zapisanego planu dla ${selectedDate}`);
        setPlans({});
      }
    }
  }, [selectedDate, dataLoaded]);

  // PWA Installation - słuchaj eventu beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('📱 PWA install prompt ready');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    setShowInstallModal(true);
    setInstallPassword('');
    setInstallError('');
  };

  const handleInstallSubmit = async () => {
    if (installPassword !== 'Keram098') {
      setInstallError('Napačno geslo');
      return;
    }

    if (!deferredPrompt) {
      setInstallError('Instalacija ni na voljo');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`📱 PWA install outcome: ${outcome}`);

    setDeferredPrompt(null);
    setShowInstallModal(false);
    setInstallPassword('');
  };

  // ✨ Language change handler
  const handleLanguageChange = (newLang) => {
    setCurrentLanguage(newLang);
    localStorage.setItem('appLanguage', newLang);
    console.log('🌐 Language changed to:', newLang);
  };

  const calculateDynamicBuffer = (sku, targetDate, waveHours) => {
    const productSales = salesData2025.filter(s => s.eanCode === sku);
    if (productSales.length === 0) return { buffer: 0.15, reason: 'Ni podatkov, privzeta rezerva' };
    
    if (isHighSalesDay(targetDate)) {
      return { buffer: 0, reason: 'Zgodovinski podatki vključujejo povpraševanje' };
    }
    
    const fourWeeksAgo = new Date(targetDate);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    
    const recentDays = productSales.filter(s => 
      s.date >= fourWeeksAgo && waveHours.includes(s.hour) && !isHighSalesDay(s.dateStr)
    );
    
    if (recentDays.length < 10) {
      return { buffer: 0.15, reason: 'Omejeni podatki, privzeta rezerva' };
    }
    
    const byDate = _.groupBy(recentDays, 'dateStr');
    const dailyData = Object.entries(byDate).map(([date, sales]) => ({
      date,
      total: _.sumBy(sales, 'quantity'),
      isWeekend: new Date(date).getDay() === 0 || new Date(date).getDay() === 6
    }));
    
    const weekdayDays = dailyData.filter(d => !d.isWeekend);
    if (weekdayDays.length < 3) {
      return { buffer: 0.15, reason: 'Nezadostni podatki za delovne dni' };
    }
    
    const weekdayAvg = _.meanBy(weekdayDays, 'total');
    const weekdayStdDev = Math.sqrt(_.meanBy(weekdayDays, d => Math.pow(d.total - weekdayAvg, 2)));
    const weekdayCV = weekdayStdDev / weekdayAvg;
    
    let baseRezerva = Math.min(0.35, Math.max(0.05, weekdayCV * 0.8));
    let bufferComponents = [`Na podlagi CV: ${(baseRezerva * 100).toFixed(0)}%`];
    
    const dayOfWeek = new Date(targetDate).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const weekendDays = dailyData.filter(d => d.isWeekend);
    
    if (isWeekend && weekendDays.length >= 2) {
      const weekendAvg = _.meanBy(weekendDays, 'total');
      const weekendIncrease = (weekendAvg - weekdayAvg) / weekdayAvg;
      const weekendBonus = Math.max(0, Math.min(0.15, weekendIncrease));
      if (weekendBonus > 0.01) {
        baseRezerva += weekendBonus;
        bufferComponents.push(`Vikend: +${(weekendBonus * 100).toFixed(0)}%`);
      }
    }
    
    const productWaste = wasteData.filter(w => 
      w.eanCode === sku && w.date >= fourWeeksAgo && !isHighSalesDay(w.dateStr)
    );
    
    if (productWaste.length > 5) {
      const avgWaste = _.meanBy(productWaste, 'wasteQuantity');
      const wasteRatio = avgWaste / Math.max(1, weekdayAvg);
      
      if (wasteRatio > 0.08) {
        const reduction = Math.min(baseRezerva * 0.6, wasteRatio * 0.5);
        baseRezerva = Math.max(0, baseRezerva - reduction);
        bufferComponents.push(`Odpadki: -${(reduction * 100).toFixed(0)}%`);
      }
    }
    
    return { 
      buffer: Math.round(baseRezerva * 100) / 100,
      reason: bufferComponents.join(', ')
    };
  };

  const calculateHistoricalAverage = (sku, targetDate, waveHours) => {
    const targetDayOfWeek = new Date(targetDate).getDay();
    const productSales2025 = salesData2025.filter(s => s.eanCode === sku);
    const productSales2024 = salesData2024.filter(s => s.eanCode === sku);

    // ✨ UŻYJ ML WEIGHTS zamiast hardcoded
    const mlWeights = getMLWeights(sku);

    let weights = [];
    const isHighSales = isHighSalesDay(targetDate);
    
    if (isHighSales) {
      const isPreHol = isPreHoliday(targetDate);
      const isPension = isPensionPaymentDay(targetDate);
      
      let similarDays2025 = [];
      let similarDays2024 = [];
      
      if (isPreHol) {
        const allPreHolidayDays = [];
        for (let i = -365; i < 0; i++) {
          const checkDate = new Date(targetDate);
          checkDate.setDate(checkDate.getDate() + i);
          const dateStr = checkDate.toISOString().split('T')[0];
          if (isPreHoliday(dateStr)) allPreHolidayDays.push(dateStr);
        }
        
        similarDays2025 = productSales2025.filter(s => 
          allPreHolidayDays.includes(s.dateStr) && waveHours.includes(s.hour)
        );
        similarDays2024 = productSales2024.filter(s => allPreHolidayDays.includes(s.dateStr));
      } else if (isPension) {
        const allPensionDays = [];
        for (let month = 0; month < 12; month++) {
          for (let yearOffset = 0; yearOffset <= 1; yearOffset++) {
            const year = new Date(targetDate).getFullYear() - yearOffset;
            const checkDate = new Date(year, month, 30);
            const dateStr = checkDate.toISOString().split('T')[0];
            if (isPensionPaymentDay(dateStr)) allPensionDays.push(dateStr);
          }
        }
        
        similarDays2025 = productSales2025.filter(s => 
          allPensionDays.includes(s.dateStr) && waveHours.includes(s.hour)
        );
        similarDays2024 = productSales2024.filter(s => allPensionDays.includes(s.dateStr));
      }
      
      if (similarDays2025.length > 0) {
        // 🔥 POPRAWKA: Dziel przez liczbę podobnych dni które wystąpiły
        const totalQuantity = _.sumBy(similarDays2025, 'quantity');
        const uniqueDates = [...new Set(similarDays2025.map(s => s.dateStr))];
        const avgPerDay = totalQuantity / Math.max(1, uniqueDates.length);
        weights.push({ value: avgPerDay, weight: 0.50 });
      } else if (similarDays2024.length > 0) {
        const avgSpecialDay2024 = _.meanBy(similarDays2024, 'quantity');
        const adjustedForWave = avgSpecialDay2024 * (waveHours.length / 13);
        weights.push({ value: adjustedForWave, weight: 0.45 });
      }
    }
    
    if (productSales2025.length > 0) {
      const fourWeeksAgo = new Date(targetDate);
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      const recentSales = productSales2025.filter(s => 
        s.dayOfWeek === targetDayOfWeek && s.date >= fourWeeksAgo && 
        waveHours.includes(s.hour) && !isHighSalesDay(s.dateStr)
      );
      
      if (recentSales.length > 0) {
        // 🔥 POPRAWNA LOGIKA: Zawsze dziel przez liczbę wystąpień tego dnia tygodnia
        // W okresie 4 tygodni = 4 wystąpienia (np. 4 środy)
        const byDate = _.groupBy(recentSales, 'dateStr');
        const dailyTotals = Object.values(byDate).map(day => _.sumBy(day, 'quantity'));
        const totalQuantity = _.sumBy(dailyTotals);
        
        // W okresie 28 dni (4 tygodnie) każdy dzień tygodnia występuje dokładnie 4 razy
        const targetDaysInPeriod = 4;
        
        const avgPerTargetDay = totalQuantity / targetDaysInPeriod;
        weights.push({ value: avgPerTargetDay, weight: weights.length > 0 ? 0.30 : 0.35 });
      }
    }
    
    if (productSales2024.length > 0) {
      const lastYear = new Date(targetDate);
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      const weekBefore = new Date(lastYear); weekBefore.setDate(weekBefore.getDate() - 7);
      const weekAfter = new Date(lastYear); weekAfter.setDate(weekAfter.getDate() + 7);
      
      const yearAgoSales = productSales2024.filter(s => 
        s.date >= weekBefore && s.date <= weekAfter && s.dayOfWeek === targetDayOfWeek
      );
      
      if (yearAgoSales.length > 0) {
        const avgYearAgo = _.meanBy(yearAgoSales, 'quantity');
        weights.push({ value: avgYearAgo * (waveHours.length / 13), weight: 0.20 });
      }
    }
    
    if (productSales2025.length > 0 && weights.length < 2) {
      const allHourSales = productSales2025.filter(s => waveHours.includes(s.hour) && !isHighSalesDay(s.dateStr));
      if (allHourSales.length > 0) {
        // 🔥 POPRAWKA: Użyj rzeczywistej liczby dni w zakresie danych
        const totalQuantity = _.sumBy(allHourSales, 'quantity');
        const uniqueDates = [...new Set(allHourSales.map(s => s.dateStr))];
        
        // Oblicz zakres dat
        const allDates = allHourSales.map(s => s.date);
        const minDate = new Date(Math.min(...allDates));
        const maxDate = new Date(Math.max(...allDates));
        const daysInRange = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
        
        // Dziel przez dni w zakresie (nie tylko dni ze sprzedażą)
        const avgPerDay = totalQuantity / Math.max(1, daysInRange);
        weights.push({ value: avgPerDay, weight: 0.20 });
      }
    }
    
    if (weights.length === 0) return 0;

    const totalWeight = _.sumBy(weights, 'weight');
    const weightedSum = _.sumBy(weights, w => w.value * w.weight);
    let baseResult = weightedSum / totalWeight;

    // ✨ STOCKOUT ADJUSTMENT: Zwiększ prognozę jeśli produkt miał braki
    const fourWeeksAgo = new Date(targetDate);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const recentStockouts = detectedStockouts.filter(s =>
      s.sku === sku &&
      new Date(s.date) >= fourWeeksAgo
    );

    if (recentStockouts.length > 0) {
      const stockoutAdjustment = 1 + (0.15 + 0.1 * Math.min(recentStockouts.length / 4, 1));
      console.log(`⚠️ ${sku} had ${recentStockouts.length} stockouts - adjusting by ${((stockoutAdjustment - 1) * 100).toFixed(0)}%`);
      baseResult *= stockoutAdjustment;
    }

    return baseResult;
  };

  // 🔥 FUNKCJA: Rozkłada zaokrągloną wartość dzienną na fale
  // Logika dla małych ilości:
  // ≤1 → [całość, 0, 0], 2 → [1, 1, 0], 3 → [1, 1, 1], >3 → proporcjonalnie
  const distributeRoundedDailyToWaves = (dailyRounded, waveValues) => {
    const totalUnrounded = waveValues.reduce((sum, v) => sum + v, 0);
    
    // Jeśli suma dzienna jest 0 lub mniejsza, zwróć zera
    if (dailyRounded <= 0 || totalUnrounded <= 0) {
      return [0, 0, 0];
    }
    
    // 🔥 KLUCZOWA LOGIKA: Dla małych ilości zapewnij dostępność od rana
    // ≤1: Wszystko do Wave 1
    // 2: Wave 1 + Wave 2
    // 3: Wave 1 + Wave 2 + Wave 3
    // >3: Rozkład proporcjonalny według udziału fal
    
    if (dailyRounded <= 1) {
      // 1 lub mniej: tylko Wave 1
      return [dailyRounded, 0, 0];
    }
    
    if (dailyRounded === 2) {
      // 2 sztuki: podziel na Wave 1 i Wave 2
      return [1, 1, 0];
    }
    
    if (dailyRounded === 3) {
      // 3 sztuki: po 1 na każdą falę
      return [1, 1, 1];
    }
    
    // Dla większych ilości (> 3), używaj proporcjonalnego rozkładu
    // Oblicz proporcje dla każdej fali
    const proportions = waveValues.map(v => v / totalUnrounded);
    
    // Rozkładaj proporcjonalnie (bez zaokrąglania)
    const distributed = proportions.map(p => p * dailyRounded);
    
    // Zaokrąglij w dół
    const floored = distributed.map(v => Math.floor(v));
    
    // Oblicz pozostałą ilość do rozdysponowania
    let remaining = dailyRounded - floored.reduce((sum, v) => sum + v, 0);
    
    // Oblicz części ułamkowe
    const fractionalParts = distributed.map((v, idx) => ({
      index: idx,
      fraction: v - floored[idx]
    }));
    
    // Sortuj według części ułamkowych (od największej)
    fractionalParts.sort((a, b) => b.fraction - a.fraction);
    
    // Przydziel pozostałe jednostki do fal z największymi częściami ułamkowymi
    for (let i = 0; i < remaining; i++) {
      floored[fractionalParts[i].index]++;
    }
    
    return floored;
  };

  const generatePlan = async (wave) => {
    if (!dataLoaded) return;
    
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const waveHours = { 1: [7,8,9,10,11], 2: [12,13,14,15], 3: [16,17,18,19] };
    const wavesToGenerate = wave === 1 ? [1, 2, 3] : [wave];
    const newPlans = { ...plans };
    
    // Debug flag dla Ajdov kruh
    const DEBUG_SKU = '3838700060164';
    
    if (wave === 1) {
      // 🔥 ZMODYFIKOWANY ALGORYTM: Generowanie wszystkich trzech fal jednocześnie z zaokrąglaniem dziennym
      
      products.forEach(product => {
        // Krok 1: Oblicz historyczne średnie dla każdej fali
        const hist1 = calculateHistoricalAverage(product.sku, selectedDate, waveHours[1]);
        const hist2 = calculateHistoricalAverage(product.sku, selectedDate, waveHours[2]);
        const hist3 = calculateHistoricalAverage(product.sku, selectedDate, waveHours[3]);
        
        // Debug dla Ajdov kruh
        if (product.sku === DEBUG_SKU) {
          console.log('🔍 DEBUG: Ajdov kruh (3838700060164)');
          console.log('Historical averages:', { hist1, hist2, hist3, total: hist1+hist2+hist3 });
          
          const productData = salesData2025.filter(s => s.eanCode === product.sku);
          console.log(`Found ${productData.length} sales zapisov for this product`);
          if (productData.length > 0) {
            console.log('Sample data:', productData.slice(0, 5).map(s => ({ 
              date: s.dateStr, 
              hour: s.hour, 
              quantity: s.quantity 
            })));
          }
        }
        
        // Log dla pierwszego produktu aby sprawdzić ogólne wartości
        if (product === products[0]) {
          console.log(`📊 First product (${product.name}):`, { hist1, hist2, hist3, total: hist1+hist2+hist3 });
        }
        
        // Krok 2: Oblicz buffery dla każdej fali
        const buffer1Data = calculateDynamicBuffer(product.sku, selectedDate, waveHours[1]);
        const buffer2Data = calculateDynamicBuffer(product.sku, selectedDate, waveHours[2]);
        const buffer3Data = calculateDynamicBuffer(product.sku, selectedDate, waveHours[3]);
        
        let buffer1 = buffer1Data.buffer;
        let buffer2 = buffer2Data.buffer * 0.7;
        let buffer3 = isHighSalesDay(selectedDate) 
          ? buffer3Data.buffer * 0.3 
          : -Math.abs(buffer3Data.buffer) * 0.8;
        
        // Krok 3: Oblicz wartości z bufferami (niezaokrąglone)
        const value1 = hist1 * (1 + buffer1);
        const value2 = hist2 * (1 + buffer2);
        const value3 = hist3 * (1 + buffer3);
        
        // Krok 4: Oblicz sumę dzienną
        const dailyTotal = value1 + value2 + value3;
        
        // 🔥 LOGIKA ZAOKRĄGLANIA dla produktów wolno rotujących
        // Jeśli dzienny forecast < 3, zaokrąglij w GÓRĘ dla bezpieczeństwa
        // Następnie rozkład: ≤1→Wave1, 2→Wave1+2, 3→Wave1+2+3, >3→proporcjonalnie
        let dailyRounded;
        if (dailyTotal > 0 && dailyTotal < 3) {
          dailyRounded = Math.ceil(dailyTotal); // Zaokrąglenie w górę dla bezpieczeństwa
        } else {
          dailyRounded = Math.round(dailyTotal); // Standardowe zaokrąglenie
        }
        
        // Debug dla Ajdov kruh
        if (product.sku === DEBUG_SKU) {
          console.log('Dnevno total (unrounded):', dailyTotal);
          console.log('Rounding method:', dailyTotal < 3 ? 'CEIL (slow-moving)' : 'ROUND (normal)');
          console.log('Dnevno rounded:', dailyRounded);
          if (dailyRounded <= 1) {
            console.log('⚠️ Distribution: ≤1 units → 100% to Wave 1');
          } else if (dailyRounded === 2) {
            console.log('⚠️ Distribution: 2 units → Wave 1 + Wave 2 (1+1)');
          } else if (dailyRounded === 3) {
            console.log('⚠️ Distribution: 3 units → Wave 1 + Wave 2 + Wave 3 (1+1+1)');
          } else {
            console.log('ℹ️ Distribution: >3 units → Proportional by wave shares');
          }
        }
        
        // Krok 5: Rozkładaj zaokrągloną wartość dzienną na fale
        let [qty1, qty2, qty3] = distributeRoundedDailyToWaves(dailyRounded, [value1, value2, value3]);
        
        // Debug dla Ajdov kruh
        if (product.sku === DEBUG_SKU) {
          console.log('Values with buffers:', { value1, value2, value3 });
          console.log('Dnevno total (unrounded):', dailyTotal);
          console.log('Dnevno rounded:', dailyRounded);
          console.log('Distributed quantities:', { qty1, qty2, qty3, sum: qty1+qty2+qty3 });
          console.log('Distribution logic used:', 
            dailyRounded <= 1 ? 'RULE: ≤1 → Wave 1 only' :
            dailyRounded === 2 ? 'RULE: 2 → Wave 1+2 (1+1)' :
            dailyRounded === 3 ? 'RULE: 3 → Wave 1+2+3 (1+1+1)' :
            'RULE: >3 → Proportional'
          );
        }
        
        // Krok 6: Sprawdź minimum dla kluczowych produktów w wave 3
        if (product.isKey && qty3 < 5) {
          const diff = 5 - qty3;
          qty3 = 5;
          dailyRounded += diff;
        }
        
        // Krok 7: Zastosuj mnożnik dla produktów pakowanych
        // Jeśli produkt jest pakowany (np. 5x60, 3x60), pomnóż przez ilość w paczce
        const finalQty1 = product.isPackaged ? qty1 * product.packageQuantity : qty1;
        const finalQty2 = product.isPackaged ? qty2 * product.packageQuantity : qty2;
        const finalQty3 = product.isPackaged ? qty3 * product.packageQuantity : qty3;
        
        // Debug dla Ajdov kruh
        if (product.sku === DEBUG_SKU) {
          console.log('Is packaged?', product.isPackaged, 'Package quantity:', product.packageQuantity);
          console.log('Final quantities:', { finalQty1, finalQty2, finalQty3, sum: finalQty1+finalQty2+finalQty3 });
        }
        
        // Krok 8: Przygotuj opisy
        let reason1 = buffer1Data.reason;
        let reason2 = `Opoldne: ${buffer2Data.reason}`;
        let reason3 = isHighSalesDay(selectedDate) 
          ? (isPreHoliday(selectedDate) ? '🎄 Pred praznikom zvečer' : '💰 Pokojnine zvečer')
          : `Večerna zmanjšava: ${buffer3Data.reason}`;
        
        if (isHighSalesDay(selectedDate)) {
          if (isPreHoliday(selectedDate)) {
            reason1 = '🎄 Pred praznikom (zgodovinsko)';
            reason2 = '🎄 Pred praznikom opoldne';
          } else {
            reason1 = '💰 Dan pokojnin (zgodovinsko)';
            reason2 = '💰 Pokojnine opoldne';
          }
        }
        
        if (product.isKey && qty3 === 5 && hist3 * (1 + buffer3) < 5) {
          reason3 = 'Minimum ključnega izdelka (5 kos)';
        }
        
        const packagingNote = product.isPackaged ? ` (Večpak ${product.packageQuantity}x - peka v kosih)` : '';
        
        // Inicjalizuj plany dla wszystkich fal
        if (!newPlans[1]) newPlans[1] = {};
        if (!newPlans[2]) newPlans[2] = {};
        if (!newPlans[3]) newPlans[3] = {};
        
        newPlans[1][product.sku] = {
          quantity: finalQty1,
          originalQuantity: finalQty1, // Pierwotna wygenerowana wartość
          historical: Math.round(hist1),
          buffer: Math.round(buffer1 * 100),
          adjustmentReason: reason1 + packagingNote,
          isPackaged: product.isPackaged
        };

        newPlans[2][product.sku] = {
          quantity: finalQty2,
          originalQuantity: finalQty2, // Pierwotna wygenerowana wartość
          historical: Math.round(hist2),
          buffer: Math.round(buffer2 * 100),
          adjustmentReason: reason2 + packagingNote,
          isPackaged: product.isPackaged
        };

        newPlans[3][product.sku] = {
          quantity: finalQty3,
          originalQuantity: finalQty3, // Pierwotna wygenerowana wartość
          historical: Math.round(hist3),
          buffer: Math.round(buffer3 * 100),
          adjustmentReason: reason3 + packagingNote,
          isPackaged: product.isPackaged
        };
      });
      
    } else {
      // Regeneracja pojedynczej fali - używamy starego algorytmu dla kompatybilności
      const w = wave;
      const newPlan = {};
      
      products.forEach(product => {
        const hours = waveHours[w];
        const historicalAvg = calculateHistoricalAverage(product.sku, selectedDate, hours);
        const dynamicBuffer = calculateDynamicBuffer(product.sku, selectedDate, hours);
        
        let quantity = 0, buffer = 0, adjustmentReason = '';
        
        if (w === 1) {
          buffer = dynamicBuffer.buffer;
          adjustmentReason = dynamicBuffer.reason;
          
          if (isHighSalesDay(selectedDate)) {
            if (isPreHoliday(selectedDate)) adjustmentReason = '🎄 Pred praznikom (zgodovinsko)';
            else adjustmentReason = '💰 Dan pokojnin (zgodovinsko)';
          }
          
          quantity = Math.round(historicalAvg * (1 + buffer));
        } else if (w === 2) {
          buffer = dynamicBuffer.buffer * 0.7;
          adjustmentReason = `Opoldne: ${dynamicBuffer.reason}`;
          
          if (isHighSalesDay(selectedDate)) {
            if (isPreHoliday(selectedDate)) adjustmentReason = '🎄 Pred praznikom opoldne';
            else adjustmentReason = '💰 Pokojnine opoldne';
          }
          
          quantity = Math.round(historicalAvg * (1 + buffer));
        } else {
          if (isHighSalesDay(selectedDate)) {
            buffer = dynamicBuffer.buffer * 0.3;
            adjustmentReason = isPreHoliday(selectedDate) ? '🎄 Pred praznikom zvečer' : '💰 Pokojnine zvečer';
          } else {
            buffer = -Math.abs(dynamicBuffer.buffer) * 0.8;
            adjustmentReason = `Večerna zmanjšava: ${dynamicBuffer.reason}`;
          }
          
          quantity = Math.round(historicalAvg * (1 + buffer));
          
          if (product.isKey && quantity < 5) { 
            quantity = 5;
            buffer = ((5 / historicalAvg) - 1) * 100;
            adjustmentReason = 'Minimum ključnega izdelka (5 kos)';
          }
        }
        
        // Apply package multiplier for packaged products
        const baseQuantity = Math.max(0, quantity);
        const finalQuantity = product.isPackaged ? baseQuantity * product.packageQuantity : baseQuantity;
        const packagingNote = product.isPackaged ? ` (Večpak ${product.packageQuantity}x - peka v kosih)` : '';
        
        newPlan[product.sku] = {
          quantity: finalQuantity,
          historical: Math.round(historicalAvg),
          buffer: Math.round(buffer * 100),
          adjustmentReason: adjustmentReason + packagingNote,
          isPackaged: product.isPackaged
        };
      });
      
      newPlans[w] = newPlan;
    }
    
    setPlans(newPlans);
    setCurrentWave(1);
    setIsGenerating(false);

    // ✨ ZAPISZ PLAN DO LOCALSTORAGE
    savePlan(selectedDate, newPlans);
    console.log(`💾 Plan saved for ${selectedDate}`);
  };

  const getTotalPlanned = (wave) => plans[wave] ? Object.values(plans[wave]).reduce((sum, p) => sum + p.quantity, 0) : 0;
  const getTotalHistorical = (wave) => plans[wave] ? Object.values(plans[wave]).reduce((sum, p) => sum + p.historical, 0) : 0;
  const getDailyTotalPlanned = () => getTotalPlanned(1) + getTotalPlanned(2) + getTotalPlanned(3);
  const getDailyTotalHistorical = () => getTotalHistorical(1) + getTotalHistorical(2) + getTotalHistorical(3);

  // Debug info
  console.log('🔍 Render state:', { dataLoaded, showUpload, loadingStatus, productsCount: products.length, error });

  if (showUpload || loadingStatus) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-800">🥐 Sistem za načrtovanje peke</h2>
            {dataLoaded && !loadingStatus && (
              <button
                onClick={() => setShowUpload(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                ← Nazaj
              </button>
            )}
          </div>
          
          {loadingStatus ? (
            <div className="text-center py-8">
              <RefreshCw className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 text-lg">{loadingStatus}</p>
            </div>
          ) : (
            <>
              <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
                className="border-4 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors cursor-pointer bg-gray-50">
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-700 mb-2">Naloži podatke o prodaji</h3>
                <p className="text-gray-600 mb-4">Povleci in spusti Excel datoteke sem ali klikni za izbiro</p>
                <label className="inline-block">
                  <input type="file" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e)} multiple className="hidden" />
                  <span className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold cursor-pointer inline-block">
                    Izberi datoteke
                  </span>
                </label>
              </div>
              
              {(fileStatus.hourly || fileStatus.daily || fileStatus.waste) && (
                <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 font-semibold mb-3">✅ Naložene datoteke:</p>
                  <div className="space-y-2">
                    {fileStatus.hourly && (
                      <div className="flex items-center justify-between bg-white rounded px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">Urna prodaja</span>
                        </div>
                        <span className="text-xs text-gray-600">{salesData2025.length} zapisov</span>
                      </div>
                    )}
                    {fileStatus.daily && (
                      <div className="flex items-center justify-between bg-white rounded px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">Dnevna prodaja</span>
                        </div>
                        <span className="text-xs text-gray-600">{salesData2024.length} zapisov</span>
                      </div>
                    )}
                    {fileStatus.waste && (
                      <div className="flex items-center justify-between bg-white rounded px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">Podatki o odpadkih</span>
                        </div>
                        <span className="text-xs text-gray-600">{wasteData.length} zapisov</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {(!fileStatus.hourly || !fileStatus.daily || !fileStatus.waste) && (
                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 font-semibold mb-3">📂 Manjkajoče datoteke - dodaj jih:</p>
                  <div className="space-y-2">
                    {!fileStatus.hourly && (
                      <div className="flex items-center justify-between bg-white rounded px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">Urna prodaja</span>
                        </div>
                        <label>
                          <input type="file" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, 'hourly')} className="hidden" />
                          <span className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded cursor-pointer">Dodaj datoteko</span>
                        </label>
                      </div>
                    )}
                    {!fileStatus.daily && (
                      <div className="flex items-center justify-between bg-white rounded px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">Dnevna prodaja</span>
                        </div>
                        <label>
                          <input type="file" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, 'daily')} className="hidden" />
                          <span className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded cursor-pointer">Dodaj datoteko</span>
                        </label>
                      </div>
                    )}
                    {!fileStatus.waste && (
                      <div className="flex items-center justify-between bg-white rounded px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">Odpadki (neobvezno)</span>
                        </div>
                        <label>
                          <input type="file" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, 'waste')} className="hidden" />
                          <span className="text-xs bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded cursor-pointer">Dodaj datoteko</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-semibold mb-2">🤖 Inteligentno prepoznavanje datotek</p>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>Sistem samodejno prepozna vrste datotek po vsebini</li>
                  <li>Spusti vse datoteke hkrati ali dodaj manjkajoče kasneje</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!dataLoaded && error) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <h3 className="text-2xl font-bold text-red-800">Napaka</h3>
          </div>
          <p className="text-red-700 mb-6">{error}</p>
          <button onClick={() => { setError(null); setShowUpload(true); }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold">
            Naloži datoteke
          </button>
        </div>
      </div>
    );
  }

  // Fallback: jeśli nie jesteśmy w żadnym stanie, pokaż ekran uploadu
  if (!dataLoaded) {
    console.warn('⚠️ Niespodziewany stan: dataLoaded=false ale brak ekranu uploadu/błędu. Wymuszam ekran uploadu.');
    setShowUpload(true);
    return null;
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          #print-area {
            display: block !important;
          }
          body {
            background: white;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .print-header {
            display: none !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          @page {
            size: landscape;
            margin: 1cm;
          }
        }
      `}</style>
      <div className="w-full max-w-7xl mx-auto p-4 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-4 no-print">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">🥐 {t?.appTitle || 'Načrtovanje peke'}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-gray-600 text-sm">{products.length} {t?.product?.toLowerCase() || 'izdelkov'}</p>

              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                <div className={`w-2 h-2 rounded-full ${fileStatus.hourly ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-gray-700 font-medium">{t?.hourlyData || 'Urno'}</span>
              </div>

              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                <div className={`w-2 h-2 rounded-full ${fileStatus.daily ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-gray-700 font-medium">{t?.dailyData || 'Dnevno'}</span>
              </div>

              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                <div className={`w-2 h-2 rounded-full ${fileStatus.waste ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-gray-700 font-medium">{t?.wasteData || 'Odpadki'}</span>
              </div>
              
              <button onClick={() => { setShowUpload(true); }}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded font-medium ml-2">
                {t?.manageFiles || 'Upravljaj datoteke'}
              </button>

              <button
                onClick={() => { setShowOvenConfig(true); }}
                className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded font-medium ml-2"
                title={t?.configTitle || 'Konfiguracija pečice in programov'}
              >
                {t?.ovenConfig || '⚙️ Konfiguracija pečice'}
              </button>

              <button
                onClick={() => setShowResetModal(true)}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded font-medium ml-2"
                title={t?.resetTitle || 'Ponastavitev na začetno stanje'}
              >
                {t?.reset || '🔄 Reset'}
              </button>

              {deferredPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded font-medium ml-2"
                  title={t?.installTitle || 'Namestite aplikacijo lokalno'}
                >
                  {t?.installApp || '📱 Zainstaluj lokalnie'}
                </button>
              )}
            </div>
          </div>
          <div className="text-right">
            <label className="text-sm text-gray-600 block mb-1">{t?.selectDate || 'Izberi datum'}</label>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              onFocus={() => console.log('📅 Date input focused')}
              onClick={() => console.log('📅 Date input clicked')}
              className="px-3 py-2 border border-gray-300 rounded-lg font-semibold cursor-pointer"
            />
            <div className="mt-1 text-xs text-gray-500">
              {t?.plansLabel || 'Načrti:'} {Object.keys(plans).length > 0 ? (t?.plansGenerated || 'Generirano ✓') : (t?.plansNone || 'Brez')}
            </div>
            {isHighSalesDay(selectedDate) && (
              <div className="mt-2 flex flex-col gap-1">
                {isPreHoliday(selectedDate) && (
                  <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-semibold">
                    🎄 Pred praznikom
                  </div>
                )}
                {isPensionPaymentDay(selectedDate) && (
                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-semibold">
                    💰 Dan pokojnin
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className={`p-4 rounded-lg border-2 ${plans[1] ? 'bg-green-50 border-green-300 shadow-md' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-lg">{t?.wave1 || 'Val 1'}</span>
              {plans[1] && <CheckCircle className="w-5 h-5 text-green-600" />}
            </div>
            <div className="text-sm text-gray-700 mb-1">{t?.wave1Time || '6:30 → 7:00-12:00'}</div>
            {plans[1] && <div className="text-xs text-gray-600 mb-2">{t?.planInfo?.replace('{count}', getTotalPlanned(1)) || `Načrt: ${getTotalPlanned(1)} kos`}</div>}
            {!plans[1] && <div className="text-xs text-gray-500 mb-2 italic">{t?.clickToGenerate || 'Klikni za generiranje vseh valov'}</div>}
            <button onClick={() => generatePlan(1)} disabled={isGenerating}
              className={`w-full py-2 rounded font-semibold transition-colors ${
                isGenerating ? 'bg-gray-300 text-gray-500 cursor-not-allowed' :
                plans[1] ? 'bg-green-600 hover:bg-green-700 text-white' :
                'bg-blue-600 hover:bg-blue-700 text-white'
              }`}>
              {isGenerating ? (t?.generating || 'Generiranje...') : plans[1] ? (t?.regenerateAllWaves || '🔄 Ponovno generiraj vse') : (t?.generateAllWaves || '▶ Generiraj vse vale')}
            </button>
          </div>

          <div className={`p-4 rounded-lg border-2 ${plans[2] ? 'bg-blue-50 border-blue-300 shadow-md' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-lg">{t?.wave2 || 'Val 2'}</span>
              {plans[2] && <CheckCircle className="w-5 h-5 text-green-600" />}
            </div>
            <div className="text-sm text-gray-700 mb-1">{t?.wave2Time || '11:30 → 12:00-16:00'}</div>
            {plans[2] && <div className="text-xs text-gray-600 mb-2">{t?.planInfo?.replace('{count}', getTotalPlanned(2)) || `Načrt: ${getTotalPlanned(2)} kos`}</div>}
            {!plans[2] && <div className="text-xs text-gray-500 mb-2 italic">{t?.generatedWith || 'Generirano z Valom 1'}</div>}
            <button onClick={() => generatePlan(2)} disabled={isGenerating || !plans[1]}
              className={`w-full py-2 rounded font-semibold transition-colors ${
                isGenerating || !plans[1] ? 'bg-gray-300 text-gray-500 cursor-not-allowed' :
                'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}>
              {!plans[1] ? (t?.waiting || '⏸ Čakanje') : (t?.regenerateWave?.replace('{wave}', '2') || 'Ponovno generiraj Val 2')}
            </button>
          </div>

          <div className={`p-4 rounded-lg border-2 ${plans[3] ? 'bg-orange-50 border-orange-300 shadow-md' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-lg">{t?.wave3 || 'Val 3'}</span>
              {plans[3] && <CheckCircle className="w-5 h-5 text-green-600" />}
            </div>
            <div className="text-sm text-gray-700 mb-1">{t?.wave3Time || '15:30 → 16:00-20:00'}</div>
            {plans[3] && <div className="text-xs text-gray-600 mb-2">{t?.planInfo?.replace('{count}', getTotalPlanned(3)) || `Načrt: ${getTotalPlanned(3)} kos`}</div>}
            {!plans[3] && <div className="text-xs text-gray-500 mb-2 italic">{t?.generatedWith || 'Generirano z Valom 1'}</div>}
            <button onClick={() => generatePlan(3)} disabled={isGenerating || !plans[1]}
              className={`w-full py-2 rounded font-semibold transition-colors ${
                isGenerating || !plans[1] ? 'bg-gray-300 text-gray-500 cursor-not-allowed' :
                'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}>
              {!plans[1] ? (t?.waiting || '⏸ Čakanje') : (t?.regenerateWave?.replace('{wave}', '3') || 'Ponovno generiraj Val 3')}
            </button>
          </div>
        </div>
      </div>

      {plans[1] && plans[2] && plans[3] && (
        <div id="print-area" className="bg-white rounded-lg shadow-lg p-6">
          <div className="print-header hidden">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">🥐 Načrtovanje peke</h1>
            <p className="text-lg text-gray-600 mb-1">Datum: <strong>{selectedDate}</strong></p>
            <p className="text-sm text-gray-500 mb-1">Generirano: {new Date().toLocaleString()}</p>
            <p className="text-base text-gray-700">Dnevno Skupaj: <strong className="text-green-600">{getDailyTotalPlanned()} kos</strong> (Zgodovinsko: {getDailyTotalHistorical()} kos)</p>
            <hr className="my-4 border-gray-300" />
          </div>

          {/* Tab Navigation - Select view */}
          <div className="no-print flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === 'plan'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {t?.productionPlan || '📋 Plan proizvodnje'}
            </button>
            <button
              onClick={() => setActiveTab('trays')}
              className={`px-4 py-2 font-semibold transition-colors flex items-center gap-2 ${
                activeTab === 'trays'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Package className="w-4 h-4" />
              {t?.trayOptimization || 'Pladenj optimizacija'}
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-4 py-2 font-semibold transition-colors flex items-center gap-2 ${
                activeTab === 'metrics'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              {t?.metrics || 'Metrike'}
            </button>
          </div>

          {/* Plan View */}
          {activeTab === 'plan' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Celoten dnevni plan proizvodnje - {selectedDate}</h2>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">Dnevno Skupaj</div>
                    <div className="text-2xl font-bold text-green-600">{getDailyTotalPlanned()} kos</div>
                    <div className="text-sm text-gray-500">zgo: {getDailyTotalHistorical()}</div>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="print:hidden flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
                    title="Natisni plan proizvodnje"
                  >
                    <Printer className="w-5 h-5" />
                    Natisni
                  </button>
                </div>
              </div>

              {/* Przycisk pokaż/ukryj bufory */}
              <div className="no-print flex justify-end mb-2">
                <button
                  onClick={() => setShowBuffers(!showBuffers)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  {showBuffers ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                      Skrij bufferje
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Prikaži bufferje
                    </>
                  )}
                </button>
              </div>

              {Object.keys(plans).length > 0 && plans[1] && plans[2] && plans[3] ? (
              <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="px-3 py-2 text-left font-bold text-gray-700 sticky left-0 bg-white">Izdelek</th>
                  <th className="px-2 py-2 text-right font-bold text-green-700">Val 1<br/><span className="text-xs font-normal">7-12</span></th>
                  {showBuffers && <th className="px-2 py-2 text-right font-bold text-green-600">Buf 1<br/><span className="text-xs font-normal">%</span></th>}
                  <th className="px-2 py-2 text-right font-bold text-blue-700">Val 2<br/><span className="text-xs font-normal">12-16</span></th>
                  {showBuffers && <th className="px-2 py-2 text-right font-bold text-blue-600">Buf 2<br/><span className="text-xs font-normal">%</span></th>}
                  <th className="px-2 py-2 text-right font-bold text-orange-700">Val 3<br/><span className="text-xs font-normal">16-20</span></th>
                  {showBuffers && <th className="px-2 py-2 text-right font-bold text-orange-600">Buf 3<br/><span className="text-xs font-normal">%</span></th>}
                  <th className="px-2 py-2 text-right font-bold text-gray-700">Dnevno<br/><span className="text-xs font-normal">Skupaj</span></th>
                  <th className="px-2 py-2 text-right font-bold text-gray-600">Zgo</th>
                  <th className="px-2 py-2 text-left font-bold text-gray-600">Opombe</th>
                  <th className="px-2 py-2 text-center font-bold text-gray-600 no-print">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => {
                  const plan1 = plans[1]?.[product.sku];
                  const plan2 = plans[2]?.[product.sku];
                  const plan3 = plans[3]?.[product.sku];

                  // Pomiń produkty bez pełnych planów
                  if (!plan1 || !plan2 || !plan3) {
                    return null;
                  }

                  const dailyTotal = plan1.quantity + plan2.quantity + plan3.quantity;
                  const dailyHistorical = plan1.historical + plan2.historical + plan3.historical;

                  // Ukryj produkty z zerową ilością
                  if (dailyTotal === 0) {
                    return null;
                  }

                  // Sprawdź czy produkt został ręcznie skorygowany
                  const manualCorrectionTypes = ['weather', 'event', 'school', 'competitor', 'promotion', 'delivery', 'staff', 'intuition', 'other'];
                  const hasManualCorrection = manualCorrectionTypes.includes(plan1.adjustmentReason);

                  return (
                    <tr key={product.sku} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-3 py-2 sticky left-0 bg-white">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 text-sm">{product.name}</span>
                            {product.isKey && <span className="text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded">KLJUČNO</span>}
                            {product.isPackaged && <span className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-bold">{product.packageQuantity}x PAK</span>}
                          </div>
                          {product.isPackaged && (
                            <span className="text-xs text-red-600 font-semibold">⚠️ Količina za peko v kosih</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <span className="text-lg font-bold text-green-600">{plan1.quantity}</span>
                      </td>
                      {showBuffers && (
                        <td className="px-2 py-2 text-right">
                          <span className={`font-bold text-sm ${plan1.buffer > 0 ? 'text-green-600' : plan1.buffer < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {plan1.buffer > 0 ? '+' : ''}{plan1.buffer}%
                          </span>
                        </td>
                      )}
                      <td className="px-2 py-2 text-right">
                        <span className="text-lg font-bold text-blue-600">{plan2.quantity}</span>
                      </td>
                      {showBuffers && (
                        <td className="px-2 py-2 text-right">
                          <span className={`font-bold text-sm ${plan2.buffer > 0 ? 'text-green-600' : plan2.buffer < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {plan2.buffer > 0 ? '+' : ''}{plan2.buffer}%
                          </span>
                        </td>
                      )}
                      <td className="px-2 py-2 text-right">
                        <span className="text-lg font-bold text-orange-600">{plan3.quantity}</span>
                      </td>
                      {showBuffers && (
                        <td className="px-2 py-2 text-right">
                          <span className={`font-bold text-sm ${plan3.buffer > 0 ? 'text-green-600' : plan3.buffer < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {plan3.buffer > 0 ? '+' : ''}{plan3.buffer}%
                          </span>
                        </td>
                      )}
                      <td className="px-2 py-2 text-right">
                        <span className="text-xl font-bold text-gray-800">{dailyTotal}</span>
                      </td>
                      <td className="px-2 py-2 text-right text-gray-600">{dailyHistorical}</td>
                      <td className="px-2 py-2 text-sm text-gray-600">{plan1.adjustmentReason}</td>
                      <td className="px-3 py-2 text-center no-print">
                        <button
                          onClick={() => {
                            setCorrectionTarget({
                              product,
                              wave: 1,
                              date: selectedDate,
                              originalQuantity: plan1.originalQuantity || plan1.quantity, // Pierwotna wygenerowana
                              currentQuantity: plan1.quantity // Aktualna wartość
                            });
                            setShowCorrectionModal(true);
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs text-white rounded transition-colors ${
                            hasManualCorrection
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                          title="Uredi količino"
                        >
                          <Edit3 className="w-3 h-3" />
                          Uredi
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                  <td className="px-3 py-3">SKUPAJ</td>
                  <td className="px-2 py-3 text-right text-green-700">{getTotalPlanned(1)}</td>
                  {showBuffers && <td className="px-2 py-3"></td>}
                  <td className="px-2 py-3 text-right text-blue-700">{getTotalPlanned(2)}</td>
                  {showBuffers && <td className="px-2 py-3"></td>}
                  <td className="px-2 py-3 text-right text-orange-700">{getTotalPlanned(3)}</td>
                  {showBuffers && <td className="px-2 py-3"></td>}
                  <td className="px-2 py-3 text-right text-xl">{getDailyTotalPlanned()}</td>
                  <td className="px-2 py-3 text-right text-gray-700">{getDailyTotalHistorical()}</td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
              </div>
              ) : null}
            </>
          )}

          {/* Trays View */}
          {activeTab === 'trays' && (
            <div className="space-y-6 print:space-y-0">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 print:hidden">Optimizacija pladenj - {selectedDate}</h2>

              <div className="space-y-4 print:space-y-0">
                <div className="bg-green-50 border-2 border-green-300 rounded-lg print:bg-white print:border-0 print:p-0" data-wave-container="1">
                  <div className="flex items-center justify-between p-4 print:hidden cursor-pointer hover:bg-green-100 transition-colors" onClick={() => toggleWave(1)}>
                    <h3 className="text-lg font-bold text-green-800">Val 1 (7-12)</h3>
                    {expandedWaves[1] ? <ChevronUp className="w-6 h-6 text-green-800" /> : <ChevronDown className="w-6 h-6 text-green-800" />}
                  </div>
                  <div className={expandedWaves[1] ? "px-4 pb-4 print:block print:p-0" : "hidden print:block print:p-0"}>
                    <TrayOptimizationView
                      products={products}
                      wavePlan={plans[1]}
                      waveNumber={1}
                      translations={t}
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg print:bg-white print:border-0 print:p-0" data-wave-container="2">
                  <div className="flex items-center justify-between p-4 print:hidden cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => toggleWave(2)}>
                    <h3 className="text-lg font-bold text-blue-800">Val 2 (12-16)</h3>
                    {expandedWaves[2] ? <ChevronUp className="w-6 h-6 text-blue-800" /> : <ChevronDown className="w-6 h-6 text-blue-800" />}
                  </div>
                  <div className={expandedWaves[2] ? "px-4 pb-4 print:block print:p-0" : "hidden print:block print:p-0"}>
                    <TrayOptimizationView
                      products={products}
                      wavePlan={plans[2]}
                      waveNumber={2}
                      translations={t}
                    />
                  </div>
                </div>

                <div className="bg-orange-50 border-2 border-orange-300 rounded-lg print:bg-white print:border-0 print:p-0" data-wave-container="3">
                  <div className="flex items-center justify-between p-4 print:hidden cursor-pointer hover:bg-orange-100 transition-colors" onClick={() => toggleWave(3)}>
                    <h3 className="text-lg font-bold text-orange-800">Val 3 (16-20)</h3>
                    {expandedWaves[3] ? <ChevronUp className="w-6 h-6 text-orange-800" /> : <ChevronDown className="w-6 h-6 text-orange-800" />}
                  </div>
                  <div className={expandedWaves[3] ? "px-4 pb-4 print:block print:p-0" : "hidden print:block print:p-0"}>
                    <TrayOptimizationView
                      products={products}
                      wavePlan={plans[3]}
                      waveNumber={3}
                      translations={t}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Metrics View */}
          {activeTab === 'metrics' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Metrike uspešnosti - {selectedDate}</h2>
              <MetricsDashboard
                products={products}
                selectedDate={selectedDate}
                translations={t}
              />
            </div>
          )}
        </div>
      )}

      {showDateConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
              <h3 className="text-xl font-bold text-gray-800">Potrdi spremembo datuma</h3>
            </div>
            <p className="text-gray-700 mb-4">
              Sprememba datuma bo ponastavila vse načrte proizvodnje.
            </p>
            <div className="bg-gray-50 rounded p-3 mb-4 space-y-1">
              <div className="text-sm">
                <span className="text-gray-600">Trenutni datum:</span>
                <span className="font-bold text-gray-800 ml-2">{previousDateRef.current}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Nov datum:</span>
                <span className="font-bold text-blue-600 ml-2">{pendingDate}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Ali ste prepričani, da želite nadaljevati?
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelDateChange}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
              >
                Prekliči
              </button>
              <button
                onClick={confirmDateChange}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                Ponastavi in spremeni
              </button>
            </div>
          </div>
        </div>
      )}

      {showCorrectionModal && correctionTarget && (
        <ManagerCorrectionModal
          isOpen={showCorrectionModal}
          onClose={() => {
            setShowCorrectionModal(false);
            setCorrectionTarget(null);
          }}
          product={correctionTarget.product}
          wave={correctionTarget.wave}
          date={correctionTarget.date}
          originalQuantity={correctionTarget.originalQuantity}
          currentQuantity={correctionTarget.currentQuantity}
          translations={t}
          onSave={(newQuantity, correction) => {
            // Save correction to localStorage
            saveManagerCorrection(correction);

            // Update the plan with new quantity
            const updatedPlans = { ...plans };
            updatedPlans[correctionTarget.wave][correctionTarget.product.sku] = {
              ...updatedPlans[correctionTarget.wave][correctionTarget.product.sku],
              quantity: newQuantity,
              adjustmentReason: correction.reasonType
            };
            setPlans(updatedPlans);

            // Save updated plan to localStorage
            savePlan(selectedDate, updatedPlans);

            // Close modal
            setShowCorrectionModal(false);
            setCorrectionTarget(null);

            console.log(`✏️ Manager correction saved: ${correctionTarget.product.name} Wave ${correctionTarget.wave}: ${correctionTarget.originalQuantity} → ${newQuantity}`);
          }}
        />
      )}

      {/* Oven Configuration Modal */}
      <OvenConfigurationModal
        isOpen={showOvenConfig}
        onClose={() => setShowOvenConfig(false)}
        onSave={(config) => {
          console.log('⚙️ Oven configuration saved:', config);
          // Configuration is already saved in modal, just close
          setShowOvenConfig(false);
        }}
        currentLanguage={currentLanguage}
        onLanguageChange={handleLanguageChange}
        availableLanguages={availableLanguages}
        translations={t}
      />

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-orange-600" />
              <h3 className="text-xl font-bold text-gray-800">{t.resetPlans || 'Počisti načrte'}</h3>
            </div>
            <p className="text-gray-700 mb-4">
              {t.resetDescription || 'Ta operacija bo izbrisala samo wygenerowane načrte:'}
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mb-4 space-y-1">
              <li>{t.resetItem1 || 'Vse načrte proizvodnje'}</li>
              <li>{t.resetItem2 || 'Korekture in prilagoditve'}</li>
              <li>{t.resetItem3 || 'Metrike in statistike'}</li>
            </ul>
            <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
              <p className="text-sm text-green-800 font-semibold">
                ✓ {t.resetPreserved || 'Ohranjena bodo: Konfiguracija pečic, programi in naloženi podatki'}
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              {t.resetConfirm || 'Ali želite počistiti načrte?'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
              >
                Prekliči
              </button>
              <button
                onClick={() => {
                  clearGeneratedPlans();
                  // Zresetuj tylko state planów, zachowaj dane i konfigurację
                  setPlans({ 1: {}, 2: {}, 3: {} });
                  setShowResetModal(false);
                  console.log('🔄 Generated plans cleared (data and configuration preserved)');
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                {t.reset || 'Ponastavi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA Install Password Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <h3 className="text-xl font-bold text-gray-800">Instalacja lokalna</h3>
            </div>
            <p className="text-gray-700 mb-4">
              Wprowadź hasło aby zainstalować aplikację lokalnie na swoim urządzeniu.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Geslo:</label>
              <input
                type="password"
                value={installPassword}
                onChange={(e) => setInstallPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInstallSubmit();
                  }
                }}
                placeholder="Vnesite geslo"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
              {installError && (
                <p className="mt-2 text-sm text-red-600">{installError}</p>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-6">
              📱 Po instalacji aplikacja będzie dostępna jako ikona na ekranie głównym i będzie działać offline.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowInstallModal(false);
                  setInstallPassword('');
                  setInstallError('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
              >
                Prekliči
              </button>
              <button
                onClick={handleInstallSubmit}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
              >
                Namesti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default BakeryPlanningSystem;