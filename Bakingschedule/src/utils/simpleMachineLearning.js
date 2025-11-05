/**
 * SIMPLE MACHINE LEARNING SYSTEM
 *
 * Uczy się z:
 * - Korekt managera
 * - Rzeczywistych odpadów
 * - Wykrytych stockouts
 *
 * Optymalizuje wagi dla źródeł danych historycznych
 */

import { getAllManagerCorrections, getMLWeights, saveMLWeights, getDefaultMLWeights } from './localStorage';
import { getRecentStockouts } from './localStorage';

/**
 * Funkcja straty (loss function)
 * Penalizuje:
 * - Waste (wysoko - 2.0x)
 * - Stockouts (średnio - 1.0x)
 * - Forecast error (nisko - 0.5x)
 *
 * @param {Array} forecasts - Prognozy
 * @param {Array} actuals - Rzeczywiste wartości
 * @param {Array} waste - Odpady
 * @param {number} stockouts - Liczba braków
 * @returns {number} - Total loss
 */
export const calculateLoss = (forecasts, actuals, waste, stockouts) => {
  if (forecasts.length === 0 || actuals.length === 0) return 0;

  // 1. Forecast accuracy loss (MSE)
  let forecastLoss = 0;
  for (let i = 0; i < Math.min(forecasts.length, actuals.length); i++) {
    forecastLoss += Math.pow(forecasts[i] - actuals[i], 2);
  }
  forecastLoss = forecastLoss / forecasts.length;

  // 2. Waste loss (suma kwadratów odpadów)
  const wasteLoss = waste.reduce((sum, w) => sum + Math.pow(w, 2), 0);

  // 3. Stockout loss (liczba * współczynnik)
  const stockoutLoss = Math.pow(stockouts, 2);

  // Total loss z wagami
  const totalLoss = (0.5 * forecastLoss) + (2.0 * wasteLoss) + (1.0 * stockoutLoss);

  return totalLoss;
};

/**
 * Optymalizuje wagi ML dla produktu na podstawie historii
 *
 * @param {string} sku - SKU produktu
 * @param {Array} historicalData - Historia: [{ forecast, actual, waste, hasStockout }, ...]
 * @param {number} learningRate - Szybkość uczenia (default: 0.01)
 * @returns {Object} - Nowe wagi
 */
export const optimizeWeightsForProduct = (sku, historicalData, learningRate = 0.01) => {
  // Pobierz obecne wagi lub domyślne
  let weights = getMLWeights(sku);

  if (historicalData.length < 7) {
    console.log(`⚠️ Not enough data for ${sku} (${historicalData.length} days). Need at least 7.`);
    return weights;
  }

  // Ekstrahuj dane
  const forecasts = historicalData.map(d => d.forecast);
  const actuals = historicalData.map(d => d.actual);
  const waste = historicalData.map(d => d.waste || 0);
  const stockoutCount = historicalData.filter(d => d.hasStockout).length;

  // Oblicz obecny loss
  const currentLoss = calculateLoss(forecasts, actuals, waste, stockoutCount);

  console.log(`📊 Current loss for ${sku}: ${currentLoss.toFixed(2)}`);

  // Prosty gradient descent - testuj małe zmiany każdej wagi
  const weightKeys = Object.keys(weights).filter(k => k !== 'updatedAt');
  let bestWeights = { ...weights };
  let bestLoss = currentLoss;

  // Dla każdej wagi, spróbuj ją zwiększyć i zmniejszyć
  weightKeys.forEach(key => {
    const originalValue = weights[key];

    // Testuj +delta
    weights[key] = Math.min(0.9, originalValue + learningRate);
    normalizeWeights(weights);
    const lossUp = simulateLossWithWeights(weights, historicalData);

    if (lossUp < bestLoss) {
      bestLoss = lossUp;
      bestWeights = { ...weights };
    }

    // Testuj -delta
    weights[key] = Math.max(0.01, originalValue - learningRate);
    normalizeWeights(weights);
    const lossDown = simulateLossWithWeights(weights, historicalData);

    if (lossDown < bestLoss) {
      bestLoss = lossDown;
      bestWeights = { ...weights };
    }

    // Przywróć original
    weights[key] = originalValue;
  });

  // Jeśli znaleziono lepsze wagi, zapisz
  if (bestLoss < currentLoss) {
    console.log(`✅ Improved loss for ${sku}: ${currentLoss.toFixed(2)} → ${bestLoss.toFixed(2)} (${((1 - bestLoss/currentLoss) * 100).toFixed(1)}% better)`);
    saveMLWeights(sku, bestWeights);
    return bestWeights;
  } else {
    console.log(`ℹ️ No improvement found for ${sku}, keeping current weights`);
    return weights;
  }
};

/**
 * Normalizuje wagi aby sumowały się do 1.0
 * @param {Object} weights - Obiekt z wagami
 */
const normalizeWeights = (weights) => {
  const keys = Object.keys(weights).filter(k => k !== 'updatedAt');
  const sum = keys.reduce((s, k) => s + weights[k], 0);

  if (sum > 0) {
    keys.forEach(k => {
      weights[k] = weights[k] / sum;
    });
  }
};

/**
 * Symuluje loss z nowymi wagami (dla gradient descent)
 * @param {Object} weights - Nowe wagi
 * @param {Array} historicalData - Historia
 * @returns {number} - Loss
 */
const simulateLossWithWeights = (weights, historicalData) => {
  // Dla uproszczenia, zakładamy że nowe wagi dają proporcjonalne zmiany w forecast
  // W pełnej implementacji, trzeba by przeliczyć cały forecast z nowymi wagami

  const weightAdjustmentFactor = Object.values(weights).reduce((sum, w) => sum + w, 0);

  const adjustedForecasts = historicalData.map(d => d.forecast * weightAdjustmentFactor);
  const actuals = historicalData.map(d => d.actual);
  const waste = historicalData.map(d => d.waste || 0);
  const stockoutCount = historicalData.filter(d => d.hasStockout).length;

  return calculateLoss(adjustedForecasts, actuals, waste, stockoutCount);
};

/**
 * Uczy się z korekt managera
 * Jeśli manager często zwiększa/zmniejsza dla produktu, dostosuj wagi
 *
 * @param {string} sku - SKU produktu
 * @returns {Object} - Sugerowana zmiana wag
 */
export const learnFromManagerCorrections = (sku) => {
  const corrections = getAllManagerCorrections().filter(c => c.sku === sku);

  if (corrections.length < 3) {
    return null; // Za mało danych
  }

  // Oblicz średnią korektę (procentowo)
  const avgCorrectionPercent = corrections.reduce((sum, c) => {
    const percent = (c.adjustedQty - c.originalQty) / Math.max(1, c.originalQty);
    return sum + percent;
  }, 0) / corrections.length;

  console.log(`📝 Manager corrections for ${sku}: avg ${(avgCorrectionPercent * 100).toFixed(1)}% (${corrections.length} corrections)`);

  // Jeśli manager systematycznie zwiększa, zwiększ general buffer
  // Jeśli systematycznie zmniejsza, zmniejsz
  const weights = getMLWeights(sku);

  if (Math.abs(avgCorrectionPercent) > 0.10) { // >10% systematyczna korekta
    // Zmień wagę dla last_week_avg (najbardziej aktualne dane)
    weights.last_week_avg = Math.min(0.50, Math.max(0.10, weights.last_week_avg * (1 + avgCorrectionPercent * 0.5)));
    normalizeWeights(weights);

    console.log(`🔧 Adjusted weights based on manager corrections`);
    saveMLWeights(sku, weights);
    return weights;
  }

  return null;
};

/**
 * Uczy się z wykrytych stockouts
 * Jeśli produkt często ma stockout, zwiększ wagi dla source pokazujących wyższe wartości
 *
 * @param {string} sku - SKU produktu
 * @param {number} daysBack - Okres analizy
 * @returns {Object|null} - Nowe wagi lub null
 */
export const learnFromStockouts = (sku, daysBack = 28) => {
  const stockouts = getRecentStockouts(sku, daysBack);

  if (stockouts.length === 0) {
    return null;
  }

  console.log(`🚨 Product ${sku} had ${stockouts.length} stockouts in last ${daysBack} days`);

  const weights = getMLWeights(sku);

  // Jeśli częste stockouts, zwiększ wagi dla source'ów pokazujących wyższe wartości
  // Logika: zwiększ year_over_year (pokazuje trendy wzrostowe) i same_weekday_4w (najbardziej aktualne)
  if (stockouts.length >= 2) {
    weights.same_weekday_4w = Math.min(0.50, weights.same_weekday_4w * 1.15);
    weights.year_over_year = Math.min(0.20, weights.year_over_year * 1.10);
    normalizeWeights(weights);

    console.log(`🔧 Adjusted weights due to frequent stockouts`);
    saveMLWeights(sku, weights);
    return weights;
  }

  return null;
};

/**
 * Główna funkcja uczenia - uruchamiana np. co tydzień
 * Optymalizuje wagi dla wszystkich produktów
 *
 * @param {Array} products - Lista produktów
 * @param {Object} historicalDataByProduct - { 'sku': [historicalData], ... }
 * @returns {Object} - Summary optymalizacji
 */
export const runWeeklyOptimization = (products, historicalDataByProduct) => {
  console.log('🤖 Starting weekly ML optimization...');

  const results = {
    optimized: 0,
    skipped: 0,
    improved: 0,
    failed: 0
  };

  products.forEach(product => {
    const sku = product.sku;
    const historicalData = historicalDataByProduct[sku] || [];

    if (historicalData.length < 7) {
      results.skipped++;
      return;
    }

    try {
      // 1. Optymalizuj na podstawie loss function
      const oldWeights = getMLWeights(sku);
      const newWeights = optimizeWeightsForProduct(sku, historicalData);

      // 2. Ucz się z korekt managera
      learnFromManagerCorrections(sku);

      // 3. Ucz się z stockouts
      learnFromStockouts(sku);

      // Sprawdź czy są zmiany
      const hasChanges = Object.keys(oldWeights).some(k =>
        k !== 'updatedAt' && Math.abs(oldWeights[k] - newWeights[k]) > 0.01
      );

      if (hasChanges) {
        results.improved++;
      }

      results.optimized++;
    } catch (error) {
      console.error(`❌ Error optimizing ${sku}:`, error);
      results.failed++;
    }
  });

  console.log(`✅ Weekly optimization complete:`, results);
  return results;
};

/**
 * Resetuje wagi ML do wartości domyślnych dla produktu
 * @param {string} sku - SKU produktu
 */
export const resetWeightsToDefault = (sku) => {
  const defaultWeights = getDefaultMLWeights();
  saveMLWeights(sku, defaultWeights);
  console.log(`🔄 Weights reset to default for ${sku}`);
};

/**
 * Pobiera sugestie dla buffera na podstawie historii
 * @param {string} sku - SKU produktu
 * @param {Array} historicalData - Historia
 * @returns {number} - Sugerowany buffer (np. 0.15 = 15%)
 */
export const suggestBufferAdjustment = (sku, historicalData) => {
  if (historicalData.length < 7) {
    return 0; // Brak sugestii
  }

  // Oblicz średni waste ratio
  const avgWasteRatio = historicalData.reduce((sum, d) => {
    const ratio = d.waste / Math.max(1, d.forecast);
    return sum + ratio;
  }, 0) / historicalData.length;

  // Oblicz stockout rate
  const stockoutRate = historicalData.filter(d => d.hasStockout).length / historicalData.length;

  // Jeśli wysoki waste, zmniejsz buffer
  if (avgWasteRatio > 0.10) { // >10% waste
    return -0.05; // Zmniejsz buffer o 5%
  }

  // Jeśli częste stockouts, zwiększ buffer
  if (stockoutRate > 0.15) { // >15% dni ze stockout
    return +0.08; // Zwiększ buffer o 8%
  }

  return 0; // Bez zmian
};
