# 🔌 INTEGRATION GUIDE v3.0 - Complete Feature Integration

This document shows **step by step** how to integrate all v3.0 features into your bakery planning system.

---

## 📋 **Overview of New Features in v3.0**

1. **Oven Configuration Modal** - Configure ovens, programs, and product settings via Excel upload
2. **Enhanced Tray Optimization** - Priority-based tray allocation with individual tray display
3. **Oven & Program Persistence** - LocalStorage for oven configurations
4. **Individual Oven Management** - Add/remove/edit individual ovens

---

## 📋 **STEP 1: Add Required Imports**

```javascript
import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle, RefreshCw, Upload, Edit3, Package, TrendingUp, Settings, ChefHat } from 'lucide-react';
import _ from 'lodash';
import * as XLSX from 'xlsx';

// Utility imports
import {
  getTopFastMovingProducts,
  detectAllStockouts,
  estimateUnmetDemand
} from './utils/stockoutDetection';

import {
  savePlan, getPlan,
  saveOvenConfiguration, getOvenConfiguration,
  saveProgramConfiguration, getProgramConfiguration,
  getOvenSettings,
  saveManagerCorrection, getAllManagerCorrections,
  getMLWeights,
  saveActualSales, saveActualWaste,
  exportAllData, importAllData
} from './utils/localStorage';

import {
  optimizeWeightsForProduct,
  learnFromManagerCorrections,
  learnFromStockouts,
  runWeeklyOptimization
} from './utils/simpleMachineLearning';

// Component imports
import OvenConfigurationModal from './components/OvenConfigurationModal';
import ManagerCorrectionModal from './components/ManagerCorrectionModal';
import TrayOptimizationView from './components/TrayOptimizationView';
import MetricsDashboard from './components/MetricsDashboard';
```

---

## 📋 **STEP 2: Add State Variables**

```javascript
const BakeryPlanningSystem = () => {
  // Existing states...
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // ✨ NEW STATES FOR v3.0
  const [showOvenConfig, setShowOvenConfig] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState(null);
  const [fastMovingSkus, setFastMovingSkus] = useState([]);
  const [detectedStockouts, setDetectedStockouts] = useState([]);
  const [activeTab, setActiveTab] = useState('plan'); // 'plan', 'trays', 'metrics'

  // ... rest of your code
}
```

---

## 📋 **STEP 3: Add Oven Configuration Button to Header**

Add this button in your main header, next to other action buttons:

```jsx
<div className="flex items-center gap-2">
  {/* Your existing buttons */}

  {/* ✨ NEW: Oven Configuration Button */}
  <button
    onClick={() => setShowOvenConfig(true)}
    className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded font-medium flex items-center gap-1"
    title="Oven and program configuration"
  >
    <Settings className="w-4 h-4" />
    ⚙️ Konfiguracija pečice
  </button>
</div>
```

---

## 📋 **STEP 4: Add Oven Configuration Modal Component**

At the end of your component's return statement, add the modal:

```jsx
{/* ✨ NEW: Oven Configuration Modal */}
{showOvenConfig && (
  <OvenConfigurationModal
    isOpen={showOvenConfig}
    onClose={() => setShowOvenConfig(false)}
    onSave={(config) => {
      console.log('⚙️ Oven configuration saved:', config);
      setShowOvenConfig(false);
      // Optionally refresh or update your product list
    }}
  />
)}
```

---

## 📋 **STEP 5: Update TrayOptimizationView Integration**

The TrayOptimizationView now uses oven configuration from localStorage automatically:

```jsx
{/* ✨ ENHANCED: Tray Optimization with Priority-Based Sorting */}
<TrayOptimizationView
  products={products}
  wavePlan={plans[waveNumber]}
  waveNumber={waveNumber}
/>
```

The component now:
- Reads oven configuration from localStorage
- Shows individual numbered trays
- Orders products by priority (key products + sales volume)
- Groups trays into batches respecting oven capacity
- Displays individual oven information if available

---

## 📋 **STEP 6: Initialize Stockout Detection on Data Load**

After loading your sales data, initialize stockout detection:

```javascript
const parseAllData = async (hourlyFile, dailyFile, wasteFile) => {
  // ... your existing data parsing ...

  setProducts(uniqueProducts);
  setDataLoaded(true);

  // ✨ NEW: Detect stockouts and fast-moving products
  const top5 = getTopFastMovingProducts(sales2025Local, uniqueProducts, 28);
  setFastMovingSkus(top5);

  const stockouts = detectAllStockouts(sales2025Local, uniqueProducts, 28);
  setDetectedStockouts(stockouts);

  console.log(`🔥 TOP 5 products:`, top5);
  console.log(`🚨 Detected ${stockouts.length} stockouts in last 28 days`);
};
```

---

## 📋 **STEP 7: Use Oven Configuration in Plan Generation**

Modify your plan generation to use oven configuration:

```javascript
const generatePlan = async (wave) => {
  // Your existing plan generation logic...

  // ✨ NEW: Use configured oven settings
  const ovenConfig = getOvenConfiguration();
  const programConfig = getProgramConfiguration();
  const ovenSettings = getOvenSettings();

  console.log('📦 Using oven configuration:', {
    ovens: ovenSettings.ovenCount,
    capacity: ovenSettings.ovenCapacity,
    products: ovenConfig.length
  });

  // For each product, check if there's configuration
  products.forEach(product => {
    const productConfig = ovenConfig.find(c => c.sku === product.sku);
    if (productConfig) {
      product.bakingProgram = productConfig.program;
      product.unitsPerTray = productConfig.unitsPerTray;
    }
  });

  // ... continue with your plan generation ...
};
```

---

## 📋 **STEP 8: Add Tab Navigation (Optional)**

If you want to show different views (Plan / Trays / Metrics), add tabs:

```jsx
{plans[1] && plans[2] && plans[3] && (
  <>
    {/* ✨ NEW: Tab Navigation */}
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
          📋 Plan Produkcije
        </button>
        <button
          onClick={() => setActiveTab('trays')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
            activeTab === 'trays'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📦 Optimizacija Pladnjev
        </button>
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
            activeTab === 'metrics'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📊 Metrike
        </button>
      </div>
    </div>

    {/* Conditional rendering based on active tab */}
    {activeTab === 'plan' && (
      <div id="print-area" className="bg-white rounded-lg shadow-lg p-6">
        {/* Your existing plan table */}
      </div>
    )}

    {activeTab === 'trays' && (
      <div className="space-y-4">
        <TrayOptimizationView products={products} wavePlan={plans[1]} waveNumber={1} />
        <TrayOptimizationView products={products} wavePlan={plans[2]} waveNumber={2} />
        <TrayOptimizationView products={products} wavePlan={plans[3]} waveNumber={3} />
      </div>
    )}

    {activeTab === 'metrics' && (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <MetricsDashboard products={products} selectedDate={selectedDate} />
      </div>
    )}
  </>
)}
```

---

## 📋 **STEP 9: Using the Oven Configuration Feature**

### For Store Managers:

1. **Click the "⚙️ Konfiguracija pečice" button**
2. **Upload Excel file** with:
   - Column 1: EAN code
   - Column 2: Product name
   - Column 3: Baking program (1, 2, 3, etc.)
   - Column 4: Units per tray

Example Excel content:
```
EAN Code        | Product Name      | Program | Units/Tray
3831002150359   | Kaiser Roll       | 1       | 8
3831002150205   | Wheat Bread       | 2       | 6
...
In the store there are 3 ovens: 3 tray oven, 3 tray oven and 6 trays oven
Program 1 – 25 minut
Program 2 – 23 minut
```

3. **System automatically detects:**
   - Individual oven capacities
   - Program durations
   - Product configurations

4. **Review and edit:**
   - Individual oven capacities (can add/remove ovens)
   - Program times
   - Product preview

5. **Click "Shrani konfiguraciju"** to save

### Accessing Configuration in Code:

```javascript
// Get all oven-configured products
const ovenConfig = getOvenConfiguration();
// Returns: [{ sku, name, program, unitsPerTray }, ...]

// Get program and oven settings
const programConfig = getProgramConfiguration();
// Returns: {
//   1: { name: 'Program 1', durationMinutes: 25 },
//   2: { name: 'Program 2', durationMinutes: 23 },
//   ovenSettings: {
//     ovenCount: 3,
//     ovenCapacity: 12,
//     individualCapacities: [3, 3, 6]
//   }
// }

// Get just oven settings
const ovenSettings = getOvenSettings();
// Returns: { ovenCount: 3, ovenCapacity: 12, individualCapacities: [3, 3, 6] }
```

---

## 📋 **STEP 10: Tray Optimization Changes**

The updated TrayOptimizationView now shows:

### Before (v2.0):
- Grouped products by program
- Showed aggregate statistics
- Generic "bake X units" instructions

### After (v3.0):
- Individual numbered trays (Pladenj #1, #2, #3...)
- Specific product name and quantity on each tray
- Priority-based ordering (most popular first)
- Batches grouped by oven capacity
- Clear instruction: "Naložite X pladnjev v pečico"
- Shows individual oven information if configured

### Priority Calculation:
```javascript
priority = (isKeyProduct ? 10000 : 0) +  // Key products highest
           (quantity × 100) +             // More units = higher priority
           (historicalSales × 10);        // Historical factor
```

---

## 📋 **STEP 11: Testing the Integration**

### Test 1: Oven Configuration
```javascript
// After uploading Excel file
console.log('Oven config:', getOvenConfiguration());
console.log('Program config:', getProgramConfiguration());
console.log('Oven settings:', getOvenSettings());
```

### Test 2: Tray Optimization
1. Generate a plan
2. View tray optimization tab
3. Verify:
   - Individual trays are numbered
   - Most popular products appear first
   - Batches respect oven capacity
   - Oven information is displayed

### Test 3: Priority Ordering
1. Check that key products appear in early batches
2. Verify high-quantity products are prioritized
3. Ensure batch sizes match oven capacity

---

## 📋 **STEP 12: LocalStorage Data Structure**

The system now stores:

```javascript
{
  // Existing data
  'bakery_plans': { ... },
  'bakery_manager_corrections': [ ... ],
  'bakery_ml_weights': { ... },

  // ✨ NEW in v3.0
  'bakery_oven_config': {
    products: [
      { sku: '3831002150359', name: 'Kaiser Roll', program: 1, unitsPerTray: 8 },
      ...
    ],
    updatedAt: '2025-01-05T10:30:00.000Z'
  },

  'bakery_program_config': {
    1: { name: 'Program 1', durationMinutes: 25 },
    2: { name: 'Program 2', durationMinutes: 23 },
    ovenSettings: {
      ovenCount: 3,
      ovenCapacity: 12,
      individualCapacities: [3, 3, 6]
    },
    updatedAt: '2025-01-05T10:30:00.000Z'
  }
}
```

---

## ✅ **Integration Complete!**

After completing all steps, your system will have:

1. ✅ **Oven Configuration System** - Excel upload and automatic detection
2. ✅ **Individual Oven Management** - Add/remove/edit ovens
3. ✅ **Priority-Based Tray Optimization** - Worker-friendly baking instructions
4. ✅ **Program Duration Management** - Per-program baking times
5. ✅ **LocalStorage Persistence** - All configurations saved
6. ✅ **Enhanced Tray Display** - Individual trays with specific products

---

## 🔧 **Troubleshooting**

### Issue: "Oven configuration not detected from Excel"
**Solution:** Ensure your Excel has text like "3 tray oven, 3 tray oven and 6 trays oven" in column A. The regex pattern looks for "\d+ tray".

### Issue: "Program durations not auto-filling"
**Solution:** Excel must have text like "Program 1 – 25 minut" (note the en-dash or hyphen). Check console for detection logs.

### Issue: "Tray optimization not showing individual trays"
**Solution:** Ensure you've uploaded oven configuration first. The system needs `unitsPerTray` for each product.

### Issue: "Individual ovens not displaying"
**Solution:** Configuration must be saved with `individualCapacities` array in `ovenSettings`.

---

## 📞 **Support**

For issues or questions:
- Check browser console for error messages
- Verify localStorage data: `localStorage.getItem('bakery_oven_config')`
- Review this integration guide
- Check component source code for additional details

---

**Version:** 3.0
**Last Updated:** January 2025
**Status:** ✅ Production Ready
