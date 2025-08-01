import React from 'react';
import { Invoice } from '../types/invoice';
import { X, FileText, Calendar, Building, DollarSign } from 'lucide-react';

interface InvoiceModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ invoice, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">Szczegóły faktury</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">Numer faktury</span>
              </div>
              <p className="text-lg font-bold text-gray-800">{invoice.invoice_number}</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-600">Data</span>
              </div>
              <p className="text-lg font-bold text-gray-800">
                {new Date(invoice.date).toLocaleDateString('pl-PL')}
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Building className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">Dostawca</span>
              </div>
              <p className="text-lg font-bold text-gray-800">{invoice.vendor}</p>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-600">Suma brutto</span>
              </div>
              <p className="text-lg font-bold text-gray-800">{invoice.total_gross.toFixed(2)} zł</p>
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
                {invoice.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
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
                  <td className="border border-gray-200 px-4 py-2 text-right">{invoice.total_net.toFixed(2)} zł</td>
                  <td className="border border-gray-200 px-4 py-2 text-right">{invoice.total_gross.toFixed(2)} zł</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-6 text-sm text-gray-500 text-center">
            Przetworzono: {new Date(invoice.processed_at).toLocaleString('pl-PL')}
          </div>
        </div>
      </div>
    </div>
  );
};