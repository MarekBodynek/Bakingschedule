/**
 * STOCKOUT DETECTION MODULE
 *
 * Wykrywa braki produktów w historii sprzedaży.
 * Prosty algorytm: dla TOP 5 produktów, brak sprzedaży w godzinie = stockout
 */

/**
 * Identyfikuje TOP 5 najszybciej rotujących produktów
 * @param {Array} salesData - Dane sprzedaży
 * @param {Array} products - Lista produktów
 * @param {number} daysBack - Ile dni wstecz analizować (default: 28)
 * @returns {Array} - Array SKU top 5 produktów
 */
export const getTopFastMovingProducts = (salesData, products, daysBack = 28) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  // Filtruj sprzedaż z ostatnich N dni
  const recentSales = salesData.filter(s => s.date >= cutoffDate);

  // Grupuj po SKU i sumuj
  const salesBySku = {};
  recentSales.forEach(sale => {
    if (!salesBySku[sale.eanCode]) {
      salesBySku[sale.eanCode] = 0;
    }
    salesBySku[sale.eanCode] += sale.quantity;
  });

  // Sortuj po sumie sprzedaży (malejąco)
  const sorted = Object.entries(salesBySku)
    .map(([sku, total]) => ({ sku, total }))
    .sort((a, b) => b.total - a.total);

  // Zwróć top 5 SKU
  const top5 = sorted.slice(0, 5).map(item => item.sku);

  console.log('🔥 TOP 5 Fast-Moving Products:',
    top5.map(sku => {
      const product = products.find(p => p.sku === sku);
      return `${product?.name || sku} (${salesBySku[sku]} szt)`;
    })
  );

  return top5;
};

/**
 * Wykrywa stockout dla konkretnego produktu w konkretnej dacie
 * @param {string} sku - SKU produktu
 * @param {string} dateStr - Data w formacie YYYY-MM-DD
 * @param {Array} salesData - Dane sprzedaży godzinowej
 * @param {Array} fastMovingSkus - Lista top 5 SKU
 * @returns {Object} - { hasStockout: boolean, hour: number|null, confidence: number }
 */
export const detectStockoutForDate = (sku, dateStr, salesData, fastMovingSkus) => {
  // Tylko dla produktów szybkorotujących
  if (!fastMovingSkus.includes(sku)) {
    return { hasStockout: false, hour: null, confidence: 0 };
  }

  // Pobierz sprzedaż dla tej daty
  const daySales = salesData.filter(s => s.eanCode === sku && s.dateStr === dateStr);

  if (daySales.length === 0) {
    return { hasStockout: false, hour: null, confidence: 0 };
  }

  // Utwórz mapę godzin → ilość
  const hourlyMap = {};
  daySales.forEach(s => {
    hourlyMap[s.hour] = s.quantity;
  });

  // Godziny operacyjne: 7-19
  const operatingHours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

  // Szukaj pierwszej godziny z zerem (brak sprzedaży)
  for (let i = 0; i < operatingHours.length; i++) {
    const hour = operatingHours[i];
    const sales = hourlyMap[hour] || 0;

    if (sales === 0) {
      // Sprawdź poprzednią godzinę (czy była sprzedaż?)
      if (i > 0) {
        const prevHour = operatingHours[i - 1];
        const prevSales = hourlyMap[prevHour] || 0;

        // Jeśli poprzednio była sprzedaż, teraz 0 → stockout
        if (prevSales > 0) {
          return {
            hasStockout: true,
            hour: hour,
            confidence: 0.9,
            reason: `Brak sprzedaży o ${hour}:00 po ${prevSales} szt o ${prevHour}:00`
          };
        }
      }

      // Sprawdź 2 kolejne godziny - jeśli też 0, to pewny stockout
      if (i < operatingHours.length - 2) {
        const next1 = operatingHours[i + 1];
        const next2 = operatingHours[i + 2];
        const sales1 = hourlyMap[next1] || 0;
        const sales2 = hourlyMap[next2] || 0;

        if (sales1 === 0 && sales2 === 0) {
          return {
            hasStockout: true,
            hour: hour,
            confidence: 0.95,
            reason: `3 kolejne godziny bez sprzedaży od ${hour}:00`
          };
        }
      }
    }
  }

  return { hasStockout: false, hour: null, confidence: 0 };
};

/**
 * Wykrywa wszystkie stockouts w określonym okresie
 * @param {Array} salesData - Dane sprzedaży
 * @param {Array} products - Lista produktów
 * @param {number} daysBack - Ile dni wstecz
 * @returns {Array} - Lista stockout events
 */
export const detectAllStockouts = (salesData, products, daysBack = 28) => {
  const fastMovingSkus = getTopFastMovingProducts(salesData, products, daysBack);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  // Pobierz unikalne daty
  const uniqueDates = [...new Set(
    salesData
      .filter(s => s.date >= cutoffDate)
      .map(s => s.dateStr)
  )].sort();

  const stockouts = [];

  // Dla każdego produktu szybkorotującego i każdej daty
  fastMovingSkus.forEach(sku => {
    const product = products.find(p => p.sku === sku);

    uniqueDates.forEach(dateStr => {
      const detection = detectStockoutForDate(sku, dateStr, salesData, fastMovingSkus);

      if (detection.hasStockout) {
        stockouts.push({
          sku: sku,
          productName: product?.name || sku,
          date: dateStr,
          hour: detection.hour,
          confidence: detection.confidence,
          reason: detection.reason
        });
      }
    });
  });

  console.log(`🚨 Detected ${stockouts.length} stockout events in last ${daysBack} days`);

  return stockouts;
};

/**
 * Oblicza unmet demand - szacuje ile moglibyśmy sprzedać gdyby nie było stockout
 * @param {string} sku - SKU produktu
 * @param {string} dateStr - Data stockout
 * @param {Array} salesData - Dane sprzedaży
 * @param {number} stockoutHour - Godzina stockout
 * @returns {number} - Szacowana niespełniona sprzedaż
 */
export const estimateUnmetDemand = (sku, dateStr, salesData, stockoutHour) => {
  // Znajdź podobne dni (ten sam dzień tygodnia) bez stockout
  const targetDate = new Date(dateStr);
  const targetDayOfWeek = targetDate.getDay();

  // 4 tygodnie wstecz
  const fourWeeksAgo = new Date(targetDate);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  // Podobne dni
  const similarDays = salesData.filter(s =>
    s.eanCode === sku &&
    s.dayOfWeek === targetDayOfWeek &&
    s.date >= fourWeeksAgo &&
    s.date < targetDate &&
    s.hour >= stockoutHour // Godziny po stockout
  );

  if (similarDays.length === 0) {
    // Domyślnie +30% od średniej przed stockout
    const beforeStockout = salesData.filter(s =>
      s.eanCode === sku &&
      s.dateStr === dateStr &&
      s.hour < stockoutHour
    );

    const avgBefore = beforeStockout.reduce((sum, s) => sum + s.quantity, 0) / Math.max(1, beforeStockout.length);
    return Math.round(avgBefore * 0.3);
  }

  // Średnia z podobnych godzin
  const avgAfterStockoutHour = similarDays.reduce((sum, s) => sum + s.quantity, 0) / similarDays.length;

  return Math.round(avgAfterStockoutHour);
};
