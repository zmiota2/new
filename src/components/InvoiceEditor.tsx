import React, { useState } from 'react';
import { ParsedInvoiceData } from '../types/invoice';
import { Save, X, Plus, Trash2 } from 'lucide-react';

interface InvoiceEditorProps {
  data: ParsedInvoiceData;
  onSave: (data: ParsedInvoiceData) => void;
  onCancel: () => void;
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({ data, onSave, onCancel }) => {
  const [editedData, setEditedData] = useState<ParsedInvoiceData>({ ...data });

  const handleHeaderChange = (field: keyof ParsedInvoiceData, value: string | number) => {
    setEditedData({ ...editedData, [field]: value });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...editedData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate totals for the item
    const item = updatedItems[index];
    item.total_net = item.quantity * item.net_price;
    item.total_gross = item.quantity * item.gross_price;
    
    setEditedData({ ...editedData, items: updatedItems });
    recalculateTotals(updatedItems);
  };

  const addItem = () => {
    const newItem = {
      name: '',
      quantity: 1,
      unit: 'szt',
      percentage: 23,
      net_price: 0,
      gross_price: 0,
      total_net: 0,
      total_gross: 0
    };
    
    setEditedData({
      ...editedData,
      items: [...editedData.items, newItem]
    });
  };

  const removeItem = (index: number) => {
    const updatedItems = editedData.items.filter((_, i) => i !== index);
    setEditedData({ ...editedData, items: updatedItems });
    recalculateTotals(updatedItems);
  };

  const recalculateTotals = (items: typeof editedData.items) => {
    const totalNet = items.reduce((sum, item) => sum + item.total_net, 0);
    const totalGross = items.reduce((sum, item) => sum + item.total_gross, 0);
    
    setEditedData(prev => ({
      ...prev,
      items,
      totalNet,
      totalGross
    }));
  };

  const handleSave = () => {
    onSave(editedData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] w-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">Edycja faktury</h2>
            <div className="flex space-x-3">
              <button
                onClick={onCancel}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Anuluj</span>
              </button>
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Zapisz</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numer faktury
              </label>
              <input
                type="text"
                value={editedData.invoiceNumber}
                onChange={(e) => handleHeaderChange('invoiceNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data
              </label>
              <input
                type="date"
                value={editedData.date}
                onChange={(e) => handleHeaderChange('date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dostawca
              </label>
              <input
                type="text"
                value={editedData.vendor}
                onChange={(e) => handleHeaderChange('vendor', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">Pozycje faktury</h3>
              <button
                onClick={addItem}
                className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Dodaj pozycję</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">Nazwa</th>
                    <th className="border border-gray-200 px-4 py-2 text-center">Ilość</th>
                    <th className="border border-gray-200 px-4 py-2 text-center">Jednostka</th>
                    <th className="border border-gray-200 px-4 py-2 text-center">VAT%</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">Cena netto</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">Cena brutto</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">Suma netto</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">Suma brutto</th>
                    <th className="border border-gray-200 px-4 py-2 text-center">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {editedData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-gray-200 px-2 py-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                      <td className="border border-gray-200 px-2 py-2">
                        <input
                          type="number"
                          step="0.001"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                        />
                      </td>
                      <td className="border border-gray-200 px-2 py-2">
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="szt">szt</option>
                          <option value="kg">kg</option>
                          <option value="l">l</option>
                          <option value="m">m</option>
                          <option value="m2">m²</option>
                          <option value="m3">m³</option>
                          <option value="godz">godz</option>
                        </select>
                      </td>
                      <td className="border border-gray-200 px-2 py-2">
                        <input
                          type="number"
                          value={item.percentage}
                          onChange={(e) => handleItemChange(index, 'percentage', parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                        />
                      </td>
                      <td className="border border-gray-200 px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.net_price}
                          onChange={(e) => handleItemChange(index, 'net_price', parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                        />
                      </td>
                      <td className="border border-gray-200 px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.gross_price}
                          onChange={(e) => handleItemChange(index, 'gross_price', parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                        />
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-right text-sm">
                        {item.total_net.toFixed(2)} zł
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-right text-sm">
                        {item.total_gross.toFixed(2)} zł
                      </td>
                      <td className="border border-gray-200 px-2 py-2 text-center">
                        <button
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800 p-1 rounded"
                          title="Usuń pozycję"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan={6} className="border border-gray-200 px-4 py-2 text-right">RAZEM:</td>
                    <td className="border border-gray-200 px-4 py-2 text-right">{editedData.totalNet.toFixed(2)} zł</td>
                    <td className="border border-gray-200 px-4 py-2 text-right">{editedData.totalGross.toFixed(2)} zł</td>
                    <td className="border border-gray-200 px-4 py-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};