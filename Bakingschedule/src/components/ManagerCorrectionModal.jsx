import React, { useState, useEffect } from 'react';
import { Edit3, X, AlertCircle } from 'lucide-react';
import { saveManagerCorrection } from '../utils/localStorage';

/**
 * MANAGER CORRECTION MODAL
 *
 * Pozwala managerowi edytować planowaną ilość dla produktu
 * Zapisuje:
 * - Oryginalną ilość
 * - Skorygowaną ilość
 * - Powód korekty
 * - Kontekst (dzień tygodnia, święta, pogoda, etc.)
 */
const ManagerCorrectionModal = ({
  isOpen,
  onClose,
  product,
  wave,
  date,
  originalQuantity, // Pierwotna wygenerowana wartość (nigdy się nie zmienia)
  currentQuantity, // Aktualna wartość (po korektach)
  onSave,
  translations
}) => {
  const t = translations || {};
  const [adjustedQuantity, setAdjustedQuantity] = useState(currentQuantity || originalQuantity);

  // Aktualizuj wartość gdy modal się otwiera
  useEffect(() => {
    if (isOpen) {
      setAdjustedQuantity(currentQuantity || originalQuantity);
    }
  }, [isOpen, currentQuantity, originalQuantity]);

  if (!isOpen) return null;

  const difference = adjustedQuantity - originalQuantity;
  const differencePercent = originalQuantity > 0
    ? ((difference / originalQuantity) * 100).toFixed(1)
    : 0;

  // Vnaprej določeni razlogi
  const commonReasons = [
    { value: 'weather', label: t.reasonWeather || '🌤️ Vreme', description: t.reasonWeatherDesc || 'Lepo/slabo vreme vpliva na obisk' },
    { value: 'event', label: t.reasonEvent || '🎪 Lokalni dogodek', description: t.reasonEventDesc || 'Dogodek v mestu, sejem, festival' },
    { value: 'school', label: t.reasonSchool || '🏫 Počitnice', description: t.reasonSchoolDesc || 'Šolske počitnice, spremenjen obisk strank' },
    { value: 'competitor', label: t.reasonCompetitor || '🏪 Konkurenca', description: t.reasonCompetitorDesc || 'Promocija pri konkurenci' },
    { value: 'promotion', label: t.reasonPromotion || '🎁 Naša promocija', description: t.reasonPromotionDesc || 'Pričakujemo večji obisk' },
    { value: 'delivery', label: t.reasonDelivery || '🚚 Zamuda dobave', description: t.reasonDeliveryDesc || 'Težave z surovinami' },
    { value: 'staff', label: t.reasonStaff || '👥 Osebje', description: t.reasonStaffDesc || 'Pomanjkanje osebja, več/manj ljudi' },
    { value: 'intuition', label: t.reasonIntuition || '💭 Intuicija', description: t.reasonIntuitionDesc || 'Izkušnje vodje' },
    { value: 'other', label: t.reasonOther || '❓ Drugo', description: t.reasonOtherDesc || 'Lasten razlog' }
  ];

  const handleSaveWithReason = (reasonType) => {
    if (difference === 0) {
      alert(t.noChangesInQuantity || 'Ni sprememb v količini');
      return;
    }

    // Przygotuj kontekst
    const targetDate = new Date(date);
    const context = {
      dayOfWeek: targetDate.toLocaleDateString('sl-SI', { weekday: 'long' }),
      dayOfWeekNum: targetDate.getDay(),
      isWeekend: targetDate.getDay() === 0 || targetDate.getDay() === 6,
      wave: wave,
      reasonType: reasonType,
      timestamp: new Date().toISOString()
    };

    // Zapisz korektę
    const correction = {
      date,
      wave,
      sku: product.sku,
      productName: product.name,
      originalQty: originalQuantity,
      adjustedQty: adjustedQuantity,
      difference: difference,
      differencePercent: parseFloat(differencePercent),
      reason: commonReasons.find(r => r.value === reasonType)?.description || t.noDescription || 'Brez opisa',
      reasonType: reasonType,
      context: context
    };

    saveManagerCorrection(correction);

    // Wywołaj callback
    if (onSave) {
      onSave(adjustedQuantity, correction);
    }

    // Zamknij modal
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Edit3 className="w-6 h-6" />
            <div>
              <h3 className="text-xl font-bold">{t.quantityCorrection || 'Popravek količine'}</h3>
              <p className="text-sm text-blue-100">{(t.waveDate || 'Val {wave} - {date}').replace('{wave}', wave).replace('{date}', date)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-blue-700 p-2 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Informacije o produkcie */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-700">{t.product || 'Izdelek'}:</span>
              <span className="text-gray-900 font-bold">{product.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>SKU:</span>
              <span className="font-mono">{product.sku}</span>
            </div>
          </div>

          {/* Urejanje količine */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {t.quantityForProduction || 'Količina za proizvodnjo'}
            </label>

            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* Originalna količina */}
              <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-4 text-center">
                <div className="text-xs text-gray-600 mb-1">{t.generated || 'Generirano'}</div>
                <div className="text-3xl font-bold text-gray-700">{originalQuantity}</div>
                <div className="text-xs text-gray-500 mt-1">{t.pieces || 'kosov'}</div>
              </div>

              {/* Popravljena količina */}
              <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4 text-center">
                <div className="text-xs text-blue-700 mb-1">{t.corrected || 'Popravljeno'}</div>
                <input
                  type="number"
                  value={adjustedQuantity}
                  onChange={(e) => setAdjustedQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-3xl font-bold text-blue-600 bg-transparent text-center border-b-2 border-blue-300 focus:border-blue-500 focus:outline-none"
                  min="0"
                  autoFocus
                />
                <div className="text-xs text-blue-600 mt-1">{t.pieces || 'kosov'}</div>
              </div>

              {/* Razlika */}
              <div className={`rounded-lg p-4 text-center border-2 ${
                difference > 0
                  ? 'bg-green-50 border-green-400'
                  : difference < 0
                  ? 'bg-red-50 border-red-400'
                  : 'bg-gray-100 border-gray-300'
              }`}>
                <div className="text-xs text-gray-600 mb-1">{t.difference || 'Razlika'}</div>
                <div className={`text-3xl font-bold ${
                  difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {difference > 0 ? '+' : ''}{difference}
                </div>
                <div className={`text-xs mt-1 ${
                  difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {difference > 0 ? '+' : ''}{differencePercent}%
                </div>
              </div>
            </div>

            {/* Quick adjust buttons */}
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setAdjustedQuantity(Math.max(0, adjustedQuantity - 10))}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-semibold"
              >
                -10
              </button>
              <button
                onClick={() => setAdjustedQuantity(Math.max(0, adjustedQuantity - 5))}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-semibold"
              >
                -5
              </button>
              <button
                onClick={() => setAdjustedQuantity(Math.max(0, adjustedQuantity - 1))}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-semibold"
              >
                -1
              </button>
              <button
                onClick={() => setAdjustedQuantity(currentQuantity || originalQuantity)}
                className="px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded text-sm font-semibold text-blue-700"
              >
                Reset
              </button>
              <button
                onClick={() => setAdjustedQuantity(adjustedQuantity + 1)}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-semibold"
              >
                +1
              </button>
              <button
                onClick={() => setAdjustedQuantity(adjustedQuantity + 5)}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-semibold"
              >
                +5
              </button>
              <button
                onClick={() => setAdjustedQuantity(adjustedQuantity + 10)}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-semibold"
              >
                +10
              </button>
            </div>
          </div>

          {/* Razlog popravka - izbira s seznama */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t.correctionReason || 'Razlog popravka'}
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {commonReasons.map(r => (
                <button
                  key={r.value}
                  onClick={() => handleSaveWithReason(r.value)}
                  className="p-3 rounded-lg border-2 text-left transition-all border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50"
                >
                  <div className="font-semibold text-sm">{r.label}</div>
                  <div className="text-xs text-gray-600">{r.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Opozorilo pri veliki spremembi */}
          {Math.abs(differencePercent) > 30 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">{(t.largeChange || 'Velika sprememba ({percent}%)').replace('{percent}', differencePercent)}</p>
                <p>{t.systemWillLearn || 'Sistem bo uporabil ta popravek za učenje in izboljšanje prihodnjih napovedi za ta izdelek.'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Noga - Akcije */}
        <div className="bg-gray-50 p-4 rounded-b-lg flex items-center justify-center border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
          >
            {t.cancel || 'Prekliči'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManagerCorrectionModal;
