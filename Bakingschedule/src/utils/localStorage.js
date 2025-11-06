/**
 * LOCAL STORAGE PERSISTENCE MODULE
 *
 * Zapisuje i wczytuje dane z localStorage przeglądarki:
 * - Wygenerowane plany
 * - Historia korekt managera
 * - Wagi ML (learned weights)
 * - Metryki wydajności
 * - Stockout events
 */

const STORAGE_KEYS = {
  PLANS: 'bakery_plans',
  CORRECTIONS: 'bakery_manager_corrections',
  ML_WEIGHTS: 'bakery_ml_weights',
  METRICS: 'bakery_metrics',
  STOCKOUTS: 'bakery_stockouts',
  ACTUAL_SALES: 'bakery_actual_sales',
  ACTUAL_WASTE: 'bakery_actual_waste',
  OVEN_CONFIG: 'bakery_oven_configuration',
  PROGRAM_CONFIG: 'bakery_program_configuration'
};

// ============================================
// PLANS - Wygenerowane plany wypieków
// ============================================

/**
 * Zapisuje plan dla konkretnej daty
 * @param {string} date - Data w formacie YYYY-MM-DD
 * @param {Object} planData - { wave1: {...}, wave2: {...}, wave3: {...} }
 */
export const savePlan = (date, planData) => {
  try {
    const allPlans = getAllPlans();
    allPlans[date] = {
      ...planData,
      generatedAt: new Date().toISOString(),
      version: '2.0'
    };
    localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(allPlans));
    console.log(`✅ Plan saved for ${date}`);
  } catch (error) {
    console.error('❌ Error saving plan:', error);
  }
};

/**
 * Pobiera plan dla konkretnej daty
 * @param {string} date - Data
 * @returns {Object|null} - Plan lub null
 */
export const getPlan = (date) => {
  try {
    const allPlans = getAllPlans();
    return allPlans[date] || null;
  } catch (error) {
    console.error('❌ Error getting plan:', error);
    return null;
  }
};

/**
 * Pobiera wszystkie zapisane plany
 * @returns {Object} - { 'YYYY-MM-DD': planData, ... }
 */
export const getAllPlans = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PLANS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('❌ Error getting all plans:', error);
    return {};
  }
};

/**
 * Usuwa plan dla daty
 * @param {string} date - Data
 */
export const deletePlan = (date) => {
  try {
    const allPlans = getAllPlans();
    delete allPlans[date];
    localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(allPlans));
    console.log(`🗑️ Plan deleted for ${date}`);
  } catch (error) {
    console.error('❌ Error deleting plan:', error);
  }
};

// ============================================
// MANAGER CORRECTIONS - Korekty managera
// ============================================

/**
 * Zapisuje korektę managera
 * @param {Object} correction - { date, wave, sku, originalQty, adjustedQty, reason, context }
 */
export const saveManagerCorrection = (correction) => {
  try {
    const corrections = getAllManagerCorrections();
    corrections.push({
      ...correction,
      timestamp: new Date().toISOString(),
      id: `${correction.date}_${correction.wave}_${correction.sku}_${Date.now()}`
    });
    localStorage.setItem(STORAGE_KEYS.CORRECTIONS, JSON.stringify(corrections));
    console.log(`✅ Manager correction saved: ${correction.sku} ${correction.adjustedQty - correction.originalQty > 0 ? '+' : ''}${correction.adjustedQty - correction.originalQty}`);
  } catch (error) {
    console.error('❌ Error saving correction:', error);
  }
};

/**
 * Pobiera wszystkie korekty managera
 * @returns {Array} - Lista korekt
 */
export const getAllManagerCorrections = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CORRECTIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('❌ Error getting corrections:', error);
    return [];
  }
};

/**
 * Pobiera korekty dla konkretnego SKU
 * @param {string} sku - SKU produktu
 * @returns {Array} - Lista korekt dla tego produktu
 */
export const getCorrectionsForSku = (sku) => {
  const corrections = getAllManagerCorrections();
  return corrections.filter(c => c.sku === sku);
};

// ============================================
// ML WEIGHTS - Wagi algorytmu uczenia
// ============================================

/**
 * Pobiera wagi ML dla produktu
 * @param {string} sku - SKU produktu
 * @returns {Object} - { same_weekday_4w: 0.35, same_weekday_8w: 0.25, ... }
 */
export const getMLWeights = (sku) => {
  try {
    const allWeights = getAllMLWeights();
    return allWeights[sku] || getDefaultMLWeights();
  } catch (error) {
    console.error('❌ Error getting ML weights:', error);
    return getDefaultMLWeights();
  }
};

/**
 * Zapisuje wagi ML dla produktu
 * @param {string} sku - SKU produktu
 * @param {Object} weights - Obiekt z wagami
 */
export const saveMLWeights = (sku, weights) => {
  try {
    const allWeights = getAllMLWeights();
    allWeights[sku] = {
      ...weights,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.ML_WEIGHTS, JSON.stringify(allWeights));
    console.log(`✅ ML weights saved for ${sku}`);
  } catch (error) {
    console.error('❌ Error saving ML weights:', error);
  }
};

/**
 * Pobiera wszystkie wagi ML
 * @returns {Object} - { 'sku1': weights, 'sku2': weights, ... }
 */
export const getAllMLWeights = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ML_WEIGHTS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('❌ Error getting all ML weights:', error);
    return {};
  }
};

/**
 * Domyślne wagi ML (początkowe)
 * @returns {Object}
 */
export const getDefaultMLWeights = () => {
  return {
    same_weekday_4w: 0.35,
    same_weekday_8w: 0.25,
    last_week_avg: 0.20,
    same_day_month: 0.10,
    year_over_year: 0.10
  };
};

// ============================================
// METRICS - Metryki wydajności
// ============================================

/**
 * Zapisuje metryki dzienne
 * @param {string} date - Data
 * @param {Object} metrics - { forecastAccuracy, waste, stockouts, ... }
 */
export const saveDailyMetrics = (date, metrics) => {
  try {
    const allMetrics = getAllMetrics();
    allMetrics[date] = {
      ...metrics,
      calculatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.METRICS, JSON.stringify(allMetrics));
    console.log(`✅ Metrics saved for ${date}`);
  } catch (error) {
    console.error('❌ Error saving metrics:', error);
  }
};

/**
 * Pobiera metryki dla daty
 * @param {string} date - Data
 * @returns {Object|null}
 */
export const getMetrics = (date) => {
  try {
    const allMetrics = getAllMetrics();
    return allMetrics[date] || null;
  } catch (error) {
    console.error('❌ Error getting metrics:', error);
    return null;
  }
};

/**
 * Pobiera wszystkie metryki
 * @returns {Object}
 */
export const getAllMetrics = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.METRICS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('❌ Error getting all metrics:', error);
    return {};
  }
};

// ============================================
// STOCKOUTS - Wydarzenia braków
// ============================================

/**
 * Zapisuje wykryty stockout
 * @param {Object} stockout - { date, sku, wave, hour, confidence, reason }
 */
export const saveStockout = (stockout) => {
  try {
    const stockouts = getAllStockouts();
    stockouts.push({
      ...stockout,
      detectedAt: new Date().toISOString(),
      id: `${stockout.date}_${stockout.sku}_${stockout.hour}`
    });
    localStorage.setItem(STORAGE_KEYS.STOCKOUTS, JSON.stringify(stockouts));
    console.log(`🚨 Stockout saved: ${stockout.sku} at ${stockout.date} ${stockout.hour}:00`);
  } catch (error) {
    console.error('❌ Error saving stockout:', error);
  }
};

/**
 * Pobiera wszystkie stockouts
 * @returns {Array}
 */
export const getAllStockouts = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STOCKOUTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('❌ Error getting stockouts:', error);
    return [];
  }
};

/**
 * Pobiera stockouts dla SKU w ostatnich N dniach
 * @param {string} sku - SKU produktu
 * @param {number} daysBack - Ile dni wstecz
 * @returns {Array}
 */
export const getRecentStockouts = (sku, daysBack = 28) => {
  const stockouts = getAllStockouts();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  return stockouts.filter(s =>
    s.sku === sku &&
    new Date(s.date) >= cutoffDate
  );
};

// ============================================
// ACTUAL SALES & WASTE - Rzeczywista sprzedaż i odpady
// ============================================

/**
 * Zapisuje rzeczywistą sprzedaż dla daty
 * @param {string} date - Data
 * @param {Object} salesData - { 'sku1': quantity, 'sku2': quantity, ... }
 */
export const saveActualSales = (date, salesData) => {
  try {
    const allSales = getAllActualSales();
    allSales[date] = {
      ...salesData,
      recordedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.ACTUAL_SALES, JSON.stringify(allSales));
    console.log(`✅ Actual sales saved for ${date}`);
  } catch (error) {
    console.error('❌ Error saving actual sales:', error);
  }
};

/**
 * Pobiera rzeczywistą sprzedaż dla daty
 * @param {string} date - Data
 * @returns {Object|null}
 */
export const getActualSales = (date) => {
  try {
    const allSales = getAllActualSales();
    return allSales[date] || null;
  } catch (error) {
    console.error('❌ Error getting actual sales:', error);
    return null;
  }
};

/**
 * Pobiera wszystkie rzeczywiste sprzedaże
 * @returns {Object}
 */
export const getAllActualSales = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ACTUAL_SALES);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('❌ Error getting all actual sales:', error);
    return {};
  }
};

/**
 * Zapisuje rzeczywiste odpady dla daty
 * @param {string} date - Data
 * @param {Object} wasteData - { 'sku1': quantity, 'sku2': quantity, ... }
 */
export const saveActualWaste = (date, wasteData) => {
  try {
    const allWaste = getAllActualWaste();
    allWaste[date] = {
      ...wasteData,
      recordedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.ACTUAL_WASTE, JSON.stringify(allWaste));
    console.log(`✅ Actual waste saved for ${date}`);
  } catch (error) {
    console.error('❌ Error saving actual waste:', error);
  }
};

/**
 * Pobiera rzeczywiste odpady dla daty
 * @param {string} date - Data
 * @returns {Object|null}
 */
export const getActualWaste = (date) => {
  try {
    const allWaste = getAllActualWaste();
    return allWaste[date] || null;
  } catch (error) {
    console.error('❌ Error getting actual waste:', error);
    return null;
  }
};

/**
 * Pobiera wszystkie rzeczywiste odpady
 * @returns {Object}
 */
export const getAllActualWaste = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ACTUAL_WASTE);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('❌ Error getting all actual waste:', error);
    return {};
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Eksportuje wszystkie dane do JSON (do pobrania/backupu)
 * @returns {Object} - Wszystkie dane z localStorage
 */
export const exportAllData = () => {
  return {
    plans: getAllPlans(),
    corrections: getAllManagerCorrections(),
    mlWeights: getAllMLWeights(),
    metrics: getAllMetrics(),
    stockouts: getAllStockouts(),
    actualSales: getAllActualSales(),
    actualWaste: getAllActualWaste(),
    exportedAt: new Date().toISOString(),
    version: '2.0'
  };
};

/**
 * Importuje dane z JSON (przywracanie backupu)
 * @param {Object} data - Dane do importu
 */
export const importAllData = (data) => {
  try {
    if (data.plans) localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(data.plans));
    if (data.corrections) localStorage.setItem(STORAGE_KEYS.CORRECTIONS, JSON.stringify(data.corrections));
    if (data.mlWeights) localStorage.setItem(STORAGE_KEYS.ML_WEIGHTS, JSON.stringify(data.mlWeights));
    if (data.metrics) localStorage.setItem(STORAGE_KEYS.METRICS, JSON.stringify(data.metrics));
    if (data.stockouts) localStorage.setItem(STORAGE_KEYS.STOCKOUTS, JSON.stringify(data.stockouts));
    if (data.actualSales) localStorage.setItem(STORAGE_KEYS.ACTUAL_SALES, JSON.stringify(data.actualSales));
    if (data.actualWaste) localStorage.setItem(STORAGE_KEYS.ACTUAL_WASTE, JSON.stringify(data.actualWaste));
    console.log('✅ All data imported successfully');
  } catch (error) {
    console.error('❌ Error importing data:', error);
  }
};

/**
 * Czyści tylko wygenerowane plany, zachowując konfigurację i dane wejściowe
 */
export const clearGeneratedPlans = () => {
  // Usuń tylko klucze związane z wygenerowanymi planami
  const keysToRemove = [
    STORAGE_KEYS.PLANS,
    STORAGE_KEYS.CORRECTIONS,
    STORAGE_KEYS.ML_WEIGHTS,
    STORAGE_KEYS.METRICS,
    STORAGE_KEYS.STOCKOUTS,
    STORAGE_KEYS.ACTUAL_SALES,
    STORAGE_KEYS.ACTUAL_WASTE
  ];

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });

  console.log('🗑️ Generated plans cleared (configuration and input data preserved)');
  return true;
};

/**
 * Czyści wszystkie dane (UWAGA: nieodwracalne!)
 */
export const clearAllData = () => {
  if (confirm('⚠️ Czy na pewno chcesz usunąć WSZYSTKIE dane? To działanie jest nieodwracalne!')) {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    // Usuń również klucz języka
    localStorage.removeItem('appLanguage');
    console.log('🗑️ All data cleared');
    return true;
  }
  return false;
};

/**
 * Pobiera rozmiar danych w localStorage (w KB)
 * @returns {number} - Rozmiar w KB
 */
export const getStorageSize = () => {
  let total = 0;
  Object.values(STORAGE_KEYS).forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      total += new Blob([data]).size;
    }
  });
  return (total / 1024).toFixed(2); // KB
};

// ============================================
// OVEN CONFIGURATION - Konfiguracja pieców
// ============================================

/**
 * Zapisuje konfigurację produktów (z pliku Excel)
 * @param {Array} config - [{ sku, name, program, unitsPerTray }, ...]
 */
export const saveOvenConfiguration = (config) => {
  try {
    localStorage.setItem(STORAGE_KEYS.OVEN_CONFIG, JSON.stringify({
      products: config,
      updatedAt: new Date().toISOString()
    }));
    console.log(`✅ Oven configuration saved: ${config.length} products`);
  } catch (error) {
    console.error('❌ Error saving oven configuration:', error);
  }
};

/**
 * Pobiera konfigurację produktów
 * @returns {Array} - [{ sku, name, program, unitsPerTray }, ...]
 */
export const getOvenConfiguration = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.OVEN_CONFIG);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return parsed.products || [];
  } catch (error) {
    console.error('❌ Error getting oven configuration:', error);
    return [];
  }
};

/**
 * Pobiera konfigurację dla konkretnego produktu (SKU)
 * @param {string} sku - SKU produktu
 * @returns {Object|null} - { sku, name, program, unitsPerTray } lub null
 */
export const getProductOvenConfig = (sku) => {
  const config = getOvenConfiguration();
  return config.find(p => p.sku === sku) || null;
};

// ============================================
// PROGRAM CONFIGURATION - Konfiguracja programów
// ============================================

/**
 * Zapisuje konfigurację programów i pieców
 * @param {Object} config - { '1': { name, durationMinutes }, '2': {...}, ovenSettings: { ovenCount, ovenCapacity } }
 */
export const saveProgramConfiguration = (config) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PROGRAM_CONFIG, JSON.stringify({
      ...config,
      updatedAt: new Date().toISOString()
    }));
    console.log('✅ Program configuration saved');
  } catch (error) {
    console.error('❌ Error saving program configuration:', error);
  }
};

/**
 * Pobiera konfigurację programów i pieców
 * @returns {Object} - { '1': { name, durationMinutes }, '2': {...}, ovenSettings: { ovenCount, ovenCapacity } }
 */
export const getProgramConfiguration = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROGRAM_CONFIG);
    if (!data) return {};
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error getting program configuration:', error);
    return {};
  }
};

/**
 * Pobiera konfigurację konkretnego programu
 * @param {number} programNumber - Numer programu
 * @returns {Object|null} - { name, durationMinutes } lub null
 */
export const getProgramConfig = (programNumber) => {
  const config = getProgramConfiguration();
  return config[programNumber] || null;
};

/**
 * Pobiera ustawienia pieców
 * @returns {Object} - { ovenCount, ovenCapacity, individualCapacities }
 */
export const getOvenSettings = () => {
  const config = getProgramConfiguration();
  return config.ovenSettings || { ovenCount: 2, ovenCapacity: 4, individualCapacities: [2, 2] };
};
