# 🥐 Bakery Planning System v3.0

**Intelligent bakery production planning system** with machine learning, stockout detection, oven configuration, and tray optimization.

---

## 🆕 **NEW FEATURES in v3.0**

### ✅ **What's New:**

1. **⚙️ Oven Configuration System** - Complete oven and program management
   - Excel file upload with automatic detection
   - Per-product configuration (EAN, name, program, units per tray)
   - Individual oven capacity settings (add/remove ovens)
   - Baking program durations (automatic detection from Excel)
   - Real-time validation and preview
   - Component: `src/components/OvenConfigurationModal.jsx`

2. **📦 Smart Tray Optimization** - Worker-friendly baking instructions
   - Shows individual trays with specific products and quantities
   - Priority-based ordering (most popular products first)
   - Grouped into batches respecting oven capacity
   - Clear instructions: "Load X trays into oven"
   - Sequential round numbering with timing
   - Component: `src/components/TrayOptimizationView.jsx`

3. **🚨 Stockout Detection** - Automatic product shortage detection
   - Identifies TOP 5 fast-moving products
   - Detects shortages based on hourly sales gaps
   - Estimates unmet demand
   - File: `src/utils/stockoutDetection.js`

4. **💾 LocalStorage Persistence** - Browser-based data storage
   - Baking plan storage
   - Manager correction history
   - ML weights (learned)
   - Performance metrics
   - Stockout events
   - Actual sales and waste data
   - Oven and program configuration
   - Backup/restore functions
   - File: `src/utils/localStorage.js`

5. **🤖 Simple ML System** - Machine learning without backend
   - Loss function (penalizes waste > stockouts)
   - Weight optimization (gradient descent)
   - Learning from manager corrections
   - Learning from detected stockouts
   - Weekly optimization
   - File: `src/utils/simpleMachineLearning.js`

6. **✏️ Manager Corrections UI** - Plan editing interface
   - Modal for quantity adjustments
   - 9 predefined correction reasons
   - Custom descriptions
   - Context storage (day of week, holidays, etc.)
   - Component: `src/components/ManagerCorrectionModal.jsx`

7. **📊 Metrics Dashboard** - Performance analytics
   - Forecast Accuracy
   - Waste %
   - Stockout count
   - Weekly trends
   - Daily history table
   - Recommendations
   - Component: `src/components/MetricsDashboard.jsx`

---

## 📁 **Project Structure**

```
Bakingschedule/
├── src/
│   ├── components/
│   │   ├── OvenConfigurationModal.jsx  # Oven & program configuration
│   │   ├── ManagerCorrectionModal.jsx  # Plan adjustment modal
│   │   ├── TrayOptimizationView.jsx    # Tray allocation view
│   │   └── MetricsDashboard.jsx        # Performance dashboard
│   │
│   ├── utils/
│   │   ├── stockoutDetection.js        # Stockout detection algorithms
│   │   ├── localStorage.js             # Data persistence layer
│   │   └── simpleMachineLearning.js    # ML optimization system
│   │
│   ├── BakeryPlanningSystem.jsx        # Main application component
│   ├── main.jsx                        # Application entry point
│   └── index.css                       # Global styles
│
├── package.json                        # Dependencies
├── vite.config.js                      # Vite configuration
└── tailwind.config.js                  # Tailwind CSS config

Root/
├── README.md                           # This documentation
└── CHANGELOG.md                        # Version history
```

---

## 🚀 **Installation and Setup**

### 1. Install dependencies:

```bash
npm install
```

### 2. Start development server:

```bash
npm run dev
```

### 3. Open in browser:

```
http://localhost:5173
```

### 4. Build for production:

```bash
npm run build
```

---

## 📖 **How to Use Key Features**

### **⚙️ Oven Configuration**

1. Click the "⚙️ Konfiguracija pečice" button in the header
2. Upload your Excel file with product data:
   - Column 1: EAN code
   - Column 2: Product name
   - Column 3: Baking program number
   - Column 4: Units per tray
3. The system automatically detects:
   - Individual oven capacities (e.g., "3 tray oven, 3 tray oven and 6 trays oven")
   - Program durations (e.g., "Program 1 – 25 minut")
4. Review and edit:
   - Individual oven capacities
   - Program durations
   - Add/remove ovens
5. Save configuration

**Example Excel format:**
```
EAN Code        | Product Name    | Program | Units/Tray
3831002150359   | Kaiser Roll     | 1       | 8
3831002150205   | Wheat Bread     | 2       | 6
...
In the store there are 3 ovens: 3 tray oven, 3 tray oven and 6 trays oven
Program 1 – 25 minut
Program 2 – 23 minut
```

### **📦 Tray Optimization**

After generating a plan:
1. The system creates individual trays with specific products
2. Products are ordered by priority:
   - Key products (★ KLJUČNO) - highest priority
   - Quantity needed × 100
   - Historical sales × 10
3. Trays are grouped into batches respecting oven capacity
4. Each batch shows:
   - Round number and program
   - Individual numbered trays
   - Product names and quantities
   - Total baking time

**Example Output:**
```
Runda 1 - Program 1 (25 min)
  Pladenj #1: Kaiser Roll (8 kosov)
  Pladenj #2: Kaiser Roll (8 kosov)
  Pladenj #3: Wheat Bread (6 kosov)
  ...
  Naložite 12 pladnjev v pečico
```

### **🚨 Stockout Detection**

```javascript
import { getTopFastMovingProducts, detectStockoutForDate, detectAllStockouts } from './utils/stockoutDetection';

// Get TOP 5 fast-moving products
const top5 = getTopFastMovingProducts(salesData2025, products, 28);

// Detect stockouts for all products in last 28 days
const stockouts = detectAllStockouts(salesData2025, products, 28);

console.log('Detected stockouts:', stockouts);
// [{
//   sku: '3831002150359',
//   productName: 'Kaiser Roll',
//   date: '2025-01-15',
//   hour: 14,
//   confidence: 0.9,
//   reason: 'No sales at 14:00 after 12 units at 13:00'
// }]
```

### **💾 LocalStorage Persistence**

```javascript
import {
  savePlan, getPlan,
  saveOvenConfiguration, getOvenConfiguration,
  saveProgramConfiguration, getProgramConfiguration,
  saveManagerCorrection, exportAllData
} from './utils/localStorage';

// Save baking plan
savePlan('2025-01-20', {
  1: { 'sku1': { quantity: 50, ... }, ... },
  2: { ... },
  3: { ... }
});

// Retrieve plan
const plan = getPlan('2025-01-20');

// Save oven configuration
saveOvenConfiguration([
  { sku: '3831002150359', name: 'Kaiser Roll', program: 1, unitsPerTray: 8 },
  { sku: '3831002150205', name: 'Wheat Bread', program: 2, unitsPerTray: 6 }
]);

// Save program and oven settings
saveProgramConfiguration({
  1: { name: 'Program 1', durationMinutes: 25 },
  2: { name: 'Program 2', durationMinutes: 23 },
  ovenSettings: {
    ovenCount: 3,
    ovenCapacity: 12,
    individualCapacities: [3, 3, 6]
  }
});

// Save manager correction
saveManagerCorrection({
  date: '2025-01-20',
  wave: 1,
  sku: 'sku1',
  originalQty: 50,
  adjustedQty: 60,
  reason: 'Expected high traffic - market in town',
  reasonType: 'event',
  context: { ... }
});

// Backup all data
const backup = exportAllData();
console.log('Backup:', backup);
```

### **🤖 Simple ML System**

```javascript
import { optimizeWeightsForProduct, learnFromManagerCorrections, runWeeklyOptimization } from './utils/simpleMachineLearning';

// Optimize weights for product
const historicalData = [
  { forecast: 50, actual: 48, waste: 2, hasStockout: false },
  { forecast: 55, actual: 60, waste: 0, hasStockout: true },
  // ... more days
];

const newWeights = optimizeWeightsForProduct('sku1', historicalData);

// Learn from manager corrections
learnFromManagerCorrections('sku1');

// Run weekly optimization for all products
const results = runWeeklyOptimization(products, historicalDataByProduct);
console.log('Optimized:', results.optimized, 'Improved:', results.improved);
```

### **✏️ Manager Corrections Modal**

```jsx
import ManagerCorrectionModal from './components/ManagerCorrectionModal';

const [showCorrectionModal, setShowCorrectionModal] = useState(false);
const [selectedProduct, setSelectedProduct] = useState(null);

// In render:
<ManagerCorrectionModal
  isOpen={showCorrectionModal}
  onClose={() => setShowCorrectionModal(false)}
  product={selectedProduct}
  wave={1}
  date="2025-01-20"
  originalQuantity={50}
  onSave={(newQuantity, correction) => {
    console.log('Saved:', newQuantity, correction);
    // Update plan
  }}
/>
```

### **📦 Tray Optimization Component**

```jsx
import TrayOptimizationView from './components/TrayOptimizationView';

<TrayOptimizationView
  products={products}
  wavePlan={plans[1]}  // Plan for Wave 1
  waveNumber={1}
/>
```

### **📊 Metrics Dashboard Component**

```jsx
import MetricsDashboard from './components/MetricsDashboard';

<MetricsDashboard
  products={products}
  selectedDate="2025-01-20"
/>
```

---

## 🔄 **Daily Workflow**

### **Typical daily workflow:**

1. **Morning (6:30 AM):**
   - Generate plan for all 3 waves
   - System automatically detects holidays/pension days
   - Review plan in Tray Optimization view
   - Check individual oven assignments

2. **Manager can adjust:**
   - Click "Edytuj" button next to product
   - Change quantity
   - Select reason (e.g., "Market in town")
   - System saves correction and uses it for learning

3. **End of day:**
   - Input actual sales and waste (TODO: UI to be added)
   - System automatically calculates metrics
   - Dashboard shows accuracy and waste %
   - ML system learns from data

4. **Weekly:**
   - Run `runWeeklyOptimization()`
   - System updates weights for all products
   - Forecasts become increasingly accurate

5. **As needed:**
   - Update oven configuration if equipment changes
   - Upload new product configurations
   - Add/remove individual ovens
   - Adjust program durations

---

## 📊 **Success Metrics**

| Metric | Target | Description |
|---------|--------|------|
| **Forecast Accuracy** | >90% | Prediction accuracy |
| **Waste %** | <5% | Waste percentage (for non-key products) |
| **Stockouts** | <2/week | Product shortages |
| **ML Improvement** | +2% weekly | Weekly accuracy improvement |

---

## 🛠️ **Configuration**

### Default ML Weights:

```javascript
{
  same_weekday_4w: 0.35,   // Same weekday 4 weeks ago
  same_weekday_8w: 0.25,   // Same weekday 8 weeks ago
  last_week_avg: 0.20,     // Last week average
  same_day_month: 0.10,    // Same day of month 3-4 months ago
  year_over_year: 0.10     // Year over year
}
```

### Buffers:

- **Wave 1:** Full buffer (15-35% depending on CV)
- **Wave 2:** 70% of Wave 1 buffer
- **Wave 3:** -80% (negative buffer!) for waste minimization

### Key Products:

Automatycznie wykrywane TOP 5 produktów na podstawie sprzedaży:
```javascript
const top5 = getTopFastMovingProducts(sales2025Local, uniqueProducts, 28);
product.isKeyProduct = top5.includes(product.sku);
```

Minimum for Wave 3: **5 pieces**

### Oven Configuration:

Stored in localStorage via OvenConfigurationModal:
```javascript
{
  ovenSettings: {
    ovenCount: 3,                    // Number of ovens
    ovenCapacity: 12,                // Total tray capacity
    individualCapacities: [3, 3, 6]  // Per-oven capacities
  },
  programs: {
    1: { name: 'Program 1', durationMinutes: 25 },
    2: { name: 'Program 2', durationMinutes: 23 },
    3: { name: 'Program 3', durationMinutes: 15 }
  }
}
```

---

## 🔮 **Future Improvements**

### Potential additions:

1. **Backend + PostgreSQL**
   - Full migration to Python FastAPI
   - Real ML with TensorFlow/scikit-learn
   - Cron jobs for automation

2. **Real-time Adaptation**
   - Wave 2/3 use actual sales from previous waves
   - Logic "+20% deviation → increase cautiously"

3. **Advanced Analytics**
   - Seasonality curves
   - Weather integration
   - Event calendar

4. **Multi-store Support**
   - Central management for multiple bakeries
   - Knowledge transfer between stores

5. **Mobile App**
   - Mobile app for managers
   - Push notifications for alerts

6. **Desktop App**
   - Portable Windows .exe
   - Offline operation
   - USB transfer capability

---

## 📝 **License**

Proprietary - All rights reserved

---

## 👨‍💻 **Author**

System created for bakery in Šentjur, Slovenia.

**Version:** 3.1
**Date:** November 2025
**Status:** ✅ Production ready

---

## ❓ **FAQ**

### Q: Is data secure?
A: All data is stored locally in browser localStorage. Nothing is sent to external servers.

### Q: What happens if I clear localStorage?
A: You'll lose all saved plans, corrections, and ML weights. Use `exportAllData()` to regularly backup.

### Q: How often does the system learn?
A: The system learns:
- Immediately after each manager correction
- Daily after inputting actual sales/waste
- Recommended: weekly weight optimization (`runWeeklyOptimization()`)

### Q: Can I change which products are "key"?
A: Key products are now automatically detected as TOP 5 based on sales data. The system recalculates this each time you load data.

### Q: How do I access the help instructions?
A: Press **H** key on your keyboard to show/hide the help modal. You can also click the "Pomoč" button in the header.

### Q: How do I add more baking programs?
A: Upload a new Excel file with program configurations via the Oven Configuration modal, or manually edit program settings in localStorage.

### Q: Can I use different oven configurations for different stores?
A: Yes, each browser/store will have its own localStorage configuration. Use backup/restore to transfer settings.

### Q: What's the difference between v2.0 and v3.0?
A: v3.0 adds:
- Complete oven configuration system with Excel upload
- Individual oven capacity management
- Priority-based tray optimization showing specific trays to workers
- Automatic detection of oven settings and program durations

---

**🎉 Happy baking!**

---

## 🔄 **Git Workflow**

### Struktura branchy
- **`working`** - Branch rozwojowy/testowy (WORKING ENVIRONMENT)
- **`main`** - Branch produkcyjny (PRODUCTION)

### Praca rozwojowa (codzienne zmiany)
```bash
git checkout working
git pull origin working
# ... zmiany, testy, commit ...
git push origin working
```
➡️ **Automatyczny deploy na Vercel** (wersja testowa)

### Deploy do produkcji
```bash
git checkout main
git pull origin main
git merge working
git push origin main
```
➡️ **Automatyczny deploy na Vercel** (wersja produkcyjna)

### URL-e Vercel
- **Production**: https://bakingschedule.vercel.app (z `main`)
- **Preview**: https://bakingschedule-git-working.vercel.app (z `working`)

### Ważne zasady
1. **Nigdy nie commituj bezpośrednio do `main`** - zawsze pracuj na `working`
2. **Testuj wszystko na `working`** przed merge do `main`
3. **`main` zawsze musi być stabilny**

---

## 🚀 **Deployment**

### Szybkie wdrożenie
```bash
cd Bakingschedule
npm run build
git add .
git commit -m "Opis zmian"
git push origin working  # lub main dla produkcji
```

### Sprawdzanie statusu
1. Otwórz: https://vercel.com/dashboard
2. Znajdź projekt "bakingschedule"
3. Zobacz status wdrożenia (Building → Ready)

### Najczęstsze problemy
- **Vercel nie aktualizuje strony**: Sprawdź `git status`, odśwież z Cmd+Shift+R
- **Build fails**: Sprawdź logi na Vercel dashboard

---

## 📚 **Dokumentacja techniczna**

Historia wersji w **[CHANGELOG.md](CHANGELOG.md)**.

### Skróty klawiszowe:
- **H** - Pokaż/ukryj instrukcję obsługi

