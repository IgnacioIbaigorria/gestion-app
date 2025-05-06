import { supabase } from './supabase';
import { Quote, QuoteStatus, Sale } from '../models/types';
import { salesService } from './salesService';
import { productService } from './productService'; // Add this import
import { cashService } from './cashService';

const TABLE_NAME = 'quotes';

export const quoteService = {
  async createQuote(quote: Partial<Quote>): Promise<string> {
    try {
      // Asegurarse de que la fecha esté presente
      if (!quote.date) {
        quote.date = new Date();
      }
      
      // Estado por defecto
      if (!quote.status) {
        quote.status = 'pending';
      }
      
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(quote)
        .select('id')
        .single();
      
      if (error) throw error;
      
      return data.id;
    } catch (error) {
      console.error("Error al crear presupuesto: ", error);
      throw error;
    }
  },

  async getQuoteById(id: string): Promise<Quote | null> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return data as Quote;
    } catch (error) {
      console.error("Error al obtener presupuesto: ", error);
      throw error;
    }
  },

  async updateQuote(id: string, data: Partial<Quote>): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error("Error al actualizar presupuesto: ", error);
      throw error;
    }
  },

  async deleteQuote(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error("Error al eliminar presupuesto: ", error);
      throw error;
    }
  },

  async getAllQuotes(): Promise<Quote[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data as Quote[];
    } catch (error) {
      console.error("Error al obtener presupuestos: ", error);
      throw error;
    }
  },

  async getQuotesByStatus(status: QuoteStatus): Promise<Quote[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('status', status)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data as Quote[];
    } catch (error) {
      console.error(`Error al obtener presupuestos con estado ${status}: `, error);
      throw error;
    }
  },

  async convertQuoteToSale(quoteId: string, paymentMethod: string = 'Efectivo'): Promise<string> {
    try {
      // 1. Obtener el presupuesto
      const quote = await this.getQuoteById(quoteId);
      if (!quote) {
        throw new Error("Presupuesto no encontrado");
      }
      
      // Parse the quote date if it's a string
      let quoteDate: Date;
      if (quote.date && typeof quote.date === 'string') {
        quoteDate = new Date(quote.date);
      } else if (quote.date instanceof Date) {
        quoteDate = quote.date;
      } else {
        quoteDate = new Date(); // Fallback to current date
      }
      
      // Format the date properly
      let formattedDate = quoteDate.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // 2. Crear una venta basada en el presupuesto
      const sale: Partial<Sale> = {
        items: quote.items.map(item => ({
          ...item,
          productName: item.name // Convert QuoteItem to SaleItem by mapping name to productName
        })),
        total_amount: quote.total,
        date: new Date(),
        payment_method: paymentMethod,
        notes: `Presupuesto para ${quote.customer_name} generado el ${formattedDate} a través del sistema de presupuestos.`,
      };
      
      // 3. Crear la venta
      const saleResult = await salesService.addSale(sale as Omit<Sale, 'id'>);
      
      // 4. Registrar la transacción en caja
      await cashService.addTransaction({
        type: 'sale',
        amount: quote.total,
        description: `Venta desde presupuesto para ${quote.customer_name}`,
        date: new Date(),
        reference: saleResult.id, // Usar el ID de la venta como referencia
      });
      
      // 5. Actualizar el inventario reduciendo la cantidad de cada producto vendido
      const updateInventoryPromises = quote.items.map(async (item) => {
        if (item.productId) {
          // Obtener el producto actual
          const product = await productService.getProductById(item.productId);
          if (product) {
            // Calcular nueva cantidad
            const newQuantity = Math.max(0, product.quantity - item.quantity);
            // Actualizar el producto
            await productService.updateProduct(item.productId, {
              quantity: newQuantity
            });
          }
        }
      });
      
      // Esperar a que todas las actualizaciones de inventario se completen
      await Promise.all(updateInventoryPromises);
      
      // 6. Actualizar el estado del presupuesto
      await this.updateQuote(quoteId, { status: 'converted' });
      
      return saleResult.id as string;
    } catch (error) {
      console.error("Error al convertir presupuesto a venta: ", error);
      throw error;
    }
  }
};