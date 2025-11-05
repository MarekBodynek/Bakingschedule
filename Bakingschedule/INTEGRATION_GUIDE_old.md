# 🔌 INTEGRATION GUIDE - How to Integrate New Features

This document shows **step by step** how to add all new features to existing code.

---

## 📋 **STEP 1: Imports**

At the beginning of your `BakeryPlanningSystem.jsx` file, add imports:

```javascript
import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle, RefreshCw, Upload, Edit3, Package, TrendingUp, Settings } from 'lucide-react';
import _ from 'lodash';
import * as XLSX from 'xlsx';

// ✨ NEW IMPORTS
import {
  getTopFastMovingProducts,
  detectAllStockouts,
  estimateUnmetDemand
} from './utils/stockoutDetection';

import {
  savePlan,
  getPlan,
  saveOvenConfiguration,
  getOvenConfiguration,
  saveProgramConfiguration,
  getProgramConfiguration,
  getOvenSettings,
  saveManagerCorrection,
  getAllManagerCorrections,
  getMLWeights,
  saveActualSales,
  saveActualWaste,
  exportAllData,
  importAllData
} from './utils/localStorage';

import {
  optimizeWeightsForProduct,
  learnFromManagerCorrections,
  learnFromStockouts,
  runWeeklyOptimization
} from './utils/simpleMachineLearning';

import OvenConfigurationModal from './components/OvenConfigurationModal';
import ManagerCorrectionModal from './components/ManagerCorrectionModal';
import TrayOptimizationView from './components/TrayOptimizationView';
import MetricsDashboard from './components/MetricsDashboard';
```

---

## 📋 **STEP 2: New State Variables**

In your component, add new state variables:

```javascript
const BakeryPlanningSystem = () => {
  // ... existing states ...

  // ✨ NEW STATES
  const [fastMovingSkus, setFastMovingSkus] = useState([]);
  const [detectedStockouts, setDetectedStockouts] = useState([]);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState(null);
  const [showOvenConfig, setShowOvenConfig] = useState(false);
  const [activeTab, setActiveTab] = useState('plan'); // 'plan', 'trays', 'metrics'

  // ... rest of code ...
}
```

---

## 📋 **KROK 3: Inicjalizacja przy ładowaniu danych**

W funkcji `parseAllData`, po załadowaniu produktów, dodaj:

```javascript
const parseAllData = async (hourlyFile, dailyFile, wasteFile) => {
  // ... istniejący kod ...

  setProducts(uniqueProducts);
  setDataLoaded(true);

  // ✨ NOWA FUNKCJONALNOŚĆ: Wykryj TOP 5 i stockouts
  const top5 = getTopFastMovingProducts(sales2025Local, uniqueProducts, 28);
  setFastMovingSkus(top5);

  const stockouts = detectAllStockouts(sales2025Local, uniqueProducts, 28);
  setDetectedStockouts(stockouts);

  console.log(`🔥 TOP 5 products:`, top5);
  console.log(`🚨 Detected ${stockouts.length} stockouts`);

  setShowUpload(false);
  setError(null);
  setLoadingStatus('');
};
```

---

## 📋 **KROK 4: Integracja Stockout Detection w `calculateHistoricalAverage`**

Zmodyfikuj funkcję `calculateHistoricalAverage` aby uwzględniała wykryte braki:

```javascript
const calculateHistoricalAverage = (sku, targetDate, waveHours) => {
  // ... istniejący kod obliczania weights ...

  // ✨ NOWA FUNKCJONALNOŚĆ: Sprawdź czy były stockouts dla tego produktu
  const recentStockouts = detectedStockouts.filter(s =>
    s.sku === sku &&
    new Date(s.date) >= fourWeeksAgo
  );

  if (recentStockouts.length > 0) {
    console.log(`⚠️ ${sku} had ${recentStockouts.length} stockouts recently - increasing estimate`);

    // Zwiększ prognozę o 15-25% w zależności od częstotliwości
    const stockoutAdjustment = 1 + (0.15 + 0.1 * Math.min(recentStockouts.length / 4, 1));

    if (weights.length === 0) return 0;

    const totalWeight = _.sumBy(weights, 'weight');
    const weightedSum = _.sumBy(weights, w => w.value * w.weight);
    return (weightedSum / totalWeight) * stockoutAdjustment;
  }

  // ... reszta kodu ...
};
```

---

## 📋 **KROK 5: Użyj ML Weights zamiast hardcoded**

W `calculateHistoricalAverage`, zamień hardcoded wagi na wagi z ML:

```javascript
const calculateHistoricalAverage = (sku, targetDate, waveHours) => {
  const targetDayOfWeek = new Date(targetDate).getDay();
  const productSales2025 = salesData2025.filter(s => s.eanCode === sku);
  const productSales2024 = salesData2024.filter(s => s.eanCode === sku);

  // ✨ UŻYJ ML WEIGHTS
  const mlWeights = getMLWeights(sku);

  let weights = [];
  const isHighSales = isHighSalesDay(targetDate);

  // ... logika dla high sales days ...

  if (productSales2025.length > 0) {
    const fourWeeksAgo = new Date(targetDate);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const recentSales = productSales2025.filter(s =>
      s.dayOfWeek === targetDayOfWeek && s.date >= fourWeeksAgo &&
      waveHours.includes(s.hour) && !isHighSalesDay(s.dateStr)
    );

    if (recentSales.length > 0) {
      const byDate = _.groupBy(recentSales, 'dateStr');
      const dailyTotals = Object.values(byDate).map(day => _.sumBy(day, 'quantity'));
      const totalQuantity = _.sumBy(dailyTotals);
      const targetDaysInPeriod = 4;
      const avgPerTargetDay = totalQuantity / targetDaysInPeriod;

      // ✨ UŻYJ ML WEIGHT zamiast hardcoded 0.35/0.30
      weights.push({
        value: avgPerTargetDay,
        weight: weights.length > 0 ? mlWeights.same_weekday_4w * 0.85 : mlWeights.same_weekday_4w
      });
    }
  }

  // ... podobnie dla innych source'ów (year_over_year, etc.) ...

  if (weights.length === 0) return 0;

  const totalWeight = _.sumBy(weights, 'weight');
  const weightedSum = _.sumBy(weights, w => w.value * w.weight);
  return weightedSum / totalWeight;
};
```

---

## 📋 **KROK 6: Zapisz plan do localStorage po wygenerowaniu**

W funkcji `generatePlan`, na końcu dodaj:

```javascript
const generatePlan = async (wave) => {
  // ... istniejący kod generowania planu ...

  setPlans(newPlans);
  setCurrentWave(1);
  setIsGenerating(false);

  // ✨ ZAPISZ PLAN DO LOCALSTORAGE
  savePlan(selectedDate, newPlans);
  console.log(`💾 Plan saved for ${selectedDate}`);
};
```

---

## 📋 **KROK 7: Dodaj przycisk "Edytuj" do tabeli**

W tabeli planu, dodaj kolumnę z przyciskiem edycji:

```jsx
{/* W tabeli produktów, dodaj nową kolumnę */}
<table className="w-full">
  <thead>
    <tr className="border-b-2 border-gray-300">
      <th className="px-3 py-2 text-left font-bold text-gray-700">Izdelek</th>
      <th className="px-3 py-2 text-right font-bold text-green-700">Val 1</th>
      <th className="px-3 py-2 text-right font-bold text-blue-700">Val 2</th>
      <th className="px-3 py-2 text-right font-bold text-orange-700">Val 3</th>
      <th className="px-3 py-2 text-right font-bold text-gray-700">Dnevno Skupaj</th>
      <th className="px-3 py-2 text-left font-bold text-gray-600">Opombe</th>
      {/* ✨ NOWA KOLUMNA */}
      <th className="px-3 py-2 text-center font-bold text-gray-600 no-print">Akcije</th>
    </tr>
  </thead>
  <tbody>
    {products.map(product => {
      const plan1 = plans[1][product.sku];
      const plan2 = plans[2][product.sku];
      const plan3 = plans[3][product.sku];

      return (
        <tr key={product.sku} className="border-b border-gray-200 hover:bg-gray-50">
          {/* ... istniejące kolumny ... */}

          {/* ✨ NOWA KOLUMNA - Przycisk Edytuj */}
          <td className="px-3 py-2 text-center no-print">
            <button
              onClick={() => {
                setCorrectionTarget({
                  product,
                  wave: 1, // Lub możesz dać wybór fali
                  originalQuantity: plan1.quantity
                });
                setShowCorrectionModal(true);
              }}
              className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-semibold flex items-center gap-1 mx-auto"
            >
              <Edit3 className="w-3 h-3" />
              Edytuj
            </button>
          </td>
        </tr>
      );
    })}
  </tbody>
</table>

{/* ✨ DODAJ MODAL NA KOŃCU KOMPONENTU */}
{showCorrectionModal && correctionTarget && (
  <ManagerCorrectionModal
    isOpen={showCorrectionModal}
    onClose={() => {
      setShowCorrectionModal(false);
      setCorrectionTarget(null);
    }}
    product={correctionTarget.product}
    wave={correctionTarget.wave}
    date={selectedDate}
    originalQuantity={correctionTarget.originalQuantity}
    onSave={(newQuantity, correction) => {
      // Zaktualizuj plan z nową ilością
      const updatedPlans = { ...plans };
      updatedPlans[correctionTarget.wave][correctionTarget.product.sku].quantity = newQuantity;
      setPlans(updatedPlans);

      // Zapisz do localStorage
      savePlan(selectedDate, updatedPlans);

      console.log('✅ Correction applied:', correction);
    }}
  />
)}
```

---

## 📋 **KROK 8: Dodaj Tabs dla Plan / Trays / Metrics**

Po nagłówku z falami, dodaj zakładki:

```jsx
{/* ✨ NOWE ZAKŁADKI */}
{plans[1] && plans[2] && plans[3] && (
  <div className="bg-white rounded-lg shadow-lg p-2 mb-4">
    <div className="flex gap-2">
      <button
        onClick={() => setActiveTab('plan')}
        className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
          activeTab === 'plan'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        📋 Plan Produkcji
      </button>
      <button
        onClick={() => setActiveTab('trays')}
        className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
          activeTab === 'trays'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        📦 Optymalizacja Blach
      </button>
      <button
        onClick={() => setActiveTab('metrics')}
        className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
          activeTab === 'metrics'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        📊 Metryki & Analiza
      </button>
    </div>
  </div>
)}
```

---

## 📋 **KROK 9: Wyświetl odpowiednią zakładkę**

Po zakładkach, zamień istniejącą tabelę na warunkowe renderowanie:

```jsx
{plans[1] && plans[2] && plans[3] && (
  <div>
    {/* Zakładki (z poprzedniego kroku) */}

    {/* ✨ WARUNKOWE RENDEROWANIE */}
    {activeTab === 'plan' && (
      <div id="print-area" className="bg-white rounded-lg shadow-lg p-6">
        {/* ... istniejąca tabela planu ... */}
      </div>
    )}

    {activeTab === 'trays' && (
      <div className="space-y-4">
        <TrayOptimizationView
          products={products}
          wavePlan={plans[1]}
          waveNumber={1}
        />
        <TrayOptimizationView
          products={products}
          wavePlan={plans[2]}
          waveNumber={2}
        />
        <TrayOptimizationView
          products={products}
          wavePlan={plans[3]}
          waveNumber={3}
        />
      </div>
    )}

    {activeTab === 'metrics' && (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <MetricsDashboard
          products={products}
          selectedDate={selectedDate}
        />
      </div>
    )}
  </div>
)}
```

---

## 📋 **KROK 10: Dodaj przycisk "Weekly ML Optimization"**

W nagłówku, dodaj przycisk do uruchomienia tygodniowej optymalizacji:

```jsx
<div className="flex items-center justify-between mb-4">
  <div>
    <h1 className="text-3xl font-bold text-gray-800 mb-1">🥐 Načrtovanje peke - Šentjur</h1>
    {/* ... */}
  </div>

  <div className="text-right">
    {/* ... istniejące elementy ... */}

    {/* ✨ NOWY PRZYCISK */}
    <button
      onClick={() => {
        console.log('🤖 Running weekly ML optimization...');

        // Przygotuj dane historyczne (tu uproszczenie - w pełnej wersji trzeba zebrać actual sales)
        const historicalDataByProduct = {};
        products.forEach(product => {
          historicalDataByProduct[product.sku] = [
            // TODO: Zbierz rzeczywiste dane z localStorage
            // { forecast: X, actual: Y, waste: Z, hasStockout: false }
          ];
        });

        const results = runWeeklyOptimization(products, historicalDataByProduct);
        alert(`✅ Weekly optimization complete!\nOptimized: ${results.optimized}\nImproved: ${results.improved}`);
      }}
      className="mt-2 px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded text-xs font-semibold"
    >
      🤖 Weekly ML Optimization
    </button>
  </div>
</div>
```

---

## 📋 **KROK 11: Dodaj przycisk Backup/Restore**

W nagłówku, dodaj funkcje backup:

```jsx
{/* ✨ BACKUP/RESTORE BUTTONS */}
<div className="flex items-center gap-2">
  <button
    onClick={() => {
      const backup = exportAllData();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bakery-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }}
    className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded font-medium"
  >
    💾 Backup
  </button>

  <button
    onClick={() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            importAllData(data);
            alert('✅ Data imported successfully!');
            window.location.reload();
          } catch (error) {
            alert('❌ Error importing data: ' + error.message);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    }}
    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded font-medium"
  >
    📥 Restore
  </button>
</div>
```

---

## ✅ **GOTOWE!**

Po wykonaniu wszystkich kroków, Twoja aplikacja będzie miała:

1. ✅ **Stockout Detection** - automatyczne wykrywanie braków
2. ✅ **LocalStorage Persistence** - zapisywanie wszystkich danych
3. ✅ **ML System** - uczenie się z historii i korekt
4. ✅ **Manager Corrections** - możliwość edycji z zapisywaniem powodu
5. ✅ **Tray Optimization** - widok blach z grupowaniem
6. ✅ **Metrics Dashboard** - analiza wydajności
7. ✅ **Backup/Restore** - eksport i import danych

---

## 🔧 **Testowanie**

### Test 1: Stockout Detection
```javascript
console.log('Fast-moving SKUs:', fastMovingSkus);
console.log('Detected stockouts:', detectedStockouts);
```

### Test 2: LocalStorage
```javascript
// Po wygenerowaniu planu
const savedPlan = getPlan(selectedDate);
console.log('Saved plan:', savedPlan);
```

### Test 3: Manager Correction
1. Wygeneruj plan
2. Kliknij "Edytuj" na produkcie
3. Zmień ilość
4. Wybierz powód
5. Zapisz
6. Sprawdź: `console.log(getAllManagerCorrections())`

### Test 4: Tray Optimization
1. Wygeneruj plan
2. Kliknij zakładkę "Optymalizacja Blach"
3. Zobacz pogrupowane produkty

### Test 5: Metrics
1. Wygeneruj plany dla kilku dni
2. Dodaj actual sales/waste (TODO: UI)
3. Kliknij zakładkę "Metryki & Analiza"
4. Zobacz statystyki

---

## 🚨 **Uwaga**

Aby metryki działały, musisz **ręcznie wprowadzać** rzeczywistą sprzedaż i odpady:

```javascript
// Przykład - dodaj UI do tego później
saveActualSales('2025-01-20', {
  'sku1': 48, // Faktycznie sprzedane
  'sku2': 52,
  // ...
});

saveActualWaste('2025-01-20', {
  'sku1': 2, // Faktyczne odpady
  'sku2': 1,
  // ...
});
```

**TODO:** Stwórz UI do wprowadzania actual sales & waste (np. modal na końcu dnia).

---

**Powodzenia!** 🎉
