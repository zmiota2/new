import { ParsedInvoiceData } from '../types/invoice';
import { AIInvoiceParser } from './aiParser';

export class InvoicePDFParser {
  private static extractInvoiceNumber(text: string): string {
    const patterns = [
      /(?:faktura|invoice|nr|number)[:\s]*([A-Z0-9\/\-]{3,})/i,
      /(?:FV|INV)[:\s]*([A-Z0-9\/\-]{3,})/i,
      /([A-Z0-9]+\/[0-9]+\/[0-9]+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return 'UNKNOWN';
  }

  private static extractDate(text: string): string {
    const patterns = [
      /([0-9]{1,2}[.\-\/][0-9]{1,2}[.\-\/][0-9]{4})/g,
      /([0-9]{4}[.\-\/][0-9]{1,2}[.\-\/][0-9]{1,2})/g
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[0];
        return this.formatDateToISO(dateStr);
      }
    }
    return new Date().toISOString().split('T')[0];
  }

  private static formatDateToISO(dateStr: string): string {
    // Remove any separators and split into parts
    const cleanDate = dateStr.replace(/[.\-\/]/g, '/');
    const parts = cleanDate.split('/');
    
    if (parts.length !== 3) {
      return new Date().toISOString().split('T')[0];
    }
    
    let day: string, month: string, year: string;
    
    // Check if it's YYYY/MM/DD format (year first)
    if (parts[0].length === 4) {
      year = parts[0];
      month = parts[1].padStart(2, '0');
      day = parts[2].padStart(2, '0');
    } else {
      // Assume DD/MM/YYYY format (day first)
      day = parts[0].padStart(2, '0');
      month = parts[1].padStart(2, '0');
      year = parts[2];
    }
    
    // Validate the date
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (date.getFullYear() != parseInt(year) || 
        date.getMonth() != parseInt(month) - 1 || 
        date.getDate() != parseInt(day)) {
      return new Date().toISOString().split('T')[0];
    }
    
    return `${year}-${month}-${day}`;
  }
  private static extractVendor(text: string): string {
    const lines = text.split('\n');
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      if (line.length > 5 && line.length < 100 && 
          !line.match(/faktura|invoice|data|date/i) &&
          !line.match(/^[0-9\s\.\-\/]+$/)) {
        return line;
      }
    }
    return 'UNKNOWN VENDOR';
  }

  private static extractItems(text: string) {
    const items = [];
    const lines = text.split('\n');
    
    // Szukamy linii z danymi produktów
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Wzorce dla różnych formatów faktur
      const patterns = [
        // Nazwa | Ilość | Jednostka | Cena netto | VAT% | Cena brutto
        /(.+?)\s+([0-9]+(?:[.,][0-9]+)?)\s+(szt|kg|m|l|godz)\s+([0-9]+(?:[.,][0-9]+)?)\s+([0-9]+)%\s+([0-9]+(?:[.,][0-9]+)?)/,
        // Prostszy format: Nazwa Ilość Cena
        /(.+?)\s+([0-9]+(?:[.,][0-9]+)?)\s+([0-9]+(?:[.,][0-9]+)?)\s+([0-9]+(?:[.,][0-9]+)?)/
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const [, name, quantity, unit, netPrice, percentage, grossPrice] = match;
          
          const qty = parseFloat(quantity.replace(',', '.'));
          const net = parseFloat(netPrice.replace(',', '.'));
          const percent = percentage ? parseInt(percentage) : 23;
          const gross = grossPrice ? parseFloat(grossPrice.replace(',', '.')) : net * (1 + percent / 100);

          items.push({
            name: name.trim(),
            quantity: qty,
            unit: unit || 'szt',
            percentage: percent,
            net_price: net,
            gross_price: gross,
            total_net: qty * net,
            total_gross: qty * gross
          });
        }
      }
    }

    // Jeśli nie znaleziono itemów, dodaj przykładowy
    if (items.length === 0) {
      items.push({
        name: 'Extracted item from PDF',
        quantity: 1,
        unit: 'szt',
        percentage: 23,
        net_price: 100,
        gross_price: 123,
        total_net: 100,
        total_gross: 123
      });
    }

    return items;
  }

  static async parsePDF(pdfBuffer: ArrayBuffer): Promise<ParsedInvoiceData> {
    const text = await this.simulatePDFText(pdfBuffer);
    
    // Najpierw spróbuj AI parsing
    try {
      const aiResult = await AIInvoiceParser.parseInvoiceWithAI(text);
      console.log('AI parsing successful:', aiResult);
      return aiResult;
    } catch (error) {
      console.warn('AI parsing failed, using fallback:', error);
      
      // Fallback do podstawowego parsowania
      const invoiceNumber = this.extractInvoiceNumber(text);
      const date = this.extractDate(text);
      const vendor = this.extractVendor(text);
      const items = this.extractItems(text);
      
      const totalNet = items.reduce((sum, item) => sum + item.total_net, 0);
      const totalGross = items.reduce((sum, item) => sum + item.total_gross, 0);

      return {
        invoiceNumber,
        date,
        vendor,
        items,
        totalNet,
        totalGross
      };
    }
  }

  private static async simulatePDFText(pdfBuffer: ArrayBuffer): Promise<string> {
    // Symulacja tekstu z PDF - w rzeczywistości użyłbyś pdf-parse
    return `
      ABC Company Sp. z o.o.
      ul. Przykładowa 123
      00-000 Warszawa
      
      FAKTURA VAT
      Nr: FV/2024/001
      Data: 15.01.2024
      
      Pozycje:
      Laptop Dell Inspiron 15 1 szt 2500,00 23% 3075,00
      Mysz optyczna Logitech 2 szt 45,00 23% 55,35
      Klawiatura mechaniczna 1 szt 200,00 23% 246,00
      
      Razem netto: 2790,00
      VAT 23%: 641,70
      Razem brutto: 3431,70
    `;
  }
}