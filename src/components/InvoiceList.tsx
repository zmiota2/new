import React, { useState, useMemo } from 'react';
import { Invoice } from '../types/invoice';
import { Search, Calendar, Building, DollarSign, FileText, Eye } from 'lucide-react';

interface InvoiceListProps {
  invoices: Invoice[];
  onViewInvoice: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({ invoices, onViewInvoice, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'vendor' | 'total'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredAndSortedInvoices = useMemo(() => {
    let filtered = invoices.filter(invoice =>
      invoice.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'vendor':
          aValue = a.vendor.toLowerCase();
          bValue = b.vendor.toLowerCase();
          break;
        case 'total':
          aValue = a.total_gross;
          bValue = b.total_gross;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [invoices, searchTerm, sortBy, sortOrder]);

  const handleSort = (field: 'date' | 'vendor' | 'total') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Lista faktur</h2>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Szukaj faktur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {filteredAndSortedInvoices.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Brak faktur do wyświetlenia</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-2 text-left">
                  <button
                    onClick={() => handleSort('date')}
                    className="flex items-center space-x-1 hover:text-blue-600"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Data</span>
                  </button>
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left">Numer faktury</th>
                <th className="border border-gray-200 px-4 py-2 text-left">
                  <button
                    onClick={() => handleSort('vendor')}
                    className="flex items-center space-x-1 hover:text-blue-600"
                  >
                    <Building className="w-4 h-4" />
                    <span>Dostawca</span>
                  </button>
                </th>
                <th className="border border-gray-200 px-4 py-2 text-right">Pozycje</th>
                <th className="border border-gray-200 px-4 py-2 text-right">Suma netto</th>
                <th className="border border-gray-200 px-4 py-2 text-right">
                  <button
                    onClick={() => handleSort('total')}
                    className="flex items-center space-x-1 hover:text-blue-600"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Suma brutto</span>
                  </button>
                </th>
                <th className="px-6 py-3 w-32">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-4 py-2">
                    {new Date(invoice.date).toLocaleDateString('pl-PL')}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 font-medium">
                    {invoice.invoice_number}
                  </td>
                  <td className="border border-gray-200 px-4 py-2">{invoice.vendor}</td>
                  <td className="border border-gray-200 px-4 py-2 text-right">
                    {invoice.items.length}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-right">
                    {invoice.total_net.toFixed(2)} zł
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-right font-medium">
                    {invoice.total_gross.toFixed(2)} zł
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-center">
                    <button
                      onClick={() => onViewInvoice(invoice)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded"
                      title="Zobacz szczegóły"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => onEdit(invoice)}
                    >
                      Edytuj
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => onDelete(invoice)}
                    >
                      Usuń
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600 text-center">
        Pokazano {filteredAndSortedInvoices.length} z {invoices.length} faktur
      </div>
    </div>
  );
};