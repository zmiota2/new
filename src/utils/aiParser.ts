import { ParsedInvoiceData } from '../types/invoice';

export class AIInvoiceParser {
  private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
  
  static async parseInvoiceWithAI(pdfText: string): Promise<ParsedInvoiceData> {
    try {
      const prompt = this.createParsingPrompt(pdfText);
      const response = await this.callGroqAPI(prompt);
      return this.parseAIResponse(response);
    } catch (error) {
      console.error('AI parsing failed, falling back to basic parsing:', error);
      return this.fallbackParsing(pdfText);
    }
  }

  private static createParsingPrompt(pdfText: string): string {
    return `
Przeanalizuj poniższy tekst faktury PDF i wydobądź następujące dane w formacie JSON:

TEKST FAKTURY:
${pdfText}

Wydobądź dokładnie te informacje:
1. Numer faktury (szukaj: "Faktura", "FV", "Nr", "Number")
2. Data faktury (format: YYYY-MM-DD)
3. Nazwa dostawcy/sprzedawcy
4. Lista pozycji z faktury, dla każdej pozycji:
   - nazwa produktu/usługi
   - ilość
   - jednostka (szt, kg, m, l, itp.)
   - procent VAT (zwykle 23%, 8%, 5%, 0%)
   - cena netto za jednostkę
   - cena brutto za jednostkę
   - suma netto (ilość × cena netto)
   - suma brutto (ilość × cena brutto)

Zwróć TYLKO poprawny JSON w tym formacie:
{
  "invoiceNumber": "string",
  "date": "YYYY-MM-DD",
  "vendor": "string",
  "items": [
    {
      "name": "string",
      "quantity": number,
      "unit": "string",
      "percentage": number,
      "net_price": number,
      "gross_price": number,
      "total_net": number,
      "total_gross": number
    }
  ],
  "totalNet": number,
  "totalGross": number
}

WAŻNE: 
- Wszystkie kwoty jako liczby (nie stringi)
- Data w formacie YYYY-MM-DD
- Jeśli nie znajdziesz jakiejś wartości, użyj rozsądnych domyślnych wartości
- Procent VAT jako liczba całkowita (np. 23, nie 0.23)
`;
  }

  private static async callGroqAPI(prompt: string): Promise<string> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;;
    if (!apiKey) {
      throw new Error('Brak klucza API Groq. Dodaj VITE_LLAMA_API_KEY do pliku .env');
    }

    const response = await fetch(this.OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1', // Aktualny model Groq
        messages: [
          {
            role: 'system',
            content: 'Jesteś ekspertem w analizie faktur PDF. Zwracaj tylko poprawny JSON bez dodatkowych komentarzy.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1024 ,
        top_p: 1,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private static parseAIResponse(aiResponse: string): ParsedInvoiceData {
    try {
      // Wyczyść odpowiedź z ewentualnych dodatkowych znaków
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      
      // Walidacja i normalizacja danych
      return {
        invoiceNumber: parsedData.invoiceNumber || 'UNKNOWN',
        date: this.validateDate(parsedData.date),
        vendor: parsedData.vendor || 'UNKNOWN VENDOR',
        items: this.validateItems(parsedData.items || []),
        totalNet: Number(parsedData.totalNet) || 0,
        totalGross: Number(parsedData.totalGross) || 0
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw error;
    }
  }

  private static validateDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // Sprawdź czy data jest już w formacie YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Spróbuj sparsować różne formaty dat
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    
    return date.toISOString().split('T')[0];
  }

  private static validateItems(items: any[]): any[] {
    return items.map(item => ({
      name: String(item.name || 'Unknown item'),
      quantity: Number(item.quantity) || 1,
      unit: String(item.unit || 'szt'),
      percentage: Number(item.percentage) || 23,
      net_price: Number(item.net_price) || 0,
      gross_price: Number(item.gross_price) || 0,
      total_net: Number(item.total_net) || 0,
      total_gross: Number(item.total_gross) || 0
    }));
  }

  private static fallbackParsing(pdfText: string): ParsedInvoiceData {
    // Podstawowe parsowanie jako fallback
    return {
      invoiceNumber: this.extractInvoiceNumber(pdfText),
      date: this.extractDate(pdfText),
      vendor: this.extractVendor(pdfText),
      items: this.extractItems(pdfText),
      totalNet: 0,
      totalGross: 0
    };
  }

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
        return this.validateDate(match[0]);
      }
    }
    return new Date().toISOString().split('T')[0];
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
    // Podstawowa ekstrakcja itemów jako fallback
    return [{
      name: 'Extracted item from PDF',
      quantity: 1,
      unit: 'szt',
      percentage: 23,
      net_price: 100,
      gross_price: 123,
      total_net: 100,
      total_gross: 123
    }];
  }
}

// TEST: Wywołaj poniższy kod np. w konsoli lub z komponentu, aby sprawdzić połączenie z AI
async function testSimpleAICommand() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;;
  const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: '04-mini',
      messages: [
        { role: 'user', content: 'napisz jakim modelem językowym jesteś podaj tylko dokładną' }
      ],
      temperature: 0.5,
      max_tokens: 100,
      top_p: 1,
      stream: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Odpowiedź AI:', data.choices[0]?.message?.content || '');
}

testSimpleAICommand(); // Odkomentuj, aby wykonać testowe polecenie