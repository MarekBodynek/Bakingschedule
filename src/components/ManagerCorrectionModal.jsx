import React, { useState } from 'react';
import { Edit3, Save, X, AlertCircle } from 'lucide-react';
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
  originalQuantity,
  onSave
}) => {
  const [adjustedQuantity, setAdjustedQuantity] = useState(originalQuantity);
  const [reason, setReason] = useState('');
  const [selectedReasonType, setSelectedReasonType] = useState('');

  if (!isOpen) return null;

  const difference = adjustedQuantity - originalQuantity;
  const differencePercent = originalQuantity > 0
    ? ((difference / originalQuantity) * 100).toFixed(1)
    : 0;

  // Vnaprej določeni razlogi
  const commonReasons = [
    { value: 'weather', label: '🌤️ Vreme', description: 'Lepo/slabo vreme vpliva na obisk' },
    { value: 'event', label: '🎪 Lokalni dogodek', description: 'Dogodek v mestu, sejem, festival' },
    { value: 'school', label: '🏫 Počitnice', description: 'Šolske počitnice, spremenjen obisk strank' },
    { value: 'competitor', label: '🏪 Konkurenca', description: 'Promocija pri konkurenci' },
    { value: 'promotion', label: '🎁 Naša promocija', description: 'Pričakujemo večji obisk' },
    { value: 'delivery', label: '🚚 Zamuda dobave', description: 'Težave z surovinami' },
    { value: 'staff', label: '👥 Osebje', description: 'Pomanjkanje osebja, več/manj ljudi' },
    { value: 'intuition', label: '💭 Intuicija', description: 'Izkušnje vodje' },
    { value: 'other', label: '❓ Drugo', description: 'Lasten razlog' }
  ];

  const handleSave = () => {
    if (difference === 0) {
      alert('Ni sprememb v količini');
      return;
    }

    if (!reason.trim() && !selectedReasonType) {
      alert('Navedite razlog popravka');
      return;
    }

    // Przygotuj kontekst
    const targetDate = new Date(date);
    const context = {
      dayOfWeek: targetDate.toLocaleDateString('sl-SI', { weekday: 'long' }),
      dayOfWeekNum: targetDate.getDay(),
      isWeekend: targetDate.getDay() === 0 || targetDate.getDay() === 6,
      wave: wave,
      reasonType: selectedReasonType,
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
      reason: reason.trim() || commonReasons.find(r => r.value === selectedReasonType)?.description || 'Brez opisa',
      reasonType: selectedReasonType,
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
              <h3 className="text-xl font-bold">Popravek količine</h3>
              <p className="text-sm text-blue-100">Val {wave} - {date}</p>
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
          {/* Informacje o produkcie */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-700">Izdelek:</span>
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
              Količina za proizvodnjo
            </label>

            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* Originalna količina */}
              <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-4 text-center">
                <div className="text-xs text-gray-600 mb-1">Generirano</div>
                <div className="text-3xl font-bold text-gray-700">{originalQuantity}</div>
                <div className="text-xs text-gray-500 mt-1">kosov</div>
              </div>

              {/* Popravljena količina */}
              <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4 text-center">
                <div className="text-xs text-blue-700 mb-1">Popravljeno</div>
                <input
                  type="number"
                  value={adjustedQuantity}
                  onChange={(e) => setAdjustedQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-3xl font-bold text-blue-600 bg-transparent text-center border-b-2 border-blue-300 focus:border-blue-500 focus:outline-none"
                  min="0"
                  autoFocus
                />
                <div className="text-xs text-blue-600 mt-1">kosov</div>
              </div>

              {/* Razlika */}
              <div className={`rounded-lg p-4 text-center border-2 ${
                difference > 0
                  ? 'bg-green-50 border-green-400'
                  : difference < 0
                  ? 'bg-red-50 border-red-400'
                  : 'bg-gray-100 border-gray-300'
              }`}>
                <div className="text-xs text-gray-600 mb-1">Razlika</div>
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
                onClick={() => setAdjustedQuantity(originalQuantity)}
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
              Razlog popravka
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {commonReasons.map(r => (
                <button
                  key={r.value}
                  onClick={() => setSelectedReasonType(r.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    selectedReasonType === r.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-sm">{r.label}</div>
                  <div className="text-xs text-gray-600">{r.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Lasten opis */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Dodatni opis (neobvezno)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="npr. Pričakujemo velik obisk zaradi..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows="3"
            />
          </div>

          {/* Opozorilo pri veliki spremembi */}
          {Math.abs(differencePercent) > 30 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Velika sprememba ({differencePercent}%)</p>
                <p>Sistem bo uporabil ta popravek za učenje in izboljšanje prihodnjih napovedi za ta izdelek.</p>
              </div>
            </div>
          )}
        </div>

        {/* Noga - Akcije */}
        <div className="bg-gray-50 p-4 rounded-b-lg flex items-center justify-between border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
          >
            Prekliči
          </button>
          <button
            onClick={handleSave}
            disabled={difference === 0 || (!reason.trim() && !selectedReasonType)}
            className={`px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors ${
              difference === 0 || (!reason.trim() && !selectedReasonType)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Save className="w-4 h-4" />
            Shrani popravek
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManagerCorrectionModal;
