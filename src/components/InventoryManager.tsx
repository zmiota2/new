import React, { useState, useEffect } from 'react';
import { Inventory, InventoryItem, Product, CreateInventoryData } from '../types/inventory';
import { supabase } from '../utils/supabase';
import { ClipboardList, Plus, Eye, Play, CheckCircle, Search } from 'lucide-react';
import { PDFGenerator } from '../utils/pdfGenerator';

export const InventoryManager: React.FC = () => {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInventories();
    loadProducts();
  }, []);

  const loadInventories = async () => {
    try {
      const { data, error } = await supabase
        .from('inventories')
        .select(`
          *,
          items:inventory_items(
            *,
            product:products(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInventories(data || []);
    } catch (err) {
      console.error('Error loading inventories:', err);
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

  const handleCreateInventory = async (inventoryData: CreateInventoryData) => {
    try {
      // Create inventory
      const { data: inventory, error: inventoryError } = await supabase
        .from('inventories')
        .insert([{
          name: inventoryData.name,
          status: 'draft'
        }])
        .select()
        .single();

      if (inventoryError) throw inventoryError;

      // Create inventory items with current stock as expected quantity
      const inventoryItems = inventoryData.product_ids.map(productId => {
        const product = products.find(p => p.id === productId);
        return {
          inventory_id: inventory.id,
          product_id: productId,
          expected_quantity: product?.current_stock || 0
        };
      });

      const { error: itemsError } = await supabase
        .from('inventory_items')
        .insert(inventoryItems);

      if (itemsError) throw itemsError;

      await loadInventories();
      setShowCreateForm(false);
    } catch (err) {
      console.error('Error creating inventory:', err);
    }
  };

  const handleStartInventory = async (inventoryId: string) => {
    try {
      const { error } = await supabase
        .from('inventories')
        .update({ status: 'in_progress' })
        .eq('id', inventoryId);

      if (error) throw error;
      await loadInventories();
    } catch (err) {
      console.error('Error starting inventory:', err);
    }
  };

  const handleCompleteInventory = async (inventoryId: string) => {
    try {
      // Update inventory status
      const { error: inventoryError } = await supabase
        .from('inventories')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', inventoryId);

      if (inventoryError) throw inventoryError;

      // Get inventory items with differences
      const { data: items, error: itemsError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('inventory_id', inventoryId)
        .not('difference', 'is', null);

      if (itemsError) throw itemsError;

      // Create stock movements for differences
      const stockMovements = items
        .filter(item => item.difference !== 0)
        .map(item => ({
          product_id: item.product_id,
          movement_type: 'inventory' as const,
          quantity: item.difference,
          reference_id: inventoryId,
          reference_type: 'inventory' as const,
          notes: `Korekta inwentaryzacyjna: ${item.difference > 0 ? 'nadwyżka' : 'niedobór'}`
        }));

      if (stockMovements.length > 0) {
        const { error: movementsError } = await supabase
          .from('stock_movements')
          .insert(stockMovements);

        if (movementsError) throw movementsError;
      }

      await loadInventories();
    } catch (err) {
      console.error('Error completing inventory:', err);
    }
  };

  const handleExportPDF = async (inventory: Inventory) => {
    try {
      // Load inventory items
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          product:products(*)
        `)
        .eq('inventory_id', inventory.id)
        .order('name', { foreignTable: 'products' });

      if (error) throw error;

      PDFGenerator.generateInventoryPDF(inventory, items || []);
    } catch (err) {
      console.error('Error exporting PDF:', err);
    }
  };

  const filteredInventories = inventories.filter(inventory =>
    inventory.name.toLowerCase().includes(searchTerm.toLowerCase())
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
          <ClipboardList className="w-8 h-8 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-800">Zarządzanie inwentaryzacją</h2>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nowa inwentaryzacja</span>
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Szukaj inwentaryzacji..."
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
              <th className="border border-gray-200 px-4 py-2 text-center">Status</th>
              <th className="border border-gray-200 px-4 py-2 text-right">Produkty</th>
              <th className="border border-gray-200 px-4 py-2 text-left">Data utworzenia</th>
              <th className="border border-gray-200 px-4 py-2 text-left">Data zakończenia</th>
              <th className="border border-gray-200 px-4 py-2 text-center">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventories.map((inventory) => (
              <tr key={inventory.id} className="hover:bg-gray-50">
                <td className="border border-gray-200 px-4 py-2 font-medium">
                  {inventory.name}
                </td>
                <td className="border border-gray-200 px-4 py-2 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    inventory.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                    inventory.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {inventory.status === 'draft' ? 'Szkic' :
                     inventory.status === 'in_progress' ? 'W trakcie' : 'Zakończona'}
                  </span>
                </td>
                <td className="border border-gray-200 px-4 py-2 text-right">
                  {inventory.items?.length || 0}
                </td>
                <td className="border border-gray-200 px-4 py-2">
                  {new Date(inventory.created_at).toLocaleDateString('pl-PL')}
                </td>
                <td className="border border-gray-200 px-4 py-2">
                  {inventory.completed_at 
                    ? new Date(inventory.completed_at).toLocaleDateString('pl-PL')
                    : '-'
                  }
                </td>
                <td className="border border-gray-200 px-4 py-2 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={() => setSelectedInventory(inventory)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded"
                      title="Zobacz szczegóły"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {inventory.status === 'draft' && (
                      <button
                        onClick={() => handleStartInventory(inventory.id)}
                        className="text-green-600 hover:text-green-800 p-1 rounded"
                        title="Rozpocznij inwentaryzację"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    {inventory.status === 'in_progress' && (
                      <button
                        onClick={() => handleCompleteInventory(inventory.id)}
                        className="text-purple-600 hover:text-purple-800 p-1 rounded"
                        title="Zakończ inwentaryzację"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    {inventory.status === 'completed' && (
                      <button
                        onClick={() => handleExportPDF(inventory)}
                        className="text-orange-600 hover:text-orange-800 p-1 rounded"
                        title="Eksportuj do PDF"
                      >
                        📄
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateForm && (
        <InventoryForm
          products={products}
          onSave={handleCreateInventory}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {selectedInventory && (
        <InventoryModal
          inventory={selectedInventory}
          onClose={() => setSelectedInventory(null)}
          onReload={loadInventories}
        />
      )}
    </div>
  );
};

interface InventoryFormProps {
  products: Product[];
  onSave: (data: CreateInventoryData) => void;
  onCancel: () => void;
}

const InventoryForm: React.FC<InventoryFormProps> = ({ products, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: `Inwentaryzacja ${new Date().toLocaleDateString('pl-PL')}`,
    product_ids: [] as string[]
  });

  const handleProductToggle = (productId: string) => {
    setFormData({
      ...formData,
      product_ids: formData.product_ids.includes(productId)
        ? formData.product_ids.filter(id => id !== productId)
        : [...formData.product_ids, productId]
    });
  };

  const handleSelectAll = () => {
    setFormData({
      ...formData,
      product_ids: formData.product_ids.length === products.length 
        ? [] 
        : products.map(p => p.id)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.product_ids.length === 0) {
      alert('Wybierz przynajmniej jeden produkt');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl max-h-[90vh] w-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800">Nowa inwentaryzacja</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nazwa inwentaryzacji
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
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Wybierz produkty do inwentaryzacji
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {formData.product_ids.length === products.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
              </button>
            </div>
            
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
              {products.map(product => (
                <label
                  key={product.id}
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={formData.product_ids.includes(product.id)}
                    onChange={() => handleProductToggle(product.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{product.name}</div>
                    <div className="text-sm text-gray-500">
                      Stan aktualny: {product.current_stock} {product.unit}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            
            <div className="mt-2 text-sm text-gray-600">
              Wybrano {formData.product_ids.length} z {products.length} produktów
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Utwórz inwentaryzację
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

interface InventoryModalProps {
  inventory: Inventory;
  onClose: () => void;
  onReload: () => void;
}

const InventoryModal: React.FC<InventoryModalProps> = ({ inventory, onClose, onReload }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInventoryItems();
  }, [inventory.id]);

  const loadInventoryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          product:products(*)
        `)
        .eq('inventory_id', inventory.id)
        .order('name', { foreignTable: 'products' });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error loading inventory items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCount = async (itemId: string, countedQuantity: number) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ 
          counted_quantity: countedQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;
      await loadInventoryItems();
    } catch (err) {
      console.error('Error updating count:', err);
    }
  };

  const totalDifference = items.reduce((sum, item) => sum + (item.difference || 0), 0);
  const countedItems = items.filter(item => item.counted_quantity !== null).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] w-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{inventory.name}</h2>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                <span>Status: {
                  inventory.status === 'draft' ? 'Szkic' :
                  inventory.status === 'in_progress' ? 'W trakcie' : 'Zakończona'
                }</span>
                <span>Policzono: {countedItems}/{items.length}</span>
                {totalDifference !== 0 && (
                  <span className={`font-medium ${totalDifference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Różnica: {totalDifference > 0 ? '+' : ''}{totalDifference}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {inventory.status === 'completed' && (
                <button
                  onClick={() => {
                    PDFGenerator.generateInventoryPDF(inventory, items);
                  }}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                >
                  Eksportuj PDF
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">Produkt</th>
                    <th className="border border-gray-200 px-4 py-2 text-center">Jednostka</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">Oczekiwana ilość</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">Policzono</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">Różnica</th>
                    <th className="border border-gray-200 px-4 py-2 text-center">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <InventoryItemRow
                      key={item.id}
                      item={item}
                      canEdit={inventory.status === 'in_progress'}
                      onUpdate={handleUpdateCount}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface InventoryItemRowProps {
  item: InventoryItem;
  canEdit: boolean;
  onUpdate: (itemId: string, countedQuantity: number) => void;
}

const InventoryItemRow: React.FC<InventoryItemRowProps> = ({ item, canEdit, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [countValue, setCountValue] = useState(item.counted_quantity || 0);

  const handleSave = () => {
    onUpdate(item.id, countValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setCountValue(item.counted_quantity || 0);
    setIsEditing(false);
  };

  const difference = item.difference || 0;

  return (
    <tr className={`hover:bg-gray-50 ${
      difference > 0 ? 'bg-green-50' : 
      difference < 0 ? 'bg-red-50' : ''
    }`}>
      <td className="border border-gray-200 px-4 py-2 font-medium">
        {item.product?.name}
      </td>
      <td className="border border-gray-200 px-4 py-2 text-center">
        {item.product?.unit}
      </td>
      <td className="border border-gray-200 px-4 py-2 text-right">
        {item.expected_quantity}
      </td>
      <td className="border border-gray-200 px-4 py-2 text-right">
        {isEditing ? (
          <input
            type="number"
            step="0.001"
            value={countValue}
            onChange={(e) => setCountValue(parseFloat(e.target.value) || 0)}
            className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
            autoFocus
          />
        ) : (
          item.counted_quantity !== null ? item.counted_quantity : '-'
        )}
      </td>
      <td className={`border border-gray-200 px-4 py-2 text-right font-medium ${
        difference > 0 ? 'text-green-600' : 
        difference < 0 ? 'text-red-600' : 'text-gray-600'
      }`}>
        {item.counted_quantity !== null ? (
          difference > 0 ? `+${difference}` : difference
        ) : '-'}
      </td>
      <td className="border border-gray-200 px-4 py-2 text-center">
        {canEdit && (
          <div className="flex items-center justify-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="text-green-600 hover:text-green-800 text-sm px-2 py-1 rounded"
                >
                  Zapisz
                </button>
                <button
                  onClick={handleCancel}
                  className="text-gray-600 hover:text-gray-800 text-sm px-2 py-1 rounded"
                >
                  Anuluj
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded"
              >
                {item.counted_quantity !== null ? 'Edytuj' : 'Policz'}
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
};