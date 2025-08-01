export interface Product {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  last_purchase_price: number;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: 'purchase' | 'sale' | 'adjustment' | 'inventory';
  quantity: number;
  reference_id?: string;
  reference_type?: 'invoice_item' | 'inventory' | 'manual' | 'sale_item';
  notes: string;
  created_at: string;
  product?: Product;
}

export interface Inventory {
  id: string;
  name: string;
  status: 'draft' | 'in_progress' | 'completed';
  created_at: string;
  completed_at?: string;
  items?: InventoryItem[];
}

export interface InventoryItem {
  id: string;
  inventory_id: string;
  product_id: string;
  expected_quantity: number;
  counted_quantity?: number;
  difference?: number;
  notes: string;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface Sale {
  id: string;
  sale_number: string;
  date: string;
  customer: string;
  total_amount: number;
  created_at: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  product?: Product;
}

export interface CreateSaleData {
  sale_number: string;
  date: string;
  customer: string;
  items: {
    product_id: string;
    quantity: number;
    unit_price: number;
  }[];
}

export interface CreateInventoryData {
  name: string;
  product_ids: string[];
}