import React, { useState, useEffect } from 'react';
import { Product } from '../types/inventory';
import { supabase } from '../utils/supabase';
import { Package, Plus, Edit, Trash2, AlertTriangle, Search } from 'lucide-react';

interface ProductManagerProps {
  onProductSelect?: (product: Product) => void;
}

export const ProductManager: React.FC<ProductManagerProps> = ({ onProductSelect }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (productData: Partial<Product>) => {
    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update({
            ...productData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;
      }

      await loadProducts();
      setShowAddForm(false);
      setEditingProduct(null);
    } catch (err) {
      console.error('Error saving product:', err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten produkt?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockProducts = products.filter(p => p.current_stock <= p.min_stock_level);

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
          <Package className="w-8 h-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">Zarządzanie produktami</h2>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Dodaj produkt</span>
        </button>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span className="font-medium text-orange-800">Niski stan magazynowy</span>
          </div>
          <div className="text-sm text-orange-700">
            {lowStockProducts.map(p => (
              <div key={p.id}>
                {p.name}: {p.current_stock} {p.unit} (min: {p.min_stock_level})
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Szukaj produktów..."
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
              <th className="border border-gray-200 px-4 py-2 text-left">Nazwa</th>
              <th className="border border-gray-200 px-4 py-2 text-center">Jednostka</th>
              <th className="border border-gray-200 px-4 py-2 text-right">Stan aktualny</th>
              <th className="border border-gray-200 px-4 py-2 text-right">Min. poziom</th>
              <th className="border border-gray-200 px-4 py-2 text-right">Ostatnia cena</th>
              <th className="border border-gray-200 px-4 py-2 text-center">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr 
                key={product.id} 
                className={`hover:bg-gray-50 ${
                  product.current_stock <= product.min_stock_level ? 'bg-orange-50' : ''
                } ${onProductSelect ? 'cursor-pointer' : ''}`}
                onClick={() => onProductSelect?.(product)}
              >
                <td className="border border-gray-200 px-4 py-2 font-medium">{product.name}</td>
                <td className="border border-gray-200 px-4 py-2 text-center">{product.unit}</td>
                <td className="border border-gray-200 px-4 py-2 text-right">
                  <span className={product.current_stock <= product.min_stock_level ? 'text-orange-600 font-medium' : ''}>
                    {product.current_stock}
                  </span>
                </td>
                <td className="border border-gray-200 px-4 py-2 text-right">{product.min_stock_level}</td>
                <td className="border border-gray-200 px-4 py-2 text-right">
                  {product.last_purchase_price?.toFixed(2) || '0.00'} zł
                </td>
                <td className="border border-gray-200 px-4 py-2 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProduct(product);
                        setShowAddForm(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded"
                      title="Edytuj"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProduct(product.id);
                      }}
                      className="text-red-600 hover:text-red-800 p-1 rounded"
                      title="Usuń"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showAddForm || editingProduct) && (
        <ProductForm
          product={editingProduct}
          onSave={handleSaveProduct}
          onCancel={() => {
            setShowAddForm(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
};

interface ProductFormProps {
  product?: Product | null;
  onSave: (data: Partial<Product>) => void;
  onCancel: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    unit: product?.unit || 'szt',
    min_stock_level: product?.min_stock_level || 0,
    current_stock: product?.current_stock || 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          {product ? 'Edytuj produkt' : 'Dodaj nowy produkt'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nazwa produktu
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jednostka
            </label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="szt">szt</option>
              <option value="kg">kg</option>
              <option value="l">l</option>
              <option value="m">m</option>
              <option value="m2">m²</option>
              <option value="m3">m³</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimalny poziom magazynowy
            </label>
            <input
              type="number"
              step="0.001"
              value={formData.min_stock_level}
              onChange={(e) => setFormData({ ...formData, min_stock_level: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {!product && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stan początkowy
              </label>
              <input
                type="number"
                step="0.001"
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {product ? 'Zapisz zmiany' : 'Dodaj produkt'}
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