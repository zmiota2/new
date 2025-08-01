import React from 'react';
import { ParsedInvoiceData } from '../types/invoice';
import { FileText, Calendar, Building, DollarSign } from 'lucide-react';

interface InvoicePreviewProps {
  data: ParsedInvoiceData;
  onConfirm: () => void;
  onEdit: (data: ParsedInvoiceData) => void;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  data,
  onConfirm,
  onEdit
}) => {
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Podgląd faktury</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => onEdit(data)}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Edytuj
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Zatwierdź
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">Numer faktury</span>
          </div>
          <p className="text-lg font-bold text-gray-800">{data.invoiceNumber}</p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-600">Data</span>
          </div>
          <p className="text-lg font-bold text-gray-800">{data.date}</p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Building className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-600">Dostawca</span>
          </div>
          <p className="text-lg font-bold text-gray-800">{data.vendor}</p>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-600">Suma brutto</span>
          </div>
          <p className="text-lg font-bold text-gray-800">{data.totalGross.toFixed(2)} zł</p>
        </div>
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
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border border-gray-200 px-4 py-2">{item.name}</td>
                <td className="border border-gray-200 px-4 py-2 text-center">{item.quantity}</td>
                <td className="border border-gray-200 px-4 py-2 text-center">{item.unit}</td>
                <td className="border border-gray-200 px-4 py-2 text-center">{item.percentage}%</td>
                <td className="border border-gray-200 px-4 py-2 text-right">{item.net_price.toFixed(2)} zł</td>
                <td className="border border-gray-200 px-4 py-2 text-right">{item.gross_price.toFixed(2)} zł</td>
                <td className="border border-gray-200 px-4 py-2 text-right">{item.total_net.toFixed(2)} zł</td>
                <td className="border border-gray-200 px-4 py-2 text-right">{item.total_gross.toFixed(2)} zł</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td colSpan={6} className="border border-gray-200 px-4 py-2 text-right">RAZEM:</td>
              <td className="border border-gray-200 px-4 py-2 text-right">{data.totalNet.toFixed(2)} zł</td>
              <td className="border border-gray-200 px-4 py-2 text-right">{data.totalGross.toFixed(2)} zł</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};