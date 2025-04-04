import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp, 
  deleteDoc,
  doc
} from 'firebase/firestore';
import { CashTransaction } from '../models/types';

const COLLECTION_NAME = 'cashRegister';

export const cashService = {
  // Registrar una transacción (venta, gasto, depósito, retiro)
  async recordTransaction(transaction: Omit<CashTransaction, 'id'>): Promise<CashTransaction> {
    try {
      if (!transaction.date) {
        transaction.date = Timestamp.now();
      }
      
      const docRef = await addDoc(collection(db, COLLECTION_NAME), transaction);
      return { id: docRef.id, ...transaction };
    } catch (error) {
      console.error("Error al registrar transacción: ", error);
      throw error;
    }
  },

  // Obtener saldo actual de caja
  async getCurrentBalance(): Promise<number> {
    try {
      const transactions = await this.getAllTransactions();
      
      return transactions.reduce((balance, transaction) => {
        // Sumar ingresos (ventas, depósitos)
        if (transaction.type === 'sale' || transaction.type === 'deposit') {
          return balance + transaction.amount;
        }
        // Restar gastos y retiros
        else if (transaction.type === 'expense' || transaction.type === 'withdrawal') {
          return balance - transaction.amount;
        }
        return balance;
      }, 0);
    } catch (error) {
      console.error("Error al obtener saldo actual: ", error);
      throw error;
    }
  },

  // Obtener todas las transacciones
  async getAllTransactions(): Promise<CashTransaction[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CashTransaction[];
    } catch (error) {
      console.error("Error al obtener transacciones: ", error);
      throw error;
    }
  },

  // Obtener transacciones por rango de fechas
  async getTransactionsByDateRange(startDate: Timestamp, endDate: Timestamp): Promise<CashTransaction[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CashTransaction[];
    } catch (error) {
      console.error("Error al obtener transacciones por rango de fechas: ", error);
      throw error;
    }
  },

async deleteTransaction(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
},

async deleteTransactionByReference(reference: string): Promise<void> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('reference', '==', reference)
    );
    
    const querySnapshot = await getDocs(q);
    
    const deletePromises = querySnapshot.docs.map(doc => 
      deleteDoc(doc.ref)
    );
    
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error deleting transaction by reference:', error);
    throw error;
  }
},
  // Obtener transacciones del día actual
  async getTodayTransactions(): Promise<CashTransaction[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfDay = Timestamp.fromDate(today);
      
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const endOfDayTimestamp = Timestamp.fromDate(endOfDay);
      
      return this.getTransactionsByDateRange(startOfDay, endOfDayTimestamp);
    } catch (error) {
      console.error("Error al obtener transacciones del día: ", error);
      throw error;
    }
  }
};
