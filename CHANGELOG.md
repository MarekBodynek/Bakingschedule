# 📝 Changelog - Bakery Planning System

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [3.1.0] - 2025-11-19

### 🎉 New Features

#### 🔑 Automatyczne TOP 5 Key Products
- Automatyczne wykrywanie TOP 5 produktów na podstawie sprzedaży
- Usunięto ręczne oznaczanie w pliku konfiguracyjnym (kolumna E)
- Dynamiczne przeliczanie przy każdym wczytaniu danych

#### 📦 Ulepszone pakowanie MIXED
- Obsługa wielu produktów na jednej tacy (ten sam program pieczenia)
- Fazy priorytetów: Opening → First Hour → Key Products → Regular
- Sekwencyjna numeracja tac po sortowaniu

#### ❓ System pomocy
- Klawisz H pokazuje/ukrywa instrukcję obsługi
- Przycisk "Pomoč" w nagłówku
- Instrukcje drukowania fal na stronie głównej

#### 💰 Poprawki dni specjalnych
- Naprawiona logika dni wypłat emerytur (ostatni dzień roboczy miesiąca)
- Poprawki stref czasowych w obliczeniach dat
- Naprawione wykrywanie dni przed świętami

#### 📊 Historyczne w jednostkach wypieku
- Kolumna "Zgo" pokazuje sprzedaż w jednostkach wypieku dla produktów pakowanych
- Dla 5x PAK: sprzedaż × 5 = jednostki do wypieku
- Dynamiczne przeliczanie przy zmianie konfiguracji produktu

### 🔄 Changed
- Przesunięte indeksy kolumn po usunięciu kolumny KEY (E)
- Usunięto katalog `Bake Of Plan Windows` (nieużywany)
- Skonsolidowano dokumentację do README.md i CHANGELOG.md
- Przeniesiono dokumenty do katalogu root

### 🐛 Bug Fixes
- Naprawione problemy ze strefami czasowymi w porównaniach dat
- Naprawiona numeracja tac (sekwencyjna po sortowaniu)
- Naprawione wykrywanie produktów pakowanych

---

## [3.0.0] - 2025-01-05

### 🎉 Major Features Added

#### ⚙️ Oven Configuration System
- **New Component:** `OvenConfigurationModal.jsx` (~460 lines)
- Excel file upload with drag-and-drop support
- Automatic detection of:
  - Individual oven capacities (e.g., "3 tray oven, 3 tray oven and 6 trays oven")
  - Baking program durations (e.g., "Program 1 – 25 minut")
  - Product configurations (EAN, name, program, units per tray)
- Individual oven management:
  - Add new ovens with "Dodaj pečico" button
  - Remove individual ovens
  - Edit capacity for each oven separately
  - Real-time total capacity calculation
- Product preview (first 10 items)
- Real-time validation and error handling
- Slovenian language UI
- localStorage persistence for all configurations

#### 📦 Enhanced Tray Optimization
- **Complete Rewrite:** `TrayOptimizationView.jsx` (313 lines)
- Priority-based product ordering algorithm:
  ```
  priority = (isKeyProduct ? 10000 : 0) + (quantity × 100) + (historicalSales × 10)
  ```
- Individual tray display with unique IDs
- Shows specific products and quantities on each tray
- Batches organized by oven capacity constraints
- Sequential round numbering (Runda 1, Runda 2, ...)
- Time estimation for each batch and total
- Individual oven information display
- Worker-friendly instructions: "Naložite X pladnjev v pečico"
- Key product badges (★ KLJUČNO)

#### 💾 Extended LocalStorage
- **New Functions in `localStorage.js`:**
  - `saveOvenConfiguration(config)` - Save product-program mappings
  - `getOvenConfiguration()` - Retrieve oven config
  - `saveProgramConfiguration(config)` - Save program & oven settings
  - `getProgramConfiguration()` - Retrieve program config
  - `getOvenSettings()` - Get just oven settings
  - `clearOvenConfiguration()` - Reset oven config
- Storage keys:
  - `bakery_oven_config` - Product configurations
  - `bakery_program_config` - Program durations and oven settings

### Changed

#### TrayOptimizationView.jsx
- **Before:** Grouped products by program, showed aggregate statistics
- **After:** Individual numbered trays with specific products, priority-ordered
- **Benefit:** Workers see exactly which trays to bake in what order

#### BakeryPlanningSystem.jsx
- Added "⚙️ Konfiguracija pečice" button in header
- Integrated `OvenConfigurationModal` component
- New state: `showOvenConfig`
- Individual oven display in tray optimization view

### Technical Details

#### Excel Parsing Enhancements
- Regex patterns for oven detection: `/(\d+)\s*tray/g`
- Regex patterns for program duration: `/program\s*(\d+)\s*[–-]\s*(\d+)\s*minut/i`
- Starts parsing products from row 4 (skips headers)
- Stops at info rows (containing "oven" or "program")
- Validates all required fields before adding products

#### Component Integration
```javascript
import OvenConfigurationModal from './components/OvenConfigurationModal';
import { getOvenConfiguration, getProgramConfiguration, getOvenSettings } from './utils/localStorage';

// Usage
<OvenConfigurationModal
  isOpen={showOvenConfig}
  onClose={() => setShowOvenConfig(false)}
  onSave={(config) => { /* handle save */ }}
/>
```

### Documentation

- Updated README.md to v3.0 (English)
- Created INTEGRATION_GUIDE v3.0 (12 steps, comprehensive)
- All documentation in English
- Added FAQ section covering oven configuration
- Updated examples and code snippets

---

## [2.0.0] - 2024-11

### Added

#### 🚨 Stockout Detection System
- New file: `src/utils/stockoutDetection.js`
- Functions:
  - `getTopFastMovingProducts()` - Identifies top 5 SKUs
  - `detectStockoutForDate()` - Detects stockouts for specific date
  - `detectAllStockouts()` - Comprehensive stockout detection
  - `estimateUnmetDemand()` - Calculates lost sales
- Algorithm detects stockouts by analyzing sales patterns:
  - Zero sales after normal sales
  - Sales drops >70% compared to average

#### 💾 LocalStorage Persistence
- New file: `src/utils/localStorage.js` (~580 lines)
- Storage for:
  - Baking plans (`bakery_plans`)
  - Manager corrections (`bakery_manager_corrections`)
  - ML weights (`bakery_ml_weights`)
  - Performance metrics (`bakery_metrics`)
  - Stockout events (`bakery_stockouts`)
  - Actual sales/waste data
- Functions:
  - `savePlan()`, `getPlan()`
  - `saveManagerCorrection()`, `getAllManagerCorrections()`
  - `saveMLWeights()`, `getMLWeights()`
  - `exportAllData()`, `importAllData()`
  - Backup/restore capabilities

#### 🤖 Simple ML System
- New file: `src/utils/simpleMachineLearning.js`
- Gradient descent optimization
- Multi-objective loss function:
  ```
  loss = forecast_error × 0.5 + waste × 2.0 + stockouts × 1.0
  ```
- Functions:
  - `optimizeWeightsForProduct()` - Per-product optimization
  - `learnFromManagerCorrections()` - Incorporates manual adjustments
  - `learnFromStockouts()` - Adjusts for detected shortages
  - `runWeeklyOptimization()` - Batch optimization
- Learning rate: 0.01
- Weight normalization to sum = 1.0

#### ✏️ Manager Correction Modal
- New component: `src/components/ManagerCorrectionModal.jsx`
- 9 predefined correction reasons:
  - Weather conditions
  - Local events
  - Holidays
  - Stock issues
  - Quality problems
  - Seasonal trends
  - Marketing campaigns
  - Competitor activity
  - Other
- Custom reason input
- Context capture (day of week, holidays, etc.)
- Immediate learning from corrections

#### 📦 Tray Optimization View (v2.0)
- New component: `src/components/TrayOptimizationView.jsx`
- Groups products by baking program
- Sorts by priority (key products first)
- Estimates production time
- Shows oven capacity utilization
- Color-coded by wave (green, blue, orange)

#### 📊 Metrics Dashboard
- New component: `src/components/MetricsDashboard.jsx`
- Displays:
  - Forecast accuracy (target: >90%)
  - Waste percentage (target: <5%)
  - Stockout count (target: <2/week)
  - Weekly trends
  - Daily performance table
- Recommendations based on performance
- Visual indicators (green/yellow/red)

### Changed
- Updated forecast algorithm to use learned weights
- Added stockout adjustment (+15-25%) to forecasts
- Improved holiday detection
- Enhanced buffer calculation based on history

---

## [1.0.0] - 2024-10

### Initial Release

#### Core Features
- 3-wave daily baking schedule
- Historical data analysis
- Multi-source weighted forecasting
- Dynamic buffer calculation
- Holiday detection
- Wave-specific strategies:
  - Wave 1: Aggressive with buffer
  - Wave 2: Adaptive based on Wave 1 performance
  - Wave 3: Conservative, minimize waste
- Product categorization (key vs. regular)
- Slovenian language UI

#### Data Sources
- Same weekday 4 weeks ago (35% weight)
- Same weekday 8 weeks ago (25% weight)
- Last week average (20% weight)
- Same day of month (10% weight)
- Year-over-year (10% weight)

#### Files
- Main component: `BakeryPlanningSystem.jsx`
- Algorithm documentation: `Baking algorithm.md`
- Excel data upload support
- CSV export functionality

---

## Version Comparison

| Feature | v1.0 | v2.0 | v3.0 |
|---------|------|------|------|
| 3-Wave Planning | ✅ | ✅ | ✅ |
| Historical Analysis | ✅ | ✅ | ✅ |
| Stockout Detection | ❌ | ✅ | ✅ |
| ML Optimization | ❌ | ✅ | ✅ |
| LocalStorage | ❌ | ✅ | ✅ |
| Manager Corrections | ❌ | ✅ | ✅ |
| Tray Optimization | ❌ | Basic | **Enhanced** |
| Metrics Dashboard | ❌ | ✅ | ✅ |
| Oven Configuration | ❌ | ❌ | **✅ NEW** |
| Excel Upload Config | ❌ | ❌ | **✅ NEW** |
| Individual Ovens | ❌ | ❌ | **✅ NEW** |
| Priority-Based Trays | ❌ | ❌ | **✅ NEW** |
| Program Management | ❌ | ❌ | **✅ NEW** |

---

## Migration Guides

### v2.0 → v3.0

**Breaking Changes:** None - fully backward compatible

**New Requirements:**
- Add `OvenConfigurationModal.jsx` to your components
- Import new localStorage functions
- Add oven configuration button to header

**Data Migration:**
- Existing plans and configurations remain intact
- New oven configuration is optional
- System works with or without oven configuration

**Steps:**
1. Add new component files
2. Update imports in main component
3. Add oven config button and modal
4. (Optional) Upload Excel with oven configuration
5. Enjoy enhanced tray optimization!

### v1.0 → v2.0

**Breaking Changes:**
- Changed forecast weight structure (manual migration needed)
- New localStorage keys introduced

**Steps:**
1. Export your existing plans (if any)
2. Add all new utility files
3. Add new component files
4. Update main component with new features
5. Test with existing data
6. Run weekly optimization to update weights

---

## Roadmap

### v3.1 (Planned)
- [ ] Actual sales/waste input UI
- [ ] Real-time wave adaptation
- [ ] Advanced metrics charts
- [ ] Export to PDF

### v4.0 (Future)
- [ ] Backend API (Python FastAPI)
- [ ] PostgreSQL database
- [ ] Multi-store support
- [ ] Mobile app
- [ ] Weather integration
- [ ] Automated email reports

---

## Credits

**Development:** Claude Code + User
**Location:** Šentjur, Slovenia
**Industry:** Retail Bakery
**Purpose:** Production Planning Optimization

---

**Note:** This changelog follows semantic versioning (MAJOR.MINOR.PATCH)
- MAJOR: Incompatible API changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes (backward compatible)
