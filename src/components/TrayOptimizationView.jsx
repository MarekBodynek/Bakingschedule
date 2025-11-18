import React, { useMemo } from 'react';
import { Clock, Package, TrendingUp, AlertTriangle } from 'lucide-react';

/**
 * TRAY OPTIMIZATION VIEW
 *
 * Grupuje produkty według programów wypiekania i priorytetów
 * Pokazuje optymalną kolejność produkcji na blachach
 *
 * ✅ IMPL 3.1: Enhanced with algorithm-specified priority calculation
 * - sales_velocity * 100
 * - stockout_count * 50
 * - is_key * 1000
 */
const TrayOptimizationView = ({ products, wavePlan, waveNumber, salesData = [], stockoutHistory = [] }) => {

  /**
   * ✅ IMPL 3.1: Calculate sales velocity for product
   * Based on last 30 days of sales
   */
  const calculateSalesVelocity = (sku) => {
    if (!salesData || salesData.length === 0) return 0;

    const productSales = salesData.filter(s => s.eanCode === sku);
    if (productSales.length === 0) return 0;

    // Get last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const recentSales = productSales.filter(s => {
      const saleDate = new Date(s.dateStr || s.date);
      return saleDate >= thirtyDaysAgo;
    });

    if (recentSales.length === 0) return 0;

    // Calculate average daily sales velocity
    const totalQuantity = recentSales.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const uniqueDates = [...new Set(recentSales.map(s => s.dateStr || s.date))];
    const daysWithSales = uniqueDates.length || 1;

    return totalQuantity / daysWithSales;
  };

  /**
   * ✅ IMPL 3.1: Count stockouts in last 4 weeks
   */
  const countRecentStockouts = (sku) => {
    if (!stockoutHistory || stockoutHistory.length === 0) return 0;

    const productStockouts = stockoutHistory.filter(s => s.sku === sku);

    // Count stockouts in last 28 days
    const now = new Date();
    const fourWeeksAgo = new Date(now - 28 * 24 * 60 * 60 * 1000);

    return productStockouts.filter(s => {
      const stockoutDate = new Date(s.date);
      return stockoutDate >= fourWeeksAgo;
    }).length;
  };
  /**
   * Grupuje produkty według baking program i sortuje po priorytecie
   */
  const trayAllocation = useMemo(() => {
    if (!wavePlan || Object.keys(wavePlan).length === 0) {
      return [];
    }

    // Przypisz każdemu produktowi baking program (domyślnie na podstawie kategorii)
    const productsWithPrograms = products.map(product => {
      const planData = wavePlan[product.sku];
      if (!planData || planData.quantity === 0) return null;

      // Logika przypisania programu - można dostosować
      let bakingProgram = 'P1'; // Domyślny
      let bakingTime = 15; // minutes

      // Przykładowe rozpoznawanie na podstawie nazwy
      const nameLower = product.name.toLowerCase();
      if (nameLower.includes('kruha') || nameLower.includes('kruh') || nameLower.includes('bread')) {
        bakingProgram = 'P2';
        bakingTime = 18;
      } else if (nameLower.includes('croissant') || nameLower.includes('rogljič') || nameLower.includes('puff')) {
        bakingProgram = 'P3';
        bakingTime = 20;
      } else if (nameLower.includes('pizza') || nameLower.includes('focaccia')) {
        bakingProgram = 'P4';
        bakingTime = 12;
      }

      // ✅ IMPL 3.1: Algorithm-specified priority calculation
      // priority = sales_velocity * 100 + stockout_count * 50 + is_key * 1000
      const salesVelocity = calculateSalesVelocity(product.sku);
      const stockoutCount = countRecentStockouts(product.sku);

      let priority = 0;
      priority += salesVelocity * 100;           // Sales velocity weight
      priority += stockoutCount * 50;            // Stockout history weight
      priority += product.isKey ? 1000 : 0;      // Key products get highest priority

      return {
        sku: product.sku,
        name: product.name,
        quantity: planData.quantity,
        isKey: product.isKey,
        isPackaged: product.isPackaged,
        packageQuantity: product.packageQuantity || 1,
        bakingProgram,
        bakingTime,
        priority,
        // ✅ IMPL 3.1: Include metrics for display
        salesVelocity: Math.round(salesVelocity * 10) / 10,
        stockoutCount
      };
    }).filter(Boolean);

    // Grupuj według programu
    const byProgram = {};
    productsWithPrograms.forEach(p => {
      if (!byProgram[p.bakingProgram]) {
        byProgram[p.bakingProgram] = {
          program: p.bakingProgram,
          bakingTime: p.bakingTime,
          products: []
        };
      }
      byProgram[p.bakingProgram].products.push(p);
    });

    // Sortuj produkty w każdym programie po priorytecie (malejąco)
    Object.values(byProgram).forEach(programGroup => {
      programGroup.products.sort((a, b) => b.priority - a.priority);
    });

    // Konwertuj do array i sortuj programy (P1, P2, P3, P4)
    const trays = Object.values(byProgram).sort((a, b) =>
      a.program.localeCompare(b.program)
    );

    // Dodaj numery blach
    trays.forEach((tray, idx) => {
      tray.trayNumber = idx + 1;
      tray.totalPieces = tray.products.reduce((sum, p) => sum + p.quantity, 0);
    });

    return trays;
  }, [products, wavePlan]);

  if (trayAllocation.length === 0) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-semibold">Ni načrta za optimizacijo</p>
        <p className="text-sm text-gray-500">Najprej generirajte načrt peke</p>
      </div>
    );
  }

  const waveNames = { 1: 'Jutranji val', 2: 'Opoldanski val', 3: 'Večerni val' };
  const waveColors = { 1: 'green', 2: 'blue', 3: 'orange' };
  const color = waveColors[waveNumber] || 'gray';

  const totalTime = trayAllocation.reduce((sum, tray) => sum + tray.bakingTime, 0);
  const totalPieces = trayAllocation.reduce((sum, tray) => sum + tray.totalPieces, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Optimizacija pladnjev - {waveNames[waveNumber]}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Zaporedna proizvodnja po programih peke
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Skupaj</div>
            <div className="text-2xl font-bold text-gray-800">{totalPieces} kos</div>
            <div className="text-xs text-gray-500 flex items-center gap-1 justify-end mt-1">
              <Clock className="w-3 h-3" />
              ~{totalTime} min
            </div>
          </div>
        </div>
      </div>

      {/* Blachy */}
      <div className="space-y-3">
        {trayAllocation.map((tray, idx) => (
          <div
            key={idx}
            className={`bg-white border-2 border-${color}-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
          >
            {/* Nagłówek blachy */}
            <div className={`bg-${color}-50 border-b-2 border-${color}-200 p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-${color}-500 text-white flex items-center justify-center font-bold text-lg`}>
                    {tray.trayNumber}
                  </div>
                  <div>
                    <div className="font-bold text-gray-800">
                      Pladenj {tray.trayNumber} - Program {tray.program}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {tray.bakingTime} minut
                      </span>
                      <span>•</span>
                      <span>{tray.products.length} izdelkov</span>
                      <span>•</span>
                      <span className="font-semibold">{tray.totalPieces} kosov</span>
                    </div>
                  </div>
                </div>
                <div className={`px-3 py-1 bg-${color}-100 text-${color}-800 rounded-full text-xs font-bold`}>
                  {tray.program}
                </div>
              </div>
            </div>

            {/* Lista produktów na blachy */}
            <div className="p-4 space-y-2">
              {tray.products.map((product, prodIdx) => (
                <div
                  key={product.sku}
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${product.isKey ? 'bg-yellow-500' : 'bg-gray-300'} text-white flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                      {prodIdx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">{product.name}</span>
                        {product.isKey && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-bold">
                            KLJUČNO
                          </span>
                        )}
                        {product.isPackaged && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-bold">
                            {product.packageQuantity}x PAK
                          </span>
                        )}
                        {product.stockoutCount > 0 && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {product.stockoutCount}x brak
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span className="font-mono">{product.sku}</span>
                        {product.salesVelocity > 0 && (
                          <span className="text-green-600">
                            ⚡ {product.salesVelocity}/dan
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-bold text-gray-800">{product.quantity}</div>
                    <div className="text-xs text-gray-500">kosov</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Noga pladnja - povzetek */}
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex items-center justify-between text-sm">
              <div className="text-gray-600">
                <span className="font-semibold">Vrstni red:</span> Od najvišje prioritete
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <TrendingUp className="w-4 h-4" />
                <span className="font-semibold">Skupaj: {tray.totalPieces} kos</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navodila */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">📋 Navodila za proizvodnjo</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Začnite s <strong>Pladnjem 1</strong> (najvišja prioriteta)</li>
          <li>Izdelki na vsakem pladnju so <strong>razvrščeni po prioriteti</strong></li>
          <li>Izdelki <span className="bg-yellow-200 px-1 rounded">KLJUČNO</span> vedno najprej</li>
          <li>Vsak program peke ima svoj <strong>optimalen čas</strong></li>
          <li>Skupni čas proizvodnje: <strong>~{totalTime} minut</strong></li>
        </ol>
      </div>
    </div>
  );
};

export default TrayOptimizationView;
