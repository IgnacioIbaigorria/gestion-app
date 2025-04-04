import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  Timestamp,
  getDoc,
  doc,
  orderBy,
  deleteDoc
} from 'firebase/firestore';
import { Sale } from '../models/types';
import { cashService } from './cashService';

const COLLECTION_NAME = 'sales';

export const salesService = {
  // Agregar una nueva venta
  async addSale(sale: Omit<Sale, 'id'>): Promise<Sale> {
    try {
      // Agregar timestamp si no se proporciona
      if (!sale.date) {
        sale.date = Timestamp.now();
      }
      
      const docRef = await addDoc(collection(db, COLLECTION_NAME), sale);
      return { id: docRef.id, ...sale };
    } catch (error) {
      console.error("Error al agregar venta: ", error);
      throw error;
    }
  },

  // Obtener todas las ventas
  async getAllSales(): Promise<Sale[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sale[];
    } catch (error) {
      console.error("Error al obtener ventas: ", error);
      throw error;
    }
  },

  // Obtener una venta por ID
  async getSaleById(id: string): Promise<Sale | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Sale;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error al obtener venta: ", error);
      throw error;
    }
  },

  // Obtener ventas por rango de fechas
  async getSalesByDateRange(startDate: Timestamp, endDate: Timestamp): Promise<Sale[]> {
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
      })) as Sale[];
    } catch (error) {
      console.error("Error al obtener ventas por rango de fechas: ", error);
      throw error;
    }
  },

  // Obtener ventas del día actual
  async getTodaySales(): Promise<Sale[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfDay = Timestamp.fromDate(today);
      
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const endOfDayTimestamp = Timestamp.fromDate(endOfDay);
      
      return this.getSalesByDateRange(startOfDay, endOfDayTimestamp);
    } catch (error) {
      console.error("Error al obtener ventas del día: ", error);
      throw error;
    }
  },

  // Calcular total de ventas
  async calculateTotalSales(startDate: Timestamp, endDate: Timestamp): Promise<number> {
    try {
      const sales = await this.getSalesByDateRange(startDate, endDate);
      return sales.reduce((total, sale) => total + sale.totalAmount, 0);
    } catch (error) {
      console.error("Error al calcular total de ventas: ", error);
      throw error;
    }
  },
  
  // Add this method to salesService
  async deleteSale(id: string): Promise<void> {
    try {
      // First, delete the corresponding cash transaction
      await cashService.deleteTransactionByReference(id);
      
      // Then delete the sale itself
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      console.error('Error deleting sale:', error);
      throw error;
    }
  }
};