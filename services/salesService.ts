import { supabase } from './supabase';
import { Sale } from '../models/types';
import { cashService } from './cashService';

const TABLE_NAME = 'sales';

export const salesService = {
  async addSale(sale: Omit<Sale, 'id'>): Promise<Sale> {
    try {
      if (!sale.date) {
        sale.date = new Date();
      }
      
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(sale)
        .select('*')
        .single();
      
      if (error) throw error;
      
      return data as Sale;
    } catch (error) {
      console.error("Error al agregar venta: ", error);
      throw error;
    }
  },

  async getAllSales(): Promise<Sale[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data as Sale[];
    } catch (error) {
      console.error("Error al obtener ventas: ", error);
      throw error;
    }
  },

  async getSaleById(id: string): Promise<Sale | null> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return data as Sale;
    } catch (error) {
      console.error("Error al obtener venta: ", error);
      throw error;
    }
  },

  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data as Sale[];
    } catch (error) {
      console.error("Error al obtener ventas por rango de fechas: ", error);
      throw error;
    }
  },

  async getTodaySales(): Promise<Sale[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      return this.getSalesByDateRange(today, endOfDay);
    } catch (error) {
      console.error("Error al obtener ventas del día: ", error);
      throw error;
    }
  },

  async calculateTotalSales(startDate: Date, endDate: Date): Promise<number> {
    try {
      const sales = await this.getSalesByDateRange(startDate, endDate);
      return sales.reduce((total, sale) => total + sale.total_amount, 0);
    } catch (error) {
      console.error("Error al calcular total de ventas: ", error);
      throw error;
    }
  },
  
  async deleteSale(id: string): Promise<void> {
    try {
      await cashService.deleteTransactionByReference(id);
      
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting sale:', error);
      throw error;
    }
  },
  async syncSalesWithCashTransactions(): Promise<number> {
    try {
      // Get all sales
      const sales = await this.getAllSales();
      let syncedCount = 0;
      
      // For each sale, check if there's a corresponding cash transaction
      for (const sale of sales) {
        // Skip if no ID
        if (!sale.id) continue;
        
        // Check if a transaction already exists for this sale
        const existingTransaction = await cashService.getTransactionByReference(sale.id);
        
        // If no transaction exists, create one
        if (!existingTransaction) {
          await cashService.addTransaction({
            type: 'sale',
            amount: sale.total_amount,
            description: `Venta ${sale.notes ? '- ' + sale.notes : ''}`,
            date: sale.date || new Date(),
            reference: sale.id,
          });
          syncedCount++;
        }
      }
      
      return syncedCount;
    } catch (error) {
      console.error("Error al sincronizar ventas con transacciones de caja:", error);
      throw error;
    }
  }
};
