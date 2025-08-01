/*
  # Create invoices and invoice_items tables

  1. New Tables
    - `invoices`
      - `id` (uuid, primary key)
      - `filename` (text)
      - `invoice_number` (text, unique)
      - `date` (date)
      - `vendor` (text)
      - `total_net` (numeric)
      - `total_gross` (numeric)
      - `created_at` (timestamp)
      - `processed_at` (timestamp)
    
    - `invoice_items`
      - `id` (uuid, primary key)
      - `invoice_id` (uuid, foreign key)
      - `name` (text)
      - `quantity` (numeric)
      - `unit` (text)
      - `percentage` (integer)
      - `net_price` (numeric)
      - `gross_price` (numeric)
      - `total_net` (numeric)
      - `total_gross` (numeric)
      
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  invoice_number text UNIQUE NOT NULL,
  date date NOT NULL,
  vendor text NOT NULL,
  total_net numeric(10,2) NOT NULL DEFAULT 0,
  total_gross numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric(10,3) NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'szt',
  percentage integer NOT NULL DEFAULT 23,
  net_price numeric(10,2) NOT NULL DEFAULT 0,
  gross_price numeric(10,2) NOT NULL DEFAULT 0,
  total_net numeric(10,2) NOT NULL DEFAULT 0,
  total_gross numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Allow public access to invoices"
  ON invoices
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public access to invoice_items"
  ON invoice_items
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices(vendor);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);