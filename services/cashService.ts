import { supabase } from './supabase';
import { CashTransaction } from '../models/types';

const TABLE_NAME = 'cash_transactions';

export const cashService = {
  async addTransaction(transaction: Omit<CashTransaction, 'id'>): Promise<CashTransaction> {
    try {
      if (!transaction.date) {
        transaction.date = new Date();
      }
      
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(transaction)
        .select('*')
        .single();
      
      if (error) throw error;
      
      return data as CashTransaction;
    } catch (error) {
      console.error("Error al agregar transacción:", error);
      throw error;
    }
  },

  async getTransactionByReference(reference: string): Promise<CashTransaction | null> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('reference', reference)
        .maybeSingle();
      
      if (error) throw error;
      
      return data as CashTransaction;
    } catch (error) {
      console.error("Error al obtener transacción por referencia:", error);
      throw error;
    }
  },
  
  // Add recordTransaction as an alias for addTransaction for better semantics
  async recordTransaction(transaction: Omit<CashTransaction, 'id'>): Promise<CashTransaction> {
    return this.addTransaction(transaction);
  },
  
  async getTransactionById(id: string): Promise<CashTransaction | null> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return data as CashTransaction;
    } catch (error) {
      console.error("Error al obtener transacción:", error);
      throw error;
    }
  },
  
  async getTodayTransactions(): Promise<CashTransaction[]> {
    try {
      // Create start and end of today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      // Use the existing date range function
      return this.getTransactionsByDateRange(today, endOfDay);
    } catch (error) {
      console.error("Error al obtener transacciones del día:", error);
      throw error;
    }
  },

  
  async getAllTransactions(): Promise<CashTransaction[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data as CashTransaction[];
    } catch (error) {
      console.error("Error al obtener transacciones:", error);
      throw error;
    }
  },
  
  async getTransactionsByDateRange(startDate: Date | any, endDate: Date | any): Promise<CashTransaction[]> {
    try {
      // Convert Timestamp objects to ISO strings if needed
      const startIso = startDate instanceof Date 
        ? startDate.toISOString() 
        : startDate.toDate ? startDate.toDate().toISOString() : startDate;
      
      const endIso = endDate instanceof Date 
        ? endDate.toISOString() 
        : endDate.toDate ? endDate.toDate().toISOString() : endDate;
      
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .gte('date', startIso)
        .lte('date', endIso)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data as CashTransaction[];
    } catch (error) {
      console.error("Error al obtener transacciones por rango de fechas:", error);
      throw error;
    }
  },
  
  async getTransactionsByType(type: CashTransaction['type']): Promise<CashTransaction[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('type', type)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data as CashTransaction[];
    } catch (error) {
      console.error(`Error al obtener transacciones de tipo ${type}:`, error);
      throw error;
    }
  },
  
  async deleteTransaction(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error("Error al eliminar transacción:", error);
      throw error;
    }
  },
  
  async deleteTransactionByReference(reference: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('reference', reference);
      
      if (error) throw error;
    } catch (error) {
      console.error("Error al eliminar transacción por referencia:", error);
      throw error;
    }
  },

  async getCurrentBalance(): Promise<number> {
   return this.calculateBalance(); 
  },
  
  async calculateBalance(): Promise<number> {
    try {
      const transactions = await this.getAllTransactions();
      
      return transactions.reduce((balance, transaction) => {
        if (transaction.type === 'sale' || transaction.type === 'deposit') {
          return balance + transaction.amount;
        } else {
          return balance - transaction.amount;
        }
      }, 0);
    } catch (error) {
      console.error("Error al calcular balance:", error);
      throw error;
    }
  }
};
