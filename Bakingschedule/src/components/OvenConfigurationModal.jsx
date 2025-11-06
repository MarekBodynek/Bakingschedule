import React, { useState, useEffect } from 'react';
import { X, Upload, Save, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getOvenConfiguration,
  saveOvenConfiguration,
  getProgramConfiguration,
  saveProgramConfiguration
} from '../utils/localStorage.js';

/**
 * OVEN CONFIGURATION MODAL
 *
 * Pozwala na konfigurację:
 * - Wczytanie pliku Excel z produktami (EAN, nazwa, program, sztuki na tacę)
 * - Ustawienie czasu trwania każdego programu
 * - Ustawienie ilości i pojemności pieców
 */

const OvenConfigurationModal = ({ isOpen, onClose, onSave }) => {
  const [productConfig, setProductConfig] = useState([]); // Produkty z pliku Excel
  const [programConfig, setProgramConfig] = useState({}); // Konfiguracja programów
  const [ovenSettings, setOvenSettings] = useState({
    ovenCount: 2,
    ovenCapacity: 4 // ile tacek w jednym piecu
  });
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);

  // Wczytaj zapisaną konfigurację
  useEffect(() => {
    if (isOpen) {
      const savedProducts = getOvenConfiguration();
      const savedPrograms = getProgramConfiguration();

      if (savedProducts && savedProducts.length > 0) {
        setProductConfig(savedProducts);
      }

      if (savedPrograms && Object.keys(savedPrograms).length > 0) {
        setProgramConfig(savedPrograms);
        if (savedPrograms.ovenSettings) {
          setOvenSettings(savedPrograms.ovenSettings);
        }
      }
    }
  }, [isOpen]);

  // Obsługa przeciągnięcia pliku
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Obsługa upuszczenia pliku
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // Obsługa wyboru pliku
  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // Parsowanie pliku Excel
  const handleFileUpload = async (file) => {
    setError('');
    setUploadStatus('Nalagam datoteko...');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      // Parse data - skip first 2 rows (headers)
      const products = [];
      const programs = new Set();
      let detectedOvenConfig = null;
      const detectedProgramDurations = {};

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];

        // Check for oven configuration (Row 28 or similar)
        const cellText = String(row[0] || '').toLowerCase();
        if (cellText.includes('oven') && cellText.includes('tray')) {
          // Parse: "In the store there are 3 ovens: 3 tray oven, 3 tray oven and 6 trays oven"
          const ovenMatches = cellText.match(/(\d+)\s*tray/g);
          if (ovenMatches) {
            const ovenCapacities = ovenMatches.map(m => parseInt(m.match(/(\d+)/)[1]));
            const totalCapacity = ovenCapacities.reduce((sum, cap) => sum + cap, 0);
            detectedOvenConfig = {
              ovenCount: ovenCapacities.length,
              ovenCapacity: totalCapacity,
              individualCapacities: ovenCapacities
            };
            console.log('🔧 Detected oven config:', detectedOvenConfig);
          }
        }

        // Check for program durations (e.g., "Program 1 – 25 minut")
        if (cellText.includes('program') && cellText.includes('minut')) {
          const programMatch = cellText.match(/program\s*(\d+)\s*[–-]\s*(\d+)\s*minut/i);
          if (programMatch) {
            const programNum = parseInt(programMatch[1]);
            const duration = parseInt(programMatch[2]);
            detectedProgramDurations[programNum] = duration;
            console.log(`⏱️ Detected Program ${programNum}: ${duration} minutes`);
          }
        }

        // Parse product data (skip first 2 rows, stop at empty or info rows)
        if (i >= 3) {
          const eanCode = String(row[0] || '').trim();
          const name = String(row[1] || '').trim();
          const program = parseInt(row[2]);
          const unitsOnTray = parseInt(row[3]);

          // Stop if we hit info rows (oven config, program durations, etc.)
          if (eanCode.toLowerCase().includes('oven') ||
              eanCode.toLowerCase().includes('program')) {
            break;
          }

          // Pomiń puste wiersze
          if (!eanCode || !name || !program || !unitsOnTray) {
            continue;
          }

          products.push({
            sku: eanCode, // Użyj EAN jako SKU
            name: name,
            program: program,
            unitsPerTray: unitsOnTray
          });

          programs.add(program);
        }
      }

      if (products.length === 0) {
        setError('V datoteki ni bilo najdenih izdelkov. Preveri format.');
        setUploadStatus('');
        return;
      }

      setProductConfig(products);

      // Inicjalizuj programy z wykrytymi czasami
      const newProgramConfig = { ...programConfig };
      programs.forEach(programNum => {
        if (!newProgramConfig[programNum]) {
          newProgramConfig[programNum] = {
            name: `Program ${programNum}`,
            durationMinutes: detectedProgramDurations[programNum] || 20 // użyj wykrytego czasu lub domyślnie 20 minut
          };
        } else if (detectedProgramDurations[programNum]) {
          // Update duration if detected in file
          newProgramConfig[programNum].durationMinutes = detectedProgramDurations[programNum];
        }
      });
      setProgramConfig(newProgramConfig);

      // Ustaw wykrytą konfigurację pieców
      if (detectedOvenConfig) {
        setOvenSettings({
          ovenCount: detectedOvenConfig.ovenCount,
          ovenCapacity: detectedOvenConfig.ovenCapacity,
          individualCapacities: detectedOvenConfig.individualCapacities
        });
      }

      let statusMsg = `✅ Naloženo ${products.length} izdelkov s ${programs.size} programi`;
      if (detectedOvenConfig) {
        statusMsg += `\n🔧 Zaznano ${detectedOvenConfig.ovenCount} pečic:`;
        detectedOvenConfig.individualCapacities.forEach((capacity, idx) => {
          statusMsg += `\n  • ${idx + 1}. pečica: ${capacity} ${capacity === 1 ? 'pladenj' : capacity <= 4 ? 'pladnji' : 'pladnjev'}`;
        });
        statusMsg += `\n  Skupaj: ${detectedOvenConfig.ovenCapacity} pladnjev`;
      }
      if (Object.keys(detectedProgramDurations).length > 0) {
        statusMsg += `\n⏱️ Zaznani časi za ${Object.keys(detectedProgramDurations).length} programov`;
      }

      setUploadStatus(statusMsg);

      setTimeout(() => setUploadStatus(''), 5000);

    } catch (err) {
      console.error('Error parsing Excel:', err);
      setError('Napaka pri nalaganju datoteke: ' + err.message);
      setUploadStatus('');
    }
  };

  // Aktualizacja konfiguracji programu
  const updateProgramConfig = (programNum, field, value) => {
    setProgramConfig(prev => ({
      ...prev,
      [programNum]: {
        ...prev[programNum],
        [field]: value
      }
    }));
  };

  // Zapisz konfigurację
  const handleSave = () => {
    if (productConfig.length === 0) {
      setError('Najprej naloži datoteko Excel z izdelki');
      return;
    }

    // Sprawdź czy wszystkie programy mają uzupełnione dane
    const programs = [...new Set(productConfig.map(p => p.program))];
    const missingConfig = programs.some(p => !programConfig[p] || !programConfig[p].durationMinutes);

    if (missingConfig) {
      setError('Izpolni čase za vse programe');
      return;
    }

    // Zapisz do localStorage
    saveOvenConfiguration(productConfig);

    const configToSave = {
      ...programConfig,
      ovenSettings: ovenSettings
    };
    saveProgramConfiguration(configToSave);

    setUploadStatus('✅ Konfiguracija shranjena!');

    setTimeout(() => {
      setUploadStatus('');
      if (onSave) {
        onSave({ productConfig, programConfig, ovenSettings });
      }
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  const programs = [...new Set(productConfig.map(p => p.program))].sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">⚙️ Konfiguracija pečice</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Upload Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">1. Naloži konfiguracijo izdelkov</h3>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-600 mb-2">
                Povleci in spusti datoteko Excel ali klikni za izbiro
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Format: EAN koda | Naziv | Program | Kosov na pladnju
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="excel-upload"
              />
              <label
                htmlFor="excel-upload"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
              >
                Izberi datoteko
              </label>
            </div>

            {uploadStatus && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                <CheckCircle size={20} />
                <span>{uploadStatus}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {productConfig.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  📦 Naloženih izdelkov: <strong>{productConfig.length}</strong>
                </p>
                <p className="text-sm text-gray-700">
                  🔧 Programov: <strong>{programs.length}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Program Configuration */}
          {programs.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">2. Nastavi čase programov</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {programs.map(programNum => (
                  <div key={programNum} className="border rounded-lg p-4 bg-gray-50">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Program {programNum}
                    </label>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Naziv programa</label>
                        <input
                          type="text"
                          value={programConfig[programNum]?.name || ''}
                          onChange={(e) => updateProgramConfig(programNum, 'name', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          placeholder={`Program ${programNum}`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Čas pečenja (minute)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={programConfig[programNum]?.durationMinutes || ''}
                          onChange={(e) => updateProgramConfig(programNum, 'durationMinutes', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          placeholder="20"
                        />
                      </div>

                      <div className="text-xs text-gray-500">
                        Izdelkov v tem programu: {productConfig.filter(p => p.program === programNum).length}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Oven Settings */}
          {programs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">3. Nastavi pečice v trgovini</h3>
                <button
                  onClick={() => {
                    const newCapacities = [...(ovenSettings.individualCapacities || []), 4];
                    setOvenSettings({
                      ovenCount: newCapacities.length,
                      ovenCapacity: newCapacities.reduce((sum, cap) => sum + cap, 0),
                      individualCapacities: newCapacities
                    });
                  }}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold"
                >
                  + Dodaj pečico
                </button>
              </div>

              {/* Individual Ovens */}
              <div className="space-y-3">
                {(ovenSettings.individualCapacities || [3, 3, 6]).map((capacity, idx) => (
                  <div key={idx} className="border rounded-lg p-4 bg-gray-50 flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                        {idx + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {idx + 1}. pečica - kapaciteta (pladnji)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={capacity}
                        onChange={(e) => {
                          const newCapacities = [...(ovenSettings.individualCapacities || [3, 3, 6])];
                          newCapacities[idx] = parseInt(e.target.value) || 1;
                          setOvenSettings({
                            ovenCount: newCapacities.length,
                            ovenCapacity: newCapacities.reduce((sum, cap) => sum + cap, 0),
                            individualCapacities: newCapacities
                          });
                        }}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="4"
                      />
                    </div>
                    {ovenSettings.individualCapacities && ovenSettings.individualCapacities.length > 1 && (
                      <button
                        onClick={() => {
                          const newCapacities = (ovenSettings.individualCapacities || []).filter((_, i) => i !== idx);
                          setOvenSettings({
                            ovenCount: newCapacities.length,
                            ovenCapacity: newCapacities.reduce((sum, cap) => sum + cap, 0),
                            individualCapacities: newCapacities
                          });
                        }}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold flex-shrink-0"
                      >
                        Odstrani
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                {ovenSettings.individualCapacities && ovenSettings.individualCapacities.length > 0 ? (
                  <>
                    <p className="text-sm text-blue-800">
                      <strong>Posamezne pečice:</strong> {ovenSettings.individualCapacities.map((cap, idx) =>
                        `Pečica ${idx + 1}: ${cap} pladnjev`
                      ).join(' • ')}
                    </p>
                    <p className="text-sm text-blue-800">
                      <strong>Skupna kapaciteta:</strong> {ovenSettings.individualCapacities.join(' + ')} =
                      <strong className="ml-1">{ovenSettings.ovenCapacity} pladnjev skupaj</strong>
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-blue-800">
                    <strong>Skupna kapaciteta:</strong> {ovenSettings.ovenCount} pečic × {ovenSettings.ovenCapacity} pladnjev =
                    <strong className="ml-1">{ovenSettings.ovenCount * ovenSettings.ovenCapacity} pladnjev na enkrat</strong>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Product Preview */}
          {productConfig.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  4. Pregled izdelkov {!showAllProducts && `(prvih 10)`}
                </h3>
                {productConfig.length > 10 && (
                  <button
                    onClick={() => setShowAllProducts(!showAllProducts)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition-colors"
                  >
                    {showAllProducts ? 'Pokaži manj' : `Pokaži vse (${productConfig.length})`}
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">EAN</th>
                      <th className="px-4 py-2 text-left">Naziv</th>
                      <th className="px-4 py-2 text-center">Program</th>
                      <th className="px-4 py-2 text-center">Kosov/pladenj</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllProducts ? productConfig : productConfig.slice(0, 10)).map((product, idx) => {
                      // Znajdź prawdziwy indeks w pełnym productConfig
                      const realIdx = showAllProducts ? idx : productConfig.findIndex(p => p.sku === product.sku);

                      return (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono text-xs">{product.sku}</td>
                          <td className="px-4 py-2">{product.name}</td>
                          <td className="px-4 py-2 text-center">
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={product.program}
                              onChange={(e) => {
                                const newConfig = [...productConfig];
                                newConfig[realIdx].program = parseInt(e.target.value) || 1;
                                setProductConfig(newConfig);
                              }}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={product.unitsPerTray}
                              onChange={(e) => {
                                const newConfig = [...productConfig];
                                newConfig[realIdx].unitsPerTray = parseInt(e.target.value) || 1;
                                setProductConfig(newConfig);
                              }}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!showAllProducts && productConfig.length > 10 && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    ... in še {productConfig.length - 10} izdelkov
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Prekliči
          </button>
          <button
            onClick={handleSave}
            disabled={productConfig.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save size={18} />
            Shrani konfiguracijo
          </button>
        </div>
      </div>
    </div>
  );
};

export default OvenConfigurationModal;
