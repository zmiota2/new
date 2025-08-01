export class PDFGenerator {
  static generateInventoryPDF(inventory: any, items: any[]): void {
    // Create a simple HTML structure for PDF generation
    const htmlContent = this.createInventoryHTML(inventory, items);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Zablokowano popup. Proszę zezwolić na popupy dla tej strony.');
      return;
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }

  private static createInventoryHTML(inventory: any, items: any[]): string {
    const currentDate = new Date().toLocaleDateString('pl-PL');
    const completedDate = inventory.completed_at 
      ? new Date(inventory.completed_at).toLocaleDateString('pl-PL')
      : '-';

    const totalDifference = items.reduce((sum, item) => sum + (item.difference || 0), 0);
    const countedItems = items.filter(item => item.counted_quantity !== null).length;

    return `
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inwentaryzacja - ${inventory.name}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
            line-height: 1.4;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            color: #2563eb;
            font-size: 24px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        .info-box {
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 5px;
            background-color: #f9f9f9;
        }
        .info-box h3 {
            margin: 0 0 10px 0;
            color: #555;
            font-size: 14px;
            text-transform: uppercase;
        }
        .info-box p {
            margin: 0;
            font-size: 16px;
            font-weight: bold;
        }
        .summary {
            background-color: #e3f2fd;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 30px;
            text-align: center;
        }
        .summary h3 {
            margin: 0 0 10px 0;
            color: #1976d2;
        }
        .summary-stats {
            display: flex;
            justify-content: space-around;
            flex-wrap: wrap;
        }
        .stat {
            text-align: center;
            margin: 5px;
        }
        .stat-value {
            font-size: 18px;
            font-weight: bold;
            color: #1976d2;
        }
        .stat-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            font-size: 12px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f5f5f5;
            font-weight: bold;
            text-align: center;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .positive { color: #059669; font-weight: bold; }
        .negative { color: #dc2626; font-weight: bold; }
        .neutral { color: #666; }
        .footer {
            margin-top: 40px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        @media print {
            body { margin: 0; }
            .header { page-break-after: avoid; }
            table { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>RAPORT INWENTARYZACJI</h1>
        <p>${inventory.name}</p>
    </div>

    <div class="info-grid">
        <div class="info-box">
            <h3>Data utworzenia</h3>
            <p>${new Date(inventory.created_at).toLocaleDateString('pl-PL')}</p>
        </div>
        <div class="info-box">
            <h3>Data zakończenia</h3>
            <p>${completedDate}</p>
        </div>
        <div class="info-box">
            <h3>Status</h3>
            <p>${inventory.status === 'draft' ? 'Szkic' : 
                inventory.status === 'in_progress' ? 'W trakcie' : 'Zakończona'}</p>
        </div>
        <div class="info-box">
            <h3>Data raportu</h3>
            <p>${currentDate}</p>
        </div>
    </div>

    <div class="summary">
        <h3>Podsumowanie inwentaryzacji</h3>
        <div class="summary-stats">
            <div class="stat">
                <div class="stat-value">${items.length}</div>
                <div class="stat-label">Produktów</div>
            </div>
            <div class="stat">
                <div class="stat-value">${countedItems}</div>
                <div class="stat-label">Policzonych</div>
            </div>
            <div class="stat">
                <div class="stat-value ${totalDifference > 0 ? 'positive' : totalDifference < 0 ? 'negative' : 'neutral'}">
                    ${totalDifference > 0 ? '+' : ''}${totalDifference}
                </div>
                <div class="stat-label">Różnica ogółem</div>
            </div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Lp.</th>
                <th>Nazwa produktu</th>
                <th>Jednostka</th>
                <th>Oczekiwana ilość</th>
                <th>Policzono</th>
                <th>Różnica</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${items.map((item, index) => {
              const difference = item.difference || 0;
              const status = item.counted_quantity === null ? 'Nie policzono' :
                           difference === 0 ? 'OK' :
                           difference > 0 ? 'Nadwyżka' : 'Niedobór';
              
              return `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>${item.product?.name || 'N/A'}</td>
                    <td class="text-center">${item.product?.unit || 'N/A'}</td>
                    <td class="text-right">${item.expected_quantity}</td>
                    <td class="text-right">${item.counted_quantity !== null ? item.counted_quantity : '-'}</td>
                    <td class="text-right ${difference > 0 ? 'positive' : difference < 0 ? 'negative' : 'neutral'}">
                        ${item.counted_quantity !== null ? 
                          (difference > 0 ? `+${difference}` : difference) : '-'}
                    </td>
                    <td class="text-center">${status}</td>
                </tr>
              `;
            }).join('')}
        </tbody>
    </table>

    <div class="footer">
        <p>Raport wygenerowany automatycznie przez System Zarządzania Magazynem</p>
        <p>Data i czas generowania: ${new Date().toLocaleString('pl-PL')}</p>
    </div>
</body>
</html>
    `;
  }
}