# ⚡ PROPOZYCJE OPTYMALIZACJI KODU
**Projekt:** Bakingschedule v3.0
**Data:** 2025-01-18
**Status:** Gotowe do wdrożenia

---

## 📋 SPIS TREŚCI
1. [Krytyczne poprawki](#1-krytyczne-poprawki)
2. [Optymalizacje wydajności](#2-optymalizacje-wydajności)
3. [Refaktoryzacja kodu](#3-refaktoryzacja-kodu)
4. [Implementacje brakujących funkcji](#4-implementacje-brakujących-funkcji)

---

## 1. KRYTYCZNE POPRAWKI

### FIX 1.1: Użycie ML Weights w prognozowaniu

**Problem**: ML weights są pobierane ale nigdy nie używane.

**Lokalizacja**: `BakeryPlanningSystem.jsx:516-650`

**PRZED**:
```javascript
const calculateHistoricalAverage = (sku, targetDate, waveHours) => {
  const mlWeights = getMLWeights(sku); // ❌ Pobrane ale nieużywane!

  let weights = [];

  // Hardcoded weights - ignorują ML!
  if (recentSales.length > 0) {
    weights.push({
      value: avgPerTargetDay,
      weight: 0.35  // ❌ HARDCODED!
    });
  }

  if (yearAgoSales.length > 0) {
    weights.push({
      value: avgYearAgo,
      weight: 0.20  // ❌ HARDCODED!
    });
  }

  // ... etc
}
```

**PO (POPRAWIONE)**:
```javascript
const calculateHistoricalAverage = (sku, targetDate, waveHours) => {
  const mlWeights = getMLWeights(sku); // ✅ Będzie używane!

  let weights = [];
  const isHighSales = isHighSalesDay(targetDate);

  // 1. Dla dni specjalnych (święta, pokojniny)
  if (isHighSales) {
    // ... (zachowaj existing logic dla special days)
    // Ale dla pozostałych source'ów użyj ML weights poniżej
  }

  // 2. Same weekday 4 weeks ago (ML weight)
  if (productSales2025.length > 0) {
    const fourWeeksAgo = new Date(targetDate);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const recentSales = productSales2025.filter(s =>
      s.dayOfWeek === targetDayOfWeek &&
      s.date >= fourWeeksAgo &&
      waveHours.includes(s.hour) &&
      !isHighSalesDay(s.dateStr)
    );

    if (recentSales.length > 0) {
      const byDate = _.groupBy(recentSales, 'dateStr');
      const uniqueDates = Object.keys(byDate); // ✅ Rzeczywista liczba dni
      const totalQuantity = _.sumBy(Object.values(byDate), day => _.sumBy(day, 'quantity'));
      const avgPerTargetDay = totalQuantity / uniqueDates.length;

      weights.push({
        value: avgPerTargetDay,
        weight: isHighSales ? 0.30 : mlWeights.same_weekday_4w  // ✅ ML WEIGHT!
      });
    }
  }

  // 3. Same weekday 8 weeks ago (ML weight)
  if (productSales2025.length > 0) {
    const eightWeeksAgo = new Date(targetDate);
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    const fourWeeksAgo = new Date(targetDate);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const olderSales = productSales2025.filter(s =>
      s.dayOfWeek === targetDayOfWeek &&
      s.date >= eightWeeksAgo &&
      s.date < fourWeeksAgo &&
      waveHours.includes(s.hour) &&
      !isHighSalesDay(s.dateStr)
    );

    if (olderSales.length > 0) {
      const byDate = _.groupBy(olderSales, 'dateStr');
      const uniqueDates = Object.keys(byDate);
      const totalQuantity = _.sumBy(Object.values(byDate), day => _.sumBy(day, 'quantity'));
      const avgPerTargetDay = totalQuantity / uniqueDates.length;

      weights.push({
        value: avgPerTargetDay,
        weight: mlWeights.same_weekday_8w  // ✅ ML WEIGHT!
      });
    }
  }

  // 4. Last week average (ML weight)
  if (productSales2025.length > 0) {
    const sevenDaysAgo = new Date(targetDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const lastWeekSales = productSales2025.filter(s =>
      s.date >= sevenDaysAgo &&
      s.date < new Date(targetDate) &&
      waveHours.includes(s.hour) &&
      !isHighSalesDay(s.dateStr)
    );

    if (lastWeekSales.length > 0) {
      const byDate = _.groupBy(lastWeekSales, 'dateStr');
      const uniqueDates = Object.keys(byDate);
      const totalQuantity = _.sumBy(Object.values(byDate), day => _.sumBy(day, 'quantity'));
      const avgPerDay = totalQuantity / uniqueDates.length;

      weights.push({
        value: avgPerDay,
        weight: mlWeights.last_week_avg  // ✅ ML WEIGHT!
      });
    }
  }

  // 5. Same day of month (ML weight)
  if (productSales2025.length > 0) {
    const targetDayOfMonth = new Date(targetDate).getDate();
    const twoMonthsAgo = new Date(targetDate);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const sameDayMonthSales = productSales2025.filter(s =>
      s.date.getDate() === targetDayOfMonth &&
      s.date >= twoMonthsAgo &&
      s.date < new Date(targetDate) &&
      waveHours.includes(s.hour) &&
      !isHighSalesDay(s.dateStr)
    );

    if (sameDayMonthSales.length > 0) {
      const byDate = _.groupBy(sameDayMonthSales, 'dateStr');
      const uniqueDates = Object.keys(byDate);
      const totalQuantity = _.sumBy(Object.values(byDate), day => _.sumBy(day, 'quantity'));
      const avgPerOccurrence = totalQuantity / uniqueDates.length;

      weights.push({
        value: avgPerOccurrence,
        weight: mlWeights.same_day_month  // ✅ ML WEIGHT!
      });
    }
  }

  // 6. Year-over-year (ML weight)
  if (productSales2024.length > 0) {
    const lastYear = new Date(targetDate);
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    const weekBefore = new Date(lastYear);
    weekBefore.setDate(weekBefore.getDate() - 7);
    const weekAfter = new Date(lastYear);
    weekAfter.setDate(weekAfter.getDate() + 7);

    const yearAgoSales = productSales2024.filter(s =>
      s.date >= weekBefore &&
      s.date <= weekAfter &&
      s.dayOfWeek === targetDayOfWeek
    );

    if (yearAgoSales.length > 0) {
      const avgYearAgo = _.meanBy(yearAgoSales, 'quantity');
      const adjustedForWave = avgYearAgo * (waveHours.length / 13);

      weights.push({
        value: adjustedForWave,
        weight: mlWeights.year_over_year  // ✅ ML WEIGHT!
      });
    }
  }

  // Fallback - general average (jeśli brak innych danych)
  if (weights.length === 0 && productSales2025.length > 0) {
    const allHourSales = productSales2025.filter(s =>
      waveHours.includes(s.hour) &&
      !isHighSalesDay(s.dateStr)
    );

    if (allHourSales.length > 0) {
      const byDate = _.groupBy(allHourSales, 'dateStr');
      const uniqueDates = Object.keys(byDate);
      const totalQuantity = _.sumBy(Object.values(byDate), day => _.sumBy(day, 'quantity'));
      const avgPerDay = totalQuantity / uniqueDates.length;

      weights.push({
        value: avgPerDay,
        weight: 0.20  // Fallback weight
      });
    }
  }

  // IMPORTANT: Return 0 if no data
  if (weights.length === 0) return 0;

  // Calculate weighted average
  const totalWeight = _.sumBy(weights, 'weight');
  const weightedSum = _.sumBy(weights, w => w.value * w.weight);
  let baseResult = weightedSum / totalWeight;

  // ✅ Stockout adjustment (unchanged)
  const fourWeeksAgo = new Date(targetDate);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const recentStockouts = detectedStockouts.filter(s =>
    s.sku === sku &&
    new Date(s.date) >= fourWeeksAgo
  );

  if (recentStockouts.length > 0) {
    const stockoutAdjustment = 1 + (0.15 + 0.1 * Math.min(recentStockouts.length / 4, 1));
    baseResult *= stockoutAdjustment;
  }

  return baseResult;
};
```

**Zysk**:
- ✅ ML learning faktycznie działa
- ✅ Wagi dostosowują się tygodniowo
- ✅ System uczy się z korekt managera i stockouts
- ✅ Dokładniejsze prognozy (szacowane +5-10% accuracy)

---

### FIX 1.2: Poprawka logiki produktów pakowanych

**Problem**: Nieprawidłowe mnożenie ilości dla produktów pakowanych.

**Lokalizacja**: `BakeryPlanningSystem.jsx:827-831, 943-945`

**PRZED**:
```javascript
// Krok 7: Zastosuj mnożnik dla produktów pakowanych
const finalQty1 = product.isPackaged ? qty1 * product.packageQuantity : qty1;
const finalQty2 = product.isPackaged ? qty2 * product.packageQuantity : qty2;
const finalQty3 = product.isPackaged ? qty3 * product.packageQuantity : qty3;

// ❌ PROBLEM: qty1/qty2/qty3 to już PACZKI, nie sztuki!
// Przykład: 2 paczki * 5 sztuk/paczkę = 10 sztuk
// Ale nie chcemy 10 sztuk, chcemy 2 paczki (czyli 2 x pieczenie 5-pak)
```

**ANALIZA**:
Są 2 możliwe interpretacje:
1. **Interpretacja A**: Dane sprzedaży są w PACZKACH, więc forecast też w PACZKACH → nie mnóż
2. **Interpretacja B**: Dane sprzedaży są w SZTUKACH, forecast w SZTUKACH → konwertuj na PACZKI

Sprawdźmy dane:

```javascript
// Z parseAllData():
const packagingInfo = parsePackagingInfo(s.productName);

uniqueProducts.push({
  sku: s.eanCode,
  name: s.productName,
  isPackaged: packagingInfo.isPackaged,
  packageQuantity: packagingInfo.quantity,  // np. 5 dla "PAK 5x60"
});

// Sprzedaż z Excel: s.quantity (np. 15 sztuk)
// Czy to 15 sztuk czy 15 paczek?
```

**ROZWIĄZANIE**: Musimy **konwertować sprzedaż na paczki** podczas wczytywania.

**PO (POPRAWIONE)**:
```javascript
// KROK 1: Modyfikuj parseAllData() aby konwertować sprzedaż na paczki
const parseAllData = async (hourlyFile, dailyFile, wasteFile) => {
  // ... existing code ...

  if (hourlyFile && hourlyFile.fileName) {
    setLoadingStatus('Obdelava urne prodaje 2025...');
    const workbook = XLSX.read(hourlyFile.data, { cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    sales2025Local = rawData.slice(3).filter(row => row.length > 6 && row[4]).map(row => {
      const productName = (row[5] || '').trim();
      const rawQuantity = parseEuropeanNumber(row[6]);
      const packagingInfo = parsePackagingInfo(productName);

      // ✅ KONWERSJA: Jeśli pakowane, podziel przez packageQuantity
      // Sprzedaż w Excel: 15 sztuk → Konwertuj na: 3 paczki (15 / 5)
      const normalizedQuantity = packagingInfo.isPackaged
        ? rawQuantity / packagingInfo.quantity
        : rawQuantity;

      return {
        date: new Date(row[1]),
        dateStr: new Date(row[1]).toISOString().split('T')[0],
        dayOfWeek: new Date(row[1]).getDay(),
        hour: row[2],
        eanCode: row[4],
        productName: productName,
        quantity: normalizedQuantity,  // ✅ Teraz w PACZKACH dla pakowanych produktów
        rawQuantity: rawQuantity,      // Zachowaj original dla debug
        isPackaged: packagingInfo.isPackaged,
        packageQuantity: packagingInfo.quantity
      };
    });

    status.hourly = true;
  }

  // ... analogicznie dla dailyFile i wasteFile ...
};

// KROK 2: Usuń mnożenie z generatePlan() - teraz niepotrzebne!
products.forEach(product => {
  // ... calculations ...

  // ❌ USUŃ TO:
  // const finalQty1 = product.isPackaged ? qty1 * product.packageQuantity : qty1;

  // ✅ ZASTĄP:
  const finalQty1 = qty1;  // qty1 już w odpowiednich jednostkach
  const finalQty2 = qty2;
  const finalQty3 = qty3;

  // ... rest of code ...
});

// KROK 3: Dodaj helper do wyświetlania
const formatQuantityForDisplay = (quantity, product) => {
  if (product.isPackaged) {
    const totalUnits = quantity * product.packageQuantity;
    return `${quantity} pak (${totalUnits} szt)`;
  }
  return `${quantity} szt`;
};

// KROK 4: Użyj w tabeli
<td className="px-2 py-2 text-right">
  <span className="text-lg font-bold text-green-600">
    {plan1.quantity}
    {product.isPackaged && (
      <span className="text-xs text-gray-600 ml-1">
        pak (={plan1.quantity * product.packageQuantity} szt)
      </span>
    )}
  </span>
</td>
```

**Zysk**:
- ✅ Konsystentne jednostki w całym systemie
- ✅ Prawidłowe plany dla produktów pakowanych
- ✅ Jasne wyświetlanie (paczki + sztuki)

---

### FIX 1.3: Dzielenie przez rzeczywistą liczbę dni

**Problem**: Hardcoded dzielenie przez 4 dni zamiast liczenia rzeczywistych dni.

**Lokalizacja**: `BakeryPlanningSystem.jsx:588-590`

**PRZED**:
```javascript
// 🔥 POPRAWKA: Użyj rzeczywistej liczby dni w zakresie danych
const totalQuantity = _.sumBy(allHourSales, 'quantity');
const uniqueDates = [...new Set(allHourSales.map(s => s.dateStr))];

// Oblicz zakres dat
const allDates = allHourSales.map(s => s.date);
const minDate = new Date(Math.min(...allDates));
const maxDate = new Date(Math.max(...allDates));
const daysInRange = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;

// ❌ Dzieli przez dni w zakresie (nie tylko dni ze sprzedażą)
const avgPerDay = totalQuantity / Math.max(1, daysInRange);
```

**PO (POPRAWIONE)**:
```javascript
// ✅ POPRAWKA: Dziel przez rzeczywistą liczbę wystąpień dnia tygodnia
const totalQuantity = _.sumBy(allHourSales, 'quantity');

// Grupuj po dacie i licz unikalne dni
const byDate = _.groupBy(allHourSales, 'dateStr');
const uniqueDatesWithSales = Object.keys(byDate);

// Oblicz zakres dat (dla context)
const allDates = allHourSales.map(s => s.date);
const minDate = new Date(Math.min(...allDates));
const maxDate = new Date(Math.max(...allDates));
const totalDaysInRange = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;

// ✅ Dziel przez rzeczywistą liczbę dni ze sprzedażą
// To jest bardziej odporne na luki w danych
const avgPerDay = totalQuantity / Math.max(1, uniqueDatesWithSales.length);

console.log(`📊 Average calculation: ${totalQuantity} total / ${uniqueDatesWithSales.length} days with sales = ${avgPerDay.toFixed(2)}`);
```

**Alternatywne rozwiązanie** (bardziej precyzyjne dla konkretnego dnia tygodnia):
```javascript
// Jeśli chcesz średnią dla KONKRETNEGO dnia tygodnia (np. środy)
const targetDayOfWeek = new Date(targetDate).getDay();

const byDate = _.groupBy(allHourSales, 'dateStr');
const dailyTotals = Object.entries(byDate)
  .filter(([dateStr, _]) => new Date(dateStr).getDay() === targetDayOfWeek)
  .map(([dateStr, sales]) => ({
    date: dateStr,
    total: _.sumBy(sales, 'quantity')
  }));

const totalQuantity = _.sumBy(dailyTotals, 'total');
const numberOfOccurrences = dailyTotals.length;

// ✅ Średnia dla tego konkretnego dnia tygodnia
const avgPerTargetDay = totalQuantity / Math.max(1, numberOfOccurrences);

console.log(`📊 ${['Nie', 'Pon', 'Wto', 'Śro', 'Czw', 'Pią', 'Sob'][targetDayOfWeek]} average: ${avgPerTargetDay.toFixed(2)} (from ${numberOfOccurrences} occurrences)`);
```

**Zysk**:
- ✅ Dokładniejsze średnie (szczególnie z lukami w danych)
- ✅ Odporne na święta/braki danych
- ✅ Lepsze debug logging

---

## 2. OPTYMALIZACJE WYDAJNOŚCI

### OPT 2.1: Lookup Maps dla danych sprzedaży

**Problem**: O(n²) filtrowanie salesData dla każdego produktu.

**PRZED**:
```javascript
const generatePlan = async (wave) => {
  // ...

  products.forEach(product => {
    // ❌ Filtruje CAŁY salesData2025 (10k+ records) DLA KAŻDEGO produktu
    const productSales2025 = salesData2025.filter(s => s.eanCode === sku);
    const productSales2024 = salesData2024.filter(s => s.eanCode === sku);

    // To robi 30 produktów × 2 filtry × 10k records = 600k iterations!
  });
};
```

**PO (Z MEMOIZACJĄ)**:
```javascript
// Dodaj na początku komponentu (poza generatePlan)
const [salesLookupMaps, setSalesLookupMaps] = useState(null);

// Stwórz lookup maps PO załadowaniu danych (JEDEN RAZ)
useEffect(() => {
  if (salesData2025.length > 0 || salesData2024.length > 0) {
    console.log('📊 Building sales lookup maps...');

    const maps = {
      sales2025BySku: _.groupBy(salesData2025, 'eanCode'),
      sales2024BySku: _.groupBy(salesData2024, 'eanCode'),
      wasteBySku: _.groupBy(wasteData, 'eanCode'),

      // Dodatkowo: pre-filter po dniu tygodnia dla szybszych queries
      sales2025BySkuAndDay: {},
      sales2024BySkuAndDay: {}
    };

    // Build day-of-week indexes
    for (let day = 0; day <= 6; day++) {
      const filtered2025 = salesData2025.filter(s => s.dayOfWeek === day);
      const filtered2024 = salesData2024.filter(s => s.dayOfWeek === day);

      maps.sales2025BySkuAndDay[day] = _.groupBy(filtered2025, 'eanCode');
      maps.sales2024BySkuAndDay[day] = _.groupBy(filtered2024, 'eanCode');
    }

    setSalesLookupMaps(maps);
    console.log('✅ Lookup maps built');
  }
}, [salesData2025, salesData2024, wasteData]);

// Modyfikuj calculateHistoricalAverage() aby używać maps
const calculateHistoricalAverage = (sku, targetDate, waveHours, lookupMaps) => {
  // ✅ O(1) lookup zamiast O(n) filter
  const productSales2025 = lookupMaps?.sales2025BySku[sku] || [];
  const productSales2024 = lookupMaps?.sales2024BySku[sku] || [];

  // ... rest of function ...
};

// Przekaż maps do generatePlan
const generatePlan = async (wave) => {
  if (!salesLookupMaps) {
    console.log('⏳ Waiting for lookup maps...');
    return;
  }

  // ...

  products.forEach(product => {
    const hist1 = calculateHistoricalAverage(
      product.sku,
      selectedDate,
      waveHours[1],
      salesLookupMaps  // ✅ Przekaż maps
    );
    // ...
  });
};
```

**Zysk**:
- ⚡ O(n²) → O(n) = ~80% szybsze dla 30 produktów
- ⚡ 600k iterations → 30 lookups
- 💾 Pamięć: +2-5MB (akceptowalne)

---

### OPT 2.2: Memoizacja dni specjalnych

**Problem**: calculateEaster() wywoływane setki razy.

**PRZED**:
```javascript
const isHighSalesDay = (dateStr) => {
  // ❌ Każde wywołanie:
  return isPreHoliday(dateStr) || isPensionPaymentDay(dateStr);
  // → getSlovenianHolidays(year)
  //   → calculateEaster(year) (15+ math operations!)
};

// Wywoływane ~100+ razy podczas generatePlan()
```

**PO (Z CACHE)**:
```javascript
// Dodaj state dla holiday cache
const [holidayCache, setHolidayCache] = useState({});

// Build cache po wyborze daty
useEffect(() => {
  const year = new Date(selectedDate).getFullYear();
  const prevYear = year - 1;
  const nextYear = year + 1;

  const cache = {
    [prevYear]: getSlovenianHolidays(prevYear),
    [year]: getSlovenianHolidays(year),
    [nextYear]: getSlovenianHolidays(nextYear)
  };

  setHolidayCache(cache);
}, [selectedDate]);

// Cached version funkcji
const isHolidayCached = (dateStr, cache) => {
  const year = new Date(dateStr).getFullYear();
  const holidays = cache[year] || getSlovenianHolidays(year);
  return holidays.includes(dateStr);
};

const isPreHolidayCached = (dateStr, cache) => {
  const date = new Date(dateStr);
  const nextDay = new Date(date);
  nextDay.setDate(date.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split('T')[0];
  return isHolidayCached(nextDayStr, cache);
};

const isHighSalesDayCached = (dateStr, cache) => {
  return isPreHolidayCached(dateStr, cache) || isPensionPaymentDay(dateStr);
};

// Użyj cached version
products.forEach(product => {
  // ✅ Przekaż cache
  const hist1 = calculateHistoricalAverage(
    product.sku,
    selectedDate,
    waveHours[1],
    salesLookupMaps,
    holidayCache  // ✅ Cache
  );
});
```

**Zysk**:
- ⚡ ~95% szybsze obliczenia dni specjalnych
- ⚡ 100+ calculateEaster() → 3 calculateEaster()

---

### OPT 2.3: useMemo dla expensive calculations

**Problem**: Re-rendering powoduje ponowne obliczenia.

**PO**:
```javascript
// Memoizuj sorting produktów
const sortedProducts = useMemo(() => {
  return products.sort((a, b) => {
    // Key products first
    if (a.isKey && !b.isKey) return -1;
    if (!a.isKey && b.isKey) return 1;
    // Then by name
    return a.name.localeCompare(b.name);
  });
}, [products]);

// Memoizuj totals
const dailyTotals = useMemo(() => {
  if (!plans[1] || !plans[2] || !plans[3]) return null;

  return {
    planned: getTotalPlanned(1) + getTotalPlanned(2) + getTotalPlanned(3),
    historical: getTotalHistorical(1) + getTotalHistorical(2) + getTotalHistorical(3)
  };
}, [plans]);
```

---

## 3. REFAKTORYZACJA KODU

### REF 3.1: Extract function - parseProductSales

**PRZED**: Powtarzający się kod w calculateHistoricalAverage
**PO**:
```javascript
// Helper function - ekstrahuj powtarzalną logikę
const aggregateSalesByDate = (sales, waveHours, excludeHighSales = true) => {
  const filtered = sales.filter(s =>
    waveHours.includes(s.hour) &&
    (!excludeHighSales || !isHighSalesDay(s.dateStr))
  );

  const byDate = _.groupBy(filtered, 'dateStr');
  const uniqueDates = Object.keys(byDate);
  const dailyTotals = Object.values(byDate).map(day => _.sumBy(day, 'quantity'));
  const totalQuantity = _.sum(dailyTotals);

  return {
    filtered,
    byDate,
    uniqueDates,
    dailyTotals,
    totalQuantity,
    avgPerDay: uniqueDates.length > 0 ? totalQuantity / uniqueDates.length : 0
  };
};

// Użycie:
const recentData = aggregateSalesByDate(
  productSales2025.filter(s => s.date >= fourWeeksAgo && s.dayOfWeek === targetDayOfWeek),
  waveHours
);

if (recentData.uniqueDates.length > 0) {
  weights.push({
    value: recentData.avgPerDay,
    weight: mlWeights.same_weekday_4w
  });
}
```

---

### REF 3.2: Custom Hook - useHolidayCache

**PRZED**: State i useEffect w głównym komponencie
**PO**:
```javascript
// hooks/useHolidayCache.js
import { useState, useEffect } from 'react';

export const useHolidayCache = (selectedDate) => {
  const [cache, setCache] = useState({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const year = new Date(selectedDate).getFullYear();
    const prevYear = year - 1;
    const nextYear = year + 1;

    const newCache = {
      [prevYear]: getSlovenianHolidays(prevYear),
      [year]: getSlovenianHolidays(year),
      [nextYear]: getSlovenianHolidays(nextYear)
    };

    setCache(newCache);
    setIsReady(true);
  }, [selectedDate]);

  const isHoliday = (dateStr) => {
    const year = new Date(dateStr).getFullYear();
    return (cache[year] || []).includes(dateStr);
  };

  const isPreHoliday = (dateStr) => {
    const date = new Date(dateStr);
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    return isHoliday(nextDay.toISOString().split('T')[0]);
  };

  const isHighSalesDay = (dateStr) => {
    return isPreHoliday(dateStr) || isPensionPaymentDay(dateStr);
  };

  return { cache, isReady, isHoliday, isPreHoliday, isHighSalesDay };
};

// Użycie w komponencie:
const { isHoliday, isPreHoliday, isHighSalesDay, isReady } = useHolidayCache(selectedDate);
```

---

## 4. IMPLEMENTACJE BRAKUJĄCYCH FUNKCJI

### IMPL 4.1: Real-time Wave 2 Generation

**Nowa funkcja**: Generowanie Wave 2 o 12:30 z analizą Wave 1

```javascript
/**
 * Generuje Wave 2 z analizą rzeczywistej wydajności Wave 1
 * Zgodnie z algorytmem: linie 480-564
 */
const generateWave2RealTime = async () => {
  console.log('📊 Generating Wave 2 with real-time adaptation...');

  if (!plans[1]) {
    console.error('❌ Wave 1 must be generated first!');
    return;
  }

  setIsGenerating(true);
  const newPlan = {};

  for (const product of products) {
    const sku = product.sku;
    const wave1Plan = plans[1][sku];

    // STEP 1: Get actual sales 7:00-12:30 (from user input or API)
    const actualSales7to1230 = await getActualSalesForPeriod(sku, selectedDate, [7,8,9,10,11,12]);

    if (!actualSales7to1230) {
      // Fallback to static plan if no real-time data
      newPlan[sku] = plans[2][sku]; // Use pre-generated Wave 2
      continue;
    }

    // STEP 2: Calculate deviation from Wave 1 forecast
    const wave1Forecast = wave1Plan.quantity;
    const deviation = (actualSales7to1230 / wave1Forecast) - 1;

    // STEP 3: Detect stockout in Wave 1
    const stockoutDetected = await detectStockoutInPeriod(sku, selectedDate, [7,8,9,10,11,12]);

    // STEP 4: Calculate adjustment factor (zgodnie z algorytmem linia 511-531)
    let adjustmentFactor = 1.0;
    let reason = '';

    if (deviation > 0.20) {  // Sales 20%+ higher
      if (stockoutDetected) {
        adjustmentFactor = 1.35;  // +35% aggressive
        reason = '🚨 Stockout w Wave 1 - agresywne zwiększenie';
      } else {
        adjustmentFactor = 1.15;  // +15% cautious
        reason = '📈 Sprzedaż powyżej prognozy - ostrożne zwiększenie';
      }
    } else if (deviation >= -0.20 && deviation <= 0.20) {
      adjustmentFactor = 1.0;  // On track
      reason = '✅ Sprzedaż zgodna z prognozą';
    } else {  // deviation < -0.20
      adjustmentFactor = 0.85;  // -15%
      reason = '📉 Sprzedaż poniżej prognozy - zmniejszenie';
    }

    // STEP 5: Calculate base afternoon forecast
    const baseAfternoon = calculateHistoricalAverage(
      sku,
      selectedDate,
      [12,13,14,15],  // Wave 2 hours
      salesLookupMaps,
      holidayCache
    );

    // STEP 6: Apply adjustment
    const adjustedForecast = baseAfternoon * adjustmentFactor;

    // STEP 7: Apply medium buffer
    const bufferPercent = stockoutDetected ? 0.15 : 0.10;
    const finalQuantity = Math.round(adjustedForecast * (1 + bufferPercent));

    // STEP 8: Save to plan
    newPlan[sku] = {
      quantity: finalQuantity,
      historical: Math.round(baseAfternoon),
      buffer: Math.round(bufferPercent * 100),
      adjustmentFactor: adjustmentFactor,
      adjustmentReason: reason,
      wave1Performance: {
        planned: wave1Forecast,
        actual: actualSales7to1230,
        deviation: Math.round(deviation * 100) + '%',
        stockout: stockoutDetected
      }
    };

    // Log stockout for learning
    if (stockoutDetected) {
      saveStockout({
        date: selectedDate,
        sku: sku,
        wave: 1,
        hour: 12,  // Detected at 12:30
        confidence: 0.95,
        reason: 'Real-time detection during Wave 2 generation'
      });
    }
  }

  // Update plans
  const updatedPlans = { ...plans };
  updatedPlans[2] = newPlan;
  setPlans(updatedPlans);
  savePlan(selectedDate, updatedPlans);

  setIsGenerating(false);
  console.log('✅ Wave 2 generated with real-time adaptation');
};

// Helper: Get actual sales from user input
const getActualSalesForPeriod = async (sku, date, hours) => {
  // Option 1: Modal dla managera (manual input)
  // Option 2: Integration z POS system API
  // Option 3: Load from localStorage (if entered earlier)

  const actualData = getActualSales(date);
  if (!actualData || !actualData[sku]) return null;

  return actualData[sku].hours7to12 || null;
};

// Helper: Detect stockout in period
const detectStockoutInPeriod = async (sku, date, hours) => {
  const actualData = getActualSales(date);
  if (!actualData || !actualData[sku]) return false;

  const hourlySales = actualData[sku].hourly || {};

  // Check for zero sales in multiple hours
  let zeroCount = 0;
  for (const hour of hours) {
    if (!hourlySales[hour] || hourlySales[hour] === 0) {
      zeroCount++;
    }
  }

  // If 2+ hours with zero sales → stockout
  return zeroCount >= 2;
};
```

**UI Component - Actual Sales Input**:
```javascript
// components/ActualSalesInputModal.jsx
const ActualSalesInputModal = ({ isOpen, onClose, products, selectedDate, onSave }) => {
  const [salesData, setSalesData] = useState({});

  const handleSave = () => {
    saveActualSales(selectedDate, salesData);
    onSave(salesData);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Wprowadź rzeczywistą sprzedaż 7:00-12:30</h2>
      <p>Data: {selectedDate}</p>

      <table>
        <thead>
          <tr>
            <th>Produkt</th>
            <th>Planowano</th>
            <th>Sprzedano</th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr key={product.sku}>
              <td>{product.name}</td>
              <td>{plans[1]?.[product.sku]?.quantity || 0}</td>
              <td>
                <input
                  type="number"
                  value={salesData[product.sku]?.hours7to12 || ''}
                  onChange={(e) => setSalesData({
                    ...salesData,
                    [product.sku]: {
                      ...salesData[product.sku],
                      hours7to12: parseInt(e.target.value) || 0
                    }
                  })}
                  className="w-20 px-2 py-1 border rounded"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={handleSave}>Zapisz i generuj Wave 2</button>
    </Modal>
  );
};
```

---

### IMPL 4.2: Anomaly Smoothing

**Nowa funkcja**: Wygładzanie anomalii >30% odchylenia

```javascript
/**
 * Wygładza anomalie w danych historycznych
 * Algorytm: linie 360-377
 *
 * @param {Array} salesData - Array of { date, quantity }
 * @param {number} threshold - Deviation threshold (default: 0.30 = 30%)
 * @returns {Array} - Smoothed data
 */
const smoothAnomalies = (salesData, threshold = 0.30) => {
  if (salesData.length < 3) return salesData;

  // STEP 1: Calculate median
  const quantities = salesData.map(s => s.quantity).sort((a, b) => a - b);
  const median = quantities[Math.floor(quantities.length / 2)];

  console.log(`📊 Smoothing anomalies - Median: ${median}, Threshold: ${threshold * 100}%`);

  // STEP 2: Identify and replace anomalies
  const smoothed = salesData.map(s => {
    const deviation = Math.abs(s.quantity - median) / Math.max(1, median);

    if (deviation > threshold) {
      console.log(`⚠️ Anomaly detected: ${s.date} - ${s.quantity} (${(deviation * 100).toFixed(0)}% from median)`);
      return {
        ...s,
        quantity: median,  // Replace with median
        originalQuantity: s.quantity,
        wasSmoothed: true
      };
    }

    return { ...s, wasSmoothed: false };
  });

  // STEP 3: Apply 3-day moving average
  const movingAvg = [];
  for (let i = 0; i < smoothed.length; i++) {
    const start = Math.max(0, i - 1);
    const end = Math.min(smoothed.length, i + 2);
    const window = smoothed.slice(start, end);
    const avg = _.meanBy(window, 'quantity');

    movingAvg.push({
      ...smoothed[i],
      quantity: avg,
      smoothedBy: 'moving_avg_3'
    });
  }

  console.log(`✅ Anomaly smoothing complete - ${smoothed.filter(s => s.wasSmoothed).length} anomalies smoothed`);

  return movingAvg;
};

// Użycie w calculateHistoricalAverage:
const calculateHistoricalAverage = (sku, targetDate, waveHours, lookupMaps, holidayCache) => {
  // ... existing code to gather sales data ...

  // Aggregate by date
  const byDate = _.groupBy(recentSales, 'dateStr');
  const dailyData = Object.entries(byDate).map(([date, sales]) => ({
    date,
    quantity: _.sumBy(sales, 'quantity')
  }));

  // ✅ APPLY SMOOTHING
  const smoothedData = smoothAnomalies(dailyData, 0.30);

  // Calculate average from smoothed data
  const avgPerDay = _.meanBy(smoothedData, 'quantity');

  // ... rest of function ...
};
```

---

## 📊 SZACOWANE ZYSKI

### Performance Improvements:
| Optymalizacja | Obecny czas | Po opt. | Zysk |
|---------------|-------------|---------|------|
| Lookup Maps | 2-3s | 0.4-0.6s | **80%** |
| Holiday Cache | 1s | 0.05s | **95%** |
| useMemo | N/A (re-renders) | 0ms | **Eliminacja** |
| **TOTAL** | **~3s** | **~0.5s** | **~83%** |

### Algorithm Conformance:
| Area | Przed | Po | Improvement |
|------|-------|----|----|
| Wave 1 | 75% | 95% | +20% |
| Wave 2 | 40% | 90% | +50% |
| Wave 3 | 45% | 90% | +45% |
| ML Integration | 70% | 100% | +30% |
| **OVERALL** | **66%** | **94%** | **+28%** |

---

## ✅ PLAN WDROŻENIA

### FAZA 1: Critical Fixes (4h)
- [ ] FIX 1.1: ML Weights integration
- [ ] FIX 1.2: Packaged products logic
- [ ] FIX 1.3: Real day counting
- [ ] Testing & verification

### FAZA 2: Performance (4h)
- [ ] OPT 2.1: Lookup maps
- [ ] OPT 2.2: Holiday cache
- [ ] OPT 2.3: useMemo
- [ ] Performance benchmarks

### FAZA 3: Real-time Waves (8h)
- [ ] IMPL 4.1: Wave 2 real-time
- [ ] IMPL 4.1: Wave 3 real-time
- [ ] Actual sales input UI
- [ ] Integration testing

### FAZA 4: Advanced Features (4h)
- [ ] IMPL 4.2: Anomaly smoothing
- [ ] REF 3.1: Code refactoring
- [ ] REF 3.2: Custom hooks
- [ ] Documentation update

**TOTAL EFFORT**: ~20 godzin

---

**Koniec dokumentu** | Gotowe do wdrożenia
