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

const OvenConfigurationModal = ({
  isOpen,
  onClose,
  onSave,
  currentLanguage,
  onLanguageChange,
  availableLanguages,
  translations
}) => {
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
  const [waveConfig, setWaveConfig] = useState({}); // Opening Hours and Waves

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
        if (savedPrograms.waveConfig) {
          setWaveConfig(savedPrograms.waveConfig);
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

      // 🔍 DEBUG: Show first 10 rows to understand file structure
      console.log('📄 First 10 rows of config file:');
      jsonData.slice(0, 10).forEach((row, idx) => {
        console.log(`Row ${idx} (${row.length} cols):`, row.slice(0, 12), '| L-T:', row.slice(11, 20));
      });

      // Parse data - skip first 4 rows (store name, empty, section headers, column headers)
      const products = [];
      const programs = new Set();
      const ovenCapacities = [];
      const detectedProgramDurations = {};
      const openingHoursAndWaves = {};

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];

        // Parse oven configuration from columns 5-6 (F-G: oven number, Number of Trays)
        // Row 2: [..., 1, 3, ...] means Oven 1 has 3 trays
        if (i >= 2 && i <= 10) {
          const ovenNumber = parseInt(row[5]);
          const ovenTrays = parseInt(row[6]);
          console.log(`Row ${i}: ovenNumber=${ovenNumber} (raw: ${row[5]}), ovenTrays=${ovenTrays} (raw: ${row[6]})`);
          if (ovenNumber && ovenTrays && !isNaN(ovenNumber) && !isNaN(ovenTrays)) {
            // Zapisz tylko jeśli jeszcze nie mamy tego pieca
            if (!ovenCapacities[ovenNumber - 1]) {
              ovenCapacities[ovenNumber - 1] = ovenTrays;
              console.log(`🔧 Detected Oven ${ovenNumber}: ${ovenTrays} trays`);
            }
          }
        }

        // Parse program durations from columns 8-9 (I-J: program name, duration)
        // Row 2: [..., "Program 1", 25, ...] means Program 1 takes 25 minutes
        if (i >= 2) {
          const programName = String(row[8] || '').trim();
          const duration = parseInt(row[9]);
          if (programName && duration && !isNaN(duration)) {
            const programMatch = programName.match(/program\s*(\d+)/i);
            if (programMatch) {
              const programNum = parseInt(programMatch[1]);
              if (!detectedProgramDurations[programNum]) {
                detectedProgramDurations[programNum] = duration;
                console.log(`⏱️ Detected Program ${programNum}: ${duration} minutes`);
              }
            }
          }
        }

        // Parse Opening Hours and Waves from columns L-S (indices 11-19)
        // Row 3-9: Monday-Sunday data
        if (i >= 2 && i <= 8) {
          // Convert Excel decimal time to HH:MM string
          const excelTimeToString = (value) => {
            if (!value || value === 'closed' || value === '') return value || '';
            if (typeof value === 'string') return value;
            // Excel stores time as fraction of day (e.g., 0.2916... = 7/24 = 07:00)
            const totalMinutes = Math.round(value * 24 * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          };

          const dayOfWeek = String(row[11] || '').trim().toLowerCase();
          const opening = excelTimeToString(row[12]);
          const closing = excelTimeToString(row[13]);
          const wave1Start = excelTimeToString(row[14]);
          const wave1Finish = excelTimeToString(row[15]);
          const wave2Start = excelTimeToString(row[16]);
          const wave2Finish = excelTimeToString(row[17]);
          const wave3Start = excelTimeToString(row[18]);
          const wave3Finish = excelTimeToString(row[19]);

          if (dayOfWeek && (opening || closing)) {
            // Calculate baking times (1 hour before wave start)
            const calcBakingTime = (waveStart) => {
              if (!waveStart || waveStart === 'closed') return '';
              const [hours, minutes] = waveStart.split(':').map(Number);
              const bakingHour = hours - 1;
              return `${bakingHour.toString().padStart(2, '0')}:${(minutes || 0).toString().padStart(2, '0')}`;
            };

            openingHoursAndWaves[dayOfWeek] = {
              opening,
              closing,
              wave1: {
                start: wave1Start,
                finish: wave1Finish,
                bakingTime: calcBakingTime(wave1Start)
              },
              wave2: wave2Start ? {
                start: wave2Start,
                finish: wave2Finish,
                bakingTime: calcBakingTime(wave2Start)
              } : null,
              wave3: {
                start: wave3Start,
                finish: wave3Finish,
                bakingTime: calcBakingTime(wave3Start)
              },
              isClosed: opening === 'closed' || closing === 'closed'
            };

            console.log(`📅 ${dayOfWeek}: ${opening}-${closing}, Wave1: ${wave1Start}-${wave1Finish} (bake: ${calcBakingTime(wave1Start)}), Wave2: ${wave2Start || 'none'}, Wave3: ${wave3Start}-${wave3Finish}`);
          }
        }

        // Parse product data (skip first 2 rows: title and column headers)
        if (i >= 2) {
          const eanCode = String(row[0] || '').trim();
          const name = String(row[1] || '').trim();
          const program = parseInt(row[2]);
          const unitsOnTray = parseInt(row[3]);

          // 🔍 DEBUG: Log each row being parsed
          if (i < 10) { // Log first few product rows
            console.log(`🔍 Row ${i} - EAN: "${eanCode}", Name: "${name}", Program: ${program}, Units: ${unitsOnTray}`);
          }

          // Stop if we hit info rows (oven config, program durations, etc.)
          if (eanCode.toLowerCase().includes('oven') ||
              eanCode.toLowerCase().includes('program')) {
            console.log(`🛑 Stopped parsing at row ${i} (found oven/program info)`);
            break;
          }

          // Pomiń puste wiersze
          if (!eanCode || !name || !program || !unitsOnTray) {
            if (i < 10) console.log(`⏭️ Skipping row ${i} (missing data)`);
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

      // 🔍 DEBUG: Show all parsed products
      console.log('📦 Parsed products:', products.length);
      products.forEach((p, idx) => {
        if (idx < 5) { // Show first 5 products
          console.log(`  ${idx + 1}. SKU: "${p.sku}", Name: "${p.name}", Program: ${p.program}, Units: ${p.unitsPerTray}`);
        }
      });

      // 🔍 DEBUG: Show parsed Opening Hours and Waves
      console.log('📅 Parsed Opening Hours and Waves:', Object.keys(openingHoursAndWaves).length, 'days');
      Object.entries(openingHoursAndWaves).forEach(([day, config]) => {
        if (!config.isClosed) {
          console.log(`  ${day}: Wave1 baking=${config.wave1.bakingTime}, Wave2 baking=${config.wave2?.bakingTime || 'none'}, Wave3 baking=${config.wave3.bakingTime}`);
        }
      });

      setProductConfig(products);
      setWaveConfig(openingHoursAndWaves);

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
      if (ovenCapacities.length > 0) {
        const totalCapacity = ovenCapacities.reduce((sum, cap) => sum + cap, 0);
        setOvenSettings({
          ovenCount: ovenCapacities.length,
          ovenCapacity: totalCapacity,
          individualCapacities: ovenCapacities
        });
      }

      let statusMsg = `✅ Naloženo ${products.length} izdelkov s ${programs.size} programi`;
      if (ovenCapacities.length > 0) {
        statusMsg += `\n🔧 Zaznano ${ovenCapacities.length} pečic:`;
        ovenCapacities.forEach((capacity, idx) => {
          statusMsg += `\n  • ${idx + 1}. pečica: ${capacity} ${capacity === 1 ? 'pladenj' : capacity <= 4 ? 'pladnji' : 'pladnjev'}`;
        });
        statusMsg += `\n  Skupaj: ${ovenCapacities.reduce((sum, cap) => sum + cap, 0)} pladnjev`;
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

  // Aktualizacja konfiguracji godzin otwarcia i fal
  const updateWaveConfig = (day, field, value) => {
    setWaveConfig(prev => {
      const newConfig = { ...prev };
      if (!newConfig[day]) {
        newConfig[day] = {
          opening: '',
          closing: '',
          wave1: { start: '', finish: '', bakingTime: '' },
          wave2: null,
          wave3: { start: '', finish: '', bakingTime: '' },
          isClosed: false
        };
      }

      // Handle nested fields like "wave1.start"
      if (field.includes('.')) {
        const [wave, subField] = field.split('.');
        newConfig[day] = {
          ...newConfig[day],
          [wave]: {
            ...newConfig[day][wave],
            [subField]: value
          }
        };
        // Recalculate baking time (1 hour before start)
        if (subField === 'start' && value) {
          const [hours, minutes] = value.split(':').map(Number);
          const bakingHour = hours - 1;
          newConfig[day][wave].bakingTime = `${bakingHour.toString().padStart(2, '0')}:${(minutes || 0).toString().padStart(2, '0')}`;
        }
      } else {
        newConfig[day] = {
          ...newConfig[day],
          [field]: value
        };
      }

      return newConfig;
    });
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
      ovenSettings: ovenSettings,
      waveConfig: waveConfig // Include wave configuration
    };
    saveProgramConfiguration(configToSave);

    setUploadStatus('✅ Konfiguracija shranjena!');

    setTimeout(() => {
      setUploadStatus('');
      if (onSave) {
        onSave({ productConfig, programConfig, ovenSettings, waveConfig });
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
          <h2 className="text-2xl font-bold text-gray-800">{translations?.configTitle || '⚙️ Konfiguracija'}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Language Selector Section - HIDDEN (Only Slovenian now) */}
          {false && (
          <div className="space-y-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {translations?.languageSettings || '1. Ustawienia języka'}
            </h3>
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-gray-700">
                {translations?.selectLanguage || 'Wybierz język:'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {availableLanguages?.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => onLanguageChange(lang.code)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                      currentLanguage === lang.code
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* Upload Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {translations?.uploadFiles || '2. Wgraj pliki konfiguracyjne'}
            </h3>

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
              <h3 className="text-lg font-semibold text-gray-800">
                {translations?.ovenPrograms || '3. Programy pieczenia'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {programs.map(programNum => (
                  <div key={programNum} className="border rounded-lg p-4 bg-gray-50">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {translations?.program || 'Program'} {programNum}
                    </label>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{translations?.programName || 'Program name'}</label>
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
                          {translations?.bakingTimeMinutes || 'Baking time (minutes)'}
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
                        {translations?.productsInProgram || 'Products in this program'}: {productConfig.filter(p => p.program === programNum).length}
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
                <h3 className="text-lg font-semibold text-gray-800">{translations?.ovenSettings || '3. Oven settings'}</h3>
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
                  + {translations?.addOven || 'Add oven'}
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
                        {idx + 1}. {translations?.ovenCapacityTrays || 'Oven - capacity (trays)'}
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
                        {translations?.remove || 'Remove'}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                {ovenSettings.individualCapacities && ovenSettings.individualCapacities.length > 0 ? (
                  <>
                    <p className="text-sm text-blue-800">
                      <strong>{translations?.individualOvens || 'Individual ovens'}:</strong> {ovenSettings.individualCapacities.map((cap, idx) =>
                        `${translations?.oven || 'Oven'} ${idx + 1}: ${cap} ${translations?.trays || 'trays'}`
                      ).join(' • ')}
                    </p>
                    <p className="text-sm text-blue-800">
                      <strong>{translations?.totalCapacity || 'Total capacity'}:</strong> {ovenSettings.individualCapacities.join(' + ')} =
                      <strong className="ml-1">{ovenSettings.ovenCapacity} {translations?.traysTotal || 'trays total'}</strong>
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-blue-800">
                    <strong>{translations?.totalCapacity || 'Total capacity'}:</strong> {ovenSettings.ovenCount} {translations?.ovens || 'ovens'} × {ovenSettings.ovenCapacity} {translations?.trays || 'trays'} =
                    <strong className="ml-1">{ovenSettings.ovenCount * ovenSettings.ovenCapacity} {translations?.traysAtOnce || 'trays at once'}</strong>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Opening Hours and Waves Configuration */}
          {Object.keys(waveConfig).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {translations?.openingHoursWaves || '4. Delovni čas in valovi'}
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left border">{translations?.day || 'Dan'}</th>
                      <th className="px-3 py-2 text-center border">{translations?.opening || 'Odprtje'}</th>
                      <th className="px-3 py-2 text-center border">{translations?.closing || 'Zaprtje'}</th>
                      <th className="px-3 py-2 text-center border bg-green-50">{translations?.wave1Start || 'Val 1'}</th>
                      <th className="px-3 py-2 text-center border bg-blue-50">{translations?.wave2Start || 'Val 2'}</th>
                      <th className="px-3 py-2 text-center border bg-orange-50">{translations?.wave3Start || 'Val 3'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                      const dayConfig = waveConfig[day];
                      if (!dayConfig) return null;

                      const dayNames = {
                        monday: translations?.monday || 'Ponedeljek',
                        tuesday: translations?.tuesday || 'Torek',
                        wednesday: translations?.wednesday || 'Sreda',
                        thursday: translations?.thursday || 'Četrtek',
                        friday: translations?.friday || 'Petek',
                        saturday: translations?.saturday || 'Sobota',
                        sunday: translations?.sunday || 'Nedelja'
                      };

                      return (
                        <tr key={day} className={`border-b hover:bg-gray-50 ${dayConfig.isClosed ? 'bg-red-50' : ''}`}>
                          <td className="px-3 py-2 border font-medium">{dayNames[day]}</td>
                          <td className="px-2 py-1 border">
                            <input
                              type="time"
                              value={dayConfig.opening || ''}
                              onChange={(e) => updateWaveConfig(day, 'opening', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-center text-sm"
                              disabled={dayConfig.isClosed}
                            />
                          </td>
                          <td className="px-2 py-1 border">
                            <input
                              type="time"
                              value={dayConfig.closing || ''}
                              onChange={(e) => updateWaveConfig(day, 'closing', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-center text-sm"
                              disabled={dayConfig.isClosed}
                            />
                          </td>
                          <td className="px-2 py-1 border bg-green-50">
                            <input
                              type="time"
                              value={dayConfig.wave1?.start || ''}
                              onChange={(e) => updateWaveConfig(day, 'wave1.start', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-center text-sm"
                              disabled={dayConfig.isClosed}
                            />
                          </td>
                          <td className="px-2 py-1 border bg-blue-50">
                            <input
                              type="time"
                              value={dayConfig.wave2?.start || ''}
                              onChange={(e) => updateWaveConfig(day, 'wave2.start', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-center text-sm"
                              disabled={dayConfig.isClosed}
                            />
                          </td>
                          <td className="px-2 py-1 border bg-orange-50">
                            <input
                              type="time"
                              value={dayConfig.wave3?.start || ''}
                              onChange={(e) => updateWaveConfig(day, 'wave3.start', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-center text-sm"
                              disabled={dayConfig.isClosed}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <strong>{translations?.bakingTimeNote || 'Opomba'}:</strong> {translations?.bakingTimeCalculation || 'Čas peke se izračuna samodejno (1 uro pred začetkom vala)'}
              </div>
            </div>
          )}

          {/* Product Preview */}
          {productConfig.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {translations?.productPreview || '5. Podgląd produktów'} {!showAllProducts && `${translations?.firstProducts || '(pierwsze 10)'}`}
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">{translations?.ean || 'EAN'}</th>
                      <th className="px-4 py-2 text-left">{translations?.name || 'Nazwa'}</th>
                      <th className="px-4 py-2 text-center">{translations?.program || 'Program'}</th>
                      <th className="px-4 py-2 text-center">{translations?.piecesPerTray || 'Sztuk/tacę'}</th>
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
                {productConfig.length > 10 && (
                  <div className="flex justify-center mt-3">
                    <button
                      onClick={() => setShowAllProducts(!showAllProducts)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition-colors"
                    >
                      {showAllProducts
                        ? `${translations?.showLess || 'Pokaż mniej'} ▲`
                        : `${translations?.showAll || 'Pokaż wszystkie'} (${productConfig.length}) ▼`
                      }
                    </button>
                  </div>
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
            {translations?.cancel || 'Anuluj'}
          </button>
          <button
            onClick={handleSave}
            disabled={productConfig.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save size={18} />
            {translations?.saveConfig || 'Zapisz konfigurację'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OvenConfigurationModal;
