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
const TrayOptimizationView = ({ products, wavePlan, waveNumber, translations }) => {
  const t = translations || {};
  // Pobierz konfigurację przy każdym renderze (to są proste gettery z localStorage)
  const ovenConfig = getOvenConfiguration();
  const programConfig = getProgramConfiguration();
  const ovenSettings = getOvenSettings();

  /**
   * NOWA LOGIKA PAKOWANIA TAC
   *
   * Cel: Minimalizacja tac MIXED, maksymalizacja wykorzystania pojemności
   *
   * Algorytm:
   * 1. Agreguj ilości po SKU (nie rozkładaj od razu na tace)
   * 2. Twórz tace SINGLE (pełne jednorodne)
   * 3. Twórz tace MIXED z resztek (zachłannie, minimalizując ich liczbę)
   * 4. Sortuj: Faza → SINGLE przed MIXED → Popularność → Grupowanie po SKU
   */
  const trayAllocation = useMemo(() => {
    if (!wavePlan || Object.keys(wavePlan).length === 0) {
      return { batches: [], totalTrays: 0, totalTime: 0 };
    }

    // KROK 1: Przygotuj produkty z metadanymi
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

      // Priorytet bazowany na sprzedaży (popularność)
      let priority = 0;
      priority += product.isKeyProduct ? 10000 : 0;
      priority += planData.quantity * 100;
      priority += (planData.historical || 0) * 10;

      return {
        sku: product.sku,
        name: product.name,
        quantity: planData.quantity,
        isKey: product.isKeyProduct,
        bakingProgram,
        programName,
        bakingTime,
        unitsPerTray,
        priority,
        hasConfig: !!productConfig
      };
    }).filter(Boolean);

    // Sortuj według priorytetu (najpopularniejsze najpierw)
    productsWithData.sort((a, b) => b.priority - a.priority);

    // KROK 2: Agreguj ilości po programie pieczenia
    const productsByProgram = {};
    productsWithData.forEach(product => {
      if (!productsByProgram[product.bakingProgram]) {
        productsByProgram[product.bakingProgram] = [];
      }
      productsByProgram[product.bakingProgram].push(product);
    });

    const allTrays = [];
    let trayId = 1;
    const traysByProgram = {};

    // KROK 3: Dla każdego programu - twórz tace SINGLE, zbieraj resztki
    Object.entries(productsByProgram).forEach(([program, programProducts]) => {
      const remainders = []; // { product, remainder }

      // Dla każdego produktu w programie
      programProducts.forEach(product => {
        const capacity = product.unitsPerTray;
        const totalQty = product.quantity;

        // Oblicz pełne tace i resztę
        const fullTrays = Math.floor(totalQty / capacity);
        const remainder = totalQty % capacity;

        // Utwórz pełne tace SINGLE (jednorodne)
        for (let i = 0; i < fullTrays; i++) {
          allTrays.push({
            id: trayId++,
            products: [{ product, quantity: capacity }],
            program: parseInt(program),
            programName: product.programName,
            bakingTime: product.bakingTime,
            priority: product.priority,
            type: 'SINGLE',
            mainSku: product.sku
          });
        }

        // Zapisz resztę do mieszania
        if (remainder > 0) {
          remainders.push({ product, remainder });
        }
      });

      // KROK 4: Twórz tace MIXED z resztek (zachłannie)
      if (remainders.length > 0) {
        // Sortuj resztki po priorytecie (najpopularniejsze najpierw)
        remainders.sort((a, b) => b.product.priority - a.product.priority);

        // Ustal pojemność tacy dla tego programu (weź z pierwszego produktu)
        const groupCapacity = remainders[0]?.product.unitsPerTray || 10;

        let currentTray = null;
        let freeSpace = 0;

        remainders.forEach(item => {
          let remaining = item.remainder;

          while (remaining > 0) {
            // Utwórz nową tacę jeśli nie ma lub jest pełna
            if (!currentTray || freeSpace === 0) {
              if (currentTray && currentTray.products.length > 0) {
                allTrays.push(currentTray);
              }
              currentTray = {
                id: trayId++,
                products: [],
                program: parseInt(program),
                programName: item.product.programName,
                bakingTime: item.product.bakingTime,
                priority: item.product.priority,
                type: 'MIXED',
                mainSku: null
              };
              freeSpace = groupCapacity;
            }

            // Dodaj ile się zmieści
            const take = Math.min(remaining, freeSpace);
            currentTray.products.push({
              product: item.product,
              quantity: take
            });

            remaining -= take;
            freeSpace -= take;
          }
        });

        // Dodaj ostatnią tacę MIXED
        if (currentTray && currentTray.products.length > 0) {
          // Oznacz mainSku dla tacy MIXED (produkt z największą ilością)
          const mainProduct = currentTray.products.reduce((max, p) =>
            p.quantity > max.quantity ? p : max
          );
          currentTray.mainSku = mainProduct.product.sku;
          allTrays.push(currentTray);
        }
      }
    });

    // KROK 5: Sortuj wszystkie tace według kryteriów biznesowych
    allTrays.sort((a, b) => {
      const aHomogeneous = a.type === 'SINGLE';
      const bHomogeneous = b.type === 'SINGLE';

      // 1. SINGLE przed MIXED (jednorodne są łatwiejsze)
      if (aHomogeneous !== bHomogeneous) return bHomogeneous - aHomogeneous;

      // 2. W ramach jednorodnych: grupuj ten sam produkt razem
      if (aHomogeneous && bHomogeneous) {
        const skuCompare = a.mainSku.localeCompare(b.mainSku);
        if (skuCompare !== 0) return skuCompare;
      }

      // 3. Według priorytetu (popularność)
      return b.priority - a.priority;
    });

    // Przenumeruj tace sekwencyjnie po posortowaniu
    allTrays.forEach((tray, index) => {
      tray.id = index + 1;
    });

    // Pogrupuj według programu (dla batchy)
    allTrays.forEach(tray => {
      const program = tray.program;
      if (!traysByProgram[program]) {
        traysByProgram[program] = [];
      }
      traysByProgram[program].push(tray);
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
            totalPieces: batchTrays.reduce((sum, t) =>
              sum + t.products.reduce((pSum, p) => pSum + p.quantity, 0), 0
            )
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
        <p className="text-gray-600 font-semibold">{t.noPlanForOptimization || 'No optimization plan'}</p>
        <p className="text-sm text-gray-500">{t.generatePlanFirst || 'Generate baking plan first'}</p>
      </div>
    );
  }

  const waveNames = { 1: t.wave1Name || 'Morning wave', 2: t.wave2Name || 'Midday wave', 3: t.wave3Name || 'Evening wave' };
  const waveColors = { 1: 'green', 2: 'blue', 3: 'orange' };
  const color = waveColors[waveNumber] || 'gray';

  const { batches, totalTrays, totalTime } = trayAllocation;
  const totalPieces = batches.reduce((sum, batch) => sum + batch.totalPieces, 0);

  // Zbierz wszystkie tace z informacją o batchu - rozwiń produkty na tacy
  const allTraysWithBatch = [];
  batches.forEach(batch => {
    batch.trays.forEach(tray => {
      // Każda taca może mieć wiele produktów, tworzymy osobny wiersz dla każdego produktu
      tray.products.forEach((productItem, productIndex) => {
        allTraysWithBatch.push({
          id: tray.id,
          trayId: tray.id,
          product: productItem.product,
          quantity: productItem.quantity,
          program: tray.program,
          programName: tray.programName,
          bakingTime: tray.bakingTime,
          batchNumber: batch.batchNumber,
          isFirstProductOnTray: productIndex === 0,
          isLastProductOnTray: productIndex === tray.products.length - 1,
          totalProductsOnTray: tray.products.length
        });
      });
    });
  });

  // Flatten dla druku (bez informacji o batchu)
  const allTrays = allTraysWithBatch.map(({ batchNumber, isFirstProductOnTray, isLastProductOnTray, totalProductsOnTray, ...tray }) => tray);

  return (
    <div className="space-y-4" data-wave={waveNumber}>
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 print:border-black">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ChefHat className="w-5 h-5 print:hidden" />
              {t.bakingPlan || 'Baking plan'} - {waveNames[waveNumber]}
            </h3>
            <p className="text-sm text-gray-600 mt-1 print:hidden">
              {t.productsArrangedByPriority || 'Products arranged by priority - most popular first'}
            </p>
            {ovenSettings.individualCapacities && (
              <p className="text-xs text-gray-500 mt-1 print:hidden">
                {t.ovens || 'Ovens'}: {ovenSettings.individualCapacities.map((cap, idx) => `${idx + 1}. (${cap})`).join(' • ')} = {ovenSettings.ovenCapacity} {t.traysTotal || 'trays total'}
              </p>
            )}
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 print:hidden">
              <strong>{t.printInstructions || 'Kako natisniti'}:</strong> {t.printInstructionsText || 'Klikni gumb "Natisni" za tiskanje tega vala. Za tiskanje druge vale, pojdi na zavihek te vale in ponovi.'}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right space-y-1 print:hidden">
              <div>
                <div className="text-sm text-gray-600">{t.bakingRounds || 'Baking rounds'}</div>
                <div className="text-2xl font-bold text-purple-600">{batches.length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">{t.totalTrays || 'Total trays'}</div>
                <div className="text-lg font-bold text-blue-600">{totalTrays}</div>
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                <Clock className="w-3 h-3" />
                ~{totalTime} {t.minutesTotal || 'minutes total'}
              </div>
            </div>
            <button
              onClick={handlePrint}
              className="print:hidden flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
              title={t.printSchedule || 'Print baking schedule'}
            >
              <Printer className="w-5 h-5" />
              {t.print || 'Print'}
            </button>
          </div>
        </div>
      </div>

      {/* Prosta tabela do druku - tylko widoczna podczas drukowania */}
      <div className="hidden print:block">
        <table className="w-full border-collapse border-2 border-black">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black px-3 py-2 text-left font-bold">{t.tray || 'Tray'}</th>
              <th className="border border-black px-3 py-2 text-left font-bold">{t.product || 'Product'}</th>
              <th className="border border-black px-3 py-2 text-left font-bold">EAN</th>
              <th className="border border-black px-3 py-2 text-left font-bold">{t.program || 'Program'}</th>
              <th className="border border-black px-3 py-2 text-right font-bold">{t.quantity || 'Quantity'}</th>
            </tr>
          </thead>
          <tbody>
            {allTrays.map((row, idx) => (
              <tr key={`print-${row.trayId}-${idx}`}>
                <td className="border border-black px-3 py-2 font-bold">{row.trayId}</td>
                <td className="border border-black px-3 py-2">{row.product.name}</td>
                <td className="border border-black px-3 py-2 text-sm">{row.product.sku}</td>
                <td className="border border-black px-3 py-2 text-sm">{row.programName}</td>
                <td className="border border-black px-3 py-2 text-right font-bold">{row.quantity}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td colSpan="4" className="border border-black px-3 py-2">{t.total || 'TOTAL'}</td>
              <td className="border border-black px-3 py-2 text-right">{totalPieces} {t.pieces || 'pieces'}</td>
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
                <th className="px-4 py-3 text-left font-bold text-gray-700">{t.tray || 'Tray'}</th>
                <th className="px-4 py-3 text-left font-bold text-gray-700">{t.product || 'Product'}</th>
                <th className="px-4 py-3 text-left font-bold text-gray-700">EAN</th>
                <th className="px-4 py-3 text-left font-bold text-gray-700">{t.program || 'Program'}</th>
                <th className="px-4 py-3 text-right font-bold text-gray-700">{t.quantity || 'Quantity'}</th>
              </tr>
            </thead>
            <tbody>
              {allTraysWithBatch.map((row, index) => {
                const nextRow = allTraysWithBatch[index + 1];

                // Sprawdź czy to ostatni produkt w batchu
                const isLastInBatch = !nextRow || nextRow.batchNumber !== row.batchNumber;

                // Sprawdź czy następny wiersz to inna taca (ale ten sam batch)
                const isLastProductOnTray = row.isLastProductOnTray && nextRow && nextRow.batchNumber === row.batchNumber;

                return (
                  <React.Fragment key={`${row.trayId}-${index}`}>
                    <tr
                      className={`hover:bg-blue-50 transition-colors ${
                        row.product.isKey ? 'bg-yellow-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-6">
                        {row.isFirstProductOnTray ? (
                          <div className="w-10 h-10 rounded bg-blue-600 text-white flex items-center justify-center font-bold">
                            {row.trayId}
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded border-2 border-blue-300 text-blue-400 flex items-center justify-center font-bold text-xs">
                            ↓
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-6">
                        <div className="font-semibold text-gray-800">
                          {row.product.name}
                          {row.product.isKey && (
                            <span className="ml-2 px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded text-xs font-bold">
                              ★ {t.keyProduct || 'KEY'}
                            </span>
                          )}
                          {row.totalProductsOnTray > 1 && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                              {t.mixed || 'MIXED'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-6 text-sm text-gray-600">{row.product.sku}</td>
                      <td className="px-4 py-6 text-sm text-gray-600">{row.programName}</td>
                      <td className="px-4 py-6 text-right">
                        <span className="text-2xl font-bold text-blue-600">{row.quantity}</span>
                        <span className="text-sm text-gray-600 ml-1">{t.pcs || 'pcs'}</span>
                      </td>
                    </tr>
                    {/* Separator między tacami w tym samym batchu - szary */}
                    {isLastProductOnTray && (
                      <tr className="h-1 bg-gray-300">
                        <td colSpan="5" className="p-0"></td>
                      </tr>
                    )}
                    {/* Separator między batches - grubszy, niebieski */}
                    {isLastInBatch && (
                      <tr className="h-2 bg-blue-500">
                        <td colSpan="5" className="p-0"></td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-700">{t.totalPlanned || 'Total planned'}:</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {totalPieces} {t.piecesOn || 'pieces on'} {totalTrays} {t.trays || 'trays'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">{t.totalBakingTime || 'Total baking time'}</div>
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
