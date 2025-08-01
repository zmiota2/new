import React, { useState, useEffect } from 'react';
import { Sale, SaleItem, Product, CreateSaleData } from '../types/inventory';
import { supabase } from '../utils/supabase';
import { ShoppingCart, Plus, Eye, Search, Calendar, User } from 'lucide-react';

export const SalesManager: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSales();
    loadProducts();
  }, []);

  const loadSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          items:sale_items(
            *,
            product:products(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (err) {
      console.error('Error loading sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  const handleCreateSale = async (saleData: CreateSaleData) => {
    try {
      // Calculate total amount
      const totalAmount = saleData.items.reduce((sum, item) => 
        sum + (item.quantity * item.unit_price), 0
      );

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          sale_number: saleData.sale_number,
          date: saleData.date,
          customer: saleData.customer,
          total_amount: totalAmount
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = saleData.items.map(item => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Create stock movements for each item (negative quantity for sales)
      const stockMovements = saleItems.map(item => ({
        product_id: item.product_id,
        movement_type: 'sale' as const,
        quantity: -item.quantity, // Negative for outgoing stock
        reference_id: item.sale_id,
        reference_type: 'sale_item' as const,
        notes: `Sprzedaż ${saleData.sale_number}`
      }));

      const { error: movementsError } = await supabase
        .from('stock_movements')
        .insert(stockMovements);

      if (movementsError) throw movementsError;

      await loadSales();
      setShowAddForm(false);
    } catch (err) {
      console.error('Error creating sale:', err);
    }
  };

  const filteredSales = sales.filter(sale =>
    sale.sale_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <ShoppingCart className="w-8 h-8 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-800">Zarządzanie sprzedażą</h2>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nowa sprzedaż</span>
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Szukaj sprzedaży..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-4 py-2 text-left">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>Data</span>
                </div>
              </th>
              <th className="border border-gray-200 px-4 py-2 text-left">Numer sprzedaży</th>
              <th className="border border-gray-200 px-4 py-2 text-left">
                <div className="flex items-center space-x-1">
                  <User className="w-4 h-4" />
                  <span>Klient</span>
                </div>
              </th>
              <th className="border border-gray-200 px-4 py-2 text-right">Pozycje</th>
              <th className="border border-gray-200 px-4 py-2 text-right">Suma</th>
              <th className="border border-gray-200 px-4 py-2 text-center">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((sale) => (
              <tr key={sale.id} className="hover:bg-gray-50">
                <td className="border border-gray-200 px-4 py-2">
                  {new Date(sale.date).toLocaleDateString('pl-PL')}
                </td>
                <td className="border border-gray-200 px-4 py-2 font-medium">
                  {sale.sale_number}
                </td>
                <td className="border border-gray-200 px-4 py-2">{sale.customer}</td>
                <td className="border border-gray-200 px-4 py-2 text-right">
                  {sale.items?.length || 0}
                </td>
                <td className="border border-gray-200 px-4 py-2 text-right font-medium">
                  {sale.total_amount.toFixed(2)} zł
                </td>
                <td className="border border-gray-200 px-4 py-2 text-center">
                  <button
                    onClick={() => setSelectedSale(sale)}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded"
                    title="Zobacz szczegóły"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddForm && (
        <SaleForm
          products={products}
          onSave={handleCreateSale}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {selectedSale && (
        <SaleModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </div>
  );
};

interface SaleFormProps {
  products: Product[];
  onSave: (data: CreateSaleData) => void;
  onCancel: () => void;
}

const SaleForm: React.FC<SaleFormProps> = ({ products, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    sale_number: `SP/${new Date().getFullYear()}/${String(Date.now()).slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    customer: '',
    items: [{ product_id: '', quantity: 1, unit_price: 0 }]
  });

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: 1, unit_price: 0 }]
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData({ ...formData, items: updatedItems });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const totalAmount = formData.items.reduce((sum, item) => 
    sum + (item.quantity * item.unit_price), 0
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800">Nowa sprzedaż</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numer sprzedaży
              </label>
              <input
                type="text"
                value={formData.sale_number}
                onChange={(e) => setFormData({ ...formData, sale_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Klient
              </label>
              <input
                type="text"
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-800">Pozycje sprzedaży</h4>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Dodaj pozycję</span>
              </button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border border-gray-200 rounded-lg">
                  <div className="md:col-span-2">
                    <select
                      value={item.product_id}
                      onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Wybierz produkt</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} (stan: {product.current_stock} {product.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="Ilość"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Cena jednostkowa"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      {(item.quantity * item.unit_price).toFixed(2)} zł
                    </span>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800 p-1 rounded"
                      >
                        <span className="text-sm">Usuń</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-800">Suma całkowita:</span>
                <span className="text-lg font-bold text-gray-800">{totalAmount.toFixed(2)} zł</span>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Zapisz sprzedaż
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Anuluj
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface SaleModalProps {
  sale: Sale;
  onClose: () => void;
}

const SaleModal: React.FC<SaleModalProps> = ({ sale, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">Szczegóły sprzedaży</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">Numer sprzedaży</span>
              </div>
              <p className="text-lg font-bold text-gray-800">{sale.sale_number}</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-600">Data</span>
              </div>
              <p className="text-lg font-bold text-gray-800">
                {new Date(sale.date).toLocaleDateString('pl-PL')}
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <User className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">Klient</span>
              </div>
              <p className="text-lg font-bold text-gray-800">{sale.customer}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-2 text-left">Produkt</th>
                  <th className="border border-gray-200 px-4 py-2 text-center">Ilość</th>
                  <th className="border border-gray-200 px-4 py-2 text-right">Cena jednostkowa</th>
                  <th className="border border-gray-200 px-4 py-2 text-right">Suma</th>
                </tr>
              </thead>
              <tbody>
                {sale.items?.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-2">
                      {item.product?.name}
                    </td>
                    <td className="border border-gray-200 px-4 py-2 text-center">
                      {item.quantity} {item.product?.unit}
                    </td>
                    <td className="border border-gray-200 px-4 py-2 text-right">
                      {item.unit_price.toFixed(2)} zł
                    </td>
                    <td className="border border-gray-200 px-4 py-2 text-right">
                      {item.total_price.toFixed(2)} zł
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={3} className="border border-gray-200 px-4 py-2 text-right">RAZEM:</td>
                  <td className="border border-gray-200 px-4 py-2 text-right">
                    {sale.total_amount.toFixed(2)} zł
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};