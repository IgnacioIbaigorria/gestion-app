import { Sale } from '../models/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import i18n from '../translations';
import { settingsService } from './settingsService';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export const receiptService = {
  async generateReceiptHTML(sale: Sale): Promise<string> {
    // Get business name from settings
    const settings = await settingsService.getSettings();
    const businessName = settings.businessName || 'Punto Eco';
    
    // Format date
    const formattedDate = format(
      sale.date, 
      'dd/MM/yyyy HH:mm', 
      { locale: es }
    );
    
    // Generate items HTML
    const itemsHTML = sale.items.map(item => `
      <tr>
        <td>${item.productName}</td>
        <td>${item.quantity}</td>
        <td>$${item.unitPrice.toFixed(2)}</td>
        <td>$${item.subtotal.toFixed(2)}</td>
      </tr>
    `).join('');
    
    // Calculate total items
    const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
    
    // Generate HTML
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <title>${i18n.t('receipt.title')}</title>
          <style>
            body {
              font-family: 'Helvetica', sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .receipt {
              max-width: 400px;
              margin: 0 auto;
              border: 1px solid #ddd;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 10px;
            }
            .business-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .receipt-title {
              font-size: 18px;
              margin-bottom: 5px;
            }
            .receipt-id {
              font-size: 14px;
              color: #666;
              margin-bottom: 5px;
            }
            .date {
              font-size: 14px;
              margin-bottom: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              padding: 8px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }
            th {
              background-color: #f2f2f2;
            }
            .summary {
              margin-top: 20px;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
            .total {
              font-weight: bold;
              font-size: 18px;
              margin-top: 10px;
              text-align: right;
            }
            .notes {
              margin-top: 20px;
              padding-top: 10px;
              border-top: 1px solid #ddd;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="business-name">${businessName}</div>
              <div class="receipt-title">${i18n.t('receipt.title')}</div>
              <div class="date">${i18n.t('receipt.date')}: ${formattedDate}</div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>${i18n.t('receipt.product')}</th>
                  <th>${i18n.t('receipt.quantity')}</th>
                  <th>${i18n.t('receipt.unitPrice')}</th>
                  <th>${i18n.t('receipt.subtotal')}</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>
            
            <div class="summary">
              <div class="summary-row">
                <span>${i18n.t('receipt.totalProducts')}:</span>
                <span>${sale.items.length}</span>
              </div>
              <div class="summary-row">
                <span>${i18n.t('receipt.totalItems')}:</span>
                <span>${totalItems}</span>
              </div>
              <div class="summary-row">
                <span>${i18n.t('receipt.paymentMethod')}:</span>
                <span>${sale.payment_method}</span>
              </div>
              <div class="total">
                ${i18n.t('receipt.total')}: $${sale.total_amount.toFixed(2)}
              </div>
            </div>
            
            ${sale.notes ? `
              <div class="notes">
                <h3>${i18n.t('receipt.notes')}:</h3>
                <p>${sale.notes}</p>
              </div>
            ` : ''}
            
            <div class="footer">
              ${i18n.t('receipt.thankYou')}
            </div>
          </div>
        </body>
      </html>
    `;
  },
  
  async generatePDF(sale: Sale): Promise<string> {
    try {
      const html = await this.generateReceiptHTML(sale);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false
      });
      
      return uri;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  },
  
  async sharePDF(filePath: string): Promise<void> {
    try {
      await Sharing.shareAsync(filePath, {
        UTI: '.pdf',
        mimeType: 'application/pdf'
      });
    } catch (error) {
      console.error('Error sharing PDF:', error);
      throw error;
    }
  }
};