import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Target, Trash2, AlertTriangle } from 'lucide-react';
import { getAllMetrics, getAllPlans, getAllStockouts, getActualSales, getActualWaste } from '../utils/localStorage';

/**
 * METRICS DASHBOARD
 *
 * Pokazuje metryki wydajności algorytmu:
 * - Forecast Accuracy (dokładność prognoz)
 * - Waste % (procent odpadów)
 * - Stockouts count (liczba braków)
 * - Trendy tygodniowe
 */
const MetricsDashboard = ({ products, selectedDate, translations }) => {
  const t = translations || {};
  const metrics = useMemo(() => {
    const allPlans = getAllPlans();
    const allStockouts = getAllStockouts();

    // Pobierz ostatnie 7 dni z planami
    const dates = Object.keys(allPlans).sort().reverse().slice(0, 7);

    if (dates.length === 0) {
      return null;
    }

    let totalForecastAccuracy = 0;
    let totalWastePercent = 0;
    let totalStockouts = 0;
    let daysWithData = 0;

    const dailyMetrics = [];

    dates.forEach(date => {
      const plan = allPlans[date];
      const actualSalesData = getActualSales(date);
      const actualWasteData = getActualWaste(date);
      const stockoutsForDate = allStockouts.filter(s => s.date === date);

      if (!plan || (!actualSalesData && !actualWasteData)) {
        return; // Brak danych rzeczywistych
      }

      // Oblicz metryki dla tej daty
      let plannedTotal = 0;
      let actualTotal = 0;
      let wasteTotal = 0;

      products.forEach(product => {
        const sku = product.sku;

        // Suma z wszystkich fal
        const planned = (plan[1]?.[sku]?.quantity || 0) +
                       (plan[2]?.[sku]?.quantity || 0) +
                       (plan[3]?.[sku]?.quantity || 0);

        const actual = actualSalesData?.[sku] || 0;
        const waste = actualWasteData?.[sku] || 0;

        plannedTotal += planned;
        actualTotal += actual;
        wasteTotal += waste;
      });

      // Forecast accuracy (1 - MAPE)
      const accuracy = plannedTotal > 0
        ? (1 - Math.abs(plannedTotal - actualTotal) / plannedTotal) * 100
        : 0;

      // Waste %
      const wastePercent = plannedTotal > 0
        ? (wasteTotal / plannedTotal) * 100
        : 0;

      totalForecastAccuracy += accuracy;
      totalWastePercent += wastePercent;
      totalStockouts += stockoutsForDate.length;
      daysWithData++;

      dailyMetrics.push({
        date,
        accuracy,
        wastePercent,
        stockouts: stockoutsForDate.length,
        plannedTotal,
        actualTotal,
        wasteTotal
      });
    });

    if (daysWithData === 0) {
      return null;
    }

    const avgAccuracy = totalForecastAccuracy / daysWithData;
    const avgWaste = totalWastePercent / daysWithData;
    const avgStockouts = totalStockouts / daysWithData;

    // Trendy (porównanie z poprzednim okresem)
    const recentMetrics = dailyMetrics.slice(0, Math.ceil(daysWithData / 2));
    const olderMetrics = dailyMetrics.slice(Math.ceil(daysWithData / 2));

    const recentAvgAccuracy = recentMetrics.reduce((s, m) => s + m.accuracy, 0) / Math.max(1, recentMetrics.length);
    const olderAvgAccuracy = olderMetrics.reduce((s, m) => s + m.accuracy, 0) / Math.max(1, olderMetrics.length);
    const accuracyTrend = recentAvgAccuracy - olderAvgAccuracy;

    const recentAvgWaste = recentMetrics.reduce((s, m) => s + m.wastePercent, 0) / Math.max(1, recentMetrics.length);
    const olderAvgWaste = olderMetrics.reduce((s, m) => s + m.wastePercent, 0) / Math.max(1, olderMetrics.length);
    const wasteTrend = recentAvgWaste - olderAvgWaste;

    return {
      avgAccuracy,
      avgWaste,
      avgStockouts,
      totalStockouts,
      daysWithData,
      accuracyTrend,
      wasteTrend,
      dailyMetrics: dailyMetrics.reverse() // Od najstarszego do najnowszego
    };
  }, [products, selectedDate]);

  if (!metrics) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
        <p className="text-yellow-900 font-semibold mb-2">{t.noMetricsData || 'Ni podatkov o metrikah'}</p>
        <p className="text-sm text-yellow-700">
          {t.metricsAvailableAfter || 'Metrike bodo na voljo, ko boste vnesli dejanske prodaje in odpadke za generirane načrte.'}
        </p>
      </div>
    );
  }

  const { avgAccuracy, avgWaste, avgStockouts, totalStockouts, daysWithData, accuracyTrend, wasteTrend, dailyMetrics } = metrics;

  // Ocena wydajności
  const accuracyRating = avgAccuracy >= 90 ? 'excellent' : avgAccuracy >= 80 ? 'good' : avgAccuracy >= 70 ? 'fair' : 'poor';
  const wasteRating = avgWaste <= 3 ? 'excellent' : avgWaste <= 5 ? 'good' : avgWaste <= 8 ? 'fair' : 'poor';

  const ratingColors = {
    excellent: 'green',
    good: 'blue',
    fair: 'yellow',
    poor: 'red'
  };

  const accuracyColor = ratingColors[accuracyRating];
  const wasteColor = ratingColors[wasteRating];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Target className="w-5 h-5" />
          {t.metricsPerformanceDashboard || 'Nadzorna plošča metrik uspešnosti'}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {(t.analysisLastDays || 'Analiza zadnjih {days} dni s podatki').replace('{days}', daysWithData)}
        </p>
      </div>

      {/* Główne metryki */}
      <div className="grid grid-cols-3 gap-4">
        {/* Forecast Accuracy */}
        <div className={`bg-${accuracyColor}-50 border-2 border-${accuracyColor}-200 rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className={`w-5 h-5 text-${accuracyColor}-600`} />
              <span className="font-semibold text-gray-700">{t.forecastAccuracy || 'Natančnost napovedi'}</span>
            </div>
            {accuracyTrend !== 0 && (
              <div className={`flex items-center gap-1 text-xs font-bold ${accuracyTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {accuracyTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(accuracyTrend).toFixed(1)}%
              </div>
            )}
          </div>
          <div className={`text-4xl font-bold text-${accuracyColor}-600`}>
            {avgAccuracy.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {t.targetExcellent || 'Cilj: >90% (Odlično)'}
          </div>
        </div>

        {/* Waste % */}
        <div className={`bg-${wasteColor}-50 border-2 border-${wasteColor}-200 rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trash2 className={`w-5 h-5 text-${wasteColor}-600`} />
              <span className="font-semibold text-gray-700">{t.waste || 'Odpadki'}</span>
            </div>
            {wasteTrend !== 0 && (
              <div className={`flex items-center gap-1 text-xs font-bold ${wasteTrend < 0 ? 'text-green-600' : 'text-red-600'}`}>
                {wasteTrend < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {Math.abs(wasteTrend).toFixed(1)}%
              </div>
            )}
          </div>
          <div className={`text-4xl font-bold text-${wasteColor}-600`}>
            {avgWaste.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {t.wasteTargetExcellent || 'Cilj: <3% (Odlično)'}
          </div>
        </div>

        {/* Stockouts */}
        <div className={`bg-${totalStockouts === 0 ? 'green' : totalStockouts <= 2 ? 'yellow' : 'red'}-50 border-2 border-${totalStockouts === 0 ? 'green' : totalStockouts <= 2 ? 'yellow' : 'red'}-200 rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 text-${totalStockouts === 0 ? 'green' : totalStockouts <= 2 ? 'yellow' : 'red'}-600`} />
              <span className="font-semibold text-gray-700">{t.stockouts || 'Pomanjkanje'}</span>
            </div>
          </div>
          <div className={`text-4xl font-bold text-${totalStockouts === 0 ? 'green' : totalStockouts <= 2 ? 'yellow' : 'red'}-600`}>
            {totalStockouts}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {(t.avgPerDay || 'Povprečno: {avg}/dan').replace('{avg}', avgStockouts.toFixed(1))}
          </div>
        </div>
      </div>

      {/* Tabela dnevnih metrik */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
          <h4 className="font-semibold text-gray-800">{t.dailyHistory || 'Dnevna zgodovina'}</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">{t.date || 'Datum'}</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">{t.planned || 'Planirano'}</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">{t.sold || 'Prodano'}</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">{t.waste || 'Odpadki'}</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">{t.accuracy || 'Natančnost'}</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">{t.wastePercent || 'Odpadki %'}</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">{t.stockouts || 'Pomanjkanje'}</th>
              </tr>
            </thead>
            <tbody>
              {dailyMetrics.map((day, idx) => (
                <tr key={day.date} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-4 py-2 text-sm font-medium text-gray-800">{day.date}</td>
                  <td className="px-4 py-2 text-right text-sm text-gray-700">{day.plannedTotal}</td>
                  <td className="px-4 py-2 text-right text-sm text-gray-700">{day.actualTotal}</td>
                  <td className="px-4 py-2 text-right text-sm text-gray-700">{day.wasteTotal}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                      day.accuracy >= 90 ? 'bg-green-100 text-green-800' :
                      day.accuracy >= 80 ? 'bg-blue-100 text-blue-800' :
                      day.accuracy >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {day.accuracy.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                      day.wastePercent <= 3 ? 'bg-green-100 text-green-800' :
                      day.wastePercent <= 5 ? 'bg-blue-100 text-blue-800' :
                      day.wastePercent <= 8 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {day.wastePercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {day.stockouts > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-bold">
                        <AlertTriangle className="w-3 h-3" />
                        {day.stockouts}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-bold">
                        <CheckCircle className="w-3 h-3" />
                        0
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Priporočila */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-3">{t.recommendations || '💡 Priporočila'}</h4>
        <div className="space-y-2 text-sm text-blue-800">
          {avgAccuracy < 85 && (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{t.accuracyLow || 'Natančnost pod 85%. Razmislite o zagon optimizacije uteži ML.'}</p>
            </div>
          )}
          {avgWaste > 5 && (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{t.highWasteDescription || 'Odpadki nad 5%. Sistem samodejno zmanjšuje bufferje za izdelke z visokimi odpadki.'}</p>
            </div>
          )}
          {totalStockouts > 3 && (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{(t.stockoutsDetected || 'Odkrito {count} pomanjkanj. Sistem bo povečal napovedi za izdelke, ki se pogosto zmanjkajo.').replace('{count}', totalStockouts)}</p>
            </div>
          )}
          {avgAccuracy >= 90 && avgWaste <= 5 && totalStockouts <= 2 && (
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600" />
              <p className="text-green-800 font-semibold">{t.excellentPerformance || 'Odlična uspešnost! Sistem deluje optimalno.'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;
