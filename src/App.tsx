import { useState, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { InvoicePreview } from './components/InvoicePreview';
import { InvoiceList } from './components/InvoiceList';
import { InvoiceModal } from './components/InvoiceModal';
import { InvoiceEditor } from './components/InvoiceEditor';
import { DatabaseConfig } from './components/DatabaseConfig';
import { ProductManager } from './components/ProductManager';
import { SalesManager } from './components/SalesManager';
import { InventoryManager } from './components/InventoryManager';
import { InvoicePDFParser } from './utils/pdfParser';
import { supabase } from './utils/supabase';
import { Invoice, ParsedInvoiceData } from './types/invoice';
import { Product } from './types/inventory';
import { FileText, Upload, List, AlertCircle, Package, ShoppingCart, ClipboardList } from 'lucide-react';

type ViewMode = 'upload' | 'preview' | 'list' | 'products' | 'sales' | 'inventory' | 'database';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedInvoiceData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [, setProducts] = useState<Product[]>([]);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadInvoices();
    loadProducts();
  }, []);

  const loadInvoices = async () => {
    try {
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select(`
          *,
          items:invoice_items(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(invoice || []);
    } catch (err) {
      console.error('Error loading invoices:', err);
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

  const handleFileSelect = async (file: File) => {
    setError('');
    setSuccess(false);
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      console.log('Starting AI-powered PDF parsing...');
      const data = await InvoicePDFParser.parsePDF(arrayBuffer);
      
      setParsedData(data);
      setViewMode('preview');
      setSuccess(true);
      console.log('PDF parsing completed successfully:', data);
    } catch (err) {
      setError('Błąd podczas analizy pliku PDF z AI');
      console.error('Error parsing PDF:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmInvoice = async () => {
    if (!parsedData) return;

    try {
      setIsProcessing(true);

      // Zapisz fakturę
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([
          {
            filename: 'uploaded.pdf',
            invoice_number: parsedData.invoiceNumber,
            date: parsedData.date,
            vendor: parsedData.vendor,
            total_net: parsedData.totalNet,
            total_gross: parsedData.totalGross,
            processed_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Zapisz pozycje faktury
      const items = parsedData.items.map(item => ({
        invoice_id: invoice.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        percentage: item.percentage,
        net_price: item.net_price,
        gross_price: item.gross_price,
        total_net: item.total_net,
        total_gross: item.total_gross
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(items);

      if (itemsError) throw itemsError;

      // Create or update products and stock movements
      for (const item of parsedData.items) {
        // Check if product exists
        let { data: existingProduct, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('name', item.name)
          .single();

        if (productError && productError.code !== 'PGRST116') {
          throw productError;
        }

        let productId;
        if (!existingProduct) {
          // Create new product
          const { data: newProduct, error: createError } = await supabase
            .from('products')
            .insert([{
              name: item.name,
              unit: item.unit,
              current_stock: 0,
              min_stock_level: 0,
              last_purchase_price: item.net_price
            }])
            .select()
            .single();

          if (createError) throw createError;
          productId = newProduct.id;
        } else {
          productId = existingProduct.id;
        }

        // Create stock movement for purchase
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert([{
            product_id: productId,
            movement_type: 'purchase',
            quantity: item.quantity,
            reference_id: invoice.id,
            reference_type: 'invoice_item',
            notes: `Zakup z faktury ${parsedData.invoiceNumber}`
          }]);

        if (movementError) throw movementError;
      }

      // Odśwież listę faktur
      await loadInvoices();
      await loadProducts();
      
      // Przejdź do listy
      setViewMode('list');
      setParsedData(null);
      setSuccess(true);
      
    } catch (err) {
      setError('Błąd podczas zapisywania faktury');
      console.error('Error saving invoice:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditInvoice = (data: ParsedInvoiceData) => {
    setParsedData(data);
    setShowEditor(true);
  };

  const handleSaveEditedInvoice = (data: ParsedInvoiceData) => {
    setParsedData(data);
    setShowEditor(false);
    setViewMode('preview');
  };

  const handleCancelEdit = () => {
    setShowEditor(false);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
  };

  const handleCloseModal = () => {
    setSelectedInvoice(null);
  };

  const handleEdit = (invoice: Invoice) => setEditingInvoice(invoice);
  const handleSave = (updated: Invoice) => {
    // Zaktualizuj fakturę w stanie i/lub bazie danych
    setInvoices(invoices.map(inv => inv.id === updated.id ? updated : inv));
    setEditingInvoice(null);
  };
  const handleCancel = () => setEditingInvoice(null);

  // Funkcja do usuwania faktury
  const handleDeleteInvoice = async (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    try {
      setIsProcessing(true);
      // Usuń pozycje powiązane z fakturą
      await supabase.from('invoice_items').delete().eq('invoice_id', invoiceToDelete.id);
      // Usuń fakturę
      await supabase.from('invoices').delete().eq('id', invoiceToDelete.id);
      // Odśwież listę faktur
      await loadInvoices();
      setInvoiceToDelete(null);
      setShowDeleteConfirm(false);
      setSuccess(true);
    } catch (err) {
      setError('Błąd podczas usuwania faktury');
      console.error('Error deleting invoice:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelDeleteInvoice = () => {
    setInvoiceToDelete(null);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-800">System Faktur PDF</h1>
            </div>
            
            <nav className="flex space-x-4">
              <button
                onClick={() => setViewMode('upload')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'upload'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </button>
              
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <List className="w-4 h-4" />
                <span>Lista faktur</span>
              </button>
              
              <button
                onClick={() => setViewMode('products')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'products'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Produkty</span>
              </button>
              
              <button
                onClick={() => setViewMode('sales')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'sales'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Sprzedaż</span>
              </button>
              
              <button
                onClick={() => setViewMode('inventory')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'inventory'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                <span>Inwentaryzacja</span>
              </button>
              
              <button
                onClick={() => setViewMode('database')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'database'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <span>Baza danych</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'upload' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Przetwarzaj faktury PDF
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Wgraj plik PDF z fakturą, a system automatycznie wydobędzie wszystkie
                niezbędne dane i zapisze je w bazie danych.
              </p>
            </div>
            <FileUploader
              onFileSelect={handleFileSelect}
              isProcessing={isProcessing}
              error={error}
              success={success}
            />
            <div className="flex justify-center">
              <div className="bg-blue-100 rounded-lg p-6 flex flex-col items-center shadow-md">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setParsedData({
                      invoiceNumber: '',
                      date: '',
                      vendor: '',
                      totalNet: 0,
                      totalGross: 0,
                      items: []
                    });
                    setShowEditor(true);
                  }}
                >
                  Dodaj fakturę ręcznie
                </button>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'preview' && parsedData && (
          <InvoicePreview
            data={parsedData}
            onConfirm={handleConfirmInvoice}
            onEdit={handleEditInvoice}
          />
        )}

        {viewMode === 'list' && (
          <InvoiceList
            invoices={invoices}
            onViewInvoice={handleViewInvoice}
            onEdit={handleEdit}
            onDelete={handleDeleteInvoice} // <-- dodaj przekazanie funkcji usuwania
          />
        )}

        {viewMode === 'products' && <ProductManager />}

        {viewMode === 'sales' && <SalesManager />}

        {viewMode === 'inventory' && <InventoryManager />}

        {viewMode === 'database' && <DatabaseConfig />}

        {error && (
          <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}
      </main>

      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={handleCloseModal}
        />
      )}

      {showEditor && parsedData && (
        <InvoiceEditor
          data={parsedData}
          onSave={handleSaveEditedInvoice}
          onCancel={handleCancelEdit}
        />
      )}

      {editingInvoice && (
        <InvoiceEditor
          data={{
            invoiceNumber: editingInvoice.invoice_number,
            date: editingInvoice.date,
            vendor: editingInvoice.vendor,
            totalNet: editingInvoice.total_net,
            totalGross: editingInvoice.total_gross,
            items: editingInvoice.items
          }}
          onSave={(data: ParsedInvoiceData) => {
            // Here you should update the invoice in the database and state as needed
            // For now, just close the editor
            setEditingInvoice(null);
            // Optionally, refresh invoices or update state
          }}
          onCancel={handleCancel}
        />
      )}

      {/* MODAL POTWIERDZENIA USUWANIA */}
      {showDeleteConfirm && invoiceToDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <h2 className="text-lg font-bold mb-4">Potwierdź usunięcie faktury</h2>
            <p className="mb-6">
              Czy na pewno chcesz usunąć fakturę <b>{invoiceToDelete.invoice_number || invoiceToDelete.invoiceNumber}</b> z dnia <b>{invoiceToDelete.date}</b>?
              <br />
              Tej operacji nie można cofnąć.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="btn btn-secondary"
                onClick={cancelDeleteInvoice}
                disabled={isProcessing}
              >
                Anuluj
              </button>
              <button
                className="btn btn-danger flex items-center gap-2 pl-3 pr-5"
                onClick={confirmDeleteInvoice}
                disabled={isProcessing}
              >
                <span className="text-xl text-red-700 mr-2">✖</span>
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;