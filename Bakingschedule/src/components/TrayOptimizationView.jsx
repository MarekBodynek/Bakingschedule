import React, { useMemo } from 'react';
import { Clock, Package, TrendingUp, ChefHat } from 'lucide-react';
import {
  getOvenConfiguration,
  getProgramConfiguration,
  getOvenSettings
} from '../utils/localStorage';

/**
 * TRAY OPTIMIZATION VIEW
 *
 * Pokazuje pracownikowi konkretne tace do upieczenia w optymalnej kolejności
 * Priorytetyzuje najpopularniejsze produkty aby były gotowe najwcześniej
 */
const TrayOptimizationView = ({ products, wavePlan, waveNumber }) => {
  // Pobierz konfigurację przy każdym renderze (to są proste gettery z localStorage)
  const ovenConfig = getOvenConfiguration();
  const programConfig = getProgramConfiguration();
  const ovenSettings = getOvenSettings();

  /**
   * Tworzy konkretne tace z produktami i planuje kolejność pieczenia
   */
  const trayAllocation = useMemo(() => {
    if (!wavePlan || Object.keys(wavePlan).length === 0) {
      return { batches: [], totalTrays: 0, totalTime: 0 };
    }

    // 1. Przygotuj produkty z priorytetami
    const productsWithData = products.map(product => {
      const planData = wavePlan[product.sku];
      if (!planData || planData.quantity === 0) return null;

      const productConfig = ovenConfig.find(p => p.sku === product.sku);

      let bakingProgram = 1;
      let bakingTime = 20;
      let unitsPerTray = 10;
      let programName = 'Program 1';

      if (productConfig) {
        bakingProgram = productConfig.program;
        unitsPerTray = productConfig.unitsPerTray;
        const progConfig = programConfig[bakingProgram];
        if (progConfig) {
          bakingTime = progConfig.durationMinutes || 20;
          programName = progConfig.name || `Program ${bakingProgram}`;
        }
      }

      // Priorytet bazowany na sprzedaży w danej fali
      let priority = 0;
      priority += product.isKey ? 10000 : 0;
      priority += planData.quantity * 100;
      priority += (planData.historical || 0) * 10;

      return {
        sku: product.sku,
        name: product.name,
        quantity: planData.quantity,
        isKey: product.isKey,
        bakingProgram,
        programName,
        bakingTime,
        unitsPerTray,
        priority,
        hasConfig: !!productConfig
      };
    }).filter(Boolean);

    // 2. Sortuj według priorytetu (najpopularniejsze najpierw)
    productsWithData.sort((a, b) => b.priority - a.priority);

    // 3. Utwórz tace z produktami
    const allTrays = [];
    let trayId = 1;

    productsWithData.forEach(product => {
      let remainingQty = product.quantity;

      while (remainingQty > 0) {
        const qtyOnThisTray = Math.min(remainingQty, product.unitsPerTray);

        allTrays.push({
          id: trayId++,
          product: product,
          quantity: qtyOnThisTray,
          program: product.bakingProgram,
          programName: product.programName,
          bakingTime: product.bakingTime,
          priority: product.priority
        });

        remainingQty -= qtyOnThisTray;
      }
    });

    // 4. Pogrupuj tace według programu
    const traysByProgram = {};
    allTrays.forEach(tray => {
      if (!traysByProgram[tray.program]) {
        traysByProgram[tray.program] = [];
      }
      traysByProgram[tray.program].push(tray);
    });

    // 5. Zaplanuj batche pieczenia
    const batches = [];
    const ovenCapacity = ovenSettings.ovenCapacity || 12;

    Object.entries(traysByProgram)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([program, trays]) => {
        for (let i = 0; i < trays.length; i += ovenCapacity) {
          const batchTrays = trays.slice(i, i + ovenCapacity);

          batches.push({
            batchNumber: batches.length + 1,
            program: parseInt(program),
            programName: batchTrays[0].programName,
            bakingTime: batchTrays[0].bakingTime,
            trays: batchTrays,
            trayCount: batchTrays.length,
            totalPieces: batchTrays.reduce((sum, t) => sum + t.quantity, 0)
          });
        }
      });

    // 6. Oblicz czasy
    let currentTime = 0;
    batches.forEach(batch => {
      batch.startTime = currentTime;
      batch.endTime = currentTime + batch.bakingTime;
      currentTime = batch.endTime;
    });

    return {
      batches,
      totalTrays: allTrays.length,
      totalTime: currentTime,
      ovenCapacity
    };
  }, [products, wavePlan, ovenConfig, programConfig, ovenSettings]);

  if (trayAllocation.batches.length === 0) {
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

  const { batches, totalTrays, totalTime } = trayAllocation;
  const totalPieces = batches.reduce((sum, batch) => sum + batch.totalPieces, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ChefHat className="w-5 h-5" />
              Plan pečenja - {waveNames[waveNumber]}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Izdelki so razporejeni po prioriteti - najpopularnejši najprej
            </p>
            {ovenSettings.individualCapacities && (
              <p className="text-xs text-gray-500 mt-1">
                Pečice: {ovenSettings.individualCapacities.map((cap, idx) => `${idx + 1}. (${cap})`).join(' • ')} = {ovenSettings.ovenCapacity} pladnjev skupaj
              </p>
            )}
          </div>
          <div className="text-right space-y-1">
            <div>
              <div className="text-sm text-gray-600">Runde pečenja</div>
              <div className="text-2xl font-bold text-purple-600">{batches.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Skupaj pladnjev</div>
              <div className="text-lg font-bold text-blue-600">{totalTrays}</div>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3" />
              ~{totalTime} minut skupaj
            </div>
          </div>
        </div>
      </div>

      {/* Batches */}
      <div className="space-y-4">
        {batches.map((batch, batchIdx) => (
          <div
            key={batchIdx}
            className={`bg-white border-2 border-${color}-200 rounded-lg overflow-hidden shadow-sm`}
          >
            {/* Batch Header */}
            <div className={`bg-${color}-50 border-b-2 border-${color}-200 p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full bg-${color}-600 text-white flex items-center justify-center font-bold text-xl`}>
                    {batch.batchNumber}
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 text-lg">
                      Runda {batch.batchNumber} - {batch.programName}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {batch.startTime}-{batch.endTime} min
                      </span>
                      <span>•</span>
                      <span>{batch.trayCount} pladnjev</span>
                      <span>•</span>
                      <span className="font-semibold">{batch.totalPieces} kosov</span>
                    </div>
                  </div>
                </div>
                <div className={`px-4 py-2 bg-${color}-100 text-${color}-900 rounded-full text-sm font-bold`}>
                  Program {batch.program}
                  <div className="text-xs font-normal">{batch.bakingTime} min</div>
                </div>
              </div>
            </div>

            {/* Trays in this batch */}
            <div className="p-4">
              <div className="space-y-3">
                {batch.trays.map((tray, trayIdx) => (
                  <div
                    key={tray.id}
                    className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                          {tray.id}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 text-base">
                          {tray.product.name}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          EAN: {tray.product.sku}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-3xl font-bold text-blue-600">
                            {tray.quantity}
                          </div>
                          <div className="text-sm text-gray-600 font-medium">
                            kosov
                          </div>
                        </div>
                        {tray.product.isKey && (
                          <div className="flex-shrink-0">
                            <span className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded font-bold text-sm">
                              ★ KLJUČNO
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Batch Footer */}
            <div className={`bg-gray-100 border-t border-gray-200 px-4 py-2 flex items-center justify-between text-sm`}>
              <div className="text-gray-600">
                <span className="font-semibold">Naložite {batch.trayCount} pladnjev v pečico</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <TrendingUp className="w-4 h-4" />
                <span className="font-semibold">Skupaj: {batch.totalPieces} kosov</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-700">Skupno načrtovano:</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {totalPieces} kosov na {totalTrays} pladnjih
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Skupni čas pečenja</div>
            <div className="text-3xl font-bold text-blue-600 flex items-center gap-2">
              <Clock className="w-8 h-8" />
              {totalTime} min
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrayOptimizationView;
