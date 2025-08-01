export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  percentage: number;
  net_price: number;
  gross_price: number;
  total_net: number;
  total_gross: number;
}

export interface Invoice {
  id: string;
  filename: string;
  invoice_number: string;
  date: string;
  vendor: string;
  total_net: number;
  total_gross: number;
  items: InvoiceItem[];
  created_at: string;
  processed_at: string;
}

export interface ParsedInvoiceData {
  invoiceNumber: string;
  date: string;
  vendor: string;
  items: Omit<InvoiceItem, 'id'>[];
  totalNet: number;
  totalGross: number;
}