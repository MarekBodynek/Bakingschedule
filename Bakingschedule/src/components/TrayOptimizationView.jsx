import React, { useMemo } from 'react';
import { Clock, Package, TrendingUp, ChefHat, Printer } from 'lucide-react';
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

    // 3. Utwórz tace z produktami - ROUND ROBIN dla pełnego asortymentu od początku
    const allTrays = [];
    let trayId = 1;

    // Przygotuj strukturę z pozostałymi ilościami dla każdego produktu
    const productQueue = productsWithData.map(product => ({
      product: product,
      remainingQty: product.quantity,
      traysNeeded: Math.ceil(product.quantity / product.unitsPerTray)
    }));

    // Round-robin: dodawaj po jednej tacy każdego produktu w kolejnych rundach
    let hasRemainingProducts = true;
    while (hasRemainingProducts) {
      hasRemainingProducts = false;

      productQueue.forEach(item => {
        if (item.remainingQty > 0) {
          hasRemainingProducts = true;
          const qtyOnThisTray = Math.min(item.remainingQty, item.product.unitsPerTray);

          allTrays.push({
            id: trayId++,
            product: item.product,
            quantity: qtyOnThisTray,
            program: item.product.bakingProgram,
            programName: item.product.programName,
            bakingTime: item.product.bakingTime,
            priority: item.product.priority
          });

          item.remainingQty -= qtyOnThisTray;
        }
      });
    }

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

  // Funkcja drukowania - ukrywa inne fale
  const handlePrint = () => {
    // Dodaj klasę do body wskazującą którą falę drukujemy
    document.body.setAttribute('data-printing-wave', waveNumber);

    // Drukuj
    window.print();

    // Po zamknięciu okna drukowania, usuń klasę
    // (setTimeout bo window.print() blokuje wykonanie)
    setTimeout(() => {
      document.body.removeAttribute('data-printing-wave');
    }, 100);
  };

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

  // Zbierz wszystkie tace w jedną listę sekwencyjną
  const allTrays = [];
  batches.forEach(batch => {
    batch.trays.forEach(tray => {
      allTrays.push(tray);
    });
  });

  return (
    <div className="space-y-4" data-wave={waveNumber}>
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 print:border-black">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ChefHat className="w-5 h-5 print:hidden" />
              Plan pečenja - {waveNames[waveNumber]}
            </h3>
            <p className="text-sm text-gray-600 mt-1 print:hidden">
              Izdelki so razporejeni po prioriteti - najpopularnejši najprej
            </p>
            {ovenSettings.individualCapacities && (
              <p className="text-xs text-gray-500 mt-1 print:hidden">
                Pečice: {ovenSettings.individualCapacities.map((cap, idx) => `${idx + 1}. (${cap})`).join(' • ')} = {ovenSettings.ovenCapacity} pladnjev skupaj
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right space-y-1 print:hidden">
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
            <button
              onClick={handlePrint}
              className="print:hidden flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
              title="Natisni harmonogram odpieku"
            >
              <Printer className="w-5 h-5" />
              Natisni
            </button>
          </div>
        </div>
      </div>

      {/* Prosta tabela do druku - tylko widoczna podczas drukowania */}
      <div className="hidden print:block">
        <table className="w-full border-collapse border-2 border-black">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black px-3 py-2 text-left font-bold">Taca</th>
              <th className="border border-black px-3 py-2 text-left font-bold">Produkt</th>
              <th className="border border-black px-3 py-2 text-left font-bold">EAN</th>
              <th className="border border-black px-3 py-2 text-left font-bold">Program</th>
              <th className="border border-black px-3 py-2 text-right font-bold">Količina</th>
            </tr>
          </thead>
          <tbody>
            {allTrays.map((tray) => (
              <tr key={tray.id}>
                <td className="border border-black px-3 py-2 font-bold">{tray.id}</td>
                <td className="border border-black px-3 py-2">{tray.product.name}</td>
                <td className="border border-black px-3 py-2 text-sm">{tray.product.sku}</td>
                <td className="border border-black px-3 py-2 text-sm">{tray.programName}</td>
                <td className="border border-black px-3 py-2 text-right font-bold">{tray.quantity}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td colSpan="4" className="border border-black px-3 py-2">SKUPAJ</td>
              <td className="border border-black px-3 py-2 text-right">{totalPieces} kosov</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Sequential trays view - widoczne tylko na ekranie */}
      <div className="print:hidden">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b-2 border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-gray-700">Taca</th>
                <th className="px-4 py-3 text-left font-bold text-gray-700">Produkt</th>
                <th className="px-4 py-3 text-left font-bold text-gray-700">EAN</th>
                <th className="px-4 py-3 text-left font-bold text-gray-700">Program</th>
                <th className="px-4 py-3 text-right font-bold text-gray-700">Količina</th>
              </tr>
            </thead>
            <tbody>
              {allTrays.map((tray, index) => (
                <tr
                  key={tray.id}
                  className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                    tray.product.isKey ? 'bg-yellow-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="w-10 h-10 rounded bg-blue-600 text-white flex items-center justify-center font-bold">
                      {tray.id}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">
                      {tray.product.name}
                      {tray.product.isKey && (
                        <span className="ml-2 px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded text-xs font-bold">
                          ★ KLJUČNO
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{tray.product.sku}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{tray.programName}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-2xl font-bold text-blue-600">{tray.quantity}</span>
                    <span className="text-sm text-gray-600 ml-1">kos</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
