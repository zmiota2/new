/*
  # Add inventory management system

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `unit` (text)
      - `current_stock` (numeric)
      - `min_stock_level` (numeric)
      - `last_purchase_price` (numeric)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `stock_movements`
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key)
      - `movement_type` (text) - 'purchase', 'sale', 'adjustment', 'inventory'
      - `quantity` (numeric) - positive for incoming, negative for outgoing
      - `reference_id` (uuid) - reference to invoice_item or inventory_id
      - `reference_type` (text) - 'invoice_item', 'inventory', 'manual'
      - `notes` (text)
      - `created_at` (timestamp)
    
    - `inventories`
      - `id` (uuid, primary key)
      - `name` (text)
      - `status` (text) - 'draft', 'in_progress', 'completed'
      - `created_at` (timestamp)
      - `completed_at` (timestamp)
    
    - `inventory_items`
      - `id` (uuid, primary key)
      - `inventory_id` (uuid, foreign key)
      - `product_id` (uuid, foreign key)
      - `expected_quantity` (numeric)
      - `counted_quantity` (numeric)
      - `difference` (numeric)
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `sales`
      - `id` (uuid, primary key)
      - `sale_number` (text, unique)
      - `date` (date)
      - `customer` (text)
      - `total_amount` (numeric)
      - `created_at` (timestamp)
    
    - `sale_items`
      - `id` (uuid, primary key)
      - `sale_id` (uuid, foreign key)
      - `product_id` (uuid, foreign key)
      - `quantity` (numeric)
      - `unit_price` (numeric)
      - `total_price` (numeric)
      - `created_at` (timestamp)
      
  2. Security
    - Enable RLS on all tables
    - Add policies for public access
    
  3. Functions
    - Function to update product stock after movements
    - Trigger to automatically update stock on movements
*/

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  unit text NOT NULL DEFAULT 'szt',
  current_stock numeric(10,3) NOT NULL DEFAULT 0,
  min_stock_level numeric(10,3) NOT NULL DEFAULT 0,
  last_purchase_price numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stock movements table
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'adjustment', 'inventory')),
  quantity numeric(10,3) NOT NULL,
  reference_id uuid,
  reference_type text CHECK (reference_type IN ('invoice_item', 'inventory', 'manual', 'sale_item')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Inventories table
CREATE TABLE IF NOT EXISTS inventories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Inventory items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  expected_quantity numeric(10,3) NOT NULL DEFAULT 0,
  counted_quantity numeric(10,3),
  difference numeric(10,3) GENERATED ALWAYS AS (counted_quantity - expected_quantity) STORED,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(inventory_id, product_id)
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number text UNIQUE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  customer text NOT NULL DEFAULT '',
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Sale items table
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity numeric(10,3) NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public access to products"
  ON products FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to stock_movements"
  ON stock_movements FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to inventories"
  ON inventories FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to inventory_items"
  ON inventory_items FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to sales"
  ON sales FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to sale_items"
  ON sale_items FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Function to update product stock
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE products 
    SET 
      current_stock = current_stock + NEW.quantity,
      updated_at = now()
    WHERE id = NEW.product_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products 
    SET 
      current_stock = current_stock - OLD.quantity,
      updated_at = now()
    WHERE id = OLD.product_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE products 
    SET 
      current_stock = current_stock - OLD.quantity + NEW.quantity,
      updated_at = now()
    WHERE id = NEW.product_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update stock on movements
CREATE TRIGGER trigger_update_product_stock
  AFTER INSERT OR UPDATE OR DELETE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- Function to update product price from purchases
CREATE OR REPLACE FUNCTION update_product_price_from_purchase()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.movement_type = 'purchase' AND NEW.reference_type = 'invoice_item' THEN
    UPDATE products 
    SET 
      last_purchase_price = (
        SELECT ii.net_price 
        FROM invoice_items ii 
        WHERE ii.id = NEW.reference_id
      ),
      updated_at = now()
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update product price from purchases
CREATE TRIGGER trigger_update_product_price
  AFTER INSERT ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION update_product_price_from_purchase();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_items_inventory_id ON inventory_items(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_product_id ON inventory_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);